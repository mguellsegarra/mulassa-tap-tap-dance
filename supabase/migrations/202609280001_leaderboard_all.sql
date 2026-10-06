-- One board for every level, ranked by score (DIFÍCIL pays more points than FÀCIL for the same play), each player's
-- best result only. Additive: get_leaderboard(version, difficulty) stays as it was.
create function public.get_leaderboard_all(p_version text)
returns table("position" bigint, alias text, difficulty integer, quality numeric, score integer, is_self boolean)
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid();
begin
  if not exists (select 1 from leaderboard_private.versions where version = p_version and active) then
    raise exception 'leaderboard_invalid_version' using errcode = '22023';
  end if;
  if v_uid is not null then
    update leaderboard_private.profiles set last_active_at = now()
      where user_id = v_uid and last_active_at < now() - interval '10 minutes';
  end if;
  return query
    with best as (
      select distinct on (e.user_id) e.user_id, e.difficulty, e.quality_units, e.score, e.achieved_at, e.id
      from leaderboard_private.entries e
      join leaderboard_private.versions v on v.version = e.version and v.difficulty = e.difficulty and v.active
      where e.version = p_version
      order by e.user_id, e.score desc, e.quality_units desc, e.achieved_at, e.id
    )
    select row_number() over (order by b.score desc, b.quality_units desc, b.achieved_at, b.id),
      p.alias, b.difficulty::integer, 20::numeric * b.quality_units / v.judgments, b.score, coalesce(b.user_id = v_uid, false)
    from best b
    join leaderboard_private.profiles p on p.user_id = b.user_id
    join leaderboard_private.versions v on v.version = p_version and v.difficulty = b.difficulty
    order by b.score desc, b.quality_units desc, b.achieved_at, b.id limit 50;
end;
$$;

revoke all on function public.get_leaderboard_all(text) from public;
grant execute on function public.get_leaderboard_all(text) to anon, authenticated;
