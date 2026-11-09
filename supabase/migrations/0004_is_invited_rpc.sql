-- Lets the login page check the invite list with the anon key only.
-- Returns a boolean; never exposes the list itself.
create or replace function public.is_invited(p_email text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (select 1 from public.invites i where lower(i.email) = lower(trim(p_email)));
$$;

revoke all on function public.is_invited(text) from public;
grant execute on function public.is_invited(text) to anon, authenticated;
