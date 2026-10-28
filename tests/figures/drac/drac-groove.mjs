// The Drac's comic groove (figures/drac/drac-groove.js) over the whole song at 60 fps, happy (mood 1) and failing
// (mood 0.08, the springs' lowest vigor), drawn as drac-dance.js draws it:
// (1) the trousers: exposed cloth never crosses, no shoe in the other trouser, trousers in the trunk, shoes in cuffs, above the floor;
// (2) the shell's parts: how deep a vertex of one neck goes into the other neck, a wing into a neck, and the lowest shell point;
// (3) no glitches: the heads' and tail tip's accelerations converge at 60 / 120 fps (no velocity steps);
// (4) the four helpers stay clear of the posed Drac.
import assert from 'node:assert/strict';
import * as THREE from 'three';
const { Vox } = await import('../../../src/scene/models/voxel.js');
const { buildDrac, DRAC_SCALE } = await import('../../../src/figures/drac/drac.js');
const { feetAt } = await import('../../../src/figures/drac/drac-steps.js');
const { poseAt } = await import('../../../src/figures/drac/drac-pose.js');
const { newDracPose } = await import('../../../src/figures/drac/dance-drac.js');
const { dracTime } = await import('../../../src/figures/drac/drac-time.js');
const { grooveDrac, poseDracDance } = await import('../../../src/figures/drac/drac-groove.js');
const { placeDance, danceYaw, HELPERS } = await import('../../../src/figures/drac/drac-layout.js');
const { makeClothProbe, makeShoeProbe, actualClothFloor } = await import('./drac-cloth-probes.mjs');
const { lo, hi } = await import('../common/coplanar.mjs');
const song = (await import('../../../src/song-drac.json', { with: { type: 'json' } })).default;

const orig = { box: Vox.prototype.box, mesh: Vox.prototype.mesh };
Vox.prototype.box = function (x, y, z, w, h, d, color, jitter) { (this.L ||= []).push({ x, y, z, w, h, d }); return orig.box.call(this, x, y, z, w, h, d, color, jitter); };
Vox.prototype.mesh = function () { const m = orig.mesh.call(this); m.userData.boxes = this.L; return m; };
const rig = buildDrac();
Object.assign(Vox.prototype, orig);
const FRONT = danceYaw(-81 * Math.PI / 180), life = new THREE.Group(), pose = newDracPose();
life.add(rig.root); placeDance(life, FRONT); life.scale.setScalar(DRAC_SCALE);
const t0 = dracTime.pickup - 1, t1 = song.end + 1;
function draw(t, mood) { // drac-dance.js danceDrac, without the game's accent springs
  const ref = dracTime.refAt(t), beat = dracTime.beatAt(t), P = poseAt(pose, ref, beat);
  grooveDrac(P, beat, ref, mood);
  P.roll *= mood; P.pitch *= mood;
  poseDracDance(rig, P, beat, ref, mood, feetAt);
  life.updateMatrixWorld(true);
}
const meshes = g => { const out = []; g.traverse(o => { if (o.isMesh && o.userData.boxes) out.push(o); }); return out; };
const V = new THREE.Vector3(), M = new THREE.Matrix4();
// deepest a vertex of A goes into one of B's boxes (model units)
function depth(A, B) {
  let worst = 0;
  for (const b of B) {
    M.copy(b.matrixWorld).invert();
    for (const a of A) {
      const p = a.geometry.attributes.position;
      for (let k = 0; k < p.count; k += 3) {
        V.fromBufferAttribute(p, k).applyMatrix4(a.matrixWorld).applyMatrix4(M);
        for (const x of b.userData.boxes) {
          const l = lo(x), h = hi(x), d = Math.min(V.x - l[0], h[0] - V.x, V.y - l[1], h[1] - V.y, V.z - l[2], h[2] - V.z);
          if (d > worst) worst = d;
        }
      }
    }
  }
  return worst;
}
const NECK = rig.necks.map(n => meshes(n.root)), WING = rig.wings.map(w => meshes(w.root));
const SHELL = meshes(rig.body).filter(m => !rig.legs.some(l => l.shoe === m || l.shoe.children.includes(m)));
const report = {};
for (const mood of [1, 0.08]) {
  // (1) trousers, as tests/figures/drac/drac-compare-comic.mjs (3)
  const trunk = rig.body.children[0], HEM = Math.min(...trunk.userData.boxes.map(b => b.y));
  draw(t0, mood);
  const CLOTH = rig.legs.map(makeClothProbe), SHOE_PROBES = rig.legs.map(makeShoeProbe);
  let neckAt = 0, crossing = null, shoeIn = null, open = 0, cuff = Infinity, necks = 0, wings = 0, floor = Infinity;
  const P = new THREE.Vector3(), W = new THREE.Matrix4();
  for (let f = 0, n = Math.round((t1 - t0) * 60); f <= n; f++) {
    const t = t0 + f / 60;
    draw(t, mood); CLOTH.forEach(p => p.update()); SHOE_PROBES.forEach(p => p.update());
    const hem = rig.body.localToWorld(P.set(0, HEM, 0)).y;
    if (crossing === null && CLOTH[0].intersects(CLOTH[1], hem)) crossing = t;
    for (let i = 0; i < 2; i++) if (shoeIn === null && SHOE_PROBES[i].intersects(CLOTH[1 - i], hem)) shoeIn = t;
    W.copy(trunk.matrixWorld).invert();
    for (let i = 0; i < 2; i++) {
      for (const c of CLOTH[i].caps.top) open = Math.max(open, Math.min(...trunk.userData.boxes.map(b => { const a = lo(b), h = hi(b), q = P.copy(c.p).applyMatrix4(W); let s = 0; for (let k = 0; k < 3; k++) { const v = q.getComponent(k), g = Math.max(0, a[k] - 1e-4 - v, v - h[k] - 1e-4); s += g * g; } return Math.sqrt(s); })));
      cuff = Math.min(cuff, actualClothFloor(rig.legs[i]));
    }
    if (f % 6 === 0) { // (2) at 10 fps: the vertex test is heavy
      const nd = Math.max(depth(NECK[0], NECK[1]), depth(NECK[1], NECK[0])); if (nd > necks) { necks = nd; neckAt = t; }
      for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) wings = Math.max(wings, depth(WING[i], NECK[j]), depth(NECK[j], WING[i]));
      for (const m of SHELL) { m.geometry.computeBoundingBox(); floor = Math.min(floor, V.copy(m.geometry.boundingBox.min).applyMatrix4(m.matrixWorld).y); }
    }
  }
  report[mood] = { crossing, shoeIn, trunkGapMm: +(open * DRAC_SCALE * 1000).toFixed(2), cuffCm: +(cuff * DRAC_SCALE * 100).toFixed(1), neckIntoNeckCm: +(necks * DRAC_SCALE * 100).toFixed(1), neckAt: +neckAt.toFixed(2), wingIntoNeckCm: +(wings * DRAC_SCALE * 100).toFixed(1), lowestShellCm: +(floor * 100).toFixed(1) };
}
// (3) head and tail tips: peak acceleration at 60 and 120 fps (m/s^2)
const tips = [...rig.necks.map(n => n.head), rig.tail.at(-1)];
const peak = {};
for (const fps of [60, 120]) {
  let a = null, b = null, best = 0, when = 0;
  for (let f = 0; t0 + f / fps <= t1; f++) {
    draw(t0 + f / fps, 1);
    const c = tips.flatMap(o => o.getWorldPosition(V).toArray());
    if (a) for (let k = 0; k < c.length; k++) { const q = Math.abs(c[k] - 2 * b[k] + a[k]) * fps * fps; if (q > best) { best = q; when = t0 + (f - 1) / fps; } }
    a = b; b = c;
  }
  peak[fps] = +best.toFixed(0); peak[`${fps}at`] = +when.toFixed(2);
}
// (4) helpers, as tests/figures/drac/drac-dance.mjs (3)
const helperAt = HELPERS.map(h => { const g = new THREE.Object3D(); placeDance(g, FRONT); g.updateMatrixWorld(true);
  const c = new THREE.Vector3(h.x, 0, h.z).applyMatrix4(g.matrixWorld); return { x: c.x, z: c.z, yaw: FRONT + h.yaw }; });
let clear = Infinity;
const all = []; rig.root.traverse(o => { if (o.isMesh) all.push(o); });
for (let t = t0; t <= t1; t += 0.05) {
  draw(t, 1);
  for (const o of all) {
    if (!o.visible) continue;
    const p = o.geometry.attributes.position;
    for (let k = 0; k < p.count; k += 2) {
      V.fromBufferAttribute(p, k).applyMatrix4(o.matrixWorld);
      for (const h of helperAt) {
        const dx = V.x - h.x, dz = V.z - h.z, c = Math.cos(h.yaw), s = Math.sin(h.yaw), lx = c * dx - s * dz, lz = s * dx + c * dz;
        clear = Math.min(clear, Math.hypot(Math.max(0, Math.abs(lx) - 0.34), Math.max(0, lz - 0.52, -0.2 - lz)));
      }
    }
  }
}
console.log('drac-groove:', JSON.stringify({ happy: report[1], failing: report[0.08], tipAccel: peak, helpersClearM: +clear.toFixed(2) }));
for (const r of Object.values(report)) {
  assert.equal(r.crossing, null, 'trousers cross'); assert.equal(r.shoeIn, null, 'a shoe in the other trouser');
  assert.ok(r.cuffCm > 0, 'cloth under the floor'); assert.ok(r.lowestShellCm > 0, 'shell under the floor');
  assert.equal(r.neckIntoNeckCm, 0, 'the necks touch'); assert.equal(r.wingIntoNeckCm, 0, 'a wing in a neck');
}
assert.ok(peak[120] < 1.25 * peak[60], 'velocity steps: accelerations do not converge');
assert.ok(clear >= 0.25, `a helper only ${clear.toFixed(2)} m from the Drac`);
