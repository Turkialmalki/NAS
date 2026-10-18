-- Three roles chosen at registration: festival organiser, filmmaker, judge.
alter table public.profiles drop constraint if exists profiles_account_type_check;
alter table public.profiles add constraint profiles_account_type_check check (account_type in ('filmmaker','festival','judge'));
-- existing users: infer their role from what they already do
update public.profiles p set account_type = 'festival' where account_type is null and exists (select 1 from public.festival_members m where m.user_id = p.id and m.role <> 'reviewer');
update public.profiles p set account_type = 'judge' where account_type is null and exists (select 1 from public.festival_members m where m.user_id = p.id and m.role = 'reviewer');
update public.profiles p set account_type = 'filmmaker' where account_type is null and exists (select 1 from public.projects x where x.owner_id = p.id);
