-- Price watch on wishlist finds: a watched candidate is re-scraped when the wishlist opens
-- (at most every 12 hours) and its price history is kept for drop alerts.
alter table public.wishlist_candidates
  add column if not exists watch boolean not null default false,
  add column if not exists first_price numeric,
  add column if not exists price_checked_at timestamptz,
  add column if not exists price_history jsonb not null default '[]'::jsonb;
create index if not exists wishlist_candidates_watch_idx on public.wishlist_candidates (user_id) where watch;
