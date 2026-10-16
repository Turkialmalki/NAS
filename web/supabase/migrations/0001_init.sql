-- NAS — film festival platform · initial schema
-- Roles: platform admin (profiles.is_admin), festival members (owner/manager/programmer/reviewer),
-- anonymous filmmakers (submit + check status through security-definer functions only).

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'), new.email)
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------- festivals
create table public.festivals (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique check (slug ~ '^[a-z0-9-]{3,60}$'),
  description text,
  city text,
  country text default 'السعودية',
  status text not null default 'draft' check (status in ('draft','open','closed')),
  visibility text not null default 'public' check (visibility in ('public','private')),
  edition int not null default 1,
  starts_on date, ends_on date,
  submissions_open date, submissions_close date, review_deadline date, results_on date,
  fee_note text default 'مجانًا',
  rules text[] not null default '{}',
  logo_url text, cover_url text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.festival_members (
  festival_id uuid references public.festivals(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','manager','programmer','reviewer')),
  specialty text,
  created_at timestamptz not null default now(),
  primary key (festival_id, user_id)
);

-- lets the API embed member profiles
alter table public.festival_members add constraint festival_members_profile_fk foreign key (user_id) references public.profiles(id) on delete cascade;

create table public.festival_invites (
  id uuid primary key default gen_random_uuid(),
  festival_id uuid not null references public.festivals(id) on delete cascade,
  email text not null,
  role text not null check (role in ('manager','programmer','reviewer')),
  specialty text,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  unique (festival_id, email)
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  festival_id uuid not null references public.festivals(id) on delete cascade,
  name text not null,
  description text,
  fee text,
  sort int not null default 0
);

create table public.criteria (
  id uuid primary key default gen_random_uuid(),
  festival_id uuid not null references public.festivals(id) on delete cascade,
  name text not null,
  weight int not null default 25,
  sort int not null default 0
);

-- ---------------------------------------------------------------- submissions
create sequence public.submission_seq start 175;

create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  ref_code text not null unique default ('NAS-' || to_char(now(),'YYYY') || '-' || lpad(nextval('public.submission_seq')::text, 5, '0')),
  festival_id uuid not null references public.festivals(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  title text not null,
  director_name text not null,
  email text not null,
  duration_min int,
  genre text,
  country text,
  language text,
  synopsis text,
  screener_url text,
  screener_path text,
  status text not null default 'uploaded' check (status in ('uploaded','processing','analyzed','reviewed')),
  decision text not null default 'pending' check (decision in ('pending','shortlisted','accepted','declined')),
  decision_published boolean not null default false,
  analysis_token uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.submissions (festival_id, created_at desc);

create table public.analyses (
  submission_id uuid primary key references public.submissions(id) on delete cascade,
  score numeric(3,1),
  headline text,
  themes text[] not null default '{}',
  tone text[] not null default '{}',
  fit jsonb not null default '[]',
  checks jsonb not null default '[]',
  strengths text[] not null default '{}',
  suggested_reviewer uuid references auth.users(id),
  model text,
  created_at timestamptz not null default now()
);

create table public.assignments (
  submission_id uuid references public.submissions(id) on delete cascade,
  reviewer_id uuid references auth.users(id) on delete cascade,
  status text not null default 'assigned' check (status in ('assigned','in_progress','done')),
  assigned_at timestamptz not null default now(),
  primary key (submission_id, reviewer_id)
);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions(id) on delete cascade,
  reviewer_id uuid not null references auth.users(id) on delete cascade,
  scores jsonb not null default '{}',
  total numeric(3,1),
  notes text,
  submitted_at timestamptz not null default now(),
  unique (submission_id, reviewer_id)
);

create table public.audit_log (
  id bigserial primary key,
  festival_id uuid references public.festivals(id) on delete cascade,
  actor_id uuid references auth.users(id),
  actor_label text,
  action text not null,
  target text,
  created_at timestamptz not null default now()
);

create table public.contact_requests (
  id uuid primary key default gen_random_uuid(),
  name text, email text not null, org text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- helpers
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false)
$$;

create or replace function public.member_role(f uuid) returns text
language sql stable security definer set search_path = public as $$
  select role from public.festival_members where festival_id = f and user_id = auth.uid()
$$;

create or replace function public.is_staff(f uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_admin() or exists (
    select 1 from public.festival_members where festival_id = f and user_id = auth.uid() and role in ('owner','manager','programmer'))
$$;

create or replace function public.is_member(f uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_admin() or exists (select 1 from public.festival_members where festival_id = f and user_id = auth.uid())
$$;

create or replace function public.is_assigned(s uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.assignments where submission_id = s and reviewer_id = auth.uid())
$$;

create or replace function public.touch_updated() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
create trigger submissions_touch before update on public.submissions for each row execute function public.touch_updated();

-- ---------------------------------------------------------------- RLS
alter table public.profiles enable row level security;
alter table public.festivals enable row level security;
alter table public.festival_members enable row level security;
alter table public.festival_invites enable row level security;
alter table public.categories enable row level security;
alter table public.criteria enable row level security;
alter table public.submissions enable row level security;
alter table public.analyses enable row level security;
alter table public.assignments enable row level security;
alter table public.reviews enable row level security;
alter table public.audit_log enable row level security;
alter table public.contact_requests enable row level security;

-- profiles
create policy "own profile" on public.profiles for select using (id = auth.uid() or public.is_admin()
  or exists (select 1 from public.festival_members m1 join public.festival_members m2 on m1.festival_id = m2.festival_id
             where m1.user_id = auth.uid() and m2.user_id = profiles.id));
create policy "update own profile" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid() and is_admin = (select is_admin from public.profiles where id = auth.uid()));

-- festivals: public can read open+public ones; members read theirs; any signed-in user can create one
create policy "read festivals" on public.festivals for select using ((status = 'open' and visibility = 'public') or public.is_member(id));
create policy "create festival" on public.festivals for insert to authenticated with check (created_by = auth.uid());
create policy "staff update festival" on public.festivals for update using (public.is_staff(id));
create policy "admin delete festival" on public.festivals for delete using (public.is_admin());

-- members
create policy "members read members" on public.festival_members for select using (public.is_member(festival_id));
create policy "staff manage members" on public.festival_members for all using (public.is_staff(festival_id)) with check (public.is_staff(festival_id));
create policy "staff manage invites" on public.festival_invites for all using (public.is_staff(festival_id)) with check (public.is_staff(festival_id));

-- categories / criteria
create policy "read categories" on public.categories for select using (
  public.is_member(festival_id) or exists (select 1 from public.festivals f where f.id = festival_id and f.status = 'open' and f.visibility = 'public'));
create policy "staff categories" on public.categories for all using (public.is_staff(festival_id)) with check (public.is_staff(festival_id));
create policy "read criteria" on public.criteria for select using (public.is_member(festival_id));
create policy "staff criteria" on public.criteria for all using (public.is_staff(festival_id)) with check (public.is_staff(festival_id));

-- submissions: staff see all in festival; reviewers see only assigned
create policy "staff read submissions" on public.submissions for select using (public.is_staff(festival_id) or public.is_assigned(id));
create policy "staff write submissions" on public.submissions for insert with check (public.is_staff(festival_id));
create policy "staff update submissions" on public.submissions for update using (public.is_staff(festival_id));
create policy "staff delete submissions" on public.submissions for delete using (public.is_staff(festival_id));

create policy "read analyses" on public.analyses for select using (
  exists (select 1 from public.submissions s where s.id = submission_id and (public.is_staff(s.festival_id) or public.is_assigned(s.id))));
create policy "staff write analyses" on public.analyses for all using (
  exists (select 1 from public.submissions s where s.id = submission_id and public.is_staff(s.festival_id)))
  with check (exists (select 1 from public.submissions s where s.id = submission_id and public.is_staff(s.festival_id)));

create policy "read assignments" on public.assignments for select using (
  reviewer_id = auth.uid() or exists (select 1 from public.submissions s where s.id = submission_id and public.is_staff(s.festival_id)));
create policy "staff assign" on public.assignments for all using (
  exists (select 1 from public.submissions s where s.id = submission_id and public.is_staff(s.festival_id)))
  with check (exists (select 1 from public.submissions s where s.id = submission_id and public.is_staff(s.festival_id)));
create policy "reviewer updates own assignment" on public.assignments for update using (reviewer_id = auth.uid()) with check (reviewer_id = auth.uid());

create policy "read reviews" on public.reviews for select using (
  reviewer_id = auth.uid() or exists (select 1 from public.submissions s where s.id = submission_id and public.is_staff(s.festival_id)));
create policy "reviewer writes own review" on public.reviews for insert with check (reviewer_id = auth.uid() and public.is_assigned(submission_id));
create policy "reviewer updates own review" on public.reviews for update using (reviewer_id = auth.uid()) with check (reviewer_id = auth.uid());

create policy "staff read audit" on public.audit_log for select using (public.is_staff(festival_id));
create policy "members write audit" on public.audit_log for insert with check (public.is_member(festival_id) and actor_id = auth.uid());

create policy "anyone can send contact" on public.contact_requests for insert with check (true);
create policy "admin reads contact" on public.contact_requests for select using (public.is_admin());

-- ---------------------------------------------------------------- public functions (filmmakers, no account)
create or replace function public.submit_film(
  p_festival uuid, p_category uuid, p_title text, p_director text, p_email text,
  p_duration int, p_genre text, p_language text, p_country text, p_synopsis text, p_screener_url text, p_screener_path text)
returns table (id uuid, ref_code text, analysis_token uuid)
language plpgsql security definer set search_path = public as $$
declare f record; s record;
begin
  select * into f from public.festivals where festivals.id = p_festival;
  if f is null or f.status <> 'open' then raise exception 'festival_closed'; end if;
  if coalesce(trim(p_title),'') = '' or coalesce(trim(p_director),'') = '' or p_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'invalid_input'; end if;
  insert into public.submissions (festival_id, category_id, title, director_name, email, duration_min, genre, language, country, synopsis, screener_url, screener_path, status)
  values (p_festival, p_category, left(trim(p_title),200), left(trim(p_director),200), lower(trim(p_email)), p_duration, p_genre, p_language, coalesce(p_country,'السعودية'),
          left(p_synopsis, 2000), p_screener_url, p_screener_path, 'processing')
  returning submissions.id, submissions.ref_code, submissions.analysis_token into s;
  insert into public.audit_log (festival_id, actor_label, action, target) values (p_festival, p_director, 'تقديم', s.ref_code);
  return query select s.id, s.ref_code, s.analysis_token;
end $$;

create or replace function public.save_analysis(p_submission uuid, p_token uuid, p jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare s record;
begin
  select * into s from public.submissions where id = p_submission and analysis_token = p_token;
  if s is null then raise exception 'not_allowed'; end if;
  insert into public.analyses (submission_id, score, headline, themes, tone, fit, checks, strengths, suggested_reviewer, model)
  values (p_submission, (p->>'score')::numeric, p->>'headline',
    coalesce(array(select jsonb_array_elements_text(p->'themes')), '{}'),
    coalesce(array(select jsonb_array_elements_text(p->'tone')), '{}'),
    coalesce(p->'fit','[]'), coalesce(p->'checks','[]'),
    coalesce(array(select jsonb_array_elements_text(p->'strengths')), '{}'),
    nullif(p->>'suggested_reviewer','')::uuid, p->>'model')
  on conflict (submission_id) do update set score = excluded.score, headline = excluded.headline, themes = excluded.themes, tone = excluded.tone,
    fit = excluded.fit, checks = excluded.checks, strengths = excluded.strengths, suggested_reviewer = excluded.suggested_reviewer, model = excluded.model, created_at = now();
  update public.submissions set status = case when status in ('uploaded','processing') then 'analyzed' else status end where id = p_submission;
  insert into public.audit_log (festival_id, actor_label, action, target) values (s.festival_id, 'NAS', 'تحليل', s.ref_code || ' · ' || coalesce(p->>'score','—'));
end $$;

-- reviewers available for an analysis (used by the analyzer to suggest one)
create or replace function public.reviewer_pool(p_submission uuid, p_token uuid)
returns table (user_id uuid, name text, specialty text, open_count bigint)
language sql security definer set search_path = public as $$
  select m.user_id, coalesce(p.full_name, p.email), m.specialty,
    (select count(*) from public.assignments a where a.reviewer_id = m.user_id and a.status <> 'done')
  from public.submissions s
  join public.festival_members m on m.festival_id = s.festival_id and m.role = 'reviewer'
  left join public.profiles p on p.id = m.user_id
  where s.id = p_submission and s.analysis_token = p_token
$$;

create or replace function public.submission_status(p_ref text, p_email text)
returns table (ref_code text, title text, festival text, category text, status text, decision text, created_at timestamptz, results_on date, analyzed_at timestamptz, reviewed boolean, checks jsonb)
language sql security definer set search_path = public as $$
  select s.ref_code, s.title, f.name, c.name, s.status,
    case when s.decision_published then s.decision else 'pending' end,
    s.created_at, f.results_on, a.created_at, s.status = 'reviewed', coalesce(a.checks, '[]')
  from public.submissions s
  join public.festivals f on f.id = s.festival_id
  left join public.categories c on c.id = s.category_id
  left join public.analyses a on a.submission_id = s.id
  where upper(s.ref_code) = upper(trim(p_ref)) and s.email = lower(trim(p_email))
$$;

-- signed-in user: create a festival and become its owner (with default categories & criteria)
create or replace function public.create_festival(p_name text, p_slug text, p_city text, p_country text, p_description text,
  p_open date, p_close date, p_review date, p_results date, p_status text, p_visibility text, p_copy_from uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare fid uuid;
begin
  if auth.uid() is null then raise exception 'auth_required'; end if;
  insert into public.festivals (name, slug, city, country, description, submissions_open, submissions_close, review_deadline, results_on, status, visibility, created_by,
    rules)
  values (p_name, p_slug, p_city, coalesce(p_country,'السعودية'), p_description, p_open, p_close, p_review, p_results, coalesce(p_status,'draft'), coalesce(p_visibility,'public'), auth.uid(),
    array['اكتمل الفيلم خلال السنتين الماضيتين.','ترجمة عربية أو إنجليزية للأفلام بلغات أخرى.','رابط المشاهدة يبقى يعمل حتى إعلان النتائج.','لكل فيلم قسم واحد.'])
  returning id into fid;
  insert into public.festival_members (festival_id, user_id, role) values (fid, auth.uid(), 'owner');
  if p_copy_from is not null and public.is_staff(p_copy_from) then
    insert into public.categories (festival_id, name, description, fee, sort) select fid, name, description, fee, sort from public.categories where festival_id = p_copy_from;
    insert into public.criteria (festival_id, name, weight, sort) select fid, name, weight, sort from public.criteria where festival_id = p_copy_from;
    update public.festivals t set rules = s.rules, fee_note = s.fee_note from public.festivals s where t.id = fid and s.id = p_copy_from;
  else
    insert into public.categories (festival_id, name, description, fee, sort) values
      (fid, 'الروائي الطويل', 'أكثر من ٦٠ دقيقة', 'مجانًا', 1), (fid, 'الوثائقي', 'بلا حد للمدة', 'مجانًا', 2),
      (fid, 'الأفلام القصيرة', 'أقل من ٤٠ دقيقة', 'مجانًا', 3), (fid, 'الفيلم الأول', 'أول أو ثاني فيلم لمخرجه', 'مجانًا', 4);
    insert into public.criteria (festival_id, name, weight, sort) values
      (fid, 'القصة', 30, 1), (fid, 'الإخراج', 25, 2), (fid, 'الصورة والصوت', 20, 3), (fid, 'الأصالة', 25, 4);
  end if;
  insert into public.audit_log (festival_id, actor_id, actor_label, action, target) values (fid, auth.uid(), (select coalesce(full_name, email) from public.profiles where id = auth.uid()), 'إنشاء مهرجان', p_name);
  return fid;
end $$;

-- duplicate a festival's setup as a new edition
create or replace function public.duplicate_festival(p_festival uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare f record; nid uuid; base text;
begin
  if not public.is_staff(p_festival) then raise exception 'not_allowed'; end if;
  select * into f from public.festivals where id = p_festival;
  base := regexp_replace(f.slug, '-e[0-9]+$', '');
  insert into public.festivals (name, slug, description, city, country, status, visibility, edition, fee_note, rules, logo_url, cover_url, created_by)
  values (f.name, left(base, 50) || '-e' || (f.edition + 1), f.description, f.city, f.country, 'draft', f.visibility, f.edition + 1, f.fee_note, f.rules, f.logo_url, f.cover_url, auth.uid())
  returning id into nid;
  insert into public.festival_members (festival_id, user_id, role, specialty) select nid, user_id, role, specialty from public.festival_members where festival_id = p_festival;
  insert into public.categories (festival_id, name, description, fee, sort) select nid, name, description, fee, sort from public.categories where festival_id = p_festival;
  insert into public.criteria (festival_id, name, weight, sort) select nid, name, weight, sort from public.criteria where festival_id = p_festival;
  insert into public.audit_log (festival_id, actor_id, action, target) values (p_festival, auth.uid(), 'نسخ إعدادات', 'الدورة ' || (f.edition + 1));
  return nid;
end $$;

-- accept pending invites for the signed-in user's email
create or replace function public.accept_my_invites() returns int
language plpgsql security definer set search_path = public as $$
declare n int; em text;
begin
  select lower(email) into em from auth.users where id = auth.uid();
  if em is null then return 0; end if;
  insert into public.festival_members (festival_id, user_id, role, specialty)
  select festival_id, auth.uid(), role, specialty from public.festival_invites where lower(email) = em and accepted_at is null
  on conflict (festival_id, user_id) do nothing;
  get diagnostics n = row_count;
  update public.festival_invites set accepted_at = now() where lower(email) = em and accepted_at is null;
  return n;
end $$;

-- staff invites a member by email; if the user already exists they are added directly
create or replace function public.invite_member(p_festival uuid, p_email text, p_role text, p_specialty text)
returns text language plpgsql security definer set search_path = public as $$
declare uid uuid;
begin
  if not public.is_staff(p_festival) then raise exception 'not_allowed'; end if;
  select id into uid from auth.users where lower(email) = lower(trim(p_email));
  if uid is not null then
    insert into public.festival_members (festival_id, user_id, role, specialty) values (p_festival, uid, p_role, p_specialty)
    on conflict (festival_id, user_id) do update set role = excluded.role, specialty = excluded.specialty;
    return 'added';
  end if;
  insert into public.festival_invites (festival_id, email, role, specialty) values (p_festival, lower(trim(p_email)), p_role, p_specialty)
  on conflict (festival_id, email) do update set role = excluded.role, specialty = excluded.specialty;
  return 'invited';
end $$;

grant execute on function public.submit_film, public.save_analysis, public.reviewer_pool, public.submission_status to anon, authenticated;
grant execute on function public.create_festival, public.duplicate_festival, public.accept_my_invites, public.invite_member to authenticated;

-- ---------------------------------------------------------------- storage: private screeners bucket
insert into storage.buckets (id, name, public, file_size_limit) values ('screeners', 'screeners', false, 10737418240)
on conflict (id) do nothing;
create policy "anyone uploads screeners" on storage.objects for insert to anon, authenticated with check (bucket_id = 'screeners');
create policy "staff read screeners" on storage.objects for select using (
  bucket_id = 'screeners' and exists (select 1 from public.submissions s where s.screener_path = storage.objects.name and (public.is_staff(s.festival_id) or public.is_assigned(s.id))));

-- reviewer submits a review; marks the assignment done and the film reviewed when every reviewer has finished
create or replace function public.submit_review(p_submission uuid, p_scores jsonb, p_total numeric, p_notes text)
returns void language plpgsql security definer set search_path = public as $$
declare s record;
begin
  if not public.is_assigned(p_submission) then raise exception 'not_allowed'; end if;
  select * into s from public.submissions where id = p_submission;
  insert into public.reviews (submission_id, reviewer_id, scores, total, notes) values (p_submission, auth.uid(), p_scores, p_total, nullif(trim(p_notes), ''))
  on conflict (submission_id, reviewer_id) do update set scores = excluded.scores, total = excluded.total, notes = excluded.notes, submitted_at = now();
  update public.assignments set status = 'done' where submission_id = p_submission and reviewer_id = auth.uid();
  if not exists (select 1 from public.assignments where submission_id = p_submission and status <> 'done') then
    update public.submissions set status = 'reviewed' where id = p_submission;
  end if;
  insert into public.audit_log (festival_id, actor_id, actor_label, action, target)
  values (s.festival_id, auth.uid(), (select coalesce(full_name, email) from public.profiles where id = auth.uid()), 'تقييم', s.ref_code || ' · ' || p_total);
end $$;
grant execute on function public.submit_review to authenticated;

-- the platform owner's account becomes platform admin on sign-up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email, is_admin)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'), new.email,
          lower(coalesce(new.email,'')) in ('turkialmalki202200@gmail.com'))
  on conflict (id) do nothing;
  return new;
end $$;
