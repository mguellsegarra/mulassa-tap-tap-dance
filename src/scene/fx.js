// Finale lights and fireworks.
import * as THREE from 'three';
import { rnd, pick } from './models.js';
import { G } from '../game/state.js';
import { sun, hemi, LIGHT, renderProfile, scene } from './stage.js';
import { dummy } from './confetti.js';

export function animFinaleLights(beat) {
  if (G.finale) {
    const pulse1 = Math.max(0, 1 - (beat % 1) * 3);
    sun.color.setHSL((beat * 0.13) % 1, 0.55, 0.78); // (lighter than a full colour: at 0.62 the plaça read as night)
    hemi.color.setHSL((beat * 0.13 + 0.5) % 1, 0.5, 0.88);
    hemi.intensity = 1.4 + pulse1 * 0.9;

  } else if (hemi.intensity !== 1.6) {
    sun.color.set(LIGHT.sun); hemi.color.set(LIGHT.sky); hemi.intensity = 1.6;
  }
}
// Fireworks for the finale: little glowing voxels bursting over the plaça
const FW = renderProfile.fireworks;
export const fireworks = new THREE.InstancedMesh(new THREE.BoxGeometry(0.22, 0.22, 0.22), new THREE.MeshBasicMaterial(), FW);
fireworks.frustumCulled = false;
fireworks.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
const sparks = Array.from({ length: FW }, () => ({ p: new THREE.Vector3(), v: new THREE.Vector3(), life: 0 }));
const FW_COLS = ['#ff4d6d', '#ffd23f', '#3ee0ff', '#7cff6b', '#ff8fb1', '#ffffff', '#b388ff'].map(c => new THREE.Color(c));
sparks.forEach((_, i) => fireworks.setColorAt(i, FW_COLS[0]));
scene.add(fireworks);
let sparkCursor = 0;
// speed < 1, col: the Drac's petards and TRO (drac-fx.js), small bursts off the ground: upwards only, one colour
export function firework(x = rnd(-9, 9), y = rnd(9, 14), z = rnd(-9, 4), n = 70, speed = 1, col = pick(FW_COLS)) {
  n = Math.max(1, Math.round(n * renderProfile.fireworks / 700));
  for (let k = 0; k < n; k++) {
    const s = sparks[sparkCursor = (sparkCursor + 1) % FW];
    s.color = col;
    s.p.set(x, y, z); s.v.set(rnd(-1, 1), rnd(-1, 1), rnd(-1, 1)).normalize().multiplyScalar(rnd(4, 7) * speed); s.life = rnd(0.9, 1.4);
    if (speed < 1) s.v.y = Math.abs(s.v.y);
  }
}
export function animFireworks(dt) {
  let count = 0;
  const drag = 0.97 ** (dt * 60); // air drag per second, not per frame: the same at 60 and 120 fps
  for (const s of sparks) {
    if (s.life <= 0) continue;
    s.life -= dt;
    if (s.life <= 0) continue;
    s.v.y -= 4 * dt; s.v.multiplyScalar(drag); s.p.addScaledVector(s.v, dt);
    dummy.position.copy(s.p); dummy.scale.setScalar(s.life); dummy.rotation.set(0, 0, 0);
    dummy.updateMatrix();
    fireworks.setMatrixAt(count, dummy.matrix);
    fireworks.setColorAt(count++, s.color);
  }
  fireworks.count = count;
  fireworks.visible = count > 0;
  if (count) {
    fireworks.instanceMatrix.needsUpdate = true;
    fireworks.instanceColor.needsUpdate = true;
  }
  dummy.scale.setScalar(1);
}
