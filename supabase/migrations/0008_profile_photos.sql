-- Photos of the user in set angles and crops, for the future outfit mock-up tool.
-- Files live in the private closet bucket under <user id>/profile/, so the existing
-- storage policies (first folder = user id) already keep them to their owner.
create table if not exists public.profile_photos (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles(id) on delete cascade,
  slot             text not null,
  image_path       text not null,
  consent_version  int not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (user_id, slot)
);
alter table public.profile_photos enable row level security;
create policy "own profile photos" on public.profile_photos for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
