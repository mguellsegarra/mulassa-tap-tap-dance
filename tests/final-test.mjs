// ?final (src/dev/final-test.js): only on dev hosts, a consistent made-up run, and a mock leaderboard that never goes online.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { makeDanceChart } from '../src/game/chart.js';
import { EXPECTED_JUDGMENTS, snapshotResult, validResult } from '../src/services/leaderboard-rules.js';
import { ENERGY } from '../src/game/energy.js';
import { quality } from '../src/game/progress.js';
import { finalMode, fabricateRun, judgments, walk, mockLeaderboard, memoryKeys } from '../src/dev/final-test.js';

import { comparableScore } from '../src/game/score-scale.js';
const song = JSON.parse(readFileSync(new URL('../src/song.json', import.meta.url)));
const charts = [0, 1, 2].map(d => makeDanceChart(song, d));


// inert on production, on LAN / localhost only
for (const h of ['mulassa.cat', 'www.mulassa.cat', 'mulassa-tap-tap-dance.pages.dev', 'abc123.mulassa-tap-tap-dance.pages.dev', '8.8.8.8', '172.32.0.1', ''])
  assert.equal(finalMode({ hostname: h, search: '?final' }), null, h);
for (const h of ['localhost', '127.0.0.1', '192.168.1.100', '10.0.0.7', '172.20.1.2', 'mac.local', 'mulassa.test'])
  assert.deepEqual(finalMode({ hostname: h, search: '?final&mute' }), { pct: 95, diff: 0, outcome: 'record', taken: false }, h);
assert.equal(finalMode({ hostname: 'localhost', search: '?mute' }), null, 'only when asked');
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
assert.equal((await svc.publish(run, 'ProvaMulassa')).improved, true);
assert.equal((await svc.identity()).hasSession, true);
const after = await svc.listAll(), me = after.find(r => r.is_self);
assert(me && me.alias === 'ProvaMulassa' && me.total === 63 && Math.round(me.quality) === 95);
assert.equal(after.filter(r => r.position === me.position).length, 1);
assert.equal((await svc.publish({ ...run, score: run.score - 1 }, 'ProvaMulassa')).improved, false);
assert.equal(me.score, comparableScore(run.score, run.difficulty), 'mock board converts raw points exactly once');
{ // A newly accepted version result need not replace the user's stronger historical board row.
  const mixed = mockLeaderboard({ charts, finaleT: song.finale, delay: 0 });
  await mixed.publish({ version: 'mulassa-v1', difficulty: 0, counts: { perfect: 150, good: 0, miss: 0 }, score: 60000, maxCombo: 150 }, 'Versions');
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
  assert.equal((await t.publish(run, 'TimbalerAltre')).improved, true);
}
{ // the nickname and «Ara no» count in memory; everything else goes to the device's store
  const base = new Map(), s = memoryKeys({ get: k => base.get(k) ?? null, set: (k, v) => base.set(k, v) }, ['leaderboard-alias']);
  s.set('leaderboard-alias', 'A'); s.set('share-format', 'square');
  assert.equal(s.get('leaderboard-alias'), 'A'); assert(!base.has('leaderboard-alias')); assert.equal(base.get('share-format'), 'square');
  s.remove('leaderboard-alias'); assert.equal(s.get('leaderboard-alias'), null);
}
console.log('final-test: ok');
