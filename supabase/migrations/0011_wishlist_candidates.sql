-- Session 9 (sourcing): products found for a wishlist entry.
create table if not exists public.wishlist_candidates (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles(id) on delete cascade,
  wishlist_id      uuid not null references public.wishlist(id) on delete cascade,
  url              text not null,
  name             text,
  brand            text,
  image_url        text,
  price            numeric,
  currency         text,
  colors           jsonb not null default '[]',
  palette_status   text,
  palette_reason   text,
  state            text not null default 'new' check (state in ('new', 'saved', 'dismissed')),
  created_at       timestamptz not null default now(),
  unique (wishlist_id, url)
);
alter table public.wishlist_candidates enable row level security;
create policy "own wishlist candidates" on public.wishlist_candidates for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table public.wishlist
  add column if not exists title text,
  add column if not exists colors text[] not null default '{}',
  add column if not exists last_searched_at timestamptz;
