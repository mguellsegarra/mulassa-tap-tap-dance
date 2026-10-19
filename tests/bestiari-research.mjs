// Research boundary checks; these do not certify visual fidelity or musical listening.
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeMotion } from '../src/dev/bestiari-compare/motion.js';
import * as THREE from 'three';
import { createCarriers, LEG_LENGTH } from '../src/dev/bestiari-compare/carriers.js';
import { byteRange } from '../tools/bestiari/media-plugin.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const json = p => JSON.parse(readFileSync(resolve(root, p), 'utf8'));
const choreography = json('research/bestiari/mulassa/choreography.json');
const data = json('research/bestiari/mulassa/reconstruction.json'), motion = makeMotion(data);
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
for (const list of motion.events) {
  assert(list[0].start > 2, 'no arbitrary marching while the opening contacts are still');
  for (let k = 0; k < list.length - 1; k++) {
    const t = (list[k].end + list[k + 1].start) / 2;
    const a = motion.foot(t, motion.events.indexOf(list));
    const b = motion.foot(list[k].end, motion.events.indexOf(list));
    assert(a.contact && b.contact); assert.deepEqual(a, b, 'stance stays world fixed');
  }
}
const carriers = createCarriers(new THREE.Scene(), motion);
const up = new THREE.Vector3(0, LEG_LENGTH / 2, 0), end = new THREE.Vector3(), start = new THREE.Vector3();
for (let frame = 0; frame <= 8310; frame++) {
  const t = frame / 50; carriers.pose(t, motion.pose(t));
  for (let pair = 0; pair < 4; pair++) {
    const a = motion.foot(t, pair * 2), b = motion.foot(t, pair * 2 + 1);
    assert(Math.hypot(a.x - b.x, a.z - b.z) >= .25 - 1e-8, 'swing must not cross the planted foot');
  }
  for (const p of carriers.parts) {
    end.copy(up).applyQuaternion(p.thigh.quaternion).add(p.thigh.position);
    start.copy(up).negate().applyQuaternion(p.shin.quaternion).add(p.shin.position);
    assert(end.distanceTo(p.knee.position) < 1e-7 && start.distanceTo(p.knee.position) < 1e-7, `fixed bones meet at knee at ${t}: ${end.distanceTo(p.knee.position)}, ${start.distanceTo(p.knee.position)}`);
    end.copy(up).applyQuaternion(p.shin.quaternion).add(p.shin.position);
    start.copy(p.shoe.position); start.y += .0375;
    assert(end.distanceTo(start) < 1e-7, `ankle reachable at ${t}`);
    assert.equal(p.shoe.scale.y, 1); assert.equal(p.thigh.scale.y, 1); assert.equal(p.shin.scale.y, 1);
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
