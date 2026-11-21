-- Abuse limits for public votes: a hashed network address per vote (rate limits), a cap enforced
-- in the database, and a timestamp so vote notifications are grouped instead of one per vote.
alter table public.opinion_votes add column if not exists ip_hash text check (ip_hash is null or char_length(ip_hash) <= 64);
create index if not exists opinion_votes_ip_idx on public.opinion_votes (opinion_id, ip_hash, created_at desc);
alter table public.second_opinions add column if not exists notified_at timestamptz;

create or replace function public.cap_opinion_votes()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  perform pg_advisory_xact_lock(hashtext(new.opinion_id::text));
  if (select count(*) from public.opinion_votes where opinion_id = new.opinion_id) >= 200 then
    raise exception 'vote cap reached' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
drop trigger if exists cap_opinion_votes on public.opinion_votes;
create trigger cap_opinion_votes before insert on public.opinion_votes for each row execute function public.cap_opinion_votes();
