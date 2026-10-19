// The Drac reference trial's choreography (dev only, drac-lab.html; the game never imports it). Pure, seekable, no
// allocations: pose(out, beat) fills a dance-drac.js pose for the trial form's arrangement, so the real rig, the
// existing feet planner (makeDracFeet) and the same camera show it next to the current dance.
//
// OBSERVED (Ball del Drac de Valls, El Camp Difusió, Sant Joan 24-6-2018, youtube pm-lEViiPK0; video seconds):
// one carrier walks a rigid beast: both mouths stay open, heads, necks, wings and tail move with the shell. 0-16 short
// alternating steps, sway, mostly front on; 16-20 one turn on the spot; 20-30 sway, the heading opening and closing;
// 30-43 walks out towards the camera, arcs past it through profile and back, returns; 43-60 steps and sway; 60-64 a
// turn on the spot; 64-73 prepares; 73-86 the same walk out and back again; 86-101 consecutive quicker turns;
// 101-104 settles front on. No active fire in this daytime recording.
// AUTHORED (an adaptation, not a transcription): which beat each move lands on, distances, angles, turn direction.
// The video windows map to beats through the trial's own tempo map (docs/drac-reference-trial.md), not video seconds.
import { newDracPose } from '../../game/dance-drac.js';

const TURN = 2 * Math.PI, DEG = Math.PI / 180;
// Per label, beats from the label's start. yaw: [beat, turns], relative to the heading the label starts on (unwrapped).
// x / z: [beat, model units] on the floor, absolute (0, 0 = its spot; +z = towards the camera, the plaça's front).
// sway: the carrier's weight shift, roll in degrees, one lean a bar onto the standing foot. step: 0-1, how much the
// carrier bobs and lifts its feet. Keys inside a label stay before its end; every move starts and ends at rest unless
// the keys around it keep going (monotone cubic: no overshoot, the speed carries through consecutive turns).
const WALK_OUT = { // D and D3: out to its left, in towards the camera, past it through profile and back, home again
  sway: 2, step: 1,
  yaw: [[1, 0], [3.5, -0.25], [6, 0], [13, 0], [16, 0.25], [18, 0.5], [23, 0.5], [26, 0.75], [28, 1]],
  x: [[1, 0], [4, -1.4], [8, -1], [13, -0.3], [17, 0.6], [23, 1.3], [28, 0.4], [30, 0]],
  z: [[1, 0], [4, 0.4], [8, 1.8], [13, 3.4], [17, 3.4], [23, 1.4], [28, 0.3], [30, 0]],
};
export const TRIAL = {
  intro: { sway: 1.2, step: 0.35 },
  pickup: { sway: 2, step: 0.6 },
  A2: { sway: 3, step: 1, // 0-16 s: short steps and sway, front on with small corrections
    yaw: [[2, -0.05], [6, 0.06], [10, -0.06], [14, 0.07], [18, -0.07], [22, 0.06], [26, -0.04], [29, 0]],
    x: [[4, -0.25], [10, 0.25], [16, -0.3], [22, 0.3], [28, 0]], z: [[8, 0.2], [20, -0.15], [28, 0]] },
  B: { sway: 1.5, step: 1, yaw: [[1, 0], [8, 1], [11, 1.06], [13.5, 1]] }, // 16-20 s: one turn on the spot
  C: { sway: 3.5, step: 1, // 20-30 s: the heading opens and closes
    yaw: [[3, 0.13], [7, -0.13], [11, 0.13], [14.5, 0]], x: [[4, 0.35], [8, -0.2], [12, 0.25], [15, 0]], z: [[8, 0.25], [15, 0]] },
  D: WALK_OUT, // 30-43 s
  E: { sway: 3.5, step: 1, // 43-60 s
    yaw: [[2, 0.1], [6, -0.1], [10, 0.1], [14, -0.1], [18, 0.08], [22, 0]], x: [[3, 0.4], [9, -0.4], [15, 0.35], [21, 0]], z: [[6, -0.3], [14, 0.2], [21, 0]] },
  A3: { sway: 3, step: 1 },
  B3: { sway: 1.5, step: 1, yaw: [[3, 0], [10, 1], [13, 1]] }, // 60-64 s: the second turn on the spot
  C3: { sway: 3.5, step: 1, yaw: [[3, 0.1], [7, -0.1], [11, 0.1], [14.5, 0]], x: [[4, -0.3], [10, 0.3], [15, 0]] }, // 64-73 s
  D3: { ...WALK_OUT, yaw: [...WALK_OUT.yaw, [30, 1]] }, // 73-86 s; at rest front on two beats before E3: the spin starts
  // 86-101 s: five turns, 5.5 beats each (~2.2 s at 151 BPM), from D3's last bar. Spin-up 7 beats, spin-down 6.5: a cubic
  // from rest peaks at 4/3 of its mean rate; above ~1.5 rad a beat the planted shoes touch, and at 5-beat turns a quick
  // step's shoe swing passes drac-parts.mjs's frame-jolt limit at 151 BPM (tests/drac-trial.mjs)
  E3: { sway: 1, step: 1, yaw: [[5, 1], [10.5, 2], [16, 3], [21.5, 4]] },
  coda: { sway: 1, step: 1, yaw: [[4, 1]] }, // the fifth ends front on
  roll: { sway: 0, step: 0 }, // 101-104 s: settled
};
// Whole-body reactions to the path (not per part): lean into a turn (deg at full tanh, its rate in rad a beat), lean
// forward walking (deg, units a beat), the bob of each step (model units), the feet's lift drive, fixed jaw and wings.
export const MOTION = { bank: 6, bankRate: 1.6, pitch: 3, pitchSpeed: 0.4, bob: 0.03, drive: 0.9, jaw: 0.45, flap: 0.3 };

const smooth = k => k * k * (3 - 2 * k), clamp01 = k => Math.min(1, Math.max(0, k));
// Monotone cubic through keys (Fritsch-Butland slopes, rest at both ends): C1, never overshoots a key.
function track(keys) {
  const n = keys.length, B = new Float64Array(n), V = new Float64Array(n), M = new Float64Array(n);
  keys.forEach(([b, v], i) => { B[i] = b; V[i] = v; });
  for (let i = 1; i + 1 < n; i++) {
    const h0 = B[i] - B[i - 1], h1 = B[i + 1] - B[i], d0 = (V[i] - V[i - 1]) / h0, d1 = (V[i + 1] - V[i]) / h1;
    M[i] = d0 * d1 <= 0 ? 0 : 3 * (h0 + h1) / ((2 * h1 + h0) / d0 + (h1 + 2 * h0) / d1);
  }
  return { B, V, M, n };
}
function at(T, beat, rate) { // the value, or (rate) its change per beat
  const { B, V, M, n } = T;
  if (beat <= B[0] || beat >= B[n - 1]) return rate ? 0 : beat <= B[0] ? V[0] : V[n - 1];
  let lo = 0, hi = n - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (B[m] <= beat) lo = m; else hi = m; }
  const h = B[hi] - B[lo], s = (beat - B[lo]) / h, s2 = s * s, s3 = s2 * s;
  if (!rate) return (2 * s3 - 3 * s2 + 1) * V[lo] + (s3 - 2 * s2 + s) * h * M[lo] + (3 * s2 - 2 * s3) * V[hi] + (s3 - s2) * h * M[hi];
  return ((6 * s2 - 6 * s) * V[lo] + (3 * s2 - 4 * s + 1) * h * M[lo] + (6 * s - 6 * s2) * V[hi] + (3 * s2 - 2 * s) * h * M[hi]) / h;
}

// The absolute keys of an arrangement ([[beat, label]], ascending) up to `end`. `skipped` counts keys that fell on or
// before an earlier key (an authoring error the tests refuse).
export function trialKeys(arrangement, end, table = TRIAL) {
  const rows = arrangement.filter(([b]) => b < end), first = rows.length ? rows[0][0] : 0;
  const keys = { yaw: [[first, 0]], x: [[first, 0]], z: [[first, 0]], sway: [], step: [] };
  let skipped = 0;
  const push = (list, b, v) => { if (b > list[list.length - 1][0]) list.push([b, v]); else if (list[list.length - 1][1] !== v || b < list[list.length - 1][0]) skipped++; };
  rows.forEach(([start, label], i) => {
    const cue = table[label] ?? {}, stop = i + 1 < rows.length ? rows[i + 1][0] : end, base = keys.yaw[keys.yaw.length - 1][1];
    for (const [b, v] of cue.yaw ?? []) push(keys.yaw, start + b, base + v * TURN);
    for (const axis of ['x', 'z']) for (const [b, v] of cue[axis] ?? []) push(keys[axis], start + b, v);
    // sway and step hold through the label and cross-fade over the beat either side of its start
    const len = stop - start, a = start + Math.min(1, len / 2), z = stop - Math.min(1, len / 2);
    for (const k of ['sway', 'step']) { keys[k].push([a, cue[k] ?? 0]); if (z > a) keys[k].push([z, cue[k] ?? 0]); }
  });
  for (const k of ['sway', 'step']) if (!keys[k].length) keys[k].push([first, 0]);
  return { keys, skipped };
}

export function makeTrialDracDance({ arrangement, end }, table = TRIAL) {
  const { keys, skipped } = trialKeys(arrangement, end, table);
  const T = Object.fromEntries(Object.entries(keys).map(([k, v]) => [k, track(v)]));
  function pose(out, beat) {
    const yaw = at(T.yaw, beat), w = at(T.yaw, beat, true), x = at(T.x, beat), z = at(T.z, beat);
    const vx = at(T.x, beat, true), vz = at(T.z, beat, true), sway = at(T.sway, beat), step = at(T.step, beat);
    const still = 1 - smooth(clamp01(beat - end)); // after the final hit nothing moves
    out.practice = false; out.beat = beat;
    out.yaw = yaw; out.x = x; out.z = z;
    // weight onto the standing foot (foot 0, +x, lifts over beat 0-1 of a bar: lean over to -x), plus into a turn
    out.roll = (sway * DEG * Math.sin(Math.PI * beat) - MOTION.bank * DEG * Math.tanh(w / MOTION.bankRate)) * still;
    out.pitch = MOTION.pitch * DEG * Math.tanh((vx * Math.sin(yaw) + vz * Math.cos(yaw)) / MOTION.pitchSpeed) * still;
    out.lift = MOTION.bob * step * Math.sin(Math.PI * beat) ** 2 * still; // up as a foot passes, down as it lands
    out.drive = MOTION.drive * step;
    out.jaw = MOTION.jaw; out.flap = MOTION.flap;
    out.crouch = 0; out.swing = 0; out.reach = 0; out.whip = 0; out.shake = 0; out.fire = 0; out.rear = 0;
    return out;
  }
  return { pose, keys, skipped, end };
}
export const newTrialPose = newDracPose;
