-- Mulassa Pop's all-time board (docs/jocs/pop-ranking.md). The Edge Function pop-score replays a run from its seed and its taps
-- and records the score it computed itself; nothing here takes a score from a player. The board shows each player's best.
begin;

create table if not exists leaderboard_private.pop_best (
  user_id uuid primary key references leaderboard_private.profiles(user_id) on delete cascade,
  score integer not null check (score >= 0),
  hits integer not null default 0 check (hits >= 0), -- Mulassas tapped in the best run
  level smallint not null default 0 check (level between 0 and 2), -- its level: 0 easy, 1 normal, 2 hard
  achieved_at timestamptz not null default now()
);
create index if not exists pop_best_rank on leaderboard_private.pop_best (score desc, achieved_at);

-- every accepted run, so a seed scores once per player
create table if not exists leaderboard_private.pop_runs (
  user_id uuid not null references leaderboard_private.profiles(user_id) on delete cascade,
  seed bigint not null check (seed between 0 and 4294967295),
  score integer not null check (score >= 0),
  ticks integer not null check (ticks > 0),
  created_at timestamptz not null default now(),
  primary key (user_id, seed)
);

-- replays cost CPU: the function asks first, accepted or not (one row per account, a sliding minute)
create table if not exists leaderboard_private.pop_attempts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  window_start timestamptz not null,
  attempts integer not null
);

alter table leaderboard_private.pop_best enable row level security;
alter table leaderboard_private.pop_runs enable row level security;
alter table leaderboard_private.pop_attempts enable row level security;
revoke all on leaderboard_private.pop_best, leaderboard_private.pop_runs, leaderboard_private.pop_attempts from public, anon, authenticated;

-- Before a replay: the caller may publish (a guest or a confirmed e-mail, with a name that is theirs) and has not asked more
-- than 12 times this minute. The function passes the account Auth verified; only the service role may call this.
create or replace function public.pop_gate(p_uid uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_attempts integer;
begin
  if p_uid is null or not exists(select 1 from auth.users where id = p_uid and (is_anonymous or email_confirmed_at is not null)) then
    raise exception 'leaderboard_auth_required' using errcode = '28000';
  end if;
  if not exists(select 1 from leaderboard_private.profiles where user_id = p_uid and released_at is null) then
    raise exception 'pop_profile_required' using errcode = 'P0001';
  end if;
  insert into leaderboard_private.pop_attempts as a (user_id, window_start, attempts) values (p_uid, now(), 1)
    on conflict (user_id) do update set
      window_start = case when a.window_start < now() - interval '1 minute' then now() else a.window_start end,
      attempts = case when a.window_start < now() - interval '1 minute' then 1 else a.attempts + 1 end
    returning attempts into v_attempts;
  if v_attempts > 12 then raise exception 'pop_rate_limited' using errcode = '54000'; end if;
end $$;
revoke all on function public.pop_gate(uuid) from public, anon, authenticated;
grant execute on function public.pop_gate(uuid) to service_role;

-- A replayed run: kept once per seed, the best raised when beaten (a tie keeps the first), with its hits and level. Resolves the
-- best, whether this run raised it, and the rank. p_score is the replay's points.
create or replace function public.pop_record(p_uid uuid, p_seed bigint, p_score integer, p_ticks integer, p_hits integer, p_level smallint)
returns table(best integer, improved boolean, "position" bigint)
language plpgsql security definer set search_path = '' as $$
declare v_best integer; v_improved boolean := false;
begin
  perform 1 from leaderboard_private.profiles where user_id = p_uid and released_at is null for update;
  if not found then raise exception 'pop_profile_required' using errcode = 'P0001'; end if;
  insert into leaderboard_private.pop_runs (user_id, seed, score, ticks) values (p_uid, p_seed, p_score, p_ticks)
    on conflict do nothing;
  if not found then raise exception 'pop_seed_used' using errcode = '23505'; end if;
  select b.score into v_best from leaderboard_private.pop_best b where b.user_id = p_uid;
  if v_best is null or p_score > v_best then
    insert into leaderboard_private.pop_best (user_id, score, hits, level) values (p_uid, p_score, p_hits, p_level)
      on conflict (user_id) do update set score = excluded.score, hits = excluded.hits, level = excluded.level, achieved_at = now();
    v_best := p_score;
    v_improved := true;
  end if;
  update leaderboard_private.profiles set last_active_at = now() where user_id = p_uid;
  return query select v_best, v_improved, (select count(*) + 1 from leaderboard_private.pop_best b
    join leaderboard_private.profiles p on p.user_id = b.user_id
    where not p.is_seed and b.score > v_best);
end $$;
revoke all on function public.pop_record(uuid, bigint, integer, integer, integer, smallint) from public, anon, authenticated;
grant execute on function public.pop_record(uuid, bigint, integer, integer, integer, smallint) to service_role;

-- The board: a page of up to 50, ties sharing a position, the earlier best first. Released names stay, as on the main boards.
create or replace function public.get_pop_board(p_offset integer default 0, p_limit integer default 50)
returns table("position" bigint, alias text, score integer, is_self boolean, total bigint, public_id uuid, released boolean,
  verified boolean, badge_id text, hits integer, level smallint)
language sql stable security definer set search_path = '' as $$
  with ranked as (
    select rank() over (order by b.score desc) as "position", p.alias, b.score, coalesce(b.user_id = auth.uid(), false) as is_self,
      count(*) over () as total, p.public_id, p.released_at is not null as released, b.user_id, b.achieved_at, b.hits, b.level
    from leaderboard_private.pop_best b join leaderboard_private.profiles p on p.user_id = b.user_id
    where not p.is_seed
  )
  select r."position", r.alias, r.score, r.is_self, r.total, r.public_id, r.released, leaderboard_private.verified(r.user_id),
    leaderboard_private.shown_badge(r.user_id), r.hits, r.level
  from ranked r order by r."position", r.achieved_at, r.public_id
  offset greatest(coalesce(p_offset, 0), 0) limit least(greatest(coalesce(p_limit, 50), 1), 50)
$$;
revoke all on function public.get_pop_board(integer, integer) from public;
grant execute on function public.get_pop_board(integer, integer) to anon, authenticated;

-- A player's card on this board, by the public id the board shows: the name as the board shows it, the best and its place,
-- and their published runs (how many, the average). Nothing for an unknown id or a seed profile.
create or replace function public.get_pop_player(p_public_id uuid)
returns table(alias text, verified boolean, released boolean, badge_id text, best integer, "position" bigint, best_at timestamptz,
  runs bigint, average integer, hits integer, level smallint)
language sql stable security definer set search_path = '' as $$
  select p.alias, leaderboard_private.verified(p.user_id), p.released_at is not null, leaderboard_private.shown_badge(p.user_id),
    b.score, (select count(*) + 1 from leaderboard_private.pop_best o join leaderboard_private.profiles q on q.user_id = o.user_id
      where not q.is_seed and o.score > b.score), b.achieved_at,
    (select count(*) from leaderboard_private.pop_runs r where r.user_id = p.user_id),
    (select round(avg(r.score))::integer from leaderboard_private.pop_runs r where r.user_id = p.user_id), b.hits, b.level
  from leaderboard_private.profiles p join leaderboard_private.pop_best b on b.user_id = p.user_id
  where p.public_id = p_public_id and not p.is_seed
$$;
revoke all on function public.get_pop_player(uuid) from public;
grant execute on function public.get_pop_player(uuid) to anon, authenticated;

-- The caller's own best and position, or nothing.
create or replace function public.my_pop() returns table(score integer, "position" bigint, hits integer, level smallint)
language sql stable security definer set search_path = '' as $$
  select b.score, (select count(*) + 1 from leaderboard_private.pop_best o
      join leaderboard_private.profiles p on p.user_id = o.user_id where not p.is_seed and o.score > b.score), b.hits, b.level
  from leaderboard_private.pop_best b where b.user_id = auth.uid()
$$;
revoke all on function public.my_pop() from public;
grant execute on function public.my_pop() to anon, authenticated;

commit;
