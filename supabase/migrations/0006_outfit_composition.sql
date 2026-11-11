-- Session 5: outfits keep a name and the composition check that was run when they were saved.
alter table public.outfits add column if not exists name text;
alter table public.outfits add column if not exists composition jsonb;
