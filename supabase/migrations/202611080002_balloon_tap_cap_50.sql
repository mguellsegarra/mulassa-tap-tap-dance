-- The balloon cap goes from 40 to 50 taps a second (src/game/judge-core.js BALLOON_TAP_RATE): a colla tapping together
-- made a real 225k on Drac NORMAL, over what 40 taps/s allows. Same model as 202611080001 (tools/data/score-ceiling.mjs,
-- a perfect run with every balloon at the cap, +5%). Only raises limits, so every stored entry still fits.
-- Idempotent. ASCII only (SQL Editor).
begin;

update leaderboard_private.versions v set max_score = c.max_score, extras_max = c.extras_max
from (values
  ('mulassa-v3', 0, 139000, 80000), ('mulassa-v3', 1, 155000, 81000), ('mulassa-v3', 2, 225000, 84000),
  ('drac-v1', 0, 225000, 171000), ('drac-v1', 1, 267000, 165000), ('drac-v1', 2, 302000, 157000)
) as c(version, difficulty, max_score, extras_max)
where v.version = c.version and v.difficulty = c.difficulty
  and (v.max_score <> c.max_score or v.extras_max <> c.extras_max);

commit;
