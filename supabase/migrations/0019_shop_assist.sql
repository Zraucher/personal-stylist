-- Sale and target-price alerts, review stats and the "should I buy it" advice on wishlist finds.
alter table public.wishlist_candidates
  add column if not exists list_price numeric,
  add column if not exists target_price numeric,
  add column if not exists rating numeric,
  add column if not exists review_count integer,
  add column if not exists advice jsonb,
  add column if not exists advised_at timestamptz;
