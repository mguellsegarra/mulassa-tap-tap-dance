-- The per-level board (202609270001) is gone from the client: Classificacions reads only get_leaderboard_all
-- (202609280005, live), so the old per-level read has no caller left. ASCII only (SQL Editor).
begin;
drop function if exists public.get_leaderboard(text, integer);
commit;
