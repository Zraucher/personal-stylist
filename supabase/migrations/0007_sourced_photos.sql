-- Product photos found online for items that have no photo yet.
-- The owner reviews each one on /closet/sourced; accepting copies the image
-- into the private closet bucket and sets image_path.
alter table public.closet_items
  add column if not exists source_image_url text,
  add column if not exists source_page_url text;
