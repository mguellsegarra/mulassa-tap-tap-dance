-- One player per nickname. Two nicknames are the same when they only differ in capitals, accents, spaces, hyphens or
-- apostrophes ("Marc", "marc", "MARC-", "Marc'" and "Marc " are one). A taken one fails with leaderboard_alias_taken
-- (the client says "Aquest sobrenom ja es d'algu"); the unique index backs it up against two players racing.
-- ASCII only on purpose (pasted into the SQL Editor): the accented letters are U&'' escapes.
begin;

create function leaderboard_private.alias_key(p_alias text) returns text
language sql immutable set search_path = '' as $$
  select pg_catalog.regexp_replace(
    pg_catalog.translate(pg_catalog.lower(p_alias),
      U&'\00E0\00E1\00E2\00E4\00E8\00E9\00EA\00EB\00EC\00ED\00EE\00EF\00F2\00F3\00F4\00F6\00F9\00FA\00FB\00FC\00E7\00F1\00B7',
      'aaaaeeeeiiiioooouuuucn'),
    U&'[ ''\2019-]', '', 'g') -- the middle dot is already gone: translate() drops letters it has no pair for
$$;
revoke all on function leaderboard_private.alias_key(text) from public, anon, authenticated;

-- Existing duplicates would make the index fail: list them, so they can be renamed first.
do $$
declare v_dups text;
begin
  select string_agg(k || ' (' || n || ')', ', ') into v_dups from (
    select leaderboard_private.alias_key(alias) k, count(*) n from leaderboard_private.profiles group by 1 having count(*) > 1) d;
  if v_dups is not null then raise exception 'duplicate nicknames, rename them first: %', v_dups; end if;
end $$;
create unique index profiles_alias_key on leaderboard_private.profiles (leaderboard_private.alias_key(alias));

create function leaderboard_private.check_alias_free(p_alias text, p_uid uuid) returns void
language plpgsql stable set search_path = '' as $$
begin
  if exists (select 1 from leaderboard_private.profiles
      where leaderboard_private.alias_key(alias) = leaderboard_private.alias_key(p_alias) and user_id <> p_uid) then
    raise exception 'leaderboard_alias_taken' using errcode = '23505';
  end if;
end;
$$;
revoke all on function leaderboard_private.check_alias_free(text, uuid) from public, anon, authenticated;

-- submit_result: as in 202609280002, plus the check before the profile is written.
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

-- update_alias: as in 202609270001, plus the check.
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
