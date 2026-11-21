-- Outfits made by the week planner are tagged so the Outfits list can leave them out.
alter table public.outfits add column if not exists origin text check (origin is null or origin in ('plan'));
create index if not exists plans_user_date_idx on public.plans (user_id, date);
