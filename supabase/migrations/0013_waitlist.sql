-- Invite waitlist for the marketing home page. Insert-only for visitors; nobody can read it via the API.
create table if not exists public.waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (char_length(email) between 5 and 254 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  first_name text check (first_name is null or char_length(first_name) <= 60),
  source text check (source is null or char_length(source) <= 40),
  created_at timestamptz not null default now()
);
alter table public.waitlist enable row level security;
create policy "waitlist insert" on public.waitlist for insert to anon, authenticated with check (true);
