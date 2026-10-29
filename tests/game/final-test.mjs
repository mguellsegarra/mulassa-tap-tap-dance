// ?final (src/dev/final-test.js): only on dev hosts, a consistent made-up run, and a mock leaderboard that never goes online.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { makeDanceChart } from '../../src/game/chart.js';
import { EXPECTED_JUDGMENTS, snapshotResult, validResult } from '../../src/services/leaderboard-rules.js';
import { ENERGY } from '../../src/game/energy.js';
import { quality } from '../../src/game/progress.js';
import { leaderboardPreviewMode, finalMode, demoOptions, fabricateRun, judgments, walk, mockLeaderboard, memoryKeys, REVIEWS, ACCOUNTS, OTHER_MAIL, MOCK_CODE, DEMO_SELF } from '../../src/dev/final-test.js';

import { comparableScore } from '../../src/game/score-scale.js';
const song = JSON.parse(readFileSync(new URL('../../src/song-mulassa.json', import.meta.url)));
const charts = [0, 1, 2].map(d => makeDanceChart(song, d));

// Local previews use synthetic ranking rows when the real service is absent, without entering results.
assert(leaderboardPreviewMode({ hostname: 'localhost', configured: false }));
assert(leaderboardPreviewMode({ hostname: '192.168.1.10', search: '?mock' }));
assert(leaderboardPreviewMode({ hostname: 'localhost', search: '?demo', configured: true }), '?demo brings the mock board');
assert(!leaderboardPreviewMode({ hostname: 'localhost', configured: true }));
for (const hostname of ['mulassa.cat', 'abc.pages.dev', '8.8.8.8'])
  assert(!leaderboardPreviewMode({ hostname, search: '?mock', configured: false }), 'production never substitutes fake standings');

// inert on production, on LAN / localhost only
for (const h of ['mulassa.cat', 'www.mulassa.cat', 'mulassa-tap-tap-dance.pages.dev', 'abc123.mulassa-tap-tap-dance.pages.dev', '8.8.8.8', '172.32.0.1', ''])
  assert.equal(finalMode({ hostname: h, search: '?final' }), null, h);
for (const h of ['localhost', '127.0.0.1', '192.168.1.100', '10.0.0.7', '172.20.1.2', 'mac.local', 'mulassa.test'])
  assert.deepEqual(finalMode({ hostname: h, search: '?final&mute' }), { pct: 95, diff: 0, outcome: 'record', taken: false }, h);
assert.equal(finalMode({ hostname: 'localhost', search: '?mute' }), null, 'only when asked');
assert.equal(finalMode({ hostname: 'localhost', search: '?final&board=me' }).board, 'me');
assert.equal(finalMode({ hostname: 'mulassa.cat', search: '?final&board=me' }), null);
assert.deepEqual(finalMode({ hostname: 'localhost', search: '?final=62-2-clear&taken' }), { pct: 62, diff: 2, outcome: 'clear', taken: true });
assert.deepEqual(finalMode({ hostname: 'localhost', search: '?final=30-1-collapse&repte=95-2' }), { pct: 30, diff: 1, outcome: 'collapse', taken: false });
assert.deepEqual(finalMode({ hostname: 'localhost', search: '?final=x-9-nope' }), { pct: 95, diff: 0, outcome: 'record', taken: false });

// every judgment of the chart, as the leaderboard counts them
for (let d = 0; d < 3; d++) assert.equal(judgments(charts[d]).length, EXPECTED_JUDGMENTS[d]);

// consistent runs: counts sum to the level's judgments, the % asked for, a valid snapshot, the ànim survives
const snap = (r, d) => snapshotResult({ diff: d, counts: r.counts, score: r.score, maxCombo: r.maxCombo }, { reason: 'end', query: new URLSearchParams('final') });
for (const [pct, d] of [[95, 0], [100, 2], [62, 2], [80, 1], [71, 0], [45, 0]]) {
  const r = fabricateRun(charts[d], { pct, diff: d, outcome: 'clear' }, song.finale);
  const c = r.counts;
  assert.equal(c.perfect + c.good + c.miss, EXPECTED_JUDGMENTS[d], `${pct}-${d} sums`);
  assert.equal(Math.round(quality(c)), pct, `${pct}-${d} %`);
  assert(!r.collapsed && r.energy > 0, `${pct}-${d} survives`);
  assert(r.maxCombo <= c.perfect + c.good && r.score > 0);
  assert(validResult(snap(r, d)), `${pct}-${d} publishable`);
}
assert.equal(fabricateRun(charts[2], { pct: 100, diff: 2 }, song.finale).maxCombo, EXPECTED_JUDGMENTS[2]);
{ // too low to survive on DIFÍCIL: the next % up that does, never a hidden collapse
  const r = fabricateRun(charts[2], { pct: 10, diff: 2, outcome: 'clear' }, song.finale);
  assert(!r.collapsed && Math.round(quality(r.counts)) > 10);
}
{ // a collapse: fewer judgments than the chart, the ànim at 0 on the last one, the misses in a row that empty it
  for (let d = 0; d < 3; d++) {
    const r = fabricateRun(charts[d], { pct: 30, diff: d, outcome: 'collapse' }, song.finale);
    assert(r.collapsed && r.energy === 0, `collapse ${d}`);
    assert(r.counts.miss >= Math.round(1 / ENERGY[d].miss) && r.counts.perfect + r.counts.good + r.counts.miss < EXPECTED_JUDGMENTS[d]);
    assert(Math.abs(quality(r.counts) - 30) < 8);
  }
}
{ // the real scoring: 3 perfects in a row, the combo bonus; a GUAPA doubles; the finale doubles once the % is >= 70
  const ev = [{ t: 0 }, { t: 1 }, { t: 2, big: true }];
  assert.equal(walk(ev, ['perfect', 'perfect', 'perfect'], 0, Infinity).score, 302 + 304 + 2 * 306);
  assert.equal(walk(ev, ['perfect', 'miss', 'good'], 0, 2).score, 302 + 2 * 102); // 50% before the last: no finale, the combo starts again
  assert.equal(walk(ev, ['perfect', 'perfect', 'good'], 0, 2).score, 302 + 304 + 2 * 2 * 106);
}

// the mock: the real service's rules and messages, no network at all
globalThis.fetch = () => { throw new Error('the mock must never fetch'); };
const boardPreview = mockLeaderboard({ board: 'me', delay: 0 });
const previewSelf = (await boardPreview.listAll()).find(r => r.is_self);
assert.equal(previewSelf.alias, 'ProvaRetall');
assert.equal(previewSelf.position, 48);
assert.equal(previewSelf.total, 119);
const svc = mockLeaderboard({ charts, finaleT: song.finale, delay: 0 });
assert(svc.configured && svc.publishingEnabled && !svc.captchaRequired);
const run = snap(fabricateRun(charts[0], { pct: 95, diff: 0 }, song.finale), 0);
const first = await svc.listAll();
assert(first.length === 45 && first[0].position === 1 && first[0].total === 45 && !first.some(r => r.is_self), 'the open season: Mulassa, 45 players');
assert.equal((await svc.listAll({ offset: 50 })).length, 0);
assert.deepEqual(await svc.identity(), { hasSession: false, persistent: true, email: '' });
const clean = first.find(r => r.verified);
await assert.rejects(svc.publish(run, 'x'), { code: 'invalid' });
await assert.rejects(svc.publish({ ...run, counts: { ...run.counts, miss: run.counts.miss + 1 } }, 'ProvaMulassa'), { code: 'invalid' });
assert.equal((await svc.publish(run, 'ProvaMulassa')).improved, true, 'no notice: a first publication simply goes');
assert.equal((await svc.identity()).hasSession, true);
const mine = await svc.profile();
assert(mine.alias === 'ProvaMulassa' && !('tag' in mine) && mine.verified === false && mine.published === true && mine.released === false && mine.publicId, 'a guest has a plain name and a public id');
const after = await svc.listAll(), me = after.find(r => r.is_self);
assert(me && me.alias === 'ProvaMulassa' && me.public_id === mine.publicId && me.released === false && me.verified === false && me.total === 46 && Math.round(me.quality) === 95);
assert.equal(after.filter(r => r.position === me.position).length, 1);
assert.equal((await svc.publish({ ...run, score: run.score - 1 }, 'ProvaMulassa')).improved, false);
assert.equal(me.score, comparableScore(run.score, run.difficulty), 'mock board converts raw points exactly once');
// one active profile per name: nobody takes a verified player's name, a rename frees the old one
await assert.rejects(mockLeaderboard({ delay: 0 }).publish(run, clean.alias), { code: 'taken' });
{ const g = mockLeaderboard({ delay: 0, account: 'guest' });
  await assert.rejects(g.createProfile(clean.alias.toLowerCase()), { code: 'taken' });
  assert.equal(await g.createProfile('Provera'), 'Provera'); assert.deepEqual(await g.profile(), { alias: 'Provera', verified: false, published: true, released: false, publicId: (await g.profile()).publicId }); }
{ // A newly accepted version result need not replace the user's stronger historical board row (it is another season's)
  const mixed = mockLeaderboard({ delay: 0 });
  await mixed.publish({ version: 'mulassa-v1', difficulty: 0, counts: { perfect: 150, good: 0, miss: 0 }, score: 60000, maxCombo: 150 }, 'Versions');
  const accepted = await mixed.publish({ version: run.version, difficulty: 0, counts: { perfect: 108, good: 0, miss: 0 }, score: 10000, maxCombo: 108 }, 'Versions');
  assert(accepted.improved);
  assert.equal(accepted.score, 10000);
  assert.equal((await mixed.listAll()).filter(row => row.is_self).length, 1);
  assert.equal((await mixed.listAll({ version: 'mulassa-v1', season: 0 })).filter(row => row.is_self).length, 1, 'the old dance stays on its own season');
}
assert.deepEqual(await svc.deleteProfile(), { deleted: true });
assert.equal((await svc.identity()).hasSession, false);
{ // ?taken: the first nickname tried is somebody else's, another goes through
  const t = mockLeaderboard({ charts, finaleT: song.finale, taken: true, delay: 0 });
  await assert.rejects(t.publish(run, 'TimbalerNou'), { code: 'taken' });
  await assert.rejects(t.publish(run, 'timbalernou'), { code: 'taken' });
  assert.equal((await t.publish(run, 'TimbalerAltre')).improved, true);
}
{ // &review and the demo parameters: dev hosts only; each state picks the mock account / world it starts from
  assert.deepEqual(finalMode({ hostname: 'localhost', search: '?final&review=profile-guest' }), { pct: 95, diff: 0, outcome: 'record', taken: false, review: 'profile-guest', account: 'guest' });
  assert.equal(finalMode({ hostname: 'localhost', search: '?final&review' }).review, '', 'the list of states');
  assert.equal(finalMode({ hostname: 'localhost', search: '?final&review=nope' }).review, '');
  assert.equal(finalMode({ hostname: 'localhost', search: '?final&review=recover' }).taken, true);
  assert.equal(finalMode({ hostname: 'localhost', search: '?final&review=board&account=released' }).account, 'released', 'the URL overrides the state');
  assert.equal(finalMode({ hostname: 'mulassa.cat', search: '?final&review=published' }), null);
  assert.deepEqual(finalMode({ hostname: 'localhost', search: '?final&review=season-end' }), { pct: 95, diff: 0, outcome: 'record', taken: false, review: 'season-end', account: 'guest', seasons: 'later' });
  assert.deepEqual(demoOptions('?mock&seasons=later&board=empty&drac=empty&account=verified&card=Estrella&x=1'), { account: 'verified', board: 'empty', seasons: 'later', drac: 'empty', card: 'Estrella' });
  assert.deepEqual(demoOptions('?mock&seasons=nope&account=old&board=x'), {}, 'unknown values are ignored: the removed 7-day accounts among them');
  assert(Object.values(REVIEWS).every(r => !r.account || ACCOUNTS.includes(r.account)));
  assert.deepEqual(ACCOUNTS, ['new', 'reserved', 'guest', 'released', 'verified']);
  for (const gone of ['pending', 'expired', 'legacy']) assert(!ACCOUNTS.includes(gone));
  for (const k of Object.keys(REVIEWS)) assert(!/legacy|pending|expired/.test(k), k);
  assert.equal(DEMO_SELF.alias, 'Prova123');
}
{ // the mock accounts: who is signed in, with what name
  const who = async account => { const s = mockLeaderboard({ delay: 0, account }); return [await s.profile(), (await s.listAll()).find(r => r.is_self)]; };
  assert.deepEqual((await who('new')), [null, undefined]);
  const pid = x => x.publicId;
  const [r] = await who('reserved'); assert.deepEqual(r, { alias: 'Prova123', verified: false, published: false, released: false, publicId: pid(r) });
  const [g, gRow] = await who('guest'); assert.deepEqual(g, { alias: 'Prova123', verified: false, published: true, released: false, publicId: pid(g) }); assert.equal(gRow.alias, 'Prova123'); assert.equal(gRow.verified, false);
  const [u, uRow] = await who('released'); assert(u.released && !u.verified && u.alias === 'Prova123' && uRow.released === true && uRow.alias === 'Prova123', 'a released guest keeps its row, flagged');
  const [v, vRow] = await who('verified'); assert(v.verified && !v.released); assert(vRow.verified && vRow.alias === 'Prova123');
  assert(new Set([pid(g), pid(u), pid(v)]).size === 1, 'the demo account keeps one public id');
  assert.equal((await mockLeaderboard({ delay: 0, account: 'verified' }).identity()).email, 'prova@exemple.cat');
}
{ // the e-mail flow: a pending address counts for nothing; confirming earns the check and nothing else
  const fresh = mockLeaderboard({ charts, finaleT: song.finale, delay: 0 });
  await fresh.publish(run, 'ProvaNova');
  assert.deepEqual(await fresh.sendCode('jo@exemple.cat'), { type: 'email_change' });
  await assert.rejects(fresh.verifyCode('jo@exemple.cat', '000000', 'email_change'), { code: 'code' });
  assert.equal((await fresh.profile()).verified, false, 'sent, not confirmed: no check');
  assert.equal((await fresh.identity()).email, '', 'nor an address on the profile');
  const before = await fresh.profile();
  await fresh.verifyCode('jo@exemple.cat', MOCK_CODE, 'email_change');
  const p = await fresh.profile(); assert(p.verified && p.alias === before.alias && p.publicId === before.publicId, 'confirmed: the tick, same name, same profile');
  assert.equal((await fresh.listAll()).find(r => r.is_self).verified, true);
  assert.equal(await fresh.myAlias(), 'ProvaNova');
  const sw = mockLeaderboard({ charts, finaleT: song.finale, delay: 0, account: 'guest' });
  assert.deepEqual(await sw.sendCode(OTHER_MAIL), { type: 'email' }, 'an address with a profile: switch, not merge');
  await sw.verifyCode(OTHER_MAIL, MOCK_CODE, 'email'); assert.equal(await sw.myAlias(), 'Castellera777');
  await assert.rejects(mockLeaderboard({ charts, finaleT: song.finale, delay: 0 }).sendCode('ningu@exemple.cat'), { code: 'noprofile' }, 'recovery needs a confirmed address');
}
{ // the nickname and «Ara no» count live in memory; everything else goes to the device's store
  const base = new Map(), s = memoryKeys({ get: k => base.get(k) ?? null, set: (k, v) => base.set(k, v) }, ['leaderboard-alias']);
  s.set('leaderboard-alias', 'A'); s.set('share-format', 'square');
  assert.equal(s.get('leaderboard-alias'), 'A'); assert(!base.has('leaderboard-alias')); assert.equal(base.get('share-format'), 'square');
  s.remove('leaderboard-alias'); assert.equal(s.get('leaderboard-alias'), null);
}
console.log('final-test: ok');
