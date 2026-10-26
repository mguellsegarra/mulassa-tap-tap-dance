-- CLEANUP for tests/figures/common/fixtures/seed-leaderboard-2026.sql. Run in the Supabase SQL editor (role postgres).
-- Removes only the seeded players: fixed ids 5eed2026-0000-4000-8000-… AND app metadata mulassa_seed = 2026.
-- Deleting the auth user cascades to leaderboard_private.profiles and .entries. Real players are never touched.
begin;

delete from auth.users
where id::text like '5eed2026-0000-4000-8000-%'
  and raw_app_meta_data->>'mulassa_seed' = '2026';

do $$
begin
  if exists (select 1 from leaderboard_private.profiles where user_id::text like '5eed2026-%')
    or exists (select 1 from leaderboard_private.entries where user_id::text like '5eed2026-%') then
    raise exception 'seeded rows are still present; nothing was committed';
  end if;
end $$;

commit;
