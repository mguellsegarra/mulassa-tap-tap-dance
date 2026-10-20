// Title-screen camera the player can steer: one finger / the mouse drags it round her, two fingers / the wheel /
// a trackpad pinch bring it closer or back off. Pure (no DOM, no three.js) for tests: main.js feeds it pointer events
// (css px) and real time (s), and places the camera from yaw / pitch (x[0]) / distance (x[1]) around her.
// Everything runs on dt (same feel at 30, 60 or 120 fps): a flick coasts and decays, the limits give like a rubber
// band and spring back (framing.js smoothDamp, critically damped), and after a few idle seconds the automatic orbit
// picks up again from wherever the camera is (its speed eases in: no jump).
import { smoothDamp } from './framing.js';

const DEG = Math.PI / 180;
export const ORBIT = {
  tap: 8, // css px a pointer may wander and still be a tap
  turn: 0.006, // rad per css px dragged, at most (turnFor: about 140 degrees across the screen's width)
  idle: 2, // s without input before the automatic framing eases back (a beat to see the angle you chose; 5 s read as stuck)
  rate: 0.12, // rad/s, the automatic orbit (the title's old clock * 0.12)
  coast: 0.4, // s, time constant of a flick's spin decaying
  fling: 4, // rad/s at most from a flick (at most 1.6 rad of coasting)
  ease: 1.5, // s, time constant of the automatic spin easing back in
  back: 0.25, // s to spring back inside a limit
  home: 2.5, // s to ease back to the automatic framing
  homeSpeed: 0.55, // rad/s at most while the azimuth eases back (a half turn too: under the 0.6 rad/s a pan can take)
  wheel: 0.2, // s after the last wheel step before its target snaps inside the limits
  pitchMin: 10 * DEG, pitchMax: 60 * DEG, pitchGive: 0.1, // rad the rubber band gives at most beyond a limit
  distMin: 8, distMax: 17, distGive: 1.2, // m: never into her swinging rear / the crowd round her, never past the square
  eye: 4, focusY: 1.2, // the lens stays above the crowd's heads (m); she is looked at this high
};

// Soft limit: inside [lo, hi] x is itself; beyond, it gives less and less, never more than `give`.
export const rubber = (x, lo, hi, give) => x < lo ? lo - give * (1 - Math.exp((x - lo) / give))
  : x > hi ? hi + give * (1 - Math.exp((hi - x) / give)) : x;
const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));

// Horizontal metres from (x, z) along (dx, dz) to the edge of the open square (|x|, |z| <= lim).
export function roomAlong(x, z, dx, dz, lim) {
  let t = Infinity;
  if (dx) t = Math.min(t, (Math.sign(dx) * lim - x) / dx);
  if (dz) t = Math.min(t, (Math.sign(dz) * lim - z) / dz);
  return Math.max(0, t) * Math.hypot(dx, dz);
}

// The limits right now: the far one from the square's edge behind the camera (`room`, horizontal m), the low pitch
// from the eye height at this distance.
export function orbitLimits(out, dist, pitch, room) {
  out.distMin = ORBIT.distMin;
  out.distMax = Math.max(ORBIT.distMin, Math.min(ORBIT.distMax, room / Math.cos(pitch)));
  out.pitchMin = Math.max(ORBIT.pitchMin, Math.asin(Math.min(1, (ORBIT.eye - ORBIT.focusY) / Math.max(1e-3, dist))));
  out.pitchMax = ORBIT.pitchMax;
  return out;
}

export const turnFor = widthCss => Math.min(ORBIT.turn, 2.4 / Math.max(1, widthCss));

// Two fingers: the distance scales by how far apart they started over how far apart they are.
export const pinchDist = (dist0, fingers0, fingers) => dist0 * fingers0 / Math.max(1, fingers);

export function createOrbit(home) {
  return {
    yaw: 0, spin: ORBIT.rate, turn: ORBIT.turn, x: new Float64Array([home.pitch, home.dist]), v: new Float64Array(2), // x/v: smoothDamp state
    ptrs: new Map(), drag: false, pinch: null, raw: 0, zoomRaw: home.dist, zoomTo: home.dist, wheelT: -Infinity,
    last: -Infinity, lim: orbitLimits({}, home.dist, home.pitch, Infinity), fresh: true, // fresh: starts at home on its first step
  };
}
const gap = s => { const [a, b] = s.ptrs.values(); return Math.hypot(a.x - b.x, a.y - b.y); };

// A pointer down on empty canvas. Catching the camera stops its coasting.
export function orbitDown(s, id, x, y, now) {
  s.ptrs.set(id, { x, y, x0: x, y0: y, t: now });
  s.last = now; s.spin = 0; s.v[0] = s.v[1] = 0;
  if (s.ptrs.size === 1) { s.drag = false; s.raw = s.x[0]; }
  if (s.ptrs.size === 2) { s.drag = true; s.pinch = { d0: gap(s), dist0: s.x[1] }; } // two fingers: a gesture, never a tap
}
// Returns true while this pointer is steering (so the caller ignores it for hover etc.).
export function orbitMove(s, id, x, y, now) {
  const p = s.ptrs.get(id);
  if (!p) return false;
  const dx = x - p.x, dy = y - p.y, dt = now - p.t;
  p.x = x; p.y = y; p.t = now;
  if (!s.drag) {
    if (Math.hypot(x - p.x0, y - p.y0) <= ORBIT.tap) return false; // still a tap
    s.drag = true; s.last = now;
    return true; // the drag starts here: the first few px don't jerk it
  }
  s.last = now;
  if (s.pinch) {
    if (s.ptrs.size >= 2) s.x[1] = rubber(pinchDist(s.pinch.dist0, s.pinch.d0, gap(s)), s.lim.distMin, s.lim.distMax, ORBIT.distGive);
    return true;
  }
  s.yaw -= dx * s.turn;
  s.raw += dy * s.turn;
  s.x[0] = rubber(s.raw, s.lim.pitchMin, s.lim.pitchMax, ORBIT.pitchGive);
  if (dt > 0) { // the flick's speed, filtered over the last few tens of ms (not per event: the rate varies)
    const k = 1 - Math.exp(-dt / 0.04);
    s.spin = clamp(s.spin + (-dx * s.turn / dt - s.spin) * k, -ORBIT.fling, ORBIT.fling);
    s.v[0] = clamp(s.v[0] + (dy * s.turn / dt - s.v[0]) * k, -ORBIT.fling / 2, ORBIT.fling / 2);
  }
  return true;
}
// Returns 'tap' when this pointer never moved past the threshold, 'drag' when it steered, null if not ours.
export function orbitUp(s, id, now) {
  const p = s.ptrs.get(id);
  if (!p) return null;
  s.ptrs.delete(id);
  s.last = now;
  const was = s.drag ? 'drag' : 'tap';
  if (now - p.t > 0.08) { s.spin = 0; s.v[0] = 0; } // held still before letting go: no flick
  if (s.pinch) { // back to one finger (or none): it carries on from here, no jump, no fling
    s.pinch = null; s.spin = 0; s.v[0] = s.v[1] = 0; s.raw = s.x[0];
    for (const q of s.ptrs.values()) { q.x0 = q.x; q.y0 = q.y; }
  }
  if (!s.ptrs.size) s.zoomRaw = s.zoomTo = s.x[1];
  return was;
}
export function orbitCancel(s) { s.ptrs.clear(); s.pinch = null; s.drag = false; }

// Wheel / trackpad pinch: the distance scales by `factor` (> 1 backs off), smoothly, with the same rubber band.
export function orbitZoom(s, factor, now) {
  if (now - s.wheelT > ORBIT.wheel) s.zoomRaw = s.x[1];
  s.zoomRaw *= factor;
  s.zoomTo = rubber(s.zoomRaw, s.lim.distMin, s.lim.distMax, ORBIT.distGive);
  s.wheelT = s.last = now;
}
export const wheelFactor = (deltaY, pinch) => Math.exp(Math.max(-60, Math.min(60, deltaY)) * (pinch ? 0.01 : 0.0015));

// One frame: coasting, springs back inside the limits, the automatic orbit when idle. home: { pitch, dist, yaw? } (with a yaw the
// idle camera springs to that azimuth instead of spinning: the caller sways it);
// home.time (optional): seconds for pitch and distance to ease back (the azimuth keeps ORBIT.home and its speed);
// room: horizontal metres to the square's edge behind the camera; keep: the player's framing stays (photo mode), no easing back.
export function orbitStep(s, dt, now, home, room, keep = false) {
  if (dt <= 0) return s;
  if (s.fresh) { s.fresh = false; s.x[0] = home.pitch; s.x[1] = s.zoomRaw = s.zoomTo = home.dist; } // (main.js knows home only then)
  const L = orbitLimits(s.lim, s.x[1], s.x[0], room);
  const held = s.ptrs.size > 0, auto = !held && !keep && now - s.last > ORBIT.idle;
  if (!held && auto && home.yaw != null) { // idle with a home framing: a critically damped spring to its (slowly swaying) azimuth, never a spin
    const ys = s.ys ??= { x: new Float64Array(1), v: new Float64Array(1) };
    ys.x[0] = Math.atan2(Math.sin(s.yaw - home.yaw), Math.cos(s.yaw - home.yaw)); ys.v[0] = s.spin; // the nearest way round
    smoothDamp(ys, 0, 0, ORBIT.home, dt, ORBIT.homeSpeed);
    s.yaw = home.yaw + ys.x[0]; s.spin = ys.v[0];
  } else if (!held) { // a flick coasts to rest; idle, the automatic spin eases back in
    const target = auto ? ORBIT.rate : 0, tau = auto ? ORBIT.ease : ORBIT.coast, e = Math.exp(-dt / tau);
    s.yaw += target * dt + (s.spin - target) * tau * (1 - e); // integrated exactly: the same path at any frame rate
    s.spin = target + (s.spin - target) * e;
  }
  if (!(held && s.drag && !s.pinch)) { // pitch: not under a dragging finger
    if (auto) smoothDamp(s, 0, clamp(home.pitch, L.pitchMin, L.pitchMax), home.time ?? ORBIT.home, dt);
    else if (s.x[0] < L.pitchMin || s.x[0] > L.pitchMax) smoothDamp(s, 0, clamp(s.x[0], L.pitchMin, L.pitchMax), ORBIT.back, dt);
    else { const e = Math.exp(-dt / ORBIT.coast); s.x[0] += s.v[0] * ORBIT.coast * (1 - e); s.v[0] *= e; }
  }
  if (!s.pinch) { // distance: not under two fingers
    const wheeling = now - s.wheelT < ORBIT.wheel;
    if (auto) smoothDamp(s, 1, clamp(home.dist, L.distMin, L.distMax), home.time ?? ORBIT.home, dt);
    else if (wheeling) smoothDamp(s, 1, s.zoomTo, 0.12, dt);
    else smoothDamp(s, 1, clamp(s.x[1], L.distMin, L.distMax), ORBIT.back, dt); // inside: at rest; outside: back in
    if (!wheeling) s.zoomRaw = s.zoomTo = s.x[1];
  }
  return s;
}
