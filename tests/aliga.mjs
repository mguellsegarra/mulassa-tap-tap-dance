// The Àliga de Valls (1991) and the aligons (src/scene/models/aliga.js): standing on the ground, all in one piece, within the
// visual sheet's measures, no coplanar faces in two colours, and posed only by data.
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { buildAliga, buildAligo, buildAligaRig, NEUTRAL, applyAligaPose } from '../src/scene/models/aliga.js';

const V = () => new THREE.Vector3();
// Every box (24 vertices) of every mesh, as a box in root space.
function boxes(root) {
  root.updateMatrixWorld(true);
  const inv = root.matrixWorld.clone().invert(), out = [];
  root.traverse(o => {
    if (!o.isMesh) return;
    const P = o.geometry.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld)).attributes.position;
    for (let i = 0; i < P.count; i += 24) {
      const b = new THREE.Box3();
      for (let k = i; k < Math.min(P.count, i + 24); k++) b.expandByPoint(V().fromBufferAttribute(P, k));
      out.push({ b, mesh: o });
    }
  });
  return out;
}
// Union of touching boxes: one component = nothing floating.
function pieces(list) {
  const up = list.map((_, i) => i), find = i => (up[i] === i ? i : (up[i] = find(up[i])));
  const grown = list.map(({ b }) => b.clone().expandByScalar(0.002));
  for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) if (grown[i].intersectsBox(grown[j])) up[find(i)] = find(j);
  return new Set(list.map((_, i) => find(i))).size;
}
const bounds = o => { o.updateWorldMatrix(true, true); return new THREE.Box3().setFromObject(o, true); }; // precise: posed boxes are rotated
function connected(root) { // every mesh hangs from the root
  root.traverse(o => { if (!o.isMesh) return; let p = o; while (p.parent) p = p.parent; assert.equal(p, root, 'a mesh is detached from the root'); });
}
// Same rule as tests/render-quality.mjs: parallel overlapping faces of two colours, not buried in another box.
function zFights(root) {
  root.updateMatrixWorld(true);
  const inv = root.matrixWorld.clone().invert(), quads = [], solid = [];
  let mi = 0;
  root.traverse(o => {
    if (!o.isMesh) return;
    const g = o.geometry.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld)), P = g.attributes.position, C = g.attributes.color;
    for (let q = 0; q < P.count / 4; q++) {
      const v = [0, 1, 2, 3].map(k => V().fromBufferAttribute(P, q * 4 + k)), n = V().subVectors(v[1], v[0]).cross(V().subVectors(v[2], v[0])).normalize();
      quads.push({ box: `${mi}:${Math.floor(q / 6)}`, v, n, d: n.dot(v[0]), c: [C.getX(q * 4), C.getY(q * 4), C.getZ(q * 4)] });
    }
    mi++;
  });
  for (const [k, fs] of Object.entries(Object.groupBy(quads, q => q.box)))
    if (fs.every(f => Math.max(...f.n.toArray().map(Math.abs)) > 0.999)) solid.push({ k, b: new THREE.Box3().setFromPoints(fs.flatMap(f => f.v)) });
  const out = [];
  for (let i = 0; i < quads.length; i++) for (let j = i + 1; j < quads.length; j++) {
    const a = quads[i], b = quads[j];
    if (a.box === b.box || a.n.dot(b.n) < 0.999 || Math.abs(a.d - b.d) >= 0.004 || a.c.every((c, k) => c === b.c[k])) continue;
    const u = V().subVectors(a.v[1], a.v[0]).normalize(), w = V().crossVectors(a.n, u);
    const span = (f, e) => [Math.min(...f.v.map(p => p.dot(e))), Math.max(...f.v.map(p => p.dot(e)))];
    const [au, bu, aw, bw] = [span(a, u), span(b, u), span(a, w), span(b, w)];
    const lu = Math.max(au[0], bu[0]), hu = Math.min(au[1], bu[1]), lw = Math.max(aw[0], bw[0]), hw = Math.min(aw[1], bw[1]);
    if (hu - lu < 1e-4 || hw - lw < 1e-4) continue;
    const mid = V().addScaledVector(u, (lu + hu) / 2).addScaledVector(w, (lw + hw) / 2).addScaledVector(a.n, (a.d + b.d) / 2);
    if (solid.some(({ k, b: B }) => k !== a.box && k !== b.box && B.clone().expandByScalar(-1e-4).containsPoint(mid))) continue;
    out.push(`${a.box}/${b.box} at ${mid.toArray().map(x => x.toFixed(3))}`);
  }
  return out;
}

const aliga = buildAliga(), aligo = buildAligo();
for (const [name, fig] of [['àliga', aliga], ['aligó', aligo]]) {
  connected(fig.root);
  const bb = bounds(fig.root), list = boxes(fig.root);
  assert(Math.abs(bb.min.y) < 0.002, `${name}: the feet touch the ground (lowest point ${bb.min.y.toFixed(3)} m)`);
  const feet = Math.min(...fig.legs.map(l => bounds(l).min.y));
  assert(Math.abs(feet) < 0.002, `${name}: the shoes are what touches the ground`);
  assert.equal(pieces(list), 1, `${name}: every box touches the rest (nothing floating)`);
  assert.deepEqual(zFights(fig.root), [], `${name}: no coplanar faces in two colours`);
}
// The visual sheet's measures (fitxa.md), with its tolerances.
const bb = bounds(aliga.root), size = bb.getSize(V());
const near = (v, want, tol, what) => assert(Math.abs(v - want) <= tol, `${what}: ${v.toFixed(2)} m, the sheet says ${want} ± ${tol}`);
near(size.y, 2.85, 0.15, 'total height to the crown');
near(size.x, 1.8, 0.15, 'wingspan (tip to tip, across)');
near(bb.max.z - bb.min.z, 2.0, 0.15, 'beak tip to wing tips');
near(bounds(aligo.root).getSize(V()).y, 1.0, 0.1, 'aligó height');
const rim = boxes(aliga.body).filter(({ b }) => b.max.y < 0.75).length; // the shell's lowest boxes: the rim
assert(rim > 0, 'the shell comes down to the rim (about 0.7 m)');
assert(bounds(aliga.body).min.y > 0.6, 'below the rim only the portador’s legs show');

// Poses: plain data in, same transforms out; the neutral pose stands the aligons clear of her.
const rig = buildAligaRig(), snap = () => { rig.root.updateMatrixWorld(true); const m = []; rig.root.traverse(o => m.push(...o.matrixWorld.elements)); return m; };
const with_ = (aliga, kid = {}) => ({ aliga: { ...NEUTRAL.aliga, ...aliga }, aligons: NEUTRAL.aligons.map(q => ({ ...q, ...kid })) });
applyAligaPose(rig, NEUTRAL);
const first = snap(), shoes = rig.aliga.legs.map(l => bounds(l)), standing = bounds(rig.aliga.root);
applyAligaPose(rig, with_({ yaw: 1, pitch: 0.2, legs: [0.4, -0.4], knees: [0.5, 0] }));
assert.notDeepEqual(snap(), first, 'a pose moves the figure');
applyAligaPose(rig, NEUTRAL);
assert.deepEqual(snap(), first, 'the same pose gives the same figure');
const eagleBox = bounds(rig.aliga.root);
for (const k of rig.aligons) {
  assert(!bounds(k.root).intersectsBox(eagleBox), 'neutral: no aligó inside the eagle');
  assert(Math.abs(bounds(k.root).min.y) < 0.002, 'neutral: the aligons stand on the ground');
}
// Her big bow (60-70°, tail high) and the aligons curled up on the ground.
applyAligaPose(rig, with_({ pitch: 70 * Math.PI / 180 }, { crouch: 1 }));
rig.aliga.legs.forEach((l, i) => assert(bounds(l).equals(shoes[i]), 'bowing, the portador’s feet stay planted'));
const bow = bounds(rig.aliga.root);
assert(bow.min.y > -0.002, `bowing, nothing goes into the ground (${bow.min.y.toFixed(3)} m)`);
assert(bow.max.y < standing.max.y - 0.2 && bow.max.z > standing.max.z + 0.5, 'bowing, she comes down and forward');
for (const k of rig.aligons) {
  const b = bounds(k.root);
  assert(b.min.y > -0.01 && b.min.y < 0.03, `curled up, the aligó lies on the ground (${b.min.y.toFixed(3)} m)`);
  assert(b.max.y < 0.5, `curled up, the aligó is a ball (${b.max.y.toFixed(2)} m high)`);
}
applyAligaPose(rig, with_({ roll: 0.2, lift: -0.1 }, { arms: [Math.PI, 0] }));
assert(bounds(rig.aligons[0].arms[0]).max.y > bounds(rig.aligons[0].head).max.y, 'an aligó raises an arm above his helmet');
rig.aliga.legs.forEach((l, i) => assert(bounds(l).equals(shoes[i]), 'swaying and dipping, the feet stay planted'));

console.log(`àliga ok: ${size.y.toFixed(2)} m tall, ${size.x.toFixed(2)} m wingspan, ${(bb.max.z - bb.min.z).toFixed(2)} m beak to wing tips; aligó ${bounds(aligo.root).getSize(V()).y.toFixed(2)} m`);
