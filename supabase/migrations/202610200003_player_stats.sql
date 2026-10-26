-- Cumulative counters per account/device; public projections are installed separately.
begin;
alter table leaderboard_private.versions add column if not exists duration_seconds numeric check (duration_seconds > 0);
alter table leaderboard_private.versions add column if not exists guapa_count integer check (guapa_count >= 0);
-- GLOBUS and MANTEN per run: makeDanceChart (src/game/chart.js) over src/song.json / src/song-drac.json, per level;
-- tests/player-stats-db.mjs checks them against the charts. A new chart is a new version row.
alter table leaderboard_private.versions add column if not exists balloon_count integer check (balloon_count >= 0);
alter table leaderboard_private.versions add column if not exists hold_count integer check (hold_count >= 0);
update leaderboard_private.versions set duration_seconds = 90.1, guapa_count = 11, balloon_count = 2,
  hold_count = (array[0,5,5])[difficulty+1] where version = 'mulassa-v3';
update leaderboard_private.versions set duration_seconds = 109.889,
  guapa_count = (array[12,12,16])[difficulty+1], balloon_count = 2, hold_count = (array[0,1,1])[difficulty+1] where version = 'drac-v1';
alter table leaderboard_private.profiles add column if not exists last_stats_at timestamptz;
-- A device registry makes the first import cover ALL buckets at once, including an empty first import.
create table if not exists leaderboard_private.player_devices (
  user_id uuid not null references leaderboard_private.profiles(user_id) on delete cascade,
  device_id uuid not null, first_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  primary key(user_id,device_id)
);
create table if not exists leaderboard_private.player_stats (
  user_id uuid not null references leaderboard_private.profiles(user_id) on delete cascade,
  device_id uuid not null, bucket text not null, counters jsonb not null,
  first_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  primary key(user_id,device_id,bucket),
  foreign key(user_id,device_id) references leaderboard_private.player_devices(user_id,device_id) on delete cascade
);
create table if not exists leaderboard_private.player_days (
  user_id uuid not null references leaderboard_private.profiles(user_id) on delete cascade,
  day date not null, primary key(user_id,day)
);
alter table leaderboard_private.player_devices enable row level security;
alter table leaderboard_private.player_stats enable row level security;
alter table leaderboard_private.player_days enable row level security;
revoke all on leaderboard_private.player_devices,leaderboard_private.player_stats,leaderboard_private.player_days from public,anon,authenticated;

-- Reject unknown keys, non-integers, negatives and impractically large JSON numbers before arithmetic.
create or replace function leaderboard_private.stat_numbers(p_values jsonb, p_keys text[]) returns void
language plpgsql immutable set search_path = '' as $$
declare item record;
begin
  if jsonb_typeof(p_values) is distinct from 'object' then raise exception 'leaderboard_invalid_stats' using errcode = '22023'; end if;
  for item in select * from jsonb_each(p_values) loop
    if not (item.key = any(p_keys)) or jsonb_typeof(item.value) <> 'number'
      or item.value::text !~ '^[0-9]+$' or (item.value::text)::numeric > 9007199254740991 then
      raise exception 'leaderboard_invalid_stats' using errcode = '22023';
    end if;
  end loop;
end $$;

-- Raw whole-run tuple: score, perfect, good, miss, maxCombo. Never combine its individual maxima.
create or replace function leaderboard_private.validate_best(p_best jsonb, p_rule leaderboard_private.versions) returns void
language plpgsql immutable set search_path = '' as $$
begin
  if p_best is null or p_best = 'null'::jsonb then return; end if;
  perform leaderboard_private.stat_numbers(p_best,array['score','perfect','good','miss','maxCombo']);
  if not (p_best ?& array['score','perfect','good','miss','maxCombo'])
    or (p_best->>'perfect')::numeric + (p_best->>'good')::numeric + (p_best->>'miss')::numeric <> p_rule.judgments
    or (p_best->>'maxCombo')::numeric > (p_best->>'perfect')::numeric + (p_best->>'good')::numeric
    or (p_best->>'score')::numeric > p_rule.max_score
    or (p_best->>'score')::numeric > (p_rule.max_score-p_rule.extras_max)::numeric
      * ((p_best->>'perfect')::numeric + (p_best->>'good')::numeric) / p_rule.judgments + p_rule.extras_max then
    raise exception 'leaderboard_invalid_stats' using errcode = '22023';
  end if;
end $$;
create or replace function leaderboard_private.better_best(p_new jsonb, p_old jsonb) returns jsonb
language sql immutable set search_path = '' as $$
  select case when p_new is null or p_new = 'null'::jsonb then p_old
    when p_old is null or p_old = 'null'::jsonb then p_new
    when ((p_new->>'score')::numeric, 5*(p_new->>'perfect')::numeric+4*(p_new->>'good')::numeric)
       > ((p_old->>'score')::numeric, 5*(p_old->>'perfect')::numeric+4*(p_old->>'good')::numeric) then p_new else p_old end
$$;

create or replace function leaderboard_private.merge_bucket(p_bucket text, p_new jsonb, p_old jsonb) returns jsonb
language plpgsql stable set search_path = '' as $$
declare v_rule leaderboard_private.versions; v_out jsonb := coalesce(p_old,'{}'); item record; v_errors jsonb;
  v_runs numeric; v_complete numeric; v_collapsed numeric; v_judgments numeric; v_errors_total numeric;
  v_keys text[] := array['runs','completed','collapsed','seconds','perfect','good','miss','guapa','guapaTotal','balloons','holds','bestCombo','bestStars'];
begin
  if jsonb_typeof(p_new) is distinct from 'object' then raise exception 'leaderboard_invalid_stats' using errcode = '22023'; end if;
  if p_bucket = 'practice' then
    perform leaderboard_private.stat_numbers(p_new,array['runs','seconds']);
  else
    select * into v_rule from leaderboard_private.versions v
      where p_bucket = v.figure_id || '/' || v.version || '/' || v.difficulty::text
        and v.duration_seconds is not null;
    if not found then raise exception 'leaderboard_invalid_bucket' using errcode = '22023'; end if;
    perform leaderboard_private.stat_numbers(p_new - 'errors' - 'best',v_keys);
    if p_new ? 'errors' then
      perform leaderboard_private.stat_numbers(p_new->'errors',array['early','late','silent','both','hold','move']);
    end if;
    perform leaderboard_private.validate_best(p_new->'best',v_rule);
  end if;
  for item in select * from jsonb_each(p_new - 'errors' - 'best') loop
    if (item.value::text)::numeric < coalesce((p_old->>item.key)::numeric,0) then
      raise exception 'leaderboard_stats_decreased' using errcode = '22023';
    end if;
    v_out := jsonb_set(v_out,array[item.key],to_jsonb(greatest((item.value::text)::numeric,coalesce((p_old->>item.key)::numeric,0))));
  end loop;
  if p_new ? 'errors' then
    v_errors := coalesce(p_old->'errors','{}');
    for item in select * from jsonb_each(p_new->'errors') loop
      if (item.value::text)::numeric < coalesce((v_errors->>item.key)::numeric,0) then
        raise exception 'leaderboard_stats_decreased' using errcode = '22023';
      end if;
      v_errors := jsonb_set(v_errors,array[item.key],item.value);
    end loop;
    v_out := jsonb_set(v_out,'{errors}',v_errors);
  end if;
  if p_bucket <> 'practice' then
    v_out := jsonb_set(v_out,'{best}',coalesce(leaderboard_private.better_best(p_new->'best',p_old->'best'),'null'));
  end if;
  v_runs := coalesce((v_out->>'runs')::numeric,0);
  if p_bucket = 'practice' then
    -- Practice has no fixed duration; it is kept separate from song time.
    if v_runs = 0 and coalesce((v_out->>'seconds')::numeric,0) > 0 then
      raise exception 'leaderboard_invalid_stats' using errcode = '22023';
    end if;
    return v_out;
  end if;
  v_complete := coalesce((v_out->>'completed')::numeric,0);
  v_collapsed := coalesce((v_out->>'collapsed')::numeric,0);
  v_judgments := coalesce((v_out->>'perfect')::numeric,0)+coalesce((v_out->>'good')::numeric,0)+coalesce((v_out->>'miss')::numeric,0);
  -- judge.js files every non-perfect note that is not a GLOBUS under exactly one error reason
  select coalesce(sum((value::text)::numeric),0) into v_errors_total from jsonb_each(coalesce(v_out->'errors','{}'));
  if v_complete + v_collapsed > v_runs or v_judgments < v_complete*v_rule.judgments
    or v_judgments > (v_complete+v_collapsed)*v_rule.judgments
    or coalesce((v_out->>'guapa')::numeric,0) > coalesce((v_out->>'guapaTotal')::numeric,0)
    or coalesce((v_out->>'guapaTotal')::numeric,0) > (v_complete+v_collapsed)*v_rule.guapa_count
    or coalesce((v_out->>'balloons')::numeric,0) > (v_complete+v_collapsed)*v_rule.balloon_count
    or coalesce((v_out->>'holds')::numeric,0) > (v_complete+v_collapsed)*v_rule.hold_count
    or v_errors_total > coalesce((v_out->>'good')::numeric,0)+coalesce((v_out->>'miss')::numeric,0)
    or coalesce((v_out->>'bestCombo')::numeric,0) > v_rule.judgments
    or coalesce((v_out->>'bestStars')::numeric,0) > 3
    or coalesce((v_out->>'seconds')::numeric,0) > v_runs*v_rule.duration_seconds then
    raise exception 'leaderboard_invalid_stats' using errcode = '22023';
  end if;
  return v_out;
end $$;

-- p_owner: the user id the client built these counters for. supabase-js re-reads the session when it signs the request, so
-- another tab's account switch can land between the client's own check and this call: then the counters would be credited
-- to the wrong profile. The server is the only place that can tell, so it refuses (the client adopts the live owner).
create or replace function public.merge_stats(p_device uuid, p_buckets jsonb, p_days date[], p_owner uuid) returns void
language plpgsql volatile security definer set search_path = '' as $$
declare v_uid uuid := leaderboard_private.require_player(); v_last timestamptz; v_device_at timestamptz;
  v_now timestamptz; item record; v_old jsonb; v_new jsonb; v_growth numeric := 0; v_day date; v_since timestamptz;
begin
  if p_owner is distinct from v_uid then raise exception 'leaderboard_owner_mismatch' using errcode = '28000'; end if;
  if p_device is null or jsonb_typeof(p_buckets) is distinct from 'object' or octet_length(p_buckets::text) > 65536
    or coalesce(cardinality(p_days),0) > 4096 then raise exception 'leaderboard_invalid_stats' using errcode = '22023'; end if;
  perform leaderboard_private.lock_profile(v_uid,true);
  perform 1 from auth.users where id = v_uid for share;
  if not found then raise exception 'leaderboard_auth_required' using errcode = '28000'; end if;
  select last_stats_at into v_last from leaderboard_private.profiles where user_id = v_uid for update;
  if not found then raise exception 'leaderboard_auth_profile_missing' using errcode = '28000'; end if;
  v_now := clock_timestamp();
  if v_last > v_now - interval '1 minute' then raise exception 'leaderboard_rate_limit' using errcode = 'P0001'; end if;
  select updated_at into v_device_at from leaderboard_private.player_devices where user_id = v_uid and device_id = p_device;
  if not found then
    if (select count(*) from leaderboard_private.player_devices where user_id = v_uid) >= 8 then
      raise exception 'leaderboard_device_limit' using errcode = 'P0001';
    end if;
    insert into leaderboard_private.player_devices(user_id,device_id,first_at,updated_at) values(v_uid,p_device,v_now,v_now);
  end if;
  for item in select * from jsonb_each(p_buckets) loop
    select counters into v_old from leaderboard_private.player_stats where user_id = v_uid and device_id = p_device and bucket = item.key;
    v_new := leaderboard_private.merge_bucket(item.key,item.value,v_old);
    -- Every run costs at least 1 s of real time: one quit in the count-in reaches here with 0 s (stats.js), yet took a
    -- tap to start and one to leave. So runs (on the public card) cannot grow faster than the clock.
    v_growth := v_growth + coalesce((v_new->>'seconds')::numeric,0) - coalesce((v_old->>'seconds')::numeric,0)
      + coalesce((v_new->>'runs')::numeric,0) - coalesce((v_old->>'runs')::numeric,0);
    insert into leaderboard_private.player_stats(user_id,device_id,bucket,counters,first_at,updated_at)
      values(v_uid,p_device,item.key,v_new,v_now,v_now)
    on conflict(user_id,device_id,bucket) do update set counters = excluded.counters, updated_at = excluded.updated_at;
  end loop;
  -- Aggregate across ALL buckets, including a newly added bucket on an already imported device. A first import brings
  -- earlier play (decision 27), none of it before the first season's day: statistics ship with it (the days' floor below).
  select ((starts_at at time zone 'Europe/Madrid')::date)::timestamp at time zone 'Europe/Madrid' into v_since
    from leaderboard_private.seasons where id = 1;
  if v_growth > extract(epoch from v_now-coalesce(v_device_at,v_since)) then
    raise exception 'leaderboard_stats_time_limit' using errcode = '22023';
  end if;
  foreach v_day in array coalesce(p_days,array[]::date[]) loop
    if v_day is null or not isfinite(v_day) or v_day > (v_now at time zone 'UTC')::date+1
      or v_day < (select (starts_at at time zone 'Europe/Madrid')::date from leaderboard_private.seasons where id = 1) then
      raise exception 'leaderboard_invalid_day' using errcode = '22023';
    end if;
    insert into leaderboard_private.player_days values(v_uid,v_day) on conflict do nothing;
  end loop;
  update leaderboard_private.player_devices set updated_at = v_now where user_id = v_uid and device_id = p_device;
  update leaderboard_private.profiles set last_stats_at = v_now,last_active_at = v_now where user_id = v_uid;
end $$;

-- Per-bucket totals: additive counters sum, achievement maxima max, best stays a whole run.
create or replace function leaderboard_private.stats_totals(p_uid uuid) returns jsonb
language plpgsql stable set search_path = '' as $$
declare v_result jsonb := '{}'; item record; field record; v_bucket jsonb; v_errors jsonb; err record;
begin
  for item in select bucket,counters from leaderboard_private.player_stats where user_id = p_uid order by bucket,device_id loop
    v_bucket := coalesce(v_result->item.bucket,'{}');
    for field in select * from jsonb_each(item.counters - 'best' - 'errors') loop
      v_bucket := jsonb_set(v_bucket,array[field.key],to_jsonb(case when field.key in ('bestCombo','bestStars')
        then greatest(coalesce((v_bucket->>field.key)::numeric,0),(field.value::text)::numeric)
        else coalesce((v_bucket->>field.key)::numeric,0)+(field.value::text)::numeric end));
    end loop;
    if item.counters ? 'errors' then
      v_errors := coalesce(v_bucket->'errors','{}');
      for err in select * from jsonb_each(item.counters->'errors') loop
        v_errors := jsonb_set(v_errors,array[err.key],to_jsonb(coalesce((v_errors->>err.key)::numeric,0)+(err.value::text)::numeric));
      end loop;
      v_bucket := jsonb_set(v_bucket,'{errors}',v_errors);
    end if;
    if item.bucket <> 'practice' then
      v_bucket := jsonb_set(v_bucket,'{best}',coalesce(leaderboard_private.better_best(item.counters->'best',v_bucket->'best'),'null'));
    end if;
    v_result := jsonb_set(v_result,array[item.bucket],v_bucket);
  end loop;
  return v_result;
end $$;

create or replace function public.my_stats()
returns table(buckets jsonb, days date[], days_played bigint, current_streak integer, longest_streak integer)
language plpgsql volatile security definer set search_path = '' as $$
declare v_uid uuid := leaderboard_private.require_player();
begin
  perform leaderboard_private.touch_profile(v_uid);
  if not exists(select 1 from leaderboard_private.profiles where user_id = v_uid) then
    raise exception 'leaderboard_auth_profile_missing' using errcode = '28000';
  end if;
  return query with d as (select day, day - row_number() over(order by day)::integer as grp
    from leaderboard_private.player_days where user_id = v_uid),
    streaks as (select max(day) as last_day,count(*)::integer as n from d group by grp)
  select leaderboard_private.stats_totals(v_uid),coalesce((select array_agg(day order by day) from d),array[]::date[]),
    (select count(*) from d),coalesce((select max(n) from streaks where last_day >= (now() at time zone 'Europe/Madrid')::date-1),0),
    coalesce((select max(n) from streaks),0);
end $$;
revoke all on function leaderboard_private.stat_numbers(jsonb,text[]),
  leaderboard_private.validate_best(jsonb,leaderboard_private.versions), leaderboard_private.better_best(jsonb,jsonb),
  leaderboard_private.merge_bucket(text,jsonb,jsonb), leaderboard_private.stats_totals(uuid) from public,anon,authenticated;
revoke all on function public.merge_stats(uuid,jsonb,date[],uuid),public.my_stats() from public,anon;
grant execute on function public.merge_stats(uuid,jsonb,date[],uuid),public.my_stats() to authenticated;
commit;
