-- PENDING, NOT APPLIED: the Bou Tradicional's online board (score version bou-v1). Kept out of supabase/migrations so no
-- deployment applies it by itself. Activating it needs Marc's explicit approval, then, in this order:
--   1. move this file to supabase/migrations/ and apply it to the database;
--   2. in the client: drop `noBoard` from the Bou (src/game/figures.js), add 'bou-v1' to PUBLISHABLE
--      (src/services/leaderboard-rules.js) and to FIGURE_VERSIONS (src/services/leaderboard.js).
-- A client released before step 1 would only get refused submissions and statistics, so the order matters.
-- Numbers from tools/score-ceiling.mjs over src/song-bou.json (tests/bou-board-db.mjs keeps them in step):
-- judgments, max_score and extras_max per level; duration = song.end; 9 GUAPA, no balloons, holds from NORMAL.
insert into leaderboard_private.versions(version,difficulty,judgments,max_score,extras_max,active,figure_id) values
  ('bou-v1',0,131,69000,0,true,'bou-tradicional-valls'),
  ('bou-v1',1,225,126000,5000,true,'bou-tradicional-valls'),
  ('bou-v1',2,423,237000,5000,true,'bou-tradicional-valls') on conflict (version,difficulty) do nothing;
update leaderboard_private.versions set duration_seconds = 149.9347, guapa_count = 9, balloon_count = 0,
  hold_count = (array[0,10,10])[difficulty+1] where version = 'bou-v1';
