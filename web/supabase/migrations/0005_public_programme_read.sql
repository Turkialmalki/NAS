-- A festival whose programme is published stays publicly readable after submissions close,
-- so /f/<slug> can show the screening schedule.
create policy "read festivals with public programme" on public.festivals for select using (programme_published and visibility = 'public');
