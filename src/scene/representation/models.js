// Representation models for the Mulassa crowd: one person builder whose looks are independent dimensions
// (age, body, skin, hair, head covering, clothes, glasses, beard, mobility) plus FICTIONAL declared metadata
// (gender, age group) that never changes the geometry. Same voxel idiom, units and pivots as src/scene/models/people.js:
// metres, +z = where they face, feet (or wheels) on y = 0, torso/arms/legs pivot groups. scene/representation.js draws it over the crowd.
import * as THREE from 'three';
import { UPPER, CHAIR, CANE_LEN } from './rig.js';
import { restPose } from './pose.js';
import { SKIN, HAIR, BUILDS, AGES, INK, SHINE, SHOE, reseed, Vox } from './kit.js';
import { skirtPanels, chair, caneBone } from './props.js';


// ---------------------------------------------------------------- the head (origin = bottom centre of the skull box)
// Skull 0.34 × 0.34 × 0.32, face at z 0.16, as people.js. Every face shares one eye: dark with a light glint, so it
// reads on every skin tone (no per-tone or per-identity eye shapes).
function head(o) {
  const v = new Vox(), hair = o.hair.colour, capped = !!o.cover;
  v.box(0, 0, 0, 0.34, 0.34, 0.32, o.skin);
  for (const s of [1, -1]) v.box(s * 0.08, 0.17, 0.165, 0.05, 0.05, 0.01, INK, 0).box(s * 0.08 + s * 0.012, 0.198, 0.1705, 0.018, 0.018, 0.003, SHINE, 0);
  if (o.cover !== 'mocador') HAIRDO[o.hair.style](v, hair, capped, o);
  // under a cap or hat the hair reaches the brim: a bare band of nape between them read, from behind, as a face
  if (capped && o.cover !== 'mocador' && !['calb', 'rapat'].includes(o.hair.style)) v.box(0, 0.26, -0.17, 0.36, 0.04, 0.04, hair);
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
    nape(v, c, 0.05); // down to the neck: a short nape over a dark skin read as a face from behind
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
  barret(v, c) { v.box(0, 0.34, 0, 0.3, 0.1, 0.32, c).box(0, 0.3, 0.04, 0.43, 0.03, 0.52, c); }, // the brim all round, the back too
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
// Fills defaults: age and build give the scale and widths. Declared metadata is copied, never read for looks here (population.js picks the public's hair and clothes by it).
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
  reseed(hash(o.id ?? JSON.stringify(spec))); // the same colours every load
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

// ---------------------------------------------------------------- crowd glue
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
  { id: 'p04', meta: { gender: 'dona' }, age: 'adult', mobility: 'cadira', chairColour: '#b3122a', skin: S[4], hair: { style: 'trenes', colour: H[1] }, top: { kind: 'jersei', colour: '#29b6c6', trim: '#1f8f9c' }, bottom: { kind: 'pantalons', colour: '#2a2a2a' } },
  { id: 'p05', meta: { gender: 'home', vision: 'ceguesa' }, age: 'adult', mobility: 'basto', build: 'prim', skin: S[0], hair: { style: 'rapat', colour: H[1] }, top: { kind: 'camisa', colour: '#3a9d4b' }, bottom: { kind: 'pantalons', colour: '#4a6fa5' } },
  { id: 'p06', meta: { gender: 'no declarat' }, age: 'infant', skin: S[5], hair: { style: 'rinxols', colour: H[2] }, top: { kind: 'samarreta', colour: '#3a9d4b' }, bottom: { kind: 'curt', colour: '#33456e' } },
  { id: 'p07', meta: { gender: 'dona' }, age: 'adult', skin: S[4], hair: { style: 'llarg', colour: H[0] }, cover: 'mocador', coverColour: '#33456e', top: { kind: 'vestit', colour: '#33456e', sleeves: 'llargues', hem: 0.68 }, bottom: { kind: 'pantalons', colour: '#33456e' } },
  { id: 'p08', meta: { gender: 'no binaria' }, age: 'adult', build: 'ample', skin: S[3], hair: { style: 'llarg', colour: H[6] }, top: { kind: 'vestit', colour: '#d93a3a' }, bottom: { kind: 'faldilla', colour: '#d93a3a', legs: '#2a2a2a' } },
  { id: 'p09', meta: { gender: 'home' }, age: 'gran', mobility: 'cadira', chairColour: '#26262e', build: 'ample', skin: S[0], hair: { style: 'calb', colour: H[4] }, cover: 'gorra', coverColour: '#33456e', top: { kind: 'jersei', colour: '#a0522d', trim: '#7a3d20' }, bottom: { kind: 'pantalons', colour: '#5b3b2a' } },
  { id: 'p10', meta: { gender: 'home' }, age: 'infant', skin: S[6], hair: { style: 'cua', colour: H[1] }, cover: 'barret', coverColour: '#d9c27a', glasses: '#2f62d6', top: { kind: 'samarreta', colour: '#f07a1a' }, bottom: { kind: 'pantalons', colour: '#4a6fa5' } },
  { id: 'p11', meta: { gender: 'dona' }, age: 'adult', build: 'prim', height: 1.05, skin: S[2], hair: { style: 'rapat', colour: H[5] }, top: { kind: 'samarreta', colour: '#ff8fb1' }, bottom: { kind: 'curt', colour: '#2a2a2a' } },
  { id: 'p12', meta: { gender: 'dona', vision: 'baixa visio' }, age: 'infant', mobility: 'basto', skin: S[1], hair: { style: 'mitja', colour: H[3] }, top: { kind: 'jersei', colour: '#2f62d6', trim: '#f2c230' }, bottom: { kind: 'pantalons', colour: '#2a2a2a' } },
].map(c => ({ ...c, meta: { ...c.meta, age: c.age, mobility: c.mobility ?? null } }));
