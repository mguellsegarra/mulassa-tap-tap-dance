import * as THREE from 'three';
import { SHOE } from './support-clearance.js';
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
  const shoeGeo = new THREE.BoxGeometry(SHOE.width, SHOE.height, SHOE.length), torsoGeo = new THREE.BoxGeometry(.32, .5, .23);
  const feet = SUPPORT_LAYOUT.map(() => ({}));
  const parts = SUPPORT_LAYOUT.map(() => {
    const thigh = new THREE.Mesh(legGeo, cloth), shin = new THREE.Mesh(legGeo, cloth), knee = new THREE.Mesh(kneeGeo, cloth), shoe = new THREE.Mesh(shoeGeo, shoes);
    scene.add(thigh, shin, knee, shoe); return { thigh, shin, knee, shoe };
  });
  const torsos = Array.from({ length: 4 }, () => { const mesh = new THREE.Mesh(torsoGeo, cloth); scene.add(mesh); return mesh; });
  const hip = new THREE.Vector3(), ankle = new THREE.Vector3(), knee = new THREE.Vector3(), work = new THREE.Vector3();
  const bend = new THREE.Vector3();
  const shoulder = new THREE.Vector3(), pelvis = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0), direction = new THREE.Vector3();
  function bone(mesh, a, b) {
    mesh.position.copy(a).add(b).multiplyScalar(.5); direction.subVectors(b, a).normalize();
    mesh.quaternion.setFromUnitVectors(up, direction);
  }
  function visible(value) {
    for (const p of parts) { p.thigh.visible = value; p.shin.visible = value; p.knee.visible = value; p.shoe.visible = value; }
    for (const torso of torsos) torso.visible = value;
  }
  let carrierBody, yawC = 1, yawS = 0;
  function shellPoint(x, y, z, out) {
    const xx = x * Math.cos(carrierBody.roll) - y * Math.sin(carrierBody.roll);
    const yy = x * Math.sin(carrierBody.roll) + y * Math.cos(carrierBody.roll);
    const zz = yy * Math.sin(carrierBody.pitch) + z * Math.cos(carrierBody.pitch);
    out.set(carrierBody.x + xx * yawC + zz * yawS, carrierBody.lift + .9 + yy * Math.cos(carrierBody.pitch) - z * Math.sin(carrierBody.pitch), carrierBody.z - xx * yawS + zz * yawC);
  }
  function pose(t, body) {
    for (let i = 0; i < 8; i++) motion.foot(t, i, feet[i]);
    const c = Math.cos(body.yaw), s = Math.sin(body.yaw);
    carrierBody = body; yawC = c; yawS = s;
    for (let pair = 0; pair < 4; pair++) {
      const a = feet[pair * 2], b = feet[pair * 2 + 1];
      const x = pair % 2 ? -.21 : .21, z = pair < 2 ? 1.05 : -1.05;
      shellPoint(x, .04, z, pelvis); shellPoint(x, .42, z, shoulder);
      const centerX = pelvis.x, centerZ = pelvis.z;
      // The pelvis belongs to the carrier under the shell, not the midpoint of lagging shoes.
      let hipY = Math.min(.94, pelvis.y);
      for (let side = 0; side < 2; side++) {
        const f = feet[pair * 2 + side], dx = side ? -.085 : .085;
        const horizontal = Math.hypot(centerX + c * dx - f.x, centerZ - s * dx - f.z);
        hipY = Math.min(hipY, f.y + .075 + Math.sqrt(Math.max(0, .87 ** 2 - horizontal ** 2)));
      }
      pelvis.y = hipY;
      bone(torsos[pair], pelvis, shoulder); torsos[pair].scale.y = pelvis.distanceTo(shoulder) / .5;
      for (let side = 0; side < 2; side++) {
        const index = pair * 2 + side, f = feet[index], p = parts[index], dx = side ? -.085 : .085;
        hip.set(centerX + c * dx, hipY, centerZ - s * dx);
        ankle.set(f.x, f.y + .075, f.z);
        bend.set(s, 0, c);
        solveKnee(hip, ankle, bend, knee, work);
        bone(p.thigh, hip, knee); bone(p.shin, knee, ankle);
        p.knee.position.copy(knee); p.knee.rotation.y = body.yaw;
        p.shoe.position.set(f.x, f.y + .0375, f.z); p.shoe.rotation.y = f.yaw;
      }
    }
  }
  return { pose, visible, parts, torsos };
}
