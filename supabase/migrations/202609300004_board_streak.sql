-- The board also returns each player's longest streak (max_combo) from the best result shown. Same as 202609280014's
-- get_leaderboard_all plus that column, so the return type changes: drop, create, re-grant. ASCII only (SQL Editor).
begin;

drop function if exists public.get_leaderboard_all(text, text, integer, integer);
create function public.get_leaderboard_all(p_version text, p_period text default 'all', p_offset integer default 0,
  p_limit integer default 50)
returns table("position" bigint, alias text, difficulty integer, quality numeric, score integer, max_combo integer, is_self boolean, total bigint)
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
      select distinct on (e.user_id) e.user_id, e.difficulty, e.quality_units, e.score, e.max_combo, e.achieved_at, e.id
      from leaderboard_private.visible_entries(p_version) e
      join leaderboard_private.versions v on v.version = e.version and v.difficulty = e.difficulty and v.active
      order by e.user_id, e.score desc, e.quality_units desc, e.achieved_at, e.id
    ), ranked as (
      select b.*, row_number() over (order by b.score desc, b.quality_units desc, b.achieved_at, b.id) as pos,
        count(*) over () as n
      from best b
    ), me as (select r.pos from ranked r where r.user_id = v_uid)
    select r.pos, p.alias, r.difficulty::integer, 20::numeric * r.quality_units / v.judgments, r.score, r.max_combo,
      coalesce(r.user_id = v_uid, false), r.n
    from ranked r
    join leaderboard_private.profiles p on p.user_id = r.user_id
    join leaderboard_private.versions v on v.version = p_version and v.difficulty = r.difficulty
    where r.pos between v_from + 1 and v_from + v_count
      or (v_from = 0 and exists (select 1 from me where r.pos between me.pos - 5 and me.pos + 5))
    order by r.pos;
end;
$$;
revoke all on function public.get_leaderboard_all(text, text, integer, integer) from public;
grant execute on function public.get_leaderboard_all(text, text, integer, integer) to anon, authenticated;

commit;
