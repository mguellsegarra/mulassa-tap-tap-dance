// Jittered autoplay (?autoplay&jitter=<ms>, src/dev/autoplay-jitter.js) over each song's chart at each level: the pure judge
// must give the grade mix the error implies, so the windows, the tie rule and the tempo-changing grids stay honest.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { makeDanceChart } from '../../src/game/chart.js';
import { WINDOWS } from '../../src/game/progress.js';
import { pressTarget, isOverdue } from '../../src/game/judge-core.js';
import { autoplayError } from '../../src/dev/autoplay-jitter.js';

const SONGS = ['mulassa', 'drac', 'bou'].map(k => [k, JSON.parse(readFileSync(new URL(`../../src/song-${k}.json`, import.meta.url)))]);
// Presses land at note.t + error in time order (a late press can come after the next note's); a note left past its window
// is a silent miss, as advance() does. Returns the grade counts. `shift` perturbs the window the judge sees (proves the mix check can fail).
function run(chart, win, ms, shift = 0) {
  const notes = chart.filter(n => !n.balloon).map(n => ({ ...n, hit: null })), counts = { perfect: 0, good: 0, miss: 0 };
  const presses = notes.map((n, i) => ({ t: n.t + autoplayError(i, ms), i })).sort((a, b) => a.t - b.t || a.i - b.i);
  let from = 0;
  const judge = (n, kind) => { n.hit = kind; counts[kind]++; };
  const sweep = t => { for (const n of notes) if (!n.hit && isOverdue(n, t, win)) judge(n, 'miss'); while (from < notes.length && notes[from].hit) from++; };
  for (const p of presses) {
    sweep(p.t);
    const w = { perfect: win.perfect + shift, good: win.good + shift, miss: win.miss + shift }, hit = pressTarget(notes, from, p.t, w, null);
    if (hit) judge(hit.n, hit.kind);
  }
  sweep(Infinity);
  assert.equal(counts.perfect + counts.good + counts.miss, notes.length, 'every note is judged exactly once');
  return counts;
}
const share = (c, k) => c[k] / (c.perfect + c.good + c.miss);

assert.equal(autoplayError(3, 0), 0);
assert.equal(autoplayError(3, 80, 1), autoplayError(3, 80, 1), 'deterministic');
assert.notEqual(autoplayError(3, 80, 1), autoplayError(3, 80, 2), 'the seed changes the run');
const errs = Array.from({ length: 400 }, (_, i) => autoplayError(i, 100));
assert(errs.every(e => Math.abs(e) >= 0.075 - 1e-9 && Math.abs(e) <= 0.125 + 1e-9), 'magnitude is ms x [0.75, 1.25]');
assert(errs.filter(e => e < 0).length > 120 && errs.filter(e => e > 0).length > 120, 'early and late both');

const drac = SONGS[1][1].beats, gaps = new Set(drac.slice(1).map((b, i) => (b - drac[i]).toFixed(3)));
assert(gaps.size > 1, 'the Drac keeps its tempo changes (the grid is not uniform)');

for (const [name, song] of SONGS) {
  WINDOWS.forEach((win, lvl) => {
    const chart = makeDanceChart(song, lvl), tag = `${name} level ${lvl}`;
    const mid = (win.perfect + win.good) / 2 * 1000, beyond = win.miss * 1000 / 0.75 * 1.02; // mid: 0.75..1.25 x it stays in (perfect, good]
    // (beyond the window a press can still land inside the next note's: the dense levels keep about half their misses)
    const exact = run(chart, win, 0), good = run(chart, win, mid), off = run(chart, win, beyond);
    assert.equal(share(exact, 'perfect'), 1, `${tag}: no jitter, all perfect`);
    assert(share(good, 'good') >= 0.97 && share(good, 'miss') === 0, `${tag}: mid jitter is good (${JSON.stringify(good)})`);
    assert(share(off, 'miss') >= 0.5 && share(off, 'perfect') <= 0.3, `${tag}: jitter beyond the window misses (${JSON.stringify(off)})`);
    assert(share(run(chart, win, mid, 0.03), 'good') < 0.97, `${tag}: windows 30 ms wider would turn the good mix perfect (the check can fail)`);
  });
}
console.log('judge jitter ok');
