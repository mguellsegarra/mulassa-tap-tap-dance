-- Guest identity starts from the production schema. No fixed expiry is installed.
begin;
alter table leaderboard_private.profiles add column if not exists tag smallint check (tag between 0 and 9999);

create or replace function leaderboard_private.verified(p_uid uuid) returns boolean
language sql stable set search_path = '' as $$
  select exists(select 1 from auth.users where id = p_uid and email_confirmed_at is not null)
$$;
create or replace function leaderboard_private.lock_profile(p_uid uuid, p_wait boolean) returns boolean
language plpgsql volatile set search_path = '' as $$
begin
  if p_wait then perform pg_catalog.pg_advisory_xact_lock(18100, pg_catalog.hashtext(p_uid::text)); return true; end if;
  return pg_catalog.pg_try_advisory_xact_lock(18100, pg_catalog.hashtext(p_uid::text));
end $$;

-- A rerun must not turn a confirmed player who postponed choosing a name into a clean-name owner.
-- Only this first column/index installation assigns tags to historical guests.
do $$ begin
  if not exists (select 1 from pg_class where oid = to_regclass('leaderboard_private.profiles_guest_alias_key')) then
    update leaderboard_private.profiles set tag = floor(random() * 10000)::smallint
      where tag is null and not leaderboard_private.verified(user_id);
  end if;
end $$;
drop index if exists leaderboard_private.profiles_alias_key;
create unique index if not exists profiles_clean_alias_key on leaderboard_private.profiles
  (leaderboard_private.alias_key(alias)) where tag is null;
create unique index if not exists profiles_guest_alias_key on leaderboard_private.profiles
  (leaderboard_private.alias_key(alias), tag) where tag is not null;

drop function if exists leaderboard_private.check_alias_free(text, uuid);
create or replace function leaderboard_private.check_alias_free(p_alias text, p_uid uuid, p_tag smallint) returns void
language plpgsql set search_path = '' as $$
begin
  if exists(select 1 from leaderboard_private.profiles p where p.user_id <> p_uid
    and leaderboard_private.alias_key(p.alias) = leaderboard_private.alias_key(p_alias)
    and p.tag is not distinct from p_tag) then
    raise exception 'leaderboard_alias_taken' using errcode = '23505';
  end if;
end $$;

-- Serialize creation as well as updates. Lock order: advisory, Auth, profile.
-- Auth's row lock also orders this operation against confirmation and account deletion.
create or replace function leaderboard_private.write_alias(p_uid uuid, p_alias text, p_clean boolean default false)
returns text language plpgsql volatile set search_path = '' as $$
declare v_alias text := leaderboard_private.normalized_alias(p_alias); v_tag smallint;
  v_existing boolean; v_written timestamptz; v_start integer;
begin
  perform leaderboard_private.lock_profile(p_uid, true);
  perform 1 from auth.users where id = p_uid for share;
  if not found then raise exception 'leaderboard_auth_required' using errcode = '28000'; end if;
  if p_clean and not leaderboard_private.verified(p_uid) then
    raise exception 'leaderboard_verification_required' using errcode = '28000';
  end if;
  select tag, last_write_at into v_tag, v_written from leaderboard_private.profiles where user_id = p_uid for update;
  v_existing := found;
  if v_written > clock_timestamp() - interval '10 seconds' then
    raise exception 'leaderboard_rate_limit' using errcode = 'P0001';
  end if;
  if p_clean then v_tag := null;
  elsif not v_existing and not leaderboard_private.verified(p_uid) then v_tag := floor(random()*10000)::smallint;
  end if;
  for attempt in 1..5 loop
    begin
      perform leaderboard_private.check_alias_free(v_alias, p_uid, v_tag);
      insert into leaderboard_private.profiles(user_id, alias, tag, last_write_at, last_active_at)
        values (p_uid, v_alias, v_tag, clock_timestamp(), now())
      on conflict (user_id) do update set alias = excluded.alias, tag = excluded.tag,
        last_write_at = excluded.last_write_at, last_active_at = excluded.last_active_at;
      return v_alias;
    exception when unique_violation then
      if v_tag is null or attempt = 5 then raise exception 'leaderboard_alias_taken' using errcode = '23505'; end if;
      -- Pick among free tags; the unique index handles races with a different account.
      v_start := floor(random()*10000)::integer;
      select ((g + v_start) % 10000)::smallint into v_tag from generate_series(0,9999) g
      where not exists(select 1 from leaderboard_private.profiles p
        where leaderboard_private.alias_key(p.alias) = leaderboard_private.alias_key(v_alias)
          and p.tag = (g + v_start) % 10000 and p.user_id <> p_uid)
      order by g limit 1;
      if v_tag is null then raise exception 'leaderboard_alias_taken' using errcode = '23505'; end if;
    end;
  end loop;
end $$;

create or replace function public.update_alias(p_alias text) returns text
language plpgsql security definer set search_path = '' as $$
begin
  return leaderboard_private.write_alias(leaderboard_private.require_player(), p_alias);
end $$;
create or replace function public.choose_verified_alias(p_alias text) returns text
language plpgsql security definer set search_path = '' as $$
begin
  return leaderboard_private.write_alias(leaderboard_private.require_player(), p_alias, true);
end $$;

create or replace function leaderboard_private.touch_profile(p_uid uuid) returns void
language plpgsql volatile set search_path = '' as $$
begin
  if p_uid is null then return; end if;
  perform leaderboard_private.lock_profile(p_uid, true);
  perform 1 from auth.users where id = p_uid for share;
  if found then update leaderboard_private.profiles set last_active_at = now() where user_id = p_uid; end if;
end $$;
create or replace function public.my_profile()
returns table(alias text, tag smallint, verified boolean, published boolean)
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := leaderboard_private.require_player();
begin
  perform leaderboard_private.touch_profile(v_uid);
  return query select p.alias, p.tag, leaderboard_private.verified(v_uid),
    exists(select 1 from leaderboard_private.entries e where e.user_id = v_uid)
  from leaderboard_private.profiles p where p.user_id = v_uid;
end $$;

create or replace function public.submit_result(p_version text, p_difficulty integer,
  p_perfect integer, p_good integer, p_miss integer, p_score integer, p_max_combo integer, p_alias text)
returns table(improved boolean, quality numeric, score integer)
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid; v_alias text; v_total integer; v_max integer; v_extras integer; v_rows integer;
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
  v_alias := leaderboard_private.write_alias(v_uid, v_alias);
  insert into leaderboard_private.entries as existing(user_id, version, difficulty, perfect, good, miss, score, max_combo)
    values (v_uid, p_version, p_difficulty, p_perfect, p_good, p_miss, p_score, p_max_combo)
    on conflict (user_id, version, difficulty) do update set
      perfect = excluded.perfect, good = excluded.good, miss = excluded.miss,
      score = excluded.score, max_combo = excluded.max_combo, achieved_at = clock_timestamp()
    where (leaderboard_private.comparable_score(excluded.version, excluded.difficulty::integer, excluded.score),
        5 * excluded.perfect + 4 * excluded.good, excluded.score)
      > (leaderboard_private.comparable_score(existing.version, existing.difficulty::integer, existing.score),
        existing.quality_units, existing.score);
  get diagnostics v_rows = row_count;
  return query select v_rows > 0, 20::numeric * e.quality_units / v_total, leaderboard_private.comparable_score(e.version, e.difficulty::integer, e.score)
    from leaderboard_private.entries e where e.user_id = v_uid and e.version = p_version and e.difficulty = p_difficulty;
end;
$$;
revoke all on function public.submit_result(text, integer, integer, integer, integer, integer, integer, text) from public, anon;
grant execute on function public.submit_result(text, integer, integer, integer, integer, integer, integer, text) to authenticated;


revoke all on function leaderboard_private.verified(uuid), leaderboard_private.lock_profile(uuid, boolean),
  leaderboard_private.check_alias_free(text, uuid, smallint), leaderboard_private.write_alias(uuid, text, boolean),
  leaderboard_private.touch_profile(uuid) from public, anon, authenticated;
revoke all on function public.update_alias(text), public.choose_verified_alias(text), public.my_profile() from public, anon;
grant execute on function public.update_alias(text), public.choose_verified_alias(text), public.my_profile() to authenticated;
-- Preserve formatted identity even between the guest and season migrations.
drop function if exists public.get_leaderboard_all(text,text,integer,integer);
create function public.get_leaderboard_all(p_version text, p_period text default 'all', p_offset integer default 0,
  p_limit integer default 50)
returns table("position" bigint, alias text, difficulty integer, quality numeric, score integer, max_combo integer, is_self boolean, total bigint, verified boolean, tag smallint)
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
    perform leaderboard_private.touch_profile(v_uid);
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
    select r.pos, p.alias || case when p.tag is null then '' else '#' || lpad(p.tag::text,4,'0') end, r.difficulty::integer, r.quality, r.score, r.max_combo,
      coalesce(r.user_id = v_uid, false), r.n, leaderboard_private.verified(r.user_id), p.tag
    from ranked r
    join leaderboard_private.profiles p on p.user_id = r.user_id
    where r.pos between v_from + 1 and v_from + v_count
      or (v_from = 0 and exists (select 1 from me where r.pos between me.pos - 5 and me.pos + 5))
    order by r.pos;
end;
$$;
revoke all on function public.get_leaderboard_all(text,text,integer,integer) from public;
grant execute on function public.get_leaderboard_all(text,text,integer,integer) to anon,authenticated;

commit;
