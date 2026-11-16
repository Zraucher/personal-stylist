-- Session 8 (haul review): what the scraper and the tagger found for each product.
alter table public.haul_items
  add column if not exists price numeric,
  add column if not exists currency text,
  add column if not exists brand text,
  add column if not exists category text,
  add column if not exists subcategory text,
  add column if not exists material text,
  add column if not exists pattern text,
  add column if not exists construction text[] not null default '{}',
  add column if not exists headline text,
  add column if not exists color_mismatch text,
  add column if not exists scrape_status text,
  add column if not exists scrape_source text,
  add column if not exists source_image_url text,
  add column if not exists status text not null default 'considering' check (status in ('considering', 'purchased', 'returned', 'passed')),
  add column if not exists closet_item_id uuid references public.closet_items(id) on delete set null;
