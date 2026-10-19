-- Contact page: what the visitor needs, their message and an optional phone number.
alter table public.contact_requests add column if not exists topic text, add column if not exists message text, add column if not exists phone text;
