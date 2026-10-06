-- Seed: 24 sample results (10/10/4 per level) for the empty public boards, 2026-09-28. Also a test fixture.
-- Run by the Supabase backend owner in the Supabase SQL editor (role postgres). It writes auth.users and the
-- private tables directly because the public RPCs only ever write the caller's own anonymous account (auth.uid(),
-- Turnstile, 10 s throttle): there is no client path for seeding, and none should be added.
-- Works on the live schema (migrations 202609270001-2) with or without migration 202609280009 (alias hardening).
--
-- Marker: profiles.is_seed = true (set below once migration 202609280014 exists), plus 17 players with fixed ids 5eed2026-0000-4000-8000-0000000000NN AND
-- auth.users.raw_app_meta_data->>'mulassa_seed' = '2026' (app metadata is admin-only, never shown). Remove them all
-- with seed-leaderboard-2026-cleanup.sql; deleting the auth user cascades to profiles and entries.
-- The seeded accounts are anonymous, so the 12-month retention job would also expire them eventually.
--
-- Values come from a simulation of the real scoring (src/main.js judge/pump/settleHold, finale x2 at >=70%) on the
-- real charts: judgments 150/181/318 (FÀCIL/NORMAL/DIFÍCIL); a flawless run with fast balloon tapping scores about
-- 96-104k / 113-119k / 178-197k. Seeds are deliberately modest (about 30-68%, no finale bonus) so real players climb past them easily. Times are relative to now()
-- (the last ~6.5 days). Every alias passes checkAlias (src/alias-rules.js) and the proposed server rules;
-- tests/alias-rules.mjs runs this file and the cleanup on PGlite.
begin;

do $$
begin
  if exists (select 1 from auth.users where id::text like '5eed2026-%') then
    raise exception 'seed already present: run seed-leaderboard-2026-cleanup.sql first';
  end if;
  if (select count(*) from leaderboard_private.versions where version = 'mulassa-v1' and active) <> 3 then
    raise exception 'mulassa-v1 is not the active leaderboard version: regenerate the seed';
  end if;
end $$;

-- Anonymous accounts, like the ones signInAnonymously creates (empty token strings keep the Auth admin API happy).
insert into auth.users (instance_id, id, aud, role, is_anonymous, created_at, updated_at, last_sign_in_at,
  raw_app_meta_data, raw_user_meta_data, confirmation_token, recovery_token, email_change_token_new, email_change)
select '00000000-0000-0000-0000-000000000000', v.id::uuid, 'authenticated', 'authenticated', true,
  now() - v.created_ago, now() - v.active_ago, now() - v.created_ago,
  '{"provider": "anonymous", "providers": ["anonymous"], "mulassa_seed": "2026"}'::jsonb, '{}'::jsonb, '', '', '', ''
from (values
  ('5eed2026-0000-4000-8000-000000000001', interval '6459 minutes', interval '3499 minutes'),
  ('5eed2026-0000-4000-8000-000000000002', interval '9267 minutes', interval '5181 minutes'),
  ('5eed2026-0000-4000-8000-000000000003', interval '8423 minutes', interval '5324 minutes'),
  ('5eed2026-0000-4000-8000-000000000004', interval '9341 minutes', interval '7617 minutes'),
  ('5eed2026-0000-4000-8000-000000000005', interval '9308 minutes', interval '6235 minutes'),
  ('5eed2026-0000-4000-8000-000000000006', interval '2378 minutes', interval '1997 minutes'),
  ('5eed2026-0000-4000-8000-000000000007', interval '7011 minutes', interval '2404 minutes'),
  ('5eed2026-0000-4000-8000-000000000008', interval '7497 minutes', interval '3658 minutes'),
  ('5eed2026-0000-4000-8000-000000000009', interval '5731 minutes', interval '1603 minutes'),
  ('5eed2026-0000-4000-8000-000000000010', interval '2656 minutes', interval '1769 minutes'),
  ('5eed2026-0000-4000-8000-000000000011', interval '2356 minutes', interval '873 minutes'),
  ('5eed2026-0000-4000-8000-000000000012', interval '8375 minutes', interval '2718 minutes'),
  ('5eed2026-0000-4000-8000-000000000013', interval '7506 minutes', interval '7047 minutes'),
  ('5eed2026-0000-4000-8000-000000000014', interval '4601 minutes', interval '3895 minutes'),
  ('5eed2026-0000-4000-8000-000000000016', interval '7849 minutes', interval '6014 minutes'),
  ('5eed2026-0000-4000-8000-000000000018', interval '4210 minutes', interval '1320 minutes'),
  ('5eed2026-0000-4000-8000-000000000019', interval '3155 minutes', interval '640 minutes')
) as v(id, created_ago, active_ago);

insert into leaderboard_private.profiles (user_id, alias, created_at, last_active_at, last_write_at)
select u.id, v.alias, u.created_at, u.updated_at, u.updated_at
from (values
  ('5eed2026-0000-4000-8000-000000000001', 'marcgs'),
  ('5eed2026-0000-4000-8000-000000000002', 'MartaaVLS'),
  ('5eed2026-0000-4000-8000-000000000003', 'jordi2003'),
  ('5eed2026-0000-4000-8000-000000000004', 'laiaxx'),
  ('5eed2026-0000-4000-8000-000000000005', 'paquet07'),
  ('5eed2026-0000-4000-8000-000000000006', 'nuriaPB'),
  ('5eed2026-0000-4000-8000-000000000007', 'arnau99'),
  ('5eed2026-0000-4000-8000-000000000008', 'mireia-vls'),
  ('5eed2026-0000-4000-8000-000000000009', 'OriolCastells'),
  ('5eed2026-0000-4000-8000-000000000010', 'ainaa04'),
  ('5eed2026-0000-4000-8000-000000000011', 'xavi43800'),
  ('5eed2026-0000-4000-8000-000000000012', 'claraaa'),
  ('5eed2026-0000-4000-8000-000000000013', 'POL2011'),
  ('5eed2026-0000-4000-8000-000000000014', 'bertitaa'),
  ('5eed2026-0000-4000-8000-000000000016', 'emiliu'),
  ('5eed2026-0000-4000-8000-000000000018', 'medinet'),
  ('5eed2026-0000-4000-8000-000000000019', 'dolors66')
) as v(id, alias)
join auth.users u on u.id = v.id::uuid;

-- Mark them as seeds (profiles.is_seed, supabase/migrations/202609280014_seed_phaseout.sql): each real player on a level
-- then hides one seed result there. On a schema without 0014 there is no column yet; 0014's backfill marks them later.
do $$
begin
  if exists (select 1 from information_schema.columns
      where table_schema = 'leaderboard_private' and table_name = 'profiles' and column_name = 'is_seed') then
    execute 'update leaderboard_private.profiles set is_seed = true where user_id::text like ''5eed2026-0000-4000-8000-%''';
  end if;
end $$;

-- (player, difficulty 0 FÀCIL / 1 NORMAL / 2 DIFÍCIL, perfect, good, miss, score, max_combo, achieved)
-- Every run is survivable with src/energy.js (the ÀNIM never empties: a margin of 3+ bars), so no seeded result is
-- one where the mulassa would have collapsed (a collapse can't be published).
insert into leaderboard_private.entries (user_id, version, difficulty, perfect, good, miss, score, max_combo, achieved_at)
select v.id::uuid, 'mulassa-v1', v.difficulty, v.perfect, v.good, v.miss, v.score, v.max_combo, now() - v.ago
from (values
  ('5eed2026-0000-4000-8000-000000000001', 1,  78,  40,  63,  19592,  17, interval '5565 minutes'), -- NORMAL 60.8%
  ('5eed2026-0000-4000-8000-000000000001', 2, 112, 108,  98,  28026,  12, interval '3499 minutes'), -- DIFÍCIL 62.4%
  ('5eed2026-0000-4000-8000-000000000002', 0,  67,  42,  41,  21162,  42, interval '6719 minutes'), -- FÀCIL 67.1%
  ('5eed2026-0000-4000-8000-000000000002', 1,  62,  56,  63,  18450,   9, interval '5181 minutes'), -- NORMAL 59.0%
  ('5eed2026-0000-4000-8000-000000000003', 1,  42,  76,  63,  17096,   8, interval '5324 minutes'), -- NORMAL 56.8%
  ('5eed2026-0000-4000-8000-000000000003', 2,  83, 142,  93,  27520,   8, interval '7601 minutes'), -- DIFÍCIL 61.8%
  ('5eed2026-0000-4000-8000-000000000004', 0,  64,  38,  48,  18596,  12, interval '8421 minutes'), -- FÀCIL 62.9%
  ('5eed2026-0000-4000-8000-000000000004', 1,  57,  58,  66,  17296,   8, interval '7617 minutes'), -- NORMAL 57.1%
  ('5eed2026-0000-4000-8000-000000000005', 1,  39,  80,  62,  17162,  11, interval '8926 minutes'), -- NORMAL 56.9%
  ('5eed2026-0000-4000-8000-000000000006', 0,  59,  33,  58,  15216,  14, interval '1997 minutes'), -- FÀCIL 56.9%
  ('5eed2026-0000-4000-8000-000000000007', 1,  82,  45,  54,  22530,  14, interval '4407 minutes'), -- NORMAL 65.2%
  ('5eed2026-0000-4000-8000-000000000007', 2, 123,  95, 100,  28196,  12, interval '2404 minutes'), -- DIFÍCIL 62.6%
  ('5eed2026-0000-4000-8000-000000000008', 1,  58,  57,  66,  17364,  10, interval '7144 minutes'), -- NORMAL 57.2%
  ('5eed2026-0000-4000-8000-000000000008', 2,  70, 157,  91,  27240,   8, interval '3658 minutes'), -- DIFÍCIL 61.5%
  ('5eed2026-0000-4000-8000-000000000009', 1,  41,  77,  63,  17030,   8, interval '5126 minutes'), -- NORMAL 56.7%
  ('5eed2026-0000-4000-8000-000000000010', 0,  56,  42,  52,  16752,   8, interval '1769 minutes'), -- FÀCIL 59.7%
  ('5eed2026-0000-4000-8000-000000000011', 0,  31,  52,  67,  11010,   8, interval '1632 minutes'), -- FÀCIL 48.4%
  ('5eed2026-0000-4000-8000-000000000011', 1,  32,  88,  61,  16964,   8, interval '873 minutes'), -- NORMAL 56.6%
  ('5eed2026-0000-4000-8000-000000000012', 0,  49,  38,  63,  13152,   6, interval '5604 minutes'), -- FÀCIL 52.9%
  ('5eed2026-0000-4000-8000-000000000013', 0,  27,  56,  67,  10768,   8, interval '7047 minutes'), -- FÀCIL 47.9%
  ('5eed2026-0000-4000-8000-000000000014', 0,  15,  70,  65,  10530,   8, interval '3895 minutes'), -- FÀCIL 47.3%
  ('5eed2026-0000-4000-8000-000000000016', 0,  68,  42,  40,  21542,  28, interval '6014 minutes'), -- FÀCIL 67.7%
  ('5eed2026-0000-4000-8000-000000000018', 1,  69,  45,  67,  17836,  11, interval '1320 minutes'), -- NORMAL 58.0%
  ('5eed2026-0000-4000-8000-000000000019', 0,  60,  40,  50,  17680,   9, interval '640 minutes') -- FÀCIL 61.3%
) as v(id, difficulty, perfect, good, miss, score, max_combo, ago);

-- The same checks submit_result applies; any failure rolls the whole seed back.
do $$
begin
  if exists (select 1 from leaderboard_private.entries e
      join leaderboard_private.versions v on v.version = e.version and v.difficulty = e.difficulty
      where e.user_id::text like '5eed2026-%'
        and (e.perfect + e.good + e.miss <> v.judgments or e.max_combo > e.perfect + e.good
          or e.score > v.max_score or e.perfect = v.judgments)) then
    raise exception 'seed row outside the game rules';
  end if;
  if (select array_agg(n order by difficulty) from (select difficulty, count(*) n from leaderboard_private.entries
      where user_id::text like '5eed2026-%' group by difficulty) s) <> array[10, 10, 4]::bigint[] then
    raise exception 'expected 10/10/4 seeded results per level';
  end if;
end $$;

commit;

-- Check (optional): the public board as players see it (every level, first page).
-- select * from public.get_leaderboard_all('mulassa-v1');
