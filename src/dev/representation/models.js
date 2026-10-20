// Representation prototype for the Mulassa crowd: one person builder whose looks are independent dimensions
// (age, body, skin, hair, head covering, clothes, glasses, beard, mobility) plus FICTIONAL declared metadata
// (gender, age group) that never changes the geometry. Same voxel idiom, units and pivots as src/scene/models/people.js:
// metres, +z = where they face, feet (or wheels) on y = 0, torso/arms/legs pivot groups. Not wired into the game.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { UPPER, PALM, CHAIR, CANE_LEN } from './rig.js';
import { restPose } from './pose.js';
import { correctSkinNormals } from './normals.js';

// ---------------------------------------------------------------- palettes
// The game's five tones first (people.js SKIN), then two deeper ones the plaça lacks. A list of colours, not an
// ordering or a mapping from any origin: every tone may take every other dimension.
export const SKIN = ['#f1c9a5', '#e0ac85', '#c68d63', '#8d5a3b', '#f6d7bd', '#6f4630', '#4f3020'];
// people.js HAIR + a silver/white. Grey or white is a colour any age may have.
export const HAIR = ['#2b1d14', '#15110f', '#6b4423', '#c9a45c', '#8c8c8c', '#a0522d', '#d9d6cf'];
export const HAIR_STYLES = ['curt', 'rapat', 'calb', 'mitja', 'llarg', 'cua', 'monyo', 'trenes', 'rinxols', 'afro'];
export const COVERS = [null, 'mocador', 'gorra', 'barret'];
export const TOPS = ['samarreta', 'camisa', 'jersei', 'jaqueta', 'vestit'];
export const BOTTOMS = ['pantalons', 'curt', 'faldilla'];
export const BUILDS = { prim: [0.88, 0.92], mitja: [1, 1], ample: [1.18, 1.26] }; // [width, depth] of the torso
export const AGES = { infant: { k: 0.7, head: 1.14, stoop: 0 }, jove: { k: 1, head: 1, stoop: 0 }, adult: { k: 1, head: 1, stoop: 0 }, gran: { k: 0.97, head: 1, stoop: 0 } };
export const MOBILITY = [null, 'cadira', 'basto'];
const INK = '#1a1412', SHINE = '#f4efe6', SHOE = '#141414';
export const EYE_COLOURS = [INK, SHINE]; // only the eyes use them (drac-soot.js turns them white on a charred face)
const COLOURS = { tyre: '#1e1e22', rim: '#b8bcc4', seat: '#2a2d33', grip: '#1c1c1c' };
const CANE = { white: '#f2f2ee', grip: '#1c1c1c', tip: '#3a3a3a' };

// ---------------------------------------------------------------- voxel kit (people.js's Vox, seeded, with a box log)
let seed = 1;
export const rand = () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
export const MAT = correctSkinNormals(new THREE.MeshLambertMaterial({ vertexColors: true }));
class Vox {
  constructor() { this.g = []; this.boxes = []; } // boxes: axis-aligned bounds, for the coplanar-face check
  box(x, y, z, w, h, d, color, jitter = 0.04) {
    const g = new THREE.BoxGeometry(w, h, d);
    g.translate(x, y + h / 2, z);
    this.boxes.push([x - w / 2, x + w / 2, y, y + h, z - d / 2, z + d / 2, color]);
    return this.add(g, color, jitter);
  }
  // a w×d bar from a to b ([x, y, z]), turned the shortest way from +y: tubes, the cane
  bar(a, b, w, color) {
    const dir = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]), len = dir.length();
    const g = new THREE.BoxGeometry(w, len, w).translate(0, len / 2, 0);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize())).translate(...a);
    return this.add(g, color, 0);
  }
  add(g, color, jitter) {
    const c = new THREE.Color(color).multiplyScalar(1 + (rand() * 2 - 1) * jitter);
    const a = new Float32Array(g.attributes.position.count * 3);
    for (let i = 0; i < a.length; i += 3) { a[i] = c.r; a[i + 1] = c.g; a[i + 2] = c.b; }
    g.setAttribute('color', new THREE.BufferAttribute(a, 3));
    this.g.push(g);
    return this;
  }
  // another Vox scaled by s about its origin and moved by (x, y, z): the head, built at its own origin
  take(o, s, x, y, z) {
    for (const g of o.g) this.g.push(g.scale(s, s, s).translate(x, y, z));
    for (const b of o.boxes) this.boxes.push([b[0] * s + x, b[1] * s + x, b[2] * s + y, b[3] * s + y, b[4] * s + z, b[5] * s + z, b[6]]);
    return this;
  }
  mesh() {
    const m = new THREE.Mesh(mergeGeometries(this.g), MAT);
    this.g.forEach(g => g.dispose());
    m.castShadow = m.receiveShadow = true;
    m.userData.boxes = this.boxes;
    return m;
  }
}

// ---------------------------------------------------------------- the head (origin = bottom centre of the skull box)
// Skull 0.34 × 0.34 × 0.32, face at z 0.16, as people.js. Every face shares one eye: dark with a light glint, so it
// reads on every skin tone (no per-tone or per-identity eye shapes).
function head(o) {
  const v = new Vox(), hair = o.hair.colour, capped = !!o.cover;
  v.box(0, 0, 0, 0.34, 0.34, 0.32, o.skin);
  for (const s of [1, -1]) v.box(s * 0.08, 0.17, 0.165, 0.05, 0.05, 0.01, INK, 0).box(s * 0.08 + s * 0.012, 0.198, 0.1705, 0.018, 0.018, 0.003, SHINE, 0);
  if (o.cover !== 'mocador') HAIRDO[o.hair.style](v, hair, capped, o);
  if (o.beard) {
    v.box(0, -0.01, 0.15, 0.3, 0.12, 0.04, hair).box(0, 0.11, 0.165, 0.14, 0.03, 0.02, hair);
    for (const s of [1, -1]) v.box(s * 0.155, 0.005, 0.09, 0.04, 0.165, 0.15, hair);
  }
  if (o.glasses) {
    v.box(0, 0.225, 0.175, 0.28, 0.015, 0.008, o.glasses, 0);
    for (const s of [1, -1]) {
      v.box(s * 0.08, 0.15, 0.175, 0.08, 0.012, 0.008, o.glasses, 0);
      v.box(s * 0.1275, 0.15, 0.175, 0.015, 0.075, 0.008, o.glasses, 0).box(s * 0.0325, 0.15, 0.175, 0.015, 0.075, 0.008, o.glasses, 0);
    }
  }
  COVER[o.cover]?.(v, o.coverColour);
  return v;
}
// Hair styles. `capped`: under a cap or a hat, only what shows below it (backs, sides, braids, tails).
const crown = (v, c, w = 0.36, top = 0.38, d = 0.34) => v.box(0, 0.26, -0.02, w, top - 0.26, d, c);
const nape = (v, c, y0 = 0.1, w = 0.36) => v.box(0, y0, -0.17, w, 0.26 - y0, 0.04, c);
// side locks from the nape's front (z -0.15) forward, so they never share a face with the nape or a long back
const sides = (v, c, y0, front = 0.1) => { for (const s of [1, -1]) v.box(s * 0.18, y0, (front - 0.15) / 2, 0.03, 0.26 - y0, front + 0.15, c); };
const HAIRDO = {
  curt(v, c, capped) { if (!capped) crown(v, c); nape(v, c); },
  rapat(v, c, capped) { if (!capped) v.box(0, 0.3, -0.01, 0.35, 0.06, 0.33, c); v.box(0, 0.14, -0.17, 0.35, 0.16, 0.025, c); },
  calb() {},
  mitja(v, c, capped) { if (!capped) crown(v, c); nape(v, c, 0.05); sides(v, c, 0.04); },
  llarg(v, c, capped, o) { // down past the shoulders, behind the torso whatever its depth
    if (!capped) crown(v, c);
    sides(v, c, -0.1, 0.06);
    const z = -Math.max(0.21, o.torsoD / 2 / o.headK + 0.065); // its back face; the front tucks under the skull
    v.box(0, -0.32, (z - 0.155) / 2, 0.36, 0.58, -0.155 - z, c);
  },
  cua(v, c, capped, o) {
    if (!capped) crown(v, c);
    nape(v, c, 0.12);
    const z = -Math.max(0.235, o.torsoD / 2 / o.headK + 0.05);
    v.box(0, 0.21, -0.215, 0.08, 0.06, 0.05, c).box(0, -0.06, z, 0.09, 0.28, 0.07, c);
  },
  monyo(v, c, capped) { if (!capped) { crown(v, c); v.box(0, 0.36, -0.11, 0.16, 0.14, 0.14, c); } nape(v, c); },
  trenes(v, c, capped, o) { // two braids down the back, in alternating widths so they read as plaits
    if (!capped) crown(v, c);
    nape(v, c, 0.12);
    const z = -Math.max(0.215, o.torsoD / 2 / o.headK + 0.04);
    for (const s of [1, -1]) for (let i = 0; i < 5; i++) {
      const w = i % 2 ? 0.05 : 0.065;
      v.box(s * 0.11, 0.12 - 0.09 * (i + 1), z, w, 0.09, w - 0.005, c);
    }
  },
  rinxols(v, c, capped) { // curls: a fuller crown and clumps, each a different size so no two faces line up
    if (!capped) {
      crown(v, c, 0.38, 0.4, 0.35);
      [[-0.12, 0.37, 0.06, 0.1], [0.11, 0.375, 0.02, 0.095], [0, 0.385, -0.08, 0.105], [-0.155, 0.27, -0.06, 0.085], [0.16, 0.265, -0.11, 0.09], [0.04, 0.36, 0.1, 0.075]]
        .forEach(([x, y, z, s]) => v.box(x, y, z, s, s, s, c));
    }
    nape(v, c, 0.06, 0.37);
  },
  afro(v, c, capped) { // coils: a rounded volume, stepped like the voxels
    v.box(0, 0.04, -0.1, 0.46, capped ? 0.27 : 0.22, 0.32, c);
    if (capped) return;
    v.box(0, 0.26, -0.05, 0.48, 0.24, 0.4, c).box(0, 0.5, -0.06, 0.38, 0.06, 0.31, c);
    [[-0.13, 0.45, 0.06], [0.12, 0.452, -0.12], [0.02, 0.462, -0.17]].forEach(([x, y, z], i) => v.box(x, y, z, 0.11 + 0.01 * i, 0.1 + 0.005 * i, 0.12 - 0.01 * i, c));
  },
};
// Head coverings: an independent choice, whatever the person's other looks. No meaning is attached to any of them.
const COVER = {
  mocador(v, c) { // a scarf round the head and under the chin, the face open
    v.box(0, -0.02, -0.0325, 0.4, 0.42, 0.365, c).box(0, 0.27, 0.165, 0.42, 0.14, 0.04, c);
    for (const s of [1, -1]) v.box(s * 0.185, -0.015, 0.165, 0.05, 0.285, 0.04, c);
    v.box(0, -0.14, -0.02, 0.36, 0.13, 0.4, c);
  },
  gorra(v, c) { v.box(0, 0.3, -0.01, 0.39, 0.12, 0.37, c).box(0, 0.31, 0.21, 0.3, 0.03, 0.09, c); },
  barret(v, c) { v.box(0, 0.34, 0, 0.3, 0.1, 0.32, c).box(0, 0.3, 0.08, 0.43, 0.03, 0.45, c); },
};

// ---------------------------------------------------------------- the body
const sleeveLen = { samarreta: 0.16, vestit: 0.16, camisa: 0.42, jersei: 0.42, jaqueta: 0.42 };
function torsoBox(v, o, y0, W, D) {
  const t = o.top;
  v.box(0, y0, 0, W, 0.6, D, t.colour);
  if (t.kind === 'jaqueta') v.box(0, y0 + 0.02, D / 2 + 0.004, 0.1, 0.56, 0.012, t.inner, 0); // the shirt between open fronts
  if (t.kind === 'jersei') v.box(0, y0 + 0.005, 0, W + 0.02, 0.06, D + 0.02, t.trim ?? t.colour, 0); // ribbed hem, its bottom clear of the torso's (and the chair's backrest)
}
// The arm: an upper arm pivoting at the shoulder and a forearm (with the hand) at the elbow, UPPER below it (rig.mjs).
function arm(o, s, x, y, aw) {
  const a = new THREE.Group(), f = new THREE.Group(), v = new Vox(), fv = new Vox(), L = o.top.sleeves === 'llargues' ? 0.42 : sleeveLen[o.top.kind], c = o.top.colour;
  a.position.set(s * x, y, 0);
  f.position.y = -UPPER;
  a.add(f);
  // the forearm reaches 2 cm into the upper arm, so a bent elbow shows no gap
  if (L < 0.42) {
    v.box(0, -L, 0, aw + 0.02, L, 0.16, c).box(0, -UPPER, 0, aw - 0.01, UPPER - L, 0.12, o.skin);
    fv.box(0, -0.28, 0, aw - 0.016, 0.3, 0.114, o.skin);
  } else {
    v.box(0, -UPPER, 0, aw, UPPER, 0.14, c);
    fv.box(0, -0.14, 0, aw - 0.006, 0.16, 0.134, c).box(0, -0.28, 0, aw - 0.01, 0.14, 0.12, o.skin);
  }
  return { a, v, f, fv };
}
// Fills defaults: age and build give the scale and widths. Declared metadata is copied, never read for looks.
export function normalise(spec) {
  const A = AGES[spec.age ?? 'adult'], [bw, bd] = BUILDS[spec.build ?? 'mitja'];
  return {
    hair: { style: 'curt', colour: HAIR[0] }, top: { kind: 'samarreta', colour: '#2f62d6' }, bottom: { kind: 'pantalons', colour: '#33456e' },
    skin: SKIN[0], height: 1, cover: null, mobility: null, ...spec,
    k: A.k * (spec.height ?? 1), headK: A.head, stoop: spec.restLean ?? A.stoop, bw, bd, torsoD: 0.26 * bd,
    age: spec.age ?? 'adult', meta: { ...spec.meta, age: spec.age ?? 'adult', mobility: spec.mobility ?? null },
  };
}

// The person. Returns the people.js contract (g, body, torso, arms, legs) plus:
// bones (every pivot group that carries a mesh, for skinCrowd), forearms (elbow pivots, children of arms), waist (the
// skirt's bone at the hip pivot, still, or null), skirt (its front and back panels, children of the waist, set by
// matrix, or null; pose.mjs shears them after the legs), base (the
// chair, static), wheels (roll about x), casters (the front caster wheels, roll about x), holdArm (the arm index holding
// the cane, or -1), cane (its bone, at that hand's PALM) and caneTip (cane-local), hop (what a beat hop lifts: g, or null
// for a chair or a cane user, who celebrate without leaving the seat or the ground), lean0 (rest lean), rad (footprint
// radius), hand (the hand box in the forearm's frame) and the fictional meta. Poses live in pose.mjs.
export function buildFigure(spec) {
  const o = normalise(spec), seated = o.mobility === 'cadira';
  seed = hash(o.id ?? JSON.stringify(spec)); // the same colours every load
  const W = 0.44 * o.bw, D = o.torsoD, g = new THREE.Group(), torso = new THREE.Group(), legs = [], wheels = [], casters = [];
  const skirtC = !seated && (o.bottom.kind === 'faldilla' || o.top.kind === 'vestit') ? (o.top.kind === 'vestit' ? o.top.colour : o.bottom.colour) : null;
  g.add(torso);
  let base = null, hip, back = 0;
  if (seated) ({ base, hip, back } = chair(o, W, D, g, wheels, casters));
  else {
    hip = 0.78;
    const lw = 0.16 * Math.min(o.bw, 1.12), lx = 0.1 * o.bw, legC = o.bottom.kind === 'pantalons' ? o.bottom.colour : o.bottom.legs ?? o.skin;
    for (const s of [1, -1]) {
      const l = new THREE.Group(), lv = new Vox();
      l.position.set(s * lx, hip, 0);
      lv.box(0, -hip, 0.02, lw - 0.01, 0.06, 0.24, SHOE, 0);
      if (o.bottom.kind === 'curt') lv.box(0, 0.06 - hip, 0, lw, 0.42, 0.2, legC).box(0, 0.48 - hip, 0, lw + 0.01, 0.3, 0.21, o.bottom.colour);
      else lv.box(0, 0.06 - hip, 0, lw, 0.72, 0.2, legC);
      l.add(lv.mesh());
      g.add(l);
      legs.push(l);
    }
  }
  torso.position.set(0, hip, back);
  const v = new Vox(), top = 0.6; // torso-local: the pivot at the hips
  torsoBox(v, o, 0, W, D);
  // the skirt hangs from the hips (its own bone at the hip pivot), not from the chest: a torso that bows or sways over
  // it (a cane user's celebration) leaves the waist and the hem on the legs
  const waist = skirtC ? new THREE.Group() : null, skirt = skirtC ? skirtPanels(waist, W, D, skirtC, 0.1 * o.bw + 0.08 * Math.min(o.bw, 1.12), o.top.hem ?? 0.38) : null; // legs' outer edge, as built above
  if (waist) { waist.position.set(0, hip, 0); g.add(waist); }
  v.take(head(o), o.headK, 0, top, 0);
  const body = v.mesh();
  torso.add(body);
  const aw = 0.13 * Math.sqrt(o.bw), arms = [1, -1].map(s => {
    const x = arm(o, s, W / 2 + 0.07, top - 0.02, aw);
    torso.add(x.a);
    return x;
  });
  // a chair user's arms hang a little out, past the armrest pads (outer edge 0.261 m, 0.33 m below the shoulder)
  const armOut = seated ? Math.max(0.16, Math.asin(Math.min(1, (0.272 - W / 2 - 0.07 + aw / 2) / 0.33))) : 0.05;
  const cane = o.mobility === 'basto' ? caneBone(arms[0].f) : null;
  for (const { a, v: av, f, fv } of arms) { a.add(av.mesh()); f.add(fv.mesh()); }
  g.scale.setScalar(o.k);
  const forearms = arms.map(x => x.f);
  const p = {
    g, body, torso, arms: arms.map(x => x.a), forearms, legs, waist, skirt, base, wheels, casters, holdArm: cane ? 0 : -1, cane, caneTip: cane ? new THREE.Vector3(0, -CANE_LEN, 0) : null,
    meta: { ...o.meta }, hop: seated || cane ? null : g, lean0: o.stoop, rad: seated ? 0.52 : cane ? 0.45 : o.age === 'infant' ? 0.26 : 0.36,
    rest: { hip, back }, chair: seated ? CHAIR : null, armOut, hand: { c: new THREE.Vector3(0, -0.21, 0), h: [(aw - 0.01) / 2, 0.07, 0.06] }, spec: o, // hand: the forearm's hand box (centre, half sizes)
  };
  p.bones = [torso, ...legs, ...(waist ? [waist, ...skirt] : []), ...p.arms, ...forearms, ...(cane ? [cane] : []), ...(base ? [base] : []), ...wheels, ...casters];
  restPose(p);
  return p;
}

// ---- the standing skirt (a skirt, or a dress's skirt), one garment pinned at the waist: the yoke and the hem as in
// the baseline, on the waist bone (at the hip pivot, the legs' pivot height), plus a front and a back panel over them,
// each a bone at the same pivot. At rest the panels sit 2 mm proud, so the look is the baseline's. In a stride pose.mjs shears each panel by
// the angle of the leg it covers (front: the leg ahead, back: the leg behind): the waist stays put, the hem stays level
// and the cloth slants with that leg, so the skirt flares as one piece instead of splitting or turning blocks.
function skirtPanels(waist, W, D, c, legX, hem) {
  // Scale the garment's drop in its geometry so the existing waist-pinned shear still follows each stride.
  const drop = hem / 0.38;
  const garmentMesh = vox => {
    const mesh = vox.mesh();
    mesh.geometry.scale(1, drop, 1);
    for (const box of mesh.userData.boxes) { box[2] *= drop; box[3] *= drop; }
    return mesh;
  };
  const v = new Vox();
  v.box(0, -0.18, 0, W + 0.04, 0.22, D + 0.06, c, 0).box(0, -0.38, 0, W + 0.1, 0.2, D + 0.1, c, 0); // yoke, hem
  // the hem's middle, over the legs' width, 6 mm lower: a leg's corner just inside the hem passes under the middle at
  // the bottom of its arc (it swings about the hip, 0.383 m away); at rest the legs hide it
  v.box(0, -0.386, 0, 2 * legX + 0.004, 0.08, 0.12, c, 0);
  waist.add(garmentMesh(v));
  const yz = (D + 0.06) / 2 + 0.002, hz = (D + 0.1) / 2 + 0.002; // the panels' faces
  return [1, -1].map(s => {
    const b = new THREE.Group(), pv = new Vox();
    b.matrixAutoUpdate = false; // a shear, which no position/rotation/scale can express
    // the yoke's and the hem's front (back) half, a few mm short of the middle, the yoke's bottom and the hem's (no
    // shared faces; the hem's own edge is the skirt's lowest)
    pv.box(0, -0.182, s * (yz + 0.006) / 2, W + 0.044, 0.22, yz - 0.006, c, 0).box(0, -0.377, s * (hz + 0.004) / 2, W + 0.104, 0.199, hz - 0.004, c, 0);
    b.add(garmentMesh(pv));
    waist.add(b);
    return b;
  });
}

// ---- the manual wheelchair: seat 0.48 m, 0.62 m rear wheels with push rims, front casters, footplate, armrests, push
// handles. Its frame is its own bone (base) so a lean or a nod never tilts it; each rear wheel and each caster wheel is a
// bone that rolls. The dimensions the poses read are in rig.mjs (CHAIR).
function chair(o, W, D, g, wheels, casters) {
  const v = new Vox(), F = o.chairColour ?? '#2f62d6', SEAT = 0.48, { R, caster: K } = CHAIR;
  const base = new THREE.Group();
  g.add(base);
  v.box(0, 0.42, 0, 0.44, 0.06, 0.44, COLOURS.seat);
  v.box(0, SEAT, -0.24, 0.42, 0.36, 0.04, COLOURS.seat);
  for (const s of [1, -1]) {
    const x = s * 0.225, cx = s * K.x;
    v.box(x, 0.3, -0.25, 0.03, 0.62, 0.03, F, 0).box(x, 0.885, -0.31, 0.034, 0.03, 0.1, COLOURS.grip, 0); // back post, push handle
    v.box(x, 0.385, 0, 0.032, 0.03, 0.47, F, 0); // seat rail
    v.box(x, 0.22, K.swivelZ, 0.028, 0.18, 0.028, F, 0); // front post, down to the caster's swivel
    v.bar([x, 0.4, 0.2], [s * 0.17, 0.11, 0.33], 0.026, F); // footrest hanger
    v.box(s * 0.235, 0.48, 0.1, 0.024, 0.22, 0.024, F, 0).box(s * 0.236, 0.7, -0.05, 0.05, 0.03, 0.3, COLOURS.seat, 0); // armrest
    v.box(s * 0.2365, 0.48, -0.08, 0.012, 0.2, 0.26, F, 0); // side guard over the wheel
    // the caster's swivel stem and fork: the axle trails 5 cm behind the stem, as a caster settles rolling forward, and
    // the two prongs stand clear of the wheel's sides
    v.box(cx, 0.195, K.swivelZ, 0.022, 0.04, 0.022, F, 0).box(cx, 0.175, (K.z + K.swivelZ) / 2, 0.068, 0.02, 0.07, F, 0);
    for (const d of [1, -1]) v.box(cx + d * 0.026, K.y - 0.01, K.z, 0.012, 0.185 - K.y, 0.024, F, 0);
    const c = new THREE.Group(), cv = new Vox();
    c.position.set(cx, K.y, K.z);
    cv.add(new THREE.CylinderGeometry(K.r, K.r, K.w, 10).rotateZ(Math.PI / 2), COLOURS.tyre, 0);
    cv.add(new THREE.CylinderGeometry(0.02, 0.02, K.w + 0.006, 6).rotateZ(Math.PI / 2), COLOURS.rim, 0);
    cv.box(0, 0.015, 0, K.w + 0.004, 0.045, 0.014, COLOURS.rim, 0); // a spoke mark: shows the caster turning
    c.add(cv.mesh());
    base.add(c);
    casters.push(c);
    // ...and the rear wheel, its own bone at the axle
    const w = new THREE.Group(), wv = new Vox();
    w.position.set(s * CHAIR.wheelX, R, CHAIR.axleZ);
    wv.add(new THREE.TorusGeometry(CHAIR.tyreR, CHAIR.tyreTube, 4, 20).rotateY(Math.PI / 2), COLOURS.tyre, 0);
    wv.add(new THREE.TorusGeometry(CHAIR.rimR, CHAIR.rimTube, 3, 20).rotateY(Math.PI / 2).translate(s * CHAIR.rimOut, 0, 0), COLOURS.rim, 0);
    for (let i = 0; i < 3; i++) wv.add(new THREE.BoxGeometry(0.008, 2 * (R - 0.04), 0.012).rotateX(i * Math.PI / 3), COLOURS.rim, 0);
    for (let i = 0; i < 4; i++) wv.add(new THREE.BoxGeometry(CHAIR.rimOut, 0.01, 0.01).translate(s * CHAIR.rimOut / 2, CHAIR.rimR, 0).rotateX(i * Math.PI / 2 + 0.4), COLOURS.rim, 0); // rim standoffs
    wv.add(new THREE.CylinderGeometry(0.03, 0.03, 0.05, 8).rotateZ(Math.PI / 2), COLOURS.grip, 0);
    w.add(wv.mesh());
    g.add(w);
    wheels.push(w);
  }
  v.box(0, 0.08, 0.34, 0.36, 0.02, 0.14, F, 0); // footplate
  // the seated legs ride the frame (they don't swing): thighs on the cushion, shins down to the footplate
  const lx = 0.1 * o.bw, lw = 0.16 * Math.min(o.bw, 1.12), short = o.bottom.kind !== 'pantalons';
  const thigh = o.bottom.kind === 'pantalons' || o.bottom.kind === 'curt' ? o.bottom.colour : o.top.kind === 'vestit' ? o.top.colour : o.bottom.colour;
  const shin = short ? o.bottom.legs ?? o.skin : o.bottom.colour;
  for (const s of [1, -1]) {
    v.box(s * lx, 0.475, 0.08, lw, 0.15, 0.44, thigh);
    v.box(s * lx, 0.13, 0.27, lw - 0.01, 0.37, 0.15, shin).box(s * lx, 0.1, 0.345, lw, 0.06, 0.21, SHOE, 0);
  }
  if (o.bottom.kind === 'faldilla' || o.top.kind === 'vestit') v.box(0, 0.47, 0.08, W + 0.06, 0.2, 0.48, thigh).box(0, 0.34, 0.3, W + 0.05, 0.14, 0.05, thigh); // lap and hem over the knees
  base.add(v.mesh());
  return { base, hip: SEAT + 0.005, back: -0.22 + D / 2 + 0.005 }; // the torso's box just above the cushion and the thighs
}

// ---- the long white cane: its own bone at the holding hand's PALM (a wrist), so pose.mjs can aim it at a ground point
// while the hand stays round its grip. Built along -y: the grip above and through the fist, the shaft, the dark tip.
function caneBone(forearm) {
  const c = new THREE.Group(), v = new Vox();
  c.position.copy(PALM);
  forearm.add(c);
  v.box(0, -0.1, 0, 0.03, 0.2, 0.03, COLOURS.grip, 0).box(0, 0.04 - CANE_LEN, 0, 0.022, CANE_LEN - 0.14, 0.022, CANE.white, 0).box(0, -CANE_LEN, 0, 0.026, 0.04, 0.026, CANE.tip, 0);
  c.add(v.mesh());
  return c;
}

// ---------------------------------------------------------------- crowd glue
// people.js skinCrowd with one change: it bakes p.bones when a figure has them (the chair and its wheels are bones),
// else [torso, ...legs, ...arms] as today. Everything else is the game's code.
export function skinCrowd(people) {
  const parts = [], bones = [];
  for (const p of people) {
    p.scale = p.g.scale.x;
    for (const bone of p.bones ?? [p.torso, ...p.legs, ...p.arms]) {
      const k = bones.push(bone) - 1;
      for (const mesh of bone.children.filter(o => o.isMesh)) {
        mesh.updateMatrix();
        const geo = mesh.geometry.applyMatrix4(mesh.matrix), n = geo.attributes.position.count;
        const idx = new Uint16Array(n * 4), wt = new Float32Array(n * 4);
        for (let i = 0; i < n; i++) { idx[i * 4] = k; wt[i * 4] = 1; }
        geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(idx, 4));
        geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(wt, 4));
        parts.push(geo);
        bone.remove(mesh);
      }
    }
  }
  const mesh = new THREE.SkinnedMesh(mergeGeometries(parts), MAT);
  parts.forEach(geo => geo.dispose());
  mesh.bind(new THREE.Skeleton(bones, bones.map(() => new THREE.Matrix4())), new THREE.Matrix4());
  mesh.frustumCulled = false;
  return mesh;
}
// Frees the figure's geometries (the material is shared and stays). Returns how many it disposed.
export function disposeFigure(p) {
  let n = 0;
  p.g.traverse(o => { if (o.isMesh) { o.geometry.dispose(); n++; } });
  p.g.removeFromParent();
  return n;
}
function hash(s) { let h = 2166136261; for (const ch of String(s)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return h | 0; }

// ---------------------------------------------------------------- the catalogue
// Twelve FICTIONAL people. `meta` is declared for the catalogue (never inferred from the look, never shown as a label
// in the game). Each look is a free choice per dimension; validate.mjs checks no look belongs to one declared group.
// gender: 'dona' | 'home' | 'no binaria' | 'no declarat'; age as AGES.
const S = SKIN, H = HAIR;
export const CATALOGUE = [
  { id: 'p01', meta: { gender: 'dona' }, age: 'adult', skin: S[3], hair: { style: 'afro', colour: H[1] }, top: { kind: 'samarreta', colour: '#f2c230' }, bottom: { kind: 'pantalons', colour: '#2a2a2a' } },
  { id: 'p02', meta: { gender: 'dona' }, age: 'gran', build: 'ample', height: 0.97, skin: S[0], hair: { style: 'curt', colour: H[2] }, glasses: '#3a2a20', top: { kind: 'jaqueta', colour: '#8e44ad', inner: '#eeeeee' }, bottom: { kind: 'faldilla', colour: '#33456e', legs: '#5b4a42' } },
  { id: 'p03', meta: { gender: 'home' }, age: 'adult', height: 1.04, skin: S[2], hair: { style: 'monyo', colour: H[0] }, beard: true, top: { kind: 'jaqueta', colour: '#33456e', inner: '#eeeeee' }, bottom: { kind: 'pantalons', colour: '#c8b28a' } },
  { id: 'p04', meta: { gender: 'dona' }, age: 'adult', mobility: 'cadira', chairColour: '#b3122a', skin: S[6], hair: { style: 'trenes', colour: H[1] }, top: { kind: 'jersei', colour: '#29b6c6', trim: '#1f8f9c' }, bottom: { kind: 'pantalons', colour: '#2a2a2a' } },
  { id: 'p05', meta: { gender: 'home', vision: 'ceguesa' }, age: 'adult', mobility: 'basto', build: 'prim', skin: S[0], hair: { style: 'rapat', colour: H[1] }, top: { kind: 'camisa', colour: '#3a9d4b' }, bottom: { kind: 'pantalons', colour: '#4a6fa5' } },
  { id: 'p06', meta: { gender: 'no declarat' }, age: 'infant', skin: S[5], hair: { style: 'rinxols', colour: H[2] }, top: { kind: 'samarreta', colour: '#3a9d4b' }, bottom: { kind: 'curt', colour: '#33456e' } },
  { id: 'p07', meta: { gender: 'dona' }, age: 'adult', skin: S[4], hair: { style: 'llarg', colour: H[0] }, cover: 'mocador', coverColour: '#33456e', top: { kind: 'vestit', colour: '#33456e', sleeves: 'llargues', hem: 0.68 }, bottom: { kind: 'pantalons', colour: '#33456e' } },
  { id: 'p08', meta: { gender: 'no binaria' }, age: 'adult', build: 'ample', skin: S[3], hair: { style: 'llarg', colour: H[6] }, top: { kind: 'vestit', colour: '#d93a3a' }, bottom: { kind: 'faldilla', colour: '#d93a3a', legs: '#2a2a2a' } },
  { id: 'p09', meta: { gender: 'home' }, age: 'gran', mobility: 'cadira', chairColour: '#26262e', build: 'ample', skin: S[5], hair: { style: 'calb', colour: H[4] }, cover: 'gorra', coverColour: '#33456e', top: { kind: 'jersei', colour: '#a0522d', trim: '#7a3d20' }, bottom: { kind: 'pantalons', colour: '#5b3b2a' } },
  { id: 'p10', meta: { gender: 'home' }, age: 'infant', skin: S[6], hair: { style: 'cua', colour: H[1] }, cover: 'barret', coverColour: '#d9c27a', glasses: '#2f62d6', top: { kind: 'samarreta', colour: '#f07a1a' }, bottom: { kind: 'pantalons', colour: '#4a6fa5' } },
  { id: 'p11', meta: { gender: 'dona' }, age: 'adult', build: 'prim', height: 1.05, skin: S[2], hair: { style: 'rapat', colour: H[5] }, top: { kind: 'samarreta', colour: '#ff8fb1' }, bottom: { kind: 'curt', colour: '#2a2a2a' } },
  { id: 'p12', meta: { gender: 'dona', vision: 'baixa visio' }, age: 'infant', mobility: 'basto', skin: S[1], hair: { style: 'mitja', colour: H[3] }, top: { kind: 'jersei', colour: '#2f62d6', trim: '#f2c230' }, bottom: { kind: 'pantalons', colour: '#2a2a2a' } },
].map(c => ({ ...c, meta: { ...c.meta, age: c.age, mobility: c.mobility ?? null } }));
