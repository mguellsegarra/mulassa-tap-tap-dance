-- A profile can be created before the first published result: the settings block offers
-- "Crea" next to "Recupera" (src/profile-ui.js). Until now only submit_result created the profiles row and update_alias
-- refused a player without one (leaderboard_auth_profile_missing). update_alias now creates the row when it is missing,
-- the same way submit_result does; everything else as in 202609280015 (require_player, the 10 s write limit,
-- check_alias_free). A profile with no result reserves its nickname and is on no board.
-- my_alias(): the caller's own nickname (null without a profile). Recovering a profile on another device read it from the
-- board (is_self), so a profile with no result came back without its name; the client now asks here.
-- update_alias: same signature, grants, security definer and search_path. Idempotent (create or replace). ASCII only (SQL Editor).
begin;

create or replace function public.update_alias(p_alias text) returns text
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid; v_alias text; v_written timestamptz;
begin
  v_uid := leaderboard_private.require_player();
  v_alias := leaderboard_private.normalized_alias(p_alias);
  perform leaderboard_private.check_alias_free(v_alias, v_uid);
  insert into leaderboard_private.profiles(user_id, alias) values (v_uid, v_alias) on conflict do nothing;
  select last_write_at into v_written from leaderboard_private.profiles where user_id = v_uid for update;
  if v_written > clock_timestamp() - interval '10 seconds' then
    raise exception 'leaderboard_rate_limit' using errcode = 'P0001';
  end if;
  update leaderboard_private.profiles set alias = v_alias, last_write_at = clock_timestamp(), last_active_at = now() where user_id = v_uid;
  return v_alias;
end;
$$;

revoke all on function public.update_alias(text) from public, anon;
grant execute on function public.update_alias(text) to authenticated;

create or replace function public.my_alias() returns text
language sql stable security definer set search_path = '' as $$
  select alias from leaderboard_private.profiles where user_id = auth.uid();
$$;
revoke all on function public.my_alias() from public, anon;
grant execute on function public.my_alias() to authenticated;

commit;
