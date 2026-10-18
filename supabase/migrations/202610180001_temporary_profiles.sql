-- Temporary profiles (Marc, 2026-10-18). A profile without a confirmed e-mail keeps its nickname and published results
-- for 7 days from its first publication; then the profile, its results and its Auth account are removed and the nickname
-- is free again. A confirmed e-mail (auth.users.email_confirmed_at, set by Supabase Auth when the 6-digit code is
-- verified; a pending change never counts) removes the deadline and shows a check on the board meaning only "Correu
-- confirmat". Nicknames stay unique. Records on the device are not touched (they never reach the server).
--   * profiles.expires_at: the deadline; null = none (confirmed, never published, or an old profile not told yet).
--     Set once, never moved: later publications and repeated notices leave it alone.
--   * profiles.notice_at: when the server learnt that the player was shown the 7-day notice.
--   * submit_result(..., p_notice): the first publication of an unconfirmed profile starts the clock, and needs
--     p_notice = true (the client showed the notice on the publish sheet). Without it: leaderboard_notice_required, so a
--     stale client that never shows the notice cannot start a clock nor publish around it (a reload fixes it).
--   * ack_expiry_notice(): a profile that already had results before this migration gets its 7 days from the first time
--     a client shows it the notice (profile block or publish sheet). Idempotent: a retry never moves the deadline.
--   * my_profile(): the caller's nickname, confirmed or not (server-side), deadline, whether it needs the notice.
--   * get_leaderboard_all: + verified (a boolean, never the address); expired rows are hidden from the deadline on.
--   * check_alias_free: an expired holder of the nickname is removed on the spot, so the name is free at the deadline.
--   * purge_expired_profiles(): the scheduled cleanup (supabase/ops/temporary-profiles-cron.sql activates it).
--   * Concurrency: everything that deletes or recreates a profile (the purge, a nickname freed, the player's own
--     publication or "Crea") holds that account's lock (lock_profile) and its auth.users row (delete / for share), and
--     decides on the profile as read after taking them, never on an earlier list; the player's own lock is waited for,
--     anyone else's only tried (busy = skipped), so two of these never wait on each other in a circle. Checked on real
--     concurrent connections (PostgreSQL 18) before release.
-- Profiles that reserved a nickname with "Crea" and never published get no deadline (no rule for them yet).
-- Idempotent. ASCII only (SQL Editor).
begin;

-- Removing an expired account deletes its auth.users row (cascading to the profile, its results, sessions and any
-- pending e-mail); a player's own publication locks that row (FOR SHARE needs UPDATE). Refuse to install anything if
-- this role cannot, instead of failing every publication later.
do $$ begin
  if not has_table_privilege(current_user, 'auth.users', 'DELETE') or not has_table_privilege(current_user, 'auth.users', 'UPDATE') then
    raise exception 'temporary profiles need DELETE and UPDATE on auth.users for %', current_user;
  end if;
end $$;

alter table leaderboard_private.profiles add column if not exists expires_at timestamptz;
alter table leaderboard_private.profiles add column if not exists notice_at timestamptz;
create index if not exists profiles_expires on leaderboard_private.profiles (expires_at) where expires_at is not null;

-- Confirmed means an address Supabase Auth has confirmed on a permanent account; an anonymous one with a pending
-- e-mail change is not. Callers that delete rows repeat this test on the locked row (see purge_expired_profiles).
create or replace function leaderboard_private.verified(p_uid uuid) returns boolean
language sql stable set search_path = '' as $$
  select exists(select 1 from auth.users u where u.id = p_uid
    and not coalesce(u.is_anonymous, false) and u.email is not null and u.email_confirmed_at is not null)
$$;
revoke all on function leaderboard_private.verified(uuid) from public, anon, authenticated;

create or replace function leaderboard_private.expired(p_uid uuid, p_expires timestamptz) returns boolean
language sql stable set search_path = '' as $$
  select p_expires is not null and p_expires <= now() and not leaderboard_private.verified(p_uid)
$$;
revoke all on function leaderboard_private.expired(uuid, timestamptz) from public, anon, authenticated;

-- One transaction-long lock per account for whatever may delete or recreate its profile. p_wait: the caller's own
-- account (taken first, waited for); anyone else's is only tried, so no two holders can wait on each other.
create or replace function leaderboard_private.lock_profile(p_uid uuid, p_wait boolean) returns boolean
language plpgsql volatile set search_path = '' as $$
begin
  if p_wait then perform pg_catalog.pg_advisory_xact_lock(18100, pg_catalog.hashtext(p_uid::text)); return true; end if;
  return pg_catalog.pg_try_advisory_xact_lock(18100, pg_catalog.hashtext(p_uid::text));
end;
$$;
revoke all on function leaderboard_private.lock_profile(uuid, boolean) from public, anon, authenticated;

-- With p_uid's lock held: its account goes if its profile, read now (a new statement, after the lock), is still past
-- its deadline. A publication that started it again first has committed by then, and is seen. The confirmed test is on
-- the deleted row's own columns: a code Supabase Auth verifies meanwhile (it updates that row, without this lock)
-- either commits first and the row is re-checked and kept, or waits for this delete and finds no account to confirm.
create or replace function leaderboard_private.drop_expired(p_uid uuid) returns integer
language plpgsql volatile set search_path = '' as $$
declare v_n integer;
begin
  delete from auth.users u using leaderboard_private.profiles p
    where u.id = p_uid and p.user_id = u.id and p.expires_at <= now()
      and not (not coalesce(u.is_anonymous, false) and u.email is not null and u.email_confirmed_at is not null);
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;
revoke all on function leaderboard_private.drop_expired(uuid) from public, anon, authenticated;

-- The nickname of an expired profile is free: its holder goes now, not at the next scheduled purge. A holder busy right
-- now (publishing again, being purged) is left alone: the name stays taken for this try.
create or replace function leaderboard_private.check_alias_free(p_alias text, p_uid uuid) returns void
language plpgsql volatile set search_path = '' as $$
declare v_other uuid;
begin
  for v_other in select p.user_id from leaderboard_private.profiles p
      where p.user_id <> p_uid and p.expires_at <= now()
        and leaderboard_private.alias_key(p.alias) = leaderboard_private.alias_key(p_alias) loop
    if leaderboard_private.lock_profile(v_other, false) then perform leaderboard_private.drop_expired(v_other); end if;
  end loop;
  if exists (select 1 from leaderboard_private.profiles
      where leaderboard_private.alias_key(alias) = leaderboard_private.alias_key(p_alias) and user_id <> p_uid) then
    raise exception 'leaderboard_alias_taken' using errcode = '23505';
  end if;
end;
$$;
revoke all on function leaderboard_private.check_alias_free(text, uuid) from public, anon, authenticated;

-- The scheduled cleanup: confirmed profiles lose their old deadline, expired ones are deleted with their Auth account.
-- The list is only who to look at: each account is decided by drop_expired under its lock (one busy now: the next run).
create or replace function leaderboard_private.purge_expired_profiles(p_limit integer default 500) returns integer
language plpgsql set search_path = '' as $$
declare v_n integer := 0; v_uid uuid;
begin
  update leaderboard_private.profiles p set expires_at = null -- a row busy now (another purge, a publication): next run
    where p.user_id in (select q.user_id from leaderboard_private.profiles q
      where q.expires_at is not null and leaderboard_private.verified(q.user_id) for update skip locked);
  for v_uid in select p.user_id from leaderboard_private.profiles p
      where p.expires_at <= now()
      order by p.expires_at, p.user_id
      limit least(greatest(coalesce(p_limit, 500), 1), 5000) loop
    if leaderboard_private.lock_profile(v_uid, false) then v_n := v_n + leaderboard_private.drop_expired(v_uid); end if;
  end loop;
  return v_n;
end;
$$;
revoke all on function leaderboard_private.purge_expired_profiles(integer) from public, anon, authenticated;

-- 202610160001's, plus: rows of an expired profile are not shown (from the deadline, whenever the purge runs).
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
      and not leaderboard_private.expired(p.user_id, p.expires_at)
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

-- 202610160001's, plus p_notice and the deadline. A new argument means a new signature: the old one goes, so an old
-- client's 8 named arguments reach this one (p_notice defaults to false).
drop function if exists public.submit_result(text, integer, integer, integer, integer, integer, integer, text);
drop function if exists public.submit_result(text, integer, integer, integer, integer, integer, integer, text, boolean);
create function public.submit_result(p_version text, p_difficulty integer,
  p_perfect integer, p_good integer, p_miss integer, p_score integer, p_max_combo integer, p_alias text,
  p_notice boolean default false)
returns table(improved boolean, quality numeric, score integer, expires_at timestamptz, started boolean)
language plpgsql security definer set search_path = '' as $$
#variable_conflict use_column
declare
  v_uid uuid; v_alias text; v_total integer; v_max integer; v_extras integer; v_written timestamptz; v_rows integer;
  v_verified boolean; v_expires timestamptz; v_started boolean := false;
begin
  v_uid := leaderboard_private.require_player();
  v_alias := leaderboard_private.normalized_alias(p_alias);
  select v.judgments, v.max_score, v.extras_max into v_total, v_max, v_extras from leaderboard_private.versions v
    where v.version = p_version and v.difficulty = p_difficulty and v.active;
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
  -- this account first (a purge or a freed nickname deciding on it waits, or skips it), then the name's expired holder
  perform leaderboard_private.lock_profile(v_uid, true);
  -- The account row, locked: a code Supabase Auth is verifying right now commits first and the reset below sees it
  -- confirmed (no lock: it decided on an older snapshot and dropped the confirmed results), or waits for this one.
  perform 1 from auth.users u where u.id = v_uid for share;
  if not found then -- purged while this waited: its session is useless
    raise exception 'leaderboard_auth_required' using errcode = '28000';
  end if;
  perform leaderboard_private.check_alias_free(v_alias, v_uid);
  -- the caller's own profile past its deadline is gone: this publication starts a new one
  delete from leaderboard_private.profiles p where p.user_id = v_uid and leaderboard_private.expired(v_uid, p.expires_at);
  -- The profile lock covers all difficulties and concurrent requests for this account.
  insert into leaderboard_private.profiles(user_id, alias) values (v_uid, v_alias) on conflict do nothing;
  select p.last_write_at, p.expires_at into v_written, v_expires from leaderboard_private.profiles p where p.user_id = v_uid for update;
  if v_written > clock_timestamp() - interval '10 seconds' then
    raise exception 'leaderboard_rate_limit' using errcode = 'P0001';
  end if;
  v_verified := leaderboard_private.verified(v_uid);
  if v_verified then v_expires := null;
  elsif v_expires is null then
    if not coalesce(p_notice, false) then raise exception 'leaderboard_notice_required' using errcode = 'P0001'; end if;
    v_expires := now() + interval '7 days'; v_started := true;
  end if;
  update leaderboard_private.profiles p set alias = v_alias, last_write_at = clock_timestamp(), last_active_at = now(),
    expires_at = v_expires, notice_at = case when v_started then coalesce(p.notice_at, now()) else p.notice_at end
    where p.user_id = v_uid;
  insert into leaderboard_private.entries as existing(user_id, version, difficulty, perfect, good, miss, score, max_combo)
    values (v_uid, p_version, p_difficulty, p_perfect, p_good, p_miss, p_score, p_max_combo)
    on conflict (user_id, version, difficulty) do update set
      perfect = excluded.perfect, good = excluded.good, miss = excluded.miss,
      score = excluded.score, max_combo = excluded.max_combo, achieved_at = clock_timestamp()
    where (5 * excluded.perfect + 4 * excluded.good, excluded.score) > (existing.quality_units, existing.score);
  get diagnostics v_rows = row_count;
  return query select v_rows > 0, 20::numeric * e.quality_units / v_total,
    leaderboard_private.comparable_score(e.version, e.difficulty::integer, e.score), v_expires, v_started
    from leaderboard_private.entries e where e.user_id = v_uid and e.version = p_version and e.difficulty = p_difficulty;
end;
$$;
revoke all on function public.submit_result(text, integer, integer, integer, integer, integer, integer, text, boolean) from public, anon;
grant execute on function public.submit_result(text, integer, integer, integer, integer, integer, integer, text, boolean) to authenticated;

-- 202609300002's, plus: an expired own profile is replaced. A nickname reserved here gets no deadline.
create or replace function public.update_alias(p_alias text) returns text
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid; v_alias text; v_written timestamptz;
begin
  v_uid := leaderboard_private.require_player();
  v_alias := leaderboard_private.normalized_alias(p_alias);
  perform leaderboard_private.lock_profile(v_uid, true); -- as submit_result
  perform 1 from auth.users u where u.id = v_uid for share;
  if not found then
    raise exception 'leaderboard_auth_required' using errcode = '28000';
  end if;
  perform leaderboard_private.check_alias_free(v_alias, v_uid);
  delete from leaderboard_private.profiles p where p.user_id = v_uid and leaderboard_private.expired(v_uid, p.expires_at);
  insert into leaderboard_private.profiles(user_id, alias) values (v_uid, v_alias) on conflict do nothing;
  select last_write_at into v_written from leaderboard_private.profiles where user_id = v_uid for update;
  if v_written > clock_timestamp() - interval '10 seconds' then
    raise exception 'leaderboard_rate_limit' using errcode = 'P0001';
  end if;
  update leaderboard_private.profiles set alias = v_alias, last_write_at = clock_timestamp(), last_active_at = now() where user_id = v_uid;
  return v_alias;
end;
$$;
revoke all on function public.update_alias(text) from public, anon;
grant execute on function public.update_alias(text) to authenticated;

-- An old profile with results and no deadline: the client calls this once the notice is on screen. Only the first call
-- that reaches the server sets the deadline; a lost answer or a retry returns the same one.
create or replace function public.ack_expiry_notice() returns timestamptz
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid; v_expires timestamptz;
begin
  v_uid := leaderboard_private.require_player();
  if leaderboard_private.verified(v_uid) then return null; end if;
  update leaderboard_private.profiles p set expires_at = now() + interval '7 days', notice_at = coalesce(p.notice_at, now())
    where p.user_id = v_uid and p.expires_at is null
      and exists (select 1 from leaderboard_private.entries e where e.user_id = v_uid);
  select p.expires_at into v_expires from leaderboard_private.profiles p where p.user_id = v_uid;
  return v_expires;
end;
$$;
revoke all on function public.ack_expiry_notice() from public, anon;
grant execute on function public.ack_expiry_notice() to authenticated;

-- The caller's own profile (no row without one). verified is the server's answer, never the client's.
create or replace function public.my_profile()
returns table(alias text, verified boolean, expires_at timestamptz, published boolean, notice_needed boolean, expired boolean)
language sql stable security definer set search_path = '' as $$
  select p.alias, v.ok, case when v.ok then null else p.expires_at end, x.has_entries,
    not v.ok and p.expires_at is null and x.has_entries, not v.ok and p.expires_at is not null and p.expires_at <= now()
  from leaderboard_private.profiles p
  cross join lateral (select leaderboard_private.verified(p.user_id) as ok) v
  cross join lateral (select exists (select 1 from leaderboard_private.entries e where e.user_id = p.user_id) as has_entries) x
  where p.user_id = auth.uid()
$$;
revoke all on function public.my_profile() from public, anon;
grant execute on function public.my_profile() to authenticated;

-- 202610160001's, plus verified: a new output column means a new return type, so it is dropped and created again.
drop function if exists public.get_leaderboard_all(text, text, integer, integer);
create function public.get_leaderboard_all(p_version text, p_period text default 'all', p_offset integer default 0,
  p_limit integer default 50)
returns table("position" bigint, alias text, difficulty integer, quality numeric, score integer, max_combo integer, is_self boolean, total bigint, verified boolean)
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
      coalesce(r.user_id = v_uid, false), r.n, leaderboard_private.verified(r.user_id)
    from ranked r
    join leaderboard_private.profiles p on p.user_id = r.user_id
    where r.pos between v_from + 1 and v_from + v_count
      or (v_from = 0 and exists (select 1 from me where r.pos between me.pos - 5 and me.pos + 5))
    order by r.pos;
end;
$$;
revoke all on function public.get_leaderboard_all(text, text, integer, integer) from public;
grant execute on function public.get_leaderboard_all(text, text, integer, integer) to anon, authenticated;

commit;
