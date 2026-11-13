-- PENDING, NOT APPLIED: the Bou Tradicional's online board (score version bou-v1). Kept out of supabase/migrations so no
-- deployment applies it by itself. Activating it needs the owner's explicit approval, then, in this order:
--   1. move this file to supabase/migrations/ and apply it to the database;
--   2. in the client: drop `noBoard` from the Bou (src/game/figures.js), add 'bou-v1' to PUBLISHABLE
--      (src/services/leaderboard-rules.js) and to FIGURE_VERSIONS (src/services/leaderboard.js).
-- A client released before step 1 would only get refused submissions and statistics, so the order matters.
-- Numbers from tools/data/score-ceiling.mjs over src/song-bou.json (tests/figures/bou/bou-board-db.mjs keeps them in step):
-- judgments, max_score and extras_max per level; duration = song.end; 12 BRAMA, one balloon (the esquellot), holds on every level (the held runs from NORMAL up).
insert into leaderboard_private.versions(version,difficulty,judgments,max_score,extras_max,active,figure_id) values
  ('bou-v1',0,155,205000,122000,true,'bou-tradicional-valls'),
  ('bou-v1',1,227,248000,126000,true,'bou-tradicional-valls'),
  ('bou-v1',2,356,323000,130000,true,'bou-tradicional-valls') on conflict (version,difficulty) do nothing;
update leaderboard_private.versions set duration_seconds = 140.8759, guapa_count = 12, balloon_count = 1,
  hold_count = (array[16,27,27])[difficulty+1] where version = 'bou-v1';
