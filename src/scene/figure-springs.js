// The figures' reactive springs (S) and shared body state (M): taps, holds and stumbles become short, bounded accents
// on top of whatever dances (each figure's own hooks: figure-scenes.js).
import * as THREE from 'three';
import { CAM_AZ } from './stage.js';
import { G, clock, isDown } from '../game/state.js';

export const PIVOT = 1.3; // metres from the body centre to the front pivot
const spring = (k = 90, c = 11) => ({ x: 0, v: 0, t: 0, k, c });
export const S = {
  yaw: spring(60, 10), roll: spring(110, 8), pitch: spring(110, 9),
  neck: spring(80, 9), neckYaw: spring(70, 8), squash: spring(260, 14), tail: spring(90, 5),
};
const MOTION_SPRINGS = Object.values(S);
export function stepSprings(dt) {
  for (const sp of MOTION_SPRINGS) {
    sp.v += (sp.k * (sp.t - sp.x) - sp.c * sp.v) * dt;
    sp.x += sp.v * dt;
  }
}
export const M = { pivot: new THREE.Vector2(0, PIVOT), pos: new THREE.Vector2(0, 0), yaw: 0, yawVel: 0, missT: -9, biteT: -9, peekT: -9, cheerT: -9, air: 0, airV: 0, dancing: false, danceBeat: 0, danceT: 0, vigor: 1 };
// Reactive limits on top of the base pose (rad, m): accents and stumbles never pile up, whatever the tapping rate.
export const CAP = { yaw: 0.35, roll: 0.3, pitch: 0.3, neck: 0.6, neckYaw: 0.6, air: 0.18 };
export function capSpring(sp, m) {
  if (sp.x > m) { sp.x = m; sp.v = Math.min(0, sp.v); } else if (sp.x < -m) { sp.x = -m; sp.v = Math.max(0, sp.v); }
}
// A successful tap during play: a short accent on the base dance, never a new heading. GUA (orange, left) leans her
// to the screen's left and PA (turquoise, right) to its right, whichever way she faces (roll and pitch share the
// lean by her heading). GUAPA ('B', also a GLOBUS pop): both at once, a proud whole-body lift.
function accent(input) {
  const cy = Math.cos(M.yaw - CAM_AZ), sy = Math.sin(M.yaw - CAM_AZ); // her heading as the play camera sees it
  if (input === 'L' || input === 'R') {
    const s = input === 'L' ? 1 : -1;
    S.roll.v += s * 1.1 * cy; S.pitch.v -= s * 1.1 * sy;
    S.neckYaw.v -= s * 3 * cy; // the head glances the same way
    S.neck.v -= 2; S.tail.v -= s * 8;
    M.airV = Math.max(M.airV, 0.9); // the carriers push up on the beat
    S.squash.v += 2;
  } else {
    S.pitch.v -= 2.4; S.neck.v -= 5; S.tail.v += 12; // front and head up, tail flying
    M.airV = Math.max(M.airV, 1.8);
    S.squash.v -= 3;
  }
}
export function act(dir) {
  if (G.state === 'play') return accent(dir);
  const B = G.state !== 'play' || G.sec === 'B';
  const side = dir === 'L' ? 1 : -1;
  if (dir === 'L' || dir === 'R') {
    S.yaw.t += side * (B ? 1.25 : 0.55); // B: big compass swing, A: turn to greet
    S.roll.v -= side * (B ? 2.2 : 0.9); // leans out as the rear flies round
    S.neckYaw.v += side * (B ? 3 : 5); // the head leads the turn
    S.tail.v -= side * 9;
  } else if (dir === 'U') {
    if (B) { M.airV = 3.2; S.pitch.v -= 2.5; } // bot!
    else { S.neck.v -= 4; S.pitch.v -= 1.2; M.airV = 1.2; } // alça el cap, proud
    S.neck.v -= 3;
  } else { // D
    if (B) { S.pitch.v += 4; S.tail.v += 14; } // cop de cua: the rear kicks up
    else { S.neck.v += 7; S.pitch.v += 1.6; } // deep reverència, head down to the floor
    S.squash.v -= 3;
  }
  S.squash.v += 2.5;
}
// Back on the title she stands up again: nothing a run left on her carries over (a collapse's sunk body, drooped neck,
// open jaw, hidden legs and the sad crowd all hang on G.collapseT; a stumble, a jump). The demo walk goes on from
// where she stands, facing where she faced (S.yaw keeps her heading).
export function standUp() {
  G.collapseT = 0;
  Object.assign(M, { missT: -9, air: 0, airV: 0 });
  for (const k of ['roll', 'pitch', 'neck', 'neckYaw', 'squash', 'tail']) Object.assign(S[k], { x: 0, v: 0, t: 0 });
}
export function stumble(dir) { // PATAPAM: a wrong move trips her up: nose dips, she lurches sideways and lands heavily
  const side = dir === 'L' ? -1 : 1; // lurches the other way from where she was told to go
  S.pitch.v += 5; S.roll.v += side * 4; S.neck.v += 6; S.neckYaw.v -= side * 6; S.squash.v -= 5; S.tail.v += side * 12;
  M.missT = clock; // (no camera shake: a miss shouldn't jolt the view)
}
// MANTÉN held right: a restrained sustained gesture (a lean to the note's side, head up) that the springs release
// smoothly when the hold ends or is let go.
export function holdGesture() {
  const h = G.hold;
  if (G.state !== 'play' || !h || G.collapseT || !(h.auto || isDown(h.n.input))) return;
  const s = h.n.input === 'L' ? 1 : -1, cy = Math.cos(M.yaw - CAM_AZ), sy = Math.sin(M.yaw - CAM_AZ);
  S.roll.t = s * 0.06 * cy; S.pitch.t = -s * 0.06 * sy - 0.03; S.neck.t = -0.15;
}
