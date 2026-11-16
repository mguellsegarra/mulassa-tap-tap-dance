-- Bou board, shipped in 1.4.0. Apply before the client: earlier servers reject Bou reads, results and stats.
-- Ceilings recomputed from song-bou.json at 50 taps/s plus 5%; scoring and bou-v1 remain unchanged.
begin;
insert into leaderboard_private.versions(version,difficulty,judgments,max_score,extras_max,active,figure_id,
  duration_seconds,guapa_count,balloon_count,hold_count) values
  ('bou-v1',0,155,205000,122000,true,'bou-tradicional-valls',140.8759,12,1,16),
  ('bou-v1',1,227,248000,126000,true,'bou-tradicional-valls',140.8759,12,1,27),
  ('bou-v1',2,356,323000,130000,true,'bou-tradicional-valls',140.8759,12,1,27) on conflict (version,difficulty) do nothing;
do $$
begin
  if exists (
    select 1 from (values
  ('bou-v1',0,155,205000,122000,true,'bou-tradicional-valls',140.8759,12,1,16),
  ('bou-v1',1,227,248000,126000,true,'bou-tradicional-valls',140.8759,12,1,27),
  ('bou-v1',2,356,323000,130000,true,'bou-tradicional-valls',140.8759,12,1,27)) as expected(version,difficulty,judgments,max_score,extras_max,active,figure_id,
      duration_seconds,guapa_count,balloon_count,hold_count)
    join leaderboard_private.versions v using(version,difficulty)
    where (v.judgments,v.max_score,v.extras_max,v.active,v.figure_id,v.duration_seconds,v.guapa_count,v.balloon_count,v.hold_count)
      is distinct from (expected.judgments,expected.max_score,expected.extras_max,expected.active,expected.figure_id,
        expected.duration_seconds,expected.guapa_count,expected.balloon_count,expected.hold_count)
      or v.retired_at is not null or v.retired_season_id is not null -- a retired bou-v1 is never republished
  ) then raise exception 'bou_version_contract_mismatch'; end if;
end $$;
commit;
