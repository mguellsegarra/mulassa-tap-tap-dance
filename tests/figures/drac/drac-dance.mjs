// The Drac's dance as the game draws it (figures/drac/drac-dance.js): song seconds -> the one time map (figures/drac/drac-time.js) ->
// reference seconds -> pose (figures/drac/drac-pose.js) and its groove (figures/drac/drac-groove.js) -> carrier rig
// (figures/drac/drac-rig.js) inside the dance frame placed in the plaça (figures/drac/drac-layout.js placeDance), measured in the plaça's metres:
// (1) at 30 / 60 / 120 fps of song time, a planted shoe never slides in the world, and the root never jumps;
// (2) pure: any seek order (a pause, a retry, a jump) gives the very pose a fresh frame gives;
// (3) the four helpers stand clear of the posed Drac (every mesh vertex: wings, tail, heads) through the whole song.
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { buildDrac, DRAC_SCALE } from '../../../src/figures/drac/drac.js';
import { dracTime } from '../../../src/figures/drac/drac-time.js';
import { poseAt } from '../../../src/figures/drac/drac-pose.js';
import { feetAt } from '../../../src/figures/drac/drac-steps.js';
import { newDracPose } from '../../../src/figures/drac/dance-drac.js';
import { grooveDrac, poseDracDance } from '../../../src/figures/drac/drac-groove.js';
import { placeDance, danceYaw, HELPERS } from '../../../src/figures/drac/drac-layout.js';
import song from '../../../src/song-drac.json' with { type: 'json' };

const FRONT = danceYaw(-81 * Math.PI / 180); // stage.js DRAC_YAW (from CAM_AZ): the helpers' clearance is measured where the game puts them
const rig = buildDrac(), life = new THREE.Group(), pose = newDracPose();
life.add(rig.root); placeDance(life, FRONT); life.scale.setScalar(DRAC_SCALE);
const t0 = dracTime.pickup - 1, t1 = song.end + 1; // the count-in's last second to past the final hit
function draw(t) {
  const ref = dracTime.refAt(t), beat = dracTime.beatAt(t), P = poseAt(pose, ref, beat);
  grooveDrac(P, beat, ref, 1); poseDracDance(rig, P, beat, ref, 1, feetAt);
  life.updateMatrixWorld(true);
}
const shoeW = i => rig.legs[i].shoe.getWorldPosition(new THREE.Vector3());

// ---- (1)
for (const fps of [30, 60, 120]) {
  let slide = 0, jump = 0, prevRoot = null;
  const was = [null, null];
  for (let k = 0, t = t0; t <= t1; t = t0 + ++k / fps) {
    draw(t);
    const root = rig.root.getWorldPosition(new THREE.Vector3());
    if (prevRoot) jump = Math.max(jump, root.distanceTo(prevRoot) * fps); // m/s
    prevRoot = root;
    for (let i = 0; i < 2; i++) {
      const p = shoeW(i), planted = rig.feet[i].lift === 0;
      if (planted && was[i]) slide = Math.max(slide, Math.hypot(p.x - was[i].x, p.z - was[i].z));
      was[i] = planted ? p : null;
    }
  }
  assert.ok(slide < 1e-6, `${fps} fps: a planted shoe slides ${slide} m in the plaça`);
  assert.ok(jump < 3, `${fps} fps: the root never jumps (fastest ${jump.toFixed(2)} m/s)`);
}

// ---- (2)
const snap = () => [rig.body.matrixWorld.elements, ...rig.legs.map(l => l.shoe.matrixWorld.elements), rig.legs[0].pants.children[0].geometry.attributes.position.array.slice(0, 60)].flatMap(a => [...a]);
const times = Array.from({ length: 300 }, (_, k) => t0 + (t1 - t0) * ((k * 7919) % 300) / 300); // a shuffled order
const fresh = times.map(t => { const r = buildDrac(), g = new THREE.Group(); g.add(r.root); placeDance(g, FRONT); g.scale.setScalar(DRAC_SCALE);
  const ref = dracTime.refAt(t), beat = dracTime.beatAt(t), P = poseAt(newDracPose(), ref, beat);
  grooveDrac(P, beat, ref, 1); poseDracDance(r, P, beat, ref, 1, feetAt); g.updateMatrixWorld(true);
  return [r.body.matrixWorld.elements, ...r.legs.map(l => l.shoe.matrixWorld.elements), r.legs[0].pants.children[0].geometry.attributes.position.array.slice(0, 60)].flatMap(a => [...a]); });
times.forEach((t, k) => { draw(t); assert.deepEqual(snap(), fresh[k], `the pose at song ${t.toFixed(3)} s depends on nothing but the time`); });

// ---- (3) the helpers' body and clap (a 0.68 x 0.72 m box round each spot, its front 0.52 m inwards), in the plaça
const helperAt = HELPERS.map(h => { const g = new THREE.Object3D(); placeDance(g, FRONT); g.updateMatrixWorld(true);
  const c = new THREE.Vector3(h.x, 0, h.z).applyMatrix4(g.matrixWorld); return { id: h.id, x: c.x, z: c.z, yaw: FRONT + h.yaw }; });
const verts = [], v = new THREE.Vector3();
rig.root.traverse(o => { if (o.isMesh) verts.push(o); });
const near = HELPERS.map(() => ({ d: Infinity, t: 0 }));
for (let t = t0; t <= t1; t += 0.05) {
  draw(t);
  for (const o of verts) {
    if (!o.visible) continue;
    const p = o.geometry.attributes.position;
    for (let k = 0; k < p.count; k += 2) {
      v.fromBufferAttribute(p, k).applyMatrix4(o.matrixWorld);
      helperAt.forEach((h, i) => {
        const dx = v.x - h.x, dz = v.z - h.z, c = Math.cos(h.yaw), s = Math.sin(h.yaw), lx = c * dx - s * dz, lz = s * dx + c * dz; // into the helper's frame (+z inwards)
        const d = Math.hypot(Math.max(0, Math.abs(lx) - 0.34), Math.max(0, lz - 0.52, -0.2 - lz));
        if (d < near[i].d) near[i] = { d, t };
      });
    }
  }
}
for (const [i, h] of helperAt.entries()) assert.ok(near[i].d >= 0.25, `helper ${h.id} only ${near[i].d.toFixed(2)} m from the Drac at song ${near[i].t.toFixed(2)} s`);
console.log(`drac-dance: ok (planted shoes fixed at 30/60/120 fps; seek-pure; helpers clear by ${near.map((n, i) => `${helperAt[i].id} ${n.d.toFixed(2)} m`).join(', ')})`);
