// The figures on the board: their postures, their rigs at rest, one geometry per rig or pivot, and the traps' colour tricks.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Vox } from '../../../scene/models/voxel.js';
import { buildMulassa, C } from '../../../figures/mulassa/mulassa.js';
import { buildDrac, DRAC_SCALE } from '../../../figures/drac/drac.js';
import { buildSimpleMulassa, buildSimpleDrac } from './simple-figures.js';

export const SIMPLE = import.meta.env.DEV && new URLSearchParams(location.search).has('simple'); // the chunky-voxel prototype

// A rig's voxel parts, in their rest pose, as one geometry (position, normal, colour).
export function bake(root, { scale = 1, yaw = 0 } = {}) {
  root.updateMatrixWorld(true);
  const parts = [];
  root.traverse(o => {
    if (!o.isMesh || !o.geometry.attributes.color || !o.visible) return;
    const g = (o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone()).applyMatrix4(o.matrixWorld);
    for (const a of Object.keys(g.attributes)) if (!['position', 'normal', 'color'].includes(a)) g.deleteAttribute(a);
    parts.push(g);
  });
  const merged = mergeGeometries(parts);
  merged.rotateY(yaw);
  merged.scale(scale, scale, scale);
  return merged;
}

export const MULA_SCALE = SIMPLE ? .64 : .72, MULA_YAW = SIMPLE ? .65 : 1.2;
// Every figure strikes one of these, a new one each time it appears. Angles in radians; yaw is on top of the figure's facing.
// Raised heads and three-quarter faces: the chunky head is a blob from behind.
const SIMPLE_MULA_POSES = [
  { neck: -.12, head: -.45, yaw: .25 },
  { neck: .06, head: -.55, yaw: -1.55, jaw: .3 },
  { neck: -.18, head: -.5, body: -.06, yaw: .45, jaw: .45 },
  { neck: -.06, head: -.4, turn: -.18, yaw: -1.75 },
  { neck: .08, head: -.55, body: .04, yaw: .15, jaw: .2 },
  { neck: -.1, head: -.5, turn: .2, roll: .05, yaw: -1.45 },
];
export const MULA_POSES = SIMPLE ? SIMPLE_MULA_POSES : [
  { neck: .15, head: .2, yaw: 0 }, // proud
  { neck: .95, head: .45, yaw: 0, jaw: .3 }, // head down, grazing
  { neck: -.2, head: -.5, body: -.2, yaw: 0, jaw: .45 }, // rearing, braying
  { neck: .2, head: .1, turn: .75, yaw: -2.4 }, // the other way, looking back
  { neck: .55, head: .1, body: .16, yaw: -2.4, jaw: .2 }, // rump up
  { neck: .05, head: -.15, turn: -.6, roll: .14, yaw: .5 }, // leaning, towards the camera
];
// Each head keeps to its own side: splayed necks, and never turned towards the other (they would merge).
const SIMPLE_DRAC_POSES = [
  { necks: [.3, .3], heads: [[-.85, .1], [-.85, -.1]], jaws: [.25, .25], splay: .2, wing: .1 },
  { necks: [.05, .6], heads: [[-1.15, .25], [-.6, -.2]], jaws: [.7, .1], splay: .2, wing: .5 },
  { necks: [.3, .3], heads: [[-.8, .6], [-.8, -.6]], jaws: [.2, .2], splay: .3, wing: .2 },
  { necks: [.1, .1], heads: [[-1.05, .15], [-1.05, -.15]], jaws: [.55, .55], splay: .25, wing: 1, lean: -.08 },
  { necks: [.45, .15], heads: [[-.75, .3], [-1, -.3]], jaws: [.15, .4], splay: .25, wing: .3 },
  { necks: [.2, .45], heads: [[-1, .4], [-.8, -.1]], jaws: [.45, .2], splay: .2, yaw: .5, wing: .6, lean: .05 },
];
export const DRAC_POSES = SIMPLE ? SIMPLE_DRAC_POSES : [
  { necks: [.3, .3], heads: [[-.85, 0], [-.85, 0]], jaws: [.25, .25], wing: .1 }, // watching you
  { necks: [.05, .6], heads: [[-1.15, .2], [-.60, -.2]], jaws: [.7, .1], wing: .5 }, // one roars, one looks on
  { necks: [.3, .3], heads: [[-.80, .6], [-.80, -.6]], jaws: [.2, .2], splay: .2, wing: .2 }, // each its own way
  { necks: [.1, .1], heads: [[-1.05, 0], [-1.05, 0]], jaws: [.55, .55], wing: 1, lean: -.08 }, // wings up, both roaring
  { necks: [.4, .4], heads: [[-.80, -.55], [-.80, .55]], jaws: [.15, .3], splay: -.14, wing: .3 }, // face to face
  { necks: [.55, .15], heads: [[-.75, .2], [-1.00, .2]], jaws: [.35, .45], yaw: .7, wing: .6, lean: .05 }, // turned aside
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
  const m = SIMPLE ? buildSimpleMulassa() : buildMulassa();
  m.peek.removeFromParent(); // her portador's face, for when things go wrong in the other game
  if (SIMPLE) { m.root.rotation.order = 'YXZ'; poseMula(m, MULA_POSES[0]); return m; }
  const legs = new Vox();
  for (const [x, z] of [[-.3, 1.1], [.3, 1.1], [-.3, -1.1], [.3, -1.1]]) legs.box(x, .05, z, .2, .5, .22, C.pants, 0).box(x, 0, z + .04, .22, .1, .32, C.shoe, 0);
  m.root.add(legs.mesh());
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
    parts.push({ node, geo: mergeGeometries(own.map(o => {
      const g = (o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone()).applyMatrix4(o.matrix);
      for (const a of Object.keys(g.attributes)) if (!['position', 'normal', 'color'].includes(a)) g.deleteAttribute(a);
      return g;
    })) });
  });
  return parts;
}
export function dracRig() {
  const d = SIMPLE ? buildSimpleDrac() : buildDrac({ wideEyes: true });
  for (const f of d.fire) f.removeFromParent(); // the board's fire is its particles
  // the rig leaves its legs to the dance: at rest, the carrier stands under the body
  d.legs.forEach(({ shoe, pants }, i) => { const s = i ? 1 : -1; shoe.position.set(s * .36, 0, .05); pants.position.set(s * .36, 0, .05); });
  d.root.rotation.order = 'YXZ';
  poseDrac(d, DRAC_POSES[0]);
  return d;
}
export const DRAC_YAW = .3, DRAC_K = DRAC_SCALE * (SIMPLE ? .94 : 1.02);
export const bakeDrac = () => bake(dracRig().root, { scale: DRAC_K, yaw: DRAC_YAW });
// The traps' trick: the same figure in the other figure's colour.
// The fake Drac: only its green scales turn red, keeping their shading; swapping the channels gave a dull plum.
export function redScales(geo) {
  const g = geo.clone(), c = g.attributes.color, red = new THREE.Color('#c42a2a');
  for (let i = 0; i < c.count; i++) {
    const k = c.getY(i) / .147; // the Drac's main green, in linear colour
    if (c.getY(i) > c.getX(i) && c.getY(i) > c.getZ(i)) c.setXYZ(i, red.r * k, red.g * k, red.b * k);
  }
  return g;
}

// The fake Mulassa: only her red velvet turns green; skin, mouth, gold and blanket stay. In linear colour the mouth's dark red falls under the r > .15 bar.
export function greenVelvet(geo) {
  const g = geo.clone(), c = g.attributes.color, velvet = new THREE.Color('#2fa84e');
  for (let i = 0; i < c.count; i++) {
    const r = c.getX(i);
    if (r > .15 && r > 6 * c.getY(i)) c.setXYZ(i, velvet.r * r / .366, velvet.g * r / .366, velvet.b * r / .366);
  }
  return g;
}

// A kind's portrait for the DOM (the how-to-play sheet), rendered once in a throwaway context.
export function thumbs(GEOS, mat, size = 112) {
  const r = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
  r.setPixelRatio(1);
  r.setSize(size, size);
  const s = new THREE.Scene();
  s.add(new THREE.HemisphereLight('#fff3d6', '#8a6a4a', 2.1));
  const l = new THREE.DirectionalLight('#ffe8c0', 2.4);
  l.position.set(-6, 12, 8);
  s.add(l);
  const cam = new THREE.PerspectiveCamera(26, 1, .1, 100);
  const out = {};
  for (const [kind, geo] of Object.entries(GEOS)) {
    const m = new THREE.Mesh(geo, mat);
    s.add(m);
    const b = new THREE.Box3().setFromObject(m), c = b.getCenter(new THREE.Vector3()), R = b.getSize(new THREE.Vector3()).length() / 2;
    cam.position.set(c.x, c.y + R * 1.4, c.z + R * 3.5);
    cam.lookAt(c);
    r.render(s, cam);
    out[kind] = r.domElement.toDataURL();
    s.remove(m);
  }
  r.dispose();
  r.forceContextLoss();
  return out;
}
