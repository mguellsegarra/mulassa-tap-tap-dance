// The carrier's feet: planted on the floor while they carry, a short step through the air between. Pure and seekable like
// the dance (no frame state): a foot's footprint is a function of the beat (and `front`). A planted foot rides a frozen
// copy of the root (dracRoot at one beat of its stance, its anchor), so its world spot and heading never change while the
// root sways and turns over it; a swinging foot lifts, rides from the last anchor to the next, and sets down.
// scene/drac-motion.js turns these root samples into the shoe and trousers (the model's rest offsets come in there).
//
// Cadence, per 2-beat bar: CALM steps one foot a beat (the first foot just after the downbeat), QUICK twice as fast for
// the turns and the fast sways, where a calm stance would let the root drift too far from its feet. Every template keeps
// both feet down across the bar line, so any sequence concatenates. Chosen per instance from its root path (song only;
// the practice is calm and front on, CALM throughout). Before bar 0 it steps CALM in place (the root is still there);
// after LAST_BAR each foot stays on its last spot, which its last step reached under the root already at rest.
import { dracRoot, dracPose, dracPractice, newDracPose, END_BEAT } from './dance-drac.js';

const CALM = [[0, 0.15, 0.85], [1, 1.15, 1.85]]; // [foot, takeoff, landing] in bar beats
const QUICK = [[0, 0.04, 0.46], [1, 0.54, 0.96], [0, 1.04, 1.46], [1, 1.54, 1.96]];
// Step height combines drive/load with sole travel. The stride term is capped before load; max caps the final height.
// rise and lag are swing fractions: travel starts above 3 mm (quintic(0.4) of the least lift).
export const STEP = { m: 0.03, min: 0.012, far: 0.08, cap: 0.055, max: 0.059, rise: 0.2, lag: 0.08 };
// planting: the most a calm stance may let the root move away from a foot (m, its spot plus its heading at REACH)
export const DRIFT_MAX = 0.2, REACH = 0.36;
// Each foot's rest spot and sole dimensions; INWARD weights inward drift when choosing a stance anchor.
export const REST = { x: 0.36, z: 0.05 }, SOLE = { toe: 0.43, heel: 0.27, side: 0.21 }, INWARD = 4;

const quintic = q => q * q * q * (10 + q * (-15 + 6 * q)); // 0 -> 1, no speed or acceleration at either end
const clamp01 = k => Math.min(1, Math.max(0, k));
export const newDracFeet = () => [0, 1].map(() => ({ x: 0, z: 0, yaw: 0, lift: 0 }));

// Each preview owns its plan and scratch poses. The default uses the original root evaluator, preserving the
// exact stance anchor search (and practice); edited plans sample their own factory's bounded root path.
export function makeDracFeet(dance, end) {
  const rootPose = newDracPose();
  const sampleRoot = (out, beat, practice) => {
    if (practice || dance.pose === dracPose) return dracRoot(out, beat, practice);
    dance.pose(rootPose, beat);
    out.x = rootPose.x; out.z = rootPose.z; out.yaw = rootPose.yaw;
    return out;
  };
  const LAST_BAR = Math.max(0, Math.floor(end / 2) - 1); // the last steps land in the closing roll, on a root already at rest
  const FINAL = end + 1; // the root has settled by then
  const A = { x: 0, z: 0, yaw: 0 }, B = { x: 0, z: 0, yaw: 0 }, V0 = { x: 0, z: 0, yaw: 0 }, P = newDracPose();
  const S = [0, 1, 2, 3, 4].map(() => ({ x: 0, z: 0, yaw: 0 }));
  // how far the sole point (x, z) of a foot moves from anchor A to anchor B (c, s: cos and sin of each one's heading)
  const go = (x, z, ca, sa, cb, sb) => Math.hypot(B.x - A.x + (cb - ca) * x + (sb - sa) * z, B.z - A.z - (sb - sa) * x + (cb - ca) * z);

  // the song's plan: each foot's swings in order, [UP[i][k], DOWN[i][k]]; swing k < 0 is CALM bar k by arithmetic
  const UP = [[], []], DOWN = [[], []];
  {
    const quick = new Uint8Array(LAST_BAR + 1), drift = (a, b) => { // how far a foot planted at root(a) is from where root(b) carries it
      sampleRoot(A, a, false); sampleRoot(B, b, false);
      return Math.hypot(A.x - B.x, A.z - B.z) + 2 * REACH * Math.abs(Math.sin((A.yaw - B.yaw) / 2));
    };
    const build = () => {
      UP[0].length = UP[1].length = DOWN[0].length = DOWN[1].length = 0;
      for (let n = 0; n <= LAST_BAR; n++) for (const [i, t0, t1] of quick[n] ? QUICK : CALM) { UP[i].push(2 * n + t0); DOWN[i].push(2 * n + t1); }
    };
    // a stance too loose for CALM turns the bars it touches QUICK; QUICK is the finest there is
    for (let changed = true; changed;) {
      build(); changed = false;
      for (let i = 0; i < 2; i++) for (let k = 0; k + 1 < UP[i].length; k++) {
        const L = DOWN[i][k], T = UP[i][k + 1], a = (L + T) / 2;
        let worst = 0;
        for (let b = L; b <= T; b += 1 / 16) worst = Math.max(worst, drift(a, b));
        worst = Math.max(worst, drift(a, T));
        if (worst <= DRIFT_MAX) continue;
        for (let n = Math.floor(L / 2); n <= Math.min(LAST_BAR, Math.floor(T / 2)); n++) if (!quick[n]) { quick[n] = 1; changed = true; }
      }
    }
  }

  const up = (i, k, pr) => (pr || k < 0 ? 2 * k + i + CALM[0][1] : k < UP[i].length ? UP[i][k] : Infinity);
  const down = (i, k, pr) => (pr || k < 0 ? 2 * k + i + CALM[0][2] : k < DOWN[i].length ? DOWN[i][k] : Infinity);
  function lastUp(i, b, pr) { // the last swing to take off by `b`
    const L = UP[i];
    if (pr || b < L[0]) return Math.floor((b - i - CALM[0][1]) / 2);
    let lo = 0, hi = L.length - 1;
    while (lo < hi) { const m = (lo + hi + 1) >> 1; if (L[m] <= b) lo = m; else hi = m - 1; }
    return lo;
  }
  // The anchor of the stance after swing k: the beat whose root the foot is planted under. Of 17 beats across the stance,
  // the one where the foot strays least from its rest spot under the root over the stance (5 samples, landing to takeoff),
  // straying inward (toward the other leg) counting INWARD times: feet planted a step apart stand where the root was a
  // step apart, and a sideways sway or a turn would close them onto each other. Sideways is the root's own x, so it
  // depends on `front` (the travel is not turned by it).
  function anchor(i, k, pr, front) {
    const L = down(i, k, pr), T = up(i, k + 1, pr);
    if (T === Infinity) return Math.max(FINAL, L);
    for (let j = 0; j < 5; j++) sampleRoot(S[j], L + (T - L) * j / 4, pr);
    const rx = i ? -REST.x : REST.x;
    let best = L, cost = Infinity;
    for (let j = 0; j <= 16; j++) {
      const a = L + (T - L) * j / 16;
      sampleRoot(V0, a, pr);
      const c0 = Math.cos(front + V0.yaw), s0 = Math.sin(front + V0.yaw), x = V0.x + c0 * rx + s0 * REST.z, z = V0.z - s0 * rx + c0 * REST.z;
      let c = 0;
      for (const r of S) {
        const cr = Math.cos(front + r.yaw), sr = Math.sin(front + r.yaw), dx = x - r.x, dz = z - r.z, y = V0.yaw - r.yaw;
        const lx = cr * dx - sr * dz - rx, lz = sr * dx + cr * dz - REST.z;
        // the sole's inner edge, toe and heel: a heading off the root's swings one of them in
        const e = Math.sin(y) * SOLE.toe, f = Math.sin(y) * SOLE.heel;
        c = Math.max(c, Math.hypot(lx, lz) + INWARD * Math.max(0, (i ? lx : -lx) + Math.max(i ? e : -e, i ? -f : f)));
      }
      if (c < cost) { cost = c; best = a; }
    }
    return best;
  }


  // feet[i] = the root sample foot i rides ({x, z, yaw}, yaw unwrapped) and its sole's height. `beat` is the pose's beat,
  // `practice` its mode (pose.beat, pose.practice), `front` the heading poseDrac adds to the root's.
  function feetAt(feet, beat, practice, front = 0) {
    for (let i = 0; i < 2; i++) {
      const f = feet[i], k = lastUp(i, beat, practice), t0 = up(i, k, practice), t1 = down(i, k, practice);
      if (!(beat < t1)) { sampleRoot(f, anchor(i, k, practice, front), practice); f.lift = 0; continue; }
      sampleRoot(A, anchor(i, k - 1, practice, front), practice); sampleRoot(B, anchor(i, k, practice, front), practice);
      const s = (beat - t0) / (t1 - t0), w = quintic(clamp01((s - STEP.lag) / (1 - 2 * STEP.lag)));
      f.x = A.x + (B.x - A.x) * w; f.z = A.z + (B.z - A.z) * w; f.yaw = A.yaw + (B.yaw - A.yaw) * w;
      // one height per step, from the pose at its middle: a drive or crouch changing mid-step never drags a moving foot
      // down. The foot on the side the body leans away from carries less and lifts more.
      const mid = (t0 + t1) / 2;
      if (practice) dracPractice(P, mid - 20); else dance.pose(P, mid); // dracPractice(x) poses 20 + (x mod 16)
      // a long step or a big pivot lifts with its sole's travel (its farthest corner, anchor to anchor), capped before the
      // load (which counts half)
      const unload = 0.7 * Math.tanh((i ? -1 : 1) * Math.sin(P.roll + P.shake) * 3.5), rx = i ? -REST.x : REST.x;
      const ca = Math.cos(front + A.yaw), sa = Math.sin(front + A.yaw), cb = Math.cos(front + B.yaw), sb = Math.sin(front + B.yaw);
      const x0 = rx - SOLE.side, x1 = rx + SOLE.side, z0 = REST.z + SOLE.toe, z1 = REST.z - SOLE.heel;
      const t = Math.max(go(x0, z0, ca, sa, cb, sb), go(x0, z1, ca, sa, cb, sb), go(x1, z0, ca, sa, cb, sb), go(x1, z1, ca, sa, cb, sb));
      const far = Math.min(STEP.cap, STEP.far * t);
      const h = Math.min(STEP.max, Math.max(STEP.min, STEP.m * P.drive * (1 - P.crouch) * (1 + unload), far * (1 + unload / 2)));
      f.lift = h * quintic(clamp01(s / STEP.rise)) * quintic(clamp01((1 - s) / STEP.rise));
    }
    return feet;
  }
  return feetAt;
}
export const dracFeet = makeDracFeet({ pose: dracPose }, END_BEAT);
