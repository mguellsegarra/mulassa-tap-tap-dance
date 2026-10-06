import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { makeDanceChart, DIFFS, sectionAt, BALLOONS } from './src/game/chart.js';

const song = JSON.parse(readFileSync(new URL('./src/song.json', import.meta.url)));
const spb = 60 / song.bpm, onGrid = t => { const x = (t - song.beats[0]) / spb * 2; return Math.abs(x - Math.round(x)) < 2e-3; }; // every tap on an eighth of the grid
const balloonsBy = [];
const counts = DIFFS.map((d, i) => {
  const c = makeDanceChart(song, i);
  assert(c.length > 100, `${d.name}: too few notes (${c.length})`);
  c.forEach((n, j) => {
    assert(n.dir === undefined && (n.balloon ? n.input === 'P' : n.big ? n.input === 'B' : 'LR'.includes(n.input)), 'two-sided control only');
    assert(onGrid(n.t), `${d.name}: note at ${n.t}s is off the beat grid`);
    if (j) assert(n.t - c[j - 1].t > spb * 0.45, `${d.name}: notes too close at ${n.t}`);
    if (n.end && !n.balloon) { // MANTÉN
      assert(i > 0 && !n.big && 'LR'.includes(n.input), `${d.name}: holds are plain GUA/PA notes from NORMAL up`);
      assert(n.end - n.t >= spb * 2 - 1e-3 && onGrid(n.end), `${d.name}: a hold lasts 2+ beats, on the grid`);
      assert(c[j + 1].t - n.end >= spb - 1e-3, `${d.name}: hold at ${n.t} must end a beat before the next note`);
    }
  });
  const balloons = c.filter(n => n.balloon), B = song.beats;
  assert.deepEqual(balloons.map(n => [n.t, n.end]), BALLOONS.map(([a, b]) => [B[a], B[b]]), `${d.name}: a balloon on every drumroll`);
  balloons.forEach((b, k) => {
    assert(b.need >= 4 && b.need <= (b.end - b.t) / spb * 4.5, `${d.name}: balloon needs a fair number of taps`);
    assert(!c.some(n => !n.balloon && n.t > b.t - 1e-3 && n.t < b.end - 1e-3), `${d.name}: no notes inside a balloon`);
    if (i) assert(b.need > balloonsBy[i - 1][k].need, 'harder balloons need more taps');
  });
  balloonsBy[i] = balloons;
  for (const k of 'AB') assert(c.some(n => sectionAt(song, n.t) === k), `${d.name}: section ${k} has no notes`);
  assert(c.at(-1).big && c.at(-1).input === 'B', 'the song ends on a GUAPA');
  assert(Math.abs(c.at(-1).t - song.end) < 1e-3 && !c.at(-1).balloon, 'last note is the final big hit, after the last balloon');
  const bigs = c.filter(n => n.big);
  assert(bigs.length >= 10 && bigs.length <= 16, `${d.name}: 10-16 big notes (${bigs.length})`);
  assert(bigs.every(n => !n.balloon && !BALLOONS.some(([a, b]) => n.t > B[a] - 1e-3 && n.t < B[b] - 1e-3)), `${d.name}: no big note in a balloon window`);
  const holds = c.filter(n => n.end && !n.balloon);
  if (i) assert(holds.length >= 5 && holds.length <= 10, `${d.name}: 5-10 holds (${holds.length})`);
  else assert.equal(holds.length, 0, 'FÀCIL has no holds');
  assert(holds.every(n => !BALLOONS.some(([a, b]) => n.t < B[b] && n.end > B[a] - 1e-3)), `${d.name}: no hold in a balloon window`);
  return c;
});
assert(new Set(counts[1].filter(n => n.end && !n.balloon).map(n => n.input)).size === 2, 'NORMAL has GUA and PA holds');
assert.deepEqual(counts[1].filter(n => n.end && !n.balloon).map(n => n.t),counts[2].filter(n => n.end && !n.balloon).map(n => n.t), 'the same holds on NORMAL and DIFÍCIL');
const tune = song.notes.filter(([, , , big]) => big).map(([t]) => t);
assert(song.notes.every(n => n.length === 5 && 'don ka'.split(' ').includes(n[1]) && (n[3] === 0 || n[3] === 1) && (n[4] === 0 || n[4] > n[0])), 'notes are [t, don|ka, level, big, holdEnd]');
assert(song.notes.every(n => !(n[3] && n[4])), 'a note is a GUAPA or a hold, not both');
assert(counts.every(c => c.filter(n => n.big).length === tune.length), 'big notes on every difficulty');
assert(tune.slice(0, -1).every(t => t < song.beats[308]), 'big notes are tune taps (the last one is the final hit)');
for (let i = 1; i < 3; i++) {
  assert(counts[i].length > counts[i - 1].length, 'difficulty must add notes');
  const times = new Set(counts[i].map(n => n.t));
  assert(counts[i - 1].every(n => times.has(n.t)), 'harder charts contain the easier ones');
}
assert.equal(sectionAt(song, song.sections[0][0] - 1), song.sections[0][1], 'times before the first section (a game from 0) read as the first section');
assert(song.beats.includes(song.finale) && sectionAt(song, song.finale) === 'B' && song.finale < song.end, 'finale starts on a coda downbeat');
console.log('chart ok', Object.fromEntries(DIFFS.map((d, i) => [d.name, counts[i].length])));

const { quality, qualityText, starsFor, WINDOWS } = await import('./src/game/progress.js');
assert.equal(qualityText({ perfect: 0, good: 0, miss: 0 }), '—', 'nothing judged is not 0%');
assert.equal(qualityText({ perfect: 1, good: 0, miss: 0 }), '100%');
assert.equal(quality({ perfect: 0, good: 0, miss: 0 }), 0);
assert.equal(quality({ perfect: 0, good: 100, miss: 0 }), 80);
assert.equal(starsFor(80), 2, 'all good notes should clear with a coherent medal');
assert.deepEqual([100, 85, 84.9, 70, 69.9, 50, 49.9, 0].map(starsFor), [3, 3, 2, 2, 1, 1, 0, 0], 'star thresholds');
assert.equal(quality({ perfect: 100, good: 0, miss: 0 }), 100);
assert.equal(quality({ perfect: 0, good: 0, miss: 100 }), 0);
assert.equal(quality({ perfect: 70, good: 0, miss: 30 }), 70);
assert(WINDOWS[0].good > WINDOWS[2].good, 'easy timing must be forgiving');
const easy = makeDanceChart(song, 0), normal = makeDanceChart(song, 1);
for (const n of easy) { // (the choreography itself follows the song, not the chart: tests/dance.mjs)
  const shared = normal.find(other => other.t === n.t);
  if (shared) assert.equal(shared.input, n.input, 'shared notes keep their button across difficulty');
}
console.log('progress and control contracts ok');
