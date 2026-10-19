// The Drac de Valls (UAF, 1985): a round green body with horizontal ribs and a wide rolled hem, two short thick ribbed
// necks rising from its shoulders, two broad crocodile heads (red lips, white teeth, big eyes: red rim, blue iris, gold
// core, slit pupil; nostril mounds), small bat wings on the back (cream-gold membrane, rust leading edge and ribs, the
// same on both faces), a curling tail, a carved brown chest plaque with a dark grille, red
// spots in gold rings down the flanks, necks and tail, and a carrier whose cream camouflage trousers show underneath.
// Every moving part is a pivot the choreography drives (drac-motion.js), built so it can turn without opening a seam:
// a part's root end sits inside a knuckle (a stepped ball centred on its pivot) or deep in its parent, and each fire
// point's carretilla tube sits in its nozzle. tests/drac-parts.mjs checks that every part is one connected piece and stays attached.
import * as THREE from 'three';
import { Vox, MAT } from './voxel.js';
import { COLLA } from './colla.js';

export const D = {
  green: '#2f6b3a', greenDark: '#1f4a2b', greenLight: '#4a8a4c', rib: '#26562f',
  membrane: '#dfc07a', wingRib: '#a3442a',
  red: '#c42a2a', redDark: '#6e1018', white: '#f4efe4', iris: '#2f62b8', irisCore: '#e8b52c', pupil: '#111111',
  spot: '#c62a22', spotRing: '#e0b03a',
  brown: '#8a5233', brownLight: '#b8743e', grille: '#2b2522', metal: '#3b3b40',
  pants: COLLA.cream, pantsPatch: COLLA.blotch, pantsEye: COLLA.ring, shoe: '#141414', // the colla's own camouflage suit (models/colla.js)
};
export const DRAC_SIZE = { h: 6.0, l: 5.55 }; // model units, standing (heads up), snout to tail; tests/drac-parts.mjs measures it
// The rig is built and danced in model units; the stage shows it at this uniform scale (feet stay planted, joints closed).
// 0.492 (20% over the carrier-sized 0.41, which read small on the plaça): 2.95 m to the heads, 2.74 m long, near the
// UAF's 2.80 (1.90 high, 1.50 wide; its figure, carrier's legs below); the carrier's hip at 0.93 m. tests/drac-parts.mjs checks it.
export const DRAC_SCALE = 0.492;
export const BODY_Y = 2.25; // body pivot height: the carrier's legs fill the space below
export const ANKLE = 0.24, HIP_BELOW_BODY = 0.35;
export const FOOT_X = 0.36, FOOT_Z = 0.05; // each shoe's rest spot under the root (±x)

// a box by its centre (Vox.box takes the bottom y)
const cb = (v, x, y, z, w, h, d, c, j = 0) => v.box(x, y - h / 2, z, w, h, d, c, j);
// a flattened ball of horizontal slabs, (cx,cy,cz) centre; alternating colours give the ribbed look. Returns the slabs.
function ball(v, cx, cy, cz, rx, ry, rz, c1, c2, slabs) {
  const h = (2 * ry) / slabs, out = [];
  for (let i = 0; i < slabs; i++) {
    const dy = -ry + (i + 0.5) * h, k = Math.sqrt(1 - (dy / ry) ** 2);
    const s = { x: cx, y: cy + dy - h / 2, z: cz, w: 2 * rx * k, h, d: 2 * rz * k };
    v.box(s.x, s.y, s.z, s.w, s.h, s.d, i % 2 ? c1 : c2, 0.03); // touching, never overlapping: overlaps z-fight
    out.push(s);
  }
  return out;
}
// how far the slabs reach along +x (axis 0) or +z (axis 2) over a patch of the surface: [nearest, farthest]
function reach(slabs, axis, y0, y1, a0, a1) {
  let lo = Infinity, hi = -Infinity;
  for (let i = 0; i <= 8; i++) for (let j = 0; j <= 4; j++) {
    const y = y0 + (y1 - y0) * i / 8, a = a0 + (a1 - a0) * j / 4; // a: the other horizontal coordinate
    let r = -Infinity;
    for (const s of slabs) {
      if (y < s.y || y > s.y + s.h) continue;
      const [u, uw, o, ow] = axis === 0 ? [s.x, s.w, s.z, s.d] : [s.z, s.d, s.x, s.w];
      if (Math.abs(a - o) <= ow / 2) r = Math.max(r, u + uw / 2);
    }
    lo = Math.min(lo, r); hi = Math.max(hi, r);
  }
  return [lo, hi];
}

// a red spot in a gold ring on a face whose normal is ±x (axis 0) or ±z (axis 2): the ring spans a0..a1 out along the
// normal (in behind the surface, proud past it), centred at (u, y) on the face; the core stands proud of the ring
function spot(v, axis, s, a0, a1, u, y, r) {
  const c = s * (a0 + a1) / 2, cc = s * (a1 + 0.01);
  if (axis === 0) { cb(v, c, y, u, a1 - a0, 2 * r, 2 * r, D.spotRing); cb(v, cc, y, u, 0.04, r, r, D.spot); }
  else { cb(v, u, y, c, 2 * r, 2 * r, a1 - a0, D.spotRing); cb(v, u, y, cc, r, r, 0.04, D.spot); }
}
// the eye's layers on its white globe, outermost first, each a step prouder: [w, h, back z, front z, colour]
const EYE = [[0.24, 0.24, 0.445, 0.485, D.red], [0.18, 0.18, 0.47, 0.5, D.iris], [0.1, 0.1, 0.48, 0.515, D.irisCore], [0.04, 0.15, 0.49, 0.53, D.pupil]];
function head() {
  const g = new THREE.Group(), v = new Vox();
  // origin = the neck joint; +z = the snout. The stem fits inside the last neck segment's knuckle at any angle.
  cb(v, 0, 0.15, 0, 0.5, 0.5, 0.5, D.green); // stem
  cb(v, 0, -0.02, 0, 0.76, 0.1, 0.76, D.greenLight); // collar
  cb(v, 0, 0.5, 0, 1.0, 0.7, 0.95, D.green, 0.03); // skull
  cb(v, 0, 0.12, 0.25, 0.9, 0.32, 0.5, D.greenDark); // jowls: the jaw's hinge turns inside them
  cb(v, 0, 0.1, 0.5, 0.7, 0.24, 0.04, D.redDark); // back of the mouth
  cb(v, 0, 0.45, 0.85, 0.86, 0.4, 0.8, D.green, 0.03); // snout
  for (const s of [1, -1]) {
    cb(v, s * 0.22, 0.7, 1.08, 0.3, 0.2, 0.3, D.green); // nostril mound
    cb(v, s * 0.22, 0.72, 1.24, 0.14, 0.1, 0.03, D.redDark); // nostril
    cb(v, s * 0.26, 0.86, 0.32, 0.3, 0.3, 0.28, D.white); // bulging eye
    EYE.forEach(([w, h, z0, z1, c]) => cb(v, s * 0.26, 0.87, (z0 + z1) / 2, w, h, z1 - z0, c));
    cb(v, s * 0.26, 1.03, 0.3, 0.36, 0.1, 0.3, D.greenDark); // eyelid
    cb(v, s * 0.53, 0.55, -0.3, 0.12, 0.5, 0.3, D.greenDark); // ear fin, scalloped
    cb(v, s * 0.6, 0.85, -0.38, 0.1, 0.2, 0.12, D.greenDark);
    cb(v, s * 0.6, 0.45, -0.38, 0.1, 0.16, 0.12, D.greenDark);
    cb(v, s * 0.4, 0.09, 1.05, 0.08, 0.14, 0.1, D.white); // side teeth
  }
  cb(v, 0, 0.24, 0.895, 0.96, 0.2, 0.87, D.red); // upper lip
  cb(v, 0, 0.3, 1.3, 0.8, 0.2, 0.1, D.red); // its curl at the front
  [-0.3, -0.15, 0, 0.15, 0.3].forEach((x, i) => cb(v, x, i % 2 ? 0.07 : 0.09, 1.24, 0.1, i % 2 ? 0.18 : 0.14, 0.08, D.white)); // front teeth, two fangs
  for (let i = 0; i < 3; i++) cb(v, 0, 0.82 + (0.2 - 0.05 * i) / 2, -0.05 - 0.17 * i, 0.1, 0.2 - 0.05 * i, 0.12, D.greenDark); // crest
  cb(v, 0, 0.2, 1.42, 0.05, 0.05, 0.3, D.metal); // fire rod out of the upper lip
  cb(v, 0, 0.2, 1.6, 0.1, 0.1, 0.1, D.metal); // its nozzle
  g.add(v.mesh());
  const jaw = new THREE.Group();
  jaw.position.set(0, 0.14, 0.4); // the hinge, inside the jowls
  const j = new Vox();
  cb(j, 0, -0.08, 0.02, 0.7, 0.24, 0.3, D.greenDark); // hinge block
  cb(j, 0, -0.1, 0.5, 0.94, 0.2, 0.84, D.red); // lower lip
  cb(j, 0, -0.1, 0.93, 0.84, 0.28, 0.1, D.red); // rolled forward and up
  cb(j, 0, -0.27, 0.45, 0.8, 0.16, 0.8, D.green); // chin
  cb(j, 0, 0, 0.5, 0.74, 0.04, 0.74, D.redDark); // floor of the mouth
  for (const x of [-0.3, -0.15, 0.15, 0.3]) cb(j, x, 0.03, 0.86, 0.09, 0.1, 0.07, D.white); // lower teeth
  jaw.add(j.mesh());
  g.add(jaw);
  const flame = fireNode(0.55);
  flame.position.set(0, 0.2, 1.6);
  g.add(flame);
  return { g, jaw, flame };
}

// A fire point: a carretilla's kraft tube along +z out of its nozzle (the drac-fire.js jets and flamarada leave its mouth).
// About 3 cm across and 20 cm long at the Drac's scale, like the real ones; narrower than the nozzle at its root, which
// sits inside it, so it never floats. Vertex colours on the shared voxel material: stage.js gives it the Drac's own.
function fireNode(size) {
  const f = new THREE.Group(), w = 0.09, len = 0.9 * size, root = -0.03;
  const g = new THREE.BoxGeometry(w, w, len), c = new THREE.Color('#c49a6c'), col = new Float32Array(g.attributes.position.count * 3);
  for (let i = 0; i < col.length; i += 3) { col[i] = c.r; col[i + 1] = c.g; col[i + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const tube = new THREE.Mesh(g, MAT);
  tube.position.z = root + len / 2;
  f.add(tube);
  f.userData.size = size; // the fire's nominal size (model units): drac-fire.js scales its jets with it
  return f;
}

const NECK = { len: 0.62, w: [0.94, 0.88, 0.82] }; // short and thick, as on the real one: heads close over the chest
// where the necks, wings and tail meet the trunk (body frame, +x side), and the radius of the trunk's knuckle there
const NECK_AT = [0.52, 0.85, 0.42], WING_AT = [0.55, 0.45, -0.78], TAIL_AT = [0, -0.3, -1.05];
const SOCKET = { neck: 0.5, wing: 0.45 };
const WING_ROWS = [1.46, 1.62, 1.46, 1.44, 1.56, 1.38, 1.34, 1.4]; // how far out each 0.17 m row of a wing reaches: teeth at rows 1 and 4
const knuckle = w => w / 2 + 0.05; // radius of the ball at a segment's far end, around the next pivot
// the widest square stem (half side) whose base, `depth` behind the pivot, stays inside a knuckle of radius r at any angle
const stemHalf = (r, depth) => Math.sqrt(((r - 0.04) ** 2 - depth ** 2) / 2);
function neck(side) { // a chain of pivots: segs[i] hangs off segs[i-1]; the head is the last link
  const root = new THREE.Group();
  root.position.set(side * NECK_AT[0], NECK_AT[1], NECK_AT[2]);
  const segs = [], L = NECK.len;
  let parent = root;
  NECK.w.forEach((w, i) => {
    const s = new THREE.Group();
    s.position.y = i ? L : 0;
    const v = new Vox();
    const h = stemHalf(i ? knuckle(NECK.w[i - 1]) : SOCKET.neck, 0.1);
    cb(v, 0, 0.08, 0, 2 * h, 0.36, 2 * h, D.green); // stem, in the knuckle below
    cb(v, 0, (0.18 + L - 0.12) / 2, 0, w, L - 0.3, w, D.green, 0.03);
    cb(v, 0, 0.32, 0, w + 0.12, 0.1, w + 0.12, D.rib); // ribs
    cb(v, 0, 0.52, 0, w + 0.12, 0.1, w + 0.12, D.rib);
    cb(v, 0, 0.4, -(w / 2 + 0.05), 0.1, 0.4, 0.14, D.greenDark); // dorsal ridge
    spot(v, 0, side, w / 2 - 0.03, w / 2 + 0.09, 0, 0.42, 0.1);
    const r = knuckle(w);
    ball(v, 0, L, 0, r, r, r, D.rib, D.green, 8);
    s.add(v.mesh());
    parent.add(s); segs.push(s); parent = s;
  });
  const h = head();
  h.g.position.y = L;
  parent.add(h.g);
  return { root, segs, head: h.g, jaw: h.jaw, flame: h.flame };
}

function wing(side) {
  const root = new THREE.Group();
  root.position.set(side * WING_AT[0], WING_AT[1], WING_AT[2]);
  const v = new Vox();
  cb(v, 0, 0.13, 0, 0.36, 0.44, 0.3, D.greenDark); // shoulder, buried in the back
  // a bat wing: one broad fan from the shoulder, its leading edge rising to the tip, its far edge scalloped between
  // the ribs' tips. Both faces are painted alike (the municipal photos show the inner face the same as the outer).
  const N = 7, cw = 0.2, top = i => 0.35 + 0.17 * i, x = i => side * (0.1 + i * cw);
  for (let i = 0; i < N; i++) cb(v, x(i), top(i) - 0.02, 0, cw + 0.05, 0.22, i % 2 ? 0.12 : 0.15, D.wingRib); // leading edge
  WING_ROWS.forEach((out, j) => { // each row of membrane runs from under the leading edge out to the far edge
    const y = 0.17 * j, i0 = Math.max(0, Math.floor((y + 0.13 - top(0)) / 0.17) + 1), x0 = 0.1 + i0 * cw - cw / 2;
    cb(v, side * (x0 + out) / 2, y + 0.085, 0, out - x0, 0.17, 0.06, D.membrane);
  });
  [[1, 9], [4, 12]].forEach(([j, k], r) => { // rust ribs fanning from the shoulder to the teeth, in k steps, on both faces
    const x1 = WING_ROWS[j] - 0.06, y1 = 0.17 * j + 0.085, dx = (x1 - 0.12) / k, dy = (y1 - 0.12) / k;
    for (let s = 0; s <= k; s++) for (const z of [-0.03, 0.03]) cb(v, side * (0.12 + s * dx), 0.12 + s * dy, z, dx + 0.04, dy + 0.05, (s % 2 ? 0.05 : 0.056) - 0.012 * r, D.wingRib); // both faces; every overlapping step at its own depth: no shared face
  });
  for (const i of [3, 6]) { // fire rods on the fingers, a nozzle on the tip one
    cb(v, x(i), top(i) + 0.25, 0, 0.04, 0.4, 0.04, D.metal);
    if (i === 6) cb(v, x(i), top(i) + 0.47, 0, 0.1, 0.1, 0.1, D.metal);
  }
  const membrane = v.mesh();
  membrane.receiveShadow = false; // a thin sheet shading itself shimmers
  root.add(membrane);
  const flame = fireNode(0.35);
  flame.rotation.x = -Math.PI / 2; // straight up out of the nozzle
  flame.position.set(x(6), top(6) + 0.47, 0);
  root.add(flame);
  root.rotation.set(-0.4, side * 0.3, side * 0.6);
  return { root, flame };
}

const PLAQUE = [0.22, 0.4, 0.56, 0.68, 0.76, 0.8, 0.8, 0.72, 0.56]; // the chest plaque's row widths, top to bottom
const GRILLE = [0.08, 0.2, 0.32, 0.2, 0.08];
// the trousers' marks below the hem: [face (1 front, -1 back, 0 outer side), across, height, round motif?]
const LEG_MARKS = [[1, 0.1, 0.38, 0], [1, -0.08, 0.68, 1], [1, 0.1, 0.98, 0], [-1, -0.1, 0.45, 1], [-1, 0.1, 0.8, 0], [-1, -0.06, 1.1, 1], [0, 0.05, 0.55, 0], [0, -0.05, 0.9, 1]];
const TAIL = { len: [0.65, 0.52, 0.48], w: [0.62, 0.5, 0.4, 0.3] };
const TAIL_GAP = 0.14, TAIL_ROOT_GAP = 0.12, KNUCKLE_INSET = 0.03, KNUCKLE_HALF_DEPTH = 0.12, SPOT_MARGIN = 0.02;
const TRUNK_RIM = 0.34;
const tailKnuckle = (v, [x, y, z], w) => ball(v, x, y, z, w / 2 - KNUCKLE_INSET, w / 2 - KNUCKLE_INSET, KNUCKLE_HALF_DEPTH, D.green, D.rib, 6);
export function buildDrac() {
  const root = new THREE.Group();
  const body = new THREE.Group();
  body.position.y = BODY_Y;
  root.add(body);
  // ---- the trunk: a big ribbed ball, a wide rolled hem low down, and the shoulders the necks rise from
  const t = new Vox();
  const slabs = [
    ...ball(t, 0, 0, 0, 1.1, 0.95, 1.2, D.rib, D.green, 14),
    ...ball(t, 0, -0.55, 0, 1.32, 0.42, 1.4, D.green, D.rib, 6),
    ...ball(t, 0, 0.55, 0.2, 0.95, 0.5, 0.95, D.greenLight, D.green, 7),
  ];
  for (const s of [1, -1]) { // knuckles: the necks and wings turn inside them
    ball(t, s * NECK_AT[0], NECK_AT[1], NECK_AT[2], SOCKET.neck, SOCKET.neck, SOCKET.neck, D.rib, D.green, 8);
    ball(t, s * WING_AT[0], WING_AT[1], WING_AT[2], SOCKET.wing, SOCKET.wing, SOCKET.wing, D.green, D.rib, 6);
  }
  tailKnuckle(t, TAIL_AT, TAIL.w[0]);
  for (const s of [1, -1]) for (const zc of [0.3, -0.25]) for (let i = 0; i < 4; i++) {
    const yc = 0.45 - i * 0.36, [lo, hi] = reach(slabs, 0, yc - 0.13, yc + 0.13, zc - 0.13, zc + 0.13);
    spot(t, 0, s, lo - 0.03, hi + 0.03, zc, yc, 0.13); // in from the nearest rib, out past the farthest
  }
  { // the carved chest plaque: a brown flame (point up, round below) with a dark grille in a lozenge frame at the top
    let front = -Infinity;
    PLAQUE.forEach((w, i) => {
      const y1 = 0.56 - i * 0.12, [lo, hi] = reach(slabs, 2, y1 - 0.12, y1, -w / 2, w / 2), z1 = hi + 0.04;
      cb(t, 0, y1 - 0.06, (lo - 0.03 + z1) / 2, w, 0.12, z1 - lo + 0.03, D.brown);
      if (y1 > -0.13) front = Math.max(front, z1); // every row behind the lozenge
    });
    GRILLE.forEach((w, i) => { // frame rows a little taller than the grille's, so the frame shows between them as a mesh
      const y = 0.32 - i * 0.1;
      cb(t, 0, y, front - 0.02 + (i % 2 ? 0.003 : 0), w + 0.1, 0.11, 0.06, D.brownLight); // rows overlap, alternate depth
      cb(t, 0, y, front + 0.02 + (i % 2 ? 0.003 : 0), w, 0.09, 0.04, D.grille);
    });
  }
  body.add(t.mesh());
  // ---- necks (front, splayed), wings (back), tail
  const necks = [1, -1].map(side => { const n = neck(side); body.add(n.root); return n; });
  const wings = [1, -1].map(side => { const w = wing(side); body.add(w.root); return w; });
  const tail = [];
  {
    const base = new THREE.Group();
    base.position.set(...TAIL_AT);
    body.add(base);
    let parent = base;
    TAIL.w.forEach((w, i) => {
      const s = new THREE.Group(), L = TAIL.len[i], last = i === TAIL.w.length - 1;
      s.position.z = i ? -TAIL.len[i - 1] : 0;
      const v = new Vox();
      const front = -(i ? TAIL_GAP : TAIL_ROOT_GAP) / 2, back = last ? -0.5 : -(L - TAIL_GAP / 2);
      const mid = (front + back) / 2, halfLength = (front - back) / 2;
      const spotFront = i ? front : -TRUNK_RIM, spotMid = (spotFront + back) / 2, spotHalf = (spotFront - back) / 2;
      const stem = w / 2 - KNUCKLE_INSET;
      cb(v, 0, 0, front / 2 + 0.02, stem, stem, 0.04 - front, D.green); // stem, in the knuckle in front
      cb(v, 0, 0, mid, w, w, 2 * halfLength, i % 2 ? D.green : D.rib, 0.03);
      cb(v, 0, w / 2 + 0.03, mid, 0.08, 0.12, 0.26, D.greenDark); // spine
      for (const sd of [1, -1]) spot(v, 0, sd, w / 2 - 0.03, w / 2 + 0.03, spotMid, 0, Math.min(0.2 * w, spotHalf - SPOT_MARGIN));
      if (last) {
        [[0.42, 0.09, 0.14], [0.26, 0.1, 0.12], [0.12, 0.09, 0.1]].forEach(([aw, ah, ad], k) => cb(v, 0, 0, -0.55 - 0.1 * k, aw, ah, ad, D.red));
        cb(v, 0, 0, -0.84, 0.1, 0.1, 0.1, D.metal); // nozzle
      } else tailKnuckle(v, [0, 0, -L], TAIL.w[i + 1]);
      s.add(v.mesh());
      parent.add(s); tail.push(s); parent = s;
    });
    const flame = fireNode(0.45);
    flame.rotation.y = Math.PI; flame.position.set(0, 0, -0.84);
    parent.add(flame);
    tail.flame = flame;
    tail.base = base;
  }
  // ---- the carrier
  const legs = [];
  for (const x of [FOOT_X, -FOOT_X]) {
    const shoe = new THREE.Group(), pants = new THREE.Group();
    shoe.position.set(x, 0, FOOT_Z);
    pants.position.set(x, ANKLE, FOOT_Z);
    const s = new Vox();
    cb(s, 0, 0.07, 0.08, 0.42, 0.14, 0.7, D.shoe);
    cb(s, 0, 0.22, 0, 0.36, 0.24, 0.36, D.shoe); // upper, overlapping the sole (a shared face would blink)
    shoe.add(s.mesh());
    const v = new Vox();
    const top = 2.01, cuff = ANKLE - 0.04; // overlap the trunk through the stronger hops; the cuff stays at the ankle
    cb(v, 0, (top + cuff) / 2 - ANKLE, 0, 0.5, top - cuff, 0.52, D.pants, 0.05);
    for (const [face, u, y, eye] of LEG_MARKS) {
      const at = (out, a, h) => face ? [u, y - ANKLE, face * out, a, h, 0.04] : [Math.sign(x) * (out - 0.01), y - ANKLE, u, 0.04, h, a];
      cb(v, ...at(0.27, eye ? 0.15 : 0.2, eye ? 0.15 : 0.13), eye ? D.pantsEye : D.pantsPatch);
      if (eye) cb(v, ...at(0.29, 0.07, 0.07), D.pantsPatch);
    }
    pants.add(v.mesh());
    root.add(shoe, pants);
    legs.push({ shoe, pants });
  }
  // fire nodes in one list so the motion can flare them all
  const fire = [...necks.map(n => n.flame), tail.flame, ...wings.map(w => w.flame)];
  return { root, body, necks, wings, tail, legs, fire };
}
