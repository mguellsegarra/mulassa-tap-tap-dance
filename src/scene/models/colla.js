// The Drac's colla (observed in pm-lEViiPK0, notes in the integration artefacts): the four helpers who clap round the
// dance to orient its carrier, and a few members sitting on the paving at the front of the public. Their suit is a loose
// cream jacket and trousers dyed with green blotches, olive "eye" rings down some trousers (the carrier's own motif), a red or yellow mocador at the throat, a red headband on some, a cream
// oval with the Drac's head on the back, cream espardenyes with dark laces. Everyone here wears that one suit, never a striped or
// other variant (Marc: a clapper in a green hoodie, and later a striped jacket, read as outsiders); only the mocador,
// headband, cap, eyes, emblem, face and height vary. The Drac's carrier (models/drac.js) wears the same palette. Metres, +z = where they face, built in the people's proportions.
// Each person is a set of pivot groups (body, head, arms...) whose meshes skinCrowd bakes into one skinned mesh.
// The same bodies dress the Mulassa's group (MULA_SUIT, research/bestiari/mulassa/helpers-design.md): a look's suit fields
// (legs, dye, sole, lace, upper, sash, shade, scarf, rolled) default to the Drac's suit.
import * as THREE from 'three';
import { Vox } from './voxel.js';
import { SKIN, HAIR } from './people.js';
import { C } from './mulassa.js';

export const COLLA = {
  cream: '#ece4c8', blotch: '#5f9a4e', blotchDark: '#2f6b3a', ring: '#6b5a24', ringCore: '#b9c46a',
  red: '#c62a22', yellow: '#e6b32e', sole: '#e9dfc4', lace: '#2a2522', cap: '#3f7a45',
};
// small seeded random (the same colla every load, and no draw on Math.random beyond Vox's colour jitter)
const seeded = s => () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
// a box by its centre
const cbox = (v, x, y, z, w, h, d, c, j = 0.02) => v.box(x, y - h / 2, z, w, h, d, c, j);
// a limb from a to b ([x, y, z]), w across x and d across z before it is turned (shortest turn from +y): the suit's
// cream box and its dye blotches, built upright and turned together (so the blotches stay on its faces)
const Y_UP = new THREE.Vector3(0, 1, 0), Z_IN = new THREE.Vector3();
function limb(v, a, b, w, d, c, rnd, dye = true) {
  const dir = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]), len = dir.length();
  // lying limbs keep their section upright (the shortest turn tilts it, and its corner dips under the floor)
  const x = new THREE.Vector3().crossVectors(Y_UP, dir.normalize()), lying = Math.abs(dir.y) < 0.7;
  const q = lying ? new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x.normalize(), dir, new THREE.Vector3().crossVectors(x, dir)))
    : new THREE.Quaternion().setFromUnitVectors(Y_UP, dir);
  const t = new Vox().box(0, 0, 0, w, len, d, c, 0.02);
  // a lying limb's underside is on (or near) the paving: its blotches go on the sides and the top only
  const faces = lying ? (Z_IN.set(0, 0, 1).applyQuaternion(q).y > 0 ? 'fs' : 'bs') : 'fbs';
  if (dye) blotch(t, rnd, [0, 0, 0, w, len, d], Math.max(2, Math.round(60 * len * Math.max(w, d))), faces);
  for (const g of t.g) v.g.push(g.applyQuaternion(q).translate(...a));
  return v;
}
// dye blotches on the faces of a box (centre x, bottom y, centre z, w, h, d): flat plates a few mm proud, each a little
// prouder than the last so two never share a plane
function blotch(v, rnd, [x, y, z, w, h, d], n, faces = 'fbs') {
  for (let i = 0; i < n; i++) {
    const f = faces[i % faces.length], s = rnd() < 0.5 ? 1 : -1, off = 0.004 + 0.0015 * (i % 6), sz = 0.05 + rnd() * 0.06;
    const c = rnd() < 0.6 ? COLLA.blotch : COLLA.blotchDark, py = y + rnd() * (h - sz);
    if (f === 's') v.plate(x + s * (w / 2 + off), py, z + (rnd() - 0.5) * (d - sz), sz, sz, s, 0, c);
    else { const k = f === 'f' ? 1 : -1; v.plate(x + (rnd() - 0.5) * (w - sz), py, z + k * (d / 2 + off), sz, sz * (0.7 + rnd() * 0.6), 0, k, c); }
  }
}
// an olive ring with a lighter core ("eye") on a face looking along +z (k = 1) or -z
const eye = (v, x, y, z, k, r = 0.11) => v.plate(x, y, z + k * 0.009, r, r, 0, k, COLLA.ring).plate(x, y + r * 0.25, z + k * 0.013, r / 2, r / 2, 0, k, COLLA.ringCore);
// a sleeve along -y from the pivot, length L, with blotches
function sleeve(v, rnd, L, w, look) {
  cbox(v, 0, -L / 2, 0, w, L, w + 0.01, look.top); if (look.dye !== false) blotch(v, rnd, [0, -L, 0, w, L, w + 0.01], 4);
}
// the head on its neck pivot (people.js's head: skin, hair, eyes), plus a headband or a cap; the Bou's colla: a hood
// up, sunglasses, a black fire hat
function collaHead(look, rnd, top) {
  const v = new Vox(), dyed = HAIR[(rnd() * 4) | 0], hair = look.hair ?? dyed;
  cbox(v, 0, 0.17, 0, 0.34, 0.34, 0.32, look.skin);
  v.box(0, 0.26, -0.02, 0.36, 0.12, 0.34, hair).box(0, 0.1, -0.17, 0.36, 0.16, 0.04, hair);
  v.box(0.08, 0.17, 0.165, 0.05, 0.05, 0.01, C.black, 0).box(-0.08, 0.17, 0.165, 0.05, 0.05, 0.01, C.black, 0);
  if (look.band) v.box(0, 0.225, 0, 0.35, 0.05, 0.335, COLLA.red); // above the eyes (0.22), into the hair
  if (look.cap) v.box(0, 0.3, -0.01, 0.38, 0.12, 0.37, COLLA.cap).box(0, 0.31, 0.2, 0.3, 0.03, 0.08, COLLA.cap);
  if (look.shades) { // against the sparks: two dark lenses over the eyes (0.17-0.22) with a glint, the brow bar, the bridge, the arms to the ears
    for (const x of [0.075, -0.075]) v.box(x, 0.155, 0.172, 0.1, 0.07, 0.012, BOU.lens, 0).plate(x + 0.025, 0.2, 0.1795, 0.03, 0.014, 0, 1, BOU.glint);
    v.box(0, 0.222, 0.172, 0.27, 0.018, 0.016, BOU.black, 0).box(0, 0.19, 0.174, 0.05, 0.016, 0.012, BOU.black, 0);
    for (const x of [0.177, -0.177]) v.box(x, 0.205, 0.06, 0.012, 0.016, 0.22, BOU.black, 0);
  }
  if (look.moustache) v.box(0, 0.07, 0.165, 0.16, 0.04, 0.012, hair, 0);
  if (look.hood === 'up') { // crown, sides and back over the hair (clear of its faces), the face left open
    v.box(0, 0.39, -0.03, 0.44, 0.05, 0.4, look.top).box(0, -0.02, -0.215, 0.37, 0.41, 0.03, look.top);
    for (const s of [1, -1]) v.box(s * 0.205, -0.02, -0.03, 0.04, 0.41, 0.4, look.top);
  }
  if (look.hat) { // a soft black hat with a flap down the neck and the colla's pale badge
    v.box(0, 0.35, -0.01, 0.46, 0.025, 0.45, BOU.black).box(0, 0.375, -0.01, 0.38, 0.12, 0.37, BOU.black).box(0, 0.495, -0.01, 0.3, 0.035, 0.29, BOU.black).box(0, 0.12, -0.215, 0.4, 0.23, 0.03, BOU.black);
    v.plate(0, 0.4, 0.1795, 0.09, 0.07, 0, 1, BOU.pale);
  }
  const m = v.mesh(), g = new THREE.Group();
  g.position.y = top;
  g.add(m);
  return g;
}
// mocador: a triangle of cloth on the chest under the knot (front face at z), its collar round the neck
function mocador(v, z, y, c) {
  cbox(v, 0, y - 0.035, 0, 0.3, 0.06, 0.3, c);
  [0.24, 0.16, 0.08].forEach((w, i) => v.plate(0, y - 0.11 - 0.05 * i, z + 0.008, w, 0.05, 0, 1, c));
}
// the back: the colla's cream oval with the Drac's head in dark marks (eyes, jaw)
function back(v, z, y, look) {
  if (!look.emblem) return;
  v.plate(0, y - 0.42, z - 0.008, 0.24, 0.28, 0, -1, COLLA.cream).plate(0, y - 0.38, z - 0.0095, 0.28, 0.2, 0, -1, COLLA.cream);
  for (const s of [1, -1]) v.plate(s * 0.05, y - 0.25, z - 0.012, 0.04, 0.04, 0, -1, C.black);
  v.plate(0, y - 0.36, z - 0.012, 0.14, 0.03, 0, -1, C.black).plate(0, y - 0.33, z - 0.0135, 0.1, 0.02, 0, -1, COLLA.cream); // jaw and teeth
}
// What each person wears on top of the suit. Helpers W, N, S, E in drac-layout's order.
export const HELPER_LOOKS = [
  { top: COLLA.cream, eyes: true, mocador: COLLA.red, band: true, emblem: true },
  { top: COLLA.cream, mocador: COLLA.yellow },
  { top: COLLA.cream, eyes: true, mocador: COLLA.yellow, band: true, emblem: true },
  { top: COLLA.cream, eyes: true, mocador: COLLA.red, emblem: true },
];
// The Mulassa's group (2017/2021/2023 recordings): pale blue / blue-grey collared shirts with the sleeves rolled, very dark
// trousers, a broad sash (usually dark; a dark green and a yellow one with red stripes were seen), low espadrille-like
// shoes on light rope soles, now and then a pale neck cloth. Colours are artistic approximations; no insignia (too small
// in the sources to redraw), no hats; hair and face vary.
export const MULA_SUIT = { legs: '#242936', dye: false, sole: '#bcaa86', upper: '#2a2a2f', lace: null, shade: '#8198aa', rolled: true };
export const MULA_HELPER_LOOKS = [
  { ...MULA_SUIT, top: '#a8b9c8', sash: '#171e23' },
  { ...MULA_SUIT, top: '#9fb2c2', sash: '#171e23', scarf: '#dec887' },
  { ...MULA_SUIT, top: '#a8b9c8', sash: '#24382b' },
  { ...MULA_SUIT, top: '#b1c1cd', sash: '#171e23', rolled: false },
];
export const MULA_SEATED_LOOKS = [
  { ...MULA_SUIT, top: '#a8b9c8', sash: '#171e23' },
  { ...MULA_SUIT, top: '#9fb2c2', sash: '#171e23', scarf: '#dec887' },
  { ...MULA_SUIT, top: '#b1c1cd', sash: '#d4a32c', stripes: '#b8452f' },
  { ...MULA_SUIT, top: '#a8b9c8', sash: '#24382b' },
  { ...MULA_SUIT, top: '#9fb2c2', sash: '#171e23', rolled: false },
];
// The Bou Tradicional's colla (Ardit's recordings 2021-2026, the 2026 Santa Úrsula cercavila closest; UAF photos): correfoc
// wear, the Bou being a fire beast. A garnet hooded jacket worn long as a tunic, buttoned, with «BOU TRADICIONAL DE VALLS»
// down the front and a cartoon bull's face on the back; hoods up on some (at the correfoc), sunglasses against the
// sparks on others; black trousers with a pale mark on the thigh, dark shoes. W, N, S, E, then the capatàs (Marc), a fifth
// standing near the dance, not on a mark (scene/bou-colla.js BOU_CAPATAS): an older
// man, short and stout, grey hair, a black fire hat with the badge and the long wooden staff with the fire pot.
// Colours are approximations under the game's light.
export const BOU = { lens: '#1f2638', glint: '#8f9cbf', black: '#121114', pale: '#ece2cf', white: '#f6f2ea', wood: '#7a5230', pot: '#3c3b40', potRim: '#5b5a60' };
export const BOU_SUIT = { legs: '#17161a', dye: false, sole: '#3a3434', upper: '#121114', lace: null, shade: '#55142e', tunic: true, rolled: false };
export const BOU_HELPER_LOOKS = [
  { ...BOU_SUIT, top: '#80203f', hood: 'up', shades: true },
  { ...BOU_SUIT, top: '#8c2347' },
  { ...BOU_SUIT, top: '#93284d', shades: true },
  { ...BOU_SUIT, top: '#7a1d3b', hood: 'up' },
  { ...BOU_SUIT, top: '#8c2347', build: [1.2, 0.84], belly: true, hair: '#c9c4bd', moustache: true, skin: SKIN[1], hat: true, staff: true }, // the capatàs
];
export const SEATED_LOOKS = [
  { top: COLLA.cream, cap: true },
  { top: COLLA.cream, eyes: true, mocador: COLLA.red, band: true },
  { top: COLLA.cream, mocador: COLLA.yellow },
  { top: COLLA.cream, mocador: COLLA.red },
  { top: COLLA.cream, eyes: true, band: true },
];

// ---- the standing helper. ARM: the clap chain. The shoulder (Euler YXZ) raises the arm forward and opens the elbow
// out to the side; the elbow (Euler YXZ) bends the forearm up and twists it about the upper arm, which swings the hands
// in and out: the elbows stay put, so the upper arms never sweep across the chest. Contact: the hands' inner faces meet
// on the body's midline (x = 0), upright, palm to palm.
export const ARM = { x: 0.3, y: 1.32, upper: 0.28, fore: 0.34, w: 0.12, hand: [0.05, 0.16, 0.09] };
// [roll out, pitch forward, elbow bend]: hanging (energy 0) and the clap's raise (energy 1)
export const ARM_REST = [0.08, -0.05, -0.2], ARM_CLAP = [0.05, -0.85, -1.25];
const shoulderQ = (s, [roll, pitch]) => new THREE.Quaternion().setFromEuler(new THREE.Euler(pitch, 0, s * roll, 'YXZ'));
const elbowQ = (s, bend, twist) => new THREE.Quaternion().setFromEuler(new THREE.Euler(bend, s * twist, 0, 'YXZ'));
// the +x hand's centre in the helper's frame for a twist, in the clap's raise
const handX = twist => new THREE.Vector3(0, -ARM.fore, 0).applyQuaternion(elbowQ(1, ARM_CLAP[2], twist)).add(new THREE.Vector3(0, -ARM.upper, 0))
  .applyQuaternion(shoulderQ(1, ARM_CLAP)).x + ARM.x;
// the first twist inwards that brings the inner face to x = 0 (the cone turns the hand back out past it): step, then bisect
export const CLAP_TWIST = (() => {
  let hi = 0;
  while (handX(hi - 0.01) > ARM.hand[0] / 2) hi -= 0.01;
  let lo = hi - 0.01;
  for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (handX(m) > ARM.hand[0] / 2) hi = m; else lo = m; }
  return (lo + hi) / 2;
})();
export const OPEN_TWIST = CLAP_TWIST + 0.95; // hands about 0.3 m apart at the off-beat
// the hand's fixed turn in the forearm: upright (fingers up, palm facing in) at the moment of contact
const handTurn = s => shoulderQ(s, ARM_CLAP).multiply(elbowQ(s, ARM_CLAP[2], CLAP_TWIST)).invert();
// The Bou's portador holds his staff in the right hand [roll out, pitch forward, elbow bend]: the arm never moves, so the
// staff (built in the forearm) stands upright on the paving.
export const ARM_STAFF = [0.08, -0.1, -1.1];
function staff(look) {
  const qs = shoulderQ(1, ARM_STAFF), q = qs.clone().multiply(elbowQ(1, ARM_STAFF[2], 0));
  const hand = new THREE.Vector3(0, -ARM.fore, 0).applyQuaternion(q).add(new THREE.Vector3(0, -ARM.upper, 0).applyQuaternion(qs)).y + ARM.y;
  const up = new THREE.Vector3(0, 1, 0).applyQuaternion(q.invert()), L = hand + 1.0, v = new Vox();
  cbox(v, 0, (L + 0.06) / 2, 0, 0.04, L + 0.06, 0.04, BOU.wood); // (cbox: by its centre) from the paving up into the pot // a long wooden staff with the fire pot hung at its top
  cbox(v, 0, L + 0.12, 0, 0.1, 0.13, 0.1, BOU.pot).box(0, L + 0.12, 0, 0.11, 0.02, 0.11, BOU.potRim);
  const m = v.mesh();
  m.quaternion.setFromUnitVectors(Y_UP, up);
  m.position.set(0, -ARM.fore, 0).addScaledVector(up, -hand); // its foot on the paving
  return m;
}
function arm(s, look, rnd) {
  const sh = new THREE.Group(), el = new THREE.Group();
  sh.rotation.order = el.rotation.order = 'YXZ';
  sh.position.set(s * ARM.x, ARM.y, 0);
  const u = new Vox();
  cbox(u, 0, 0.0, 0, ARM.w + 0.01, 0.08, ARM.w + 0.02, look.top, 0); // the shoulder cap, inside the jacket's top corner
  sleeve(u, rnd, ARM.upper + 0.02, ARM.w, look);
  sh.add(u.mesh());
  el.position.y = -ARM.upper;
  const f = new Vox();
  const cuff = look.rolled ? 0.1 : ARM.fore - 0.08; // rolled to below the elbow: a turned-up roll, then a bare forearm
  sleeve(f, rnd, cuff, ARM.w - 0.01, look);
  if (look.rolled) {
    cbox(f, 0, -cuff + 0.015, 0, ARM.w + 0.005, 0.05, ARM.w + 0.015, look.shade, 0);
    cbox(f, 0, -(cuff + ARM.fore - 0.08) / 2, 0, ARM.w - 0.035, ARM.fore - 0.08 - cuff, ARM.w - 0.03, look.skin);
  }
  cbox(f, 0, -ARM.fore + 0.045, 0, 0.07, 0.06, 0.07, look.skin); // wrist
  el.add(f.mesh());
  const h = new Vox();
  cbox(h, 0, 0, 0, ...ARM.hand, look.skin);
  const hand = h.mesh();
  hand.position.y = -ARM.fore;
  hand.quaternion.copy(handTurn(s));
  el.add(hand);
  if (look.staff && s === 1) el.add(staff(look));
  sh.add(el);
  return { sh, el };
}
// a low shoe (centre x, its toe-to-heel centre z): the Drac's cream espardenya with laces, or a dark upper on a rope sole
function shoe(v, x, z, look, w = 0.15, l = 0.27) {
  if (!look.upper) { cbox(v, x, 0.03, z, w, 0.06, l, look.sole); [0.06, 0.12].forEach(dz => cbox(v, x, 0.066, z + dz - 0.03, w + 0.005, 0.012, 0.025, look.lace, 0)); return; }
  cbox(v, x, 0.0125, z, w, 0.025, l, look.sole);
  cbox(v, x, 0.05, z + 0.01, w - 0.02, 0.05, l - 0.05, look.upper);
}
// the Mulassa's shirt details over the plain body box: a broad sash at the waist, the collar, the front opening and an
// optional neck cloth hanging at the back (a pale triangle)
function shirt(v, look) {
  v.box(0, 0.7, 0, 0.48, 0.15, 0.3, look.sash);
  if (look.stripes) for (const y of [0.735, 0.795]) { v.plate(0, y, 0.151, 0.48, 0.02, 0, 1, look.stripes); v.plate(0, y, -0.151, 0.48, 0.02, 0, -1, look.stripes); }
  v.box(0, 1.36, -0.02, 0.26, 0.06, 0.22, look.shade);
  v.plate(0, 0.86, 0.1415, 0.03, 0.5, 0, 1, look.shade);
  if (look.scarf) [0.22, 0.14, 0.06].forEach((w, i) => v.plate(0, 1.3 - 0.06 * i, -0.149, w, 0.06, 0, -1, look.scarf));
}
// the Bou's jacket worn as a tunic: long and loose (to mid-thigh), buttoned, the hood down on the back unless it is up,
// «BOU TRADICIONAL DE VALLS» down the front (a pale strip: no lettering at this size), the cartoon bull's face on the
// back's lower half; `belly` pushes the front out. Faces at z = ±0.155 (the tunic's), belly front at 0.2.
function tunic(v, look) {
  const zb = -0.155, zf = y => (look.belly && y >= 0.78 && y < 1.14 ? 0.2 : 0.155);
  if (look.belly) v.box(0, 0.78, 0.17, 0.4, 0.36, 0.06, look.top);
  for (const y of [0.6, 0.8, 0.96, 1.1, 1.24]) v.plate(0, y, zf(y) + 0.005, 0.035, 0.035, 0, 1, BOU.black);
  if (!look.belly) v.plate(0.14, 0.56, 0.161, 0.035, 0.36, 0, 1, BOU.pale);
  v.box(0, 1.33, -0.04, 0.34, 0.08, 0.26, look.top); // the collar round the neck
  if (look.hood !== 'up') v.box(0, 1.1, -0.185, 0.36, 0.22, 0.07, look.top).box(0, 1.15, -0.19, 0.26, 0.12, 0.07, look.shade);
  // the bull printed straight on the cloth, the whole back wide, from the hem up (no frame): a big pale muzzle with a
  // black nose on the hem, googly eyes glancing aside, pale horns rising outwards with black tips, a black curly tuft
  v.plate(0, 0.505, zb - 0.004, 0.24, 0.07, 0, -1, BOU.pale).plate(0, 0.575, zb - 0.004, 0.19, 0.07, 0, -1, BOU.pale)
    .plate(0, 0.53, zb - 0.008, 0.12, 0.08, 0, -1, BOU.black).plate(0, 0.61, zb - 0.008, 0.07, 0.02, 0, -1, BOU.black);
  for (const s of [1, -1]) {
    v.plate(s * 0.095, 0.69, zb - 0.004, 0.085, 0.075, 0, -1, BOU.black).plate(s * 0.095, 0.7, zb - 0.008, 0.065, 0.055, 0, -1, BOU.pale)
      .plate(s * 0.095 - 0.017, 0.71, zb - 0.012, 0.022, 0.03, 0, -1, BOU.black); // the pupils both to one side
    v.plate(s * 0.14, 0.775, zb - 0.004, 0.07, 0.035, 0, -1, BOU.pale).plate(s * 0.195, 0.795, zb - 0.004, 0.06, 0.035, 0, -1, BOU.pale)
      .plate(s * 0.232, 0.81, zb - 0.008, 0.026, 0.03, 0, -1, BOU.black);
  }
  v.plate(0, 0.785, zb - 0.004, 0.13, 0.04, 0, -1, BOU.black);
  for (const x of [-0.045, 0, 0.045]) v.plate(x, 0.82, zb - 0.004, 0.03, 0.02, 0, -1, BOU.black);
  v.plate(0.1, 0.4, 0.106, 0.08, 0.08, 0, 1, BOU.pale); // the pale mark on the trousers' left thigh
}
export function buildHelper(look, seed = 1) {
  const rnd = seeded(seed), g = new THREE.Group(), fig = new THREE.Group(), body = new THREE.Group();
  look = { skin: SKIN[(rnd() * 3) | 0], legs: COLLA.cream, dye: true, sole: COLLA.sole, lace: COLLA.lace, ...look };
  g.add(fig); fig.add(body);
  if (look.build) fig.scale.set(look.build[0], look.build[1], look.build[0]); // short and stout (the bones keep their poses)
  const v = new Vox();
  for (const s of [1, -1]) {
    shoe(v, s * 0.1, 0.03, look);
    const leg = [s * 0.1, 0.06, 0, 0.17, 0.7, 0.2];
    v.box(...leg, look.legs);
    if (look.dye) blotch(v, rnd, leg, 9);
    if (look.eyes) [0.22, 0.46].forEach((y, i) => eye(v, s * 0.1, y + 0.08 * i * s, i ? -0.1 : 0.1, i ? -1 : 1, 0.12));
  }
  const jacket = look.tunic ? [0, 0.5, 0, 0.5, 0.88, 0.31] : [0, 0.72, 0, 0.46, 0.66, 0.28];
  v.box(...jacket, look.top);
  if (look.tunic) tunic(v, look);
  if (look.dye) blotch(v, rnd, jacket, 16, look.emblem ? 'fsf' : 'fsbf'); // the back's emblem has the back to itself
  if (look.sash) shirt(v, look);
  if (look.mocador) mocador(v, 0.14, 1.38, look.mocador);
  back(v, -0.14, 1.38, look);
  body.add(v.mesh());
  const h = collaHead(look, rnd, 1.38), arms = [1, -1].map(s => arm(s, look, rnd));
  for (const a of arms) fig.add(a.sh);
  fig.add(h);
  return { g, body, head: h, arms, staff: !!look.staff, bones: [body, h, ...arms.flatMap(a => [a.sh, a.el])] };
}
// The clap at `beat` (an integer = palms together) and energy 0..1 (0 = arms hanging, calm). Pure, no allocations.
export const ARM_UP = [0.35, -2.7, -0.35]; // a cheer: both arms up over the head
export function poseHelper(p, beat, energy, cheer = 0) {
  const f = beat - Math.floor(beat), u = Math.cos(Math.PI * f) ** 2, close = u * u; // C1, 1 on the beat, 0 half way
  const e = Math.min(1, Math.max(0, energy)), twist = e * (OPEN_TWIST + (CLAP_TWIST - OPEN_TWIST) * close);
  for (let i = 0; i < 2; i++) {
    const s = i ? -1 : 1, { sh, el } = p.arms[i];
    if (p.staff) { // the staff stays put; the free hand beats time at his side, and waves up on a cheer
      if (i === 0) { sh.rotation.set(ARM_STAFF[1], 0, ARM_STAFF[0]); el.rotation.set(ARM_STAFF[2], 0, 0); continue; }
      sh.rotation.set(ARM_REST[1] - 0.25 * e * close + (ARM_UP[1] - ARM_REST[1]) * cheer, 0, -ARM_REST[0] - 0.2 * cheer);
      el.rotation.set(ARM_REST[2] - 0.25 * e, 0, 0);
      continue;
    }
    sh.rotation.set(ARM_REST[1] + (ARM_CLAP[1] - ARM_REST[1]) * e, 0, s * (ARM_REST[0] + (ARM_CLAP[0] - ARM_REST[0]) * e));
    el.rotation.set(ARM_REST[2] + (ARM_CLAP[2] - ARM_REST[2]) * e, s * twist, 0);
    if (cheer > 0) {
      sh.rotation.x += (ARM_UP[1] - sh.rotation.x) * cheer; sh.rotation.z += (s * ARM_UP[0] - sh.rotation.z) * cheer;
      el.rotation.x += (ARM_UP[2] - el.rotation.x) * cheer; el.rotation.y *= 1 - cheer;
    }
  }
  p.head.rotation.x = 0.06 * e * close - 0.25 * cheer; // a small nod with each clap; a cheer looks up
  p.g.position.y = (p.staff ? 0.04 : 0.12) * cheer * Math.abs(Math.sin(beat * Math.PI * 2)); // and hops (the portador only bobs)
}

// ---- the seated member, on the paving (hips at y 0), three postures seen at the front of the public:
// 0 knees up, hands on the knees; 1 leaning back on the hands; 2 legs folded to one side, propped on a hand (64 s).
// neck: the torso's top (the head's pivot); legs: [hip, knee, ankle] right then left; hands: right, left. `tap`: what
// marks the beat (the left forearm, pivot at the elbow, or the right shoe, pivot at the heel).
export const SEATED = [
  { neck: [0, 0.7, -0.1], legs: [[[0.1, 0.08, -0.02], [0.11, 0.44, 0.36], [0.11, 0.08, 0.56]], [[-0.1, 0.08, -0.02], [-0.11, 0.44, 0.36], [-0.11, 0.08, 0.56]]],
    hands: [[0.15, 0.5, 0.36], [-0.15, 0.5, 0.36]], tap: 'hand' },
  { neck: [0, 0.62, -0.28], legs: [[[0.1, 0.08, -0.02], [0.12, 0.36, 0.42], [0.13, 0.08, 0.74]], [[-0.1, 0.08, -0.02], [-0.12, 0.36, 0.42], [-0.13, 0.08, 0.74]]],
    hands: [[0.27, 0, -0.5], [-0.27, 0, -0.5]], tap: 'foot' },
  { neck: [0.06, 0.66, -0.08], legs: [[[0.1, 0.08, -0.02], [-0.02, 0.08, 0.46], [-0.36, 0.08, 0.3]], [[-0.1, 0.09, -0.02], [-0.24, 0.09, 0.3], [-0.5, 0.09, 0.06]]],
    hands: [[0.42, 0, -0.04], [-0.1, 0.2, 0.25]], tap: 'hand', side: true },
];
export function buildSeated(look, posture, seed = 1) {
  const rnd = seeded(seed), P = SEATED[posture], g = new THREE.Group(), body = new THREE.Group();
  look = { skin: SKIN[(rnd() * 5) | 0], legs: COLLA.cream, dye: true, sole: COLLA.sole, lace: COLLA.lace, ...look };
  g.add(body);
  const v = new Vox(), [nx, ny, nz] = P.neck, top = look.top, dye = look.dye;
  cbox(v, 0, 0.08, -0.04, 0.4, 0.16, 0.3, look.legs); // the seat of the trousers, on the paving
  const hip = [nx * 0.3, 0.1, -0.04], along = k => hip.map((h, i) => h + (P.neck[i] - h) * k);
  limb(v, hip, P.neck, 0.44, 0.26, top, rnd, dye); // the jacket
  if (look.sash) limb(v, along(0.04), along(0.3), 0.46, 0.28, look.sash, rnd, false); // round the waist, along the torso
  if (look.mocador) cbox(v, nx, ny - 0.035, nz, 0.3, 0.06, 0.3, look.mocador).box(nx, ny - 0.16, nz + 0.12, 0.1, 0.1, 0.06, look.mocador);
  const foot = new THREE.Group(), fv = new Vox(), toe = P.tap === 'foot';
  P.legs.forEach(([H, K, A], i) => {
    limb(v, H, K, 0.16, 0.16, look.legs, rnd, dye);
    limb(v, K, A, 0.15, 0.15, look.legs, rnd, dye);
    const s = toe && i === 0 ? fv : v; // the shoe that taps
    if (P.side) cbox(s, A[0] - 0.07, 0.05, A[2], 0.16, 0.1, 0.12, look.upper ?? look.sole); // feet tucked to the side
    else if (look.upper) shoe(s, A[0], A[2] + 0.06, look, 0.14, 0.26);
    else { cbox(s, A[0], 0.03, A[2] + 0.06, 0.14, 0.06, 0.26, look.sole); cbox(s, A[0], 0.066, A[2] + 0.12, 0.145, 0.012, 0.025, look.lace, 0); }
  });
  if (toe) { const A = P.legs[0][2]; foot.position.set(A[0], 0, A[2] - 0.07); fv.g.forEach(geo => geo.translate(-A[0], 0, 0.07 - A[2])); foot.add(fv.mesh()); }
  const tap = new THREE.Group(), tv = new Vox();
  P.hands.forEach((hand, i) => { // shoulder to hand in two segments, the elbow pushed outwards and down
    const s = i ? -1 : 1, sh = [nx + s * 0.27, ny - 0.06, nz];
    const elb = [(sh[0] + hand[0]) / 2 + s * 0.08, (sh[1] + hand[1]) / 2 - 0.04, (sh[2] + hand[2]) / 2];
    limb(v, sh, elb, 0.12, 0.13, top, rnd, dye);
    const t = !toe && i === 1 ? tv : v; // the forearm that taps
    limb(t, elb, [hand[0], hand[1] + 0.06, hand[2]], 0.11, 0.12, look.rolled ? look.skin : top, rnd, dye); // to the wrist, over the palm
    cbox(t, hand[0], hand[1] + 0.03, hand[2], 0.09, 0.06, 0.1, look.skin);
    if (t === tv) { tap.position.set(...elb); tv.g.forEach(geo => geo.translate(-elb[0], -elb[1], -elb[2])); tap.add(tv.mesh()); }
  });
  body.add(v.mesh());
  const h = collaHead(look, rnd, 0), beat = toe ? foot : tap;
  h.position.set(nx, ny, nz);
  g.add(h, beat);
  return { g, body, head: h, beat, toe, posture: P, bones: [body, h, beat] };
}
// A contained gesture: a nod and a hand (or toe) tap that land on the beat; `half` members mark every other beat.
export function poseSeated(p, beat, energy, half) {
  const b = half ? beat / 2 : beat, f = b - Math.floor(b), u = Math.cos(Math.PI * f) ** 2;
  const k = u * u, amp = 0.35 + 0.65 * Math.min(1, Math.max(0, energy));
  p.head.rotation.x = 0.1 * amp * k;
  p.beat.rotation.x = -(p.toe ? 0.25 : 0.3) * amp * (1 - k); // the toes / the hand lift between the beats, down on it
}
