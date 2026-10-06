-- Score ceiling per level + one "who may write" rule (Marc, 2026-09-28).
--   * versions.max_score: until now 2147483647 (0001), so a crafted submit_result call could take #1 for good. Now the
--     highest score a human can reach on each level of mulassa-v1, +5%, generated from the chart and the game's scoring
--     by tools/score-ceiling.mjs (a perfect run, every GUAPA pair, every hold's trickle, the finale's x2, and the
--     balloons mashed at 30 taps/s over their whole window). tests/score-ceiling.mjs fails if the chart or scoring moves
--     and these numbers no longer match; src/leaderboard-rules.js MAX_SCORES carries the same ones, so the client never
--     sends more. Checked before applying: no real or seed result was above them.
--   * submit_result: a score over the ceiling is refused with its own code, leaderboard_score_ceiling (22023), shown in
--     Catalan by src/leaderboard.js; everything else as in 202609280004 (+ check_alias_free from 0011).
--   * leaderboard_private.require_player(): the single "must be a player" check, used by submit_result and update_alias
--     (the delete-player Edge Function has its twin, isPlayer). Today it REQUIRES an anonymous Auth user, exactly as
--     before; a future login is a one-line change here (and in isPlayer).
-- Same signatures, grants, security definer and search_path. Idempotent (update to fixed values, create or replace).
-- ASCII only (SQL Editor).
begin;

update leaderboard_private.versions set max_score = c.max_score
from (values (0, 147000), (1, 163000), (2, 250000)) as c(difficulty, max_score)
where versions.version = 'mulassa-v1' and versions.difficulty = c.difficulty and versions.max_score <> c.max_score;

-- Who may write to the leaderboard: the caller's uid, or leaderboard_auth_required. Only called from the security
-- definer RPCs below, never by clients.
create or replace function leaderboard_private.require_player() returns uuid
language plpgsql stable set search_path = '' as $$
declare v_uid uuid := auth.uid();
begin
  -- A player is an anonymous Auth user (the guest profile). To let a future login in, change only this condition.
  if v_uid is null or not exists(select 1 from auth.users where id = v_uid and is_anonymous) then
    raise exception 'leaderboard_auth_required' using errcode = '28000';
  end if;
  return v_uid;
end;
$$;
revoke all on function leaderboard_private.require_player() from public, anon, authenticated;

create or replace function public.submit_result(p_version text, p_difficulty integer,
  p_perfect integer, p_good integer, p_miss integer, p_score integer, p_max_combo integer, p_alias text)
returns table(improved boolean, quality numeric, score integer)
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid; v_alias text; v_total integer; v_max integer; v_written timestamptz; v_rows integer;
begin
  v_uid := leaderboard_private.require_player();
  v_alias := leaderboard_private.normalized_alias(p_alias);
  select judgments, max_score into v_total, v_max from leaderboard_private.versions
    where version = p_version and difficulty = p_difficulty and active;
  if v_total is null or p_perfect is null or p_good is null or p_miss is null
    or p_score is null or p_max_combo is null or p_perfect < 0 or p_good < 0 or p_miss < 0
    or p_perfect::bigint + p_good + p_miss <> v_total or p_score < 0
    or p_max_combo < 0 or p_max_combo > p_perfect::bigint + p_good then
    raise exception 'leaderboard_invalid_result' using errcode = '22023';
  end if;
  if p_score > v_max then -- more than a perfect run can make (tools/score-ceiling.mjs)
    raise exception 'leaderboard_score_ceiling' using errcode = '22023';
  end if;
  perform leaderboard_private.check_alias_free(v_alias, v_uid);
  -- The profile lock covers all difficulties and concurrent requests for this account.
  insert into leaderboard_private.profiles(user_id, alias) values (v_uid, v_alias) on conflict do nothing;
  select last_write_at into v_written from leaderboard_private.profiles where user_id = v_uid for update;
  if v_written > clock_timestamp() - interval '10 seconds' then
    raise exception 'leaderboard_rate_limit' using errcode = 'P0001';
  end if;
  update leaderboard_private.profiles set alias = v_alias, last_write_at = clock_timestamp(), last_active_at = now() where user_id = v_uid;
  insert into leaderboard_private.entries as existing(user_id, version, difficulty, perfect, good, miss, score, max_combo)
    values (v_uid, p_version, p_difficulty, p_perfect, p_good, p_miss, p_score, p_max_combo)
    on conflict (user_id, version, difficulty) do update set
      perfect = excluded.perfect, good = excluded.good, miss = excluded.miss,
      score = excluded.score, max_combo = excluded.max_combo, achieved_at = clock_timestamp()
    where (5 * excluded.perfect + 4 * excluded.good, excluded.score) > (existing.quality_units, existing.score);
  get diagnostics v_rows = row_count;
  return query select v_rows > 0, 20::numeric * e.quality_units / v_total, e.score
    from leaderboard_private.entries e where e.user_id = v_uid and e.version = p_version and e.difficulty = p_difficulty;
end;
$$;

-- As in 202609280011, with require_player().
create or replace function public.update_alias(p_alias text) returns text
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid; v_alias text; v_written timestamptz;
begin
  v_uid := leaderboard_private.require_player();
  v_alias := leaderboard_private.normalized_alias(p_alias);
  select last_write_at into v_written from leaderboard_private.profiles where user_id = v_uid for update;
  if not found then raise exception 'leaderboard_auth_profile_missing' using errcode = '28000'; end if;
  if v_written > clock_timestamp() - interval '10 seconds' then
    raise exception 'leaderboard_rate_limit' using errcode = 'P0001';
  end if;
  perform leaderboard_private.check_alias_free(v_alias, v_uid);
  update leaderboard_private.profiles set alias = v_alias, last_write_at = clock_timestamp(), last_active_at = now() where user_id = v_uid;
  return v_alias;
end;
$$;

-- The grants of 202609270001, restated (create or replace keeps them anyway).
revoke all on function public.submit_result(text, integer, integer, integer, integer, integer, integer, text) from public, anon;
revoke all on function public.update_alias(text) from public, anon;
grant execute on function public.submit_result(text, integer, integer, integer, integer, integer, integer, text) to authenticated;
grant execute on function public.update_alias(text) to authenticated;

commit;
