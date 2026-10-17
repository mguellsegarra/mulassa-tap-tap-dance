// Actual posed voxel boxes: broad phase by figure, narrow phase by oriented boxes.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { OBB } from 'three/addons/math/OBB.js';
import { buildAligaRig, applyAligaPose } from '../src/scene/models/aliga.js';
import { aligaPose, newAligaPose } from '../src/game/aliga-dance.js';
const song = JSON.parse(readFileSync(new URL('../src/game/aliga-song.json', import.meta.url)));
const timeline = JSON.parse(readFileSync(new URL('../src/game/aliga-dance.json', import.meta.url)));
const rig = buildAligaRig(), pose = newAligaPose(), cache = new WeakMap();
const EPS = 2e-6; // Float32 geometry noise, not a visible collision allowance.
function boxes(mesh) {
  if (cache.has(mesh)) return cache.get(mesh);
  const attr = mesh.geometry.attributes.position, out = [];
  for (let k = 0; k < attr.count; k += 24) {
    const vertices = Array.from({ length: 24 }, (_, j) => new THREE.Vector3().fromBufferAttribute(attr, k + j));
    const u = vertices[1].clone().sub(vertices[0]).normalize();
    const v = vertices[2].clone().sub(vertices[0]).normalize(), w = u.clone().cross(v).normalize();
    assert(Math.abs(u.dot(v)) < 1e-5, 'voxel box axes are orthogonal');
    const axes = [u, v, w], center = new THREE.Vector3(), half = new THREE.Vector3();
    axes.forEach((axis, i) => {
      const dots = vertices.map(p => p.dot(axis)), lo = Math.min(...dots), hi = Math.max(...dots);
      center.addScaledVector(axis, (lo + hi) / 2); half.setComponent(i, (hi - lo) / 2);
    });
    out.push(new OBB(center, half, new THREE.Matrix3().set(u.x,v.x,w.x,u.y,v.y,w.y,u.z,v.z,w.z)));
  }
  cache.set(mesh, out); return out;
}
const world = root => {
  const out = [];
  root.traverse(mesh => {
    if (mesh.isMesh) for (const box of boxes(mesh)) {
      // OBB.applyMatrix4() in this Three version does not rotate an offset centre.
      // Every figure transform is rigid; rotate both the centre and the already baked box axes.
      const obb = box.clone();
      obb.center.applyMatrix4(mesh.matrixWorld);
      obb.rotation.premultiply(new THREE.Matrix3().setFromMatrix4(mesh.matrixWorld));
      obb.halfSize.addScalar(-EPS); out.push(obb);
    }
  });
  return out;
};
const aabb = o => new THREE.Box3().setFromObject(o, true);
let frames = 0, candidates = 0;
const times = new Set([0, song.end, ...song.barTimes]);
for (const origin of [0, 0.173, 0.617]) {
  for (let frame = 0; frame / 60 + origin < song.end; frame++) times.add(frame / 60 + origin);
}
for (const t of [...times].sort((a,b) => a-b)) {
  aligaPose(t, song, timeline, pose); applyAligaPose(rig, pose); rig.root.updateMatrixWorld(true);
  const figures = [rig.aliga, ...rig.aligons], bounds = figures.map(f => aabb(f.root)), meshes = new Map();
  bounds.forEach((b, i) => assert(b.min.y >= -EPS, `figure ${i} below ground at ${t.toFixed(6)}s: ${b.min.y}`));
  for (const [i, kid] of rig.aligons.entries()) {
    const targets = [kid.body.children[0], kid.head.children[0],
      ...kid.ik.limbs.flatMap(l => [l.thigh, l.shin, l.shoe])];
    const targetBoxes = targets.map(target => world(target));
    for (const [side, arm] of kid.arms.entries()) {
      for (const a of world(arm)) for (let part = 0; part < targetBoxes.length; part++) {
        for (const b of targetBoxes[part]) assert(!a.intersectsOBB(b, 1e-10),
          `aligó ${i} arm ${side} intersects part ${part} at ${t.toFixed(6)}s`);
      }
    }
  }
  for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) {
    if (!bounds[i].intersectsBox(bounds[j])) continue;
    if (!meshes.has(i)) meshes.set(i, world(figures[i].root));
    if (!meshes.has(j)) meshes.set(j, world(figures[j].root));
    const broad = new OBB().fromBox3(bounds[j]);
    for (const a of meshes.get(i)) {
      if (!a.intersectsOBB(broad)) continue;
      for (const b of meshes.get(j)) {
        candidates++;
        assert(!a.intersectsOBB(b, 1e-10), `figures ${i}/${j} intersect at ${t.toFixed(6)}s`);
      }
    }
  }
  frames++;
}
console.log(`aliga clearance ok: ${frames} full-song poses at 60 Hz × 3 origins plus bar boundaries; arms/head/torso/legs and ${candidates} between-figure OBB pairs`);
