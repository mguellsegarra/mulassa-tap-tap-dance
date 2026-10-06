-- The one board, v2: the top 10 plus the caller's own row with 5 neighbours each side ("On soc"), the number of
-- ranked players (for "#347 de 2.140 / top 17%"), and a weekly board that restarts every Monday 00:00 Europe/Madrid.
-- entries keeps each player's all-time best per level, so a week can't be read from it: weekly_entries keeps the
-- week's best per level too (submit_result writes both). ASCII only on purpose (pasted into the SQL Editor).
begin;

create table leaderboard_private.weekly_entries (
  id bigint generated always as identity primary key,
  user_id uuid not null references leaderboard_private.profiles(user_id) on delete cascade,
  version text not null,
  difficulty smallint not null,
  week_start date not null,
  perfect integer not null check (perfect >= 0),
  good integer not null check (good >= 0),
  miss integer not null check (miss >= 0),
  score integer not null check (score >= 0),
  max_combo integer not null check (max_combo >= 0),
  quality_units integer generated always as (5 * perfect + 4 * good) stored,
  achieved_at timestamptz not null default now(),
  unique (user_id, version, difficulty, week_start),
  foreign key (version, difficulty) references leaderboard_private.versions(version, difficulty)
);
create index weekly_entries_week on leaderboard_private.weekly_entries(version, week_start, score desc);
alter table leaderboard_private.weekly_entries enable row level security;
revoke all on leaderboard_private.weekly_entries from public, anon, authenticated;
revoke all on all sequences in schema leaderboard_private from public, anon, authenticated;

-- Monday 00:00 in Valls, as a date.
create function leaderboard_private.current_week() returns date
language sql stable set search_path = '' as $$
  select (pg_catalog.date_trunc('week', pg_catalog.now() at time zone 'Europe/Madrid'))::date
$$;
revoke all on function leaderboard_private.current_week() from public, anon, authenticated;

-- Same signature, checks, throttle and answer as before; it also keeps the week's best.
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
  -- The profile lock covers all difficulties and concurrent requests for this account.
  insert into leaderboard_private.profiles(user_id, alias) values (v_uid, v_alias) on conflict do nothing;
  select last_write_at into v_written from leaderboard_private.profiles where user_id = v_uid for update;
  if v_written > clock_timestamp() - interval '10 seconds' then
    raise exception 'leaderboard_rate_limit' using errcode = 'P0001';
  end if;
  update leaderboard_private.profiles set alias = v_alias, last_write_at = clock_timestamp(), last_active_at = now() where user_id = v_uid;
  insert into leaderboard_private.weekly_entries as existing(user_id, version, difficulty, week_start, perfect, good, miss, score, max_combo)
    values (v_uid, p_version, p_difficulty, leaderboard_private.current_week(), p_perfect, p_good, p_miss, p_score, p_max_combo)
    on conflict (user_id, version, difficulty, week_start) do update set
      perfect = excluded.perfect, good = excluded.good, miss = excluded.miss,
      score = excluded.score, max_combo = excluded.max_combo, achieved_at = clock_timestamp()
    where (5 * excluded.perfect + 4 * excluded.good, excluded.score) > (existing.quality_units, existing.score);
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

drop function if exists public.get_leaderboard_all(text);
create function public.get_leaderboard_all(p_version text, p_period text default 'all')
returns table("position" bigint, alias text, difficulty integer, quality numeric, score integer, is_self boolean, total bigint)
language plpgsql security definer set search_path = '' as $$
#variable_conflict use_column
declare v_uid uuid := auth.uid(); v_week date := leaderboard_private.current_week();
begin
  if p_period is null or p_period not in ('all', 'week') then
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
    with pool as (
      select e.user_id, e.difficulty, e.quality_units, e.score, e.achieved_at, e.id
        from leaderboard_private.entries e where p_period = 'all' and e.version = p_version
      union all
      select w.user_id, w.difficulty, w.quality_units, w.score, w.achieved_at, w.id
        from leaderboard_private.weekly_entries w where p_period = 'week' and w.version = p_version and w.week_start = v_week
    ), best as ( -- each player's best result by points, over every active level
      select distinct on (q.user_id) q.user_id, q.difficulty, q.quality_units, q.score, q.achieved_at, q.id
      from pool q join leaderboard_private.versions v on v.version = p_version and v.difficulty = q.difficulty and v.active
      order by q.user_id, q.score desc, q.quality_units desc, q.achieved_at, q.id
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
revoke all on function public.get_leaderboard_all(text, text) from public;
grant execute on function public.get_leaderboard_all(text, text) to anon, authenticated;

-- This week's board starts with some of the 2026 seed players (only those that exist; safe to run twice).
insert into leaderboard_private.weekly_entries (user_id, version, difficulty, week_start, perfect, good, miss, score, max_combo, achieved_at)
select e.user_id, e.version, e.difficulty, leaderboard_private.current_week(), e.perfect, e.good, e.miss, e.score, e.max_combo,
  greatest(leaderboard_private.current_week()::timestamp at time zone 'Europe/Madrid', now() - interval '37 minutes' * row_number() over (order by e.id))
from leaderboard_private.entries e
where e.user_id::text in ('5eed2026-0000-4000-8000-000000000002', '5eed2026-0000-4000-8000-000000000003',
  '5eed2026-0000-4000-8000-000000000004', '5eed2026-0000-4000-8000-000000000005', '5eed2026-0000-4000-8000-000000000007',
  '5eed2026-0000-4000-8000-000000000008', '5eed2026-0000-4000-8000-000000000010', '5eed2026-0000-4000-8000-000000000011',
  '5eed2026-0000-4000-8000-000000000013', '5eed2026-0000-4000-8000-000000000016', '5eed2026-0000-4000-8000-000000000018',
  '5eed2026-0000-4000-8000-000000000019')
on conflict do nothing;

commit;
