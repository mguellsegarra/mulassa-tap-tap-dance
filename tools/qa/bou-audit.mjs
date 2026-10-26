#!/usr/bin/env node
// Dev tool (never built): the Bou's moving parts audited in motion for fusions and flicker, as the dev viewer
// (tools/dev/bou.html) poses it: the game's whole dance on its song (figures/bou/bou-motion.js: path, turns, planned steps,
// the tail), the head's gags on the beat. Every box the model is built from is recorded (Vox.box), the moving ones are carried into the body's
// frame each sample, and two checks run:
// - fusion: a moving box entering a box of another part deeper than it does at rest (SAT on oriented boxes);
// - flicker: two faces of different colour, coplanar and overlapping, in the rest pose (z-fighting).
// Usage: node tools/qa/bou-audit.mjs [--cap=a] [--fps=15] [--tol=0.015]
import * as THREE from 'three';
import { Vox } from '../../src/scene/models/voxel.js';
import { buildBou } from '../../src/figures/bou/bou.js';
import { BOU_TIMING } from '../../src/figures/bou/bou-dance.js';
import { createBouMotion } from '../../src/figures/bou/bou-motion.js';

const args = Object.fromEntries(process.argv.slice(2).map(a => { const [k, v = '1'] = a.replace(/^--/, '').split('='); return [k, v]; }));
const cap = args.cap ?? 'a', fps = +(args.fps ?? 15), tol = +(args.tol ?? .015);

// Record each Vox's boxes on the mesh it makes.
const box0 = Vox.prototype.box, mesh0 = Vox.prototype.mesh;
Vox.prototype.box = function (x, y, z, w, h, d, color, j) { (this.boxes ??= []).push({ c: [x, y + h / 2, z], h: [w / 2, h / 2, d / 2], color }); return box0.call(this, x, y, z, w, h, d, color, j); };
Vox.prototype.mesh = function () { const m = mesh0.call(this); m.userData.boxes = this.boxes ?? []; return m; };
const rig = buildBou({ cap });
Vox.prototype.box = box0; Vox.prototype.mesh = mesh0;

// Name the meshes by what they belong to (the head's pivots, the tail's links), the rest by their path.
const names = new Map(), C = rig.cap ?? {};
const label = (o, n) => o?.traverse(m => m.isMesh && !names.has(m) && names.set(m, n));
let k = 0; C.jaw?.traverse(m => m.isMesh && names.set(m, k++ ? `tongue-${k - 1}` : 'jaw'));   // jaw, then the tongue's base and links in order
C.ears?.forEach((e, i) => label(e, `ear-${i}`)); rig.tail.children.forEach((g, i, all) => label(g, i < (all.length + 1) / 2 ? `tail-${i}` : `tail-k${i - (all.length - 1) / 2}`));   // links, then the knuckles between them
C.head?.children.forEach((g, i) => label(g, i ? `head-part-${i}` : 'head')); label(C.neck, 'neck');
rig.body.traverse(m => m.isMesh && !names.has(m) && names.set(m, 'body'));
// The shoes (plain boxes, not Vox): one box each from their geometry. The legs run up under the skirt by design.
rig.feet.forEach((f, i) => f.traverse(m => { if (!m.isMesh) return; m.geometry.computeBoundingBox(); const bb = m.geometry.boundingBox;
  m.userData.boxes = [{ c: bb.getCenter(new THREE.Vector3()).toArray(), h: bb.getSize(new THREE.Vector3()).multiplyScalar(.5).toArray(), color: '#' + m.material.color.getHexString() }];
  names.set(m, `foot-${i}`); }));
const moving = new Set([...names].filter(([, n]) => n !== 'body').map(([m]) => m));
const meshes = [...names.keys()].filter(m => m.userData.boxes?.length);

// Oriented boxes in the body's frame: centre, three unit axes, half sizes.
const inv = new THREE.Matrix4(), M = new THREE.Matrix4(), e = new THREE.Vector3();
const obbs = () => {
  rig.root.updateMatrixWorld(true); inv.copy(rig.body.matrixWorld).invert();
  return meshes.filter(m => { let v = true; m.traverseAncestors(o => (v &&= o.visible)); return v && m.visible; }).flatMap(m => { M.multiplyMatrices(inv, m.matrixWorld); const el = M.elements;
    const ax = [0, 1, 2].map(k => new THREE.Vector3(el[k * 4], el[k * 4 + 1], el[k * 4 + 2]));
    const s = ax.map(a => a.length()); ax.forEach((a, k) => a.divideScalar(s[k]));
    return m.userData.boxes.map((b, i) => ({ mesh: m, name: names.get(m), i, color: b.color,
      c: e.set(...b.c).applyMatrix4(M).clone(), ax, h: b.h.map((v, k) => v * s[k]) })); });
};
// Penetration depth of two oriented boxes (SAT, 15 axes): 0 when apart.
const t = new THREE.Vector3(), L = new THREE.Vector3();
function depth(A, B) {
  t.subVectors(B.c, A.c); let min = Infinity;
  const test = l => { const n = l.length(); if (n < 1e-6) return true; L.copy(l).divideScalar(n);
    const ra = A.ax.reduce((s, a, k) => s + Math.abs(a.dot(L)) * A.h[k], 0), rb = B.ax.reduce((s, a, k) => s + Math.abs(a.dot(L)) * B.h[k], 0);
    const o = ra + rb - Math.abs(t.dot(L)); if (o <= 0) return false; min = Math.min(min, o); return true; };
  for (const a of A.ax) if (!test(a)) return 0;
  for (const b of B.ax) if (!test(b)) return 0;
  for (const a of A.ax) for (const b of B.ax) if (!test(new THREE.Vector3().crossVectors(a, b))) return 0;
  return min;
}
// Links next to each other in a chain (the tail's, the tongue's) overlap at their joint by design: not a fusion.
const link = n => /^(tail|tongue)-(\d+)$/.exec(n);
const knuckle = n => /^tail-k(\d+)$/.exec(n)?.[1];   // knuckle k sits in the bend between links k-1 and k
const joint = (a, b) => { const p = link(a), q = link(b), k = knuckle(a) ?? knuckle(b), o = link(knuckle(a) ? b : a);
  return p && q ? p[1] === q[1] && Math.abs(p[2] - q[2]) === 1 : k != null && o?.[1] === 'tail' && (+o[2] === k - 1 || +o[2] === +k); };
// The neck grows out of the chest: inside it, hide in hide, its root moves unseen (a different colour would show).
const rooted = (A, B) => A.color === B.color && [A.name, B.name].sort().join() === 'body,neck';
const pairs = (list, fn) => { for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
  const A = list[i], B = list[j]; if (A.mesh === B.mesh || joint(A.name, B.name) || rooted(A, B) || !(moving.has(A.mesh) || moving.has(B.mesh))) continue; fn(A, B); } };
const key = (A, B) => `${A.name}#${A.i} ${A.color} × ${B.name}#${B.i} ${B.color}`;
const near = (A, B) => A.c.distanceTo(B.c) < A.h.reduce((s, v) => s + v * v, 0) ** .5 + B.h.reduce((s, v) => s + v * v, 0) ** .5;

// Rest: the opening stance, the head and tail still.
const motion = createBouMotion(rig);
function poseAt(time, dt) {
  const pose = motion(time, dt); rig.cap?.play(time, pose.beat); rig.root.updateMatrixWorld(true);
  rig.feet.forEach(f => f.updateMatrixWorld(true));
}
rig.cap?.play(0, 0.5); rig.swingTail(0);   // beat .5: mid-beat, no nod, mouth shut
const rest = new Map(), restList = obbs();
pairs(restList, (A, B) => near(A, B) && rest.set(key(A, B), depth(A, B)));

// Flicker: parallel faces within `eps`, facing the same way (two faces touching back to back are hidden), overlapping,
// different colours. At rest between any two boxes; in motion between moving parts.
function coplanar(A, B, eps, ang) {
  for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) { if (Math.abs(Math.abs(A.ax[a].dot(B.ax[b])) - 1) > ang) continue;
    const n = A.ax[a], s = Math.sign(n.dot(B.ax[b])), dc = t.subVectors(B.c, A.c).dot(n);
    for (const sa of [-1, 1]) for (const sb of [-1, 1]) if (sa === sb * s && Math.abs(dc + sb * B.h[b] * s - sa * A.h[a]) < eps
      && depth({ ...A, h: A.h.map((v, k) => (k === a ? v + 2 * eps : v)) }, B) > 1e-4) return true; }
  return false;
}
const flicker = [];
for (let i = 0; i < restList.length; i++) for (let j = i + 1; j < restList.length; j++) {
  const A = restList[i], B = restList[j];
  if (A.color !== B.color && (moving.has(A.mesh) || moving.has(B.mesh)) && near(A, B) && coplanar(A, B, 5e-4, 1e-4)) flicker.push(key(A, B));
}
const flickerMoving = new Map();
let coPrev = new Set(), coNow = new Set();
// Jitter: a tail link whose swing reverses at speed from one 60 Hz frame to the next (a vibration), or spins round
// its own axis faster than it turns (its stripes flash).
const jitter = { shake: 0, worstShake: 0, spin: 0, worstSpin: 0, at: 0 };
const links = rig.tail.children.slice(0, (rig.tail.children.length + 1) / 2), prevQ = links.map(() => new THREE.Quaternion()), prevW = links.map(() => new THREE.Vector3());
const range = { back: 0, side: 0 }, dq = new THREE.Quaternion(), w = new THREE.Vector3(), wq = new THREE.Quaternion();

// In motion: the whole song at `fps`, the tail stepped at 60 Hz in between.
const worst = new Map(), dt = 1 / 60;
for (let f = 0, every = Math.round(60 / fps); f * dt < BOU_TIMING.duration; f++) {
  poseAt(f * dt, f ? dt : 0);
  links.forEach((g, i) => {
    g.getWorldQuaternion(wq); dq.copy(prevQ[i]).invert().premultiply(wq);   // this frame's turn, world
    const angle = 2 * Math.acos(Math.min(1, Math.abs(dq.w))); w.set(dq.x, dq.y, dq.z).normalize().multiplyScalar(angle * Math.sign(dq.w || 1));
    if (f > 2) {
      const reverse = w.dot(prevW[i]) < 0 && angle > .03 && prevW[i].length() > .03;   // > ~2° a frame each way
      if (reverse && process.env.JDEBUG) console.log('rev', i, (f * dt).toFixed(3), (angle * 57.3).toFixed(1), 'beat', pose.beat.toFixed(2));
      if (reverse) { jitter.shake++; if (angle > jitter.worstShake) Object.assign(jitter, { worstShake: angle, at: f * dt }); }
      g.getWorldDirection(t); const twist = Math.abs(w.dot(t.set(0, -1, 0).applyQuaternion(wq)));   // about the link's own axis
      if (twist > .15) { jitter.spin++; jitter.worstSpin = Math.max(jitter.worstSpin, twist); }
    }
    prevQ[i].copy(wq); prevW[i].copy(w);
    if (i === links.length - 1) { t.set(0, -1, 0).applyQuaternion(g.quaternion); range.back = Math.max(range.back, Math.atan2(-t.z, -t.y)); range.side = Math.max(range.side, Math.abs(Math.atan2(t.x, -t.y))); }
  });
  if (f % every) continue;
  const list = obbs();
  for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) { const A = list[i], B = list[j];
    if (A.mesh !== B.mesh && A.color !== B.color && (moving.has(A.mesh) || moving.has(B.mesh)) && near(A, B) && coplanar(A, B, 1e-3, 1e-3)) {
      // a moving face sweeping through another's plane meets it for one sample; flicker is a plane they keep sharing
      const k = key(A, B); coNow.add(k); if (coPrev.has(k)) flickerMoving.set(k, (flickerMoving.get(k) ?? 0) + 1); } }
  [coPrev, coNow] = [coNow, coPrev]; coNow.clear();
  pairs(list, (A, B) => { if (!near(A, B)) return; const k = key(A, B), d = depth(A, B) - (rest.get(k) ?? 0);
    if (d > tol && d > (worst.get(k)?.d ?? 0)) worst.set(k, { d, time: f * dt, at: (moving.has(A.mesh) ? A : B).c.clone(), other: moving.has(A.mesh) ? B : A }); });
}
const fmt = v => v.toFixed(3);
console.log(`Bou audit: cap ${cap}, the game's dance, ${fps} fps over ${BOU_TIMING.duration.toFixed(0)} s, tolerance ${tol * 100} cm`);
const byPart = [...worst].sort((a, b) => b[1].d - a[1].d);
console.log(byPart.length ? `${byPart.length} fusions (deeper than at rest):` : 'no fusions');
// One line per pair of parts (the deepest of their boxes), with where the moving box was (body frame, y from the floor).
const seen = new Set();
for (const [k, w] of byPart) { const parts = k.replace(/#\d+ \S+/g, ''); if (seen.has(parts)) continue; seen.add(parts);
  const o = w.other; console.log(`  ${fmt(w.d)} m  t=${w.time.toFixed(2)} s  moving box at (${fmt(w.at.x)}, ${fmt(w.at.y + .85)}, ${fmt(w.at.z)})  ${k}  [other: centre y ${fmt(o.c.y + .85)} z ${fmt(o.c.z)}, size ${o.h.map(v => fmt(2 * v)).join('×')}]`); }
console.log(flicker.length ? `${new Set(flicker).size} coplanar face pairs at rest (flicker):` : 'no coplanar faces at rest');
for (const k of [...new Set(flicker)].slice(0, 40)) console.log('  ' + k);
console.log(flickerMoving.size ? `${flickerMoving.size} face pairs coplanar in motion (flicker), samples:` : 'no coplanar faces in motion');
for (const [k, c] of [...flickerMoving].sort((a, b) => b[1] - a[1]).slice(0, 40)) console.log(`  ${c}×  ${k}`);
console.log(`tail jitter: ${jitter.shake} reversals over 2° a frame (worst ${(jitter.worstShake * 57.3).toFixed(1)}° at ${jitter.at.toFixed(2)} s), ${jitter.spin} spins over 8.6° a frame round a link's axis (worst ${(jitter.worstSpin * 57.3).toFixed(1)}°)`);
console.log(`tail range: the brush swings up to ${(range.back * 57.3).toFixed(0)}° back and ${(range.side * 57.3).toFixed(0)}° to the side`);
process.exitCode = byPart.length || flicker.length || flickerMoving.size || jitter.shake || jitter.spin ? 1 : 0;
