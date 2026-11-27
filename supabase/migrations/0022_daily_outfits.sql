-- Outfit of the day: one pick per person per local date, made from their own closet.
-- Written by the service role (home page on first load, the 6:30 morning job); people read their own.
create table if not exists public.daily_outfits (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  date         date not null,
  day_type     text not null check (day_type in ('work', 'weekend', 'holiday')),
  occasion     text not null,
  item_ids     uuid[] not null default '{}',
  name         text not null check (char_length(name) <= 120),
  reason       text,
  weather      jsonb,
  notified_at  timestamptz,
  created_at   timestamptz not null default now(),
  unique (user_id, date)
);
alter table public.daily_outfits enable row level security;
create policy "read own daily outfits" on public.daily_outfits for select using (auth.uid() = user_id);
