import * as THREE from 'three';
// SHOW_RISE: an end lifted less leaves no gap under its hem (the front's small lift on the leg swing switched them on and
// off every beat: a flicker)
const HIP=.93, THIGH=.43, SHIN=.425, HIP_FLAT=.6, SHOW_RISE=.12, CARRIER_TRUNK=.5, CARRIER_ARM=.62;
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
  // Lifted over the colla's heads (the festa, game/bou-dance.js BOU_CARRY) the hem rises past their hips: each carrier's
  // trunk and arms, pushing the frame straight up, fill the gap (hidden on the floor, where the skirt covers them)
  const shirt = new THREE.MeshLambertMaterial({ color: '#2a1d22' }), trunks = [], arms = [];
  for (let c = 0; c < 2; c++) {
    const t = new THREE.Mesh(unit, shirt); t.scale.set(.34, CARRIER_TRUNK, .2); t.visible = false; trunks.push(t);
    for (let k = 0; k < 2; k++) { const a = new THREE.Mesh(unit, shirt); a.scale.set(.09, CARRIER_ARM, .09); a.visible = false; arms.push(a); }
  }
  const hip = new THREE.Vector3(), ankle = new THREE.Vector3(), knee = new THREE.Vector3(), d = new THREE.Vector3();
  const fwd = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  const place = (m, a, b) => { d.subVectors(b, a); m.position.copy(a); m.scale.y = d.length(); m.quaternion.setFromUnitVectors(up, d.normalize()); };
  // Legs from each carrier's hips to the ankle, the knee bending forward: whatever the shell does, the legs stay joined
  // to the feet and run up under the skirt. The hips are the carrier's own place in the shell (fore or aft, .11 m to a
  // side), not over their feet: a leg stretched out or left behind by a turn tilts from there instead of carrying the
  // thigh out through the skirt (it showed through the cloth by up to 21 cm, Marc 24/10/2026: «cames que travessen»).
  function poseLegs() {
    for (let i = 0; i < 4; i++) {
      const f = feet[i], mate = feet[i ^ 1], yaw = (f.rotation.y + mate.rotation.y) / 2, side = i % 2 ? 1 : -1;
      // the hips ride with the shell (its dip, see-saw and waddle bend the knees), never past the legs' reach
      const y = HIP + root.position.y - (i < 2 ? -.66 : .66) * Math.sin(body.rotation.x) + side * .11 * Math.sin(body.rotation.z);
      const ry = root.rotation.y, along = i < 2 ? -.66 : .66;
      hip.set(root.position.x + side * .11 * Math.cos(ry) + along * Math.sin(ry), Math.min(HIP, y), root.position.z - side * .11 * Math.sin(ry) + along * Math.cos(ry));
      ankle.set(f.position.x, f.position.y + .08, f.position.z);
      // a straight leg at most: a planted foot left behind lowers its hip a touch instead of stretching the shin
      // a foot left far behind (the fastest rushes) pulls its hip after it, as far as the leg needs to reach it
      let flat = Math.hypot(hip.x - ankle.x, hip.z - ankle.z);
      if (flat > HIP_FLAT) { const k = (flat - HIP_FLAT) / flat; hip.x += (ankle.x - hip.x) * k; hip.z += (ankle.z - hip.z) * k; flat = HIP_FLAT; }
      const reachMax = THIGH + SHIN - 1e-3;
      const straight = ankle.y + Math.sqrt(Math.max(0, reachMax * reachMax - flat * flat));
      hip.y = Math.min(hip.y, straight);
      // a leg stretched forward (toe up, the dance's gesture) is straight, its hip up inside the shell: with the dip's bent
      // knee it went out through the front of the skirt
      hip.y += (straight - hip.y) * Math.min(1, Math.max(0, -f.rotation.x / .3));
      fwd.set(Math.sin(yaw), 0, Math.cos(yaw));
      const dist = hip.distanceTo(ankle);
      d.subVectors(ankle, hip).divideScalar(dist);
      fwd.addScaledVector(d, -fwd.dot(d)).normalize();
      const reach = Math.min(dist, THIGH + SHIN - 1e-3), cos = (THIGH ** 2 + reach ** 2 - SHIN ** 2) / (2 * THIGH * reach);
      knee.copy(hip).addScaledVector(d, THIGH * cos).addScaledVector(fwd, THIGH * Math.sqrt(Math.max(0, 1 - cos * cos)));
      place(legs[i * 2], hip, knee); place(legs[i * 2 + 1], knee, ankle);
      if (i % 2) { // the carrier's trunk on the middle of his two hips, facing his feet; arms up from the shoulders
        // how far this carrier's end of the shell has risen (the lift, the see-saw): its trunk shows under a raised hem
        const c = i >> 1, t = trunks[c], rise = root.position.y - (c ? .66 : -.66) * Math.sin(body.rotation.x), on = rise > SHOW_RISE;
        t.visible = arms[c * 2].visible = arms[c * 2 + 1].visible = on;
        if (!on) continue;
        t.position.set(hip.x - side * .11 * Math.cos(yaw), hip.y, hip.z + side * .11 * Math.sin(yaw)); t.rotation.set(0, yaw, 0);
        for (let k = 0; k < 2; k++) {
          const a = arms[c * 2 + k], s = k ? 1 : -1;
          a.position.set(t.position.x + s * .2 * Math.cos(yaw), hip.y + CARRIER_TRUNK - .08, t.position.z - s * .2 * Math.sin(yaw)); a.rotation.set(0, yaw, 0);
          a.scale.y = Math.min(CARRIER_ARM, .3 + rise); // reaching up only as their end rises: never out through its back
        }
      }
    }
  }

  return {root,body,tail,feet,legs,trunks,arms,poseLegs};
}
