-- A guest profile can be protected with an e-mail address (src/profile-ui.js: a 6-digit code sent to it, no password).
-- Supabase then turns the anonymous Auth user into a permanent one (same uid, so the profile and its results stay), and
-- is_anonymous becomes false: the single "must be a player" check below would have refused it, and the player could no
-- longer publish. A player is now an anonymous Auth user OR a user whose e-mail address is confirmed (they proved the
-- inbox is theirs). The delete-player Edge Function has its twin, isPlayer. Nothing else changes: the RPCs already go
-- through require_player(), with their signatures, grants and search_path as before.
-- Retention (leaderboard_expired_players, 0002) still lists only anonymous accounts: a profile with an e-mail is never
-- pruned by that tool. Idempotent (create or replace). ASCII only (SQL Editor).
begin;

create or replace function leaderboard_private.require_player() returns uuid
language plpgsql stable set search_path = '' as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null or not exists(select 1 from auth.users where id = v_uid and (is_anonymous or email_confirmed_at is not null)) then
    raise exception 'leaderboard_auth_required' using errcode = '28000';
  end if;
  return v_uid;
end;
$$;
revoke all on function leaderboard_private.require_player() from public, anon, authenticated;

commit;
