-- The one-time sheets a profile has already seen (the statistics notice, a season's end, the badge news...), so another
-- device or a new sign-in does not show them again. One row per profile and notice id; the ids are the client's
-- (src/services/seen-notices.js) and mean nothing here. Private to the owner, gone with the profile. Additive; ASCII only.
begin;
create table if not exists leaderboard_private.seen_notices (
  user_id uuid not null references leaderboard_private.profiles(user_id) on delete cascade,
  notice_id text not null check (notice_id ~ '^[a-z0-9][a-z0-9:._-]{0,63}$'),
  seen_at timestamptz not null default now(),
  primary key (user_id, notice_id)
);
alter table leaderboard_private.seen_notices enable row level security;
revoke all on leaderboard_private.seen_notices from public, anon, authenticated;

-- A profile with statistics on the server accepted the statistics notice on some device (nothing is sent before it).
insert into leaderboard_private.seen_notices (user_id, notice_id)
  select distinct user_id, 'stats' from leaderboard_private.player_devices on conflict do nothing;

-- p_owner is the user id the client asks for: the SDK may sign with a newer session (another tab switched accounts), and
-- that account's list must never be taken for this one's. No profile yet (a bare session): nothing seen.
create or replace function public.my_seen_notices(p_owner uuid) returns setof text
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null or auth.uid() is distinct from p_owner then
    raise exception 'leaderboard_owner_mismatch' using errcode = '28000';
  end if;
  return query select notice_id from leaderboard_private.seen_notices where user_id = p_owner order by notice_id;
end $$;

-- p_owner is the session's user id the client read: an account switched in another tab must not take this one's mark.
create or replace function public.mark_notice_seen(p_notice text, p_owner uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := leaderboard_private.require_player();
begin
  if v_uid is distinct from p_owner then raise exception 'leaderboard_owner_mismatch' using errcode = '28000'; end if;
  perform 1 from leaderboard_private.profiles where user_id = v_uid for update; -- one mark at a time: the cap holds
  if not found then return; end if; -- no profile yet: nothing to remember it for
  if exists (select 1 from leaderboard_private.seen_notices where user_id = v_uid and notice_id = p_notice) then return; end if;
  if (select count(*) from leaderboard_private.seen_notices where user_id = v_uid) >= 500 then
    raise exception 'leaderboard_notice_limit' using errcode = '54000';
  end if;
  insert into leaderboard_private.seen_notices (user_id, notice_id) values (v_uid, p_notice) on conflict do nothing;
end $$;

revoke all on function public.my_seen_notices(uuid), public.mark_notice_seen(text, uuid) from public, anon;
grant execute on function public.my_seen_notices(uuid), public.mark_notice_seen(text, uuid) to authenticated;
commit;
