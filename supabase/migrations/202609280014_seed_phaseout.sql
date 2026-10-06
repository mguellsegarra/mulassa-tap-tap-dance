-- Seed phase-out (2026-09-28). The 2026 seed players (tests/fixtures/seed-leaderboard-2026.sql, ids
-- 5eed2026-0000-4000-8000-...) filled the empty boards; now every REAL player with a result on a level hides ONE seed
-- result on that same level, until that level has no seeds left.
--   * leaderboard_private.profiles.is_seed: the explicit marker (default false = a real player). Backfilled here for
--     the existing seed ids; the seed file sets it too. Nothing public shows it: seeds look exactly like players.
--   * leaderboard_private.visible_entries(p_version): the entries of a version minus, on each level, the k LOWEST seed
--     results, where k = the number of real players with a result on that level. "Lowest" is the exact reverse of the
--     board order (score, then quality, then the later / higher id first). Why the lowest first: the top of the board
--     stays a challenge (the best seeds are the ones worth beating), the tail fills with real people, and the rows that
--     go are the ones nobody looks at (the modest bottom of the board), so the phase-out is invisible; the board's size
--     stays about the same while seeds remain, so it never looks empty nor suddenly inflated.
--   * get_leaderboard_all: same signature, grants, security definer and search_path as 202609280005; it ranks only
--     visible_entries, so position, total (the "#N de M - top X%" and "Ets el numero N - top X%" lines), the caller's
--     +-5 neighbours and every page come from the same set. submit_result returns no rank, so it is unchanged.
-- HIDE, NEVER DELETE: hidden seeds stay in entries/profiles. It is computed on every read, so it follows the live
-- counts (a real player deleting their profile brings a seed back). To show every seed again, replace visible_entries
-- with a plain "select * from entries where version = p_version".
-- Seeds are never the caller (no one signs in as them), so is_self is unaffected; real players are never hidden.
-- Idempotent (add column if not exists, a backfill that only sets true, create or replace). ASCII only (SQL Editor).
begin;

alter table leaderboard_private.profiles add column if not exists is_seed boolean not null default false;
comment on column leaderboard_private.profiles.is_seed is
  'Seed player (tests/fixtures/seed-leaderboard-2026.sql). Hidden one per real player per level by visible_entries(); never shown publicly.';

update leaderboard_private.profiles set is_seed = true
  where user_id::text like '5eed2026-0000-4000-8000-%' and not is_seed;

-- The results the public board ranks: every real result, and the seeds not yet phased out (see the header).
create or replace function leaderboard_private.visible_entries(p_version text)
returns setof leaderboard_private.entries
language sql stable set search_path = '' as $$
  with e as (
    select x.id, x.difficulty, x.score, x.quality_units, x.achieved_at, p.is_seed
    from leaderboard_private.entries x join leaderboard_private.profiles p on p.user_id = x.user_id
    where x.version = p_version
  ), real_players as ( -- k per level
    select e.difficulty, count(*) as k from e where not e.is_seed group by e.difficulty
  ), hidden as ( -- the k lowest seeds of each level (1 = the lowest)
    select s.id from (
      select e.id, e.difficulty, row_number() over (partition by e.difficulty
        order by e.score, e.quality_units, e.achieved_at desc, e.id desc) as from_bottom
      from e where e.is_seed) s
    join real_players r on r.difficulty = s.difficulty
    where s.from_bottom <= r.k
  )
  select x.* from leaderboard_private.entries x
  where x.version = p_version and not exists (select 1 from hidden h where h.id = x.id)
$$;
revoke all on function leaderboard_private.visible_entries(text) from public, anon, authenticated;

-- As in 202609280005, reading visible_entries instead of entries.
create or replace function public.get_leaderboard_all(p_version text, p_period text default 'all', p_offset integer default 0,
  p_limit integer default 50)
returns table("position" bigint, alias text, difficulty integer, quality numeric, score integer, is_self boolean, total bigint)
language plpgsql security definer set search_path = '' as $$
#variable_conflict use_column
declare v_uid uuid := auth.uid(); v_from integer := greatest(coalesce(p_offset, 0), 0);
  v_count integer := least(greatest(coalesce(p_limit, 50), 1), 50);
begin
  if p_period is distinct from 'all' then
    raise exception 'leaderboard_invalid_period' using errcode = '22023';
  end if;
  if not exists (select 1 from leaderboard_private.versions v where v.version = p_version and v.active) then
    raise exception 'leaderboard_invalid_version' using errcode = '22023';
  end if;
  if v_uid is not null and v_from = 0 then
    update leaderboard_private.profiles set last_active_at = now()
      where user_id = v_uid and last_active_at < now() - interval '10 minutes';
  end if;
  return query
    with best as ( -- each player's best visible result by points, over every active level
      select distinct on (e.user_id) e.user_id, e.difficulty, e.quality_units, e.score, e.achieved_at, e.id
      from leaderboard_private.visible_entries(p_version) e
      join leaderboard_private.versions v on v.version = e.version and v.difficulty = e.difficulty and v.active
      order by e.user_id, e.score desc, e.quality_units desc, e.achieved_at, e.id
    ), ranked as (
      select b.*, row_number() over (order by b.score desc, b.quality_units desc, b.achieved_at, b.id) as pos,
        count(*) over () as n
      from best b
    ), me as (select r.pos from ranked r where r.user_id = v_uid)
    select r.pos, p.alias, r.difficulty::integer, 20::numeric * r.quality_units / v.judgments, r.score,
      coalesce(r.user_id = v_uid, false), r.n
    from ranked r
    join leaderboard_private.profiles p on p.user_id = r.user_id
    join leaderboard_private.versions v on v.version = p_version and v.difficulty = r.difficulty
    where r.pos between v_from + 1 and v_from + v_count
      or (v_from = 0 and exists (select 1 from me where r.pos between me.pos - 5 and me.pos + 5))
    order by r.pos;
end;
$$;
revoke all on function public.get_leaderboard_all(text, text, integer, integer) from public;
grant execute on function public.get_leaderboard_all(text, text, integer, integer) to anon, authenticated;

commit;
