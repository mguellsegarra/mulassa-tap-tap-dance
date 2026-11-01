-- A confirmed player can show a badge (an association's logo or a town's arms) instead of the blue check. The choice is one
-- id from a closed list; art lives in the client (src/ui/player-badges.js), which falls back to the check for an id it does
-- not know. Additive: the old reads keep their shape for cached clients, the new ones are *_v2. Idempotent; ASCII only.
begin;
alter table leaderboard_private.profiles add column if not exists badge_id text;
alter table leaderboard_private.profiles drop constraint if exists profiles_badge_id_check;
alter table leaderboard_private.profiles add constraint profiles_badge_id_check check (badge_id in (
    'colla-vella', 'colla-joves', 'campanar-valls', 'senyera', 'estelada-groga', 'estelada-blava', 'occitana',
    'uaf', 'pessigolla', 'town:valls', 'town:tarragona', 'town:reus', 'town:solsona',
    'town:vilanova', 'town:barcelona', 'town:berga', 'town:olot', 'town:vilafranca', 'town:lleida',
    'town:terrassa', 'town:manresa', 'town:montblanc', 'town:girona', 'town:molins', 'town:sant-sadurni',
    'town:mataro', 'town:tortosa', 'town:sineu', 'town:vinaros', 'town:castello', 'town:bao',
    'town:fraga', 'town:campos', 'town:bisbal-emporda', 'town:cardedeu', 'town:artesa-lleida', 'town:valencia',
    'town:andratx', 'town:prada', 'town:denia', 'town:sant-joan', 'town:sant-julia'));

-- What the others see: the choice stays stored when a confirmation is lost, and shows again if it comes back.
create or replace function leaderboard_private.shown_badge(p_uid uuid) returns text
language sql stable set search_path = '' as $$
  select p.badge_id from leaderboard_private.profiles p
  where p.user_id = p_uid and p.released_at is null and leaderboard_private.verified(p_uid)
$$;

-- null puts the check back. p_owner is the profile's public id as the sheet showed it: an account switched in another
-- tab must not receive the choice (the SDK can sign with a newer session than the one the player looked at).
create or replace function public.set_profile_badge(p_badge_id text, p_owner uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := leaderboard_private.require_player(); v_public uuid; v_released timestamptz;
begin
  perform leaderboard_private.lock_profile(v_uid, true);
  perform 1 from auth.users where id = v_uid and email_confirmed_at is not null for share;
  if not found then raise exception 'leaderboard_not_confirmed' using errcode = '42501'; end if;
  select public_id, released_at into v_public, v_released from leaderboard_private.profiles where user_id = v_uid for update;
  if v_public is null or v_public is distinct from p_owner then
    raise exception 'leaderboard_owner_mismatch' using errcode = '28000';
  end if;
  if v_released is not null then raise exception 'leaderboard_not_confirmed' using errcode = '42501'; end if;
  begin
    update leaderboard_private.profiles set badge_id = p_badge_id, last_active_at = now() where user_id = v_uid;
  exception when check_violation then
    raise exception 'leaderboard_invalid_badge' using errcode = '22023';
  end;
  return p_badge_id;
end $$;

-- my_profile_v2's badge_id is the stored choice shown to its owner under the same rule as to everybody, and its presence
-- tells the client this server can save one.
create or replace function public.my_profile_v2()
returns table(alias text, verified boolean, published boolean, released boolean, public_id uuid, badge_id text)
language sql volatile security definer set search_path = '' as $$
  select r.alias, r.verified, r.published, r.released, r.public_id, leaderboard_private.shown_badge(p.user_id)
  from public.my_profile() r join leaderboard_private.profiles p on p.public_id = r.public_id
$$;

create or replace function public.get_leaderboard_all_v2(p_version text, p_period text default 'all',
  p_offset integer default 0, p_limit integer default 50, p_season smallint default null)
returns table("position" bigint, alias text, difficulty integer, quality numeric, score integer, max_combo integer,
  is_self boolean, total bigint, verified boolean, season_id smallint, public_id uuid, released boolean, badge_id text)
language sql volatile security definer set search_path = '' as $$
  select r."position", r.alias, r.difficulty, r.quality, r.score, r.max_combo, r.is_self, r.total, r.verified, r.season_id,
    r.public_id, r.released, leaderboard_private.shown_badge(p.user_id)
  from public.get_leaderboard_all(p_version, p_period, p_offset, p_limit, p_season) r
  join leaderboard_private.profiles p on p.public_id = r.public_id
  order by r."position"
$$;

create or replace function public.get_level_podium_v2(p_version text, p_difficulty integer, p_season smallint default null)
returns table("position" bigint, alias text, score integer, quality numeric, is_self boolean, total bigint,
  verified boolean, public_id uuid, released boolean, badge_id text)
language sql stable security definer set search_path = '' as $$
  select r."position", r.alias, r.score, r.quality, r.is_self, r.total, r.verified, r.public_id, r.released,
    leaderboard_private.shown_badge(p.user_id)
  from public.get_level_podium(p_version, p_difficulty, p_season) r
  join leaderboard_private.profiles p on p.public_id = r.public_id
  order by r."position"
$$;

create or replace function public.get_player_card_v2(p_public_id uuid)
returns table(alias text, verified boolean, released boolean, totals jsonb, podiums jsonb, badge_id text)
language sql stable security definer set search_path = '' as $$
  select r.alias, r.verified, r.released, r.totals, r.podiums, leaderboard_private.shown_badge(p.user_id)
  from public.get_player_card(p_public_id) r join leaderboard_private.profiles p on p.public_id = p_public_id
$$;

-- jsonb podium: one more key changes no SQL shape, and old clients ignore it.
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
        'verified',leaderboard_private.verified(p.user_id),
        'badge_id',leaderboard_private.shown_badge(p.user_id))
        order by r.position) filter(where r.position<=3),'[]') as podium,
      max(r.position) filter(where r.user_id=auth.uid()) as my_position,
      max(r.score) filter(where r.user_id=auth.uid()) as my_score, -- the hall's own-place band
      max(r.difficulty) filter(where r.user_id=auth.uid()) as my_difficulty
    from leaderboard_private.ranked_entries(f.version,f.season_id) r join leaderboard_private.profiles p on p.user_id=r.user_id
  ) summary
  where s.starts_at<=now() and summary.players>0 order by s.id desc,f.introduced desc,f.version
$$;


revoke all on function leaderboard_private.shown_badge(uuid) from public, anon, authenticated;
revoke all on function public.set_profile_badge(text, uuid), public.my_profile_v2() from public, anon;
grant execute on function public.set_profile_badge(text, uuid), public.my_profile_v2() to authenticated;
revoke all on function public.get_leaderboard_all_v2(text,text,integer,integer,smallint),
  public.get_level_podium_v2(text,integer,smallint), public.get_player_card_v2(uuid) from public;
grant execute on function public.get_leaderboard_all_v2(text,text,integer,integer,smallint),
  public.get_level_podium_v2(text,integer,smallint), public.get_player_card_v2(uuid) to anon, authenticated;
commit;
