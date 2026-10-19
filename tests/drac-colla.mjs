// The Drac's colla (scene/drac-colla.js, models/colla.js), measured on the real skinned meshes (skinned on the CPU):
// the four helpers on their cardinal spots facing the centre and never moving; the clap's palms meet on every beat and
// part half way, no arm crosses the midline or enters the chest; poses are a pure function of the beat; the seated
// members sit on the paving (hips and feet on the floor), clear of the whole dance (wings and tail), the crowd's
// standing spots, the band and the play camera's shot; their count follows the quality; labels are a hidden debug
// layer; dispose frees what the colla made.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { HELPERS, HELPER_CENTRE, HELPER_RADIUS, danceToWorld, danceYaw } from '../src/game/drac-layout.js';
import { SPOTS, rootAt, END } from '../src/game/drac-path.js';
import { buildDrac, DRAC_SCALE } from '../src/scene/models/drac.js';
import { PROFILES, MINIMAL } from '../src/platform/render-quality.js';
import { ARM } from '../src/scene/models/colla.js';
import { createColla, SEATS, SEATED_COUNT } from '../src/scene/drac-colla.js';

const src = f => readFileSync(new URL(`../src/${f}`, import.meta.url), 'utf8');
const num = (text, re) => { const m = text.match(re); assert.ok(m, `not found: ${re}`); return Number(m[1]); };
// the scene's constants this module is placed against (stage.js and crowd-build.js need a DOM: read, don't import)
const stage = src('scene/stage.js'), crowd = src('scene/crowd-build.js');
const CAM_AZ = num(stage, /CAM_AZ = (-?[\d.]+) \* Math\.PI \/ 180/) * Math.PI / 180;
const FRONT = danceYaw(CAM_AZ); // stage.js DRAC_YAW: the dance frame's heading (the name stays: it is the dance's front)
const RAD_ADULT = num(crowd, /adult: ([\d.]+)/), ARENA = num(crowd, /arena: ([\d.]+)/);

const colla = createColla({ profile: PROFILES[2] });
const { helpers, seated, labels, crew, members } = colla;
const scene = new THREE.Scene();
scene.add(helpers, seated);
const v = new THREE.Vector3(), inv = new THREE.Matrix4();
// every vertex of a skinned mesh where the GPU would draw it now: [bone index, world position] per vertex
function skinned(mesh) {
  scene.updateMatrixWorld(true);
  mesh.skeleton.update();
  const pos = mesh.geometry.attributes.position, idx = mesh.geometry.attributes.skinIndex, out = [];
  for (let i = 0; i < pos.count; i++) out.push([idx.getX(i), mesh.applyBoneTransform(i, v.fromBufferAttribute(pos, i)).clone()]);
  return out;
}
const helperMesh = helpers.children.find(o => o.isSkinnedMesh), seatedMesh = seated.children.find(o => o.isSkinnedMesh);
const bones = helperMesh.skeleton.bones;
// each helper's bones in skinCrowd's order: body, head, right shoulder, right elbow, left shoulder, left elbow
const boneOf = (p, k) => bones.indexOf(p.bones[k]);

// ---- cardinals: S along the opening advance (S0 -> A), N opposite, W / E across; each faces the centre
const south = new THREE.Vector2(SPOTS.A[0] - SPOTS.S0[0], SPOTS.A[1] - SPOTS.S0[1]).normalize();
const dir = id => { const p = crew[HELPERS.findIndex(h => h.id === id)].g.position; return new THREE.Vector2(p.x - HELPER_CENTRE[0], p.z - HELPER_CENTRE[1]).normalize(); };
assert.ok(dir('S').dot(south) > 0.9999, 'S follows the opening advance');
assert.ok(dir('N').dot(south) < -0.9999, 'N is opposite S');
assert.ok(Math.abs(dir('W').dot(south)) < 1e-9 && Math.abs(dir('E').dot(south)) < 1e-9 && dir('W').dot(dir('E')) < -0.9999, 'W and E across');
for (const p of crew) {
  const f = new THREE.Vector3(0, 0, 1).applyEuler(p.g.rotation), c = new THREE.Vector2(HELPER_CENTRE[0] - p.g.position.x, HELPER_CENTRE[1] - p.g.position.z).normalize();
  assert.ok(f.x * c.x + f.z * c.y > 0.9999, `${p.g.name} faces the centre`);
}

// ---- helpers stay put: their anchors never move, whatever the beat
const anchors = () => crew.map(p => [...p.g.position.toArray(), p.g.rotation.y].join());
const before = anchors();
for (let b = -3; b < 400; b += 0.37) colla.update(b, (b % 2 + 2) % 1);
assert.deepEqual(anchors(), before, 'the helpers never drift or turn');

// ---- the clap, on the drawn mesh: palms touch on integer beats, apart half way; arms on their own side, out of the chest
const local = (p, w) => w.clone().applyMatrix4(inv.copy(p.g.matrixWorld).invert());
function arms(beat, energy) {
  colla.update(beat, energy);
  const vs = skinned(helperMesh);
  return crew.map(p => [2, 4].map(k => vs.filter(([b]) => b === boneOf(p, k) || b === boneOf(p, k + 1)).map(([b, w]) => [b, local(p, w)])));
}
const gap = side => Math.min(...side.map(([, q]) => Math.abs(q.x))); // the arm's nearest point to the midline
for (const beat of [0, 1, 7, 64]) arms(beat, 1).forEach((sides, i) => sides.forEach((side, s) => {
  const inner = Math.min(...side.map(([, q]) => (s ? -1 : 1) * q.x));
  assert.ok(Math.abs(inner) < 1e-4, `helper ${HELPERS[i].id}: palm ${s ? 'L' : 'R'} at the midline on beat ${beat} (${inner})`);
}));
for (const beat of [0.5, 3.5]) arms(beat, 1).forEach((sides, i) => assert.ok(gap(sides[0]) + gap(sides[1]) > 0.3, `helper ${HELPERS[i].id}: hands apart half way`));
const torso = { x: 0.23, y0: 0.72, y1: 1.38, z: 0.14 }; // the jacket
for (const energy of [0, 0.3, 0.7, 1]) for (let beat = 0; beat < 2; beat += 0.05) arms(beat, energy).forEach((sides, i) => sides.forEach((side, s) => {
  const sign = s ? -1 : 1;
  for (const [, q] of side) {
    assert.ok(sign * q.x > -1e-4, `helper ${HELPERS[i].id}: an arm crosses the midline (beat ${beat.toFixed(2)}, energy ${energy})`);
    const nearShoulder = Math.hypot(q.x - sign * ARM.x, q.y - ARM.y, q.z) < 0.12; // the joint itself sits in the jacket's corner
    const inside = Math.abs(q.x) < torso.x - 0.005 && q.y > torso.y0 + 0.005 && q.y < torso.y1 - 0.005 && Math.abs(q.z) < torso.z - 0.005;
    assert.ok(nearShoulder || !inside, `helper ${HELPERS[i].id}: an arm inside the chest (beat ${beat.toFixed(2)}, energy ${energy}, ${q.toArray().map(x => x.toFixed(3))})`);
  }
}));

// ---- determinism: the same beat gives the same pose, in any order, in any colla
const pose = c => [...c.crew, ...c.members].flatMap(p => p.bones.map(b => b.rotation.toArray().slice(0, 3).map(x => x.toFixed(12)).join())).join('|');
colla.update(12.3, 0.8); const a1 = pose(colla);
colla.update(99.9, 0.1); colla.update(3, 1); colla.update(12.3, 0.8);
assert.equal(pose(colla), a1, 'same beat, same pose');
const other = createColla({ profile: PROFILES[2] });
other.update(12.3, 0.8);
assert.equal(pose(other), a1, 'another colla, same pose');
other.dispose();

// ---- seated: hips and feet on the paving, nothing under it, through their gestures
const near = (q, x, z, r) => Math.hypot(q.x - x, q.z - z) < r;
for (const beat of [0, 0.25, 0.5, 0.75, 1.5]) {
  colla.update(beat, 1);
  const vs = skinned(seatedMesh), sBones = seatedMesh.skeleton.bones;
  members.forEach((p, i) => {
    const mine = vs.filter(([b]) => p.bones.includes(sBones[b])).map(([, w]) => local(p, w));
    const low = mine.reduce((m, q) => Math.min(m, q.y), Infinity);
    assert.ok(low > -0.005, `seated ${i}: below the floor (${low})`);
    const hips = mine.filter(q => Math.abs(q.x) < 0.25 && q.z > -0.25 && q.z < 0.15).reduce((m, q) => Math.min(m, q.y), Infinity); // under the seat
    assert.ok(hips < 0.01, `seated ${i}: hips on the paving (${hips})`);
    const { legs } = p.posture;
    for (const [, , A] of legs) {
      const foot = mine.filter(q => near(q, A[0], A[2], 0.2)).reduce((m, q) => Math.min(m, q.y), Infinity);
      assert.ok(foot < 0.03, `seated ${i}: a foot off the floor (${foot}, beat ${beat})`);
    }
  });
}

// ---- seated: clear of the dance (the Drac's footprint over the whole path), the crowd, the band, the camera's shot
// footprints as convex hulls on the floor: the Drac's at rest and with its wings opened as far as the motion takes them
function hull(P) {
  P = P.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]), lo = [], up = [];
  for (const p of P) { while (lo.length > 1 && cr(lo.at(-2), lo.at(-1), p) <= 0) lo.pop(); lo.push(p); }
  for (const p of P.reverse()) { while (up.length > 1 && cr(up.at(-2), up.at(-1), p) <= 0) up.pop(); up.push(p); }
  return lo.slice(0, -1).concat(up.slice(0, -1));
}
const segDist = (p, a, b) => { const dx = b[0] - a[0], dz = b[1] - a[1], t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / (dx * dx + dz * dz))); return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dz); };
const inside = (p, Q) => { let c = false; for (let i = 0, j = Q.length - 1; i < Q.length; j = i++) { const [xi, zi] = Q[i], [xj, zj] = Q[j]; if ((zi > p[1]) !== (zj > p[1]) && p[0] < (xj - xi) * (p[1] - zi) / (zj - zi) + xi) c = !c; } return c; };
const polyDist = (A, B) => { if (A.some(p => inside(p, B)) || B.some(p => inside(p, A))) return 0; let m = Infinity; for (const [P, Q] of [[A, B], [B, A]]) for (const p of P) for (let i = 0; i < Q.length; i++) m = Math.min(m, segDist(p, Q[i], Q[(i + 1) % Q.length])); return m; };
const drac = buildDrac(), foot = [];
const collect = () => { drac.root.updateMatrixWorld(true); drac.root.traverse(o => { if (!o.isMesh) return; const p = o.geometry.attributes.position; for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld); foot.push([v.x * DRAC_SCALE, v.z * DRAC_SCALE]); } }); };
collect();
for (const flap of [0, 1]) for (const whip of [-1, 1]) {
  drac.wings.forEach((w, i) => { const s = i ? -1 : 1; w.root.rotation.z = s * (0.4 + flap * 0.4); w.root.rotation.y = s * (0.35 + flap * 0.4); });
  drac.tail.forEach(t => { t.rotation.y = 0.3 * whip; });
  collect();
}
const dracHull = hull(foot);
colla.update(0.5, 1);
const vsAll = skinned(seatedMesh), sB = seatedMesh.skeleton.bones;
const pts = members.map(p => vsAll.filter(([b]) => p.bones.includes(sB[b])).map(([, w]) => w));
const seatHulls = pts.map(list => hull(list.map(q => [q.x, q.z])));
const root = {}, camX = Math.sin(CAM_AZ), camZ = Math.cos(CAM_AZ), ring = dracHull.map(() => [0, 0]), o = {};
let dance = Infinity, shot = Infinity;
for (let t = 0; t <= END; t += 0.02) {
  rootAt(root, t);
  const c = Math.cos(root.yaw), s = Math.sin(root.yaw), P = danceToWorld({}, root.x * DRAC_SCALE, root.z * DRAC_SCALE, FRONT);
  dracHull.forEach(([x, z], i) => { danceToWorld(o, root.x * DRAC_SCALE + x * c + z * s, root.z * DRAC_SCALE - x * s + z * c, FRONT); ring[i][0] = o.x; ring[i][1] = o.z; });
  for (const H of seatHulls) {
    dance = Math.min(dance, polyDist(H, ring));
    for (const [x, z] of H) { // the crowd's own shot wedge (crowd.js), from her towards the play camera
      const ox = x - P.x, oz = z - P.z, along = ox * camX + oz * camZ, side = Math.abs(ox * camZ - oz * camX);
      if (along > 0) shot = Math.min(shot, side - (1.6 + 0.45 * along));
    }
  }
}
// ...and of the helpers, on today's radius and on the wider one the Drac's wings ask for (5.1 m, see the report)
for (const R of [HELPER_RADIUS, 5.1]) for (const h of HELPERS) {
  const k = R / HELPER_RADIUS, at = danceToWorld({}, HELPER_CENTRE[0] + (h.x - HELPER_CENTRE[0]) * k, HELPER_CENTRE[1] + (h.z - HELPER_CENTRE[1]) * k, FRONT);
  const square = [[-0.6, -0.6], [0.6, -0.6], [0.6, 0.6], [-0.6, 0.6]].map(([x, z]) => [at.x + x, at.z + z]); // the helper and its clap, any heading
  seatHulls.forEach((H, i) => assert.ok(polyDist(H, square) > 0.5, `seated ${i} clear of helper ${h.id} at R ${R} (${polyDist(H, square).toFixed(2)} m)`));
}
assert.ok(dance > 1.5, `seated members 1.5 m clear of the whole dance (${dance.toFixed(2)})`);
assert.ok(shot > 0.5, `seated members out of the play camera's shot (${shot.toFixed(2)})`);
// ...and no helper stands in it either: the camera looks in between two of them (drac-layout.js danceYaw); with the frame
// at the Mulassa's FRONT the S helper filled the phone's shot in front of the Drac
for (const h of HELPERS) {
  const w = danceToWorld({}, h.x, h.z, FRONT), along = w.x * Math.sin(CAM_AZ) + w.z * Math.cos(CAM_AZ), side = Math.abs(w.x * Math.cos(CAM_AZ) - w.z * Math.sin(CAM_AZ));
  assert.ok(along <= 0 || side - (1.6 + 0.45 * along) > 0.3, `helper ${h.id} out of the play camera's shot (${(side - 1.6 - 0.45 * along).toFixed(2)} m)`);
}
for (const [i, list] of pts.entries()) for (const q of list) {
  const r = Math.hypot(q.x, q.z);
  // while the Drac is out the crowd stands beyond RING.arena (crowd.js's soft wall): every seated member inside it, with room
  assert.ok(r < ARENA - RAD_ADULT - 0.1, `seated ${i} inside the crowd's arena (${r.toFixed(2)} m, arena ${ARENA})`);
  assert.ok(r < 9.7 - 0.55 - 0.3, `seated ${i} in front of the band`);
}

// ---- count per quality; the hidden ones aren't drawn
for (const p of [MINIMAL, ...PROFILES]) {
  colla.setProfile(p);
  assert.equal(colla.count, SEATED_COUNT[p.name], p.name);
  const n = colla.count, ends = seatedMesh.geometry.drawRange.count;
  assert.equal(seated.visible, n > 0, `${p.name}: seated layer shown only when someone sits`);
  if (n) assert.ok(ends > 0 && (n === SEATS.length ? ends >= seatedMesh.geometry.index.count : ends < seatedMesh.geometry.index.count), `${p.name}: draw range`);
}
assert.deepEqual([MINIMAL, ...PROFILES].map(p => SEATED_COUNT[p.name]), [0, 3, 5, 7]);

// ---- labels: a debug layer, hidden until asked, built once
assert.equal(labels.visible, false, 'no letters in normal play');
assert.equal(labels.parent, helpers, 'letters ride with the helpers');
const ctx = new Proxy({}, { get: () => () => {} });
globalThis.document = { createElement: () => ({ getContext: () => ctx, width: 0, height: 0 }) };
colla.setLabels(true);
assert.equal(labels.visible, true);
assert.deepEqual(labels.children.map(s => [s.position.x, s.position.z]), HELPERS.map(h => [h.x, h.z]), 'one letter over each helper');
colla.setLabels(false); colla.setLabels(true);
assert.equal(labels.children.length, 4, 'built once');

// ---- dispose frees the colla's geometries, bone textures and label textures
let freed = 0;
for (const m of [helperMesh, seatedMesh]) m.geometry.addEventListener('dispose', () => freed++);
for (const s of labels.children) { s.material.map.addEventListener('dispose', () => freed++); s.material.addEventListener('dispose', () => freed++); }
colla.dispose();
assert.equal(freed, 2 + 8, 'dispose frees geometries and label textures');
console.log(`drac-colla ok (dance clearance ${dance.toFixed(2)} m, shot ${shot.toFixed(2)} m)`);
