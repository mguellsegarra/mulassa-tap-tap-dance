-- The selector's step 2 podium: the best three of ONE level on a figure's board, ranked as the joint
-- board ranks (comparable points, then quality, then who got there first); total = players with a result on that level.
-- get_leaderboard_all keeps one row per player (their best level), so it cannot answer this. ASCII only (SQL Editor).
begin;
create or replace function public.get_level_podium(p_version text, p_difficulty integer, p_season smallint default null)
returns table("position" bigint, alias text, score integer, quality numeric, is_self boolean, total bigint,
  verified boolean, tag smallint)
language plpgsql stable security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_season smallint;
begin
  if not exists(select 1 from leaderboard_private.versions
      where version = p_version and difficulty = p_difficulty and active) then
    raise exception 'leaderboard_invalid_version' using errcode = '22023';
  end if;
  v_season := coalesce(p_season, leaderboard_private.season_for(p_version));
  if not exists(select 1 from leaderboard_private.seasons s where s.id = v_season and s.starts_at <= now()) then
    raise exception 'leaderboard_invalid_season' using errcode = '22023';
  end if;
  return query with best as ( -- as ranked_entries (202610200002), on this level only
    select distinct on (e.user_id) e.user_id, 20::numeric * e.quality_units / v.judgments as quality,
      e.quality_units::numeric * case when e.version in ('mulassa-v1','mulassa-v2-short')
        then (array[150,181,318])[e.difficulty + 1] else v.judgments end / v.judgments as tie_units,
      leaderboard_private.comparable_score(e.version,e.difficulty::integer,e.score) as score, e.achieved_at, e.id
    from leaderboard_private.visible_entries(p_version,v_season) e
    join leaderboard_private.versions v on v.version = e.version and v.difficulty = e.difficulty
    where e.difficulty = p_difficulty
    order by e.user_id, score desc, tie_units desc, e.achieved_at, e.id
  ), ranked as (
    select b.*, row_number() over (order by b.score desc,b.tie_units desc,b.achieved_at,b.id) as pos,
      count(*) over () as n from best b
  )
  select r.pos, p.alias || case when p.tag is null then '' else '#' || lpad(p.tag::text,4,'0') end,
    r.score, r.quality, coalesce(r.user_id = v_uid,false), r.n, leaderboard_private.verified(r.user_id), p.tag
  from ranked r join leaderboard_private.profiles p on p.user_id = r.user_id
  where r.pos <= 3
  order by r.pos;
end $$;
revoke all on function public.get_level_podium(text,integer,smallint) from public;
grant execute on function public.get_level_podium(text,integer,smallint) to anon,authenticated;
commit;
