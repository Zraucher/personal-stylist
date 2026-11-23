-- Saved products: a link saved from any store, not tied to a wish (wishlist_id is null).
alter table public.wishlist_candidates alter column wishlist_id drop not null;
create unique index if not exists wishlist_candidates_saved_url on public.wishlist_candidates (user_id, url) where wishlist_id is null;
