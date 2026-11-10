// The Bou's carriers' legs over the whole dance: no shoe ever jumps (a step out of a stretched leg teleported it 0.35 m),
// the shoes and knees are not jerked about (each step's shoe popped up and slapped down in two frames; the see-saw bounced
// the body on a sharp V), and the legs stay inside the skirt (the front carrier's knees came out through its front on
// every dip: 16% of the dance's frames had a leg through the cloth).
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { buildBou } from '../../../src/figures/bou/bou.js';
import { createBouMotion } from '../../../src/figures/bou/bou-motion.js';
import { BOU_TIMING as T } from '../../../src/figures/bou/bou-dance.js';

const rig = buildBou(), motion = createBouMotion(rig), H = 120;
const toShell = new THREE.Matrix4(), v = new THREE.Vector3(), SKIRT = { x: .60, front: 1.02, back: -1.33, hem: -.44, leg: .08 };
let prev = null, prev2 = null, fastest = 0, frames = 0, through = 0; const footA = [], kneeA = [];
for (let k = 0; k / H < T.duration; k++) {
  motion(k / H, 0);
  const cur = [0, 1, 2, 3].map(i => ({ knee: rig.legs[i * 2 + 1].position.clone(), foot: rig.feet[i].position.clone() }));
  if (prev && prev2) for (let i = 0; i < 4; i++) {
    fastest = Math.max(fastest, cur[i].foot.distanceTo(prev[i].foot) * H);
    footA.push(cur[i].foot.clone().sub(prev[i].foot).sub(prev[i].foot.clone().sub(prev2[i].foot)).length() * H * H);
    kneeA.push(cur[i].knee.clone().sub(prev[i].knee).sub(prev[i].knee.clone().sub(prev2[i].knee)).length() * H * H);
  }
  prev2 = prev; prev = cur;
  if (k % 2) continue; // the cloth, at 60 Hz: any point of a leg above the hem and outside the shell's outline there
  rig.root.updateMatrix(); rig.body.updateMatrix(); toShell.multiplyMatrices(rig.root.matrix, rig.body.matrix).invert(); frames++;
  let out = 0;
  for (const leg of rig.legs) { leg.updateMatrix(); for (const u of [0, .25, .5, .75, 1]) { v.set(0, u, 0).applyMatrix4(leg.matrix).applyMatrix4(toShell);
    if (v.y > SKIRT.hem + .03) out = Math.max(out, Math.abs(v.x) + SKIRT.leg - SKIRT.x, v.z + SKIRT.leg - SKIRT.front, SKIRT.back - v.z + SKIRT.leg); } }
  if (out > .02) through++;
}
const p99 = a => a.sort((x, y) => x - y)[Math.floor(a.length * .99)];
assert.ok(fastest < 16, `a shoe jumps (${fastest.toFixed(1)} m/s between two frames)`);
assert.ok(p99(footA) < 450, `the shoes are jerked about (${p99(footA).toFixed(0)} m/s² at the 99th percentile)`);
assert.ok(p99(kneeA) < 500, `the knees are jerked about (${p99(kneeA).toFixed(0)} m/s² at the 99th percentile)`);
assert.ok(through / frames < .01, `legs out through the skirt in ${through} of ${frames} frames`);
console.log('Bou legs ok:', { fastest: +fastest.toFixed(1), shoes99: Math.round(p99(footA)), knees99: Math.round(p99(kneeA)), through });
