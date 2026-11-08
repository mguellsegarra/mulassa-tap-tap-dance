-- Balloons count at most 40 taps a second (src/game/judge-core.js balloonTapCap), and the ceilings follow that cap
-- instead of the old 30 taps/s guess: a real 216k Drac run was over the old ceiling and never reached the board.
-- Numbers from tools/data/score-ceiling.mjs (a perfect run with every balloon at the cap, +5%). Only the active
-- versions move: mulassa-v1 and mulassa-v2-short keep their published contract. Only raises limits, so every stored
-- entry still fits. Idempotent. ASCII only (SQL Editor).
begin;

update leaderboard_private.versions v set max_score = c.max_score, extras_max = c.extras_max
from (values
  ('mulassa-v3', 0, 125000, 66000), ('mulassa-v3', 1, 144000, 69000), ('mulassa-v3', 2, 209000, 67000),
  ('drac-v1', 0, 195000, 142000), ('drac-v1', 1, 231000, 128000), ('drac-v1', 2, 267000, 122000)
) as c(version, difficulty, max_score, extras_max)
where v.version = c.version and v.difficulty = c.difficulty
  and (v.max_score <> c.max_score or v.extras_max <> c.extras_max);

commit;
