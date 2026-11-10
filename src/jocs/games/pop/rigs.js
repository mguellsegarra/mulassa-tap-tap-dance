// The figures on the board: their postures, their rigs at rest, one geometry per rig or pivot, and the traps' colour tricks.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { C } from '../../../figures/mulassa/mulassa.js';
import { D, DRAC_SCALE } from '../../../figures/drac/drac.js';
import { buildPopMulassa, buildPopDrac } from './models.js';

// A box mesh's geometry, moved by `matrix`, with only what the board's material reads: mergeable with the others.
function plain(geo, matrix) {
  const g = (geo.index ? geo.toNonIndexed() : geo.clone()).applyMatrix4(matrix);
  for (const a of Object.keys(g.attributes)) if (!['position', 'normal', 'color'].includes(a)) g.deleteAttribute(a);
  return g;
}

// A rig's voxel parts, in their rest pose, as one geometry (position, normal, colour).
export function bake(root, { scale = 1, yaw = 0 } = {}) {
  root.updateMatrixWorld(true);
  const parts = [];
  root.traverse(o => {
    if (!o.isMesh || !o.geometry.attributes.color || !o.visible) return;
    parts.push(plain(o.geometry, o.matrixWorld));
  });
  const merged = mergeGeometries(parts);
  merged.rotateY(yaw);
  merged.scale(scale, scale, scale);
  return merged;
}

export const MULA_SCALE = .64, MULA_YAW = .65;
// Every figure strikes one of these, a new one each time it appears. Angles in radians; yaw is on top of the figure's facing.
// Raised heads and three-quarter faces: the chunky head is a blob from behind.
export const MULA_POSES = [
  { neck: -.12, head: -.45, yaw: .25 },
  { neck: .06, head: -.55, yaw: -1.55, jaw: .3 },
  { neck: -.18, head: -.5, body: -.06, yaw: .45, jaw: .45 },
  { neck: -.06, head: -.4, turn: -.18, yaw: -1.75 },
  { neck: .08, head: -.55, body: .04, yaw: .15, jaw: .2 },
  { neck: -.1, head: -.5, turn: .2, roll: .05, yaw: -1.45 },
];
// Each head keeps to its own side: splayed necks, and never turned towards the other (they would merge).
export const DRAC_POSES = [
  { necks: [.3, .3], heads: [[-.85, .1], [-.85, -.1]], jaws: [.25, .25], splay: .2, wing: .1 },
  { necks: [.05, .6], heads: [[-1.15, .25], [-.6, -.2]], jaws: [.7, .1], splay: .2, wing: .5 },
  { necks: [.3, .3], heads: [[-.8, .6], [-.8, -.6]], jaws: [.2, .2], splay: .3, wing: .2 },
  { necks: [.1, .1], heads: [[-1.05, .15], [-1.05, -.15]], jaws: [.55, .55], splay: .25, wing: 1, lean: -.08 },
  { necks: [.45, .15], heads: [[-.75, .3], [-1, -.3]], jaws: [.15, .4], splay: .25, wing: .3 },
  { necks: [.2, .45], heads: [[-1, .4], [-.8, -.1]], jaws: [.45, .2], splay: .2, yaw: .5, wing: .6, lean: .05 },
];
export function poseMula(m, P, t = 0, ph = 0, urgent = 0) {
  const beat = t * 7 + ph;
  m.neck.rotation.x = P.neck + Math.sin(beat) * .1;
  m.head.rotation.set(P.head + Math.sin(beat + 1) * .12, (P.turn ?? 0) + Math.sin(t * 34) * .35 * urgent, 0); // panics as her fuse ends
  m.jaw.rotation.x = (P.jaw ?? .1) + Math.max(0, Math.sin(t * 14 + ph)) * .35; // the clack
  m.ears.forEach((e, k) => { e.rotation.x = -.25 + Math.sin(beat + k) * .25; });
  m.tail.rotation.set(Math.sin(beat) * .2, 0, Math.sin(t * 10 + ph) * .6);
  m.body.rotation.set(P.body ?? 0, 0, P.roll ?? 0);
}
export function poseDrac(d, P, t = 0, ph = 0, fire = 0) {
  d.necks.forEach((n, k) => {
    const side = k ? -1 : 1, lean = P.necks[k] * (1 - fire) + .3 * fire, sway = Math.sin(t * 1.6 + ph + k) * .03;
    for (const seg of n.segs) seg.rotation.set(lean / 3 + sway, 0, -side * (P.splay ?? 0) / 3 * (1 - fire));
    n.head.rotation.set(P.heads[k][0] * (1 - fire) - .45 * fire + Math.sin(t * 2.1 + ph + k * 2) * .05, P.heads[k][1] * (1 - fire), 0);
    n.jaw.rotation.x = Math.max(P.jaws[k] + Math.sin(t * 2.6 + ph + k) * .06, fire);
  });
  d.wings.forEach((w, k) => { w.root.rotation.z = (k ? -1 : 1) * ((P.wing ?? 0) * .7 + Math.sin(t * 3 + ph) * .06); });
  for (const seg of d.tail) seg.rotation.y = Math.sin(t * 1.3 + ph) * .12;
  d.body.rotation.x = P.lean ?? 0;
}
export function mulaRig() {
  const m = buildPopMulassa();
  m.root.rotation.order = 'YXZ';
  poseMula(m, MULA_POSES[0]);
  return m;
}
export const bakeMulassa = () => bake(mulaRig().root, { scale: MULA_SCALE, yaw: MULA_YAW });
// Each pivot's own boxes, in its own frame: one instanced part per pivot, so any number of live Mulasses cost the same few draw calls.
export function rigParts(root) {
  const parts = [];
  root.traverse(node => {
    const own = node.children.filter(o => o.isMesh && o.geometry.attributes.color);
    if (!own.length) return;
    parts.push({ node, geo: mergeGeometries(own.map(o => plain(o.geometry, o.matrix))) });
  });
  return parts;
}
export function dracRig() {
  const d = buildPopDrac();
  d.root.rotation.order = 'YXZ';
  poseDrac(d, DRAC_POSES[0]);
  return d;
}
export const DRAC_YAW = .3, DRAC_K = DRAC_SCALE * .94;
export const bakeDrac = () => bake(dracRig().root, { scale: DRAC_K, yaw: DRAC_YAW });
// The traps' trick: the same figure in the other figure's colour.
// The fake Drac: only its green scales turn red, keeping their shading; swapping the channels gave a dull plum.
export function redScales(geo) {
  const g = geo.clone(), c = g.attributes.color, red = new THREE.Color(D.red), green = new THREE.Color(D.green).g;
  for (let i = 0; i < c.count; i++) {
    const k = c.getY(i) / green; // shaded against the Drac's main green, in linear colour
    if (c.getY(i) > c.getX(i) && c.getY(i) > c.getZ(i)) c.setXYZ(i, red.r * k, red.g * k, red.b * k);
  }
  return g;
}

// The fake Mulassa: only her red velvet turns green; skin, mouth, gold and blanket stay. In linear colour the mouth's dark red falls under the r > .15 bar.
export function greenVelvet(geo) {
  const g = geo.clone(), c = g.attributes.color, velvet = new THREE.Color('#2fa84e'), red = new THREE.Color(C.red).r;
  for (let i = 0; i < c.count; i++) {
    const r = c.getX(i);
    if (r > .15 && r > 6 * c.getY(i)) c.setXYZ(i, velvet.r * r / red, velvet.g * r / red, velvet.b * r / red);
  }
  return g;
}
