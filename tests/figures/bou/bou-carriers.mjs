// The batched carriers keep the same coloured boxes and world-space poses as their animation handles.
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { buildBou } from '../../../src/figures/bou/bou.js';
import { createBouMotion } from '../../../src/figures/bou/bou-motion.js';
import song from '../../../src/song-bou.json' with { type: 'json' };

const rig = buildBou(), motion = createBouMotion(rig), frame = new THREE.Group();
frame.rotation.y = .7;
frame.add(rig.root, ...rig.feet, ...rig.legs, ...rig.trunks, ...rig.arms, rig.limbs);
const handles = [...rig.legs, ...rig.trunks, ...rig.arms, ...rig.feet.flatMap(f => f.children)];
assert.equal(rig.limbs.count, handles.length);
const instance = new THREE.Matrix4(), world = new THREE.Matrix4(), colour = new THREE.Color();
const cameraLayers = new THREE.Layers();
function corners(geometry, matrix) {
  geometry.computeBoundingBox();
  const { min, max } = geometry.boundingBox, points = [];
  for (const x of [min.x, max.x]) for (const y of [min.y, max.y]) for (const z of [min.z, max.z]) {
    const p = new THREE.Vector3(x, y, z).applyMatrix4(matrix);
    points.push([p.x, p.y, p.z].map(n => n.toFixed(5)).join(','));
  }
  return points.sort();
}
let raised = false;
for (let t = 0; t < song.end; t += .5) {
  motion(t, 0); frame.updateMatrixWorld(true);
  raised ||= rig.trunks.some(m => m.visible);
  for (let i = 0; i < handles.length; i++) {
    const handle = handles[i];
    assert(!handle.layers.test(cameraLayers), 'the original handles must not draw a second carrier');
    rig.limbs.getMatrixAt(i, instance);
    if (!handle.visible) {
      assert.equal(instance.determinant(), 0, 'a hidden trunk or arm has no drawn volume');
      continue;
    }
    world.multiplyMatrices(rig.limbs.matrixWorld, instance);
    const expected = corners(handle.geometry, handle.matrixWorld), actual = corners(rig.limbs.geometry, world);
    // Instance matrices are Float32; compare sorted corner positions with that storage precision.
    for (let j = 0; j < expected.length; j++) {
      const a = actual[j].split(',').map(Number), b = expected[j].split(',').map(Number);
      assert(a.every((n, k) => Math.abs(n - b[k]) < .00003), `carrier ${i} at ${t}s keeps its box in place`);
    }
    rig.limbs.getColorAt(i, colour);
    assert(['r', 'g', 'b'].every(k => Math.abs(colour[k] - handle.material.color[k]) < 1e-6), 'carrier colour is preserved');
  }
}
assert(raised, 'the sample includes visible trunks and arms during the lift');
console.log('Bou carriers: full-song coloured boxes, hidden limbs and single drawing layer preserved');
