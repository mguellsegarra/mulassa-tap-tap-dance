-- "Estrena 2026" starts on the press release's day (15 October), not the first deploy's: beta already has 202610200002
-- with the old date, and its insert never overwrites. Only the hall of fame's dates read it. ASCII only (SQL Editor).
begin;
update leaderboard_private.seasons set starts_at = '2026-10-15 00:00 Europe/Madrid' where id = 0;
commit;
