// The comparison's comic layer ("Expressivitat") and carrier legs (drac-compare.html), on the real rig:
// (1) gain 0 keeps the accepted base pose; grounded shoes match drac-compare-base.json exactly. The natural airborne
//     arc may differ from the old fixture. Comic gain never changes any current shoe transform or the root path;
// (2) the comic layer shows: the shell drops and sways visibly more in the still holds, and is gone by the final settle;
// (3) at gains 0, 0.5 and 1, over 0-104.8 at 60 fps: the visible lower trousers (below the shell's hem) never pass
//     through each other and no shoe passes through the other trouser (actual mesh triangles and containment), trousers
//     stay in the trunk and shoes in their cuffs, no cuff under the floor;
// (4) the trousers move smoothly: their visible corners' accelerations converge at 30/60/120 fps over three phases;
// (5) the comic layer's pulse is the song's beat through the time map: monotone, in tempo range, deterministic.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { Vox } from '../src/scene/models/voxel.js';
import { buildDrac, DRAC_SCALE } from '../src/scene/models/drac.js';
import { poseCarrier } from '../src/scene/drac-rig.js';
import { feetAt as planFeetAt } from '../src/game/drac-steps.js';
const poseCompare = (rig, p) => poseCarrier(rig, p, planFeetAt); // the game's carrier on the audited foot plan
import { newFeet, swingAt } from '../src/game/drac-steps.js';
import { makeClothProbe, makeShoeProbe, actualClothFloor } from './drac-cloth-probes.mjs';
import { poseAt as poseAtBeat } from '../src/game/drac-pose.js';
import { newDracPose as newPose } from '../src/game/dance-drac.js';
import { dracTime } from '../src/game/drac-time.js';
// the game's pose at a reference second, its comic layer on the song's own beat there (game/drac-time.js)
const poseAt = (out, t, g) => poseAtBeat(out, t, dracTime.beatAtRef(t), g);

import { END } from '../src/game/drac-path.js';

// every Vox.box call kept per mesh, as tests/drac-parts.mjs does
const orig = { box: Vox.prototype.box, mesh: Vox.prototype.mesh };
Vox.prototype.box = function (x, y, z, w, h, d, color, jitter) { (this.L ||= []).push({ x, y, z, w, h, d }); return orig.box.call(this, x, y, z, w, h, d, color, jitter); };
Vox.prototype.mesh = function () { const m = orig.mesh.call(this); m.userData.boxes = this.L; return m; };
const rig = buildDrac(); rig.feet = newFeet();
Object.assign(Vox.prototype, orig);
const units = new THREE.Group(); units.add(rig.root);
const pose = newPose();
const posed = (t, g) => { poseAt(pose, t, g); poseCompare(rig, pose); units.updateMatrixWorld(true); };

// ---- (1) gain 0 is the base; the soles never depend on the gain
{
  const base = JSON.parse(readFileSync(new URL('./drac-compare-base.json', import.meta.url), 'utf8'));
  const shoes = () => rig.legs.flatMap(({ shoe }) => [shoe.position.x, shoe.position.y, shoe.position.z, shoe.rotation.y]);
  const same = (a, b, msg) => assert.ok(a.length === b.length && a.every((v, k) => v === b[k]), `${msg}: ${a} vs ${b}`); // exact (JSON keeps no -0)
  for (const [t, x, z, yaw, roll, pitch, lift, ...soles] of base) {
    posed(t, 0);
    same([pose.x, pose.z, pose.yaw, pose.roll, pose.pitch, pose.lift], [x, z, yaw, roll, pitch, lift], `${t}: gain 0 is the base pose`);
    const naturalSoles = shoes();
    for (let i = 0; i < 2; i++) if (swingAt(i, t) < 0) same(naturalSoles.slice(i * 4, i * 4 + 4), soles.slice(i * 4, i * 4 + 4), `${t}: gain 0 keeps grounded sole ${i}`);
    for (const g of [0.5, 1]) {
      posed(t, g);
      same([pose.x, pose.z, pose.yaw], [x, z, yaw], `${t}: gain ${g} keeps the root path`);
      same(shoes(), naturalSoles, `${t}: comic gain ${g} does not change the natural gait's soles`);
    }
  }
}

// ---- (2) visibly more motion in the holds; settled at the end
const W = new THREE.Vector3();
function extra(t0, t1) { // the most the comic layer lowers the shell (world, m) and sways it (deg) against the base
  let drop = 0, sway = 0;
  for (let t = t0; t <= t1; t += 1 / 60) {
    posed(t, 0); const y0 = rig.body.getWorldPosition(W).y, r0 = pose.roll;
    posed(t, 1); const y1 = rig.body.getWorldPosition(W).y;
    assert.ok(y1 <= y0 + 1e-12, `${t}: the comic dip only ever lowers the shell`);
    drop = Math.max(drop, (y0 - y1) * DRAC_SCALE); sway = Math.max(sway, Math.abs(pose.roll - r0) * 180 / Math.PI);
  }
  return { drop, sway };
}
for (const [a, b] of [[20.0, 21.6], [22.8, 24.1], [42.6, 43.9], [65.2, 67.3]]) {
  const x = extra(a, b);
  console.log(`  hold ${a}-${b}: the comic layer lowers the shell up to ${(x.drop * 100).toFixed(1)} cm and sways it up to ${x.sway.toFixed(1)} deg`);
  assert.ok(x.drop > 0.06, `${a}-${b}: the comic dip reaches over 6 cm`);
  assert.ok(x.sway > 3, `${a}-${b}: the comic sway reaches over 3 deg either side`);
}
for (let t = 104.45; t <= END; t += 0.05) {
  const a = poseAt(newPose(), t, 1), b = poseAt(newPose(), t, 0);
  assert.deepEqual(a, b, `${t}: the comic layer is gone by the final settle`);
}

// ---- (3) the legs at gains 0, 0.5, 1
const lo = b => [b.x - b.w / 2, b.y, b.z - b.d / 2], hi = b => [b.x + b.w / 2, b.y + b.h, b.z + b.d / 2];
const trunk = rig.body.children[0], HEM = Math.min(...trunk.userData.boxes.map(b => b.y)); // the shell's lowest edge (body frame)
const SHOES = rig.legs.map(l => l.shoe.children[0]);
const top = m => { const B = m.userData.boxes, y = Math.max(...B.map(b => b.y + b.h)), p = [];
  for (const b of B.filter(b => Math.abs(b.y + b.h - y) < 1e-6)) for (let i = 0; i <= 6; i++) for (let j = 0; j <= 6; j++) p.push(new THREE.Vector3(lo(b)[0] + b.w * i / 6, y, lo(b)[2] + b.d * j / 6));
  return p; };
const outside = (p, m) => Math.min(...m.userData.boxes.map(b => { const a = lo(b), c = hi(b); let q = 0; for (let k = 0; k < 3; k++) { const v = p.getComponent(k), g = Math.max(0, a[k] - 1e-4 - v, v - c[k] - 1e-4); q += g * g; } return Math.sqrt(q); }));
posed(0, 1); // the preview prepares the continuous cloth on first pose
const CLOTH = rig.legs.map(makeClothProbe), SHOE_PROBES = rig.legs.map(makeShoeProbe), SHOE_TOP = SHOES.map(top);
const M = new THREE.Matrix4(), P = new THREE.Vector3();
for (const g of [0, 0.5, 1]) {
  let crossing = null, shoeIn = null, open = 0, openAt = '', cuff = Infinity;
  for (let f = 0, n = Math.round(END * 60); f <= n; f++) {
    const t = f / 60;
    posed(t, g); CLOTH.forEach(p => p.update()); SHOE_PROBES.forEach(p => p.update());
    const hem = rig.body.localToWorld(P.set(0, HEM, 0)).y;
    if (crossing === null && CLOTH[0].intersects(CLOTH[1], hem)) crossing = t;
    for (let i = 0; i < 2; i++) if (shoeIn === null && SHOE_PROBES[i].intersects(CLOTH[1 - i], hem)) shoeIn = t;
    M.copy(trunk.matrixWorld).invert();
    for (let i = 0; i < 2; i++) {
      for (const c of CLOTH[i].caps.top) {
        const d = outside(P.copy(c.p).applyMatrix4(M), trunk) * DRAC_SCALE;
        if (d > open) { open = d; openAt = `cloth ${i} top at ${t.toFixed(3)} s`; }
      }
      for (const p of SHOE_TOP[i]) {
        const d = CLOTH[i].outside(SHOES[i].localToWorld(P.copy(p))) * DRAC_SCALE;
        if (d > open) { open = d; openAt = `shoe ${i} cuff at ${t.toFixed(3)} s`; }
      }
      cuff = Math.min(cuff, actualClothFloor(rig.legs[i]));
    }
  }
  console.log(`  gain ${g}: first exposed cloth collision ${crossing ?? 'none'}, shoe/other cloth ${shoeIn ?? 'none'}, joints ${(open * 1000).toFixed(2)} mm out (${openAt}), lowest cloth ${(cuff * DRAC_SCALE * 100).toFixed(1)} cm`);
  assert.equal(crossing, null, `gain ${g}: the exposed cloth surfaces intersect at ${crossing} s`);
  assert.equal(shoeIn, null, `gain ${g}: a shoe passes through the other trouser at ${shoeIn} s`);
  assert.ok(open < 0.0005, `gain ${g}: a trouser leaves the trunk or a shoe its cuff (${(open * 1000).toFixed(2)} mm, ${openAt})`);
  assert.ok(cuff > 0, `gain ${g}: cloth under the floor`);
}

// ---- (4) fixed material vertices of the real cloth, rather than a moving clipped-hem witness
{
  const indices = rig.legs.map(l => {
    const s = l.cloth.source, found = [];
    for (const u of [0, 0.25, 0.5, 0.75, 1]) for (const x of [-0.25, 0.25]) for (const z of [-0.26, 0.26]) {
      let idx = 0, best = Infinity;
      for (let k = 0; k < s.length / 3; k++) {
        const d = (s[k * 3] - x) ** 2 + (s[k * 3 + 1] + 0.04 - 1.81 * u) ** 2 + (s[k * 3 + 2] - z) ** 2;
        if (d < best) { best = d; idx = k; }
      }
      found.push(idx);
    }
    return [...new Set(found)];
  });
  const pts = () => {
    const out = [];
    for (let i = 0; i < 2; i++) for (const k of indices[i]) {
      const m = rig.legs[i].cloth.mesh;
      P.fromBufferAttribute(m.geometry.attributes.position, k).applyMatrix4(m.matrixWorld); out.push(P.x, P.y, P.z);
    }
    return out;
  };
  const peak = {};
  for (const fps of [30, 60, 120]) for (const ph of [0, 1 / 3, 2 / 3]) {
    let a = [], b = [], best = 0;
    const h = 1 / fps;
    for (let f = 0; (f + ph) * h <= END; f++) {
      posed((f + ph) * h, 1); const c = pts();
      if (a.length) for (let k = 0; k < c.length; k += 3) best = Math.max(best, Math.hypot(c[k] - 2 * b[k] + a[k], c[k + 1] - 2 * b[k + 1] + a[k + 1], c[k + 2] - 2 * b[k + 2] + a[k + 2]) / (h * h));
      a = b; b = c;
    }
    peak[fps] = Math.max(peak[fps] ?? 0, best);
  }
  console.log(`  actual cloth material vertices, peak acceleration (u/s^2): ${Object.entries(peak).map(([f, p]) => `${f} fps ${p.toFixed(0)}`).join(', ')}`);
  assert.ok(peak[120] < 1.25 * peak[60], 'the cloth has no velocity steps (accelerations converge with the frame rate)');
}

// ---- (5) the comic pulse is the song's own beat at each reference second (the video's estimated pulse it replaced was
// a measurement, never the game's grid): rising, within the music's tempo range, deterministic
{
  let prev = -Infinity, slow = Infinity, fast = 0;
  for (let t = 0.01; t <= END; t += 0.01) {
    const p = dracTime.beatAtRef(t), bpm = (dracTime.beatAtRef(t + 0.01) - p) / 0.01 * 60;
    assert.ok(p > prev, `the beat runs backwards at ${t}`); prev = p;
    slow = Math.min(slow, bpm); fast = Math.max(fast, bpm);
  }
  assert.ok(slow > 100 && fast < 160, `the beat per reference second within 100-160 BPM (the map runs at most ~10% fast into the first anchor) (${slow.toFixed(1)}-${fast.toFixed(1)})`);
  assert.equal(dracTime.beatAtRef(37.3), dracTime.beatAtRef(37.3), 'deterministic');
}
console.log('drac-compare-comic: ok');
