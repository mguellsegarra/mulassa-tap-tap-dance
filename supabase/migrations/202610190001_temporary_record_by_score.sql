-- Keep 202610170001's points-first order after 202610180001 adds temporary profiles.
-- Replace only the current signature: preserve notice, expiry, locking, limits and grants.
-- Existing profile deadlines and result rows are not rewritten.

create or replace function public.submit_result(p_version text, p_difficulty integer,
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
    where (leaderboard_private.comparable_score(excluded.version, excluded.difficulty::integer, excluded.score),
        5 * excluded.perfect + 4 * excluded.good, excluded.score)
      > (leaderboard_private.comparable_score(existing.version, existing.difficulty::integer, existing.score),
        existing.quality_units, existing.score);
  get diagnostics v_rows = row_count;
  return query select v_rows > 0, 20::numeric * e.quality_units / v_total,
    leaderboard_private.comparable_score(e.version, e.difficulty::integer, e.score), v_expires, v_started
    from leaderboard_private.entries e where e.user_id = v_uid and e.version = p_version and e.difficulty = p_difficulty;
end;
$$;
revoke all on function public.submit_result(text, integer, integer, integer, integer, integer, integer, text, boolean) from public, anon;
grant execute on function public.submit_result(text, integer, integer, integer, integer, integer, integer, text, boolean) to authenticated;
