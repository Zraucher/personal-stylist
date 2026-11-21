-- Changing an existing vote (upsert) must still work when the cap is reached.
create or replace function public.cap_opinion_votes()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  perform pg_advisory_xact_lock(hashtext(new.opinion_id::text));
  if exists (select 1 from public.opinion_votes where opinion_id = new.opinion_id and voter_key = new.voter_key) then
    return new;
  end if;
  if (select count(*) from public.opinion_votes where opinion_id = new.opinion_id) >= 200 then
    raise exception 'vote cap reached' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
