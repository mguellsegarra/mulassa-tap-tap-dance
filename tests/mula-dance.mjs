// The Mulassa's reference-led dance in the game (game/mula-time.js, mula-path.js, mula-dance.js, mula-supports.js,
// mula-layout.js): one time map from the generated song to the 2017 reference, the observed order of headings on it
// (half turns, the two late reversals, about four final turns, the settle), smooth motion at 30/60/120 Hz across the
// tempo's phrase changes, a sway locked to the beat grid, seekable shoes that stay planted and never overlap, live steps
// that follow wherever she is driven, and attendants / seated members clear of the whole dance and of the play camera.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { beatAtTime } from '../src/core/beat-grid.js';
import { compileForm } from '../src/music-form/compile.js';
import { mulaDance, makeMulaDance, newMulaPose } from '../src/game/mula-dance.js';
import { createMulaTime } from '../src/game/mula-time.js';
import { shoeSeparation, nominalFoot, createStepper, MULA_STEP, SHOE } from '../src/game/mula-supports.js';
import { MULA_W, MULA_COMPASS, MULA_CENTRE, MULA_REACH, MULA_HELPERS, MULA_HELPER_RADIUS, MULA_SEATS, mulaDanceYaw, mulaToWorld } from '../src/game/mula-layout.js';

const read = p => JSON.parse(readFileSync(new URL(p, import.meta.url), 'utf8'));
const src = f => readFileSync(new URL(`../src/${f}`, import.meta.url), 'utf8');
const song = read('../src/song.json'), form = read('../music/mulassa-form.json'), score = read('../music/score.json');
const tl = compileForm(form, score), T = mulaDance.time, B = song.beats, DEG = Math.PI / 180;
const beatOf = t => beatAtTime(B, t), at = (t, p = newMulaPose()) => mulaDance.pose(p, t);
const turns = (a, b) => (b - a) / (2 * Math.PI);

// ---- one clock: the generated song carries the compiled reference anchors on its own beat grid
assert.deepEqual(tl.unresolved, []);
assert.deepEqual(song.ref, tl.ref.map(([s, r]) => [Number(s.toFixed(4)), r]), 'song.json ref = the compiled form');
assert.equal(song.refEnd, 166.2);
assert.deepEqual(song.arrangement, tl.arrangement, 'the dance reads the generated sections');
{ // an anchor moved out of order is an error, never silently moved
  const f = structuredClone(form);
  f.reference.anchors[2].ref = 20;
  assert(compileForm(f, score).unresolved.some(u => u.path.startsWith('reference.anchors')), 'falling anchors are refused');
}
// ---- the map: waits, rises, holds; its rate eased (no jolt at a phrase change), the inverse exact enough to seek a video
const [s0] = song.ref[0], s1 = song.ref.at(-1)[0];
for (const t of [-3, 0, s0 - 0.5]) assert.equal(T.refAt(t), 0, `the reference waits for the pickup (${t})`);
for (const t of [s1 + 0.5, 200]) assert.equal(T.refAt(t), 166.2, `and holds its end (${t})`);
let prevRef = -1, prevRate = 0, maxRate = 0, maxJump = 0;
for (let t = s0 - 1; t < s1 + 1; t += 0.005) {
  const r = T.refAt(t), k = T.rateAt(t);
  assert(r >= prevRef, `monotone at ${t}`); prevRef = r;
  maxRate = Math.max(maxRate, k); maxJump = Math.max(maxJump, Math.abs(k - prevRate)); prevRate = k;
}
assert(maxRate < 4.5, `never more than 4.5 reference seconds a song second (${maxRate.toFixed(2)})`);
assert(maxJump < 0.06, `the rate changes smoothly, 5 ms apart (${maxJump.toFixed(3)})`);
for (const [s, r] of song.ref.slice(1, -1)) assert(Math.abs(T.refAt(s) - r) < 0.6, `near the anchor ${r} at ${s} (eased: ${T.refAt(s).toFixed(2)})`);
for (let r = 0.5; r < 166; r += 0.71) assert(Math.abs(T.refAt(T.songAtRef(r)) - r) < 2e-3, `seek round trip at ref ${r}`);
assert.equal(createMulaTime(song, () => 1).refAt(s1 + 1), 166.2, 'a fresh map holds the same end');

// ---- the figures, on the song's beats (positive yaw: W -> S -> E -> N; unwrapped, never the short way round)
const songAtBeat = b => { const k = Math.min(Math.max(Math.floor(b), 0), B.length - 2); return B[k] + (b - k) * (B[k + 1] - B[k]); };
const atBeat = b => at(songAtBeat(b)), yawAt = b => atBeat(b).yaw, W = MULA_W, mark = id => MULA_COMPASS.find(c => c.id === id);
const out = (b, id) => { const p = atBeat(b), m = mark(id); return (p.x - MULA_CENTRE[0]) * m.x + (p.z - MULA_CENTRE[1]) * m.z; }; // m towards a mark
const fromCentre = b => { const p = atBeat(b); return Math.hypot(p.x - MULA_CENTRE[0], p.z - MULA_CENTRE[1]); };
const facing = (b, yaw) => Math.cos(yawAt(b) - yaw) > 0.98;
const lens = W + Math.PI / 4; // the play camera looks in between W and S (game/mula-layout.js)
for (let b = 0; b <= 14.5; b += 0.5) assert(fromCentre(b) < 1e-9 && Math.abs(yawAt(b) - W) < 1e-12, `she waits in the middle facing W (${b})`);
for (const [b, id, home, back] of [[21, 'W', 31.5, 'E'], [37, 'E', 47.5, 'W'], [55, 'N', 64, 'S'], [69, 'S', 78, 'N']]) { // A1: four runs
  assert(Math.abs(out(b, id) - 1.5) < 0.05 && facing(b - 1, mark(id).yaw), `A1: out towards ${id}`);
  assert(Math.abs(turns(yawAt(b - 0.5), yawAt(b + 5.5)) - 0.5) < 0.02, `a half turn at ${id}`);
  assert(fromCentre(home) < 0.06 && facing(home, mark(back).yaw), `home facing ${back}`);
}
assert(facing(80, W), 'A2 starts facing W again');
for (let b = 92; b <= 108; b++) assert(Math.abs(fromCentre(b) - 1.5) < 0.05, `A2: the circle round the middle (${b})`);
assert(Math.abs(turns(yawAt(85), yawAt(117)) - 1.5) < 0.01, 'one whole circle between two quarter turns');
assert(Math.abs(out(126.5, 'E') - 1.5) < 0.05 && fromCentre(137) < 0.06 && facing(141, lens + 4 * Math.PI), 'the passada across, home to face the lens for the drumroll');
{ // B: eight culades about her head (0.6 m ahead stays put), four back and forth, four the same way round
  const head = b => { const p = atBeat(b); return [p.x + 0.6 * Math.sin(p.yaw), p.z + 0.6 * Math.cos(p.yaw)]; }, [hx, hz] = head(144);
  for (let b = 144; b <= 176; b += 0.25) assert(Math.hypot(head(b)[0] - hx, head(b)[1] - hz) < 0.2, `B: her head stays put through the culades (${b})`);
  for (const b of [148, 156]) assert(Math.abs(turns(yawAt(b - 4), yawAt(b))) > 0.45 && Math.abs(turns(yawAt(b - 4), yawAt(b + 4))) < 0.03, `a culada and back (${b})`);
  assert(Math.abs(turns(yawAt(160), yawAt(176)) - 2) < 0.03, 'then two whole turns on her head');
}
{ // C: the charges, each with a skid; the two reversals
  let fast = 0; for (let b = 178; b < 182; b += 0.1) fast = Math.max(fast, Math.hypot(atBeat(b + 0.1).x - atBeat(b).x, atBeat(b + 0.1).z - atBeat(b).z) / (songAtBeat(b + 0.1) - songAtBeat(b)));
  assert(fast > 1.5, `C: she charges (${fast.toFixed(2)} m/s)`);
  assert(out(182.5, 'S') > 1.85 && out(184, 'S') < out(182.5, 'S') - 0.3, 'at S, then backs off');
  assert(Math.abs(turns(yawAt(184), yawAt(188)) + 0.5) < 0.02, 'the reversal: half a turn back the other way');
  assert(out(194.5, 'N') > 1.55 && Math.abs(turns(yawAt(196), yawAt(200)) - 0.5) < 0.02 && fromCentre(204) < 0.06, 'through the middle at N, the turn back, home');
}
{ // X into the roll: turns on the spot, faster and faster, braking onto W at the final hit; then she settles
  for (let b = 204; b <= 234; b += 0.5) assert(fromCentre(b) < 0.06, `X: on the spot (${b})`);
  const speed = b => Math.abs(yawAt(b + 0.5) - yawAt(b - 0.5));
  assert(speed(210) < speed(214) && speed(214) < speed(218), 'faster and faster');
  assert(Math.abs(turns(yawAt(204), yawAt(228)) - 2.75) < 0.02 && Math.abs(turns(W, yawAt(234)) - 9) < 1e-3, `ending facing W, ${turns(W, yawAt(234)).toFixed(3)} turns unwrapped`);
}
{ // clear figures, not drift: she sets off once a figure (positions above within the festive weight shift, 4 cm)
  let starts = 0, moving = false;
  for (let t = 0; t < song.tail; t += 1 / 30) {
    const v = Math.hypot(at(t + 1 / 60).x - at(t - 1 / 60).x, at(t + 1 / 60).z - at(t - 1 / 60).z) * 30;
    if (v > 0.15 && !moving) { moving = true; starts++; } else if (v < 0.05) moving = false;
  }
  assert(starts <= 16, `she sets off ${starts} times (the 2017 trace: 28)`);
}

// ---- smooth at any frame rate, across the tempo's ramps: bounded speeds, no step from one frame to the next
for (const hz of [30, 60, 120]) {
  const dt = 1 / hz, p = newMulaPose(), q = newMulaPose();
  let yaw = 0, v = 0, tilt = 0, jerk = 0, last = null;
  for (let t = 0; t < song.tail; t += dt) {
    at(t, p); at(t + dt, q);
    const w = Math.abs(q.yaw - p.yaw) / dt, sp = Math.hypot(q.x - p.x, q.z - p.z) / dt;
    yaw = Math.max(yaw, w); v = Math.max(v, sp); tilt = Math.max(tilt, Math.abs(q.roll - p.roll) / dt, Math.abs(q.pitch - p.pitch) / dt);
    if (last !== null) jerk = Math.max(jerk, Math.abs(w - last) * dt); last = w;
    for (const c of ['x', 'z', 'yaw', 'roll', 'pitch', 'lift']) assert(Number.isFinite(p[c]), `${c} finite at ${t}`);
  }
  assert(yaw < 200 * DEG, `${hz} Hz: turns under 200 deg/s (${(yaw / DEG).toFixed(0)})`);
  assert(v < 2.1, `${hz} Hz: travel under 2.1 m/s (${v.toFixed(2)})`);
  assert(tilt < 180 * DEG, `${hz} Hz: lean and pitch under 180 deg/s (${(tilt / DEG).toFixed(0)})`);
  assert(jerk < 0.05 * (60 / hz) + 0.01, `${hz} Hz: no turn starts or stops in one frame (${jerk.toFixed(3)} rad/s change)`);
}
// ---- the sway is the music's: in A its leans land on every fourth beat of the song's own grid
const quietA = [24, 28, 56, 60, 88, 96, 104, 120]; // away from the tremble
const leanOn = b => { // |roll| on the beat is the local extreme (within 1%: the envelope's own slope shifts the peak a hair)
  let m = 0; for (let x = b - 0.25; x <= b + 0.25; x += 0.01) m = Math.max(m, Math.abs(at(songAtBeat(x)).roll));
  return Math.abs(at(songAtBeat(b)).roll) >= 0.99 * m;
};
for (const b of quietA) assert(leanOn(b), `A: a lean on beat ${b}`);
for (const b of [148, 150, 200, 202]) assert(leanOn(b), `B/C: a lean on beat ${b} (from B on, every second beat)`);
for (const b of [26, 58, 122]) assert(!leanOn(b), `A: no lean half way between (${b})`);
// the comic layer (the Bou's): the knees dip on every beat and the waddle goes a side a beat
for (const b of [24, 60, 170]) { // (away from the culades, whose pitch lifts the shell)
  const on = at(songAtBeat(b)), off = at(songAtBeat(b + 0.5)), l = at(songAtBeat(b + 0.5)).waddle, r = at(songAtBeat(b + 1.5)).waddle;
  assert(off.lift - on.lift > 0.02, `a knee dip on beat ${b} (${(off.lift - on.lift).toFixed(3)} m)`);
  assert(l * r < 0 && Math.abs(l) > 1 * DEG, `the waddle swaps sides beat to beat (${b})`);
}
// FESTA: a little more sway as the music livens, never on the path; nothing extra once she settles
{
  const plain = makeMulaDance(song, { festive: false }), a = newMulaPose(), b = newMulaPose();
  let ratio = 0, path = 0;
  for (let t = 0; t < song.tail; t += 0.05) {
    plain.pose(a, t); at(t, b);
    if (Math.abs(a.roll) > 2 * DEG) ratio = Math.max(ratio, Math.abs(b.roll / a.roll));
    path = Math.max(path, Math.abs(a.yaw - b.yaw));
  }
  assert(ratio > 1.1 && ratio < 1.25, `festive sway at most ~18% over the plain one (${ratio.toFixed(2)})`);
  assert(path < 1e-12, 'the same heading and turns either way');
  for (let t = song.tail - 1; t < song.tail; t += 0.05) assert(Math.abs(at(t).roll) < 2 * DEG, 'quiet at the end');
}
// ---- direct evaluation: seek, rewind, restart give the same pose and shoes
{
  const seq = [61.3, 12.5, 80.7, 61.3, 0, 80.7], f = {};
  const first = seq.map(t => ({ ...at(t), feet: [0, 3, 7].map(i => ({ ...mulaDance.foot(t, i, f) })) }));
  seq.forEach((t, i) => assert.deepEqual({ ...at(t), feet: [0, 3, 7].map(k => ({ ...mulaDance.foot(t, k, f) })) }, first[i], `same pose and shoes at ${t}`));
}
// ---- the song's shoes: planted shoes stay put, swings lift a little and land, no two shoes ever overlap, none left behind
{
  const dt = 1 / 240, feet = [0, 1, 2, 3, 4, 5, 6, 7].map(() => ({})), prev = feet.map(() => null), sep = {}, p = newMulaPose(), nom = {};
  let slide = 0, lift = 0, overlap = Infinity, behind = 0;
  for (let t = dt / 2; t < song.tail; t += dt) {
    at(t, p);
    for (let i = 0; i < 8; i++) {
      const f = mulaDance.foot(t, i, feet[i]);
      if (prev[i]?.contact && f.contact) slide = Math.max(slide, Math.hypot(f.x - prev[i].x, f.z - prev[i].z));
      lift = Math.max(lift, f.y);
      nominalFoot(p, i, nom); behind = Math.max(behind, Math.hypot(f.x - nom.x, f.z - nom.z));
      prev[i] = { ...f };
    }
    for (let i = 0; i < 8; i++) for (let j = i + 1; j < 8; j++) if (Math.abs(feet[i].y - feet[j].y) < SHOE.height) overlap = Math.min(overlap, shoeSeparation(feet[i], feet[j], sep).gap); // (a swing passes above)
  }
  assert(slide < 1e-9, `planted shoes never slide (${slide})`);
  assert(lift <= MULA_STEP.lift + 1e-9, 'a swing lifts at most the step height');
  assert(overlap > -1e-7, `no two shoes intersect (${overlap.toFixed(4)} m at the closest)`);
  assert(behind < 0.6, `every shoe stays under its carrier (${behind.toFixed(2)} m at the farthest)`);
}
// ---- live steps (photo mode, the selector walk, the practice): wherever she is driven the shoes follow, planted
for (const [speed, turn] of [[0, 0], [1, 0], [3.2, 0.6], [9, 0], [0, 4]]) for (const hz of [30, 120]) {
  const st = createStepper(), dt = 1 / hz, shell = { x: 0, z: 0, yaw: 0, roll: 0, pitch: 0 }, nom = {}, last = [];
  let slide = 0, behind = 0, steps = 0;
  for (let k = 0; k < 4 * hz; k++) {
    shell.yaw += turn * dt; shell.x += Math.sin(shell.yaw) * speed * dt; shell.z += Math.cos(shell.yaw) * speed * dt;
    shell.roll = 0.1 * Math.sin(k * dt * 4);
    const feet = st.update(dt, shell);
    for (let i = 0; i < 8; i++) {
      const f = feet[i];
      if (last[i]?.contact && f.contact) slide = Math.max(slide, Math.hypot(f.x - last[i].x, f.z - last[i].z));
      if (last[i]?.contact && !f.contact) steps++;
      if (k > hz) { nominalFoot(shell, i, nom); behind = Math.max(behind, Math.hypot(f.x - nom.x, f.z - nom.z)); }
      last[i] = { ...f };
    }
  }
  assert(slide < 1e-9, `live steps at ${speed} m/s, ${turn} rad/s, ${hz} Hz: planted shoes never slide`);
  assert(behind < 0.45 + speed * 0.12 + turn * 0.12, `...and stay under the carriers (${behind.toFixed(2)} m; a fast spin trails a little more)`);
  if (!speed && !turn) assert.equal(steps, 0, 'standing still with a sway: no marching on the spot');
  else assert(steps > 8, `...stepping as she moves (${steps})`);
}
{ // photo mode's culada (9 rad/s): stepped round like any turn (turning the shoes with her skated them), never left
  // behind on stretched cuffs; planted shoes stay put
  const st = createStepper(), dt = 1 / 60, shell = { x: 0, z: 0, yaw: 0, roll: 0, pitch: 0 }, nom = {}, last = [];
  let planted = 0, lifted = 0, slide = 0;
  for (let k = 0; k < 60; k++) {
    shell.yaw += (k < 21 ? 9 : 0) * dt; const feet = st.update(dt, shell);
    for (let i = 0; i < 8; i++) {
      const f = feet[i], d = Math.hypot(f.x - nominalFoot(shell, i, nom).x, f.z - nom.z);
      if (f.contact) planted = Math.max(planted, d); else lifted = Math.max(lifted, d);
      if (last[i]?.contact && f.contact) slide = Math.max(slide, Math.hypot(f.x - last[i].x, f.z - last[i].z));
      last[i] = { x: f.x, z: f.z, contact: f.contact };
    }
  }
  assert(planted < 0.31 && lifted <= 0.5 + 1e-9, `a culada keeps the shoes under the carriers (${planted.toFixed(2)} m planted, ${lifted.toFixed(2)} m lifted)`);
  assert(slide < 1e-9, `...stepping round, never skating (${slide.toFixed(3)} m)`);
}

// ---- where it all stands: the compass from her opening heading, the attendants on it, clear of the whole dance
const footprint = [];
{
  const box = [[-0.6, -2.0], [0.6, -2.0], [-0.6, 2.22], [0.6, 2.22], [-0.6, 0.11], [0.6, 0.11]], p = newMulaPose(); // her floor box (models/mulassa.js)
  for (let t = 0; t < song.tail; t += 1 / 30) {
    at(t, p); const c = Math.cos(p.yaw), s = Math.sin(p.yaw);
    for (const [x, z] of box) footprint.push([p.x + x * c + z * s, p.z - x * s + z * c]);
  }
}
const clear = (x, z) => footprint.reduce((m, [a, b]) => Math.min(m, Math.hypot(a - x, b - z)), Infinity);
const reach = footprint.reduce((m, [x, z]) => Math.max(m, Math.hypot(x - MULA_CENTRE[0], z - MULA_CENTRE[1])), 0);
assert(reach <= MULA_REACH + 0.02, `the dance stays within ${MULA_REACH} m of its centre (${reach.toFixed(2)})`);
assert.equal(at(0).yaw, W, 'W is her opening heading');
assert.deepEqual(MULA_COMPASS.map(c => c.id), ['W', 'S', 'E', 'N'], 'positive yaw goes W -> S -> E -> N');
for (const h of MULA_HELPERS) {
  const m = MULA_COMPASS.find(c => c.id === h.id), dx = h.x - MULA_CENTRE[0], dz = h.z - MULA_CENTRE[1];
  assert(Math.abs(Math.hypot(dx, dz) - MULA_HELPER_RADIUS) < 1e-9 && Math.abs(dx * m.z - dz * m.x) < 1e-9 && dx * m.x + dz * m.z > 0, `${h.id} on its mark`);
  assert(Math.abs(Math.sin(h.yaw) + dx / MULA_HELPER_RADIUS) < 1e-9 && Math.abs(Math.cos(h.yaw) + dz / MULA_HELPER_RADIUS) < 1e-9, `${h.id} faces the dance`);
  assert(clear(h.x, h.z) >= 0.75, `${h.id} stays 0.75 m clear of her whole dance (${clear(h.x, h.z).toFixed(2)} m)`);
}
for (const [a, r] of MULA_SEATS) { // the seated: hips on the seat, legs ~0.75 m towards the centre
  const c = Math.cos(a), n = Math.sin(a), dx = MULA_COMPASS[0].x * c + MULA_COMPASS[0].z * n, dz = -MULA_COMPASS[0].x * n + MULA_COMPASS[0].z * c;
  const feetAt = clear(MULA_CENTRE[0] + dx * (r - 0.75), MULA_CENTRE[1] + dz * (r - 0.75));
  assert(feetAt > 1, `seated at ${a} rad: their feet 1 m clear of the dance (${feetAt.toFixed(2)})`);
}
// in the plaça: the play camera looks in between W and S, never over an attendant's shoulder; the crowd's ground holds
// every seated member; the attendants stand inside the crowd's shot wedge never
{
  const CAM_AZ = Number(src('scene/stage.js').match(/CAM_AZ = (-?[\d.]+) \* Math\.PI \/ 180/)[1]) * DEG, Y = mulaDanceYaw(CAM_AZ);
  const arena = Number(src('scene/crowd-build.js').match(/arenaMula: ([\d.]+)/)[1]), rad = Number(src('scene/crowd-build.js').match(/adult: ([\d.]+)/)[1]);
  const off = id => { const m = MULA_COMPASS.find(c => c.id === id); return Math.atan2(Math.sin(Y + m.yaw - CAM_AZ), Math.cos(Y + m.yaw - CAM_AZ)); };
  assert(Math.abs(off('W') + Math.PI / 4) < 1e-9 && Math.abs(off('S') - Math.PI / 4) < 1e-9, 'the lens looks in between W and S');
  assert(Math.cos(Y + at(0).yaw - CAM_AZ) > 0.7, 'she opens three-quarter on to the lens');
  const ax = Math.sin(CAM_AZ), az = Math.cos(CAM_AZ);
  for (const h of MULA_HELPERS) {
    const w = mulaToWorld({}, h.x, h.z, Y), along = w.x * ax + w.z * az, side = Math.abs(w.x * az - w.z * ax);
    assert(along <= 0 || side - (1.6 + 0.45 * along) > 0.3, `${h.id} out of the play camera's shot`);
    assert(Math.hypot(w.x, w.z) < arena - 0.3, `${h.id} inside the crowd's ground`);
  }
  for (const [a, r] of MULA_SEATS) assert(r < arena - rad - 0.1, `seated at ${r} m inside the crowd's ground (${arena} m)`);
}
// ---- the practice: her opening stance, swaying, never the song's turns
{
  const p = newMulaPose();
  for (let b = 0; b < 64; b += 0.25) { mulaDance.practice(p, b); assert(Math.abs(p.yaw - W) < 1e-12 && Math.hypot(p.x - MULA_CENTRE[0], p.z - MULA_CENTRE[1]) < 1e-9, `practice stance at ${b}`); }
}
console.log(`mula-dance ok: time map rate <= ${maxRate.toFixed(2)}, dance reach ${reach.toFixed(2)} m, helpers ${MULA_HELPERS.map(h => clear(h.x, h.z).toFixed(2)).join('/')} m clear`);
