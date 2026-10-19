// The Mulassa's four carriers as what shows under the cloth: eight rigid shoes on the floor and eight simple trouser
// cuffs from each shoe up into the unchanged costume (Marc's accepted simple-carriers-v3: no exposed knees or hips, the
// original beast untouched). One instanced mesh each (two draw calls). pose() reads the shell's actual world matrix
// (rig.body), so the game, the free viewer, the share photo and the comparator draw the same carriers. The group goes in
// the rig's root (it shows and hides with her); feet: eight {x, y, z, yaw} in the world (m), the sole's centre and height
// (game/mula-supports.js plans them).
import * as THREE from 'three';
import { SHOE } from '../game/mula-supports.js';

export const CUFF = { w: 0.105, d: 0.115 };
const UP = new THREE.Vector3(0, 1, 0);
export function createCarriers({ cloth = '#26262e', leather = '#171714' } = {}) {
  const cuffGeo = new THREE.BoxGeometry(CUFF.w, 1, CUFF.d), shoeGeo = new THREE.BoxGeometry(SHOE.width, SHOE.height, SHOE.length);
  const cuffs = new THREE.InstancedMesh(cuffGeo, new THREE.MeshLambertMaterial({ color: cloth }), 8);
  const shoes = new THREE.InstancedMesh(shoeGeo, new THREE.MeshLambertMaterial({ color: leather }), 8);
  const group = new THREE.Group();
  group.name = 'mula-carriers';
  for (const m of [cuffs, shoes]) { m.frustumCulled = false; m.castShadow = true; m.receiveShadow = false; group.add(m); } // (instances leave the origin's bounds)
  const inverse = new THREE.Matrix4(), ankle = new THREE.Vector3(), top = new THREE.Vector3(), dir = new THREE.Vector3();
  const ray = new THREE.Ray(), q = new THREE.Quaternion(), s = new THREE.Vector3(1, 1, 1), m = new THREE.Matrix4();
  const shoeQ = new THREE.Quaternion(), yAxis = new THREE.Vector3(0, 1, 0), local = new THREE.Matrix4();
  // rig: the posed beast (its matrices are brought up to date here); feet: world shoes
  function pose(rig, feet) {
    rig.root.updateMatrixWorld(true);
    const shell = rig.body.matrixWorld;
    inverse.copy(shell).invert(); local.copy(rig.root.matrixWorld).invert(); // the instances live in the root's frame
    for (let i = 0; i < 8; i++) {
      const f = feet[i];
      ankle.set(f.x, f.y + SHOE.height * .8, f.z);
      ray.origin.copy(ankle); ray.direction.copy(UP); ray.applyMatrix4(inverse);
      // A lifted ankle may already be inside the cloth; keep a short overlap there.
      const distance = Math.max(.08, -(ray.origin.y + .35) / ray.direction.y);
      top.copy(ray.origin).addScaledVector(ray.direction, distance);
      // Follow the hem vertically wherever possible. At the costume edge, tuck the
      // top inside the cloth rather than exposing a separate thigh/hip or spreading knees.
      top.x = THREE.MathUtils.clamp(top.x, -.44, .44);
      top.z = THREE.MathUtils.clamp(top.z, -1.49, 1.49);
      top.applyMatrix4(shell);
      dir.subVectors(top, ankle);
      s.set(1, dir.length(), 1);
      q.setFromUnitVectors(UP, dir.normalize());
      cuffs.setMatrixAt(i, m.compose(top.add(ankle).multiplyScalar(.5), q, s).premultiply(local));
      ankle.set(f.x, f.y + SHOE.height / 2, f.z); s.set(1, 1, 1);
      shoes.setMatrixAt(i, m.compose(ankle, shoeQ.setFromAxisAngle(yAxis, f.yaw), s).premultiply(local));
    }
    cuffs.instanceMatrix.needsUpdate = shoes.instanceMatrix.needsUpdate = true;
  }
  function dispose() { cuffGeo.dispose(); shoeGeo.dispose(); cuffs.material.dispose(); shoes.material.dispose(); }
  return { group, cuffs, shoes, pose, dispose };
}
