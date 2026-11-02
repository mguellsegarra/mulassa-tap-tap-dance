// The badge instead of the check: a confirmed account's own choice from the closed list, shown only while it stays confirmed
// and unreleased, on every read that draws a name. The old reads keep their shape for cached clients.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fixture, sql } from '../../supabase/tests/fixture.mjs';
const { db, q, as, player, migrate, uid } = await fixture();
const set = (id, owner) => q('select public.set_profile_badge($1,$2) as b', [id, owner]).then(r => r[0].b);
const publicId = async who => { await db.exec('reset role'); return (await q('select public_id from leaderboard_private.profiles where user_id=$1', [who]))[0].public_id; };
try {
  await migrate();
  // every town of the game can be chosen, and the list has nothing else
  const towns = JSON.parse(readFileSync(new URL('../../src/game/figure-catalog.json', import.meta.url))).towns.map(t => `town:${t.id}`);
  const allowed = sql('202611010001_player_badges.sql').match(/check \(badge_id in \(([^)]*)\)/)[1].match(/'[^']+'/g).map(s => s.slice(1, -1));
  assert.deepEqual([...allowed].sort(), ['uaf', 'pessigolla', 'colla-vella', 'colla-joves', 'campanar-valls', 'senyera', 'estelada-groga', 'estelada-blava', 'occitana', 'andorra', 'balears', 'mallorca', 'menorca', 'eivissa', 'formentera', 'alguer', ...towns].sort(), 'the server list is the catalogue');

  const me = await player('Amb', { verified: true }), other = await player('Altre', { verified: true }), guest = await player('Convidat');
  const mine = await publicId(me), theirs = await publicId(other), guestId = await publicId(guest);
  const entry = u => q(`insert into leaderboard_private.entries(user_id,season_id,version,difficulty,perfect,good,miss,score,max_combo)
    values($1,leaderboard_private.season_for('mulassa-v3'),'mulassa-v3',0,108,0,0,1000,108)`, [u]);
  await db.exec('reset role'); await entry(me); await entry(guest);

  await as(me);
  assert.equal((await q('select * from public.my_profile_v2()'))[0].badge_id, null, 'nothing chosen: the check');
  assert.equal(await set('town:valls', mine), 'town:valls');
  assert.equal((await q('select * from public.my_profile_v2()'))[0].badge_id, 'town:valls');
  await assert.rejects(set('town:atlantida', mine), /leaderboard_invalid_badge/, 'only the closed list');
  await assert.rejects(set('<svg onload=x>', mine), /leaderboard_invalid_badge/, 'an id, never art');
  await assert.rejects(set('uaf', theirs), /leaderboard_owner_mismatch/, 'never another profile');
  await assert.rejects(set('uaf', null), /leaderboard_owner_mismatch/);
  assert.equal((await q('select * from public.my_profile_v2()'))[0].badge_id, 'town:valls', 'a refused write changes nothing');
  await as(guest); await assert.rejects(set('uaf', guestId), /leaderboard_not_confirmed/, 'a guest has no badge');
  await as(uid()); await assert.rejects(set('uaf', mine), /leaderboard_auth_required|leaderboard_not_confirmed/);
  await as(null, 'anon'); await assert.rejects(set('uaf', mine), /permission denied/);
  await assert.rejects(q('update leaderboard_private.profiles set badge_id=$1', ['uaf']), /permission denied/);

  // the reads: everyone sees it, including anon
  const shown = async () => ({
    board: (await q(`select alias,badge_id from public.get_leaderboard_all_v2('mulassa-v3') order by alias`)).map(r => [r.alias, r.badge_id]),
    podium: (await q(`select alias,badge_id from public.get_level_podium_v2('mulassa-v3',0) order by alias`)).map(r => [r.alias, r.badge_id]),
    card: (await q('select badge_id from public.get_player_card_v2($1)', [mine]))[0].badge_id,
    hall: (await q(`select podium from public.get_seasons('mulassa-valls')`)).flatMap(r => r.podium).filter(p => p.alias === 'Amb').map(p => p.badge_id),
  });
  const seen = { board: [['Amb', 'town:valls'], ['Convidat', null]], podium: [['Amb', 'town:valls'], ['Convidat', null]], card: 'town:valls', hall: ['town:valls'] };
  assert.deepEqual(await shown(), seen);

  // the old reads keep exactly their columns
  const plain = (await q(`select * from public.get_leaderboard_all('mulassa-v3') limit 1`))[0];
  assert.ok(!('badge_id' in plain), 'a cached client reads the same shape');
  assert.ok(!('badge_id' in (await q('select * from public.get_player_card($1)', [mine]))[0]));

  // a lost confirmation hides it from the next read; confirming again brings it back
  await db.exec('reset role'); await q('update auth.users set email_confirmed_at=null where id=$1', [me]);
  await as(null, 'anon');
  assert.equal((await q('select badge_id from public.get_player_card_v2($1)', [mine]))[0].badge_id, null);
  await as(me); await assert.rejects(set('uaf', mine), /leaderboard_auth_required/, 'not a player any more');
  await db.exec('reset role'); await q('update auth.users set email_confirmed_at=now() where id=$1', [me]);
  await as(null, 'anon');
  assert.equal((await q('select badge_id from public.get_player_card_v2($1)', [mine]))[0].badge_id, 'town:valls');

  // released: hidden, whoever holds the name now starts from nothing
  await db.exec('reset role'); await q('update leaderboard_private.profiles set released_at=now() where user_id=$1', [me]);
  await as(null, 'anon');
  assert.equal((await q('select badge_id from public.get_player_card_v2($1)', [mine]))[0].badge_id, null);
  await db.exec('reset role'); await q('update leaderboard_private.profiles set released_at=null where user_id=$1', [me]);

  await as(me); assert.equal(await set(null, mine), null, 'null puts the check back');
  assert.equal((await q('select * from public.my_profile_v2()'))[0].badge_id, null);
  console.log('player badges ok');
} finally { await db.close(); }
