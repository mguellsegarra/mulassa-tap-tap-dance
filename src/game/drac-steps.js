// The carrier's foot plan, in REFERENCE seconds (game/drac-path.js): every lift and landing is authored, never derived
// from root drift (game/drac-feet.js's planner keeps a fixed cadence and adds steps, which would break the audited counts
// and holds). Pure and seekable: feetAt(out, t, practice, front) is the feetAt poseDrac takes; the pose's `beat` carries
// the reference seconds here (game/drac-pose.js), never a music beat. A planted foot rides a frozen root anchor (scene/drac-motion.js adds the rotated rest offset
// ±FOOT_X, FOOT_Z), so its sole stays fixed on the floor while the shell turns over it.
//
// Status of each step: 'observed' (an arrival the audit verified; legInferred when the leg was not identified),
// 'probable' (partly hidden), 'support' (an observed support action, not a counted placement) and 'adaptation' (count,
// timing or leg unknown in the video: authored so the shell can travel or turn; never a measurement).
import { rootAt, TRACKS, at, END } from './drac-path.js';
import { FOOT_X, FOOT_Z } from '../scene/models/drac.js';

// shortcut: which trouser is the carrier's left is not verified; F (flowers) rides leg 0 (+x, the carrier's left), C leg 1
export const LEG = { F: 0, C: 1 }, LEG_NAME = ['F', 'C'];
// Sole height at the top of each kind of swing (model units). The audited plan retains its original arrival and
// takeoff times; the airborne trajectory below is an interpretation, with a rounded arc instead of a level shelf.
// base half-width added outward (model units): a carrier under the shell walks a little wide
const WIDE = { step: 0.08, back: 0.08, stride: 0.08, close: 0.04, pivot: 0.1, open: 0.1, adjust: 0.04 };
const H = { step: 0.09, back: 0.07, close: 0.05, adjust: 0.025, open: 0.035, pivot: 0.05, stride: 0.16 };
const REACH = { stride: 0.9 };
export const KIND_LABEL = { step: 'pas', back: 'pas enrere', close: 'tancament', adjust: 'ajust', open: 'obertura', pivot: 'pivot', stride: 'gambada' };
// i18n-ok: dev-only comparator labels (drac-compare)
export const STATUS_LABEL = { observed: 'observada', probable: 'probable', support: 'acció de suport', adaptation: 'adaptació (no mesurada)' };
export const PIVOT_DEG = 45; // turn steps: one placement per 45 deg of shell rotation (inferred: keeps both soles clear)
const DEG = Math.PI / 180;
const O = 'observed', P = 'probable', SU = 'support', AD = 'adaptation';

// [leg, up, down, kind, status, opts]; each footprint sits under its hip's path over the stance (hipCentre); opts: keep
// (an adjustment almost in place: at most ADJUST from its previous spot), yaw (deg, absolute) / yawAdd (deg on the root's) / yawAt (root yaw at that time; default the stance's middle),
// wide (model units outward: an open base), legInferred.
const walk = (first, downs, kind, status, swing, lastKind = kind) => downs.map((d, k) =>
  [(LEG[first] + k) % 2 ? 'C' : 'F', d - swing, d, k === downs.length - 1 ? lastKind : kind, status]);
// alternate placements while the shell turns from t0 to t1, one each PIVOT_DEG; the last two set the base (opts.last)
function pivots(t0, t1, first, last) {
  const y0 = at(TRACKS.yaw, t0), y1 = at(TRACKS.yaw, t1), n = Math.max(2, Math.round(Math.abs(y1 - y0) / PIVOT_DEG)), d = (y1 - y0) / n;
  const cross = y => { let lo = t0, hi = t1; for (let j = 0; j < 50; j++) { const m = (lo + hi) / 2; if ((at(TRACKS.yaw, m) - y) * Math.sign(d) < 0) lo = m; else hi = m; } return hi; };
  const rows = [];
  let prev = t0;
  for (let k = 1; k <= n; k++) {
    const land = k === n ? t1 : cross(y0 + k * d), swing = Math.min(0.4, 0.85 * (land - prev));
    rows.push([(LEG[first] + k - 1) % 2 ? 'C' : 'F', land - swing, land, k > n - 2 ? 'open' : 'pivot', AD, k > n - 2 ? { ...last } : {}]);
    prev = land;
  }
  return rows;
}

const ROWS = [
  // 0-2.2: 3 gaining + 1 closing; 2.2-6.4: 8 back, the last closes; 6.4-8.4: 3 + short closing (first-steps.md). Lifts are
  // inferred: just after the other foot lands (the audit times arrivals only)
  ['F', 0.20, 0.60, 'step', O], ['C', 0.68, 1.10, 'step', O], ['F', 1.18, 1.60, 'step', O], ['C', 1.68, 2.05, 'close', O],
  ['F', 2.38, 2.70, 'back', O], ['C', 2.76, 3.10, 'back', O], ['F', 3.20, 3.70, 'back', O], ['C', 3.76, 4.10, 'back', O],
  ['F', 4.20, 4.70, 'back', O], ['C', 4.76, 5.15, 'back', O], ['F', 5.22, 5.70, 'back', O], ['C', 5.76, 6.10, 'close', O],
  ['F', 6.38, 6.70, 'step', O], ['C', 6.76, 7.20, 'step', O], ['F', 7.26, 7.65, 'step', O], ['C', 7.72, 8.00, 'close', O],
  // 8.4-10.4: 3 + C adjusts almost in place (its heading follows the profile); 10.4-14.4: 5 clear + 3 hidden
  ['F', 8.30, 8.70, 'step', O], ['C', 8.76, 9.15, 'step', O], ['F', 9.22, 9.70, 'step', O], ['C', 9.90, 10.05, 'adjust', SU, { keep: true, yawAt: 10.2 }],
  ['F', 10.30, 10.70, 'back', O], ['C', 10.76, 11.20, 'back', O], ['F', 11.26, 11.70, 'back', O], ['C', 11.76, 12.20, 'back', O],
  ['F', 12.26, 12.70, 'back', O], ['C', 12.76, 13.20, 'back', P], ['F', 13.26, 13.70, 'back', P], ['C', 13.76, 14.10, 'back', P],
  // 14.4-16.7: 3 + C opens its toe, F unloads and reorients while C holds
  ['F', 14.20, 14.60, 'step', O], ['C', 14.66, 15.10, 'step', O], ['F', 15.16, 15.60, 'step', O],
  ['C', 15.90, 16.05, 'open', SU, { yawAdd: 30, wide: 0.1 }], ['F', 16.30, 16.55, 'adjust', SU, { keep: true, yawAt: 17.0 }],
  ...pivots(16.7, 19.8, 'C', { yaw: 330, wide: 0.15 }), // one turn CCW; the base opens for the torsions (19.8-28.2: no steps)
  ['C', 28.20, 28.60, 'close', O, { legInferred: true }],
  ['F', 28.75, 29.30, 'stride', O], ['C', 29.50, 30.30, 'stride', O], ['F', 30.50, 31.30, 'stride', O], ['C', 31.50, 32.30, 'stride', O],
  ...walk('F', [33.0, 33.6, 34.2, 34.8, 35.4, 36.0, 36.6, 37.2, 37.8, 38.4, 39.0], 'step', AD, 0.45), // feet out of frame: a cadence that keeps the hips over the feet through the close pass and its turn
  ['C', 39.30, 39.90, 'step', O, { legInferred: true }], ['F', 40.20, 40.80, 'step', O, { legInferred: true }],
  ...pivots(40.9, 41.8, 'C', { yaw: 700, wide: 0.1 }), // gathers, pivots to the front, settles (42-44.3: no steps)
  // 44.3-60: the path repeats block 1; counts unknown except 57.7 (probable) and 58.3 / 58.75 (verified)
  ...walk('F', [44.75, 45.15, 45.55, 45.95], 'step', AD, 0.32, 'close'),
  ...walk('F', [46.45, 46.95, 47.45, 47.95, 48.45, 48.95, 49.4, 49.8], 'back', AD, 0.32, 'close'),
  ...walk('F', [50.45, 50.95, 51.45, 52.0, 52.6, 53.05], 'step', AD, 0.35, 'close'),
  ...walk('F', [54.45, 54.95, 55.45, 55.9, 56.35, 56.8], 'back', AD, 0.35),
  ['F', 57.25, 57.70, 'stride', P, { legInferred: true }], ['C', 58.05, 58.30, 'stride', O], ['F', 58.32, 58.75, 'stride', O],
  ...pivots(60.0, 63.4, 'C', { yaw: 1050, wide: 0.15 }), // the second turn CCW; torsions 63.4-71.7
  ['C', 72.00, 72.45, 'close', SU, { legInferred: true }],
  ['F', 72.85, 73.40, 'stride', O], ['C', 73.60, 74.40, 'stride', O], ['F', 74.60, 75.40, 'stride', O], ['C', 75.55, 76.30, 'stride', O],
  ...walk('F', [77.0, 77.7, 78.4, 79.1, 79.8, 80.5, 81.2, 81.9, 82.6, 83.3, 84.0, 84.7], 'step', AD, 0.5),
  ...pivots(84.8, 93.8, 'F', { yaw: 2500, wide: 0.15 }), // back to the spot, three quicker turns CCW, brakes front on
  ...pivots(94.65, 104.0, 'C', { yaw: 340, wide: 0.12 }), // six turns CW: the reversal starts inside the audited 94.6-94.8
  ['C', 104.2, 104.45, 'adjust', AD, { keep: true, yawAt: 104.8, wide: 0.12 }],
];

const R = { x: 0, z: 0, yaw: 0 };
// 0-16.7: the opening walks travel across the shell's heading (the observed front stays F-b while the floor-cast path
// runs to the sides), so a walking footprint turns towards its own phrase's travel (backwards for a back step), at most
// WALK_TURN off the shell: never past 90 deg, where the hips' left / right would swap. Closes, adjustments and openings
// keep their authored heading; the footprint's position stays under the shell's hip.
const WALK_TURN = 75 * DEG, OPENING = [0, 2.2, 6.4, 8.4, 10.4, 14.4, 16.7];
function walkTurn(s, yaw) {
  if (s.down >= OPENING.at(-1) || (s.kind !== 'step' && s.kind !== 'back')) return 0;
  let k = 0;
  while (s.down >= OPENING[k + 1]) k++;
  const P = rootAt({}, OPENING[k]), Q = rootAt({}, OPENING[k + 1]);
  const go = Math.atan2(Q.x - P.x, Q.z - P.z) + (s.kind === 'back' ? Math.PI : 0);
  const d = Math.atan2(Math.sin(go - yaw), Math.cos(go - yaw));
  return Math.max(-WALK_TURN, Math.min(WALK_TURN, d));
}
// the centre of the smallest circle round the hip's floor point (the root plus the rotated rest offset) over [t0, t1]
function hipCentre(rx, t0, t1) {
  const P = [];
  for (let j = 0; j <= 24; j++) {
    rootAt(R, t0 + (t1 - t0) * j / 24);
    P.push([R.x + Math.cos(R.yaw) * rx + Math.sin(R.yaw) * FOOT_Z, R.z - Math.sin(R.yaw) * rx + Math.cos(R.yaw) * FOOT_Z]);
  }
  const c = [P.reduce((a, p) => a + p[0], 0) / P.length, P.reduce((a, p) => a + p[1], 0) / P.length];
  for (let k = 1; k <= 400; k++) { // Badoiu-Clarkson: step towards the farthest point
    let far = P[0], d = -1;
    for (const p of P) { const e = Math.hypot(p[0] - c[0], p[1] - c[1]); if (e > d) { d = e; far = p; } }
    c[0] += (far[0] - c[0]) / (k + 1); c[1] += (far[1] - c[1]) / (k + 1);
  }
  return c;
}
// a footprint's sole as a floor rectangle grown by `m` (model units): [centre x, z, cos, sin, half width, half length]
function sole(a, i, m) {
  const c = Math.cos(a.yaw), n = Math.sin(a.yaw), side = i ? -a.wide : a.wide, rx = i ? -FOOT_X : FOOT_X, lz = FOOT_Z + 0.08;
  return [a.x + c * (side + rx) + n * lz, a.z - n * (side + rx) + c * lz, c, n, 0.21 + m, 0.35 + m];
}
function soles(a, b) { // separating axes of two rectangles from sole()
  for (const [c, n] of [[a[2], a[3]], [b[2], b[3]]]) for (const [ux, uz] of [[c, -n], [n, c]]) {
    const r = q => Math.abs(q[2] * ux - q[3] * uz) * q[4] + Math.abs(q[3] * ux + q[2] * uz) * q[5]; // half extent along (ux, uz)
    if (Math.abs((a[0] - b[0]) * ux + (a[1] - b[1]) * uz) >= r(a) + r(b)) return false;
  }
  return true;
}
const CLEAR = 0.03, BULGE = 0.16, ADJUST = 0.22;
// the swinging foot's anchor-like pose part way (w) from A to B, its outward curve folded into `wide` (as feetAt draws it)
const between = (A, B, w, i) => ({ x: A.x + (B.x - A.x) * w, z: A.z + (B.z - A.z) * w, yaw: A.yaw + (B.yaw - A.yaw) * w,
  wide: A.wide + (B.wide - A.wide) * w + BULGE * Math.sin(Math.PI * w) }); // each sole grown by this: 6 cm between the shoes' boxes
function build() {
  const steps = ROWS.map(([leg, up, down, kind, status, o = {}], n) => ({ n, leg, i: LEG[leg], up, down, kind, status, legInferred: !!o.legInferred, o }));
  const legs = [0, 1].map(i => steps.filter(s => s.i === i).sort((a, b) => a.up - b.up));
  const init = [0, 1].map(() => { rootAt(R, 0); return { x: R.x, z: R.z, yaw: R.yaw, wide: 0 }; });
  for (const list of legs) list.forEach((s, k) => {
    if (!(s.down > s.up) || (k && !(s.up >= list[k - 1].down))) throw new RangeError(`step ${s.leg} ${s.up}-${s.down} overlaps`);
    const next = list[k + 1], end = next ? next.up : Math.max(s.down + 0.5, END), a = (s.down + end) / 2;
    let yaw = rootAt(R, s.o.yawAt ?? a).yaw;
    if (s.o.yaw !== undefined) yaw = s.o.yaw * DEG;
    yaw += (s.o.yawAdd ?? 0) * DEG;
    yaw += walkTurn(s, yaw);
    // the footprint: the sole under the middle of the hip's whole path over the stance (its smallest enclosing circle),
    // so the leg reaches it from landing to takeoff, not only at one instant
    const rx = s.i ? -FOOT_X : FOOT_X, c = hipCentre(rx, s.down, end);
    s.anchor = { x: c[0] - Math.cos(yaw) * rx - Math.sin(yaw) * FOOT_Z, z: c[1] + Math.sin(yaw) * rx - Math.cos(yaw) * FOOT_Z, yaw, wide: s.o.wide ?? WIDE[s.kind], t: a };
    s.h = H[s.kind]; s.reach = REACH[s.kind] ?? 0.92;
  });
  // in landing order, each footprint clears the other foot's: the one it swings past (planted all through its swing, as
  // one foot is always down) - a later one checks this one in turn. It steps outward along its own side, never across
  // (so a swing between two clear footprints stays clear of the planted shoe too); `keep` stays on its previous spot.
  steps.sort((a, b) => a.down - b.down || a.i - b.i);
  const last = [...init];
  for (const s of steps) {
    const a = s.anchor;
    s.from = last[s.i];
    const other = sole(last[1 - s.i], 1 - s.i, CLEAR);
    const clash = () => soles(sole(a, s.i, CLEAR), other) || [0.1, 0.25, 0.5, 0.75, 0.9].some(w => soles(sole(between(s.from, a, w, s.i), s.i, CLEAR), other));
    if (s.o.keep) { // an adjustment almost in place: its sole moves towards its own spot by at most ADJUST, whatever it turns
      if (s.o.wide === undefined) a.wide = s.from.wide;
      const p = sole(s.from, s.i, 0), q = sole(a, s.i, 0), dx = q[0] - p[0], dz = q[1] - p[1], k0 = Math.min(1, ADJUST / (Math.hypot(dx, dz) || 1));
      const x0 = a.x - q[0] + p[0], z0 = a.z - q[1] + p[1]; // the anchor that leaves its sole where it was
      for (const f of [1, 0.75, 0.5, 0.25, 0]) { a.x = x0 + dx * k0 * f; a.z = z0 + dz * k0 * f; if (!clash()) break; } // less if the other foot is there
    }
    for (let k = 0; k < 40 && clash(); k++) a.wide += 0.015;
    last[s.i] = Object.freeze(a);
    Object.freeze(s.o);
  }
  steps.forEach(Object.freeze);
  return { steps: Object.freeze(steps), legs };
}
const { steps: PLAN_, legs: LEGS } = build();
export const PLAN = PLAN_;
const UP = LEGS.map(l => Float64Array.from(l, s => s.up));

const quintic = q => q * q * q * (10 + q * (-15 + 6 * q));
const clamp01 = k => Math.min(1, Math.max(0, k));
// the index of leg i's last step to lift by t (-1: none yet)
function lastUp(i, t) {
  const L = UP[i];
  if (!(t >= L[0])) return -1;
  let lo = 0, hi = L.length - 1;
  while (lo < hi) { const m = (lo + hi + 1) >> 1; if (L[m] <= t) lo = m; else hi = m - 1; }
  return lo;
}
// where along its swing leg i is at t (0-1), or -1 while planted
export function swingAt(i, t) {
  const k = lastUp(i, t);
  if (k < 0) return -1;
  const s = LEGS[i][k];
  return t < s.down ? (t - s.up) / (s.down - s.up) : -1;
}
// how much leg i's swing moves the body at t: a zero-slope bump (sin^2) over the swing, scaled down for short swings
// (a heavy shell does not shake at the rate of a quick pivot)
export function bodyEnv(i, t) {
  const k = lastUp(i, t);
  if (k < 0) return 0;
  const s = LEGS[i][k], d = s.down - s.up;
  if (!(t < s.down)) return 0;
  const q = Math.sin(Math.PI * (t - s.up) / d);
  return q * q * Math.min(1, (d / 0.4) ** 2);
}
// the step leg i is on at t: the one it swings in or last landed with (null before its first)
export function stepAt(i, t) { const k = lastUp(i, t); return k < 0 ? null : LEGS[i][k]; }

// an anchor's root sample with its outward opening applied (heading front + yaw)
function place(f, a, i, front) {
  const r = front + a.yaw, side = i ? -a.wide : a.wide;
  f.x = a.x + Math.cos(r) * side; f.z = a.z - Math.sin(r) * side; f.yaw = a.yaw;
}
export const newFeet = () => [0, 1].map(() => ({ x: 0, z: 0, yaw: 0, lift: 0 }));
const A0 = { x: 0, z: 0, yaw: 0 }, B0 = { x: 0, z: 0, yaw: 0 };
// feet[i] = {x, z, yaw, lift}: the root sample foot i rides and its sole height. `practice` is ignored.
export function feetAt(feet, t, practice, front = 0) {
  for (let i = 0; i < 2; i++) {
    const f = feet[i], k = lastUp(i, t);
    if (k < 0) { place(f, LEGS[i][0].from, i, front); f.lift = 0; continue; }
    const s = LEGS[i][k];
    if (!(t < s.down)) { place(f, s.anchor, i, front); f.lift = 0; continue; }
    place(A0, s.from, i, front); place(B0, s.anchor, i, front);
    // A small clearance margin at either end, then travel across the whole swing. The former early arrival and long
    // constant-height plateau made the shoe look suspended on a rail. Both ends still have zero velocity.
    const q = (t - s.up) / (s.down - s.up), w = quintic(clamp01((q - 0.06) / 0.88));
    f.x = A0.x + (B0.x - A0.x) * w; f.z = A0.z + (B0.z - A0.z) * w; f.yaw = A0.yaw + (B0.yaw - A0.yaw) * w;
    // the swinging foot curves out round the planted one (zero at both ends)
    const out = (i ? -BULGE : BULGE) * Math.sin(Math.PI * w), r0 = front + f.yaw;
    f.x += Math.cos(r0) * out; f.z -= Math.sin(r0) * out;
    const arc = Math.sin(Math.PI * q);
    // Round the crest without flattening it; short eased toes at either end make the contact velocity/acceleration
    // zero. A squared sine lowered the foot too early on long reaches, before the carrier had caught up with it.
    f.lift = s.h * arc * quintic(clamp01(q / 0.12)) * quintic(clamp01((1 - q) / 0.12));
  }
  return feet;
}
