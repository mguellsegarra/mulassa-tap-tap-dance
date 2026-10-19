// The Drac's time map (game/drac-time.js, docs/drac-music.md): song seconds <-> the reference video's seconds, from the
// form's `reference` anchors through the generator. Monotone, C1, near 1:1, an exact inverse, holding before the pickup
// and after the settle, on the game's own beat grid; the music's tempo stays on the video's pulse at every anchor, and the
// audited foot placements of the source land on the song's beats. Prints the tables the doc quotes.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createDracTime, dracTime as d } from '../src/game/drac-time.js';
import { beatAtTime } from '../src/core/beat-grid.js';
import { compileForm } from '../src/music-form/compile.js';
import { VERIFIED } from '../src/dev/drac-compare/phrases.js';

const read = p => JSON.parse(readFileSync(new URL(p, import.meta.url), 'utf8'));
const song = read('../src/song-drac.json'), form = read('../music/drac-form.json'), tl = compileForm(form, read('../music/drac-score.json'));
const R = song.ref, B = song.beats, s0 = R[0][0], s1 = R.at(-1)[0];
const VERBOSE = process.argv.includes('--tables');

// ---- the generated anchors are the compiler's, rising in both, from the video's first frame to the settle
assert.deepEqual(tl.unresolved, []);
assert.deepEqual(R, tl.ref.map(([s, r]) => [Number(s.toFixed(4)), r]), 'song-drac.json ref = the compiled form (4 decimals)');
assert.equal(song.refEnd, 104.8);
assert.equal(R[0][1], 0, 'the first anchor is the video\'s first frame');
assert.equal(R.at(-1)[1], song.refEnd, 'the last anchor is the settle');
R.forEach((a, i) => i && assert(a[0] > R[i - 1][0] && a[1] > R[i - 1][1], `anchor ${i} rises in both`));
const pickupAnchor = R.find(([, r]) => r === 0.058);
assert(pickupAnchor && Math.abs(pickupAnchor[0] - d.pickup) < 1e-4, 'the pickup note is at the video\'s 0.058 s');
const starts = new Map();
for (const [item, it, a] of tl.itemSpans) if (!it && !starts.has(item)) starts.set(item, a);
for (const it of form.sequence) assert(tl.refAnchors.some(([b]) => b === starts.get(it.id)), `an anchor at ${it.id}'s start`);

// ---- holds outside, monotone and C1 inside, slope near 1
for (const t of [-5, 0, s0 - 1e-6, s0]) { assert.equal(d.refAt(t), 0, `the Drac waits at ${t}`); assert.equal(d.rateAt(t), 0); }
for (const t of [s1, s1 + 1e-6, 200]) { assert.equal(d.refAt(t), song.refEnd, `held after the settle (${t})`); assert.equal(d.rateAt(t), 0); }
assert.equal(d.songAtRef(-1), s0); assert.equal(d.songAtRef(0), s0); assert.equal(d.songAtRef(500), s1);
let lo = Infinity, hi = -Infinity, prev = d.refAt(s0);
for (let t = s0 + 0.001; t < s1; t += 0.001) {
  const r = d.refAt(t), k = d.rateAt(t);
  assert(r > prev, `rises at ${t}`); prev = r;
  lo = Math.min(lo, k); hi = Math.max(hi, k);
}
assert(lo >= 0.85 && hi <= 1.15, `slope within 0.85-1.15 (${lo.toFixed(4)}-${hi.toFixed(4)})`);
const h = 1e-5;
for (const [s] of R.slice(1, -1)) { // C1 at every anchor: one-sided slopes agree, and rateAt is the derivative
  const dl = (d.refAt(s) - d.refAt(s - h)) / h, dr = (d.refAt(s + h) - d.refAt(s)) / h;
  assert(Math.abs(dl - dr) < 1e-3 && Math.abs(d.rateAt(s) - (dl + dr) / 2) < 1e-3, `C1 at ${s}`);
}
for (const [s, r] of R) assert(Math.abs(d.refAt(s) - r) < 1e-9, `through the anchor at ${s}`);

// ---- the inverse, both ways
for (let r = 0; r <= song.refEnd; r += 0.0137) assert(Math.abs(d.refAt(d.songAtRef(r)) - r) < 1e-6, `ref ${r} round trip`);
for (let t = s0; t <= s1; t += 0.0191) assert(Math.abs(d.songAtRef(d.refAt(t)) - t) < 1e-6, `song ${t} round trip`);

// ---- one grid: beats are the game's, whichever clock asks
for (let t = -2; t < song.duration + 2; t += 0.0731) assert.equal(d.beatAt(t), beatAtTime(B, t), `grid at ${t}`);
for (let r = 0; r < 105; r += 0.0731) assert.equal(d.beatAtRef(r), beatAtTime(B, d.songAtRef(r)), `grid at ref ${r}`);
assert.deepEqual(createDracTime(song).refAt(50), d.refAt(50), 'a fresh map is the same map');

// ---- the music on the video's pulse: anchors are the pulse, so the drift of the song's own clock (from bar 1's downbeat)
// against them is the tempo fit's residual (the rit. past 98.5 s is authored: the music's clock, drift 0 by construction)
const one = R.find(([s]) => Math.abs(s - B[12]) < 1e-3);
const drift = R.map(([s, r]) => [s, r, s - one[0] - (r - one[1])]);
const worst = Math.max(...drift.slice(2).map(x => Math.abs(x[2])));
assert(worst < 0.1, `the song's beats stay within 0.1 s of the video's pulse at every phrase (worst ${worst.toFixed(3)} s)`);

// ---- the tempo (ported from the trial's checks, on the fitted map): gentle steps but for the measured late jump and the
// rit. under the held last note, calm at the start, fast under the final spins, the final hit inside the settle (104-104.8 s)
const bpm = tl.tempo.beatUs.map(u => 60e6 / u);
for (let b = 1; b <= tl.end; b++) assert(Math.abs(bpm[b] - bpm[b - 1]) <= (b >= 222 ? 5 : 2.6), `a ${(bpm[b] - bpm[b - 1]).toFixed(2)} BPM step at ${b}`);
assert(Math.min(...bpm.slice(0, tl.end)) >= 116.9 && Math.max(...bpm.slice(0, tl.end)) <= 151.6, 'tempo within the measured 117-151.5');
assert(bpm.slice(12, 42).every(t => t < 122.3) && bpm.slice(202, 222).every(t => t > 149.9), 'calm start, fast final spins');
const hitRef = d.refAt(song.end);
assert(hitRef > 104 && hitRef < 104.8, `the final hit at ref ${hitRef.toFixed(3)} s, inside the settle`);

// ---- the audited foot placements (dev/drac-compare/phrases.js VERIFIED) against the nearest beat of the song
const feet = VERIFIED.map(v => {
  const c = (v.lo + v.hi) / 2, b = d.beatAtRef(c), k = Math.round(b), at = d.refAt(B[k]);
  return { ...v, c, b, k, off: c - at, inside: at >= v.lo - 1e-9 && at <= v.hi + 1e-9 };
});
const inside = feet.filter(f => f.inside).length;
assert(inside >= 0.75 * feet.length, `a beat inside ${inside} of ${feet.length} audited arrival windows`);
assert(feet.every(f => Math.abs(f.off) < 0.25), 'no placement more than 0.25 s from a beat');

if (VERBOSE) {
  console.log('anchor | song s | ref s | drift s');
  for (const [s, r, x] of drift) console.log(`${s.toFixed(3)} | ${r.toFixed(3)} | ${x >= 0 ? '+' : ''}${x.toFixed(3)}`);
  console.log('milestone ref s | song s | beat | refAt(nearest beat) - milestone');
  for (const m of [0.058, 16.7, 19.8, 28.8, 44.3, 59, 60, 63.4, 72.8, 86.4, 93.8, 94.8, 104, 104.8]) {
    const b = d.beatAtRef(m), k = Math.min(Math.round(b), B.length - 1);
    console.log(`${m} | ${d.songAtRef(m).toFixed(3)} | ${b.toFixed(2)} | ${(d.refAt(B[k]) - m).toFixed(3)} (beat ${k})`);
  }
  for (const f of feet) console.log(`foot ${f.leg ?? '-'} ${f.lo}-${f.hi}: beat ${f.b.toFixed(2)}, nearest ${f.k} off ${f.off.toFixed(3)} s${f.inside ? '' : ' (outside)'}`);
}
console.log(`drac time ok: slope ${lo.toFixed(3)}-${hi.toFixed(3)}, drift <= ${worst.toFixed(3)} s, hit at ref ${hitRef.toFixed(3)} s, a beat in ${inside}/${feet.length} foot windows`);
