// The hearts on a figure: only a confirmed account, one per account and figure, totals and your own only, gone with the account.
import assert from 'node:assert/strict';
import { fixture } from '../../supabase/tests/fixture.mjs';
const { db, q, as, player, migrate, uid } = await fixture();
const set = (figure, on) => q('select public.set_figure_heart($1,$2) as n', [figure, on]).then(r => Number(r[0].n));
const rows = () => q('select * from public.get_figure_hearts()');
try {
  await migrate();
  const confirmed = await player('Amb', { verified: true }), other = await player('Altre', { verified: true }), guest = await player('Convidat');
  await as(guest); await assert.rejects(set('bou', true), /figure_heart_confirm_required/, 'a guest session is authenticated, not confirmed');
  await as(uid()); await assert.rejects(set('bou', true), /figure_heart_confirm_required/, 'an unknown account');
  await as(null, 'anon'); await assert.rejects(set('bou', true), /permission denied/, 'anon cannot write');
  await as(confirmed); assert.equal(await set('bou', true), 1); assert.equal(await set('bou', true), 1, 'twice is one heart');
  await as(other); assert.equal(await set('bou', true), 2);
  assert.deepEqual((await rows()).map(r => [r.figure_id, Number(r.hearts), r.mine]), [['bou', 2, true]]);
  assert.equal(await set('bou', false), 1, 'it can be taken back');
  assert.deepEqual((await rows()).map(r => [Number(r.hearts), r.mine]), [[1, false]], 'yours is yours');
  await as(null, 'anon');
  assert.deepEqual((await rows()).map(r => Number(r.hearts)), [1], 'the totals are public');
  assert.deepEqual(Object.keys((await rows())[0]).sort(), ['figure_id', 'hearts', 'mine'], 'never who gave them');
  await assert.rejects(q('select * from leaderboard_private.figure_hearts'), /permission denied/);
  await as(confirmed); await assert.rejects(set('Not A Figure!', true), /check constraint/);
  await db.exec('reset role'); await q('delete from auth.users where id=$1', [confirmed]);
  assert.deepEqual(await rows(), [], 'deleting the account deletes its hearts');
  console.log('figure hearts ok');
} finally { await db.close(); }
