-- Preserve raw historical results; calibrate short-song points on the original board scale.
-- Anchors use chronological perfect runs, full holds and 12 balloon taps/second, not duration.
-- Both versions share a board; unknown versions keep their own isolated boards.
-- Idempotent, no historical entry updates. ASCII only.
begin;

insert into leaderboard_private.versions(version, difficulty, judgments, max_score, extras_max, active)
values ('mulassa-v2-short', 0, 108, 109000, 50000, true),
       ('mulassa-v2-short', 1, 133, 122000, 48000, true),
       ('mulassa-v2-short', 2, 240, 193000, 51000, true)
on conflict (version, difficulty) do update set
  judgments = excluded.judgments, max_score = excluded.max_score, extras_max = excluded.extras_max;

create or replace function leaderboard_private.score_family(p_version text) returns text
language sql immutable set search_path = '' as $$
  select case when p_version in ('mulassa-v1', 'mulassa-v2-short') then 'mulassa-v1' else p_version end
$$;
revoke all on function leaderboard_private.score_family(text) from public, anon, authenticated;

create or replace function leaderboard_private.comparable_score(p_version text, p_difficulty integer, p_raw integer)
returns integer language sql immutable set search_path = '' as $$
  select case when p_version = 'mulassa-v2-short' then
    round(p_raw::numeric * (array[96572,113940,196572])[p_difficulty + 1]
      / (array[69350,83540,149972])[p_difficulty + 1])::integer
    else p_raw end
$$;
revoke all on function leaderboard_private.comparable_score(text, integer, integer) from public, anon, authenticated;

-- Each distinct real player hides one lowest seed per level across the family.
-- Inactive levels contribute neither visible rows nor phase-out counts.
create or replace function leaderboard_private.visible_entries(p_version text)
returns setof leaderboard_private.entries
language sql stable set search_path = '' as $$
  with e as (
    select x.id, x.user_id, x.difficulty,
      leaderboard_private.comparable_score(x.version, x.difficulty::integer, x.score) as score,
      x.quality_units::numeric * case when x.version in ('mulassa-v1', 'mulassa-v2-short')
        then (array[150,181,318])[x.difficulty + 1] else v.judgments end / v.judgments as tie_units, x.achieved_at, p.is_seed
    from leaderboard_private.entries x join leaderboard_private.profiles p on p.user_id = x.user_id
    join leaderboard_private.versions v on v.version = x.version and v.difficulty = x.difficulty and v.active
    where leaderboard_private.score_family(x.version) = leaderboard_private.score_family(p_version)
  ), real_players as (
    select e.difficulty, count(distinct e.user_id) as k from e where not e.is_seed group by e.difficulty
  ), hidden as (
    select s.id from (
      select e.id, e.difficulty, row_number() over (partition by e.difficulty
        order by e.score, e.tie_units, e.achieved_at desc, e.id desc) as from_bottom
      from e where e.is_seed) s
    join real_players r on r.difficulty = s.difficulty where s.from_bottom <= r.k
  )
  select x.* from leaderboard_private.entries x join e on e.id = x.id
  where not exists (select 1 from hidden h where h.id = x.id)
$$;
revoke all on function leaderboard_private.visible_entries(text) from public, anon, authenticated;

create or replace function public.submit_result(p_version text, p_difficulty integer,
  p_perfect integer, p_good integer, p_miss integer, p_score integer, p_max_combo integer, p_alias text)
returns table(improved boolean, quality numeric, score integer)
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid; v_alias text; v_total integer; v_max integer; v_extras integer; v_written timestamptz; v_rows integer;
begin
  v_uid := leaderboard_private.require_player();
  v_alias := leaderboard_private.normalized_alias(p_alias);
  select judgments, max_score, extras_max into v_total, v_max, v_extras from leaderboard_private.versions
    where version = p_version and difficulty = p_difficulty and active;
  if v_total is null or p_perfect is null or p_good is null or p_miss is null
    or p_score is null or p_max_combo is null or p_perfect < 0 or p_good < 0 or p_miss < 0
    or p_perfect::bigint + p_good + p_miss <> v_total or p_score < 0
    or p_max_combo < 0 or p_max_combo > p_perfect::bigint + p_good then
    raise exception 'leaderboard_invalid_result' using errcode = '22023';
  end if;
  -- more than a perfect run can make, or more than these judgments can make (tools/score-ceiling.mjs)
  if p_score > v_max
    or p_score > (v_max - v_extras)::numeric * (p_perfect::bigint + p_good) / v_total + v_extras then
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
  return query select v_rows > 0, 20::numeric * e.quality_units / v_total, leaderboard_private.comparable_score(e.version, e.difficulty::integer, e.score)
    from leaderboard_private.entries e where e.user_id = v_uid and e.version = p_version and e.difficulty = p_difficulty;
end;
$$;

create or replace function public.get_leaderboard_all(p_version text, p_period text default 'all', p_offset integer default 0,
  p_limit integer default 50)
returns table("position" bigint, alias text, difficulty integer, quality numeric, score integer, max_combo integer, is_self boolean, total bigint)
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
      select distinct on (e.user_id) e.user_id, e.difficulty, 20::numeric * e.quality_units / v.judgments as quality,
        e.quality_units::numeric * case when e.version in ('mulassa-v1', 'mulassa-v2-short')
          then (array[150,181,318])[e.difficulty + 1] else v.judgments end / v.judgments as tie_units,
        leaderboard_private.comparable_score(e.version, e.difficulty::integer, e.score) as score, e.max_combo, e.achieved_at, e.id
      from leaderboard_private.visible_entries(p_version) e
      join leaderboard_private.versions v on v.version = e.version and v.difficulty = e.difficulty and v.active
      order by e.user_id, score desc, tie_units desc, e.achieved_at, e.id
    ), ranked as (
      select b.*, row_number() over (order by b.score desc, b.tie_units desc, b.achieved_at, b.id) as pos,
        count(*) over () as n
      from best b
    ), me as (select r.pos from ranked r where r.user_id = v_uid)
    select r.pos, p.alias, r.difficulty::integer, r.quality, r.score, r.max_combo,
      coalesce(r.user_id = v_uid, false), r.n
    from ranked r
    join leaderboard_private.profiles p on p.user_id = r.user_id
    where r.pos between v_from + 1 and v_from + v_count
      or (v_from = 0 and exists (select 1 from me where r.pos between me.pos - 5 and me.pos + 5))
    order by r.pos;
end;
$$;
revoke all on function public.submit_result(text, integer, integer, integer, integer, integer, integer, text) from public, anon;
grant execute on function public.submit_result(text, integer, integer, integer, integer, integer, integer, text) to authenticated;
revoke all on function public.get_leaderboard_all(text, text, integer, integer) from public;
grant execute on function public.get_leaderboard_all(text, text, integer, integer) to anon, authenticated;

commit;
