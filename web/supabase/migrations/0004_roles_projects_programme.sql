-- Account types, reusable films (NAS Projects), filmmaker submissions, notifications,
-- review deadlines, and the festival programme (venues + screenings).

-- ---------------------------------------------------------------- account type
alter table public.profiles add column if not exists account_type text check (account_type in ('filmmaker','festival'));

-- ---------------------------------------------------------------- NAS Projects
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  title text not null check (length(trim(title)) between 1 and 200),
  director text,
  synopsis text,
  logline text,
  genre text,
  duration_min int check (duration_min is null or duration_min between 1 and 600),
  language text,
  country text,
  year int,
  screener_url text,
  screener_path text,
  video jsonb,
  video_sig text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists projects_owner on public.projects (owner_id, updated_at desc);
alter table public.projects enable row level security;
create policy "owner manages projects" on public.projects for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- filmmakers can read their own uploaded screeners
create policy "owner reads project screeners" on storage.objects for select using (
  bucket_id = 'screeners' and name like 'projects/' || auth.uid()::text || '/%');

-- ---------------------------------------------------------------- submissions from accounts
alter table public.submissions add column if not exists user_id uuid references auth.users(id) on delete set null;
alter table public.submissions add column if not exists project_id uuid references public.projects(id) on delete set null;
create index if not exists submissions_user on public.submissions (user_id);

-- submit one of my films to a festival
create or replace function public.submit_project(p_project uuid, p_festival uuid, p_category uuid)
returns table (id uuid, ref_code text, analysis_token uuid)
language plpgsql security definer set search_path = public as $$
declare pr record; f record; em text; s record;
begin
  if auth.uid() is null then raise exception 'auth_required'; end if;
  select * into pr from public.projects where projects.id = p_project and owner_id = auth.uid();
  if pr is null then raise exception 'not_found'; end if;
  select * into f from public.festivals where festivals.id = p_festival;
  if f is null or f.status <> 'open' then raise exception 'festival_closed'; end if;
  if f.submissions_close is not null and f.submissions_close < current_date then raise exception 'festival_closed'; end if;
  if p_category is not null and not exists (select 1 from public.categories c where c.id = p_category and c.festival_id = p_festival) then raise exception 'invalid_input'; end if;
  if exists (select 1 from public.submissions x where x.project_id = p_project and x.festival_id = p_festival) then raise exception 'duplicate'; end if;
  if coalesce(pr.screener_url, pr.screener_path) is null then raise exception 'no_screener'; end if;
  select email into em from auth.users where users.id = auth.uid();
  insert into public.submissions (festival_id, category_id, title, director_name, email, duration_min, genre, language, country, synopsis,
    screener_url, screener_path, status, user_id, project_id)
  values (p_festival, p_category, pr.title, coalesce(nullif(trim(pr.director), ''), (select coalesce(full_name, email) from public.profiles where profiles.id = auth.uid())),
    lower(em), pr.duration_min, pr.genre, pr.language, coalesce(pr.country, 'السعودية'), left(pr.synopsis, 2000), pr.screener_url, pr.screener_path, 'processing', auth.uid(), p_project)
  returning submissions.id, submissions.ref_code, submissions.analysis_token into s;
  insert into public.audit_log (festival_id, actor_id, actor_label, action, target) values (p_festival, auth.uid(), coalesce(pr.director, em), 'تقديم', s.ref_code);
  return query select s.id, s.ref_code, s.analysis_token;
end $$;
grant execute on function public.submit_project(uuid, uuid, uuid) to authenticated;

-- my submissions with the simple, filmmaker-facing status only
create or replace function public.my_submissions()
returns table (id uuid, ref_code text, title text, project_id uuid, festival text, festival_slug text, category text,
  stage text, result text, created_at timestamptz, results_on date)
language sql stable security definer set search_path = public as $$
  select s.id, s.ref_code, s.title, s.project_id, f.name, f.slug, c.name,
    case when s.decision_published and s.decision in ('accepted','declined') then 'decided'
         when s.status in ('analyzed','reviewed') or exists (select 1 from public.assignments a where a.submission_id = s.id) then 'review'
         else 'submitted' end,
    case when s.decision_published then case s.decision when 'accepted' then 'selected' when 'declined' then 'not_selected' else null end else null end,
    s.created_at, f.results_on
  from public.submissions s
  join public.festivals f on f.id = s.festival_id
  left join public.categories c on c.id = s.category_id
  where s.user_id = auth.uid()
  order by s.created_at desc
$$;
grant execute on function public.my_submissions() to authenticated;

-- ---------------------------------------------------------------- review deadlines
alter table public.assignments add column if not exists due_at date;

-- ---------------------------------------------------------------- notifications
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null,
  data jsonb not null default '{}',
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user on public.notifications (user_id, created_at desc);
alter table public.notifications enable row level security;
create policy "own notifications" on public.notifications for select using (user_id = auth.uid());
create policy "mark own notifications" on public.notifications for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create or replace function public.notify_new_submission() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.notifications (user_id, kind, data, link)
  select m.user_id, 'submission', jsonb_build_object('title', new.title, 'ref', new.ref_code, 'festival', (select name from public.festivals where id = new.festival_id)), '/app/films?id=' || new.id
  from public.festival_members m where m.festival_id = new.festival_id and m.role in ('owner','manager','programmer') and m.user_id is distinct from new.user_id;
  return new;
end $$;
create or replace trigger trg_notify_submission after insert on public.submissions for each row execute function public.notify_new_submission();

create or replace function public.notify_assignment() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.notifications (user_id, kind, data, link)
  select new.reviewer_id, 'assignment', jsonb_build_object('title', s.title, 'festival', f.name, 'due', new.due_at), '/review'
  from public.submissions s join public.festivals f on f.id = s.festival_id where s.id = new.submission_id;
  return new;
end $$;
create or replace trigger trg_notify_assignment after insert on public.assignments for each row execute function public.notify_assignment();

create or replace function public.notify_decision() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.decision_published and not coalesce(old.decision_published, false) and new.user_id is not null and new.decision in ('accepted','declined') then
    insert into public.notifications (user_id, kind, data, link)
    values (new.user_id, case when new.decision = 'accepted' then 'selected' else 'not_selected' end,
      jsonb_build_object('title', new.title, 'festival', (select name from public.festivals where id = new.festival_id)), '/app/me');
  end if;
  return new;
end $$;
create or replace trigger trg_notify_decision after update of decision_published on public.submissions for each row execute function public.notify_decision();

-- ---------------------------------------------------------------- programme
alter table public.festivals add column if not exists programme_published boolean not null default false;

create table if not exists public.venues (
  id uuid primary key default gen_random_uuid(),
  festival_id uuid not null references public.festivals(id) on delete cascade,
  name text not null,
  capacity int,
  sort int not null default 0
);
alter table public.venues enable row level security;
create policy "members read venues" on public.venues for select using (public.is_member(festival_id));
create policy "staff manage venues" on public.venues for all using (public.is_staff(festival_id)) with check (public.is_staff(festival_id));

create table if not exists public.screenings (
  id uuid primary key default gen_random_uuid(),
  festival_id uuid not null references public.festivals(id) on delete cascade,
  submission_id uuid not null references public.submissions(id) on delete cascade,
  venue_id uuid not null references public.venues(id) on delete cascade,
  starts_at timestamptz not null,
  duration_min int not null check (duration_min between 1 and 600),
  note text,
  created_at timestamptz not null default now()
);
create index if not exists screenings_festival on public.screenings (festival_id, starts_at);
alter table public.screenings enable row level security;
create policy "members read screenings" on public.screenings for select using (public.is_member(festival_id));
create policy "staff manage screenings" on public.screenings for all using (public.is_staff(festival_id)) with check (public.is_staff(festival_id));

-- the public programme, once the festival publishes it
create or replace function public.public_programme(p_slug text)
returns table (starts_at timestamptz, duration_min int, venue text, title text, director text, genre text, category text)
language sql stable security definer set search_path = public as $$
  select sc.starts_at, sc.duration_min, v.name, s.title, s.director_name, s.genre, c.name
  from public.festivals f
  join public.screenings sc on sc.festival_id = f.id
  join public.venues v on v.id = sc.venue_id
  join public.submissions s on s.id = sc.submission_id
  left join public.categories c on c.id = s.category_id
  where f.slug = p_slug and f.programme_published and f.visibility = 'public'
  order by sc.starts_at
$$;
grant execute on function public.public_programme(text) to anon, authenticated;

-- open festivals for discovery (public, with categories)
create or replace function public.open_festivals()
returns table (id uuid, name text, slug text, city text, country text, description text, submissions_close date, results_on date, starts_on date, fee_note text, categories jsonb, films int)
language sql stable security definer set search_path = public as $$
  select f.id, f.name, f.slug, f.city, f.country, f.description, f.submissions_close, f.results_on, f.starts_on, f.fee_note,
    coalesce((select jsonb_agg(jsonb_build_object('id', c.id, 'name', c.name, 'description', c.description, 'fee', c.fee) order by c.sort) from public.categories c where c.festival_id = f.id), '[]'),
    (select count(*)::int from public.submissions s where s.festival_id = f.id)
  from public.festivals f
  where f.status = 'open' and f.visibility = 'public' and (f.submissions_close is null or f.submissions_close >= current_date)
  order by f.submissions_close nulls last, f.created_at desc
$$;
grant execute on function public.open_festivals() to anon, authenticated;
