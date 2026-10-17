// Actual mesh/world-matrix regression. No renderer, clock accumulation or pose-only contact proof.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import * as THREE from 'three';
import { ConvexHull } from 'three/addons/math/ConvexHull.js';
import { OBB } from 'three/addons/math/OBB.js';
const { aligaPose, newAligaPose, LEGS, standFeet } = await import(process.env.ALIGA_DANCE_SOURCE
  ? 'data:text/javascript;base64,' + Buffer.from(readFileSync(process.env.ALIGA_DANCE_SOURCE, 'utf8')).toString('base64')
  : '../src/game/aliga-dance.js');
const modelURL = new URL('../src/scene/models/aliga.js', import.meta.url);
// An outside-Git saved source can be exercised with its original relative imports.
const source = process.env.ALIGA_RIG_MODEL;
const model = source ? await import('data:text/javascript;base64,' + Buffer.from(readFileSync(source, 'utf8')
  .replace(/from '([^']+)'/g, (_, p) => `from '${p.startsWith('.') ? new URL(p, modelURL).href : p === 'three' ? import.meta.resolve(p) : p}'`)).toString('base64')) : await import(modelURL);
const { buildAligaRig, applyAligaPose, NEUTRAL } = model;
const song = JSON.parse(readFileSync(new URL('../src/game/aliga-song.json', import.meta.url)));
const timeline = JSON.parse(readFileSync(process.env.ALIGA_DANCE_TIMELINE || new URL('../src/game/aliga-dance.json', import.meta.url)));
const rig = buildAligaRig(), pose = newAligaPose(), figures = [rig.aliga, ...rig.aligons];
// 2 micrometres covers Float32 box vertices (~1e-8 m), without hiding visible gaps/sliding.
const errors = new Map();
function verify(ok, message) {
  if (ok) return;
  const category = message.replace(/^.*: /, '').replace(/ at .*/, '').replace(/[-+]?\d*\.?\d+(?:e[-+]?\d+)?/g, '#');
  const item = errors.get(category) || { count: 0, first: message };
  item.count++; errors.set(category, item);
}
const EPS = 2e-6, CONTACT = 1e-10;
const point = new THREE.Vector3(), inv = new THREE.Matrix4();
const cache = new WeakMap();
function localBoxes(mesh) {
  if (!cache.has(mesh)) {
    const a = mesh.geometry.attributes.position, boxes = [];
    for (let i = 0; i < a.count; i += 24) {
      const b = new THREE.Box3();
      for (let j = i; j < i + 24; j++) b.expandByPoint(point.fromBufferAttribute(a, j));
      boxes.push(b);
    }
    cache.set(mesh, boxes);
  }
  return cache.get(mesh);
}
const supportCache = new WeakMap();
let floorWorst = { value: 0 };
function groundClear(mesh, label) {
  if (!supportCache.has(mesh)) {
    const p = mesh.geometry.attributes.position, points = [];
    for (let i = 0; i < p.count; i++) points.push(new THREE.Vector3().fromBufferAttribute(p, i));
    const hull = new ConvexHull().setFromPoints(points), used = new Set();
    for (const f of hull.faces) { let e = f.edge; do { used.add(e.head().point); e = e.next; } while (e !== f.edge); }
    supportCache.set(mesh, [...used]);
  }
  const m = mesh.matrixWorld.elements;
  for (const v of supportCache.get(mesh)) {
    const y = m[1] * v.x + m[5] * v.y + m[9] * v.z + m[13];
    if (y < floorWorst.value) {
      let part = 'body', who = -1;
      figures.forEach((fig, i) => fig.ik?.limbs.forEach((l, side) => ['thigh', 'shin', 'shoe'].forEach(name => {
        if (l[name] === mesh) { who = i; part = `${side}/${name}`; }
      })));
      floorWorst = { value: y, label, who, part };
    }
    verify(y >= -EPS, `${label}: actual ${mesh.name || mesh.type} geometry below ground`);
  }
}
function worldOBB(b, matrix) {
  const out = new OBB().fromBox3(b), centre = out.center.clone().applyMatrix4(matrix);
  out.applyMatrix4(matrix); out.center.copy(centre); return out;
}
function contains(mesh, p) {
  inv.copy(mesh.matrixWorld).invert(); point.copy(p).applyMatrix4(inv);
  return localBoxes(mesh).some(b => point.x >= b.min.x - EPS && point.x <= b.max.x + EPS
    && point.y >= b.min.y - EPS && point.y <= b.max.y + EPS && point.z >= b.min.z - EPS && point.z <= b.max.z + EPS);
}
function sole(mesh) {
  const a = mesh.geometry.attributes.position, b = localBoxes(mesh)[0], corners = [];
  // Read actual bottom vertices, rather than manufacturing corners from the pose/schema.
  for (let j = 0; j < 24; j++) {
    const v = new THREE.Vector3().fromBufferAttribute(a, j);
    if (Math.abs(v.y - b.min.y) < EPS && !corners.some(c => c.distanceTo(v) < EPS)) corners.push(v);
  }
  assert.equal(corners.length, 4, 'shoe has four actual sole corners');
  return corners;
}
let collisionCount = 0, firstCollision, containedHipContacts = 0;
const collisionSummary = new Map();
function axisOverlap(a, b, x, y, z) {
  const length = Math.hypot(x, y, z);
  if (length < 1e-9) return Infinity;
  const A = a.rotation.elements, B = b.rotation.elements, ah = a.halfSize, bh = b.halfSize;
  const radius = (e, h) => Math.abs(x * e[0] + y * e[1] + z * e[2]) * h.x
    + Math.abs(x * e[3] + y * e[4] + z * e[5]) * h.y + Math.abs(x * e[6] + y * e[7] + z * e[8]) * h.z;
  return (radius(A, ah) + radius(B, bh) - Math.abs(x * (a.center.x - b.center.x)
    + y * (a.center.y - b.center.y) + z * (a.center.z - b.center.z))) / length;
}
function penetration(a, b) {
  const A = a.rotation.elements, B = b.rotation.elements;
  let depth = Infinity;
  for (let i = 0; i < 9; i += 3) {
    depth = Math.min(depth, axisOverlap(a, b, A[i], A[i + 1], A[i + 2]), axisOverlap(a, b, B[i], B[i + 1], B[i + 2]));
    for (let j = 0; j < 9; j += 3) depth = Math.min(depth, axisOverlap(a, b,
      A[i + 1] * B[j + 2] - A[i + 2] * B[j + 1], A[i + 2] * B[j] - A[i] * B[j + 2], A[i] * B[j + 1] - A[i + 1] * B[j]));
  }
  return depth;
}
function obbCorners(box) {
  if (box.corners) return box.corners;
  const e = box.rotation.elements, h = box.halfSize;
  const points = [];
  for (const x of [-h.x, h.x]) for (const y of [-h.y, h.y]) for (const z of [-h.z, h.z])
    points.push(new THREE.Vector3(box.center.x + e[0]*x + e[3]*y + e[6]*z,
      box.center.y + e[1]*x + e[4]*y + e[7]*z, box.center.z + e[2]*x + e[5]*y + e[8]*z));
  return box.corners = points;
}
function intersectionVertices(a, b) {
  const out = [];
  // Every convex intersection vertex is a corner or an edge/face intersection.
  // Clip all twelve edges of each actual OBB against the other OBB's six planes.
  const clip = (box, other) => {
    const corners = obbCorners(box), e = other.rotation.elements, h = other.halfSize.toArray();
    for (let k = 0; k < 8; k++) for (const bit of [1, 2, 4]) {
      if (k & bit) continue;
      const start = corners[k], delta = corners[k | bit].clone().sub(start), rel = start.clone().sub(other.center);
      let lo = 0, hi = 1;
      for (let axis = 0; axis < 3; axis++) {
        const j = axis * 3, origin = rel.x*e[j] + rel.y*e[j+1] + rel.z*e[j+2];
        const direction = delta.x*e[j] + delta.y*e[j+1] + delta.z*e[j+2];
        if (Math.abs(direction) < 1e-12) { if (Math.abs(origin) > h[axis] + 1e-12) { hi = -1; break; } }
        else {
          const a = (-h[axis] - origin) / direction, b = (h[axis] - origin) / direction;
          lo = Math.max(lo, Math.min(a, b)); hi = Math.min(hi, Math.max(a, b));
          if (lo > hi) break;
        }
      }
      if (lo <= hi) out.push(start.clone().addScaledVector(delta, lo), start.clone().addScaledVector(delta, hi));
    }
  };
  clip(a, b); clip(b, a); return out;
}
const bodyVoxelCache = new WeakMap();
function insideSharedBody(a, b, who) {
  if (!Number.isInteger(who) || a.part !== 'thigh' || b.part !== 'thigh') return false;
  const mesh = figures[who].body.children[0];
  if (mesh.userData.probeFrame !== frames) {
    mesh.userData.probeFrame = frames;
    (mesh.userData.probeInverse ||= new THREE.Matrix4()).copy(mesh.matrixWorld).invert();
  }
  const inverse = mesh.userData.probeInverse;
  const vertices = intersectionVertices(a, b).map(v => v.applyMatrix4(inverse));
  if (!vertices.length) return false;
  // Bound the EXACT convex intersection vertices, not the intersection of two
  // broad-phase AABBs. Proving coverage of this entire prism also proves coverage
  // of the convex intersection's interior, even across adjacent body voxels.
  const prism = new THREE.Box3().setFromPoints(vertices);
  if (!bodyVoxelCache.has(mesh)) {
    const attr = mesh.geometry.attributes.position, boxes = localBoxes(mesh);
    bodyVoxelCache.set(mesh, boxes.filter((_, i) => {
      const origin = new THREE.Vector3().fromBufferAttribute(attr, i * 24);
      return [1, 2].every(k => {
        const edge = new THREE.Vector3().fromBufferAttribute(attr, i * 24 + k).sub(origin).normalize();
        return Math.max(Math.abs(edge.x), Math.abs(edge.y), Math.abs(edge.z)) > 1 - 1e-6;
      });
    }).sort((a, b) => a.min.y - b.min.y));
  }
  const intervals = bodyVoxelCache.get(mesh).filter(v => v.min.x <= prism.min.x + EPS && v.max.x >= prism.max.x - EPS
    && v.min.z <= prism.min.z + EPS && v.max.z >= prism.max.z - EPS && v.max.y >= prism.min.y && v.min.y <= prism.max.y)
    .map(v => [v.min.y, v.max.y]).sort((a, b) => a[0] - b[0]);
  let covered = prism.min.y;
  for (const [lo, hi] of intervals) { if (lo > covered + EPS) break; covered = Math.max(covered, hi); }
  return covered >= prism.max.y - EPS;
}
function collision(a, b, who, label) {
  // The two thighs may join within the common solid body. Exempt only a
  // conservative prism containing the complete intersection, proven covered
  // by actual body voxels. Knees/cuffs/shoes and exposed thigh contacts stay strict.
  if (insideSharedBody(a, b, who)) { containedHipContacts++; return; }
  collisionCount++; firstCollision ||= `${label}: ${who} ${a.part}/${b.part} boxes ${a.box}/${b.box}`;
  const key = `${who}:${a.part}/${b.part}`, depth = penetration(a, b);
  const stat = collisionSummary.get(key) || { count: 0, maxDepth: 0 };
  stat.count++;
  if (depth > stat.maxDepth) { stat.maxDepth = depth; stat.worst = label; stat.boxes = [a.box, b.box]; stat.worstContainedInsideSharedBody = insideSharedBody(a, b, who); }
  collisionSummary.set(key, stat);
}
let motionPrev, motionPrev2, motionDt;
const motion = { speed: { value: 0 }, acceleration: { value: 0 } };
function motionProbe(t, label) {
  const points = [];
  figures.forEach((fig, who) => fig.ik.limbs.forEach((l, i) => {
    points.push({ key: `${who}/${i}/knee`, v: new THREE.Vector3().setFromMatrixPosition(l.shin.matrixWorld) });
    for (const name of ['thigh', 'shin']) {
      const a = l[name].geometry.attributes.position;
      for (const vertex of [0, a.count - 1]) points.push({ key: `${who}/${i}/${name}/${vertex}`,
        v: new THREE.Vector3().fromBufferAttribute(a, vertex).applyMatrix4(l[name].matrixWorld) });
    }
  }));
  if (motionPrev) {
    const dt = t - motionPrev.t;
    points.forEach((p, i) => {
      const speed = p.v.distanceTo(motionPrev.points[i].v) / dt;
      if (speed > motion.speed.value) motion.speed = { value: speed, label, point: p.key };
      if (motionPrev2 && Math.abs(dt - motionDt) < 1e-8) {
        const acceleration = p.v.clone().add(motionPrev2.points[i].v).addScaledVector(motionPrev.points[i].v, -2).length() / dt ** 2;
        if (acceleration > motion.acceleration.value) motion.acceleration = { value: acceleration, label, point: p.key };
      }
    });
    motionDt = dt;
  }
  motionPrev2 = motionPrev; motionPrev = { t, points };
}
const shell = rig.aliga.body.children[0], shellDigest = () => createHash('sha256').update(Buffer.from(shell.geometry.attributes.position.array.buffer)).digest('hex');
const rigidShell = shellDigest();
let soles, previous, grounded = 0, frames = 0, maxDrift = 0, maxReach = 0;
function matrixSnapshot() {
  rig.root.updateMatrixWorld(true);
  const out = []; rig.root.traverse(o => out.push(...o.matrixWorld.elements)); return out;
}
function evaluate(t, label, compare = true) {
  aligaPose(t, song, timeline, pose); applyAligaPose(rig, pose); rig.root.updateMatrixWorld(true);
  rig.root.traverse(o => verify(o.matrixWorld.elements.every(Number.isFinite), `${label}: finite matrices ${o.type}`));
  rig.root.traverse(o => { if (o.isMesh) groundClear(o, label); });
  soles ||= figures.map(f => f.ik.limbs.map(l => sole(l.shoe)));
  const current = [];
  figures.forEach((fig, who) => {
    const p = who ? pose.aligons[who - 1] : pose.aliga, dim = who ? LEGS.aligo : LEGS.carrier;
    const worldBoxes = [];
    fig.ik.limbs.forEach((l, side) => {
      const shoeBounds = localBoxes(l.shoe)[0];
      verify(Math.abs(shoeBounds.max.x - shoeBounds.min.x - dim.sole[0]) < EPS
        && Math.abs(shoeBounds.max.z - dim.sole[1]) < EPS && Math.abs(shoeBounds.min.z + dim.sole[2]) < EPS, `${label}: shoe geometry matches LEGS sole`);
      const foot = p.feet[side], corners = soles[who][side].map(v => v.clone().applyMatrix4(l.shoe.matrixWorld));
      corners.forEach((v, j) => {
        const original = soles[who][side][j], c = Math.cos(foot.yaw), s = Math.sin(foot.yaw);
        verify(Math.abs(v.y - foot.h) < EPS, `${label}: sole flat, actual y=${v.y}, expected ${foot.h}`);
        verify(Math.hypot(v.x - foot.x - original.x * c - original.z * s,
          v.z - foot.z + original.x * s - original.z * c) < EPS, `${label}: shoe matches absolute ankle/heading`);
        if (compare && foot.h === 0 && previous?.[who]?.[side].h === 0) {
          const drift = v.distanceTo(previous[who][side].corners[j]); maxDrift = Math.max(maxDrift, drift);
          verify(drift < CONTACT, `${label}: grounded actual sole slides ${drift} m`); grounded++;
        }
      });
      for (let a = 0; a < 4; a++) for (let b = a + 1; b < 4; b++)
        verify(Math.abs(corners[a].distanceTo(corners[b]) - soles[who][side][a].distanceTo(soles[who][side][b])) < EPS, `${label}: rigid shoe`);
      maxReach = Math.max(maxReach, l.reachError);
      verify(l.reachError < EPS, `${label}: leg unreachable by ${l.reachError} m`);
      // Actual geometry covers hip/knee/ankle joint centres, not merely overlapping AABBs.
      const hip = new THREE.Vector3().setFromMatrixPosition(l.thigh.matrixWorld), knee = new THREE.Vector3().setFromMatrixPosition(l.shin.matrixWorld);
      const ankle = new THREE.Vector3(0, dim.ankle, 0).applyMatrix4(l.shoe.matrixWorld);
      const shinEnd = new THREE.Vector3(0, -dim.shin, 0).applyMatrix4(l.shin.matrixWorld);
      verify(shinEnd.distanceTo(ankle) < EPS, `${label}: actual shin end meets actual shoe ankle`);
      verify(contains(l.thigh, hip) && contains(l.thigh, knee) && contains(l.shin, knee), `${label}: trouser knee/hip gap`);
      verify(contains(l.shin, ankle) && contains(l.shoe, ankle), `${label}: ankle/shoe gap`);
      const dist = (a, b) => a.distanceTo(b);
      verify(Math.abs(dist(hip, knee) - dim.thigh) < EPS && Math.abs(dist(knee, ankle) - dim.shin) < EPS, `${label}: IK segment length`);
      const parts = [l.thigh, l.shin, l.shoe].map((mesh, part) => localBoxes(mesh).map((b, box) => {
        const obb = worldOBB(b, mesh.matrixWorld); obb.part = ['thigh', 'shin', 'shoe'][part]; obb.box = box; return obb;
      }));
      for (const b of parts.flat()) b.halfSize.addScalar(-EPS);
      // Thigh/shoe are nonadjacent even on the same leg; only thigh/shin and
      // shin/shoe share intentional attachment penetration.
      for (const a of parts[0]) for (const b of parts[2]) if (a.intersectsOBB(b, 1e-12)) {
        collision(a, b, `${who}/${side}`, label);
      }
      worldBoxes.push(parts.flat());
      (current[who] ||= []).push({ h: foot.h, corners });
    });
    // OBB narrow phase for every actual box in one leg against every box in the other.
    // Deflate only the Float32 tolerance: intentional same-leg joint penetration is excluded.
    for (const [ai, a] of worldBoxes[0].entries()) for (const [bi, b] of worldBoxes[1].entries())
      if (a.intersectsOBB(b, 1e-12)) {
        collision(a, b, who, label);
      }
  });
  previous = current; frames++;
}
// Fail baseline on the new schema before timeline compilation or IK-only diagnostics.
const planted = standFeet(newAligaPose());
applyAligaPose(rig, planted); rig.root.updateMatrixWorld(true);
const contactMesh = rig.aliga.ik.limbs[0].shoe, contactVertices = sole(contactMesh);
const beforeTurn = contactVertices.map(v => v.clone().applyMatrix4(contactMesh.matrixWorld));
planted.aliga.x += 0.05; planted.aliga.yaw += 0.2;
applyAligaPose(rig, planted); rig.root.updateMatrixWorld(true);
contactVertices.forEach((v, i) => assert(v.clone().applyMatrix4(contactMesh.matrixWorld).distanceTo(beforeTurn[i]) < CONTACT,
  'actual sole corner stays planted under synthetic root translation/yaw'));
evaluate(0, 'start', false);
for (const hz of [30, 60, 120]) for (const origin of [0, 0.173, 0.617]) {
  previous = null; motionPrev = motionPrev2 = null;
  for (let frame = 0; (frame + origin) / hz <= song.end; frame++) {
    const t = (frame + origin) / hz; evaluate(t, `${hz} Hz origin ${origin} at ${t}`);
    motionProbe(t, `${hz} Hz origin ${origin} at ${t}`);
  }
}
// Musical boundaries, off-grid seeks, repeated same-time calls, clamped pre/post song.
for (const t of [-1, 0, ...song.barTimes, song.end, song.end + 1, 12.34567, 93.72819]) {
  previous = null; evaluate(t, `seek ${t}`, false); const expected = matrixSnapshot();
  evaluate(song.end - Math.max(0, Math.min(song.end, t)), 'intermediate seek', false);
  evaluate(t, `repeat ${t}`, false); assert.deepEqual(matrixSnapshot(), expected, `same actual rig after seek ${t}`);
}
// Switching schema must restore precisely the original legacy transforms/hierarchy.
applyAligaPose(rig, NEUTRAL); rig.root.updateMatrixWorld(true);
const snap = matrixSnapshot;
const neutral = snap(); evaluate(song.end / 2, 'schema switch', false);
applyAligaPose(rig, NEUTRAL); assert.deepEqual(snap(), neutral, 'legacy restored after IK');
const staticPose = standFeet(newAligaPose());
applyAligaPose(rig, staticPose); verify(figures.every(f => f.ik.limbs.every(l => l.reachError < EPS)), 'static standFeet in reach');
verify(grounded > 10000, 'many actual grounded sole comparisons');
console.log(`aliga rig sweep: ${frames} frames, full ${song.end}s, 30/60/120 Hz × 3 origins; ${grounded} contact corners; max drift ${maxDrift}m; reach residual ${maxReach}m`);

assert.equal(shellDigest(), rigidShell, 'rigid shell geometry unchanged by every pose');
console.log('Minimum actual geometry y (m):', JSON.stringify(floorWorst));
console.log('Opposite leg collisions:', JSON.stringify({ collisionCount, firstCollision, containedHipContacts }));
console.log('Collision depths (m), by figure/parts:', JSON.stringify([...collisionSummary.entries()]));
console.log('Actual knee/trouser motion maxima (m/s, m/s²):', JSON.stringify(motion));
// A branch flip of even 6.7 cm in one 120 Hz frame exceeds 8 m/s. The second
// difference also catches a smaller one-frame discontinuity followed by a return.
verify(motion.speed.value < 8, `motion speed ${motion.speed.value} m/s at ${motion.speed.label}`);
verify(motion.acceleration.value < 200, `motion acceleration ${motion.acceleration.value} m/s² at ${motion.acceleration.label}`);
console.log('Strict geometry/motion violations:', JSON.stringify([...errors.values()]));
assert.equal([...errors.values()].reduce((n, e) => n + e.count, 0), 0, 'actual rig geometry/motion must pass');
assert.equal(collisionCount, 0, `${collisionCount} opposite-leg intersections; first: ${firstCollision}`);
