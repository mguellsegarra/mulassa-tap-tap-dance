-- History remains a live query. Deleting a profile removes it from every public projection.
begin;
do $$ begin
  if not has_table_privilege(current_user,'auth.users','DELETE')
    or not has_table_privilege(current_user,'auth.users','UPDATE') then
    raise exception 'guest retention needs DELETE and UPDATE on auth.users';
  end if;
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
      coalesce(jsonb_agg(jsonb_build_object('position',r.position,'alias',p.alias,'tag',p.tag,
        'score',r.score,'difficulty',r.difficulty,'verified',leaderboard_private.verified(p.user_id))
        order by r.position) filter(where r.position<=3),'[]') as podium,
      max(r.position) filter(where r.user_id=auth.uid()) as my_position,
      max(r.score) filter(where r.user_id=auth.uid()) as my_score, -- the hall's own-place band
      max(r.difficulty) filter(where r.user_id=auth.uid()) as my_difficulty
    from leaderboard_private.ranked_entries(f.version,f.season_id) r join leaderboard_private.profiles p on p.user_id=r.user_id
  ) summary
  where s.starts_at<=now() and summary.players>0 order by s.id desc,f.introduced desc,f.version
$$;

create or replace function public.get_player_card(p_alias text,p_tag smallint default null)
returns table(alias text, tag smallint, verified boolean, totals jsonb, podiums jsonb)
language sql stable security definer set search_path = '' as $$
  select p.alias,p.tag,leaderboard_private.verified(p.user_id),
    coalesce((select jsonb_object_agg(b.key,b.value-'errors')
      from jsonb_each(leaderboard_private.stats_totals(p.user_id)) b where b.key<>'practice'),'{}'),
    coalesce((select jsonb_agg(jsonb_build_object('season_id',x.season_id,'version',x.version,'position',r.position)
      order by x.season_id desc,x.version)
      from (select distinct e.season_id,leaderboard_private.score_family(e.version) as version
        from leaderboard_private.entries e where e.user_id=p.user_id) x
      cross join lateral leaderboard_private.ranked_entries(x.version,x.season_id) r
      where r.user_id=p.user_id and r.position<=3),'[]')
  from leaderboard_private.profiles p
  where leaderboard_private.alias_key(p.alias)=leaderboard_private.alias_key(p_alias)
    and p.tag is not distinct from p_tag
    and exists(select 1 from leaderboard_private.entries e where e.user_id=p.user_id)
$$;
revoke all on function public.get_seasons(text),public.get_player_card(text,smallint) from public;
grant execute on function public.get_seasons(text),public.get_player_card(text,smallint) to anon,authenticated;

-- Keep the existing admin-only enumeration contract; non-confirmed accounts include pending email upgrades.
create or replace function public.leaderboard_expired_players(p_limit integer default 100)
returns table(user_id uuid)
language sql security definer set search_path = '' as $$
  select u.id from auth.users u left join leaderboard_private.profiles p on p.user_id=u.id
  where u.email_confirmed_at is null
    and greatest(u.created_at,u.last_sign_in_at,p.last_active_at)<now()-interval '12 months'
  order by greatest(u.created_at,u.last_sign_in_at,p.last_active_at),u.id
  limit least(greatest(coalesce(p_limit,100),1),1000)
$$;
revoke all on function public.leaderboard_expired_players(integer) from public,anon,authenticated;
grant execute on function public.leaderboard_expired_players(integer) to service_role;

create or replace function leaderboard_private.purge_inactive_guests(p_limit integer default 500) returns integer
language plpgsql volatile security definer set search_path = '' as $$
declare v_uid uuid; v_deleted integer := 0; v_count integer;
begin
  for v_uid in select u.id from auth.users u left join leaderboard_private.profiles p on p.user_id=u.id
    where u.email_confirmed_at is null
      and greatest(u.created_at,u.last_sign_in_at,p.last_active_at)<now()-interval '12 months'
    order by greatest(u.created_at,u.last_sign_in_at,p.last_active_at),u.id
    limit least(greatest(coalesce(p_limit,500),1),5000) loop
    if not leaderboard_private.lock_profile(v_uid,false) then continue; end if;
    -- The same lock order as the writers; Auth confirmation is checked on the locked Auth row.
    perform 1 from auth.users where id=v_uid for update skip locked;
    if not found then continue; end if;
    perform 1 from leaderboard_private.profiles where user_id=v_uid for update;
    delete from auth.users u where u.id=v_uid and u.email_confirmed_at is null
      and greatest(u.created_at,u.last_sign_in_at,
        (select p.last_active_at from leaderboard_private.profiles p where p.user_id=v_uid))<now()-interval '12 months';
    get diagnostics v_count = row_count;
    v_deleted := v_deleted+v_count;
  end loop;
  return v_deleted;
end $$;
revoke all on function leaderboard_private.purge_inactive_guests(integer) from public,anon,authenticated;
commit;
