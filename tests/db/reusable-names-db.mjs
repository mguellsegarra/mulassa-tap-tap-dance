// 202610280002 from both starting points: beta (tags applied, guests sharing a name) and production (no tags yet,
// 202610200001 and this one in the same deploy). Synthetic PGlite; concurrent claims run in supabase/tests/rehearsal.mjs.
import assert from 'node:assert/strict';
import { fixture, migrations, sql } from '../../supabase/tests/fixture.mjs';
const before = migrations.filter(f => f >= '202610200001' && f < '202610280002');
const names = async q => (await q('select alias,released_at is not null released,public_id from leaderboard_private.profiles order by alias,released_at nulls first')).map(({ public_id, ...p }) => (assert(public_id), p));

// Production: 202610200001 keeps the global unique name, so an old client cannot create a duplicate mid-deploy.
let f = await fixture();
try {
  const a = await f.player('Mateix'), b = await f.player(null);
  await f.q(`insert into leaderboard_private.entries(user_id,version,difficulty,perfect,good,miss,score,max_combo)
    values($1,'mulassa-v2-short',0,108,0,0,1000,108)`, [a]);
  await f.db.exec(sql(before[0]));
  await f.as(b); await assert.rejects(f.q("select public.update_alias('Mateix')"), /leaderboard_alias_taken/);
  await f.db.exec('reset role'); for (const m of before.slice(1)) await f.db.exec(sql(m));
  const entries = await f.q('select * from leaderboard_private.entries order by id');
  await f.db.exec(sql('202610280002_reusable_guest_names.sql')); await f.db.exec(sql('202610280002_reusable_guest_names.sql'));
  assert.deepEqual(await f.q('select * from leaderboard_private.entries order by id'), entries, 'results untouched');
  assert.deepEqual(await names(f.q), [{ alias: 'Mateix', released: false }]);
} finally { await f.db.close(); }

// Beta: guests already share names (its 202610200001 dropped the global index). One holder per name stays.
f = await fixture();
try {
  for (const m of before) await f.db.exec(sql(m));
  await f.db.exec('drop index if exists leaderboard_private.profiles_alias_key');
  const old = await f.player(null), recent = await f.player(null), confirmed = await f.player(null, { verified: true }), solo = await f.player(null);
  const put = (id, alias, tag, active) => f.q('insert into leaderboard_private.profiles(user_id,alias,tag,last_active_at) values($1,$2,$3,$4)', [id, alias, tag, active]);
  await f.q("update auth.users set created_at='2026-01-01'");
  await put(old, 'Doble', 1, '2026-09-01'); await put(recent, 'doble', 2, '2026-10-19');
  await put(confirmed, 'Triple', null, '2026-01-01'); await put(solo, 'Triple', 7, '2026-10-19');
  await f.db.exec(sql('202610280002_reusable_guest_names.sql')); await f.db.exec(sql('202610280002_reusable_guest_names.sql'));
  const held = async id => (await f.q('select released_at is null held from leaderboard_private.profiles where user_id=$1', [id]))[0].held;
  assert.deepEqual([await held(old), await held(recent)], [false, true], 'the most recently active guest keeps it');
  assert.deepEqual([await held(confirmed), await held(solo)], [true, false], 'a confirmed address comes first');
  await f.as(old); assert.deepEqual((await f.q('select alias,released from public.my_profile()'))[0], { alias: 'Doble', released: true });
  console.log('reusable names: production keeps one name per player through the deploy, beta duplicates resolve to one holder OK');
} finally { await f.db.close(); }
