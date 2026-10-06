-- The board in pages: get_leaderboard_all(p_version, p_period, p_offset, p_limit) returns the players ranked
-- p_offset+1 .. p_offset+p_limit (at most 50 per call, so a crowded board never loads at once; the client asks for the
-- next page on "Carrega'n mes" / scrolling), plus, on the first page, the caller's row with 5 neighbours each side
-- ("On soc") and always `total`. Calls without the new arguments get the first 50. ASCII only (SQL Editor).
begin;

drop function if exists public.get_leaderboard_all(text, text);
create function public.get_leaderboard_all(p_version text, p_period text default 'all', p_offset integer default 0,
  p_limit integer default 50)
returns table("position" bigint, alias text, difficulty integer, quality numeric, score integer, is_self boolean, total bigint)
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
    with best as ( -- each player's best result by points, over every active level
      select distinct on (e.user_id) e.user_id, e.difficulty, e.quality_units, e.score, e.achieved_at, e.id
      from leaderboard_private.entries e
      join leaderboard_private.versions v on v.version = e.version and v.difficulty = e.difficulty and v.active
      where e.version = p_version
      order by e.user_id, e.score desc, e.quality_units desc, e.achieved_at, e.id
    ), ranked as (
      select b.*, row_number() over (order by b.score desc, b.quality_units desc, b.achieved_at, b.id) as pos,
        count(*) over () as n
      from best b
    ), me as (select r.pos from ranked r where r.user_id = v_uid)
    select r.pos, p.alias, r.difficulty::integer, 20::numeric * r.quality_units / v.judgments, r.score,
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
