-- No weekly board after all (Marc, 2026-09-28): one all-time board. Drops weekly_entries and current_week();
-- submit_result goes back to writing entries only (with 202609280003's unique-nickname check); get_leaderboard_all keeps
-- its (p_version, p_period default 'all') signature so no client breaks, and 'week' is now an invalid period.
-- ASCII only on purpose (pasted into the SQL Editor).
begin;

create or replace function public.submit_result(p_version text, p_difficulty integer,
  p_perfect integer, p_good integer, p_miss integer, p_score integer, p_max_combo integer, p_alias text)
returns table(improved boolean, quality numeric, score integer)
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid(); v_alias text; v_total integer; v_max integer; v_written timestamptz; v_rows integer;
begin
  if v_uid is null or not exists(select 1 from auth.users where id = v_uid and is_anonymous) then
    raise exception 'leaderboard_auth_required' using errcode = '28000';
  end if;
  v_alias := leaderboard_private.normalized_alias(p_alias);
  select judgments, max_score into v_total, v_max from leaderboard_private.versions
    where version = p_version and difficulty = p_difficulty and active;
  if v_total is null or p_perfect is null or p_good is null or p_miss is null
    or p_score is null or p_max_combo is null or p_perfect < 0 or p_good < 0 or p_miss < 0
    or p_perfect::bigint + p_good + p_miss <> v_total or p_score < 0 or p_score > v_max
    or p_max_combo < 0 or p_max_combo > p_perfect::bigint + p_good then
    raise exception 'leaderboard_invalid_result' using errcode = '22023';
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

create or replace function public.get_leaderboard_all(p_version text, p_period text default 'all')
returns table("position" bigint, alias text, difficulty integer, quality numeric, score integer, is_self boolean, total bigint)
language plpgsql security definer set search_path = '' as $$
#variable_conflict use_column
declare v_uid uuid := auth.uid();
begin
  if p_period is distinct from 'all' then
    raise exception 'leaderboard_invalid_period' using errcode = '22023';
  end if;
  if not exists (select 1 from leaderboard_private.versions v where v.version = p_version and v.active) then
    raise exception 'leaderboard_invalid_version' using errcode = '22023';
  end if;
  if v_uid is not null then
    update leaderboard_private.profiles set last_active_at = now()
      where user_id = v_uid and last_active_at < now() - interval '10 minutes';
  end if;
  return query
    with best as ( -- each player's best result by points, over every active level
      select distinct on (e.user_id) e.user_id, e.difficulty, e.quality_units, e.score, e.achieved_at, e.id
      from leaderboard_private.entries e
      join leaderboard_private.versions v on v.version = e.version and v.difficulty = e.difficulty and v.active
      where e.version = p_version
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
    where r.pos <= 10 or exists (select 1 from me where r.pos between me.pos - 5 and me.pos + 5)
    order by r.pos;
end;
$$;

drop table leaderboard_private.weekly_entries;
drop function leaderboard_private.current_week();

commit;
