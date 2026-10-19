import * as THREE from 'three';
import { SHOE } from './support-clearance.js';
import { SUPPORT_LAYOUT } from './supports.js';

// A trouser cuff and a rigid shoe per foot. Hidden anatomy is deliberately omitted:
// the cloth continues a little inside the unchanged costume, without exposed knee blocks.
export function createCarriers(scene, motion) {
  const cloth = new THREE.MeshLambertMaterial({ color: '#26262e' });
  const leather = new THREE.MeshLambertMaterial({ color: '#171714' });
  const cuffGeo = new THREE.BoxGeometry(.105, 1, .115);
  const shoeGeo = new THREE.BoxGeometry(SHOE.width, SHOE.height, SHOE.length);
  const feet = SUPPORT_LAYOUT.map(() => ({}));
  const parts = SUPPORT_LAYOUT.map(() => {
    const cuff = new THREE.Mesh(cuffGeo, cloth), shoe = new THREE.Mesh(shoeGeo, leather);
    scene.add(cuff, shoe); return { cuff, shoe };
  });
  const root = new THREE.Object3D(), shell = new THREE.Object3D();
  root.add(shell); shell.position.y = .9;
  const inverse = new THREE.Matrix4(), ankle = new THREE.Vector3(), top = new THREE.Vector3();
  const ray = new THREE.Ray(), up = new THREE.Vector3(0, 1, 0), direction = new THREE.Vector3();
  function visible(value) {
    for (const p of parts) { p.cuff.visible = value; p.shoe.visible = value; }
  }
  function pose(t, body) {
    root.position.set(body.x, body.lift, body.z); root.rotation.y = body.yaw;
    shell.rotation.set(body.pitch, 0, body.roll); root.updateMatrixWorld(true);
    inverse.copy(shell.matrixWorld).invert();
    for (let i = 0; i < 8; i++) {
      const f = motion.foot(t, i, feet[i]), p = parts[i];
      ankle.set(f.x, f.y + SHOE.height * .8, f.z);
      ray.origin.copy(ankle); ray.direction.copy(up); ray.applyMatrix4(inverse);
      // A lifted ankle may already be inside the cloth; keep a short overlap there.
      const distance = Math.max(.08, -(ray.origin.y + .35) / ray.direction.y);
      top.copy(ray.origin).addScaledVector(ray.direction, distance);
      // Follow the hem vertically wherever possible. At the costume edge, tuck the
      // top inside the cloth rather than exposing a separate thigh/hip or spreading knees.
      top.x = THREE.MathUtils.clamp(top.x, -.44, .44);
      top.z = THREE.MathUtils.clamp(top.z, -1.49, 1.49);
      top.applyMatrix4(shell.matrixWorld);
      p.cuff.position.copy(ankle).add(top).multiplyScalar(.5);
      direction.subVectors(top, ankle);
      p.cuff.scale.y = direction.length();
      p.cuff.quaternion.setFromUnitVectors(up, direction.normalize());
      p.shoe.position.set(f.x, f.y + SHOE.height / 2, f.z); p.shoe.rotation.set(0, f.yaw, 0);
    }
  }
  function dispose() { cuffGeo.dispose(); shoeGeo.dispose(); cloth.dispose(); leather.dispose(); }
  return { pose, visible, parts, dispose };
}
