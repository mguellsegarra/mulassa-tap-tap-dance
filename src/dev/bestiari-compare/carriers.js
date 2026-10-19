import * as THREE from 'three';
import { SUPPORT_LAYOUT } from './supports.js';

export const LEG_LENGTH = 0.44;
// Fixed-length thigh and shin. Flexion replaces the old telescoping trouser mesh.
export function solveKnee(hip, ankle, forward, out, work) {
  work.subVectors(ankle, hip);
  const distance = work.length(); work.multiplyScalar(1 / Math.max(distance, 0.0001));
  out.copy(forward).addScaledVector(work, -forward.dot(work)).normalize();
  out.multiplyScalar(Math.sqrt(Math.max(0, LEG_LENGTH ** 2 - (distance / 2) ** 2)));
  out.addScaledVector(work, distance / 2).add(hip);
  return distance;
}

export function createCarriers(scene, motion) {
  const cloth = new THREE.MeshLambertMaterial({ color: '#26262e' }), shoes = new THREE.MeshLambertMaterial({ color: '#171714' });
  const legGeo = new THREE.BoxGeometry(0.115, LEG_LENGTH, 0.13), kneeGeo = new THREE.BoxGeometry(.12, .13, .14);
  const shoeGeo = new THREE.BoxGeometry(.125, .075, .25), torsoGeo = new THREE.BoxGeometry(.32, .5, .23);
  const feet = SUPPORT_LAYOUT.map(() => ({}));
  const parts = SUPPORT_LAYOUT.map(() => {
    const thigh = new THREE.Mesh(legGeo, cloth), shin = new THREE.Mesh(legGeo, cloth), knee = new THREE.Mesh(kneeGeo, cloth), shoe = new THREE.Mesh(shoeGeo, shoes);
    scene.add(thigh, shin, knee, shoe); return { thigh, shin, knee, shoe };
  });
  const torsos = Array.from({ length: 4 }, () => { const mesh = new THREE.Mesh(torsoGeo, cloth); scene.add(mesh); return mesh; });
  const hip = new THREE.Vector3(), ankle = new THREE.Vector3(), knee = new THREE.Vector3(), work = new THREE.Vector3();
  const forward = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), direction = new THREE.Vector3();
  function bone(mesh, a, b) {
    mesh.position.copy(a).add(b).multiplyScalar(.5); direction.subVectors(b, a).normalize();
    mesh.quaternion.setFromUnitVectors(up, direction);
  }
  function visible(value) {
    for (const p of parts) { p.thigh.visible = value; p.shin.visible = value; p.knee.visible = value; p.shoe.visible = value; }
    for (const torso of torsos) torso.visible = value;
  }
  function pose(t, body) {
    for (let i = 0; i < 8; i++) motion.foot(t, i, feet[i]);
    const c = Math.cos(body.yaw), s = Math.sin(body.yaw); forward.set(s, 0, c);
    for (let pair = 0; pair < 4; pair++) {
      const a = feet[pair * 2], b = feet[pair * 2 + 1];
      const centerX = (a.x + b.x) / 2, centerZ = (a.z + b.z) / 2;
      // Each pelvis follows its own two contacts; the shell does not stretch human legs.
      const span = Math.hypot(a.x - b.x, a.z - b.z);
      const hipY = Math.min(.78 + Math.min(.06, body.lift * .15), Math.sqrt(Math.max(.36, .84 ** 2 - (span / 2) ** 2)));
      torsos[pair].position.set(centerX, hipY + .24, centerZ); torsos[pair].rotation.y = body.yaw;
      for (let side = 0; side < 2; side++) {
        const index = pair * 2 + side, f = feet[index], p = parts[index], dx = side ? -.085 : .085;
        hip.set(centerX + c * dx, hipY, centerZ - s * dx);
        ankle.set(f.x, f.y + .075, f.z);
        solveKnee(hip, ankle, forward, knee, work);
        bone(p.thigh, hip, knee); bone(p.shin, knee, ankle);
        p.knee.position.copy(knee); p.knee.rotation.y = body.yaw;
        p.shoe.position.set(f.x, f.y + .0375, f.z); p.shoe.rotation.y = f.yaw;
      }
    }
  }
  return { pose, visible, parts, torsos };
}
