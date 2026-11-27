-- Outfit Lab: people rate outfits made from their own closet, as a whole and row by row.
-- The ratings build a per-user taste profile (src/lib/taste/) and an anonymized cross-user
-- aggregate (outfit_taste_cohorts below).

do $$ begin
  create type public.taste_rating as enum ('love', 'neutral', 'not');
exception when duplicate_object then null; end $$;

create table if not exists public.outfit_ratings (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  item_ids    uuid[] not null check (cardinality(item_ids) between 1 and 12),
  occasion    text,
  day_type    text check (day_type in ('weekday', 'weekend')),
  weather     jsonb,                 -- conditions the outfit was built for, if known
  source      text not null default 'lab' check (source in ('lab', 'daily')),
  rating      public.taste_rating not null,
  reasons     text[] not null default '{}',
  created_at  timestamptz not null default now()
);
create index if not exists outfit_ratings_user_idx on public.outfit_ratings (user_id, created_at desc);
alter table public.outfit_ratings enable row level security;
create policy "own outfit ratings" on public.outfit_ratings for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- One row per rated row of the outfit. The Top row can hold a top and its outer layer, so pieces are an array.
create table if not exists public.outfit_slot_ratings (
  id                   uuid primary key default gen_random_uuid(),
  outfit_rating_id     uuid not null references public.outfit_ratings(id) on delete cascade,
  user_id              uuid not null references public.profiles(id) on delete cascade,
  slot                 text not null check (slot in ('top', 'bottom', 'footwear', 'accessories')),
  item_ids             uuid[] not null default '{}',
  rating               public.taste_rating not null,
  reasons              text[] not null default '{}',
  replaced_item_id     uuid references public.closet_items(id) on delete set null,
  replacement_item_id  uuid references public.closet_items(id) on delete set null,
  no_match             boolean not null default false,  -- "I don't have anything that works here": a closet gap
  created_at           timestamptz not null default now(),
  check (not (no_match and replacement_item_id is not null))
);
create index if not exists outfit_slot_ratings_parent_idx on public.outfit_slot_ratings (outfit_rating_id);
create index if not exists outfit_slot_ratings_gap_idx on public.outfit_slot_ratings (user_id, slot) where no_match;
alter table public.outfit_slot_ratings enable row level security;
create policy "own outfit slot ratings" on public.outfit_slot_ratings for all
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (select 1 from public.outfit_ratings r where r.id = outfit_rating_id and r.user_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- Anonymized aggregate across users. No user ids and no item ids leave this function: only
-- attributes (slot, rating, reason, category, subcategory, color, occasion, day type) and
-- profile buckets (presentation, palette season, undertone, height band). A row is returned
-- only when at least `min_users` (never fewer than 5) different people stand behind it.
-- Service role only.
--
-- How it will feed cohort recommendations: for a person, pick rows matching their buckets
-- (e.g. presentation + palette season + height band), rank colors/subcategories by the
-- love share per slot, and use that to (1) seed the taste profile of someone with few
-- ratings, (2) order product searches for their wishlist gaps, and (3) suggest ideas
-- ("people with your palette love olive bottoms with cream tops").
-- Not here yet: age band (no age is stored) and a style bucket (style_prefs is free text).
-- ---------------------------------------------------------------------------
create or replace function public.outfit_taste_cohorts(min_users int default 5)
returns table (
  slot text, rating text, reason text, category text, subcategory text, color text,
  occasion text, day_type text, presentation text, palette_season text, undertone text, height_band text,
  users bigint, ratings bigint
)
language sql
stable
security definer
set search_path = public
as $$
  with base as (
    select r.user_id, r.id as rid, 'outfit'::text as slot, r.rating::text as rating, r.reasons, r.item_ids, r.occasion, r.day_type
    from public.outfit_ratings r
    union all
    select s.user_id, s.id, s.slot, s.rating::text, s.reasons, s.item_ids, r.occasion, r.day_type
    from public.outfit_slot_ratings s
    join public.outfit_ratings r on r.id = s.outfit_rating_id
  ),
  expanded as (
    select b.user_id, b.rid, b.slot, b.rating, rs.reason, lower(ci.category) as category, lower(ci.subcategory) as subcategory,
           lower(c.value->>'name') as color, b.occasion, b.day_type
    from base b
    left join lateral unnest(case when cardinality(b.reasons) = 0 then array[null::text] else b.reasons end) as rs(reason) on true
    left join lateral unnest(b.item_ids) as it(item_id) on true
    left join public.closet_items ci on ci.id = it.item_id
    left join lateral jsonb_array_elements(case when jsonb_typeof(ci.colors) = 'array' then ci.colors else '[]'::jsonb end) as c(value) on true
  )
  select e.slot, e.rating, e.reason, e.category, e.subcategory, e.color, e.occasion, e.day_type,
         p.presentation::text,
         lower(cp.season_label),
         lower(cp.undertone),
         case
           when m.height_in is null then null
           when m.height_in < 63 then 'under 5ft3'
           when m.height_in < 67 then '5ft3 to 5ft6'
           when m.height_in < 71 then '5ft7 to 5ft10'
           else '5ft11 and up'
         end,
         count(distinct e.user_id),
         count(distinct e.rid)
  from expanded e
  join public.profiles p on p.id = e.user_id
  left join public.color_profiles cp on cp.user_id = e.user_id
  left join public.measurements m on m.user_id = e.user_id
  group by 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12
  having count(distinct e.user_id) >= greatest(coalesce(min_users, 5), 5);
$$;

revoke all on function public.outfit_taste_cohorts(int) from public, anon, authenticated;
grant execute on function public.outfit_taste_cohorts(int) to service_role;
