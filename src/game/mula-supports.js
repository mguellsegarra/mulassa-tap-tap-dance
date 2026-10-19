// The Mulassa's four carriers (UAF: two at the front, two at the rear) as eight shoes on the floor. A planted shoe keeps its
// spot and heading while the shell moves over it; when the shell has drifted away, half the shoes (one per carrier) lift,
// swing above the standing ones and land under where the shell is going. INFERRED support approximation from the
// 2017 reference (alternating world-fixed stances, short quick steps in fast turns), not transcribed footfalls.
// Two planners share the shoe layout, the trigger and the swing: planSupports (the song, seekable: a pure function of
// time) and createStepper (free motion: the selector walk, photo mode, the practice), stepped frame by frame.
// Pure: no three.js. Units: metres, yaw rad (+z forward at 0), in the frame of the poses they are given.

// Oriented shoe footprints. Positive gap means separation; negative means overlap.
export const SHOE = { width: .105, length: .20, height: .075 };
export function shoeSeparation(a, b, out) {
  let gap = -Infinity, nx = 0, nz = 0;
  for (let i = 0; i < 4; i++) {
    const angle = (i < 2 ? a.yaw : b.yaw) + (i % 2) * Math.PI / 2;
    const x = Math.cos(angle), z = -Math.sin(angle);
    const ra = SHOE.width / 2 * Math.abs(x * Math.cos(a.yaw) - z * Math.sin(a.yaw))
      + SHOE.length / 2 * Math.abs(x * Math.sin(a.yaw) + z * Math.cos(a.yaw));
    const rb = SHOE.width / 2 * Math.abs(x * Math.cos(b.yaw) - z * Math.sin(b.yaw))
      + SHOE.length / 2 * Math.abs(x * Math.sin(b.yaw) + z * Math.cos(b.yaw));
    const d = (a.x - b.x) * x + (a.z - b.z) * z, g = Math.abs(d) - ra - rb;
    if (g > gap) { gap = g; nx = x * (d >= 0 ? 1 : -1); nz = z * (d >= 0 ? 1 : -1); }
  }
  out.gap = gap; out.x = nx; out.z = nz; return out;
}

// Four human carriers in two rows, two shoes each (shell frame, m): front row z 1.05, rear -1.05.
export const SUPPORT_LAYOUT = [1.05, -1.05].flatMap(z => [.2, -.2].flatMap(x => [.1, -.1].map(dx => ({ x: x + dx, z }))));
// A shoe steps when the shell has carried its spot this far (m) or turned it this much (rad); a swing lasts SWING s at
// rest, shorter in fast turns and travel; LIFT m at its top.
export const MULA_STEP = { drift: .075, turn: .15, swing: .24, min: .06, gap: .015, lift: .085 };
const ease = u => u ** 3 * (10 - 15 * u + 6 * u * u);
const swingTime = (turnSpeed, travelSpeed) => Math.max(MULA_STEP.min, MULA_STEP.swing / (1 + turnSpeed * 1.5 + travelSpeed * .65));

// where shoe `index` stands under a shell pose ({x, z, yaw, roll, pitch}): the support point tilts with the body
export function nominalFoot(pose, index, out) {
  const point = SUPPORT_LAYOUT[index], c = Math.cos(pose.yaw), s = Math.sin(pose.yaw);
  const x = point.x * Math.cos(pose.roll) + .1 * Math.sin(pose.roll);
  const y = point.x * Math.sin(pose.roll) - .1 * Math.cos(pose.roll);
  const z = y * Math.sin(pose.pitch) + point.z * Math.cos(pose.pitch);
  out.x = pose.x + x * c + z * s; out.z = pose.z - x * s + z * c; out.yaw = pose.yaw;
  return out;
}
// Each carrier places a foot beside their own stance foot; slide it fore/aft until it clears every standing shoe.
// A shared offset pushed a whole row sideways when front and back carriers turned in opposite arcs.
const separation = {}, candidate = {};
function clearLanding(target, i, group, planted) {
  for (let ring = 0; ring <= 14; ring++) {
    for (let a = 0; a < (ring ? 2 : 1); a++) {
      const dz = (a ? -1 : 1) * ring * .02;
      candidate.x = target.x + dz * Math.sin(target.yaw);
      candidate.z = target.z + dz * Math.cos(target.yaw);
      candidate.yaw = target.yaw;
      let clear = true;
      for (let j = 0; j < 8 && clear; j++) {
        if (j === i || (j % 2 === group && j > i)) continue; // the group's later shoes are still to land
        if (shoeSeparation(candidate, planted[j], separation).gap < .012) clear = false;
      }
      if (clear) { target.x = candidate.x; target.z = candidate.z; return true; }
    }
  }
  return false;
}
// a swing from `from` to `to` at u (0-1): lift first, move above the standing shoes, then land; zero speed at both ends
function mulaSwingAt(from, to, u, out, lift = 1) {
  const travel = ease(Math.max(0, Math.min(1, (u - .15) / .7)));
  const up = ease(Math.max(0, Math.min(1, u / .15, (1 - u) / .15)));
  out.x = from.x + (to.x - from.x) * travel;
  out.z = from.z + (to.z - from.z) * travel;
  out.yaw = from.yaw + (to.yaw - from.yaw) * travel;
  out.y = MULA_STEP.lift * up * lift; out.contact = u === 0;
  return out;
}

// The song's plan, sampled at 100 Hz from `start` to `end` (seconds of whatever clock poseAt takes). foot(t, i, out)
// fills {x, z, yaw, y (the sole's height), contact}: a pure function of t (seek, pause, restart: the same shoes).
export function planSupports(poseAt, end = 166.2, start = 0) {
  const pose = {}, ahead = {}, events = SUPPORT_LAYOUT.map(() => []);
  let cached = NaN;
  const at = t => { if (t !== cached) { poseAt(t, pose); cached = t; } return pose; }; // one pose for all eight shoes
  const initial = SUPPORT_LAYOUT.map((_, i) => ({ ...nominalFoot(at(start), i, {}) }));
  const planted = initial.map(p => ({ ...p })), targets = initial.map(p => ({ ...p })), sample = {};
  let freeAt = start, next = 0;
  for (let frame = 1; start + frame / 100 < end - .35; frame++) {
    const t = start + frame / 100; if (t < freeAt) continue;
    let needed = false;
    for (let i = 0; i < 8 && !needed; i++) {
      nominalFoot(at(t), i, sample);
      if (Math.hypot(sample.x - planted[i].x, sample.z - planted[i].z) > MULA_STEP.drift || Math.abs(sample.yaw - planted[i].yaw) > MULA_STEP.turn) needed = true;
    }
    if (!needed) continue;
    const { x, z, yaw } = at(t); poseAt(t + .1, ahead);
    const duration = swingTime(Math.abs(ahead.yaw - yaw) / .1, Math.hypot(ahead.x - x, ahead.z - z) / .1);
    for (let i = next; i < 8; i += 2) nominalFoot(at(t + duration), i, targets[i]);
    for (let i = next; i < 8; i += 2) {
      if (!clearLanding(targets[i], i, next, planted)) throw new Error(`No compact carrier landing at ${t}, foot ${i}`);
      const to = { ...targets[i] };
      events[i].push({ start: t, end: t + duration, from: { ...planted[i] }, to });
      Object.assign(planted[i], to);
    }
    freeAt = t + duration + MULA_STEP.gap; next = 1 - next;
  }
  function foot(t, index, out = {}) {
    const list = events[index]; let lo = 0, hi = list.length;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (list[mid].start <= t) lo = mid + 1; else hi = mid; }
    const event = list[lo - 1];
    if (!event || t >= event.end) {
      const p = event?.to || initial[index];
      out.x = p.x; out.z = p.z; out.yaw = p.yaw; out.y = 0; out.contact = true;
      return out;
    }
    return mulaSwingAt(event.from, event.to, (t - event.start) / (event.end - event.start), out);
  }
  return { foot, events, layout: SUPPORT_LAYOUT };
}

// Free motion: the same shoes stepped live under a shell that goes wherever it is driven. update(dt, pose) takes the
// shell's pose this frame ({x, z, yaw, roll, pitch}, world) and fills `feet`; it plans each step from the shell's
// measured speed and lands the shoe a little ahead of it, so a walk reads as walking. lift 0-1 scales the step height
// (reduced motion). place(feet) restarts from given shoes (the song's last ones), reset() from the next pose.
export function createStepper() {
  const feet = SUPPORT_LAYOUT.map(() => ({ x: 0, z: 0, yaw: 0, y: 0, contact: true }));
  const swings = SUPPORT_LAYOUT.map(() => ({ on: false, t0: 0, dur: 0, from: { x: 0, z: 0, yaw: 0 }, to: { x: 0, z: 0, yaw: 0 } }));
  const planted = SUPPORT_LAYOUT.map(() => ({ x: 0, z: 0, yaw: 0 })), last = { x: 0, z: 0, yaw: 0 }, guess = {}, sample = {};
  let time = 0, freeAt = 0, next = 0, ready = false, vx = 0, vz = 0, w = 0;
  function reset() { ready = false; }
  function place(from) {
    for (let i = 0; i < 8; i++) { Object.assign(feet[i], from[i]); feet[i].y = 0; feet[i].contact = true; planted[i].x = from[i].x; planted[i].z = from[i].z; planted[i].yaw = from[i].yaw; swings[i].on = false; }
    ready = 'placed';
  }
  function update(dt, pose, lift = 1) {
    if (!(dt >= 0)) dt = 0;
    if (ready !== true) {
      if (!ready) for (let i = 0; i < 8; i++) { nominalFoot(pose, i, planted[i]); Object.assign(feet[i], planted[i]); feet[i].y = 0; feet[i].contact = true; swings[i].on = false; }
      last.x = pose.x; last.z = pose.z; last.yaw = pose.yaw; vx = vz = w = 0; ready = true;
    }
    time += dt;
    if (dt > 0) { // the shell's velocity, eased over ~0.1 s (a frame's jitter must not throw the shoes about)
      const k = 1 - Math.exp(-dt / .1);
      vx += ((pose.x - last.x) / dt - vx) * k; vz += ((pose.z - last.z) / dt - vz) * k; w += ((pose.yaw - last.yaw) / dt - w) * k;
    }
    last.x = pose.x; last.z = pose.z; last.yaw = pose.yaw;
    let swinging = false;
    for (let i = 0; i < 8; i++) {
      const s = swings[i];
      if (!s.on) continue;
      const u = Math.min(1, (time - s.t0) / s.dur);
      mulaSwingAt(s.from, s.to, u, feet[i], lift);
      if (u >= 1) { s.on = false; feet[i].y = 0; feet[i].contact = true; Object.assign(planted[i], s.to); } else swinging = true;
    }
    if (swinging || time < freeAt) return feet;
    let needed = false;
    for (let i = 0; i < 8 && !needed; i++) {
      nominalFoot(pose, i, sample);
      if (Math.hypot(sample.x - planted[i].x, sample.z - planted[i].z) > MULA_STEP.drift || Math.abs(sample.yaw - planted[i].yaw) > MULA_STEP.turn) needed = true;
    }
    if (!needed) return feet;
    const speed = Math.hypot(vx, vz), duration = swingTime(Math.abs(w), speed);
    // land where the shell will be, plus half a step's worth of travel when moving: the body passes over the shoe
    const lead = duration + (speed > .2 || Math.abs(w) > .3 ? .5 * (duration + MULA_STEP.gap) : 0);
    guess.x = pose.x + vx * lead; guess.z = pose.z + vz * lead; guess.yaw = pose.yaw + w * lead; guess.roll = pose.roll; guess.pitch = pose.pitch;
    for (let i = next; i < 8; i += 2) {
      const s = swings[i];
      nominalFoot(guess, i, s.to);
      if (!clearLanding(s.to, i, next, planted)) { nominalFoot(guess, i, s.to); } // crowded: land on the nominal spot anyway
      s.from.x = planted[i].x; s.from.z = planted[i].z; s.from.yaw = planted[i].yaw;
      s.on = true; s.t0 = time; s.dur = duration;
      feet[i].contact = false;
    }
    freeAt = time + duration + MULA_STEP.gap; next = 1 - next;
    return feet;
  }
  return { feet, update, reset, place };
}
