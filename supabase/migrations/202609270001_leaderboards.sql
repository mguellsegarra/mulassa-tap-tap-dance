begin;
create schema if not exists leaderboard_private;
revoke all on schema leaderboard_private from public, anon, authenticated;

create table leaderboard_private.versions (
  version text not null,
  difficulty smallint not null check (difficulty between 0 and 2),
  judgments integer not null check (judgments > 0),
  max_score integer not null check (max_score > 0),
  active boolean not null default true,
  primary key (version, difficulty)
);
-- Counts include hold tails; balloons are judged once. Balloons have no input-rate cap.
insert into leaderboard_private.versions values
  ('mulassa-v1', 0, 150, 2147483647, true),
  ('mulassa-v1', 1, 181, 2147483647, true),
  ('mulassa-v1', 2, 318, 2147483647, true);

create table leaderboard_private.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  alias text not null,
  created_at timestamptz not null default now(),
  last_active_at timestamptz not null default now(),
  last_write_at timestamptz
);
create table leaderboard_private.entries (
  id bigint generated always as identity primary key,
  user_id uuid not null references leaderboard_private.profiles(user_id) on delete cascade,
  version text not null,
  difficulty smallint not null,
  perfect integer not null check (perfect >= 0),
  good integer not null check (good >= 0),
  miss integer not null check (miss >= 0),
  score integer not null check (score >= 0),
  max_combo integer not null check (max_combo >= 0),
  quality_units integer generated always as (5 * perfect + 4 * good) stored,
  achieved_at timestamptz not null default now(),
  unique (user_id, version, difficulty),
  foreign key (version, difficulty) references leaderboard_private.versions(version, difficulty)
);
create index entries_ranking on leaderboard_private.entries(version, difficulty, quality_units desc, score desc, achieved_at, id);
alter table leaderboard_private.versions enable row level security;
alter table leaderboard_private.profiles enable row level security;
alter table leaderboard_private.entries enable row level security;
revoke all on all tables in schema leaderboard_private from public, anon, authenticated;
revoke all on all sequences in schema leaderboard_private from public, anon, authenticated;

create function leaderboard_private.normalized_alias(p_alias text) returns text
language plpgsql immutable set search_path = '' as $$
declare v_alias text;
begin
  v_alias := normalize(pg_catalog.regexp_replace(pg_catalog.btrim(p_alias), '[[:space:]]+', ' ', 'g'), NFC);
  if v_alias is null or pg_catalog.char_length(v_alias) not between 2 and 20
    or v_alias !~ '^[[:alnum:] ''’̀-ͯ-]+$' then
    raise exception 'leaderboard_invalid_alias' using errcode = '22023';
  end if;
  return v_alias;
end;
$$;

create function public.get_leaderboard(p_version text, p_difficulty integer)
returns table("position" bigint, alias text, quality numeric, score integer, is_self boolean)
language plpgsql security definer set search_path = '' as $$
declare v_total integer; v_uid uuid := auth.uid();
begin
  select judgments into v_total from leaderboard_private.versions
    where version = p_version and difficulty = p_difficulty and active;
  if v_total is null then raise exception 'leaderboard_invalid_version' using errcode = '22023'; end if;
  if v_uid is not null then
    update leaderboard_private.profiles set last_active_at = now()
      where user_id = v_uid and last_active_at < now() - interval '10 minutes';
  end if;
  return query
    select row_number() over (order by e.quality_units desc, e.score desc, e.achieved_at, e.id),
      p.alias, 20::numeric * e.quality_units / v_total, e.score, coalesce(e.user_id = v_uid, false)
    from leaderboard_private.entries e join leaderboard_private.profiles p on p.user_id = e.user_id
    where e.version = p_version and e.difficulty = p_difficulty
    order by e.quality_units desc, e.score desc, e.achieved_at, e.id limit 50;
end;
$$;

create function public.submit_result(p_version text, p_difficulty integer,
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

create function public.update_alias(p_alias text) returns text
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
  update leaderboard_private.profiles set alias = v_alias, last_write_at = clock_timestamp(), last_active_at = now() where user_id = v_uid;
  return v_alias;
end;
$$;
revoke all on function leaderboard_private.normalized_alias(text) from public, anon, authenticated;
revoke all on function public.get_leaderboard(text, integer) from public;
revoke all on function public.submit_result(text, integer, integer, integer, integer, integer, integer, text) from public, anon;
revoke all on function public.update_alias(text) from public, anon;
grant execute on function public.get_leaderboard(text, integer) to anon, authenticated;
grant execute on function public.submit_result(text, integer, integer, integer, integer, integer, integer, text) to authenticated;
grant execute on function public.update_alias(text) to authenticated;
commit;
