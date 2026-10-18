// ?final (src/dev/final-test.js): only on dev hosts, a consistent made-up run, and a mock leaderboard that never goes online.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { makeDanceChart } from '../src/game/chart.js';
import { EXPECTED_JUDGMENTS, snapshotResult, validResult } from '../src/services/leaderboard-rules.js';
import { ENERGY } from '../src/game/energy.js';
import { quality } from '../src/game/progress.js';
import { leaderboardPreviewMode, finalMode, fabricateRun, judgments, walk, mockLeaderboard, memoryKeys, REVIEWS, OTHER_MAIL, MOCK_CODE } from '../src/dev/final-test.js';

import { comparableScore } from '../src/game/score-scale.js';
const song = JSON.parse(readFileSync(new URL('../src/song.json', import.meta.url)));
const charts = [0, 1, 2].map(d => makeDanceChart(song, d));

// Local previews use synthetic ranking rows when the real service is absent, without entering results.
assert(leaderboardPreviewMode({ hostname: 'localhost', configured: false }));
assert(leaderboardPreviewMode({ hostname: '192.168.1.195', search: '?mock' }));
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
const boardPreview = mockLeaderboard({ charts, finaleT: song.finale, board: 'me', delay: 0 });
const previewSelf = (await boardPreview.listAll()).find(r => r.is_self);
assert.equal(previewSelf.alias, 'ProvaRetall');
assert.equal(previewSelf.position, 48);
assert.equal(previewSelf.total, 119);
const svc = mockLeaderboard({ charts, finaleT: song.finale, delay: 0 });
assert(svc.configured && svc.publishingEnabled && !svc.captchaRequired);
const run = snap(fabricateRun(charts[0], { pct: 95, diff: 0 }, song.finale), 0);
const first = await svc.listAll();
assert(first.length === 50 && first[0].position === 1 && first[0].total === 62 && !first.some(r => r.is_self));
assert.equal((await svc.listAll({ offset: 50 })).length, 12);
assert.deepEqual(await svc.identity(), { hasSession: false, persistent: true, email: '' });
await assert.rejects(svc.publish(run, first[3].alias.toUpperCase()), { code: 'taken', message: 'Aquest sobrenom ja és d’algú. Prova’n un altre.' });
await assert.rejects(svc.publish(run, 'x'), { code: 'invalid' });
await assert.rejects(svc.publish({ ...run, counts: { ...run.counts, miss: run.counts.miss + 1 } }, 'ProvaMulassa'), { code: 'invalid' });
await assert.rejects(svc.publish(run, 'ProvaMulassa'), { code: 'notice' }, 'a first publication needs the 7-day notice shown');
assert.equal((await svc.publish(run, 'ProvaMulassa', { notice: true })).improved, true);
assert.equal((await svc.identity()).hasSession, true);
const after = await svc.listAll(), me = after.find(r => r.is_self);
assert(me && me.alias === 'ProvaMulassa' && me.total === 63 && Math.round(me.quality) === 95);
assert.equal(after.filter(r => r.position === me.position).length, 1);
assert.equal((await svc.publish({ ...run, score: run.score - 1 }, 'ProvaMulassa')).improved, false);
assert.equal(me.score, comparableScore(run.score, run.difficulty), 'mock board converts raw points exactly once');
{ // A newly accepted version result need not replace the user's stronger historical board row.
  const mixed = mockLeaderboard({ charts, finaleT: song.finale, delay: 0 });
  await mixed.publish({ version: 'mulassa-v1', difficulty: 0, counts: { perfect: 150, good: 0, miss: 0 }, score: 60000, maxCombo: 150 }, 'Versions', { notice: true });
  const accepted = await mixed.publish({ version: run.version, difficulty: 0, counts: { perfect: 108, good: 0, miss: 0 }, score: 10000, maxCombo: 108 }, 'Versions');
  assert(accepted.improved);
  assert.equal(accepted.score, comparableScore(10000, 0));
  const visible = (await mixed.listAll()).filter(row => row.is_self);
  assert.equal(visible.length, 1);
  assert.equal(visible[0].score, 60000, 'mock preserves the best historical board result');
}
assert.deepEqual(await svc.deleteProfile(), { deleted: true });
assert.equal((await svc.identity()).hasSession, false);
{ // ?taken: the first nickname tried is somebody else's, another goes through
  const t = mockLeaderboard({ charts, finaleT: song.finale, taken: true, delay: 0 });
  await assert.rejects(t.publish(run, 'TimbalerNou'), { code: 'taken' });
  await assert.rejects(t.publish(run, 'timbalernou'), { code: 'taken' });
  assert.equal((await t.publish(run, 'TimbalerAltre', { notice: true })).improved, true);
}
{ // &review: dev hosts only; each state picks the mock account it starts from
  assert.deepEqual(finalMode({ hostname: 'localhost', search: '?final&review=profile-legacy' }), { pct: 95, diff: 0, outcome: 'record', taken: false, review: 'profile-legacy', account: 'legacy' });
  assert.equal(finalMode({ hostname: 'localhost', search: '?final&review' }).review, '', 'the list of states');
  assert.equal(finalMode({ hostname: 'localhost', search: '?final&review=nope' }).review, '');
  assert.equal(finalMode({ hostname: 'localhost', search: '?final&review=recover' }).taken, true);
  assert.equal(finalMode({ hostname: 'localhost', search: '?final&review=board&account=expired' }).account, 'expired');
  assert.equal(finalMode({ hostname: 'mulassa.cat', search: '?final&review=published' }), null);
  assert(Object.values(REVIEWS).every(r => ['new', 'reserved', 'pending', 'legacy', 'verified'].includes(r.account) || r.account === 'expired'));
}
{ // the mock accounts behave as 202610180001 does: deadline once, notice once, a pending address counts for nothing
  let t = Date.parse('2026-10-18T10:00:00Z'); const now = () => t, WEEK = 7 * 864e5;
  const fresh = mockLeaderboard({ charts, finaleT: song.finale, delay: 0, now });
  const res = await fresh.publish(run, 'ProvaNova', { notice: true });
  assert(res.started && Date.parse(res.expires_at) === t + WEEK);
  t += 60e3; assert.equal((await fresh.publish({ ...run, score: run.score + 1 }, 'ProvaNova')).started, false, 'later publications keep it');
  let p = await fresh.profile(); assert(p.verified === false && p.expiresAt === t - 60e3 + WEEK && !p.noticeNeeded);
  assert.deepEqual(await fresh.sendCode('jo@exemple.cat'), { type: 'email_change' });
  await assert.rejects(fresh.verifyCode('jo@exemple.cat', '000000', 'email_change'), { code: 'code' });
  assert.equal((await fresh.profile()).verified, false, 'sent, not confirmed: no check');
  assert.equal((await fresh.identity()).email, '', 'nor an address on the profile');
  await fresh.verifyCode('jo@exemple.cat', MOCK_CODE, 'email_change');
  p = await fresh.profile(); assert(p.verified && p.expiresAt === null);
  assert.equal((await fresh.listAll()).find(r => r.is_self).verified, true);
  const old = mockLeaderboard({ charts, finaleT: song.finale, delay: 0, now, account: 'legacy' });
  assert.equal((await old.profile()).noticeNeeded, true);
  const until = await old.ackNotice(); t += 5000;
  assert(until === t - 5000 + WEEK && (await old.ackNotice()) === until, 'the notice starts 7 days once');
  const gone = mockLeaderboard({ charts, finaleT: song.finale, delay: 0, now, account: 'expired' });
  assert.equal((await gone.profile()).expired, true); assert(!(await gone.listAll()).some(r => r.is_self), 'hidden once expired');
  const sw = mockLeaderboard({ charts, finaleT: song.finale, delay: 0, now, account: 'pending' });
  assert.deepEqual(await sw.sendCode(OTHER_MAIL), { type: 'email' }, 'an address with a profile: switch, not merge');
  await sw.verifyCode(OTHER_MAIL, MOCK_CODE, 'email'); assert.equal(await sw.myAlias(), 'Castellera777');
  await assert.rejects(mockLeaderboard({ charts, finaleT: song.finale, delay: 0 }).sendCode('ningu@exemple.cat'), { code: 'noprofile' }, 'recovery needs a confirmed address');
}
{ // the nickname and «Ara no» count in memory; everything else goes to the device's store
  const base = new Map(), s = memoryKeys({ get: k => base.get(k) ?? null, set: (k, v) => base.set(k, v) }, ['leaderboard-alias']);
  s.set('leaderboard-alias', 'A'); s.set('share-format', 'square');
  assert.equal(s.get('leaderboard-alias'), 'A'); assert(!base.has('leaderboard-alias')); assert.equal(base.get('share-format'), 'square');
  s.remove('leaderboard-alias'); assert.equal(s.get('leaderboard-alias'), null);
}
console.log('final-test: ok');
