// The Drac's parts, audited over the whole ball:
// (1) no two boxes of one mesh share a coplanar, overlapping face pointing the same way (z-fighting = the parts that blink);
// (2) every mesh is one piece: each box shares a face patch (or volume) with the rest, so no detail floats;
// (3) every joint stays closed through the whole dance: the root face of each part (the end that goes into its parent)
//     stays inside the parent's boxes at every beat, so no seam opens when the pivots turn; each flame's root sits in
//     its nozzle, so a growing or shrinking flame never floats;
// (4) the rig's parts never sink into each other or the floor (sphere proxies);
// (8) no flame, at full size whenever it burns, cuts into any part but its emitter’s metal rods and nozzle, and no box of a wing
//     cuts into a neck, head, jaw, the other wing, the tail or a leg (exact box-vs-box under the posed matrices);
// (9) the carrier stands on rigid, flat shoes: every shoe box keeps its shape and its sole stays level, one shoe is always
//     down, a step is a few cm and the foot under the lean lifts less (measured on the shoe boxes, whatever the rig).
// `node tests/drac-parts.mjs` prints a report when it fails; DEBUG=1 prints it always.
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { Vox } from '../src/scene/models/voxel.js';

// every Vox.box call, kept per builder and handed to the mesh it makes
const orig = { box: Vox.prototype.box, mesh: Vox.prototype.mesh };
Vox.prototype.box = function (x, y, z, w, h, d, color, jitter) {
  (this.L ||= []).push({ x, y, z, w, h, d, color });
  return orig.box.call(this, x, y, z, w, h, d, color, jitter);
};
Vox.prototype.mesh = function () { const m = orig.mesh.call(this); m.userData.boxes = this.L; return m; };
const { buildDrac, DRAC_SIZE, DRAC_SCALE, BODY_Y, HIP_BELOW_BODY, D } = await import('../src/scene/models/drac.js');
const { dracPose, newDracPose, END_BEAT } = await import('../src/game/dance-drac.js');
const { poseDrac } = await import('../src/scene/drac-motion.js');
const { timeAtBeat, beatAtTime } = await import('../src/core/beat-grid.js');
const song = JSON.parse((await import('node:fs')).readFileSync(new URL('../src/song-drac.json', import.meta.url)));
const drac = buildDrac();
const meshes = [];
drac.root.traverse(o => { if (o.userData.boxes) meshes.push(o); });
const lo = b => [b.x - b.w / 2, b.y, b.z - b.d / 2], hi = b => [b.x + b.w / 2, b.y + b.h, b.z + b.d / 2];
const ov = (a0, a1, b0, b1) => Math.min(a1, b1) - Math.max(a0, b0);

// ---- (1) coplanar faces
const EPS = 1e-3, zfight = [];
for (const m of meshes) {
  const list = m.userData.boxes;
  const face = b => [ // [axis, sign, plane position, u range, v range]
    [0, 1, b.x + b.w / 2, [b.y, b.y + b.h], [b.z - b.d / 2, b.z + b.d / 2]], [0, -1, b.x - b.w / 2, [b.y, b.y + b.h], [b.z - b.d / 2, b.z + b.d / 2]],
    [1, 1, b.y + b.h, [b.x - b.w / 2, b.x + b.w / 2], [b.z - b.d / 2, b.z + b.d / 2]], [1, -1, b.y, [b.x - b.w / 2, b.x + b.w / 2], [b.z - b.d / 2, b.z + b.d / 2]],
    [2, 1, b.z + b.d / 2, [b.x - b.w / 2, b.x + b.w / 2], [b.y, b.y + b.h]], [2, -1, b.z - b.d / 2, [b.x - b.w / 2, b.x + b.w / 2], [b.y, b.y + b.h]],
  ];
  const faces = list.map(face);
  for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
    for (const fa of faces[i]) for (const fb of faces[j]) {
      if (fa[0] !== fb[0] || fa[1] !== fb[1] || Math.abs(fa[2] - fb[2]) > EPS) continue;
      const area = ov(...fa[3], ...fb[3]) * ov(...fa[4], ...fb[4]);
      if (ov(...fa[3], ...fb[3]) > EPS && ov(...fa[4], ...fb[4]) > EPS && area > 5e-4) {
        // a face buried inside a third box never shows: sample a point just outside it, at the middle of the overlap
        const u = (Math.max(fa[3][0], fb[3][0]) + Math.min(fa[3][1], fb[3][1])) / 2, w = (Math.max(fa[4][0], fb[4][0]) + Math.min(fa[4][1], fb[4][1])) / 2;
        const p = fa[0] === 0 ? [fa[2] + fa[1] * 3e-3, u, w] : fa[0] === 1 ? [u, fa[2] + fa[1] * 3e-3, w] : [u, w, fa[2] + fa[1] * 3e-3];
        if (list.some((c, k) => k !== i && k !== j && Math.abs(p[0] - c.x) < c.w / 2 && p[1] > c.y && p[1] < c.y + c.h && Math.abs(p[2] - c.z) < c.d / 2)) continue;
        zfight.push({ a: list[i], b: list[j], axis: 'xyz'[fa[0]], sign: fa[1], at: +fa[2].toFixed(3), area: +area.toFixed(3) });
      }
    }
  }
}

// ---- (2) one piece per mesh: two boxes join when they overlap in two axes and at least touch in the third
const joined = (a, b) => {
  const A0 = lo(a), A1 = hi(a), B0 = lo(b), B1 = hi(b), o = [0, 1, 2].map(k => ov(A0[k], A1[k], B0[k], B1[k]));
  return o.every(v => v > -1e-6) && o.filter(v => v > 1e-3).length >= 2;
};
const name = new Map([[drac.body.children[0], 'trunk']]);
drac.necks.forEach((n, i) => { n.segs.forEach((s, j) => name.set(s.children[0], `neck${i}.seg${j}`)); name.set(n.head.children[0], `head${i}`); name.set(n.jaw.children[0], `jaw${i}`); });
drac.wings.forEach((w, i) => name.set(w.root.children[0], `wing${i}`));
drac.tail.forEach((s, i) => name.set(s.children[0], `tail${i}`));
drac.legs.forEach(({ shoe, pants }, i) => { name.set(shoe.children[0], `shoe${i}`); name.set(pants.children[0], `pants${i}`); });
const floating = [];
for (const m of meshes) {
  const L = m.userData.boxes, seen = new Set([0]), todo = [0];
  while (todo.length) { const i = todo.pop(); L.forEach((b, j) => { if (!seen.has(j) && joined(L[i], b)) { seen.add(j); todo.push(j); } }); }
  L.forEach((b, i) => { if (!seen.has(i)) floating.push(`${name.get(m) ?? m.parent.type} ${b.color} box(${[b.x, b.y, b.z, b.w, b.h, b.d].map(v => +v.toFixed(3))})`); });
}

// ---- (3) joints: the child's root face, sampled on a grid, must stay inside the parent's boxes
// root face of a mesh = the face of its outermost box(es) along `dir` (axis, sign), e.g. [1, -1] = the bottom
function rootFace(mesh, [axis, sign]) {
  const B = mesh.userData.boxes, end = b => sign > 0 ? hi(b)[axis] : lo(b)[axis];
  const ext = sign > 0 ? Math.max(...B.map(end)) : Math.min(...B.map(end));
  const pts = [];
  for (const b of B.filter(b => Math.abs(end(b) - ext) < 1e-6)) {
    const a = lo(b), c = hi(b), [u, v] = [0, 1, 2].filter(k => k !== axis);
    for (let i = 0; i <= 6; i++) for (let j = 0; j <= 6; j++) {
      const p = new THREE.Vector3(); p.setComponent(axis, ext); p.setComponent(u, a[u] + (c[u] - a[u]) * i / 6); p.setComponent(v, a[v] + (c[v] - a[v]) * j / 6);
      pts.push(p);
    }
  }
  return pts;
}
const SIDE = [0, -1], TOP = [1, 1], BOTTOM = [1, -1], FRONT = [2, 1], BACK = [2, -1];
const trunk = drac.body.children[0];
const joints = []; // [name, child mesh, root face points (child local), parent mesh]
const joint = (nm, child, dir, parent) => joints.push([nm, child, rootFace(child, dir), parent]);
drac.necks.forEach((n, i) => {
  n.segs.forEach((s, j) => joint(`neck${i} seg${j}`, s.children[0], BOTTOM, j ? n.segs[j - 1].children[0] : trunk));
  joint(`head${i}`, n.head.children[0], BOTTOM, n.segs.at(-1).children[0]);
  joint(`jaw${i}`, n.jaw.children[0], BACK, n.head.children[0]);
});
drac.wings.forEach((w, i) => joint(`wing${i}`, w.root.children[0], i ? [0, 1] : SIDE, trunk));
drac.tail.forEach((s, j) => joint(`tail${j}`, s.children[0], FRONT, j ? drac.tail[j - 1].children[0] : trunk));
drac.legs.forEach(({ shoe, pants }, i) => { joint(`pants${i}`, pants.children[0], TOP, trunk); joint(`shoe${i}`, shoe.children[0], TOP, pants.children[0]); }); // the shoe's upper stays inside the cuff
// a flame scales about its origin, so if the origin and the corners of its root box are inside the nozzle, every size is
const flames = drac.fire.map((f, i) => {
  const emitter = f.parent.children.find(o => o.userData.boxes);
  const root = f.children.reduce((a, b) => (b.position.z - b.geometry.parameters.depth / 2 < a.position.z - a.geometry.parameters.depth / 2 ? b : a));
  const { width: w, height: h, depth: d } = root.geometry.parameters, z = root.position.z - d / 2;
  const pts = [new THREE.Vector3(), ...[-1, 1].flatMap(sx => [-1, 1].map(sy => new THREE.Vector3(sx * w / 2, sy * h / 2, z)))];
  const chain = [...f.children].sort((a, b) => a.position.z - b.position.z).every((b, k, s) => !k || s[k - 1].position.z + s[k - 1].geometry.parameters.depth / 2 > b.position.z - b.geometry.parameters.depth / 2 + 1e-3);
  return { nm: `flame${i}`, f, emitter, pts, chain };
});
const inside = (p, mesh) => mesh.userData.boxes.some(b => { const a = lo(b), c = hi(b); return [0, 1, 2].every(k => p.getComponent(k) > a[k] - 1e-4 && p.getComponent(k) < c[k] + 1e-4); });
const outside = (p, mesh) => Math.min(...mesh.userData.boxes.map(b => { const a = lo(b), c = hi(b); let q = 0; for (let k = 0; k < 3; k++) { const v = p.getComponent(k), g = Math.max(0, a[k] - v, v - c[k]); q += g * g; } return Math.sqrt(q); }));
const M = new THREE.Matrix4(), P = new THREE.Vector3(), open = new Map();
const checkJoint = (nm, child, pts, parent, beat) => {
  M.copy(parent.matrixWorld).invert().multiply(child.matrixWorld); // child local -> parent local
  for (const p of pts) {
    P.copy(p).applyMatrix4(M);
    if (inside(P, parent)) continue;
    const gap = outside(P, parent) * parent.getWorldScale(new THREE.Vector3()).x;
    if (gap > (open.get(nm)?.gap ?? 0)) open.set(nm, { gap: +gap.toFixed(3), beat: +beat.toFixed(2) });
  }
};

// ---- (4) sphere proxies of the parts
const V = new THREE.Vector3();
const world = (obj, x, y, z) => obj.localToWorld(V.set(x, y, z)).clone();
function spheres() {
  const S = { body: [], neck: [[], []], head: [[], []], jaw: [[], []], wing: [], tail: [], leg: [] };
  const bp = (x, y, z, r) => S.body.push({ c: world(drac.body, x, y, z), r });
  bp(0, 0, -0.3, 0.95); bp(0, 0, 0.3, 0.95); bp(0, 0.6, 0.2, 0.7); // the ribbed ball and the shoulders
  drac.necks.forEach((n, i) => {
    n.segs.forEach((s, j) => S.neck[i].push({ c: world(s, 0, 0.4, 0), r: 0.4 - j * 0.03 }));
    S.head[i].push({ c: world(n.head, 0, 0.5, 0), r: 0.5 }, { c: world(n.head, 0, 0.4, 0.95), r: 0.42 });
    S.jaw[i].push({ c: world(n.jaw, 0, -0.15, 0.55), r: 0.4 });
  });
  drac.wings.forEach((w, i) => [[0.6, 0.45], [1.1, 0.8], [1.25, 0.3]].forEach(([x, y]) => S.wing.push({ c: world(w.root, (i ? -1 : 1) * x, y, 0), r: 0.3 })));
  drac.tail.forEach((s, i) => { if (i) S.tail.push({ c: world(s, 0, 0, -0.25), r: 0.3 - i * 0.04 }); });
  drac.legs.forEach(({ pants }) => { S.leg.push({ c: world(pants, 0, 0.26, 0), r: 0.3 }, { c: world(pants, 0, 0.76, 0), r: 0.3 }); });
  return S;
}
const worst = new Map();
const hit = (nm, a, b, beat, slack = 0.05) => {
  const depth = a.r + b.r - a.c.distanceTo(b.c) - slack;
  if (depth > 0 && depth > (worst.get(nm)?.depth ?? 0)) worst.set(nm, { depth: +depth.toFixed(2), beat: +beat.toFixed(2) });
};
const floor = (nm, list, beat) => list.forEach(s => { const d = -(s.c.y - s.r) - 0.05; if (d > 0 && d > (worst.get(nm)?.depth ?? 0)) worst.set(nm, { depth: +d.toFixed(2), beat: +beat.toFixed(2) }); });

// ---- (6) the tail's spots stay in sight: no knuckle, its own segment's or a neighbour's, nor the trunk, covers the outer
// face of a gold ring or a red core at any beat
const tailMeshes = drac.tail.map(s => s.children[0]), spotPts = [], covered = new Map();
tailMeshes.forEach((m, t) => m.userData.boxes.forEach(b => {
  if (b.color !== D.spot && b.color !== D.spotRing) return;
  const sx = Math.sign(b.x), core = m.userData.boxes.find(c => c.color === D.spot && Math.sign(c.x) === sx);
  for (let i = 0; i <= 8; i++) for (let j = 0; j <= 8; j++) {
    const p = new THREE.Vector3(b.x + sx * (b.w / 2 + 2e-3), b.y + b.h * (0.02 + 0.96 * i / 8), b.z + b.d * (-0.48 + 0.96 * j / 8));
    const underOwnCore = b !== core && Math.abs(p.y - core.y - core.h / 2) < core.h / 2 + 2e-3 && Math.abs(p.z - core.z) < core.d / 2 + 2e-3;
    if (underOwnCore) continue;
    spotPts.push({ nm: `tail${t} ${b.color === D.spot ? 'core' : 'ring'} ${sx > 0 ? '+x' : '-x'}`, m, p });
  }
}));
const checkSpots = beat => { for (const { nm, m, p } of spotPts) for (const q of [trunk, ...tailMeshes]) {
  M.copy(q.matrixWorld).invert().multiply(m.matrixWorld); P.copy(p).applyMatrix4(M);
  if (inside(P, q)) { const c = covered.get(nm) ?? { points: 0, beat: +beat.toFixed(1) }; c.points++; covered.set(nm, c); break; }
} };
// ---- (7) the tail's segments sit close but their bodies never cut into each other: each body's facing end, sampled, stays
// out of its neighbour's body at every beat (the knuckle between them may overlap both)
const bodyOf = m => m.userData.boxes.reduce((a, b) => (b.w * b.h * b.d > a.w * a.h * a.d ? b : a));
const ends = [], cut = new Map();
for (let t = 1; t < tailMeshes.length; t++) for (const [m, q, sign] of [[tailMeshes[t], tailMeshes[t - 1], 1], [tailMeshes[t - 1], tailMeshes[t], -1]]) {
  const b = bodyOf(m), z = b.z + sign * b.d / 2;
  for (let i = 0; i <= 6; i++) for (let j = 0; j <= 6; j++) ends.push({ nm: `tail${t - 1}/tail${t}`, m, q, p: new THREE.Vector3(b.x + b.w * (i / 6 - 0.5), b.y + b.h * j / 6, z) });
}
const inBody = (p, q) => { const b = bodyOf(q); return Math.abs(p.x - b.x) < b.w / 2 - 1e-4 && p.y > b.y + 1e-4 && p.y < b.y + b.h - 1e-4 && Math.abs(p.z - b.z) < b.d / 2 - 1e-4; };
const checkEnds = beat => { for (const { nm, m, q, p } of ends) {
  M.copy(q.matrixWorld).invert().multiply(m.matrixWorld); P.copy(p).applyMatrix4(M);
  if (inBody(P, q) && !cut.has(nm)) cut.set(nm, +beat.toFixed(1));
} };

// ---- (8) the crouch scales the body unevenly under turned children, so box edges may shear.
// overlap() returns penetration along the best separating axis (<= 0: apart).
const piped = (m, c, half) => {
  const el = m.elements, e = [0, 1, 2].map(k => new THREE.Vector3(el[4 * k], el[4 * k + 1], el[4 * k + 2]).multiplyScalar(half[k]));
  return { c: c.clone().applyMatrix4(m), e, aabbHalf: [0, 1, 2].map(k => e.reduce((r, v) => r + Math.abs(v.getComponent(k)), 0)) };
};
const reachAlong = (o, n) => Math.abs(o.e[0].dot(n)) + Math.abs(o.e[1].dot(n)) + Math.abs(o.e[2].dot(n));
const cross = (a, b) => new THREE.Vector3().crossVectors(a, b);
function overlap(a, b) {
  const d = new THREE.Vector3().subVectors(b.c, a.c);
  for (let k = 0; k < 3; k++) if (Math.abs(d.getComponent(k)) >= a.aabbHalf[k] + b.aabbHalf[k]) return -1;
  const axes = [a, b].flatMap(o => [cross(o.e[1], o.e[2]), cross(o.e[2], o.e[0]), cross(o.e[0], o.e[1])]);
  for (const p of a.e) for (const q of b.e) axes.push(cross(p, q));
  let min = Infinity;
  for (const n of axes) {
    const l = n.length(); if (l < 1e-12) continue; n.divideScalar(l);
    min = Math.min(min, reachAlong(a, n) + reachAlong(b, n) - Math.abs(d.dot(n)));
    if (min <= 0) break;
  }
  return min;
}
const C = new THREE.Vector3();
const pipes = m => { const list = m.userData.boxes.map(b => ({ b, o: piped(m.matrixWorld, C.set(b.x, b.y + b.h / 2, b.z), [b.w / 2, b.h / 2, b.d / 2]) }));
  list.box = new THREE.Box3(); for (const { o } of list) list.box.expandByPoint(V.set(...o.aabbHalf).add(o.c)).expandByPoint(V.set(...o.aabbHalf).negate().add(o.c)); return list; };
const near = (o, box) => [0, 1, 2].every(k => o.c.getComponent(k) + o.aabbHalf[k] > box.min.getComponent(k) && o.c.getComponent(k) - o.aabbHalf[k] < box.max.getComponent(k));
const wingMeshes = drac.wings.map(w => w.root.children[0]), burns = new Map();
const burn = (nm, depth, beat) => { if (depth > 1e-4 && depth > (burns.get(nm)?.depth ?? 0)) burns.set(nm, { depth: +depth.toFixed(3), beat: +beat.toFixed(2) }); };
function checkBurns(beat) {
  const all = new Map(meshes.map(m => [m, pipes(m)]));
  drac.fire.forEach((f, i) => {
    if (!f.visible) return;
    const k = f.scale.x; f.scale.setScalar(1); f.updateMatrixWorld(true);
    const emitter = flames[i].emitter;
    for (const box of f.children) {
      const { width: w, height: h, depth: dd } = box.geometry.parameters, o = piped(box.matrixWorld, C.set(0, 0, 0), [w / 2, h / 2, dd / 2]);
      for (const [m, list] of all) if (near(o, list.box)) for (const { b, o: q } of list) if (!(m === emitter && b.color === D.metal)) burn(`flame${i} -> ${name.get(m)}`, overlap(o, q), beat);
    }
    f.scale.setScalar(k); f.updateMatrixWorld(true);
  });
  wingMeshes.forEach((wm, i) => { for (const { o } of all.get(wm)) for (const [m, list] of all) {
    if (m === wm || m === trunk || !near(o, list.box)) continue; // the trunk holds the wing's shoulder
    for (const { o: q } of list) burn(`wing${i} -> ${name.get(m)}`, overlap(o, q), beat);
  } });
}

// ---- (9) the shoes, found by colour: the corners of every shoe box, measured in the world
const corners = b => [0, 1, 2, 3, 4, 5, 6, 7].map(k => new THREE.Vector3(...[0, 1, 2].map(a => (k >> a & 1 ? hi : lo)(b)[a])));
const shoeMeshes = meshes.filter(m => m.userData.boxes.some(b => b.color === D.shoe)).map(m => {
  const B = m.userData.boxes.filter(b => b.color === D.shoe), sole = B.reduce((a, b) => (b.y < a.y ? b : a));
  return { m, boxes: B.map(corners), sole: corners(sole).filter(c => c.y === sole.y) };
});
const shoe = { squash: 0, tilt: 0, sunk: 0, airborne: 0, lift: 0, loaded: 0, unloaded: 0 }, W = new THREE.Vector3(), E = new THREE.Vector3();
function checkShoes(beat, p) {
  const h = shoeMeshes.map(({ m, boxes, sole }) => {
    for (const c of boxes) for (const k of [1, 2, 4]) { // each box's three edges keep their rest length
      const len = W.copy(c[0]).applyMatrix4(m.matrixWorld).distanceTo(E.copy(c[k]).applyMatrix4(m.matrixWorld));
      shoe.squash = Math.max(shoe.squash, Math.abs(len - c[0].distanceTo(c[k])));
    }
    const ys = sole.map(c => W.copy(c).applyMatrix4(m.matrixWorld).y);
    shoe.tilt = Math.max(shoe.tilt, Math.max(...ys) - Math.min(...ys));
    return Math.min(...ys);
  });
  shoe.sunk = Math.max(shoe.sunk, -Math.min(...h));
  shoe.airborne = Math.max(shoe.airborne, Math.min(...h)); // both feet up at once
  shoe.lift = Math.max(shoe.lift, ...h);
  // leaning hard (over 20°), the foot on the side the body tips to carries it and lifts less; + roll tips it toward -x
  const lean = p.roll + p.shake;
  if (Math.abs(lean) > 20 * Math.PI / 180 && h.length === 2) {
    const x = shoeMeshes.map(({ m }) => drac.root.worldToLocal(m.getWorldPosition(W)).x);
    const low = (lean > 0) === (x[0] < x[1]) ? 0 : 1;
    shoe.loaded = Math.max(shoe.loaded, h[low]); shoe.unloaded = Math.max(shoe.unloaded, h[1 - low]);
  }
}
const pose = newDracPose();
for (let beat = 0; beat < END_BEAT + 5; beat += 0.1) {
  dracPose(pose, beat); poseDrac(drac, pose, 0);
  drac.root.updateMatrixWorld(true);
  for (const [nm, child, pts, parent] of joints) checkJoint(nm, child, pts, parent, beat);
  for (const { nm, f, emitter, pts } of flames) checkJoint(nm, f, pts, emitter, beat);
  checkSpots(beat); checkEnds(beat); checkBurns(beat);
  const S = spheres();
  for (const a of [...S.neck[0], ...S.head[0], ...S.jaw[0]]) for (const b of [...S.neck[1], ...S.head[1], ...S.jaw[1]]) hit('neck vs neck', a, b, beat);
  for (let i = 0; i < 2; i++) {
    for (const a of [...S.neck[i].slice(1), ...S.head[i], ...S.jaw[i]]) for (const b of S.body) hit('neck/head into body', a, b, beat, 0.1);
    for (const a of [...S.neck[i], ...S.head[i], ...S.jaw[i]]) for (const b of S.wing) hit('neck/head into wing', a, b, beat);
    for (const a of [...S.head[i], ...S.jaw[i]]) for (const b of S.leg) hit('head into legs', a, b, beat);
  }
  for (const a of S.tail) { for (const b of S.leg) hit('tail into legs', a, b, beat); for (const b of S.body) hit('tail into body', a, b, beat); }
  floor('head / neck under the floor', [...S.neck.flat(), ...S.head.flat(), ...S.jaw.flat()], beat);
  floor('tail / wing under the floor', [...S.tail, ...S.wing], beat);
  floor('body under the floor', S.body, beat);
  floor('trousers under the floor', S.leg, beat);
  checkShoes(beat, pose);
}
for (const beat of [174.049, 170.049, 142.049, 138.049]) { // between grid samples, a trouser top's corner once left the trunk
  // by 3.6 mm at 174.049; 170.049 is that moment after the 4-beat break was cut, 142.049 / 138.049 both after D's cut
  dracPose(pose, beat); poseDrac(drac, pose, 0); drac.root.updateMatrixWorld(true);
  for (const [nm, child, pts, parent] of joints) checkJoint(nm, child, pts, parent, beat);
}
const report = {
  zfight: zfight.length, zfightSample: [...new Map(zfight.map(z => [`${z.axis}${z.sign}@${z.at} ${z.a.color}/${z.b.color}`, z])).values()].slice(0, 14).map(z => `${z.axis}${z.sign > 0 ? '+' : '-'}@${z.at} area ${z.area} colors ${z.a.color}/${z.b.color}`),
  floating, open: Object.fromEntries(open), coveredSpots: Object.fromEntries(covered), tailCuts: Object.fromEntries(cut), flameChains: flames.filter(f => !f.chain).map(f => f.nm), burns: Object.fromEntries(burns), collisions: Object.fromEntries(worst),
};
if (process.env.DEBUG) console.log(JSON.stringify(report, null, 1));
assert.equal(zfight.length, 0, 'coplanar overlapping faces (they blink):\n' + report.zfightSample.join('\n'));
assert.deepEqual(floating, [], 'boxes that float free of the rest of their part');
assert.ok(joints.length === 2 * (drac.necks[0].segs.length + 2) + 2 + drac.tail.length + 4 && flames.length >= 3, 'every part has its joint');
assert.deepEqual(report.open, {}, 'joints that open (m outside the parent, at that beat)');
assert.deepEqual(report.flameChains, [], 'flames whose boxes come apart');
assert.deepEqual(report.burns, {}, 'a flame or a wing cuts into another part (m deep along the best separating axis, at that beat)');
assert.deepEqual(report.collisions, {}, 'parts sink into each other or the floor');
assert.deepEqual(report.tailCuts, {}, 'tail segments whose bodies cut into each other (first beat)');
assert.equal(shoeMeshes.length, 2, 'two shoes');
assert.ok(shoe.squash < 1e-6, `a shoe changes shape (${shoe.squash.toFixed(3)} m off an edge's rest length)`);
assert.ok(shoe.tilt < 1e-3 && shoe.sunk < 1e-6, `a sole tilts (${shoe.tilt.toFixed(3)} m) or sinks into the floor (${shoe.sunk.toFixed(3)} m)`);
assert.ok(shoe.airborne < 1e-6, `both feet in the air at once (${shoe.airborne.toFixed(3)} m)`);
assert.ok(shoe.lift > 0.02 && shoe.lift < 0.06, `a step lifts a shoe ${shoe.lift.toFixed(3)} m (a few cm, not a stamp)`);
assert.ok(shoe.unloaded > 1.5 * shoe.loaded, `leaning, the foot under the body lifts as much as the other (${shoe.loaded.toFixed(3)} vs ${shoe.unloaded.toFixed(3)} m)`);
assert.ok(spotPts.length > 0 && !covered.size, 'tail spots covered by a knuckle or the trunk (sample points, first beat): ' + JSON.stringify(report.coveredSpots));
{ // (5) smooth on screen: at 60 fps, how far each part's outer corner moves in a frame may only change a little from one
  // frame to the next (a jump or a speed snap anywhere in the rig shows as a spike here). The flames flicker on purpose.
  const flame = new Set(); drac.fire.forEach(f => f.traverse(o => flame.add(o)));
  const parts = meshes.filter(m => !flame.has(m)), corner = parts.map(m => { const b = new THREE.Box3(); m.userData.boxes.forEach(x => b.expandByPoint(new THREE.Vector3(...lo(x))).expandByPoint(new THREE.Vector3(...hi(x)))); return b.max; });
  const was = parts.map(() => [new THREE.Vector3(), new THREE.Vector3()]), now = new THREE.Vector3(), v = new THREE.Vector3();
  const t0 = timeAtBeat(song.beats, 0); let worst = { jolt: 0 }; // real 60 fps frames, through the song's tempo map
  for (let i = 0, b = 0; b < END_BEAT + 4; b = beatAtTime(song.beats, t0 + ++i / 60)) {
    dracPose(pose, b); poseDrac(drac, pose, 0); drac.root.updateMatrixWorld(true);
    parts.forEach((m, k) => {
      const [p0, p1] = was[k];
      now.copy(corner[k]).applyMatrix4(m.matrixWorld);
      const jolt = v.subVectors(now, p1).sub(p1).add(p0).length(); // (now - p1) - (p1 - p0)
      if (i > 1 && jolt > worst.jolt) worst = { jolt: +jolt.toFixed(3), beat: +b.toFixed(2), part: k };
      p0.copy(p1); p1.copy(now);
    });
  }
  assert.ok(worst.jolt < 0.08, `a part jolts ${worst.jolt} m between frames at beat ${worst.beat} (part ${worst.part})`);
  // The left shoe's short swing near beat 174 failed under the faster music. Frame alignment changes its maximum:
  // retain the same limit at 32 offsets within one real 60 Hz frame, through every part around that step.
  const stepStart = timeAtBeat(song.beats, 173), stepEnd = timeAtBeat(song.beats, 176);
  for (let phase = 0; phase < 32; phase++) {
    for (let i = 0, t = stepStart + phase / 32 / 60; t <= stepEnd; t = stepStart + (++i + phase / 32) / 60) {
      const b = beatAtTime(song.beats, t);
      dracPose(pose, b); poseDrac(drac, pose, 0); drac.root.updateMatrixWorld(true);
      parts.forEach((m, k) => {
        const [p0, p1] = was[k];
        now.copy(corner[k]).applyMatrix4(m.matrixWorld);
        const jolt = v.subVectors(now, p1).sub(p1).add(p0).length();
        if (i > 1) assert.ok(jolt < 0.08, `step jolts ${jolt} m at beat ${b}, part ${k}, frame phase ${phase}/32`);
        p0.copy(p1); p1.copy(now);
      });
    }
  }
}
{ // DRAC_SIZE is what she measures standing (fire off)
  dracPose(pose, 12); poseDrac(drac, pose, 0); drac.root.updateMatrixWorld(true);
  const B = new THREE.Box3(), S = new THREE.Vector3();
  for (const m of meshes) B.expandByObject(m, true);
  B.getSize(S);
  assert.ok(Math.abs(B.max.y - DRAC_SIZE.h) < 0.1 && Math.abs(S.z - DRAC_SIZE.l) < 0.1, `DRAC_SIZE ${JSON.stringify(DRAC_SIZE)} vs measured h ${B.max.y.toFixed(2)} l ${S.z.toFixed(2)}`);
  // life-size on stage: the carrier's hip at a crowd adult's, the heads a little above a grown-up's reach (UAF: 1.90 m figure
  // over the carrier's legs), never the old 6 m giant
  const { buildPerson } = await import('../src/scene/models/people.js');
  const adultHip = buildPerson({}).legs[0].position.y, hip = (BODY_Y - HIP_BELOW_BODY) * DRAC_SCALE, top = B.max.y * DRAC_SCALE;
  assert.ok(hip > adultHip && hip < adultHip * 1.25 && top > 2.8 && top < 3.1 && S.z * DRAC_SCALE > 2.6 && S.z * DRAC_SCALE < 2.9, `life size: hip ${hip.toFixed(2)} vs adult ${adultHip}, top ${top.toFixed(2)} m, length ${(S.z * DRAC_SCALE).toFixed(2)} m`);
}
console.log('drac parts ok', DRAC_SIZE.h, `${meshes.length} parts, ${joints.length + flames.length} joints`);
