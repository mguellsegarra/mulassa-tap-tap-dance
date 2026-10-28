-- Calendar seasons and dance families. Legacy clients continue to publish to season zero.
begin;
create table if not exists leaderboard_private.seasons (
  id smallint primary key check (id >= 0), name text not null,
  starts_at timestamptz not null, ends_at timestamptz,
  check (ends_at is null or ends_at > starts_at), check (id = 0 or ends_at is not null),
  exclude using gist (tstzrange(starts_at, ends_at, '[)') with &&) where (id > 0)
);
alter table leaderboard_private.seasons enable row level security;
revoke all on leaderboard_private.seasons from public, anon, authenticated;
insert into leaderboard_private.seasons values
  (0, 'Estrena 2026', '2026-10-15 00:00 Europe/Madrid', null) on conflict (id) do nothing;
insert into leaderboard_private.seasons
  select 1, 'Tardor 2026', now(), '2027-01-01 00:00 Europe/Madrid'::timestamptz
  where not exists(select 1 from leaderboard_private.seasons where id = 1);

create or replace function leaderboard_private.ensure_season(p_at timestamptz) returns smallint
language plpgsql volatile set search_path = '' as $$
declare v_id smallint; v_start timestamp; v_end timestamp; v_quarter integer;
begin
  if p_at is null or not isfinite(p_at) then raise exception 'leaderboard_invalid_season' using errcode = '22023'; end if;
  -- Seasons are never updated: an existing one needs no lock. The lock lasts the caller's whole transaction,
  -- so taking it on every board read and submit serialized them all behind any open read.
  select id into v_id from leaderboard_private.seasons where id > 0 and p_at >= starts_at and p_at < ends_at;
  if found then return v_id; end if;
  -- One lock for this tiny global calendar, including gaps and first-reader creation.
  perform pg_catalog.pg_advisory_xact_lock(18101, 0);
  select id into v_id from leaderboard_private.seasons where id > 0 and p_at >= starts_at and p_at < ends_at;
  if found then return v_id; end if;
  if p_at < (select starts_at from leaderboard_private.seasons where id = 1) then
    raise exception 'leaderboard_season_closed' using errcode = 'P0001';
  end if;
  v_start := date_trunc('quarter', p_at at time zone 'Europe/Madrid');
  v_end := v_start + interval '3 months';
  v_quarter := extract(quarter from v_start)::integer;
  v_id := ((extract(year from v_start)::integer - 2026) * 4 + v_quarter - 3)::smallint;
  insert into leaderboard_private.seasons(id, name, starts_at, ends_at) values
    (v_id, (array['Hivern','Primavera','Estiu','Tardor'])[v_quarter] || ' ' || extract(year from v_start)::integer,
      v_start at time zone 'Europe/Madrid', v_end at time zone 'Europe/Madrid');
  return v_id;
end $$;

alter table leaderboard_private.versions add column if not exists figure_id text not null default 'mulassa-valls';
alter table leaderboard_private.versions add column if not exists introduced_at timestamptz not null default now();
alter table leaderboard_private.versions add column if not exists retired_at timestamptz;
alter table leaderboard_private.versions add column if not exists retired_season_id smallint references leaderboard_private.seasons(id);
update leaderboard_private.versions set retired_at = now(), retired_season_id = 0,
  introduced_at = '2026-09-27 00:00 Europe/Madrid'
  where version in ('mulassa-v1','mulassa-v2-short') and retired_at is null;
-- Calculated by tools/score-ceiling.mjs; new dances keep their raw score scale.
insert into leaderboard_private.versions(version,difficulty,judgments,max_score,extras_max,active,figure_id) values
  ('mulassa-v3',0,108,109000,50000,true,'mulassa-valls'),
  ('mulassa-v3',1,133,122000,48000,true,'mulassa-valls'),
  ('mulassa-v3',2,240,193000,51000,true,'mulassa-valls'),
  ('drac-v1',0,106,157000,104000,true,'drac-valls'),
  ('drac-v1',1,200,205000,103000,true,'drac-valls'),
  ('drac-v1',2,277,237000,92000,true,'drac-valls') on conflict (version,difficulty) do nothing;

alter table leaderboard_private.entries add column if not exists season_id smallint not null default 0
  references leaderboard_private.seasons(id);
alter table leaderboard_private.entries alter column season_id drop default;
alter table leaderboard_private.entries drop constraint if exists entries_user_id_version_difficulty_key;
do $$ begin
  if not exists(select 1 from pg_constraint where conrelid = 'leaderboard_private.entries'::regclass
    and conname = 'entries_user_season_version_difficulty_key') then
    alter table leaderboard_private.entries add constraint entries_user_season_version_difficulty_key
      unique(user_id,season_id,version,difficulty);
  end if;
end $$;
drop index if exists leaderboard_private.entries_ranking;
create index entries_ranking on leaderboard_private.entries(season_id,version,difficulty,score desc);

create or replace function leaderboard_private.season_for(p_version text) returns smallint
language plpgsql volatile set search_path = '' as $$
declare v_retired smallint; v_is_retired boolean;
begin
  select distinct v.retired_at is not null, v.retired_season_id into v_is_retired, v_retired
    from leaderboard_private.versions v where v.version = p_version and v.active;
  if not found then raise exception 'leaderboard_invalid_version' using errcode = '22023'; end if;
  if v_is_retired then return v_retired; end if;
  return leaderboard_private.ensure_season(now());
end $$;

create or replace function leaderboard_private.visible_entries(p_version text, p_season smallint)
returns setof leaderboard_private.entries
language sql stable set search_path = '' as $$
  with e as (
    select x.id, x.user_id, x.difficulty,
      leaderboard_private.comparable_score(x.version, x.difficulty::integer, x.score) as score,
      x.quality_units::numeric * case when x.version in ('mulassa-v1', 'mulassa-v2-short')
        then (array[150,181,318])[x.difficulty + 1] else v.judgments end / v.judgments as tie_units, x.achieved_at, p.is_seed
    from leaderboard_private.entries x join leaderboard_private.profiles p on p.user_id = x.user_id
    join leaderboard_private.versions v on v.version = x.version and v.difficulty = x.difficulty and v.active
    where x.season_id = p_season and (not p.is_seed or p_season = 0)
      and leaderboard_private.score_family(x.version) = leaderboard_private.score_family(p_version)
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
revoke all on function leaderboard_private.visible_entries(text, smallint) from public, anon, authenticated;

create or replace function public.submit_result(p_version text, p_difficulty integer,
  p_perfect integer, p_good integer, p_miss integer, p_score integer, p_max_combo integer, p_alias text)
returns table(improved boolean, quality numeric, score integer)
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid; v_alias text; v_season smallint; v_total integer; v_max integer; v_extras integer; v_rows integer;
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
  v_season := leaderboard_private.season_for(p_version);
  if v_season is null then raise exception 'leaderboard_season_closed' using errcode = 'P0001'; end if;
  v_alias := leaderboard_private.write_alias(v_uid, v_alias);
  insert into leaderboard_private.entries as existing(user_id, season_id, version, difficulty, perfect, good, miss, score, max_combo)
    values (v_uid, v_season, p_version, p_difficulty, p_perfect, p_good, p_miss, p_score, p_max_combo)
    on conflict (user_id, season_id, version, difficulty) do update set
      perfect = excluded.perfect, good = excluded.good, miss = excluded.miss,
      score = excluded.score, max_combo = excluded.max_combo, achieved_at = clock_timestamp()
    where (leaderboard_private.comparable_score(excluded.version, excluded.difficulty::integer, excluded.score),
        5 * excluded.perfect + 4 * excluded.good, excluded.score)
      > (leaderboard_private.comparable_score(existing.version, existing.difficulty::integer, existing.score),
        existing.quality_units, existing.score);
  get diagnostics v_rows = row_count;
  return query select v_rows > 0, 20::numeric * e.quality_units / v_total, leaderboard_private.comparable_score(e.version, e.difficulty::integer, e.score)
    from leaderboard_private.entries e where e.user_id = v_uid and e.season_id = v_season and e.version = p_version and e.difficulty = p_difficulty;
end;
$$;
revoke all on function public.submit_result(text, integer, integer, integer, integer, integer, integer, text) from public, anon;
grant execute on function public.submit_result(text, integer, integer, integer, integer, integer, integer, text) to authenticated;


-- One ranking implementation for board pages, history and podiums.
create or replace function leaderboard_private.ranked_entries(p_version text, p_season smallint)
returns table(user_id uuid, "position" bigint, difficulty integer, quality numeric, score integer, max_combo integer, total bigint)
language sql stable set search_path = '' as $$
  with best as (
    select distinct on (e.user_id) e.user_id, e.difficulty::integer,
      20::numeric * e.quality_units / v.judgments as quality,
      e.quality_units::numeric * case when e.version in ('mulassa-v1','mulassa-v2-short')
        then (array[150,181,318])[e.difficulty + 1] else v.judgments end / v.judgments as tie_units,
      leaderboard_private.comparable_score(e.version,e.difficulty::integer,e.score) as score,
      e.max_combo, e.achieved_at, e.id
    from leaderboard_private.visible_entries(p_version,p_season) e
    join leaderboard_private.versions v on v.version = e.version and v.difficulty = e.difficulty
    order by e.user_id, score desc, tie_units desc, e.achieved_at, e.id
  )
  select b.user_id, row_number() over (order by b.score desc,b.tie_units desc,b.achieved_at,b.id),
    b.difficulty,b.quality,b.score,b.max_combo,count(*) over () from best b
$$;

drop function if exists public.get_leaderboard_all(text,text,integer,integer);
drop function if exists leaderboard_private.visible_entries(text);
create or replace function public.get_leaderboard_all(p_version text, p_period text default 'all',
  p_offset integer default 0, p_limit integer default 50, p_season smallint default null)
returns table("position" bigint, alias text, difficulty integer, quality numeric, score integer, max_combo integer,
  is_self boolean, total bigint, verified boolean, tag smallint, season_id smallint)
language plpgsql volatile security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_season smallint;
  v_from bigint := greatest(coalesce(p_offset,0),0); v_count integer := least(greatest(coalesce(p_limit,50),1),50);
begin
  if p_period is distinct from 'all' then raise exception 'leaderboard_invalid_period' using errcode = '22023'; end if;
  if not exists(select 1 from leaderboard_private.versions where version = p_version and active) then
    raise exception 'leaderboard_invalid_version' using errcode = '22023';
  end if;
  v_season := coalesce(p_season, leaderboard_private.season_for(p_version));
  if not exists(select 1 from leaderboard_private.seasons s where s.id = v_season and s.starts_at <= now()) then
    raise exception 'leaderboard_invalid_season' using errcode = '22023';
  end if;
  if v_from = 0 then perform leaderboard_private.touch_profile(v_uid); end if;
  return query with ranked as (select * from leaderboard_private.ranked_entries(p_version,v_season)),
    me as (select r.position from ranked r where r.user_id = v_uid)
  select r.position, p.alias || case when p.tag is null then '' else '#' || lpad(p.tag::text,4,'0') end,
    r.difficulty,r.quality,r.score,r.max_combo,coalesce(r.user_id = v_uid,false),r.total,
    leaderboard_private.verified(r.user_id),p.tag,v_season
  from ranked r join leaderboard_private.profiles p on p.user_id = r.user_id
  where r.position between v_from + 1 and v_from + v_count
    or (v_from = 0 and exists(select 1 from me where r.position between me.position - 5 and me.position + 5))
  order by r.position;
end $$;
revoke all on function leaderboard_private.ensure_season(timestamptz), leaderboard_private.season_for(text),
  leaderboard_private.ranked_entries(text,smallint) from public,anon,authenticated;
revoke all on function public.get_leaderboard_all(text,text,integer,integer,smallint) from public;
grant execute on function public.get_leaderboard_all(text,text,integer,integer,smallint) to anon,authenticated;
commit;
