// Device statistics (src/game/stats.js): the catalogue's counting rules, owners, days and the once-only run token,
// and that flow.js closes the run on every ending path.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
let disk = new Map(), blocked = false;
globalThis.localStorage = { getItem: k => { if (blocked) throw new Error('blocked'); return disk.get(k) ?? null; }, setItem: (k, v) => { if (blocked) throw new Error('blocked'); disk.set(k, v); }, removeItem: k => disk.delete(k) };
const S = await import('../src/game/stats.js');
const { newStats, endRun, transferNone, forgetOwner, payload, summary, chartTallies, armRun, closeRun, loadStats, setStatsOwner, localDate } = S;
const bestOf = b => b.best && { score: b.best.score, quality: b.best.quality, combo: b.best.maxCombo };

const counts = (p, g, m) => ({ perfect: p, good: g, miss: m });
const errors = (o = {}) => ({ early: 0, late: 0, silent: 0, both: 0, hold: 0, move: 0, ...o });
const run = (kind, o = {}) => ({ kind, figureId: 'mulassa-valls', version: 'mulassa-v3', level: 1, date: '2026-11-05', seconds: 100, counts: counts(100, 20, 13), errors: errors({ early: 5, late: 3, silent: 2 }),
  guapa: 8, guapaTotal: 10, balloons: 2, holds: 4, maxCombo: 77, stars: 2, score: 50000, quality: 82.5, ...o });
const B = 'mulassa-valls/mulassa-v3/1';

// what each kind adds
let s = newStats();
endRun(s, null, run('end'));
let b = s.owners.none.counters[B];
assert.deepEqual([b.runs, b.completed, b.collapsed, b.seconds, b.perfect, b.good, b.miss, b.guapa, b.guapaTotal, b.balloons, b.holds, b.bestCombo, b.bestStars], [1, 1, 0, 100, 100, 20, 13, 8, 10, 2, 4, 77, 2]);
assert.deepEqual(bestOf(b), { score: 50000, quality: 82.5, combo: 77 }); assert.deepEqual([b.best.perfect, b.best.good, b.best.miss], [100, 20, 13]);
assert.equal(s.since, '2026-11-05');
endRun(s, null, run('collapse', { counts: counts(108, 0, 25), maxCombo: 90, stars: 0, score: 99999 })); // collapse on the last note: all 133 judgments, never a record
assert.equal(b.collapsed, 1); assert.equal(b.perfect + b.good + b.miss, 133 + 133); assert.equal(b.bestCombo, 90); assert.equal(b.bestStars, 2); assert.equal(b.best.score, 50000);
const before = JSON.stringify(s.owners.none.counters);
for (const kind of ['quit', 'restart']) endRun(s, null, run(kind, { seconds: 7 }));
const after = s.owners.none.counters[B];
assert.equal(after.runs, 4); assert.equal(after.seconds, 100 + 100 + 14);
assert.equal(after.perfect, 208); assert.equal(after.completed, 1);
assert.notEqual(before, JSON.stringify(s.owners.none.counters));
endRun(s, null, run('practice', { seconds: 30 }));
assert.deepEqual(s.owners.none.practice, { runs: 1, seconds: 30 }); assert.equal(after.runs, 4, 'practice stays out of the buckets');

// seconds round down: the server bounds them by runs x the song's exact length, and Drac's 109.889 s must never become 110
{ const t = newStats();
  endRun(t, null, run('end', { figureId: 'drac-valls', version: 'drac-v1', seconds: 109.889 })); endRun(t, null, run('quit', { seconds: 0.9 })); endRun(t, null, run('practice', { seconds: 180.7 }));
  assert.equal(t.owners.none.counters['drac-valls/drac-v1/1'].seconds, 109); assert.equal(t.owners.none.counters[B].seconds, 0); assert.equal(t.owners.none.practice.seconds, 180); }

// the best run is whole, never field by field
endRun(s, null, run('end', { score: 60000, quality: 70, maxCombo: 10, stars: 1 }));
assert.deepEqual(bestOf(after), { score: 60000, quality: 70, combo: 10 }); assert.equal(after.bestCombo, 90);
endRun(s, null, run('end', { score: 60000, quality: 71, maxCombo: 5 }));
assert.deepEqual(bestOf(after), { score: 60000, quality: 71, combo: 5 }, 'a tie on points goes to the better %');

// owners: A -> B -> A, transferNone once per chunk, forget
s = newStats();
endRun(s, 'A', run('end')); endRun(s, 'B', run('end', { date: '2026-11-06' })); endRun(s, 'A', run('end'));
assert.equal(s.owners.A.counters[B].completed, 2); assert.equal(s.owners.B.counters[B].completed, 1);
endRun(s, null, run('end', { score: 70000 }));
transferNone(s, 'A');
assert.equal(s.owners.A.counters[B].completed, 3); assert.equal(s.owners.A.counters[B].best.score, 70000); assert.equal(s.owners.none, undefined);
transferNone(s, 'B'); assert.equal(s.owners.B.counters[B].completed, 1, 'nothing left to move: not twice');
endRun(s, null, run('end', { date: '2026-11-07' }));
transferNone(s, 'B');
assert.equal(s.owners.B.counters[B].completed, 2, 'later unowned play goes to the next profile'); assert.equal(s.owners.A.counters[B].completed, 3);
assert.deepEqual(s.owners.B.days, ['2026-11-06', '2026-11-07']);
endRun(s, null, run('end'));
forgetOwner(s, 'A');
assert.equal(s.owners.A, undefined); assert(s.owners.B && s.owners.none, 'only that owner goes, nothing to none');
assert.equal(s.owners.none.counters[B].completed, 1);

// payload: cumulative, deterministic, empty buckets left out
s = newStats(); s.deviceId = 'dev';
endRun(s, 'U', run('end', { figureId: 'drac-valls', version: 'drac-v1', date: '2026-11-06' })); endRun(s, 'U', run('end'));
const p1 = payload(s, 'U'), p2 = payload(JSON.parse(JSON.stringify(s)), 'U');
assert.equal(JSON.stringify(p1), JSON.stringify(p2));
assert.deepEqual(Object.keys(p1.buckets), ['drac-valls/drac-v1/1', B]); assert.deepEqual(p1.days, ['2026-11-05', '2026-11-06']);
assert.equal(p1.device, 'dev'); assert.equal(p1.imported, false);
endRun(s, 'U', run('end'));
assert.equal(payload(s, 'U').buckets[B].completed, 2, 'cumulative totals, not the last run');
S.markSent(s, 'U', 'sig'); assert.equal(payload(s, 'U').imported, true); assert.equal(s.owners.U.sent, 'sig');
assert.deepEqual(payload(s, 'nobody').buckets, {});
{ // merge_stats' shape: best without the local quality, practice in its reserved bucket
  const t = S.newStats(); endRun(t, 'P', run('end', { score: 1000 })); endRun(t, 'P', run('practice', { seconds: 12 }));
  const q = payload(t, 'P'), [k] = Object.keys(q.buckets).filter(x => x !== 'practice');
  assert.deepEqual(Object.keys(q.buckets[k].best).sort(), ['good', 'maxCombo', 'miss', 'perfect', 'score']);
  assert.deepEqual(q.buckets.practice, { runs: 1, seconds: 12 });
}

// summary
s = newStats();
endRun(s, null, run('end', { date: '2026-03-27' })); endRun(s, null, run('end', { date: '2026-03-28', level: 0, stars: 3 })); endRun(s, null, run('end', { date: '2026-03-29', figureId: 'drac-valls', version: 'drac-v1', maxCombo: 120 }));
endRun(s, null, run('end', { date: '2026-04-02' })); endRun(s, null, run('end', { date: '2026-04-03' }));
let m = summary(s, null, '2026-04-03');
assert.equal(m.runs, 5); assert.equal(m.completed, 5); assert.equal(m.seconds, 500); assert.equal(m.bestCombo, 120);
assert.equal(m.favouriteFigure, 'mulassa-valls'); assert.equal(m.stars, 2 + 3 + 2); assert.equal(m.daysPlayed, 5);
assert.equal(m.bestStreak, 3); assert.equal(m.streak, 2); assert.equal(m.since, '2026-03-27');
assert.equal(Math.round(m.accuracy * 100) / 100, Math.round(100 * (100 + 20 * 0.8) / 133 * 100) / 100);
assert.equal(summary(s, null, '2026-04-04').streak, 2, 'yesterday still counts'); assert.equal(summary(s, null, '2026-04-05').streak, 0);
assert.equal(summary(newStats(), null).accuracy, null); assert.equal(summary(newStats(), 'x').favouriteFigure, null);

// days: across midnight and a DST change (spring forward in Europe, 2027-03-28) stay one day apart
s = newStats();
for (const d of ['2027-03-27', '2027-03-28', '2027-03-29', '2027-10-30', '2027-10-31', '2027-11-01']) endRun(s, null, run('quit', { date: d, seconds: 1 }));
assert.equal(summary(s, null, '2027-11-01').bestStreak, 3); assert.equal(summary(s, null, '2027-11-01').streak, 3);
assert.equal(localDate(new Date(2027, 2, 28, 23, 59)), '2027-03-28'); assert.equal(localDate(new Date(2027, 2, 29, 0, 1)), '2027-03-29');

// blocked storage never crashes; damaged data starts again
blocked = true; assert.doesNotThrow(() => { S.recordRun(run('end')); loadStats(); });
blocked = false; disk.set('stats-v1', '{broken'); assert.equal(Object.keys(loadStats().owners).length, 0);
disk.set('stats-v1', '[]'); assert.equal(typeof loadStats().deviceId, 'string');
disk = new Map();
setStatsOwner('U1'); closeRunOnce();
function closeRunOnce() {
  armRun(true);
  let made = 0;
  const mk = kind => () => { made++; return run(kind); };
  assert.equal(closeRun(mk('end')), true); assert.equal(closeRun(mk('quit')), false, 'the second ending is ignored');
  assert.equal(made, 1); assert.equal(loadStats().owners.U1.counters[B].runs, 1); assert.equal(loadStats().owners.none, undefined);
  armRun(false); assert.equal(closeRun(mk('end')), false, 'excluded run'); assert.equal(made, 1);
  setStatsOwner(null); armRun(true); closeRun(mk('end')); assert.equal(loadStats().owners.none.counters[B].runs, 1);
}

// a run that used a debug hook after it began ends uncounted, and does not count when the next ending comes either
{ armRun(true); let made = 0; assert.equal(closeRun(() => { made++; return run('end'); }, false), false); assert.equal(made, 0);
  assert.equal(closeRun(() => { made++; return run('end'); }), false, 'the run is closed all the same'); assert.equal(made, 0); }

// chart tallies as judge.js leaves them
assert.deepEqual(chartTallies([
  { big: true, hit: 'perfect', gran: true }, { big: true, hit: 'miss' }, { big: true, hit: null },
  { balloon: true, count: 12, need: 12 }, { balloon: true, count: 3, need: 12 },
  { end: 5, tail: 'perfect' }, { end: 6, tail: 'good' }, { end: 7, tail: 'miss' }, { t: 1, hit: 'perfect' },
]), { guapa: 1, guapaTotal: 2, balloons: 1, holds: 1 });

// flow.js: every ending path closes the run, exclusions arm nothing
const flow = readFileSync(new URL('../src/game/flow.js', import.meta.url), 'utf8');
const body = name => flow.slice(flow.indexOf(`function ${name}(`)).split(/\n}\n/)[0];
for (const name of ['toTitle', 'startGame', 'startPractice', 'endPractice', 'finish']) assert.match(body(name), /leaveRun\(/, `${name} closes the run`);
assert.match(body('finish'), /leaveRun\(reason\)[\s\S]*chip\.stop\(\)/, 'before the song clock stops');
assert.match(body('leaveRun'), /\}, !debugUsed\)\)/, 'debug use during a run invalidates it when it ends');
assert.match(body('leaveRun'), /practice \? Math\.max\(0, clock - G\.practice\.t0\)/, 'the practice is timed on its own, not capped by the song');
assert.match(body('beginRun'), /armRun\(!AUTOPLAY && !FROM && STARS < 0 && !FINAL && !debugUsed\)/);
assert.match(body('startWatch'), /armRun\(false\)/);
assert.match(readFileSync(new URL('../src/game/judge.js', import.meta.url), 'utf8'), /G\.playedSec = songTime\(\);[^\n]*\n\s*chip\.stop\(\)/, 'a collapse keeps its seconds before stopping');
console.log('device statistics: counting rules, owners, days, once-only closing and the flow wiring hold');
