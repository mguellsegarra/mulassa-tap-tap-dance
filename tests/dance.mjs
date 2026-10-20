// The song's base choreography (src/game/dance.js): bound to the arrangement, continuous, bounded and deterministic.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ARRANGEMENT, END_BEAT, DANCE_SIZE, dancePose, practicePose, newPose } from '../src/game/dance.js';
import { beatAtTime } from '../src/core/beat-grid.js';

const read = p => JSON.parse(readFileSync(new URL(p, import.meta.url)));
const song = read('../src/song.json'), arr = read('../music/taiko-arrangement.json');

// Drift: a regenerated arrangement that moves a section must fail here, not silently misalign the cues.
assert.deepEqual(arr.sections.filter(([b]) => b >= 12), ARRANGEMENT, 'cues follow the arrangement sections');
assert.equal(arr.end_beat, END_BEAT, 'the final hit is the arrangement end');
assert.equal(arr.bpm, song.bpm, 'arrangement and song share the tempo');
// Beat <-> song time: beat i is song.beats[i], the generated grid (its tempo changes phrase by phrase; the sync offset
// is applied before, in songTime). This beat choreography now only poses the share photo's still; the game
// dances the reference-led one (game/mula-dance.js, tests/mula-dance.mjs).
assert.equal(song.beats[0], arr.offset, 'the grid starts at the arrangement offset');
song.beats.forEach((t, i) => i && assert(t > song.beats[i - 1], `beat ${i} after beat ${i - 1}`));
const beatOf = t => beatAtTime(song.beats, t);
const near = (a, b, e = 1e-3) => Math.abs(a - b) < e;
for (const [t, k] of song.sections) assert(ARRANGEMENT.some(([b]) => near(beatOf(t), b)) || near(beatOf(t), 0), `song section ${k} at a cue`);
assert(near(beatOf(song.finale), 208) && near(beatOf(song.end), END_BEAT), 'finale and final hit on their cues');
assert(Math.abs(DANCE_SIZE.h - 4.03) < 0.05 && Math.abs(DANCE_SIZE.l - 4.22) < 0.05, 'amplitudes scale with the model size');

// Continuity, finite values and the guide's artistic ranges, over the whole song and beyond.
const DEG = Math.PI / 180, p = newPose(), q = newPose(), step = 0.01;
const channels = ['yaw', 'roll', 'pitch', 'lift', 'x', 'z', 'drive'];
dancePose(q, -20);
for (let b = -20 + step; b < 248; b += step) {
  dancePose(p, b);
  for (const c of channels) assert(Number.isFinite(p[c]), `${c} finite at ${b}`);
  assert(Math.abs(p.yaw - q.yaw) < 0.03, `heading continuous at ${b.toFixed(2)}`);
  for (const c of ['roll', 'pitch']) assert(Math.abs(p[c] - q[c]) < 0.012, `${c} continuous at ${b.toFixed(2)}`);
  for (const c of ['lift', 'x', 'z']) assert(Math.abs(p[c] - q[c]) < 0.015, `${c} continuous at ${b.toFixed(2)}`);
  assert(Math.abs(p.roll) <= 28.5 * DEG + 1e-9 && Math.abs(p.pitch) <= 27 * DEG + 1e-9, `lean within 28.5/27 deg at ${b}`);
  assert(Math.abs(p.shake) <= 2 * DEG, `landing shake within 2 deg at ${b}`);
  assert(p.lift >= 0 && p.lift <= 0.15 * DANCE_SIZE.h + 1e-9, `lift within 15% of her height at ${b}`);
  assert(Math.hypot(p.x, p.z) <= 0.09 * DANCE_SIZE.l + 1e-9, `travel within 12.5% of her length at ${b}`);
  assert(p.drive >= 0 && p.drive <= 1);
  Object.assign(q, p);
}

// The observed order: front, rear, front, rear (B), front, turns, front at the end. Yaw is unwrapped (turns keep
// going the same way) and never runs backwards between the keys.
const facing = b => { dancePose(p, b); const a = ((p.yaw % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI); return Math.min(a, 2 * Math.PI - a); };
const front = b => facing(b) < 0.35, rear = b => facing(b) > Math.PI - 0.35;
for (let b = 12; b < 70; b += 0.5) assert(front(b), `A bars 1-8: front / three-quarter (${b})`);
for (let b = 82; b < 134; b += 0.5) assert(rear(b), `A bars 9-16: rear (${b})`);
assert(front(144), 'front again as B starts');
for (let b = 152; b < 168; b += 0.5) assert(rear(b), `B: towards the rear (${b})`);
for (const b of [176, 208, 224, 228, 236]) assert(front(b), `front at the ${b} cue`);
dancePose(p, 400); const end = p.yaw;
assert(near(end, 12 * Math.PI) && end > 4 * Math.PI, 'unwrapped: six whole turns by the end, not wrapped back');
for (let b = 0, top = 0; b < 248; b += 0.25) { dancePose(p, b); assert(p.yaw > top - 0.65, `no unwinding beyond a glance at ${b}`); top = Math.max(top, p.yaw); }
for (let b = 234; b < 256; b += 0.1) { // settled: facing the plaça, only a breath of sway left
  dancePose(p, b);
  assert(near(p.yaw, 12 * Math.PI) && Math.abs(p.roll) <= 1.01 * DEG && p.lift <= 0.004 * DANCE_SIZE.h + 1e-9 && Math.abs(p.shake) < 1e-9 && p.drive <= 0.3 + 1e-9, `settled at ${b}`);
}

// Direct evaluation: seek, rewind or the same beat again give exactly the same pose (no hidden state).
const at = b => ({ ...dancePose(newPose(), b) });
const out = newPose(), seq = [200.25, 12, 215.9, 200.25, -3, 215.9];
const first = seq.map(b => ({ ...dancePose(out, b) }));
seq.forEach((b, i) => assert.deepEqual(first[i], at(b), `same pose at ${b} whatever came before`));
assert.equal(dancePose(out, 10), out, 'fills the pose it is given');

// The practice is front on, whatever beat its click track is at, and just as smooth.
practicePose(q, 0);
for (let b = step; b < 200; b += step) {
  practicePose(p, b);
  assert(Math.abs(p.yaw) < 0.35 && Math.abs(p.yaw - q.yaw) < 0.03 && Math.abs(p.roll - q.roll) < 0.012, `practice front on and smooth at ${b}`);
  Object.assign(q, p);
}

// The jump: in B the front is thrown well up while the rear hem stays on the floor (lift = the rear's compensation),
// and every landing buzzes; the solemn A rears more slowly but still clearly.
const peak = (from, to, ch, sign = 1) => { let m = 0; for (let b = from; b < to; b += 0.05) { dancePose(p, b); m = Math.max(m, sign * p[ch]); } return m; };
assert(peak(150, 170, 'pitch', -1) > 18 * DEG, 'B: the front is thrown up more than 18 deg');
assert(peak(20, 70, 'pitch', -1) > 8 * DEG && peak(20, 70, 'roll') > 14 * DEG, 'solemn A: a clear rear and lean');
assert(peak(150, 170, 'lift') > 0.3 && peak(150, 170, 'shake') > 1 * DEG, 'B: lift and a landing buzz');
dancePose(p, 146 + 0.0); dancePose(q, 146 + 1.0); assert(q.pitch < p.pitch, 'mid-jump the front is up, on the landing it is down');
console.log('dance choreography ok');
