-- Session 6 (Today) and 7 (Ask): where the user is, and what each recommendation was for.
alter table public.profiles
  add column if not exists latitude numeric,
  add column if not exists longitude numeric,
  add column if not exists timezone text;

alter table public.recommendations
  add column if not exists kind text not null default 'today' check (kind in ('today', 'ask')),
  add column if not exists occasion text,
  add column if not exists prompt text,
  add column if not exists constraints jsonb;

create index if not exists recommendations_user_idx on public.recommendations (user_id, created_at desc);
