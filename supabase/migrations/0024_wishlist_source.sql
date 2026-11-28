-- Where a saved product came from when it wasn't saved by hand, e.g. "Moonsift · Clothes".
alter table public.wishlist_candidates
  add column if not exists source text check (char_length(source) <= 200);
