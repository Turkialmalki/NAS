-- Create a festival with everything at once (used by the guided form and by "create from file").
create or replace function public.slug_available(p_slug text) returns boolean
language sql stable security definer set search_path = public as $$
  select p_slug ~ '^[a-z0-9-]{3,60}$' and not exists (select 1 from public.festivals where slug = p_slug)
$$;
grant execute on function public.slug_available(text) to authenticated;

create or replace function public.create_festival_full(p jsonb) returns uuid
language plpgsql security definer set search_path = public as $$
declare fid uuid; s text; base text; n int := 1; c jsonb; i int := 0;
begin
  if auth.uid() is null then raise exception 'auth_required'; end if;
  if coalesce(trim(p->>'name'), '') = '' then raise exception 'name_required'; end if;
  base := left(regexp_replace(lower(coalesce(p->>'slug', '')), '[^a-z0-9-]+', '-', 'g'), 54);
  base := trim(both '-' from base);
  if length(base) < 3 then base := 'festival'; end if;
  s := base;
  while exists (select 1 from public.festivals where slug = s) loop n := n + 1; s := base || '-' || n; end loop;

  insert into public.festivals (name, slug, city, country, description, starts_on, ends_on, submissions_open, submissions_close, review_deadline, results_on,
    status, visibility, fee_note, rules, created_by)
  values (trim(p->>'name'), s, nullif(trim(p->>'city'), ''), coalesce(nullif(trim(p->>'country'), ''), 'السعودية'), nullif(trim(p->>'description'), ''),
    nullif(p->>'starts_on', '')::date, nullif(p->>'ends_on', '')::date, nullif(p->>'submissions_open', '')::date, nullif(p->>'submissions_close', '')::date,
    nullif(p->>'review_deadline', '')::date, nullif(p->>'results_on', '')::date,
    case when p->>'status' in ('draft','open','closed') then p->>'status' else 'draft' end,
    case when p->>'visibility' in ('public','private') then p->>'visibility' else 'public' end,
    coalesce(nullif(trim(p->>'fee_note'), ''), 'مجانًا'),
    coalesce((select array_agg(x) from jsonb_array_elements_text(coalesce(p->'rules', '[]'::jsonb)) x where trim(x) <> ''),
      array['اكتمل الفيلم خلال السنتين الماضيتين.','ترجمة عربية أو إنجليزية للأفلام بلغات أخرى.','رابط المشاهدة يبقى يعمل حتى إعلان النتائج.','لكل فيلم قسم واحد.']),
    auth.uid())
  returning id into fid;
  insert into public.festival_members (festival_id, user_id, role) values (fid, auth.uid(), 'owner');

  if jsonb_array_length(coalesce(p->'categories', '[]'::jsonb)) > 0 then
    for c in select * from jsonb_array_elements(p->'categories') loop
      if coalesce(trim(c->>'name'), '') <> '' then
        i := i + 1;
        insert into public.categories (festival_id, name, description, fee, sort) values (fid, trim(c->>'name'), nullif(trim(c->>'description'), ''), coalesce(nullif(trim(c->>'fee'), ''), 'مجانًا'), i);
      end if;
    end loop;
  end if;
  if i = 0 then
    insert into public.categories (festival_id, name, description, fee, sort) values
      (fid, 'الروائي الطويل', 'أكثر من ٦٠ دقيقة', 'مجانًا', 1), (fid, 'الوثائقي', 'بلا حد للمدة', 'مجانًا', 2),
      (fid, 'الأفلام القصيرة', 'أقل من ٤٠ دقيقة', 'مجانًا', 3), (fid, 'الفيلم الأول', 'أول أو ثاني فيلم لمخرجه', 'مجانًا', 4);
  end if;

  i := 0;
  if jsonb_array_length(coalesce(p->'criteria', '[]'::jsonb)) > 0 then
    for c in select * from jsonb_array_elements(p->'criteria') loop
      if coalesce(trim(c->>'name'), '') <> '' then
        i := i + 1;
        insert into public.criteria (festival_id, name, weight, sort) values (fid, trim(c->>'name'), greatest(1, least(100, coalesce((c->>'weight')::int, 25))), i);
      end if;
    end loop;
  end if;
  if i = 0 then
    insert into public.criteria (festival_id, name, weight, sort) values
      (fid, 'القصة', 30, 1), (fid, 'الإخراج', 25, 2), (fid, 'الصورة والصوت', 20, 3), (fid, 'الأصالة', 25, 4);
  end if;

  insert into public.audit_log (festival_id, actor_id, actor_label, action, target)
  values (fid, auth.uid(), (select coalesce(full_name, email) from public.profiles where id = auth.uid()), case when p->>'source' = 'file' then 'إنشاء مهرجان من ملف' else 'إنشاء مهرجان' end, trim(p->>'name'));
  return fid;
end $$;
grant execute on function public.create_festival_full(jsonb) to authenticated;
