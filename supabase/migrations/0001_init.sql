-- Personal Stylist: initial schema
-- Session 1. Invite-gated users, profiles, and the Phase 1 data model.
-- Every per-user table has Row Level Security so a user only ever sees their own rows.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Invites: the only way in. An email must be here before magic-link sign-in
-- is allowed. The trigger below enforces it at the database level too, so a
-- direct call to the auth API cannot bypass the app's check.
-- ---------------------------------------------------------------------------
create table if not exists public.invites (
  email        text primary key,
  invited_by   text,
  note         text,
  created_at   timestamptz not null default now(),
  accepted_at  timestamptz
);

alter table public.invites enable row level security;
-- No policies on purpose: only the service role (server) reads or writes invites.

create or replace function public.enforce_invite()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.invites i where lower(i.email) = lower(new.email)) then
    raise exception 'This email has not been invited.' using errcode = 'P0001';
  end if;
  update public.invites set accepted_at = coalesce(accepted_at, now()) where lower(email) = lower(new.email);
  return new;
end;
$$;

drop trigger if exists enforce_invite_on_signup on auth.users;
create trigger enforce_invite_on_signup
  before insert on auth.users
  for each row execute function public.enforce_invite();

-- ---------------------------------------------------------------------------
-- Users (profile row per auth user)
-- ---------------------------------------------------------------------------
create type public.presentation as enum ('womens', 'mens', 'both');

create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text not null,
  name          text,
  location      text,
  presentation  public.presentation not null default 'both',
  created_at    timestamptz not null default now()
);

alter table public.profiles enable row level security;
create policy "own profile read"   on public.profiles for select using (auth.uid() = id);
create policy "own profile update" on public.profiles for update using (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Measurements
-- ---------------------------------------------------------------------------
create table if not exists public.measurements (
  user_id        uuid primary key references public.profiles(id) on delete cascade,
  height_in      numeric,
  inseam_in      numeric,
  shoulders_in   numeric,
  chest_bust_in  numeric,
  bust_cup       text,
  waist_in       numeric,
  hips_in        numeric,
  high_hip_in    numeric,
  neck_in        numeric,
  sleeve_in      numeric,
  rise_target_in text,
  sizing_notes   text,
  updated_at     timestamptz not null default now()
);
alter table public.measurements enable row level security;
create policy "own measurements" on public.measurements for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Color profile
-- ---------------------------------------------------------------------------
create table if not exists public.color_profiles (
  user_id       uuid primary key references public.profiles(id) on delete cascade,
  season_label  text,
  undertone     text,
  depth         text,
  contrast      text,
  best_colors   text[] not null default '{}',
  avoid_colors  text[] not null default '{}',
  confidence    text,
  source        text check (source in ('stated', 'assessed')),
  notes         text,
  updated_at    timestamptz not null default now()
);
alter table public.color_profiles enable row level security;
create policy "own color profile" on public.color_profiles for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Style preferences. Fabric avoid/prefer carry a hard|soft flag as JSON:
--   [{"name":"linen","strength":"hard"},{"name":"stretch denim","strength":"soft"}]
-- ---------------------------------------------------------------------------
create table if not exists public.style_prefs (
  user_id               uuid primary key references public.profiles(id) on delete cascade,
  aesthetic_statement   text,
  loves                 text[] not null default '{}',
  dislikes              text[] not null default '{}',
  silhouettes_preferred text[] not null default '{}',
  silhouettes_avoid     text[] not null default '{}',
  necklines             text[] not null default '{}',
  fabrics_preferred     jsonb  not null default '[]',
  fabrics_avoid         jsonb  not null default '[]',
  tuck_styles           text[] not null default '{}',
  updated_at            timestamptz not null default now()
);
alter table public.style_prefs enable row level security;
create policy "own style prefs" on public.style_prefs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Brands
-- ---------------------------------------------------------------------------
create table if not exists public.brands (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  name       text not null,
  status     text not null check (status in ('loved', 'mixed', 'avoid')),
  note       text,
  best_for   text,
  created_at timestamptz not null default now()
);
alter table public.brands enable row level security;
create policy "own brands" on public.brands for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Principles: universal rows have user_id NULL and are readable by everyone.
-- ---------------------------------------------------------------------------
create table if not exists public.principles (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid references public.profiles(id) on delete cascade,
  rule             text not null,
  rationale        text,
  example_failure  text,
  example_success  text,
  sort_order       int not null default 100,
  created_at       timestamptz not null default now()
);
alter table public.principles enable row level security;
create policy "principles read"  on public.principles for select using (user_id is null or auth.uid() = user_id);
create policy "principles write" on public.principles for insert with check (auth.uid() = user_id);
create policy "principles edit"  on public.principles for update using (auth.uid() = user_id);
create policy "principles del"   on public.principles for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Benchmarks: positive (proven looks) and negative (failures) examples.
-- ---------------------------------------------------------------------------
create table if not exists public.benchmarks (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  label         text not null,
  image_path    text,
  why_it_works  text,
  polarity      text not null check (polarity in ('positive', 'negative')),
  created_at    timestamptz not null default now()
);
alter table public.benchmarks enable row level security;
create policy "own benchmarks" on public.benchmarks for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Closet
-- ---------------------------------------------------------------------------
create type public.item_status as enum ('available', 'laundry', 'stored', 'tailoring', 'gone');

create table if not exists public.closet_items (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles(id) on delete cascade,
  image_path       text,
  generic_id       text,
  name             text,
  category         text,
  subcategory      text,
  colors           jsonb not null default '[]',   -- [{"hex":"#6b705c","name":"olive"}]
  pattern          text,
  material         text,
  construction     text[] not null default '{}',  -- collar, buttons, ruffles, tiered hem...
  formality        smallint check (formality between 1 and 5),
  warmth           smallint check (warmth between 1 and 5),
  seasons          text[] not null default '{}',
  brand            text,
  price            numeric,
  size             text,
  status           public.item_status not null default 'available',
  tailoring_note   text,
  last_worn        date,
  affinity         numeric not null default 0,
  consent_version  int not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists closet_items_user_idx on public.closet_items (user_id, status);
alter table public.closet_items enable row level security;
create policy "own closet" on public.closet_items for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Outfits
-- ---------------------------------------------------------------------------
create table if not exists public.outfits (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references public.profiles(id) on delete cascade,
  item_ids           uuid[] not null default '{}',
  occasion           text,
  source             text not null check (source in ('generated', 'user')),
  composition_notes  text,
  created_at         timestamptz not null default now()
);
alter table public.outfits enable row level security;
create policy "own outfits" on public.outfits for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Day profiles and recommendations (Today)
-- ---------------------------------------------------------------------------
create table if not exists public.day_profiles (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.profiles(id) on delete cascade,
  date              date not null,
  weather           jsonb,
  uv_index          numeric,
  indoor_cold_flag  boolean not null default false,
  events_summary    text,
  formality_band    text,
  created_at        timestamptz not null default now(),
  unique (user_id, date)
);
alter table public.day_profiles enable row level security;
create policy "own day profiles" on public.day_profiles for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.recommendations (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references public.profiles(id) on delete cascade,
  day_profile_id     uuid references public.day_profiles(id) on delete set null,
  candidates         jsonb not null default '[]',  -- [{outfit_id, scores{...}, why}]
  chosen_outfit_id   uuid references public.outfits(id) on delete set null,
  created_at         timestamptz not null default now()
);
alter table public.recommendations enable row level security;
create policy "own recommendations" on public.recommendations for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Feedback
-- ---------------------------------------------------------------------------
create table if not exists public.feedback (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  target       text not null check (target in ('item', 'outfit', 'recommendation', 'haul_item')),
  target_id    uuid not null,
  type         text not null check (type in ('wore', 'skipped', 'disliked', 'swapped_out', 'swapped_in', 'benchmark', 'failure', 'agree', 'disagree')),
  note         text,
  created_at   timestamptz not null default now()
);
create index if not exists feedback_user_idx on public.feedback (user_id, created_at desc);
alter table public.feedback enable row level security;
create policy "own feedback" on public.feedback for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Hauls (Phase 2 shopping, created now so the seed loader can record history)
-- ---------------------------------------------------------------------------
create table if not exists public.hauls (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  date        date,
  retailer    text,
  status      text not null check (status in ('considering', 'purchased', 'returned', 'mixed')),
  notes       text,
  created_at  timestamptz not null default now()
);
alter table public.hauls enable row level security;
create policy "own hauls" on public.hauls for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.haul_items (
  id                 uuid primary key default gen_random_uuid(),
  haul_id            uuid not null references public.hauls(id) on delete cascade,
  user_id            uuid not null references public.profiles(id) on delete cascade,
  name               text not null,
  url                text,
  image_path         text,
  stated_colorway    text,
  verified_colors    jsonb not null default '[]',
  scores             jsonb,          -- {palette, fabric, silhouette, vibe} each with score + note
  verdict            text check (verdict in ('keep', 'cut', 'provisional')),
  reasoning          text,
  tailoring_needed   text,
  created_at         timestamptz not null default now()
);
alter table public.haul_items enable row level security;
create policy "own haul items" on public.haul_items for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Retailers (shared reference data, readable by all users)
-- ---------------------------------------------------------------------------
create table if not exists public.retailers (
  id               uuid primary key default gen_random_uuid(),
  name             text not null unique,
  sourcing_notes   text,
  best_for         text,
  scrape_strategy  text,
  created_at       timestamptz not null default now()
);
alter table public.retailers enable row level security;
create policy "retailers read" on public.retailers for select using (auth.role() = 'authenticated');

-- ---------------------------------------------------------------------------
-- Wishlist and upcoming needs
-- ---------------------------------------------------------------------------
create table if not exists public.wishlist (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  category     text not null,
  preferences  text,
  budget       text,
  status       text not null default 'open' check (status in ('open', 'found', 'dropped')),
  created_at   timestamptz not null default now()
);
alter table public.wishlist enable row level security;
create policy "own wishlist" on public.wishlist for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.upcoming_needs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  label       text not null,
  season      text,
  status      text not null default 'open' check (status in ('open', 'styled', 'done')),
  created_at  timestamptz not null default now()
);
alter table public.upcoming_needs enable row level security;
create policy "own upcoming needs" on public.upcoming_needs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Storage bucket for closet and benchmark images. Private; paths are
-- <user_id>/<uuid>.<ext> and policies key on the first folder segment.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('closet', 'closet', false)
on conflict (id) do nothing;

create policy "closet images read own"
  on storage.objects for select
  using (bucket_id = 'closet' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "closet images write own"
  on storage.objects for insert
  with check (bucket_id = 'closet' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "closet images update own"
  on storage.objects for update
  using (bucket_id = 'closet' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "closet images delete own"
  on storage.objects for delete
  using (bucket_id = 'closet' and (storage.foldername(name))[1] = auth.uid()::text);
