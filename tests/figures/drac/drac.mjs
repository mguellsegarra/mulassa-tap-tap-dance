// The Drac (assets only for now: model, dance, song, chart): the dance follows the arrangement and stays continuous,
// the chart from song-drac.json holds the same invariants as the Mulassa's, and the score's bars add up.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ARRANGEMENT, END_BEAT, DRAC_DANCE_SIZE, dracPose, newDracPose, dracPractice } from '../../../src/figures/drac/dance-drac.js';
import { makeDanceChart, DIFFS } from '../../../src/game/chart.js';
import { timeAtBeat, beatAtTime } from '../../../src/core/beat-grid.js';

const read = p => JSON.parse(readFileSync(new URL(p, import.meta.url)));
const song = read('../../../src/song-drac.json'), arr = read('../../../music/drac/drac-arrangement.json'), score = read('../../../music/drac/drac-score.json');

// -- the score: every bar is 2/4 (the pickup 1 beat)
const frac = d => (d.includes('/') ? d.split('/').reduce((a, b) => a / b) : Number(d));
for (const [n, line] of score.bars) {
  const beats = line.split(' ').reduce((s, tok) => s + frac(tok.split(':')[1]), 0);
  assert(Math.abs(beats - (n === 0 ? 1 : 2)) < 1e-9, `score bar ${n} has ${beats} beats`);
}
assert.equal(score.bars.length, 57, 'bars 0-56');
assert.equal(new Map(score.bars).get(24), new Map(score.bars).get(32), 'the shortened D keeps the original entry figure');

// -- Preserve the printed melody and its original ties, in the score's own order: A twice (1st ending bar 8, then
// the 2nd), B, C, the whole D, E, then D.S. al segno (bar 6) through bar 51 and the coda. Was: the D.S. stopped at bar 18
// (the reference recording's beat count has the full return), then E's last phrase played twice, which the original
// does not; the recording's late seconds go to the held last note instead (docs/figures/drac-music.md).
const PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const midi = n => 12 * (+n.at(-1) + 1) + PC[n[0]] + (n.includes('#') ? 1 : n.includes('b') ? -1 : 0) - 5;
const bars = new Map(score.bars), TIED = { 22: 21, 55: 54, 56: 55 }, range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const FORM = [0, ...range(1, 8), ...range(1, 7), ...range(9, 51), 6, 7, ...range(9, 51), ...range(52, 56)];
const written = [];
for (let i = 0, t = 11; i < FORM.length; i++) bars.get(FORM[i]).split(' ').forEach((tok, j) => {
  const [n, d] = tok.split(':');
  if (n !== 'R' && j === 0 && i && TIED[FORM[i]] === FORM[i - 1]) written.at(-1)[1] += frac(d);
  else if (n !== 'R') written.push([t, frac(d), midi(n)]);
  t += frac(d);
});
written.at(-1)[1] = 13; // the game's adaptation: the last C held 6 beats past its written 5 (a fermata over the closing
// roll, to the dance's settle), ringing 2 past the final hit
const r3 = x => Math.round(x * 1000) / 1000; // the arrangement's precision
assert.deepEqual(arr.melody, written.map(([t, d, m]) => [r3(t), r3(d), m]), 'the melody is the score in its written order, rests and all');
assert.deepEqual(arr.melody.filter(([t]) => t >= 127 && t <= 128), [[127, 0.5, 67], [127.5, 0.5, 71], [128, 1, 67]], 'bar 51 runs into bar 6');
assert.deepEqual(song.balloons, [[124, 128], [END_BEAT - 8, END_BEAT]], 'two TRACA: the end of section E before the D.S., and the closing roll under the held last note');
assert.deepEqual(arr.arrangement.filter(([, st]) => st === 'roll'), [[END_BEAT - 8, 'roll']], 'only the closing roll crouches the dance');

// -- drift: a regenerated arrangement that moves a section must fail here
assert.deepEqual(arr.arrangement.filter(([b]) => b >= 11), ARRANGEMENT, 'cues follow the arrangement');
assert.equal(arr.end_beat, END_BEAT, 'the final hit is the arrangement end');
assert.equal(arr.bpm, song.bpm);
assert.deepEqual(arr.balloons, song.balloons);
assert.equal(song.beats.length, END_BEAT + 1);
assert(Math.abs(song.end - song.beats[END_BEAT]) < 1e-3 && song.duration > song.tail, 'end / tail / duration');

// -- the beat <-> seconds helper, on a made-up uneven grid (a test fixture, not a performance): 0.5 s lead-in,
// beats of 0.5, 0.4, 0.25 and 0.8 s
const FIX = [0.5, 1, 1.4, 1.65, 2.45];
assert.deepEqual([0, 1, 2, 3, 4].map(b => timeAtBeat(FIX, b)), FIX, 'whole beats land on the grid');
for (const [b, t] of [[2.5, 1.525], [3.25, 1.85], [-1, 0], [-0.5, 0.25], [5, 3.25], [6.5, 4.45]]) { // inside, before 0, past the end
  assert(Math.abs(timeAtBeat(FIX, b) - t) < 1e-12, `fixture beat ${b} at ${t} s`);
  assert(Math.abs(beatAtTime(FIX, t) - b) < 1e-12, `fixture ${t} s is beat ${b}`);
}
for (let b = -2; b < 8; b += 0.137) assert(Math.abs(beatAtTime(FIX, timeAtBeat(FIX, b)) - b) < 1e-9, `round trip at ${b}`);

// -- the tempo: fitted to the reference recording's pulse (docs/figures/drac-music.md): 117 through the count-in and bar 1, a
// slow rise to 128 by B3, back to 126 through D3, the jump to 151.5 over E3's first bars (the final spins), held into the
// coda, then a rit. to 117 under the held last note (authored: the recording's pulse is lost there). Was the old hand
// curve 126 -> 148 -> 135, then the coda's rit. to 138 after the repeated phrase.
// Each whole beat takes the smoothstep curve at its middle, in whole microseconds (MIDI's unit)
const KNOTS = [[0, 117], [12, 117], [42, 122.2], [72, 123.5], [104, 126.4], [132, 128.2], [162, 126.8], [186, 126.3], [194, 139.8],
  [202, 150], [218, 151.5], [222, 150], [233, 117]];
const bpmAt = b => { for (let i = 1; i < KNOTS.length; i++) { const [b0, t0] = KNOTS[i - 1], [b1, t1] = KNOTS[i];
  if (b < b1) { const k = Math.min(1, Math.max(0, (b - b0) / (b1 - b0))); return t0 + (t1 - t0) * k * k * (3 - 2 * k); } } return KNOTS.at(-1)[1]; };
const US = Array.from({ length: END_BEAT + 8 }, (_, k) => Math.round(60e6 / bpmAt(k + 0.5)));
assert.deepEqual(arr.tempo_us, US.map((u, k) => [k, u]).filter(([k, u]) => !k || u !== US[k - 1]), 'the tempo map');
assert.deepEqual([US[5], US[41], US[132], US[194], US[218], US[222], US[225], US[232], US.at(-1)], [512821, 491016, 468023, 428833, 396208, 400530, 422228, 511953, 512821]);
const SEC = [arr.offset]; US.forEach(u => SEC.push(SEC.at(-1) + u / 1e6));
song.beats.forEach((t, i) => assert(Math.abs(t - SEC[i]) < 1e-4, `beat ${i} at ${SEC[i]} s (${t})`));
assert(Math.abs(song.beats[12] - (0.1 + 12 * 0.512821)) < 1e-4, 'the plain count-in');
// the MIDI: its tempo track gives every beat the same time, less the audio's lead-in
{
  const m = readFileSync(new URL('../../../public/music/drac-taiko.mid', import.meta.url));
  assert.equal(m.toString('latin1', 0, 4), 'MThd'); const tpq = m.readUInt16BE(12);
  let i = 14 + 8, tick = 0; const end = 14 + 8 + m.readUInt32BE(18), tempo = [];
  const vlq = () => { let v = 0, c; do { c = m[i++]; v = v * 128 + (c & 127); } while (c & 128); return v; };
  while (i < end) { // the first track: meta events only
    tick += vlq(); assert.equal(m[i], 0xff, 'the tempo track holds meta events only'); const type = m[i + 1]; i += 2; const len = vlq();
    if (type === 0x51) tempo.push([tick / tpq, m.readUIntBE(i, 3)]);
    i += len;
  }
  assert.deepEqual(tempo, arr.tempo_us, 'MIDI tempo changes on the same beats');
  let t = 0, k = 0;
  for (let b = 0; b <= END_BEAT; b++) {
    assert(Math.abs(arr.offset + t - song.beats[b]) < 1e-4, `MIDI beat ${b} at ${t + arr.offset} s, audio at ${song.beats[b]}`);
    while (k + 1 < tempo.length && tempo[k + 1][0] <= b) k++;
    t += tempo[k][1] / 1e6;
  }
}

// -- the chart: same rules as check.mjs, for song-drac.json, in beats (the tempo changes)
const B = song.beats, beat = t => beatAtTime(B, t);
const onGrid = t => { const x = beat(t) * 2; return Math.abs(x - Math.round(x)) < 2e-3; };
let closest = Infinity;
const counts = DIFFS.map((d, i) => {
  const c = makeDanceChart(song, i);
  assert(c.length > 60, `${d.name}: too few notes (${c.length})`); // the score's form: FÀCIL has ~75
  c.forEach((n, j) => {
    assert(n.balloon ? n.input === 'P' : n.big ? n.input === 'B' : 'LR'.includes(n.input), 'two-sided control only');
    assert(onGrid(n.t), `${d.name}: note at ${n.t}s is off the beat grid`);
    if (j) assert(beat(n.t) - beat(c[j - 1].t) > 0.45, `${d.name}: notes too close at ${n.t}`);
    if (j) closest = Math.min(closest, n.t - c[j - 1].t);
    if (n.end && !n.balloon) {
      assert(i > 0 && !n.big && 'LR'.includes(n.input), 'holds: plain notes from NORMAL up');
      assert(beat(n.end) - beat(n.t) >= 2 - 1e-3 && onGrid(n.end), 'a hold lasts 2+ beats, on the grid');
      assert(beat(c[j + 1].t) - beat(n.end) >= 1 - 1e-3, `hold at ${n.t} must end a beat before the next note`);
    }
  });
  const balloons = c.filter(n => n.balloon);
  assert.deepEqual(balloons.map(n => [n.t, n.end]), song.balloons.map(([a, b]) => [B[a], B[b]]), 'a balloon on every drumroll');
  balloons.forEach(b => assert(!c.some(n => !n.balloon && n.t > b.t - 1e-3 && n.t < b.end - 1e-3), 'no notes inside a balloon'));
  assert(c.at(-1).big && Math.abs(c.at(-1).t - song.end) < 1e-3, 'the song ends on a GUAPA, the final hit');
  const bigs = c.filter(n => n.big);
  assert(bigs.length >= 10 && bigs.length <= 16, `${d.name}: 10-16 big notes (${bigs.length})`);
  const holds = c.filter(n => n.end && !n.balloon);
  assert.equal(holds.length, i ? 1 : 0, `${d.name}: holds`); // the tied C of bar 21, played once
  const ks = c.filter(n => !n.balloon && !n.big).map(n => n.input);
  // (DIFÍCIL holds every tap) sides follow the melody: a higher note is PA/ka (R), a lower one GUA/don (L); only the run-breaking flips differ
  const mel = new Map(arr.melody.map(([t, , m]) => [t, m])), tap = c.filter(n => !n.balloon && !n.big && !n.end);
  let wrong = 0, runN = 0, runK = '', maxRun = 0;
  tap.forEach((n, j) => {
    const m = mel.get(Math.round(beat(n.t) * 1000) / 1000), pm = j && mel.get(Math.round(beat(tap[j - 1].t) * 1000) / 1000);
    assert(m !== undefined, `${d.name}: a tap at ${n.t}s is not a melody note`);
    if (i === 2 && j && m !== pm && n.input !== (m > pm ? 'R' : 'L')) wrong++;
  });
  c.filter(n => !n.balloon && !n.big).forEach(n => { runN = n.input === runK ? runN + 1 : 1; runK = n.input; maxRun = Math.max(maxRun, runN); });
  assert(maxRun <= 4, `${d.name}: at most 4 taps in a row on one side (${maxRun})`);
  assert(i < 2 || wrong <= 0.15 * tap.length, `${d.name}: sides follow the pitch (${wrong} of ${tap.length} flipped)`);
  assert(Math.min(ks.filter(k => k === 'L').length, ks.filter(k => k === 'R').length) > 0.3 * ks.length, `${d.name}: both sides`);
  return c.length;
});
assert(counts[0] < counts[1] && counts[1] < counts[2], `each level adds notes: ${counts}`);
// DIFÍCIL doubles more: from the D.S. on, in the phrases that open on a GUAPA (A3, C3, E3, the coda),
// the eighth falling from the phrase's peak is a GUAPA too. A DIFÍCIL-only note, so FÀCIL and NORMAL keep the shared ones.
const bigBeats = i => makeDanceChart(song, i).filter(n => n.big).map(n => Math.round(beat(n.t) * 1000) / 1000);
assert.deepEqual(bigBeats(1), bigBeats(0), 'NORMAL has FÀCIL\'s GUAPAs');
const added = bigBeats(2).filter(b => !bigBeats(0).includes(b));
assert.deepEqual(added, [131.5, 149.5, 199.5, 219.5], 'four DIFÍCIL-only GUAPAs');
for (const b of added) assert(song.notes.some(([t, , lv, big]) => lv === 2 && big && Math.abs(beat(t) - b) < 1e-3)
  && bigBeats(0).some(g => g < b && b - g < 8), `the GUAPA at ${b}: a DIFÍCIL note, in a phrase that opens on a GUAPA`);
// At the top tempo (151.5), half a beat stays at least 30 / 151.5 seconds apart (the Mulassa's DIFÍCIL eighths at 152).
assert(closest > 30 / Math.max(...KNOTS.map(([, t]) => t)) - 1e-3, `two notes ${closest.toFixed(3)} s apart`);

// -- the dance: finite, continuous, bounded, deterministic
const DEG = Math.PI / 180, p = newDracPose(), q = newDracPose(), step = 0.01;
const ch = ['yaw', 'roll', 'pitch', 'lift', 'crouch', 'x', 'z', 'drive', 'swing', 'reach', 'jaw', 'flap', 'whip', 'shake', 'fire', 'rear'];
dracPose(q, -20);
for (let b = -20 + step; b < END_BEAT + 6; b += step) {
  dracPose(p, b);
  for (const c of ch) assert(Number.isFinite(p[c]), `${c} finite at ${b}`);
  assert(Math.abs(p.yaw - q.yaw) < 0.04, `heading continuous at ${b.toFixed(2)}`);
  for (const c of ['roll', 'pitch']) assert(Math.abs(p[c] - q[c]) < 0.03, `${c} continuous at ${b.toFixed(2)}`);
  for (const c of ['lift', 'x', 'z', 'crouch']) assert(Math.abs(p[c] - q[c]) < 0.03, `${c} continuous at ${b.toFixed(2)}`);
  // a carrier holding the frame on the shoulders leans it, never lays it on its side (the downbeat jolt included)
  assert(Math.abs(p.roll + p.shake) <= 48 * DEG && Math.abs(p.pitch) <= 45 * DEG, `lean bounded at ${b}`);
  assert(p.lift >= 0 && p.lift <= 0.05 * DRAC_DANCE_SIZE.h + 0.15 && p.crouch >= 0 && p.crouch <= 1, `lift / crouch bounded at ${b}`);
  assert(Math.hypot(p.x, p.z) <= 0.15 * DRAC_DANCE_SIZE.l, `travel bounded at ${b}`);
  for (const c of ['drive', 'swing', 'jaw', 'flap', 'fire', 'rear']) assert(p[c] >= -1e-9 && p[c] <= 1.7, `${c} in range at ${b}`);
  Object.assign(q, p);
}
// the set pieces land where the tune does: rear on the long tied note (bar 21), crouch under the drum roll
dracPose(p, 66); assert(p.rear > 0.95 && p.pitch < -25 * DEG, 'C rears to the long note');
for (let b = 120; b < 136; b += 0.25) { dracPose(p, b); assert(p.crouch === 0, `no crouch while the tune runs into the D.S. (${b})`); }
// (DRAC_CROUCH_CUES: the first 4 beats of the roll; the closing roll is 8 beats since the held last note)
dracPose(p, END_BEAT - 6); assert(p.crouch > 0.6 && p.fire > 0.3, 'the closing roll crouches and burns');
dracPose(p, 300); assert(Math.abs(p.roll) < 1e-9 && p.jaw > 0.99 && p.fire === 0, 'still after the final hit: jaws open, no fire');
dracPose(p, 12); const start = p.yaw;
// eight whole turns by the end (was five: the full D.S. adds D3's two and E3's one)
dracPose(p, 400); assert(Math.abs(p.yaw - 16 * Math.PI) < 1e-9 && start === 0, 'unwrapped: eight whole turns by the end');
for (let b = 0, top = 0; b < END_BEAT + 6; b += 0.25) { dracPose(p, b); assert(p.yaw > top - 1e-9, `never unwinds at ${b}`); top = Math.max(top, p.yaw); }
const at = b => ({ ...dracPose(newDracPose(), b) }), out = newDracPose();
for (const b of [200.25, 12, 150.9, 200.25, -3, 150.9]) assert.deepEqual({ ...dracPose(out, b) }, at(b), `pure at ${b}`);
dracPractice(p, 3); assert(p.yaw === 0 && p.fire === 0, 'the practice stays front on, without fire');
// smooth everywhere: no channel jumps (C0) or snaps its speed (C1) at a bar, a section, a turn, a set piece or the loop's
// wrap. One-sided slopes on both sides of every eighth of a beat (every boundary is on that grid) must agree.
const h = 1e-4, l = newDracPose(), r = newDracPose(), m = newDracPose();
const SPEED = { yaw: 1.3, roll: 2.2, pitch: 1.7, lift: 0.7 * 1.6, crouch: 2.4, x: 0.6 * 1.4, z: 0.6 * 1.4, drive: 2, swing: 0.5, reach: 3.4, jaw: 2.4, flap: 1.7,
  whip: 2.7, shake: 1.5, fire: 2.4, rear: 3.2 }; // per beat (the fastest are the final hit's)
const smoothAt = (pose, b, what) => {
  pose(l, b - h); pose(m, b); pose(r, b + h);
  for (const c of ch) {
    const dl = (m[c] - l[c]) / h, dr = (r[c] - m[c]) / h;
    assert(Math.abs(dl) < SPEED[c] && Math.abs(dr) < SPEED[c], `${what}: ${c} jumps at ${b} (${dl.toFixed(2)} / ${dr.toFixed(2)} per beat)`);
    assert(Math.abs(dr - dl) < 0.02, `${what}: ${c} snaps its speed at ${b} (${dl.toFixed(3)} -> ${dr.toFixed(3)} per beat)`);
  }
};
for (let b = -4; b <= END_BEAT + 6; b += 0.125) smoothAt(dracPose, b, 'dance');
for (let b = -16; b <= 48; b += 0.125) smoothAt(dracPractice, b, 'practice');
console.log('drac ok', counts);
