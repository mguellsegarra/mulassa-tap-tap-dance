-- Fix 2026-09-28: production never got 202609280003_unique_alias.sql, but 202609280004 replaced submit_result with a
-- version that calls leaderboard_private.check_alias_free(). Every publish failed with
--   42883: function leaderboard_private.check_alias_free(text, uuid) does not exist
-- (PostgREST 404, shown by the client as «No s'ha pogut connectar amb la classificacio»).
-- This re-creates what 0003 added: alias_key(), check_alias_free(), the unique index, and update_alias with the check.
-- submit_result (from 0004) is already correct once check_alias_free exists, so it is not touched.
-- Idempotent: safe on a database that already has 0003 (create or replace / if not exists). ASCII only (SQL Editor).
begin;

create or replace function leaderboard_private.alias_key(p_alias text) returns text
language sql immutable set search_path = '' as $$
  select pg_catalog.regexp_replace(
    pg_catalog.translate(pg_catalog.lower(p_alias),
      U&'\00E0\00E1\00E2\00E4\00E8\00E9\00EA\00EB\00EC\00ED\00EE\00EF\00F2\00F3\00F4\00F6\00F9\00FA\00FB\00FC\00E7\00F1\00B7',
      'aaaaeeeeiiiioooouuuucn'),
    U&'[ ''\2019-]', '', 'g') -- the middle dot is already gone: translate() drops letters it has no pair for
$$;
revoke all on function leaderboard_private.alias_key(text) from public, anon, authenticated;

-- Existing duplicates would make the index fail: list them, so they can be renamed first (none on 2026-09-28).
do $$
declare v_dups text;
begin
  select string_agg(k || ' (' || n || ')', ', ') into v_dups from (
    select leaderboard_private.alias_key(alias) k, count(*) n from leaderboard_private.profiles group by 1 having count(*) > 1) d;
  if v_dups is not null then raise exception 'duplicate nicknames, rename them first: %', v_dups; end if;
end $$;
create unique index if not exists profiles_alias_key on leaderboard_private.profiles (leaderboard_private.alias_key(alias));

create or replace function leaderboard_private.check_alias_free(p_alias text, p_uid uuid) returns void
language plpgsql stable set search_path = '' as $$
begin
  if exists (select 1 from leaderboard_private.profiles
      where leaderboard_private.alias_key(alias) = leaderboard_private.alias_key(p_alias) and user_id <> p_uid) then
    raise exception 'leaderboard_alias_taken' using errcode = '23505';
  end if;
end;
$$;
revoke all on function leaderboard_private.check_alias_free(text, uuid) from public, anon, authenticated;

-- update_alias: as in 202609280003 (production still had the 202609270001 one, without the check).
create or replace function public.update_alias(p_alias text) returns text
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_alias text; v_written timestamptz;
begin
  if v_uid is null or not exists(select 1 from auth.users where id = v_uid and is_anonymous) then
    raise exception 'leaderboard_auth_required' using errcode = '28000';
  end if;
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

commit;
