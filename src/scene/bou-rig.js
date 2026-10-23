import * as THREE from 'three';
const HIP=.93, THIGH=.43, SHIN=.425;
export function buildBouRig() {
  const root=new THREE.Group(), body=new THREE.Group(), tail=new THREE.Group();
  root.add(body); body.add(tail); body.position.y=.85;
  // Two carriers: espadrilles with jute soles on the floor plan's feet, dark trousers up to the hips under the skirt.
  const feet = [], legs = [], sole = new THREE.BoxGeometry(.105, .025, .27), shoe = new THREE.BoxGeometry(.095, .06, .24);
  const unit = new THREE.BoxGeometry(1, 1, 1).translate(0, .5, 0);
  const trousers = new THREE.MeshLambertMaterial({ color: '#16171a' }), jute = new THREE.MeshLambertMaterial({ color: '#cdb48a' });
  for (let i = 0; i < 4; i++) {
    const foot = new THREE.Group(), base = new THREE.Mesh(sole, jute), upper = new THREE.Mesh(shoe, trousers);
    base.position.set(0, .0125, .035); upper.position.set(0, .055, .03); foot.add(base, upper); feet.push(foot);
    for (const w of [.16, .14]) { const m = new THREE.Mesh(unit, trousers); m.scale.set(w, 1, w); legs.push(m); }
  }
  const hip = new THREE.Vector3(), ankle = new THREE.Vector3(), knee = new THREE.Vector3(), d = new THREE.Vector3();
  const fwd = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  const place = (m, a, b) => { d.subVectors(b, a); m.position.copy(a); m.scale.y = d.length(); m.quaternion.setFromUnitVectors(up, d.normalize()); };
  // Legs from each carrier's hips (over the middle of their two feet) to the ankle, the knee bending forward: whatever
  // the shell does, the legs stay joined to the feet and run up under the skirt.
  function poseLegs() {
    for (let i = 0; i < 4; i++) {
      const f = feet[i], mate = feet[i ^ 1], yaw = (f.rotation.y + mate.rotation.y) / 2, side = i % 2 ? 1 : -1;
      hip.set((f.position.x + mate.position.x) / 2 + side * .11 * Math.cos(yaw), HIP, (f.position.z + mate.position.z) / 2 - side * .11 * Math.sin(yaw));
      ankle.set(f.position.x, f.position.y + .08, f.position.z);
      fwd.set(Math.sin(yaw), 0, Math.cos(yaw));
      const dist = hip.distanceTo(ankle);
      d.subVectors(ankle, hip).divideScalar(dist);
      fwd.addScaledVector(d, -fwd.dot(d)).normalize();
      const reach = Math.min(dist, THIGH + SHIN - 1e-3), cos = (THIGH ** 2 + reach ** 2 - SHIN ** 2) / (2 * THIGH * reach);
      knee.copy(hip).addScaledVector(d, THIGH * cos).addScaledVector(fwd, THIGH * Math.sqrt(Math.max(0, 1 - cos * cos)));
      place(legs[i * 2], hip, knee); place(legs[i * 2 + 1], knee, ankle);
    }
  }

  return {root,body,tail,feet,legs,poseLegs};
}
