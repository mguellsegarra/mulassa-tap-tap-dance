-- Names without tags: one name per ACTIVE profile. A guest (no confirmed address) inactive for 30 days can lose its
-- name to whoever asks for it; it is then "released": it keeps its account, results and alias text, and boards show it
-- faded. Nothing is deleted for inactivity any more. Beta already has the tags (202610200001); production applies that
-- file and this one in the same deploy. Runs twice in tests, so every step is idempotent. ASCII only (SQL Editor).
begin;
alter table leaderboard_private.profiles add column if not exists released_at timestamptz;
alter table leaderboard_private.profiles add column if not exists public_id uuid not null default gen_random_uuid();
create unique index if not exists profiles_public_id_key on leaderboard_private.profiles (public_id);

-- Beta's guests may share a name (different tags): keep one holder per name (confirmed first, then the most recently
-- active, then a fixed tie-break) and release the others. Their results stay.
update leaderboard_private.profiles p set released_at = now()
from (
  select x.user_id, row_number() over (partition by leaderboard_private.alias_key(x.alias)
    order by leaderboard_private.verified(x.user_id) desc,
      greatest(u.created_at, u.last_sign_in_at, x.last_active_at) desc nulls last, x.user_id) as rn
  from leaderboard_private.profiles x left join auth.users u on u.id = x.user_id
  where x.released_at is null
) d
where d.user_id = p.user_id and d.rn > 1;

drop index if exists leaderboard_private.profiles_alias_key;
drop index if exists leaderboard_private.profiles_clean_alias_key;
drop index if exists leaderboard_private.profiles_guest_alias_key;
create unique index if not exists profiles_active_alias_key on leaderboard_private.profiles
  (leaderboard_private.alias_key(alias)) where released_at is null;

drop function if exists leaderboard_private.check_alias_free(text, uuid, smallint);
drop function if exists leaderboard_private.purge_inactive_guests(integer);
drop function if exists public.leaderboard_expired_players(integer);
drop function if exists public.get_leaderboard_all(text, text, integer, integer, smallint);
drop function if exists public.get_level_podium(text, integer, smallint);
drop function if exists public.get_player_card(text, smallint);
drop function if exists public.get_player_card(uuid);
drop function if exists public.my_profile();

-- p_clean is kept for the signature only: a confirmed address no longer changes how a name is written.
create or replace function leaderboard_private.write_alias(p_uid uuid, p_alias text, p_clean boolean default false)
returns text language plpgsql volatile set search_path = '' as $$
declare v_alias text := leaderboard_private.normalized_alias(p_alias); v_written timestamptz; v_released timestamptz;
  v_holder uuid;
begin
  -- Same name, still held: only this profile's locks (every publication passes here; the name lock would serialize them).
  if exists(select 1 from leaderboard_private.profiles where user_id = p_uid and alias = v_alias and released_at is null) then
    perform leaderboard_private.lock_profile(p_uid, true);
    perform 1 from auth.users where id = p_uid for share;
    if not found then raise exception 'leaderboard_auth_required' using errcode = '28000'; end if;
    select last_write_at, released_at into v_written, v_released from leaderboard_private.profiles where user_id = p_uid for update;
    -- released between the check and the lock: somebody took the name in that instant
    if v_released is not null then raise exception 'leaderboard_alias_taken' using errcode = '23505'; end if;
    if v_written > clock_timestamp() - interval '10 seconds' then
      raise exception 'leaderboard_rate_limit' using errcode = 'P0001';
    end if;
    update leaderboard_private.profiles set last_write_at = clock_timestamp(), last_active_at = now() where user_id = p_uid;
    return v_alias;
  end if;
  -- Any other name write takes this one lock first, so two writers never wait on each other's profile
  -- (A taking B's name while B takes A's). Then the writer's locks (advisory, Auth, profile), then the holder's.
  perform pg_catalog.pg_advisory_xact_lock(18102, 0);
  perform leaderboard_private.lock_profile(p_uid, true);
  perform 1 from auth.users where id = p_uid for share;
  if not found then raise exception 'leaderboard_auth_required' using errcode = '28000'; end if;
  select last_write_at into v_written from leaderboard_private.profiles where user_id = p_uid for update;
  if v_written > clock_timestamp() - interval '10 seconds' then
    raise exception 'leaderboard_rate_limit' using errcode = 'P0001';
  end if;
  select p.user_id into v_holder from leaderboard_private.profiles p
    where p.user_id <> p_uid and p.released_at is null
      and leaderboard_private.alias_key(p.alias) = leaderboard_private.alias_key(v_alias);
  if v_holder is not null then
    perform leaderboard_private.lock_profile(v_holder, true);
    -- Rechecked on the locked rows: a confirmed address or any activity in 30 days keeps the name.
    perform 1 from auth.users u join leaderboard_private.profiles p on p.user_id = u.id
      where u.id = v_holder and u.email_confirmed_at is null and p.released_at is null
        and leaderboard_private.alias_key(p.alias) = leaderboard_private.alias_key(v_alias)
        and greatest(u.created_at, u.last_sign_in_at, p.last_active_at) < now() - interval '30 days'
      for share of u for update of p;
    if not found then raise exception 'leaderboard_alias_taken' using errcode = '23505'; end if;
    update leaderboard_private.profiles set released_at = now() where user_id = v_holder;
  end if;
  insert into leaderboard_private.profiles(user_id, alias, last_write_at, last_active_at)
    values (p_uid, v_alias, clock_timestamp(), now())
  on conflict (user_id) do update set alias = excluded.alias, released_at = null,
    last_write_at = excluded.last_write_at, last_active_at = excluded.last_active_at;
  return v_alias;
end $$;

create or replace function public.choose_verified_alias(p_alias text) returns text
language plpgsql security definer set search_path = '' as $$
begin
  return leaderboard_private.write_alias(leaderboard_private.require_player(), p_alias);
end $$;

create function public.my_profile()
returns table(alias text, verified boolean, published boolean, released boolean, public_id uuid)
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := leaderboard_private.require_player();
begin
  perform leaderboard_private.touch_profile(v_uid);
  return query select p.alias, leaderboard_private.verified(v_uid),
    exists(select 1 from leaderboard_private.entries e where e.user_id = v_uid), p.released_at is not null, p.public_id
  from leaderboard_private.profiles p where p.user_id = v_uid;
end $$;

-- p_alias names an existing profile only when it has none or lost it: an old tab sends the name it stored, which must
-- never rename (or take back) anything. Renaming is update_alias.
create or replace function public.submit_result(p_version text, p_difficulty integer,
  p_perfect integer, p_good integer, p_miss integer, p_score integer, p_max_combo integer, p_alias text)
returns table(improved boolean, quality numeric, score integer)
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid; v_alias text; v_season smallint; v_total integer; v_max integer; v_extras integer; v_rows integer;
begin
  v_uid := leaderboard_private.require_player();
  select p.alias into v_alias from leaderboard_private.profiles p where p.user_id = v_uid and p.released_at is null;
  if v_alias is null then v_alias := leaderboard_private.normalized_alias(p_alias); end if;
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

create function public.get_leaderboard_all(p_version text, p_period text default 'all',
  p_offset integer default 0, p_limit integer default 50, p_season smallint default null)
returns table("position" bigint, alias text, difficulty integer, quality numeric, score integer, max_combo integer,
  is_self boolean, total bigint, verified boolean, season_id smallint, public_id uuid, released boolean)
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
  select r.position, p.alias, r.difficulty, r.quality, r.score, r.max_combo, coalesce(r.user_id = v_uid,false), r.total,
    leaderboard_private.verified(r.user_id), v_season, p.public_id, p.released_at is not null
  from ranked r join leaderboard_private.profiles p on p.user_id = r.user_id
  where r.position between v_from + 1 and v_from + v_count
    or (v_from = 0 and exists(select 1 from me where r.position between me.position - 5 and me.position + 5))
  order by r.position;
end $$;

create function public.get_level_podium(p_version text, p_difficulty integer, p_season smallint default null)
returns table("position" bigint, alias text, score integer, quality numeric, is_self boolean, total bigint,
  verified boolean, public_id uuid, released boolean)
language plpgsql stable security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_season smallint;
begin
  if not exists(select 1 from leaderboard_private.versions
      where version = p_version and difficulty = p_difficulty and active) then
    raise exception 'leaderboard_invalid_version' using errcode = '22023';
  end if;
  v_season := coalesce(p_season, leaderboard_private.season_for(p_version));
  if not exists(select 1 from leaderboard_private.seasons s where s.id = v_season and s.starts_at <= now()) then
    raise exception 'leaderboard_invalid_season' using errcode = '22023';
  end if;
  return query with best as ( -- as ranked_entries (202610200002), on this level only
    select distinct on (e.user_id) e.user_id, 20::numeric * e.quality_units / v.judgments as quality,
      e.quality_units::numeric * case when e.version in ('mulassa-v1','mulassa-v2-short')
        then (array[150,181,318])[e.difficulty + 1] else v.judgments end / v.judgments as tie_units,
      leaderboard_private.comparable_score(e.version,e.difficulty::integer,e.score) as score, e.achieved_at, e.id
    from leaderboard_private.visible_entries(p_version,v_season) e
    join leaderboard_private.versions v on v.version = e.version and v.difficulty = e.difficulty
    where e.difficulty = p_difficulty
    order by e.user_id, score desc, tie_units desc, e.achieved_at, e.id
  ), ranked as (
    select b.*, row_number() over (order by b.score desc,b.tie_units desc,b.achieved_at,b.id) as pos,
      count(*) over () as n from best b
  )
  select r.pos, p.alias, r.score, r.quality, coalesce(r.user_id = v_uid,false), r.n, leaderboard_private.verified(r.user_id),
    p.public_id, p.released_at is not null
  from ranked r join leaderboard_private.profiles p on p.user_id = r.user_id
  where r.pos <= 3
  order by r.pos;
end $$;

create or replace function public.get_seasons(p_figure text)
returns table(season_id smallint, name text, starts_at timestamptz, ends_at timestamptz, version text,
  previous_dance boolean, players bigint, podium jsonb, my_position bigint, my_score integer, my_difficulty integer)
language sql stable security definer set search_path = '' as $$
  with families as (
    select e.season_id,leaderboard_private.score_family(v.version) as family,min(v.version) as version,
      min(v.introduced_at) as introduced
    from leaderboard_private.entries e join leaderboard_private.versions v using(version,difficulty)
    where v.figure_id = p_figure and v.active group by e.season_id,leaderboard_private.score_family(v.version)
  )
  select s.id,s.name,s.starts_at,s.ends_at,f.version,
    exists(select 1 from families newer where newer.season_id=f.season_id and newer.introduced>f.introduced),
    summary.players,summary.podium,summary.my_position,summary.my_score,summary.my_difficulty
  from families f join leaderboard_private.seasons s on s.id=f.season_id
  cross join lateral (
    select count(*) as players,
      coalesce(jsonb_agg(jsonb_build_object('position',r.position,'alias',p.alias,'public_id',p.public_id,
        'released',p.released_at is not null,'score',r.score,'difficulty',r.difficulty,
        'verified',leaderboard_private.verified(p.user_id))
        order by r.position) filter(where r.position<=3),'[]') as podium,
      max(r.position) filter(where r.user_id=auth.uid()) as my_position,
      max(r.score) filter(where r.user_id=auth.uid()) as my_score, -- the hall's own-place band
      max(r.difficulty) filter(where r.user_id=auth.uid()) as my_difficulty
    from leaderboard_private.ranked_entries(f.version,f.season_id) r join leaderboard_private.profiles p on p.user_id=r.user_id
  ) summary
  where s.starts_at<=now() and summary.players>0 order by s.id desc,f.introduced desc,f.version
$$;

-- By the stable public id, never by name: an old row must not open whoever holds that name now.
create function public.get_player_card(p_public_id uuid)
returns table(alias text, verified boolean, released boolean, totals jsonb, podiums jsonb)
language sql stable security definer set search_path = '' as $$
  select p.alias,leaderboard_private.verified(p.user_id),p.released_at is not null,
    coalesce((select jsonb_object_agg(b.key,b.value-'errors')
      from jsonb_each(leaderboard_private.stats_totals(p.user_id)) b where b.key<>'practice'),'{}'),
    coalesce((select jsonb_agg(jsonb_build_object('season_id',x.season_id,'version',x.version,'position',r.position)
      order by x.season_id desc,x.version)
      from (select distinct e.season_id,leaderboard_private.score_family(e.version) as version
        from leaderboard_private.entries e where e.user_id=p.user_id) x
      cross join lateral leaderboard_private.ranked_entries(x.version,x.season_id) r
      where r.user_id=p.user_id and r.position<=3),'[]')
  from leaderboard_private.profiles p
  where p.public_id=p_public_id
    and exists(select 1 from leaderboard_private.entries e where e.user_id=p.user_id)
$$;

alter table leaderboard_private.profiles drop column if exists tag;

revoke all on function leaderboard_private.write_alias(uuid, text, boolean) from public, anon, authenticated;
revoke all on function public.submit_result(text, integer, integer, integer, integer, integer, integer, text) from public, anon;
grant execute on function public.submit_result(text, integer, integer, integer, integer, integer, integer, text) to authenticated;
revoke all on function public.choose_verified_alias(text), public.my_profile() from public, anon;
grant execute on function public.choose_verified_alias(text), public.my_profile() to authenticated;
revoke all on function public.get_leaderboard_all(text,text,integer,integer,smallint), public.get_level_podium(text,integer,smallint),
  public.get_seasons(text), public.get_player_card(uuid) from public;
grant execute on function public.get_leaderboard_all(text,text,integer,integer,smallint), public.get_level_podium(text,integer,smallint),
  public.get_seasons(text), public.get_player_card(uuid) to anon, authenticated;
commit;
