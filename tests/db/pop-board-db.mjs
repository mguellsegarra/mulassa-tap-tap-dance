// Mulassa Pop's board: only the service role records (after pop-score's replay), a seed scores once, the best only rises,
// a guest needs a name of their own, replays are rate limited, the board and your own place are public, and an account takes
// its runs with it.
import assert from 'node:assert/strict';
import { fixture } from '../../supabase/tests/fixture.mjs';
const { db, q, as, player, migrate, uid, at } = await fixture();
const gate = id => q('select public.pop_gate($1)', [id]);
const record = (id, seed, score) => q('select * from public.pop_record($1,$2,$3,$4)', [id, seed, score, 600]).then(r => r[0]);
const board = () => q('select * from public.get_pop_board()');
try {
  await migrate();
  const ana = await player('Ana'), biel = await player('Biel', { verified: true }), seed = await player('Llavor', { seed: true });
  const nameless = await player(null);

  await as(ana); await assert.rejects(gate(ana), /permission denied/, 'a player cannot open the gate');
  await assert.rejects(record(ana, 1, 999), /permission denied/, 'nor record a score');
  await as(null, 'anon'); await assert.rejects(record(ana, 1, 999), /permission denied/);
  await assert.rejects(q('select * from leaderboard_private.pop_best'), /permission denied/);

  await as(null, 'service_role');
  await assert.rejects(gate(uid()), /leaderboard_auth_required/, 'an unknown account');
  await assert.rejects(gate(nameless), /pop_profile_required/, 'a guest without a name');
  await gate(ana);
  assert.deepEqual(await record(ana, 7, 40), { best: 40, improved: true, position: 1 });
  await assert.rejects(record(ana, 7, 90), /pop_seed_used/, 'a seed scores once');
  assert.deepEqual(await record(ana, 8, 30), { best: 40, improved: false, position: 1 }, 'a worse run keeps the best');
  assert.deepEqual(await record(biel, 7, 55), { best: 55, improved: true, position: 1 }, 'the same seed for someone else');
  await record(seed, 1, 500);
  await at('2026-10-20 10:00:30+02'); await as(null, 'service_role');
  assert.equal((await record(ana, 9, 55)).position, 1, 'a tie shares the place; seed profiles are not on the board');

  for (let i = 0; i < 12; i++) await gate(biel);
  await assert.rejects(gate(biel), /pop_rate_limited/, 'the 13th replay in a minute waits');
  await at('2026-10-20 10:02:00+02'); await as(null, 'service_role'); await gate(biel);

  await as(null, 'anon');
  const rows = await board();
  assert.deepEqual(rows.map(r => [r.alias, r.score, Number(r.position), r.is_self]), [['Biel', 55, 1, false], ['Ana', 55, 1, false]], 'the earlier best first');
  assert.deepEqual(Object.keys(rows[0]).sort(), ['alias', 'badge_id', 'is_self', 'position', 'public_id', 'released', 'score', 'total', 'verified']);
  assert.deepEqual(rows.map(r => r.verified), [true, false], 'a confirmed address shows, a guest does not');
  const card = (await q('select * from public.get_pop_player($1)', [rows[1].public_id]))[0];
  assert.deepEqual([card.alias, card.best, Number(card.position), Number(card.runs), card.average, card.verified], ['Ana', 55, 1, 3, 42, false], 'Ana: 40, 30, 55');
  assert.deepEqual(await q('select * from public.get_pop_player($1)', ['00000000-0000-4000-8000-000000000000']), [], 'an unknown id');
  await as(ana);
  assert.equal((await board()).find(r => r.alias === 'Ana').is_self, true);
  assert.deepEqual((await q('select * from public.my_pop()')).map(r => [r.score, Number(r.position)]), [[55, 1]]);
  await as(nameless); assert.deepEqual(await q('select * from public.my_pop()'), []);

  await db.exec('reset role'); await q('delete from auth.users where id=$1', [ana]);
  await as(null, 'anon');
  assert.deepEqual((await board()).map(r => r.alias), ['Biel'], 'deleting the account deletes its runs');
  console.log('pop board ok');
} finally { await db.close(); }
