// The Drac's root path, in REFERENCE seconds (the source video's own clock: Ball del Drac de Valls, Sant Joan 2018,
// pm-lEViiPK0): where the carrier stands and where the shell faces. The game reaches it through figures/drac/drac-time.js
// (song time -> reference seconds); tools/dev/drac-compare shows it against the video. Pure and seekable, no allocations
// per call. Positions are model units on the floor (0, 0 = the "zona intermèdia"; +z towards the source camera, +x
// screen right from it). Yaw is degrees, unwrapped, + = anticlockwise from above (front +z turns to +x, heads to screen
// right); 0 = front to the camera. The game shows this frame through DANCE_FRAME (figures/drac/drac-layout.js).
//
// OBSERVED (steps-v2/phrases-reviewed.json): the order of moves, which way it travels, the holds and closures.
// HEADINGS: observations.json's categorical passes (F-b = front biased to the heads-left side, -20 here; F-a = +25;
// HR +90; BACK 180; HL -90, unwrapped), with the audit's turn counts; the angles between passes are inferred.
// POSITIONS, approximate (dev/drac-compare/camera.js): at 0, 2, 6, 8-8.4 and 12 s the source's feet pixel cast onto the floor through
// the reference camera (its pan / tilt from the background) - 6.3, 5.2, 7.9, 6.4 and 6.5 m from the lens, which the
// figure's apparent height agrees with; at 10 s between the cast (7.6 m) and the height (about 7.2 m); at 14 s (feet
// hidden) nearer the lens and to the right by its head height, short of it (the source head would need ~3.9 m, a
// backward walk straight at the lens); the turn spot from the height at 16.3-29 s (about 5.5 m) and the close passes
// from the source frames (it fills the frame at 33 and passes about 2.4 m from the lens at 36), the return from the
// height at 40 and 44 (about 5.5 m); the second torsion spot, the second arc's start and the final spins from the
// late anchors at 60-104 (camera-landmarks-late.json: closer, then drifting right through the reversed spins). Everything else is
// inferred, not calibrated. Keys repeat a value to hold still (no drift through the holds).
import { DEG } from '../../core/math.js';
const U = 1; // model units (0.492 m each at DRAC_SCALE)
const S0 = [0.63, -0.3], A = [-1.45, 2.25], B = [2.9, -3.5], M = [0.95, -0.62], L = [-1.85, -2.1], P12 = [1.5, -0.76], R = [4.0, 1.8], M2 = [0.6, 1.2];
const S1 = [1.0, 1.1], A2 = [-0.8, 3.3], B2 = [3.0, -1.9], L2 = [-1.3, 1.2], R2 = [1.8, 1.0], M3 = [0.6, 3.2];
// the final spins: closer while they quicken, then drifting right and back while they reverse (86-104 anchors)
const SPIN = [1.0, 3.2], SPIN94 = [1.1, 2.6], SPIN100 = [1.6, 1.4], SPIN104 = [2.5, 1.0];
// the walk out: four strides in profile, the arc to the lens, the close pass, its back, away heads first, settle
const ARC = [[-1.7, 2.5], [-1.3, 5.3], [0.2, 7.4], [2.0, 7.8], [2.85, 4.8], [2.4, 2.0], [1.3, 1.6]]; // ... away (back, then turning HL), then heads first
// the second time it starts from the closer second spot: its first two points are about 1 m nearer the lens
const ARC2 = [[-1.3, 4.1], [-1.3, 5.9], [0.2, 7.4], [2.0, 7.8], [2.8, 5.0], [2.4, 3.6], [1.7, 3.0]];
export const SPOTS = { S0, A, B, M, L, P12, R, M2, S1, A2, B2, L2, R2, M3, SPIN, SPIN104 };
// a walk from P (at t0) to Q (at t1) at an even pace: it gets up to speed in `ramp` s and slows down in the last `ramp`
// (one cubic across a long walk would crawl through its first and last steps)
function glide(t0, P, t1, Q, ramp = 0.35) {
  const f = ramp / 2 / (t1 - t0 - ramp), mix = k => [P[0] + (Q[0] - P[0]) * k, P[1] + (Q[1] - P[1]) * k];
  return [[t0, P], [t0 + ramp, mix(f)], [t1 - ramp, mix(1 - f)], [t1, Q]];
}
const arc = (times, P = ARC) => times.map((t, k) => [t, P[k]]);
// [t, [x, z]]
export const ROOT_KEYS = [
  [0, S0], ...glide(0.2, S0, 2.2, A), ...glide(2.4, A, 6.2, B), ...glide(6.4, B, 8.1, M), ...glide(8.4, M, 10.0, L),
  [10.4, L], [12.0, P12], [13.85, [3.88, 1.65]], [14.2, R], // back to the right, nearer the lens
  ...glide(14.4, R, 16.3, M2), [28.8, M2], // the turn and the torsions over the same spot
  ...arc([31.0, 33.0, 35.2, 36.3, 38.0, 39.8, 40.9]), [41.8, S1], [44.3, S1],
  ...glide(44.3, S1, 46.0, A2).slice(1), ...glide(46.1, A2, 49.9, B2), ...glide(50.0, B2, 53.0, L2), ...glide(54.0, L2, 57.2, R2),
  ...glide(57.25, R2, 58.8, M3), [72.8, M3],
  ...arc([74.4, 76.1, 78.7, 79.6, 81.9, 83.3, 84.7], ARC2), [85.8, SPIN], [88, SPIN], [94.0, SPIN94], [100, SPIN100], [104, SPIN104], [104.8, SPIN104],
].map(([t, [x, z]]) => [t, x * U, z * U]);
// [t, deg]
export const YAW_KEYS = [
  [0, -20], [8.4, -20], [8.9, -45], [9.9, -62], [10.4, -62], [12.4, -50], [14.2, -30], [15.5, -45], [16.1, -25], [16.5, -22], // F-b, opens to HL
  [16.7, 0], [17.6, 90], [18.4, 180], [19.0, 270], [19.6, 335], [20.0, 385], [21.6, 390], // a turn CCW, overshoots to F-a
  [22.0, 345], [22.3, 300], [22.6, 270], [24.2, 270], [25.0, 390], [26.4, 390], [27.2, 270], [31.0, 270], // HL / F-a torsions; walks in HL
  [31.6, 300], [32.8, 340], [34.0, 385], [35.2, 450], [36.3, 450], [37.2, 495], [38.0, 540], [38.7, 585], [39.8, 630], [41.4, 670], [41.8, 700],
  [44.3, 700], [45.5, 680], [46, 680], [48, 685], [49.9, 700], [51.0, 700], [53.0, 670], [54.0, 660], [56.5, 700], [57.3, 690], [58.3, 675],
  [59.0, 680], [59.6, 705], [60.0, 745], [61.0, 810], [61.7, 900], [62.5, 990], [63.1, 1055], [63.5, 1100], [65.0, 1110], // the second turn
  [66.2, 990], [67.4, 990], [68.2, 1110], [69.4, 1110], [70.4, 990], [74.0, 990], // torsions; walks in HL
  [74.6, 1015], [75.2, 1040], [76.1, 1060], [77.1, 1105], [78.7, 1170], [79.6, 1170], [80.4, 1215], [81.9, 1260], [82.5, 1305], [83.3, 1350],
  [84.7, 1350], [85.8, 1400], // the ending, from the dense heading audit: front (F-b), HR, BACK, HL passes
  [86.6, 1420], [87.8, 1530], [88.5, 1620], [88.9, 1710], [89.5, 1780], [90.4, 1890], [90.9, 1980], [91.3, 2070], // 3 quicker turns CCW
  [91.8, 2140], [92.5, 2250], [92.9, 2340], [93.3, 2430], [93.8, 2500], [94.5, 2500], // brakes on F-b (near-identical samples 93.8-94.6)
  [94.8, 2470], [95.1, 2430], [95.5, 2340], [95.9, 2250], [96.2, 2185], [96.4, 2148], [96.5, 2140], // reverses: F-b at 94.6, 3/4 HL by 94.8, HL, BACK, HR, F-a, F-b (it eases out from 94.5)
  [97.2, 1980], [98.0, 1780], [98.8, 1620], [99.6, 1420], [100.2, 1260], [101.0, 1060], [101.6, 900], [102.4, 700], [103.0, 540], // CW
  [104.0, 340], [104.8, 335], // 6 turns CW in all, settles drifting to HL
];
// knee flex 0-1 (body down, poseDrac's crouch) and a weight shift onto one support (deg of roll), both inferred
export const CROUCH_KEYS = [
  [0, 0.03], [19.6, 0.03], [20.6, 0.12], [21.8, 0.08], [22.8, 0.13], [24.2, 0.07], [25.2, 0.13], [26.4, 0.08], [27.4, 0.12], [28.4, 0.05], [28.8, 0.03],
  [41.8, 0.03], [42.5, 0.1], [43.2, 0.05], [43.9, 0.11], [44.3, 0.03], [53, 0.03], [53.5, 0.07], [54, 0.03],
  [63.2, 0.03], [64.2, 0.12], [65.4, 0.08], [66.4, 0.13], [67.5, 0.07], [68.4, 0.13], [69.5, 0.08], [70.6, 0.12], [72.2, 0.05], [72.8, 0.03],
  [93.4, 0.03], [94.1, 0.14], [94.8, 0.06], [103.8, 0.04], [104.4, 0.11], [104.8, 0.09],
];
export const SHIFT_KEYS = [
  [0, 0], [19.8, 0], [21.0, -4], [22.4, 3], [24.4, -4], [25.6, 3], [27.2, -3], [28.5, 0],
  [42, 0], [42.5, 2.5], [43.2, -2.5], [43.9, 2], [44.3, 0],
  [63.4, 0], [64.4, -4], [66, 3], [67.8, -4], [69.2, 3], [71, -3], [72.5, 0], [93.8, 0], [94.3, -3], [94.8, 0], [104, 0], [104.5, 2], [104.8, 0],
];
export const END = 104.8;

// Monotone cubic through keys (Fritsch-Butland slopes, rest at both ends): C1, never overshoots, a repeated value holds.
export function track(keys, col = 1) {
  const n = keys.length, T = new Float64Array(n), V = new Float64Array(n), S = new Float64Array(n);
  keys.forEach((k, i) => { T[i] = k[0]; V[i] = k[col]; });
  for (let i = 1; i < n; i++) if (!(T[i] > T[i - 1])) throw new RangeError(`keys not increasing at ${T[i]}`);
  for (let i = 1; i + 1 < n; i++) {
    const h0 = T[i] - T[i - 1], h1 = T[i + 1] - T[i], d0 = (V[i] - V[i - 1]) / h0, d1 = (V[i + 1] - V[i]) / h1;
    S[i] = d0 * d1 <= 0 ? 0 : 3 * (h0 + h1) / ((2 * h1 + h0) / d0 + (h1 + 2 * h0) / d1);
  }
  return { T, V, S, n };
}
// the value at t, or (rate) its change per second; constant outside the keys
export function at({ T, V, S, n }, t, rate = false) {
  if (!(t > T[0])) return rate ? 0 : V[0];
  if (t >= T[n - 1]) return rate ? 0 : V[n - 1];
  let lo = 0, hi = n - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (T[m] <= t) lo = m; else hi = m; }
  const h = T[hi] - T[lo], s = (t - T[lo]) / h, s2 = s * s, s3 = s2 * s;
  if (!rate) return (2 * s3 - 3 * s2 + 1) * V[lo] + (s3 - 2 * s2 + s) * h * S[lo] + (3 * s2 - 2 * s3) * V[hi] + (s3 - s2) * h * S[hi];
  return ((6 * s2 - 6 * s) * V[lo] + (3 * s2 - 4 * s + 1) * h * S[lo] + (6 * s - 6 * s2) * V[hi] + (3 * s2 - 2 * s) * h * S[hi]) / h;
}

export const TRACKS = Object.freeze({
  x: track(ROOT_KEYS, 1), z: track(ROOT_KEYS, 2), yaw: track(YAW_KEYS), crouch: track(CROUCH_KEYS), shift: track(SHIFT_KEYS),
});
// the root at t: {x, z, yaw (rad)}
export function rootAt(out, t) {
  out.x = at(TRACKS.x, t); out.z = at(TRACKS.z, t); out.yaw = at(TRACKS.yaw, t) * DEG;
  return out;
}
