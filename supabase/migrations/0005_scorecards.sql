-- Session 4: item scorecards.
-- One row per review run, so history is kept and the newest row is the current verdict.
create table if not exists public.scorecards (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.profiles(id) on delete cascade,
  item_id           uuid not null references public.closet_items(id) on delete cascade,
  verdict           text not null check (verdict in ('keep', 'cut', 'provisional')),
  headline          text,
  scores            jsonb not null default '{}',  -- {palette:{status,reason}, fabric:{...}, silhouette:{...}, vibe:{...}}
  tailoring_needed  boolean not null default false,
  tailoring_note    text,
  model             text,
  created_at        timestamptz not null default now()
);
create index if not exists scorecards_item_idx on public.scorecards (item_id, created_at desc);
create index if not exists scorecards_user_idx on public.scorecards (user_id, created_at desc);
alter table public.scorecards enable row level security;
create policy "own scorecards" on public.scorecards for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Agree / disagree feedback points at the exact scorecard it judged.
alter table public.feedback
  add column if not exists scorecard_id uuid references public.scorecards(id) on delete set null;
