// The one-time sheets a profile has seen (202611030001): its own list only, marked by its owner, capped, gone with the profile,
// and the statistics notice taken as seen for every profile that already sent statistics.
import assert from 'node:assert/strict';
import { fixture, sql } from '../../supabase/tests/fixture.mjs';
const { db, q, as, player, migrate, uid } = await fixture();
const list = owner => q('select * from public.my_seen_notices($1) n', [owner]).then(r => r.map(x => x.n));
const mark = (id, owner) => q('select public.mark_notice_seen($1,$2)', [id, owner]);
try {
  await migrate();
  const a = await player('Primer'), b = await player('Segon'), bare = await player(null);
  await as(a); assert.deepEqual(await list(a), [], 'nothing seen yet');
  await mark('stats', a); await mark('season:1', a); await mark('stats', a);
  assert.deepEqual(await list(a), ['season:1', 'stats'], 'twice is once');
  await as(b); assert.deepEqual(await list(b), [], 'another profile sees only its own');
  await assert.rejects(list(a), /leaderboard_owner_mismatch/, 'never read for another account (a newer session in another tab)');
  await assert.rejects(mark('stats', a), /leaderboard_owner_mismatch/, 'never marked for another account');
  await as(a); await assert.rejects(mark('Not Valid!', a), /check constraint/);
  await as(bare); await mark('stats', bare); assert.deepEqual(await list(bare), [], 'no profile: nothing to remember');
  await as(null, 'anon'); await assert.rejects(list(a), /permission denied/); await assert.rejects(mark('stats', a), /permission denied/);
  await as(a); await assert.rejects(q('select * from leaderboard_private.seen_notices'), /permission denied/);
  for (let i = 0; i < 498; i++) await mark(`n-${i}`, a); // with the two above: 500
  await assert.rejects(mark('one-more', a), /leaderboard_notice_limit/); await mark('stats', a); // one already there still reads as saved
  // a profile that sent statistics before this release accepted the notice: the migration marks it
  await db.exec('reset role');
  await q("insert into leaderboard_private.player_devices(user_id,device_id) values($1,$2)", [b, uid()]);
  await db.exec(sql('202611030001_seen_notices.sql'));
  await as(b); assert.deepEqual(await list(b), ['stats']);
  await db.exec('reset role'); await q('delete from leaderboard_private.profiles where user_id=$1', [a]);
  assert.equal((await q('select count(*)::int n from leaderboard_private.seen_notices where user_id=$1', [a]))[0].n, 0, 'gone with the profile');
  console.log('seen notices ok');
} finally { await db.close(); }
