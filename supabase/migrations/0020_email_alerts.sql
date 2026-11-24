-- Price-drop emails are on by default; Profile and the email's unsubscribe link turn them off.
alter table public.profiles add column if not exists email_alerts boolean not null default true;
