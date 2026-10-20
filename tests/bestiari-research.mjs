// Research boundary checks; these do not certify visual fidelity or musical listening.
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { buildMulassa } from '../src/scene/models/mulassa.js';
import { makeMulaMotion } from '../src/game/mula-path.js';
import { shoeSeparation, SHOE, planSupports } from '../src/game/mula-supports.js';
import { createCarriers } from '../src/scene/mula-carriers.js';
import { makeDirections } from '../src/dev/bestiari-compare/directions.js';
import { createCameraFrame } from '../src/dev/bestiari-compare/camera.js';
import { byteRange } from '../tools/bestiari/media-plugin.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const json = p => JSON.parse(readFileSync(resolve(root, p), 'utf8'));
const choreography = json('research/bestiari/mulassa/choreography.json');
// The reconstruction and its shoes now live in the game (game/mula-path.js, mula-supports.js, scene/mula-carriers.js):
// the comparator and the game pose the same modules, so these checks cover what the game shows.
const data = json('src/game/mula-reconstruction.json'), reconstruction = makeMulaMotion(data), supports = planSupports(reconstruction.pose);
const motion = { pose: reconstruction.pose, foot: supports.foot, events: supports.events };
// Evaluate the actual rendered camera and body, not just continuous root coordinates.
const seamRig = buildMulassa(), seamCamera = new THREE.PerspectiveCamera(32, 16 / 9, .1, 60);
const frameSeamCamera = createCameraFrame(seamCamera);
const seamPoint = new THREE.Vector3();
function projectedSeamPoint(t) {
  const p = motion.pose(t);
  seamRig.root.position.set(p.x, p.lift, p.z); seamRig.root.rotation.y = p.yaw;
  seamRig.body.rotation.set(p.pitch, 0, p.roll); seamRig.root.updateMatrixWorld(true);
  frameSeamCamera(t, p, seamRig.body);
  seamPoint.set(0, .44, 0); seamRig.body.localToWorld(seamPoint); seamPoint.project(seamCamera);
  return [seamPoint.x * 640, seamPoint.y * 360]; // pixels in a 1280 x 720 panel
}
for (const t of [31.7, 34, 36, 65, 66, 67, 89, 90, 120, 121]) {
  const a = projectedSeamPoint(t - 1e-6), b = projectedSeamPoint(t + 1e-6);
  assert(Math.hypot(b[0] - a[0], b[1] - a[1]) < .01, `camera framing jumps at ${t}s`);
}
for (const fps of [30, 50, 60, 120]) for (const offset of [0, .37]) {
  let a = projectedSeamPoint(88 + offset / fps), prior = null;
  for (let i = 1; i < 3 * fps; i++) {
    const b = projectedSeamPoint(88 + (i + offset) / fps), delta = [b[0] - a[0], b[1] - a[1]];
    assert(Math.hypot(...delta) * fps < 150, 'camera handoff must not introduce a screen-space lurch');
    if (prior) assert(Math.hypot(delta[0] - prior[0], delta[1] - prior[1]) * fps ** 2 < 1600,
      'camera handoff must not introduce an abrupt velocity change');
    prior = delta; a = b;
  }
}
assert.equal(choreography.phases[0].start, 0);
assert.equal(choreography.phases.at(-1).end, 166.2);
for (let i = 1; i < choreography.phases.length; i++) assert.equal(choreography.phases[i].start, choreography.phases[i - 1].end);
for (const key of ['yawDegrees', 'rootMetres', 'sway']) {
  const rows = data[key];
  for (let i = 1; i < rows.length; i++) assert(rows[i][0] > rows[i - 1][0], `${key}: time must increase`);
}
const degrees = t => motion.pose(t).yaw * 180 / Math.PI;
// Independent frame landmarks: first turn through front, second through back, then two reversals.
assert(Math.abs(degrees(33)) < 35, 'first half turn passes the camera');
assert(degrees(35) - degrees(31) > 150, 'first half turn keeps its direction');
assert(degrees(69) - degrees(66.5) > 150, 'second half turn keeps its direction');
assert(degrees(142) < degrees(139.25) - 150, 'clockwise reversal must survive interpolation');
assert(degrees(145.5) > degrees(142.5) + 150, 'second reversal must survive interpolation');
const finalTurns = (degrees(161.5) - degrees(145.5)) / 360;
assert(finalTurns > 3.8 && finalTurns < 4.2, 'about four final turns, not shortest-angle wrapping');
const expected = motion.pose(140.75);
for (const t of [156, 6, 166.2, 130, 0]) motion.pose(t);
assert.deepEqual(motion.pose(140.75), expected, 'seeking is independent of history');
for (let frame = 0; frame <= 8310; frame++) {
  const t = frame / 50, p = motion.pose(t);
  assert(Object.values(p).every(Number.isFinite));
  for (let i = 0; i < 8; i++) {
    const f = motion.foot(t, i);
    assert(f.y >= 0 && Number.isFinite(f.x) && Number.isFinite(f.z));
  }
}
// Regression: the opening must traverse laterally and return, not rotate in place.
assert(motion.pose(14).x - motion.pose(24).x > .7, 'visible opening lateral return');
assert(motion.pose(30).x - motion.pose(24).x > .25, 'return towards the initial area');
assert(motion.pose(6).pitch > .025 && motion.pose(24).pitch < -.10, 'source hem changes tilt direction');
assert(motion.pose(75).z - motion.pose(71).z > 2, 'rapid 71–75 s approach must travel towards the viewer');
assert(motion.pose(71).x - motion.pose(75).x > 2.5, 'approach also travels left across the floor');
assert(motion.pose(106).x - motion.pose(90).x > 1.5, 'late passage travels laterally instead of swaying in place');
assert(motion.pose(110).pitch > .25, 'visible forward dip around 110 s');
assert(motion.pose(127).pitch < -.3 && motion.pose(128).pitch > .3, 'front alternates up/down rather than lifting every time');
const still = planSupports((_t, out) => Object.assign(out, { x: 0, z: 0, yaw: 0, roll: 0, pitch: 0, lift: 0 }), 5);
assert(still.events.every(list => list.length === 0), 'no arbitrary marching when the carried figure is still');
for (const list of motion.events) {
  for (let k = 0; k < list.length - 1; k++) {
    const t = (list[k].end + list[k + 1].start) / 2;
    const a = motion.foot(t, motion.events.indexOf(list));
    const b = motion.foot(list[k].end, motion.events.indexOf(list));
    assert(a.contact && b.contact); assert.deepEqual(a, b, 'stance stays world fixed');
  }
  for (const event of list) for (const t of [event.start, event.end]) {
    const index = motion.events.indexOf(list), a = motion.foot(t - .00001, index), b = motion.foot(t + .00001, index);
    assert(Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z) < .001, `foot pops at contact at ${t}`);
  }
}
const footSeek = motion.foot(144.84375, 6);
for (const t of [17, 161, 33, 84]) motion.foot(t, 6);
assert.deepEqual(motion.foot(144.84375, 6), footSeek, 'avoidance must not depend on playback history');
const carrierScene = new THREE.Scene(), shell = buildMulassa(); carrierScene.add(shell.root);
const carriers = createCarriers(); shell.root.add(carriers.group);
const feetNow = Array.from({ length: 8 }, () => ({}));
function poseCarriers(t, p = motion.pose(t)) { // the shell first (the cuffs reach into its actual cloth), then the shoes
  shell.root.position.set(p.x, p.lift, p.z); shell.root.rotation.y = p.yaw; shell.body.rotation.set(p.pitch, 0, p.roll);
  for (let i = 0; i < 8; i++) motion.foot(t, i, feetNow[i]);
  carriers.pose(shell, feetNow); carrierScene.updateMatrixWorld(true);
  return p;
}
// each instance where the GPU draws it: the instanced mesh's world matrix times its own
const instanceWorld = (mesh, i, out) => { mesh.getMatrixAt(i, out); return out.premultiply(mesh.matrixWorld); };
const parts = [0, 1, 2, 3, 4, 5, 6, 7].map(() => ({ cuff: new THREE.Matrix4(), shoe: new THREE.Matrix4(), q: new THREE.Quaternion(), s: new THREE.Vector3(), p: new THREE.Vector3(), sq: new THREE.Quaternion(), ss: new THREE.Vector3(), sp: new THREE.Vector3() }));
const readParts = () => parts.forEach((o, i) => {
  instanceWorld(carriers.cuffs, i, o.cuff).decompose(o.p, o.q, o.s); instanceWorld(carriers.shoes, i, o.shoe).decompose(o.sp, o.sq, o.ss);
});
// The accepted visual abstraction has straight trouser cuffs, not exposed knee/hip chains.
const cuffAxis = new THREE.Vector3();
for (const t of [0, 1, 110, 166.2]) {
  poseCarriers(t); readParts();
  for (const o of parts) {
    cuffAxis.set(0, 1, 0).applyQuaternion(o.q);
    assert(cuffAxis.y > Math.cos(10 * Math.PI / 180), `unnecessary resting cuff lean at ${t}`);
  }
}
const directions = makeDirections(motion.pose(0));
assert.equal(directions.heading(motion.pose(0).yaw), 'W');
assert.equal(directions.heading(motion.pose(35.5).yaw), 'E');
assert.equal(directions.heading(motion.pose(69.5).yaw), 'W');
assert.equal(directions.heading(motion.pose(166.2).yaw), 'W');
const origin = directions.origin;
for (const marker of directions.markers) {
  const east = directions.east(origin.x + marker.x, origin.z + marker.z);
  const south = directions.south(origin.x + marker.x, origin.z + marker.z);
  const expected = { W: [-1, 0], E: [1, 0], N: [0, -1], S: [0, 1] }[marker.name];
  assert(Math.abs(east - expected[0]) < 1e-10 && Math.abs(south - expected[1]) < 1e-10, 'map and 3D share fixed directions');
}
assert(Math.abs(directions.east(-.95, 10)) > 3, 'the reference camera must not define S');
assert(Math.abs(motion.pose(1).roll) > .04, 'opening side sway must reach the whole silhouette');
assert(Math.abs(motion.pose(1).headRoll) > .004, 'small explicit expressive head accent');
for (const t of [0, 165, 166.2]) assert(Math.abs(motion.pose(t).headRoll) < 1e-8, 'secondary motion settles');
for (const list of motion.events) for (const event of list) {
  assert(Math.hypot(event.to.x - event.from.x, event.to.z - event.from.z) < .85, 'avoid the former metre-long landing correction');
}
const shellInverse = new THREE.Matrix4(), localVertex = new THREE.Vector3();
const end = new THREE.Vector3(), start = new THREE.Vector3(), cuffPositions = carriers.cuffs.geometry.attributes.position;
for (let frame = 0; frame <= 39888; frame++) {
  const t = Math.min(166.2, (frame + .5) / 240);
  poseCarriers(t); readParts();
  shellInverse.copy(shell.body.matrixWorld).invert();
  // Actual rendered vertices against the original skirt's central solid box, not just joint centres.
  for (const o of parts) {
    for (let i = 0; i < cuffPositions.count; i++) {
      localVertex.fromBufferAttribute(cuffPositions, i).applyMatrix4(o.cuff).applyMatrix4(shellInverse);
      if (localVertex.y > -.5 && localVertex.y < .75) {
        assert(Math.abs(localVertex.x) < .56 && Math.abs(localVertex.z) < 1.66, `carrier protrudes above hem at ${t}`);
      }
    }
  }
  for (let i = 0; i < 8; i++) for (let j = i + 1; j < 8; j++) {
    const a = motion.foot(t, i), b = motion.foot(t, j), gap = shoeSeparation(a, b, {}).gap;
    assert(gap >= -1e-7 || Math.abs(a.y - b.y) >= SHOE.height - 1e-7, `shoes intersect at ${t}: ${i}/${j}`);
  }
  for (const o of parts) {
    end.set(0, -.5, 0).applyMatrix4(o.cuff);
    start.copy(o.sp); start.y += SHOE.height * .3;
    assert(end.distanceTo(start) < 1e-5, `trouser cuff remains attached to shoe at ${t}`); // (float32 instance matrices)
    cuffAxis.set(0, 1, 0).applyQuaternion(o.q);
    assert(cuffAxis.y > Math.cos(35 * Math.PI / 180), `cuff sprawls outward at ${t}`);
    assert(Math.abs(o.s.x - 1) < 1e-5 && Math.abs(o.s.z - 1) < 1e-5, 'the cuff keeps its width and depth');
    assert(Math.abs(o.ss.x - 1) < 1e-5 && Math.abs(o.ss.y - 1) < 1e-5 && Math.abs(o.ss.z - 1) < 1e-5, 'rigid shoes');
    assert(o.sp.y >= SHOE.height / 2 - 1e-5, 'shoe sole stays above ground');
  }
}
assert.equal(motion.pose(166.2).lift, 0, 'settled at the end');

assert.deepEqual(byteRange('bytes=10-19', 100), { start: 10, end: 19 });
assert.deepEqual(byteRange('bytes=-10', 100), { start: 90, end: 99 });
assert.deepEqual(byteRange('bytes=95-', 100), { start: 95, end: 99 });
for (const invalid of ['bytes=100-', 'bytes=20-10', 'bytes=0-1,10-20', 'bytes=-0', 'bytes=a-b']) assert.equal(byteRange(invalid, 100), false);

for (const [folder, manifest] of [['research/bestiari/drac/prototype', 'research/bestiari/drac/snapshot.json'], ['research/bestiari/drac/legacy', 'research/bestiari/drac/legacy/snapshot.json']]) {
  for (const entry of json(manifest).files) {
    const bytes = readFileSync(resolve(root, folder, entry.path));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), entry.sha256, `archive drift: ${entry.path}`);
  }
}
// Follow the production import graph: dev dossiers must never become a game dependency.
const seen = new Set(), todo = [resolve(root, 'src/main.js')];
while (todo.length) {
  const path = todo.pop(); if (seen.has(path)) continue; seen.add(path);
  assert(!path.includes('/research/') && !path.includes('/bestiari-compare/'));
  for (const match of readFileSync(path, 'utf8').matchAll(/(?:from\s+|import\s*\(?\s*)['"](\.[^'"]+)['"]/g)) {
    const dep = resolve(dirname(path), match[1]); assert(existsSync(dep), dep);
    if (dep.endsWith('.js')) todo.push(dep);
  }
}
console.log('bestiari research: archive integrity, observed turn sequence, deterministic supports, HTTP ranges and production isolation pass');
