-- The festival directory lists only festivals ready to be shown: a real name, a description
-- of at least 30 characters and at least one section.
create or replace function public.open_festivals()
 returns table(id uuid, name text, slug text, city text, country text, description text, submissions_close date, results_on date, starts_on date, fee_note text, categories jsonb, films integer)
 language sql stable security definer set search_path to 'public'
as $$
  select f.id, f.name, f.slug, f.city, f.country, f.description, f.submissions_close, f.results_on, f.starts_on, f.fee_note,
    coalesce((select jsonb_agg(jsonb_build_object('id', c.id, 'name', c.name, 'description', c.description, 'fee', c.fee) order by c.sort) from public.categories c where c.festival_id = f.id), '[]'),
    (select count(*)::int from public.submissions s where s.festival_id = f.id)
  from public.festivals f
  where f.status = 'open' and f.visibility = 'public' and (f.submissions_close is null or f.submissions_close >= current_date)
    and f.name !~ '@' and length(trim(coalesce(f.description, ''))) >= 30
    and exists (select 1 from public.categories c where c.festival_id = f.id)
  order by f.submissions_close nulls last, f.created_at desc
$$;
