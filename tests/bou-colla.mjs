// The Bou's colla (scene/bou-colla.js): four garnet attendants W/N/S/E facing the centre, clear of the Bou's whole
// song footprint, none in the play camera's view of it (it looks in between W and S); no one seated; the capatàs a
// fifth, off the marks; the bodies build with the Bou's looks.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { BOU_HELPERS, BOU_CAPATAS, bouToWorld, createBouColla } from '../src/scene/bou-colla.js';
import { bouPose, BOU_TIMING } from '../src/game/bou-dance.js';
import { BOU_HELPER_LOOKS, buildHelper, poseHelper } from '../src/scene/models/colla.js';
import * as THREE from 'three';
import { PROFILES } from '../src/platform/render-quality.js';

const stage = readFileSync(new URL('../src/scene/stage.js', import.meta.url), 'utf8'); // (it needs a DOM: read, don't import)
const CAM_AZ = Number(stage.match(/CAM_AZ = (-?[\d.]+) \* Math\.PI \/ 180/)[1]) * Math.PI / 180;
assert.match(stage, /FRONT = CAM_AZ \+ 0\.35;/); assert.match(stage, /BOU_COLLA_YAW = CAM_AZ - Math\.PI \/ 4;/);
const FRONT = CAM_AZ + 0.35, YAW = CAM_AZ - Math.PI / 4;
const turn = (x, z, a) => ({ x: x * Math.cos(a) + z * Math.sin(a), z: -x * Math.sin(a) + z * Math.cos(a) });
const off = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));

// the Bou's floor box (horns to tail, flank to flank, with margin) at every pose of its song, in the plaça
const box = [];
for (let t = 0; t <= BOU_TIMING.duration; t += 0.05) {
  const p = bouPose(t);
  for (const [bx, bz] of [[0.7, 1.9], [-0.7, 1.9], [0.7, -1.7], [-0.7, -1.7], [0, 1.9], [0, -1.7]]) {
    const local = turn(bx, bz, p.yaw); box.push(turn(p.x + local.x, p.z + local.z, FRONT));
  }
}
const reach = Math.max(...box.map(q => Math.hypot(q.x, q.z)));
const helpers = [...BOU_HELPERS, BOU_CAPATAS].map(h => ({ ...h, w: bouToWorld(h.x, h.z, YAW) }));
for (const h of helpers) {
  const near = Math.min(...box.map(q => Math.hypot(q.x - h.w.x, q.z - h.w.z)));
  assert.ok(near > 0.45 + 0.75, `${h.id} is ${near.toFixed(2)} m from the Bou`);
  assert.ok(off(Math.atan2(h.w.x, h.w.z), CAM_AZ) > 0.7, `${h.id} stands in the camera's shot`);
  const face = h.yaw + YAW; // its local +z, in the plaça: towards the centre
  assert.ok(off(face, Math.atan2(-h.w.x, -h.w.z)) < 1e-9, `${h.id} faces the centre`);
}
const head = id => Math.atan2(helpers.find(h => h.id === id).w.x, helpers.find(h => h.id === id).w.z);
assert.ok(off(head('W'), CAM_AZ) - Math.PI / 4 < 1e-9 && off(head('S'), CAM_AZ) - Math.PI / 4 < 1e-9, 'the camera looks in between W and S');
const colla = createBouColla(PROFILES[2]);
assert.equal(colla.members.length, 0, 'no one seated (Marc)'); colla.setProfile(PROFILES[2]); assert.equal(colla.count, 0);
assert.deepEqual(colla.crew.map(p => p.g.name), ['helper-W', 'helper-N', 'helper-S', 'helper-E', 'helper-C']);
assert.ok(BOU_HELPER_LOOKS.slice(0, 4).every(l => !l.staff) && BOU_HELPER_LOOKS[4].staff, 'the capatàs is a fifth, none of the four marks');
assert.ok(BOU_HELPER_LOOKS.every(l => l.tunic && /^#[789]/.test(l.top)), 'garnet tunics');
assert.equal(BOU_HELPER_LOOKS.filter(l => l.staff).length, 1, 'one capatàs with the staff');
colla.update(3.5, 1); colla.dispose();
// the capatàs's staff, at any beat or cheer: upright, its foot on the paving
const old = buildHelper(BOU_HELPER_LOOKS.find(l => l.staff), 1), pole = old.arms[0].el.children.at(-1);
for (const [beat, cheer] of [[0, 0], [3.5, 0], [7.25, 1]]) {
  poseHelper(old, beat, 1, cheer); old.g.position.y = 0; old.g.updateMatrixWorld(true);
  const a = new THREE.Vector3(0, 0, 0).applyMatrix4(pole.matrixWorld), b = new THREE.Vector3(0, 1, 0).applyMatrix4(pole.matrixWorld);
  assert.ok(Math.hypot(b.x - a.x, b.z - a.z) < 1e-6 && b.y > a.y, 'the staff stands upright');
  const box = new THREE.Box3().setFromObject(pole); // the drawn staff, not only its origin
  assert.ok(Math.abs(box.min.y) < 0.005 && box.max.y > 1.5, `the staff spans ${box.min.y.toFixed(3)}-${box.max.y.toFixed(2)} m`);
  assert.ok(Math.abs(a.y) < 1e-6 && Math.hypot(a.x, a.z) < 0.6, `the staff's foot at ${a.toArray().map(n => n.toFixed(2))}`);
}
console.log(`bou colla ok (footprint ${reach.toFixed(2)} m, attendants ${BOU_HELPERS[0].z} m)`);
