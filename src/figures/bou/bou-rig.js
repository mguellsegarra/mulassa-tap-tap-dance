import * as THREE from 'three';
// SHOW_RISE: an end lifted less leaves no gap under its hem (the front's small lift on the leg swing switched them on and
// off every beat: a flicker)
const HIP=.93, THIGH=.43, SHIN=.425, KNEE_SOFT=.94, HIP_EASE=.04, HIP_FLAT=.6, HIP_FAR=.76, SHOW_RISE=.12, CARRIER_TRUNK=.5, CARRIER_ARM=.62;
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
  // Lifted over the colla's heads (the festa, figures/bou/bou-dance.js BOU_CARRY) the hem rises past their hips: each carrier's
  // trunk and arms, pushing the frame straight up, fill the gap (hidden on the floor, where the skirt covers them)
  const shirt = new THREE.MeshLambertMaterial({ color: '#2a1d22' }), trunks = [], arms = [];
  for (let c = 0; c < 2; c++) {
    const t = new THREE.Mesh(unit, shirt); t.scale.set(.34, CARRIER_TRUNK, .2); t.visible = false; trunks.push(t);
    for (let k = 0; k < 2; k++) { const a = new THREE.Mesh(unit, shirt); a.scale.set(.09, CARRIER_ARM, .09); a.visible = false; arms.push(a); }
  }
  // One instanced box mesh draws every carrier part (a colour each; the trunks and arms only while shown). The Mesh
  // handles stay in the rig for the pose, the tests and the audit, but on a layer the camera never draws.
  const parts = [], m4 = new THREE.Matrix4(), none = new THREE.Matrix4().makeScale(0, 0, 0), lift = new THREE.Matrix4().makeTranslation(0, .5, 0);
  const limbs = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial(), 22);
  limbs.frustumCulled = false; limbs.instanceMatrix.setUsage(THREE.DynamicDrawUsage); // (instances leave the origin's bounds)
  const part = (m, foot) => { // pre: the handle's box (a unit box standing on its origin, or a centred one of its size) to the instance's centred unit box
    const g = m.geometry.parameters; m.layers.set(31); limbs.setColorAt(parts.length, m.material.color);
    parts.push({ m, foot, pre: foot ? new THREE.Matrix4().makeScale(g.width, g.height, g.depth) : lift });
  };
  for (const m of [...legs, ...trunks, ...arms]) part(m);
  for (const f of feet) for (const m of f.children) part(m, f);
  function syncLimbs() {
    for (let i = 0; i < parts.length; i++) {
      const { m, foot, pre } = parts[i];
      if (!m.visible) { limbs.setMatrixAt(i, none); continue; }
      m.updateMatrix(); m4.multiplyMatrices(m.matrix, pre);
      if (foot) { foot.updateMatrix(); m4.premultiply(foot.matrix); }
      limbs.setMatrixAt(i, m4);
    }
    limbs.instanceMatrix.needsUpdate = true;
  }
  const hip = new THREE.Vector3(), ankle = new THREE.Vector3(), knee = new THREE.Vector3(), d = new THREE.Vector3();
  const fwd = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  const place = (m, a, b) => { d.subVectors(b, a); m.position.copy(a); m.scale.y = d.length(); m.quaternion.setFromUnitVectors(up, d.normalize()); };
  // Legs from each carrier's hips to the ankle, the knee bending forward: whatever the shell does, the legs stay joined
  // to the feet and run up under the skirt. The hips are the carrier's own place in the shell (fore or aft, .11 m to a
  // side), not over their feet: a leg stretched out or left behind by a turn tilts from there instead of carrying the
  // thigh out through the skirt (it showed through the cloth by up to 21 cm).
  // x past 0, eased in over HIP_EASE m either side (a smooth max(0, x))
  const softOver = x => x <= -HIP_EASE ? 0 : x >= HIP_EASE ? x : (x + HIP_EASE) ** 2 / (4 * HIP_EASE);
  const SKIRT = { x: .51, front: .9, back: -1.23 }; // m in the shell's frame a knee keeps inside: its cloth (flanks .60, front 1.0, back -1.33) less the leg's own width
  const toShell = new THREE.Matrix4(), local = new THREE.Vector3();
  function poseLegs() {
    root.updateMatrix(); body.updateMatrix(); toShell.multiplyMatrices(root.matrix, body.matrix).invert(); // (the shell in the legs' own frame, the dance's: not the world's)
    for (let i = 0; i < 4; i++) {
      const f = feet[i], mate = feet[i ^ 1], yaw = (f.rotation.y + mate.rotation.y) / 2, side = i % 2 ? 1 : -1;
      // the hips ride with the shell (its dip, see-saw and waddle bend the knees), never past the legs' reach
      const y = HIP + root.position.y - (i < 2 ? -.66 : .66) * Math.sin(body.rotation.x) + side * .11 * Math.sin(body.rotation.z);
      const ry = root.rotation.y, along = i < 2 ? -.66 : .66;
      hip.set(root.position.x + side * .11 * Math.cos(ry) + along * Math.sin(ry), y - softOver(y - HIP), root.position.z - side * .11 * Math.sin(ry) + along * Math.cos(ry)); // (never above standing, eased into it: a hard stop kinked the hip as the shell rose past it)
      ankle.set(f.position.x, f.position.y + .08, f.position.z);
      // a straight leg at most: a planted foot left behind lowers its hip a touch instead of stretching the shin
      // a foot left far behind (the fastest rushes) pulls its hip after it, as far as the leg needs to reach it
      // Its knees stay inside the skirt (SKIRT, the shell's frame): one that would come out through the cloth takes its hip
      // back in with it, as anyone crouching sits back (the front carrier's bent knees went 12 cm out through the front on
      // every dip, a leg left outside by a turn up to 27 cm through the flank). Twice, then the leg as it then stands
      const hipY = hip.y, cr = Math.cos(ry), sr = Math.sin(ry);
      for (let pass = 0; pass < 3; pass++) {
        hip.y = hipY; let flat = Math.hypot(hip.x - ankle.x, hip.z - ankle.z);
        { const over = softOver(flat - (pass ? HIP_FAR : HIP_FLAT)); if (over > 0) { const k = over / flat; hip.x += (ankle.x - hip.x) * k; hip.z += (ankle.z - hip.z) * k; flat -= over; } } // (eased in, as the hip's height: a hard stop yanked it)
        const reachMax = THIGH + SHIN - 1e-3;
        const straight = ankle.y + Math.sqrt(Math.max(0, reachMax * reachMax - flat * flat));
        hip.y = Math.min(hip.y, straight);
        // a leg stretched forward (toe up, the dance's gesture) is straight, its hip up inside the shell: with the dip's bent
        // knee it went out through the front of the skirt
        hip.y += (straight - hip.y) * Math.min(1, Math.max(0, -f.rotation.x / .3));
        // the knee never snaps straight: past KNEE_SOFT of the leg's length the hip sinks a touch inside the shell, so the
        // leg nears its full length without getting there (a hard stop made the knee jump as the shell heaved an end up and
        // down: near straight, a centimetre of hip is degrees of knee). The leg itself is never stretched
        { const full = THIGH + SHIN, soft = KNEE_SOFT * full, far = hip.distanceTo(ankle);
          if (far > soft) { const to = full - (full - soft) * Math.exp(-(far - soft) / (full - soft)); if (to > flat) hip.y = Math.min(hip.y, ankle.y + Math.sqrt(to * to - flat * flat)); } }
        fwd.set(Math.sin(yaw), 0, Math.cos(yaw));
        const dist = hip.distanceTo(ankle);
        d.subVectors(ankle, hip).divideScalar(dist);
        fwd.addScaledVector(d, -fwd.dot(d)).normalize();
        const reach = Math.min(dist, THIGH + SHIN - 1e-3), cos = (THIGH ** 2 + reach ** 2 - SHIN ** 2) / (2 * THIGH * reach);
        knee.copy(hip).addScaledVector(d, THIGH * cos).addScaledVector(fwd, THIGH * Math.sqrt(Math.max(0, 1 - cos * cos)));
        if (pass === 2) break;
        // (in the shell's own frame, tilted as it is: heaved up at one end, its cloth leans over the standing leg)
        let ox = 0, oz = 0;
        for (const p of [knee, hip]) { local.copy(p).applyMatrix4(toShell);
          const x = softOver(Math.abs(local.x) - SKIRT.x) * Math.sign(local.x), z = softOver(local.z - SKIRT.front) - softOver(SKIRT.back - local.z);
          if (Math.abs(x) > Math.abs(ox)) ox = x; if (Math.abs(z) > Math.abs(oz)) oz = z; }
        if (!ox && !oz) break;
        hip.x -= ox * cr + oz * sr; hip.z -= -ox * sr + oz * cr;
      }
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
    syncLimbs();
  }

  return {root,body,tail,feet,legs,trunks,arms,limbs,poseLegs};
}
