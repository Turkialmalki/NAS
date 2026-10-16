-- AI video analysis: frames read in the browser, analysed on the server, stored next to the text analysis.
alter table public.analyses add column if not exists video jsonb;

-- Saved either by the submission flow (analysis_token) or by festival staff.
create or replace function public.save_video_analysis(p_submission uuid, p_token uuid, p jsonb, p_score numeric default null)
returns void language plpgsql security definer set search_path = public as $$
declare s record;
begin
  select * into s from public.submissions where id = p_submission;
  if s is null then raise exception 'not_found'; end if;
  if not ((p_token is not null and s.analysis_token = p_token) or public.is_staff(s.festival_id)) then
    raise exception 'not_allowed';
  end if;
  insert into public.analyses (submission_id, video, score, headline, model)
  values (p_submission, p, coalesce(p_score, (p->>'score')::numeric), p->>'headline', coalesce(p->>'model', 'nas-vision'))
  on conflict (submission_id) do update set video = excluded.video,
    score = coalesce(p_score, public.analyses.score, excluded.score),
    headline = coalesce(public.analyses.headline, excluded.headline);
  update public.submissions set status = case when status in ('uploaded','processing') then 'analyzed' else status end where id = p_submission;
  insert into public.audit_log (festival_id, actor_label, action, target)
  values (s.festival_id, 'NAS', 'تحليل الفيديو', s.ref_code || ' · ' || coalesce(p->>'score', '—'));
end $$;

grant execute on function public.save_video_analysis(uuid, uuid, jsonb, numeric) to anon, authenticated;
