-- Second opinions, week plans, trips, the wear log and push subscriptions.

-- ---------------------------------------------------------------------------
-- Second opinion: share an outfit or a shop find by link; friends vote without an account.
-- Votes are written by the server (service role) after it checks the link is open.
-- ---------------------------------------------------------------------------
create table if not exists public.second_opinions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  token         text not null unique check (char_length(token) between 10 and 40),
  kind          text not null check (kind in ('outfit', 'find')),
  outfit_id     uuid references public.outfits(id) on delete set null,
  candidate_id  uuid references public.wishlist_candidates(id) on delete set null,
  question      text check (question is null or char_length(question) <= 200),
  snapshot      jsonb not null default '{}',
  closes_at     timestamptz not null default (now() + interval '7 days'),
  seen_at       timestamptz,
  created_at    timestamptz not null default now()
);
create index if not exists second_opinions_user_idx on public.second_opinions (user_id, created_at desc);
alter table public.second_opinions enable row level security;
create policy "own opinions" on public.second_opinions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.opinion_votes (
  id          uuid primary key default gen_random_uuid(),
  opinion_id  uuid not null references public.second_opinions(id) on delete cascade,
  voter_key   text not null check (char_length(voter_key) between 10 and 64),
  voter_name  text check (voter_name is null or char_length(voter_name) <= 40),
  verdict     text not null check (verdict in ('works', 'almost', 'not')),
  comment     text check (comment is null or char_length(comment) <= 280),
  created_at  timestamptz not null default now(),
  unique (opinion_id, voter_key)
);
create index if not exists opinion_votes_opinion_idx on public.opinion_votes (opinion_id, created_at desc);
alter table public.opinion_votes enable row level security;
create policy "owner reads votes" on public.opinion_votes for select
  using (exists (select 1 from public.second_opinions o where o.id = opinion_id and o.user_id = auth.uid()));
create policy "owner deletes votes" on public.opinion_votes for delete
  using (exists (select 1 from public.second_opinions o where o.id = opinion_id and o.user_id = auth.uid()));

-- ---------------------------------------------------------------------------
-- Week plan: one planned outfit per day.
-- ---------------------------------------------------------------------------
create table if not exists public.plans (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  date        date not null,
  occasion    text not null default 'casual',
  outfit_id   uuid references public.outfits(id) on delete set null,
  weather     jsonb,
  worn        boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, date)
);
alter table public.plans enable row level security;
create policy "own plans" on public.plans for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Trips: looks for each day away and a packing list built from them.
--   looks:  [{key, date, occasion, label, item_ids, outfit_id, weather}]
--   packed: item ids and extra labels already in the bag
-- ---------------------------------------------------------------------------
create table if not exists public.trips (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  name            text check (name is null or char_length(name) <= 80),
  destination     text not null check (char_length(destination) <= 120),
  latitude        numeric,
  longitude       numeric,
  start_date      date not null,
  end_date        date not null check (end_date >= start_date and end_date - start_date <= 20),
  options         jsonb not null default '{}',
  weather_source  text,
  looks           jsonb not null default '[]',
  extras          jsonb not null default '[]',
  packed          text[] not null default '{}',
  created_at      timestamptz not null default now()
);
create index if not exists trips_user_idx on public.trips (user_id, start_date desc);
alter table public.trips enable row level security;
create policy "own trips" on public.trips for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Wear log: one row per piece per day worn. Powers cost per wear and "not worn lately".
-- ---------------------------------------------------------------------------
create table if not exists public.wear_log (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  item_id     uuid not null references public.closet_items(id) on delete cascade,
  worn_on     date not null,
  outfit_id   uuid references public.outfits(id) on delete set null,
  created_at  timestamptz not null default now(),
  unique (user_id, item_id, worn_on)
);
create index if not exists wear_log_user_idx on public.wear_log (user_id, worn_on desc);
alter table public.wear_log enable row level security;
create policy "own wear log" on public.wear_log for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Backfill from past "wore it" feedback and from last-worn dates.
insert into public.wear_log (user_id, item_id, worn_on, outfit_id)
select f.user_id, c.id, (f.created_at at time zone 'America/Los_Angeles')::date, o.id
from public.feedback f
join public.outfits o on o.id = f.target_id and o.user_id = f.user_id
cross join lateral unnest(o.item_ids) as x(item_id)
join public.closet_items c on c.id = x.item_id and c.user_id = f.user_id
where f.target = 'outfit' and f.type = 'wore'
on conflict (user_id, item_id, worn_on) do nothing;

insert into public.wear_log (user_id, item_id, worn_on)
select user_id, id, last_worn from public.closet_items where last_worn is not null
on conflict (user_id, item_id, worn_on) do nothing;

-- ---------------------------------------------------------------------------
-- Web push subscriptions (one per device).
-- ---------------------------------------------------------------------------
create table if not exists public.push_subscriptions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  endpoint      text not null unique check (char_length(endpoint) <= 1000),
  p256dh        text not null check (char_length(p256dh) <= 200),
  auth          text not null check (char_length(auth) <= 100),
  prefs         jsonb not null default '{"morning": true, "prices": true, "votes": true}',
  last_sent_at  timestamptz,
  created_at    timestamptz not null default now()
);
create index if not exists push_subscriptions_user_idx on public.push_subscriptions (user_id);
alter table public.push_subscriptions enable row level security;
create policy "own push subscriptions" on public.push_subscriptions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
