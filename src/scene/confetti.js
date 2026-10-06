// Confetti: one instanced mesh, thrown in bursts and swept away.
import * as THREE from 'three';
import { rnd } from './models.js';
import { renderProfile, scene } from './stage.js';
import { clock } from '../game/state.js';
import { smooth01 } from '../core/anim.js';

const CONF = renderProfile.confetti;
const confetti = new THREE.InstancedMesh(new THREE.BoxGeometry(0.14, 0.14, 0.04), new THREE.MeshLambertMaterial(), CONF);
const conf = Array.from({ length: CONF }, () => ({ p: new THREE.Vector3(0, -9, 0), v: new THREE.Vector3(), r: rnd(0, 6), lay: -1 })); // lay: s on the floor (-1: parked or in the air)
['#d62828', '#f5c518', '#2f62d6', '#3a9d4b', '#ffffff', '#ff8fb1'].forEach((c, k) => conf.forEach((_, i) => i % 6 === k && confetti.setColorAt(i, new THREE.Color(c))));
confetti.frustumCulled = false;
confetti.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
scene.add(confetti);
export const dummy = new THREE.Object3D();
export function burst(x, z) {
  confettiSettled = false;
  confSweep = -1;
  spawnConfetti(CONF, c => { c.p.set(x + rnd(-1, 1), rnd(4, 6), z + rnd(-1, 1)); c.v.set(rnd(-3, 3), rnd(0, 4), rnd(-3, 3)); });
}
// Pieces to throw: the parked ones first, then any lying on the floor; never one still in the air (it would jump back
// up to the sky mid-fall), and the floor's pieces shrink away by themselves (animConfetti) so few are ever lifted off it.
export function spawnConfetti(n, place) {
  let left = Math.min(n, renderProfile.confetti);
  for (const parkedPass of [true, false]) for (let i = 0; i < renderProfile.confetti && left > 0; i++) {
    const c = conf[i];
    if (c.p.y > 0.03 || (c.p.y < -1) !== parkedPass) continue;
    place(c); c.lay = -1; left--;
  }
}
export let confettiSettled = false;
export const setConfettiSettled = v => (confettiSettled = v);
// a new game (or the menu) starts with a clean plaça: a quick gust lifts the leftover confetti,
// blows it off to the side and shrinks it away, done well before BALLA!
const SWEEP = 0.9, CONF_LAY = 5, CONF_FADE = 1; // CONF_LAY: s a piece rests on the floor, CONF_FADE: s it then takes to shrink away
let confSweep = -1; // clock when the gust started, -1 = none
export function sweepConfetti() {
  if (!confetti.visible || confSweep >= 0) return; // nothing lying around, or already blowing away
  confSweep = clock;
  confettiSettled = false;
}
export function animConfetti(dt) {
  if (confettiSettled) return;
  const sw = confSweep < 0 ? -1 : (clock - confSweep) / SWEEP;
  if (sw >= 1) { // gust over: park every piece off-screen, at rest
    confSweep = -1;
    conf.forEach(c => { c.p.set(0, -9, 0); c.v.set(0, 0, 0); c.lay = -1; });
  }
  confetti.visible = conf.some(c => c.p.y >= -1);
  if (!confetti.visible) { confettiSettled = true; return; }
  const drag = 0.985 ** (dt * 60); // per second, not per frame (60 and 120 fps fall alike)
  let dirty = false;
  conf.forEach((c, i) => {
    if (sw < 0 && c.lay >= 0 && c.lay < CONF_LAY) { c.lay += dt; return; } // lying on the floor: nothing to redraw
    dirty = true;
    if (c.p.y < -1) dummy.position.set(0, -9, 0);
    else {
      if (sw >= 0) { c.v.x += (10 + (i % 5) * 2) * dt; c.v.z -= (i % 3 - 1) * 3 * dt; c.v.y += (9 + (i % 4) * 2) * dt; } // the gust
      c.v.y -= 6 * dt; c.v.multiplyScalar(drag);
      c.p.addScaledVector(c.v, dt);
      c.r += dt * (sw >= 0 ? 20 : 8);
      dummy.position.copy(c.p);
      dummy.rotation.set(c.r, c.r * 0.7, 0);
      if (c.p.y < 0.02) { // landed: rests for CONF_LAY s, then shrinks away (never vanishes in one frame)
        c.p.y = 0.02; c.v.set(0, 0, 0); c.lay = Math.max(0, c.lay) + dt;
        if (c.lay >= CONF_LAY + CONF_FADE) { c.p.set(0, -9, 0); c.lay = -1; dummy.position.set(0, -9, 0); } // parked: drawn off-screen this frame too (no full-size flash)
      }
    }
    dummy.scale.setScalar(sw >= 0 ? 1 - sw * sw : c.lay > CONF_LAY ? 1 - smooth01((c.lay - CONF_LAY) / CONF_FADE) : 1);
    dummy.updateMatrix();
    confetti.setMatrixAt(i, dummy.matrix);
  });
  dummy.scale.setScalar(1);
  if (dirty) confetti.instanceMatrix.needsUpdate = true;
  confettiSettled = sw < 0 && conf.every(c => c.p.y < -1);
}
