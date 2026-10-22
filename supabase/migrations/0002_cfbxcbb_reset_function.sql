-- Owner-only reset for the community pilot: clears the audit log and ratings
-- (the program allowlist is kept). Callable only by the database owner /
-- service role — EXECUTE is revoked from public, anon and authenticated, so it
-- is never reachable from the public API. NOT yet applied to the project —
-- run this file in the Supabase SQL editor first. Usage (SQL editor / service role):
--   select * from public.cfbxcbb_reset_community();
create or replace function public.cfbxcbb_reset_community()
returns table (votes bigint, ratings bigint)
language plpgsql security definer set search_path = public
as $$
begin
  delete from cfbxcbb_duel_votes;
  delete from cfbxcbb_ratings;
  return query select (select count(*) from cfbxcbb_duel_votes), (select count(*) from cfbxcbb_ratings);
end;
$$;
revoke all on function public.cfbxcbb_reset_community() from public, anon, authenticated;
