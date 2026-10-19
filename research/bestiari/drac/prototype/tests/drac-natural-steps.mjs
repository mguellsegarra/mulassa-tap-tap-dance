// Observable regressions for the preview carrier: a foot describes an arc instead of hanging at one height, and
// the actual cloth bends while staying attached. Ground contacts, choreography and shoe collisions live in
// drac-compare.mjs. These checks add the new knee geometry and material-vertex motion, not another copy of that suite.
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import * as THREE from 'three';
import { buildDrac } from '../src/scene/models/drac.js';
import { poseCompare } from '../src/dev/drac-compare/rig.js';
import { poseAt, newPose } from '../src/dev/drac-compare/pose.js';
import { END } from '../src/dev/drac-compare/path.js';
import { CLOTH } from '../src/dev/drac-compare/carrier-legs.js';
import { actualClothFloor, makeClothProbe, makeClothOrientationProbe } from './drac-cloth-probes.mjs';

// An external baseline module can exercise the same naturalness assertion without editing the checkout.
const { PLAN, feetAt, newFeet } = await import(process.env.DRAC_STEPS_MODULE
  ? pathToFileURL(process.env.DRAC_STEPS_MODULE).href : '../src/dev/drac-compare/steps.js');
const feet = newFeet();
let plateau = 0;
for (const kind of ['step', 'back', 'stride', 'pivot']) {
  const s = PLAN.filter(s => s.kind === kind).sort((a, b) => (b.down - b.up) - (a.down - a.up))[0];
  let peak = 0, nearPeak = 0;
  for (let j = 1; j < 1000; j++) {
    feetAt(feet, s.up + (s.down - s.up) * j / 1000); peak = Math.max(peak, feet[s.i].lift);
  }
  for (let j = 1; j < 1000; j++) {
    feetAt(feet, s.up + (s.down - s.up) * j / 1000);
    if (feet[s.i].lift > peak * 0.99) nearPeak++;
  }
  const share = nearPeak / 999;
  plateau = Math.max(plateau, share);
  assert.ok(peak > 0.01, `${kind}: a visible swing clears the floor`);
  assert.ok(share < 0.25, `${kind}: the foot hangs near peak height for ${(100 * share).toFixed(1)}% of the swing (bound 25%)`);
}
console.log(`  longest near-peak shelf ${(plateau * 100).toFixed(1)}% of a swing`);

const rig = buildDrac(); rig.feet = newFeet();
const scene = new THREE.Group(); scene.add(rig.root);
const pose = newPose(), P = new THREE.Vector3(), Q = new THREE.Vector3(), R = new THREE.Vector3();
function posed(t, g = 1) { poseAt(pose, t, g); poseCompare(rig, pose); scene.updateMatrixWorld(true); }
posed(0);
const probes = rig.legs.map(makeClothProbe);
const orientations = rig.legs.map(makeClothOrientationProbe);
{
  // Reproduce the rejected tangent-projected skin frame on an isolated in-memory rig at its observed collar fold.
  // The assertion inspects the resulting actual triangles; it is independent of that reconstruction's frame math.
  posed(33.167, 1);
  const c = rig.legs[1].cloth, a = c.mesh.geometry.attributes.position.array;
  const right = new THREE.Vector3(), forward = new THREE.Vector3(), tangent = new THREE.Vector3(), centre = new THREE.Vector3(), before = new THREE.Vector3();
  for (let i = 0; i < c.levelIndex.length; i++) {
    const u = c.levels[c.levelIndex[i]], q = u * u * (3 - 2 * u), yaw = c.shoeYaw + (c.pelvisYaw - c.shoeYaw) * q;
    c.sample(u, centre); c.sample(u - 1e-5, before); c.sample(u + 1e-5, tangent).sub(before).normalize();
    right.set(Math.cos(yaw), 0, -Math.sin(yaw)); right.addScaledVector(tangent, -right.dot(tangent)).normalize();
    forward.crossVectors(right, tangent).normalize();
    const x = c.source[i * 3] * CLOTH.width, z = c.source[i * 3 + 2] * CLOTH.width;
    a[i * 3] = centre.x + right.x * x + forward.x * z;
    a[i * 3 + 1] = centre.y + right.y * x + forward.y * z;
    a[i * 3 + 2] = centre.z + right.z * x + forward.z * z;
  }
  const bad = orientations[1].measure();
  assert.ok(bad.minDot < -0.5, `the rejected collar frame exposes inverted actual side faces (${bad.minDot})`);
  posed(33.167, 1);
  assert.ok(orientations[1].measure().minDot > 0, 'the corrected skin keeps its collar side faces outward');
}
posed(0); probes.forEach(p => p.update());
{
  // Validate the collision probe against actual overlapping / separated copies of the rendered cloth, in memory.
  // A broken probe must not bless intersecting legs merely because the normal animation usually keeps them apart.
  const a = rig.legs[1].cloth.mesh.geometry.attributes.position.array, saved = a.slice();
  const dx = rig.legs[0].cloth.cuff.x - rig.legs[1].cloth.cuff.x;
  const dz = rig.legs[0].cloth.cuff.z - rig.legs[1].cloth.cuff.z;
  for (let i = 0; i < a.length; i += 3) { a[i] += dx; a[i + 2] += dz; }
  probes[1].update();
  assert.ok(probes[0].intersects(probes[1], Infinity), 'probe catches overlapping actual cloth');
  for (let i = 0; i < a.length; i += 3) a[i] += 20;
  probes[1].update();
  assert.ok(!probes[0].intersects(probes[1], Infinity), 'probe accepts clearly separated actual cloth');
  a.set(saved); probes[1].update();
  const c = rig.legs[0].cloth;
  c.sample(0.3, P); rig.root.localToWorld(P);
  assert.equal(probes[0].outside(P), 0, 'closed cloth contains its interior centre');
  P.x += 20;
  assert.ok(probes[0].outside(P) > 10, 'outside-distance probe rejects a detached point');
}
{
  // Grazing rays cross adjacent collar triangles within 1e-7 here. Ray-hit deduplication incorrectly classified
  // enclosed shoe uppers as centimetres outside; the closed skin's winding must classify both as interior.
  for (const [t, gain, x, z] of [[5639 / 60, 1, 0, -0.06], [0.15, 0.5, 2.7755575615628914e-17, 0.18000000000000005]]) {
    posed(t, gain); probes[1].update();
    rig.legs[1].shoe.localToWorld(P.set(x, 0.34, z));
    assert.equal(probes[1].outside(P), 0, 'grazing triangle configurations do not invert cloth containment');
  }
}
const sampleIndices = rig.legs.map(l => {
  const s = l.cloth.source, out = [];
  // Track fixed material points, including the lowest/highest corners and points on both sides of the knee.
  for (const u of [0, 0.25, 0.45, 0.55, 0.75, 1]) for (const x of [-0.25, 0.25]) {
    let idx = 0, best = Infinity;
    for (let i = 0; i < s.length / 3; i++) {
      const d = (s[3 * i] - x) ** 2 + (s[3 * i + 1] - (-0.04 + 1.81 * u)) ** 2 + (s[3 * i + 2] - 0.26) ** 2;
      if (d < best) { best = d; idx = i; }
    }
    out.push(idx);
  }
  return [...new Set(out)];
});
function materialPoints() {
  const out = [];
  rig.legs.forEach((l, i) => {
    const a = l.cloth.mesh.geometry.attributes.position;
    for (const k of sampleIndices[i]) { P.fromBufferAttribute(a, k).applyMatrix4(l.cloth.mesh.matrixWorld); out.push(P.x, P.y, P.z); }
  });
  return out;
}

let floor = Infinity, bend = Infinity, collarMiss = 0, outward = { minDot: Infinity };
for (const gain of [0, 0.5, 1]) for (let f = 0; f <= Math.round(END * 60); f++) {
  const t = f / 60; posed(t, gain);
  for (let i = 0; i < 2; i++) {
    const l = rig.legs[i], c = l.cloth;
    const orientation = orientations[i].measure();
    if (orientation.minDot < outward.minDot) outward = { ...orientation, t, gain, leg: i };
    floor = Math.min(floor, actualClothFloor(l));
    P.subVectors(c.hip, c.ankle); const d = P.length(); P.multiplyScalar(1 / d);
    Q.copy(c.knee).sub(c.ankle).addScaledVector(P, -c.knee.clone().sub(c.ankle).dot(P));
    R.set(Math.sin(c.pelvisYaw), 0, Math.cos(c.pelvisYaw)); R.addScaledVector(P, -R.dot(P)).normalize();
    assert.ok(Q.dot(R) > 0.02, `forward, unlocked knee at ${t}, gain ${gain}`);
    bend = Math.min(bend, Q.length());
    // Actual lower-ring vertices stay centred round the shoe's ankle; this would catch a detached cuff.
    probes[i].update();
    P.set(0, 0, 0); for (const { p } of probes[i].caps.cuff) P.add(p); P.multiplyScalar(1 / probes[i].caps.cuff.length);
    l.shoe.getWorldPosition(Q); Q.y += 0.20;
    collarMiss = Math.max(collarMiss, P.distanceTo(Q));
    const a = c.mesh.geometry.attributes.position.array;
    assert.ok(a.every(Number.isFinite), `finite cloth vertices at ${t}`);
  }
}
assert.ok(floor > 0, `actual cloth above floor (${floor})`);
assert.ok(collarMiss < 1e-6, `cuffs stay centred on shoes (${collarMiss})`);
assert.ok(outward.minDot > 0, `actual cloth side faces stay outward: ${JSON.stringify(outward)}`);
console.log(`  actual cloth floor ${floor.toFixed(4)} u, minimum knee bend ${bend.toFixed(3)} u, cuff-centre error ${collarMiss.toExponential(1)}`);
console.log(`  actual side-face minimum outward cosine ${outward.minDot.toFixed(3)} at ${outward.t.toFixed(3)} s, gain ${outward.gain}, leg ${outward.leg}`);

const peaks = {};
for (const fps of [30, 60, 120]) for (const phase of [0, 1 / 3, 2 / 3]) {
  let a, b, peak = 0; const dt = 1 / fps;
  for (let f = 0; (f + phase) * dt <= END; f++) {
    posed((f + phase) * dt); const c = materialPoints();
    if (a) for (let k = 0; k < c.length; k += 3) peak = Math.max(peak, Math.hypot(c[k] - 2 * b[k] + a[k], c[k + 1] - 2 * b[k + 1] + a[k + 1], c[k + 2] - 2 * b[k + 2] + a[k + 2]) / dt ** 2);
    a = b; b = c;
  }
  peaks[fps] = Math.max(peaks[fps] || 0, peak);
}
assert.ok(peaks[120] < peaks[60] * 1.25, `fixed cloth vertices have no velocity steps: ${JSON.stringify(peaks)}`);
console.log(`  fixed material vertices acceleration 30/60/120 fps: ${Object.values(peaks).map(x => x.toFixed(0)).join(' / ')} u/s²`);
console.log('drac-natural-steps: ok');
