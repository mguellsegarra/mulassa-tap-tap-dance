// The Drac off the song (on the splash beside her, on the selector once picked): it wanders about the plaça showing off
// its dance. The body is the song's own choreography looped over B → E (the turns, the rear, the frenzy with its fire on
// the downbeats), a little tamer, with a CREMA now and then (drac-show.js reads SHOWCASE.crema). The feet step the practice's
// stance (seamless round the loop); the walk and every turn ride the rig's parent, while each shoe stays planted on the
// plaça's floor and steps once a beat (faster when driven at speed) to under where the root goes (it read as skating when they rode along).
import { dracPose, dracRoot } from '../game/dance-drac.js';
import { TAU } from '../core/anim.js';
import { PHOTO } from '../game/photo-control.js';

// the loop [42, 114): both ends at rest, front on (yaw a whole number of turns), mid-lean the same way: the loop has no seam
const SHOW = { from: 42, len: 114 - 42, crema: [66, 90], tame: 0.75, speed: 0.5 };
export const SHOWCASE = { crema: false };
const SHOW_ROOT = { x: 0, z: 0, yaw: 0 };
export const turn = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b)); // a - b, the short way round
// home: where it wanders round (world m), r: how far it may stray before it heads back
export function newWalker(x = 0, z = 0, face = 0, r = 2) {
  const w = { x, z, h: face, face, spin: 0, lb: -1, hx: x, hz: z, r, feet: null, manual: 0, gp: null, gb: null, lp: null, pr: 2, vx: 0, vz: 0, lx: x, lz: z, lface: face, returnPose: {}, local: [0, 1].map(() => ({ x: 0, z: 0, yaw: 0, lift: 0 })) };
  w.feetAt = () => w.local; // poseDrac's feet planner, for this walker
  return w;
}
export function resetWalker(w, x, z, face) { Object.assign(w, { x, z, h: face, face, spin: 0, lb: -1, hx: x, hz: z, feet: null, vx: 0, vz: 0 }); }

// One frame: fills `out` (a dance-drac pose, for poseDrac with front 0 and w.feetAt) and moves w; w.face is its world
// heading. shy (optional {x, z}): someone it slows down short of when walking their way. s: the rig's scale (model → m).
export function demoStep(w, out, dt, beat, shy, s = 1) {
  const lb = SHOW.from + (((beat - SHOW.from) % SHOW.len) + SHOW.len) % SHOW.len;
  dracPose(out, lb);
  if (w.lb >= 0 && lb > w.lb && SHOW.crema.some(c => w.lb < c && lb >= c)) SHOWCASE.crema = true;
  w.lb = lb;
  const spin = out.yaw % TAU, dSpin = turn(spin, w.spin);
  w.spin = spin;
  out.roll *= SHOW.tame; out.pitch *= SHOW.tame; out.whip *= SHOW.tame; out.shake *= SHOW.tame;
  dracRoot(SHOW_ROOT, beat, true); out.x = SHOW_ROOT.x; out.z = SHOW_ROOT.z; out.yaw = 0; out.practice = true; out.beat = beat;
  // the walk: a lazy meander, back towards home when it strays; it stands for its turns and its rear
  const hx = w.hx - w.x, hz = w.hz - w.z;
  if (Math.hypot(hx, hz) > w.r) w.h += turn(Math.atan2(hx, hz), w.face) * Math.min(1, dt * 0.9);
  else w.h += Math.sin(beat * 0.37) * dt * 0.35;
  w.face = w.h + spin;
  const fx = Math.sin(w.face), fz = Math.cos(w.face);
  let speed = SHOW.speed * (1 - out.rear) * Math.max(0, 1 - Math.abs(dSpin) / Math.max(dt, 1e-3) / 1.5);
  if (shy) {
    const ax = w.x - shy.x, az = w.z - shy.z, d = Math.hypot(ax, az);
    if (ax * fx + az * fz < 0) speed *= Math.max(0, Math.min(1, (d - 3) / 1.8));
  }
  w.x += fx * speed * dt; w.z += fz * speed * dt; w.vx = fx * speed; w.vz = fz * speed;
  if (w.manual > 0) {
    w.manual = Math.max(0, w.manual - dt / 0.5);
    const k = w.manual * w.manual * (3 - 2 * w.manual);
    for (const key in w.returnPose) if (key !== 'beat' && key !== 'practice' && key !== 'yaw') out[key] += (w.returnPose[key] - out[key]) * k;
  }
  plant(w, out, gait(w, beat, dt, speed), s);
  return out;
}

// The feet's own phase, in the beat's pair of swings: the music's beat while it shows off; driven, as fast as the run
// needs (a pair of steps every STEP_STRIDE m: the beat alone left the shoes a metre behind at a gallop), then eased back onto
// the beat. Only its rate changes, never the phase itself: a change of pace never pops a shoe.
const STEP_STRIDE = 1.4, STEP_REACH = 0.5; // m; REACH: the farthest a shoe is ever left from under the root
function gait(w, beat, dt, speed) {
  const rate = dt > 0 && w.gb !== null ? Math.max(0, (beat - w.gb) / dt) : 0, run = speed / STEP_STRIDE;
  w.gp ??= beat;
  const off = turn((w.gp - (w.gb ?? beat)) * TAU, 0) / TAU; // ahead (+) or behind the beat (both last frame's), within half a pair
  w.gb = beat;
  w.pr = run > rate ? run : rate * (1 - Math.max(-.5, Math.min(.5, off * 2)));
  w.gp += dt * w.pr;
  return w.gp;
}
// The feet, planted in the world. Each foot is a root anchor (where the root stood, its heading: what drac-feet.js plans
// in the song); a pair's two swings ([foot, takeoff, landing] in the phase) carry it to the root, lifted: to where the
// root will be a quarter pair later, so the body passes over the planted shoe instead of always leaving it behind.
const SWINGS = [[0, 0.04, 0.46], [1, 0.54, 0.96]], LIFT = 0.06, STEP_LEAD = 0.29; // (model units; STEP_LEAD: of a pair)
const RW = { x: 0, z: 0, yaw: 0 }, quintic = q => q * q * q * (10 + q * (-15 + 6 * q));
function plant(w, out, phase, s, lift = 1, air = false) {
  const c = Math.cos(w.face), sn = Math.sin(w.face), bb = phase - Math.floor(phase), lead = STEP_LEAD / Math.max(w.pr, 1); // (s)
  RW.x = w.x + (c * out.x + sn * out.z) * s + w.vx * lead; RW.z = w.z + (-sn * out.x + c * out.z) * s + w.vz * lead; RW.yaw = w.face; // the root, in the world
  w.feet ??= [0, 1].map(() => ({ x: RW.x, z: RW.z, yaw: RW.yaw, fx: 0, fz: 0, fyaw: 0, up: false }));
  if (air) { // a jump: the shoes go with the rig (from where they were under it), every swing paused until it lands
    const d = w.face - w.lface, dc = Math.cos(d), ds = Math.sin(d);
    for (const f of w.feet) {
      let dx = f.x - w.lx, dz = f.z - w.lz; f.x = w.x + dc * dx + ds * dz; f.z = w.z - ds * dx + dc * dz; f.yaw += d;
      dx = f.fx - w.lx; dz = f.fz - w.lz; f.fx = w.x + dc * dx + ds * dz; f.fz = w.z - ds * dx + dc * dz; f.fyaw += d;
    }
  }
  w.lx = w.x; w.lz = w.z; w.lface = w.face;
  const lp = w.lp ?? phase; w.lp = phase;
  for (const [i, t0, t1] of SWINGS) {
    if (air) break;
    const f = w.feet[i], u = (bb - t0) / (t1 - t0), L = w.local[i];
    if (u > 0 && u < 1) {
      if (!f.up) { f.up = true; f.fx = f.x; f.fz = f.z; f.fyaw = f.yaw; }
      const k = quintic(u);
      f.x = f.fx + (RW.x - f.fx) * k; f.z = f.fz + (RW.z - f.fz) * k; f.yaw = f.fyaw + turn(RW.yaw, f.fyaw) * k;
      L.lift = LIFT * lift * Math.sin(Math.PI * u);
    } else {
      // a landing since the last frame always lands (a fast gait at 30 fps can skip a whole swing)
      if (Math.floor(phase - t1) > Math.floor(lp - t1)) { f.x = RW.x; f.z = RW.z; f.yaw = RW.yaw; }
      f.up = false; L.lift = 0;
    }
  }
  const rx = RW.x - w.vx * lead, rz = RW.z - w.vz * lead; // the root now
  for (let i = 0; i < 2; i++) {
    const f = w.feet[i], ox = f.x - rx, oz = f.z - rz, o = Math.hypot(ox, oz);
    if (o > STEP_REACH) { f.x = rx + ox * STEP_REACH / o; f.z = rz + oz * STEP_REACH / o; } // outrun (a spin, a burst): never trailing farther
    const L = w.local[i], dx = (f.x - w.x) / s, dz = (f.z - w.z) / s; // into the rig parent's frame, which poseDrac works in
    L.x = c * dx - sn * dz; L.z = sn * dx + c * dz; L.yaw = f.yaw - w.face;
  }
}

// Manual locomotion keeps the existing world-planted shoe solver. The body eases out of its showcase pose.
export function manualDracStep(w, out, dt, beat, body, scale, reduced) {
  // Tab may replace the other figure several metres away: do not drag the old planted shoes there.
  if (Math.hypot(w.x - body.x, w.z - body.z) > 0.15 + Math.hypot(body.vx, body.vz) * dt) w.feet = null; // (more than a frame's run)
  w.x = body.x; w.z = body.z; w.face = body.yaw; w.vx = body.vx; w.vz = body.vz;
  const k = 1 - Math.exp(-dt / 0.22), moving = Math.min(1, Math.hypot(body.vx, body.vz));
  for (const key in out) {
    if (key === 'beat' || key === 'practice') continue;
    const target = key === 'drive' ? (reduced ? 0 : moving * 0.35) : key === 'fire' && body.fire > 0 ? (reduced ? 0.9 : 3)
      : body.roar && (key === 'rear' || key === 'jaw' || key === 'flap') ? (reduced ? 0.4 : 1) : 0; // photo Q: a roar
    out[key] += (target - out[key]) * k;
  }
  out.yaw = 0; out.practice = true; out.beat = beat;
  w.manual = 1;
  for (const key in out) w.returnPose[key] = out[key];
  const air = PHOTO.air && PHOTO.id === 'drac-valls'; // (its jump; a yielding Drac never takes the Mulassa's)
  plant(w, out, air ? w.gp ?? beat : gait(w, beat, dt, Math.hypot(body.vx, body.vz)), scale, reduced ? 0 : moving, air);
  if (air) w.gb = beat;
}
export function resumeWalker(w, beat) {
  const face = w.face;
  dracPose(SHOW_RESUME, SHOW.from + (((beat - SHOW.from) % SHOW.len) + SHOW.len) % SHOW.len);
  w.spin = SHOW_RESUME.yaw % TAU; w.h = face - w.spin; w.lb = -1;
}
const SHOW_RESUME = { };
