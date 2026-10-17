// The Àliga de Valls (Anton Gurí, 1991) and her three aligons, in metres like the mulassa, front = +z. The measures,
// colours and dimensions are an artistic reconstruction, with analytic carrier and aligó leg rigs.
import * as THREE from 'three';
import { Vox } from './voxel.js';
import { LEGS } from '../../game/aliga-dance.js';

export const AL = {
  scale: '#c4cbcd', groove: '#848e90', smooth: '#cfd4d6', rim: '#8a9194',
  copper: '#c8824e', copperDark: '#803933', band: '#a2563f',
  feather: '#b0b2ae', featherDark: '#8f928d', edge: '#7d4144', edgeDark: '#5a2e30',
  tail: '#8f6871', tailDark: '#604846',
  beak: '#daae4b', beakTip: '#b0603a', mouth: '#3a1414', eye: '#d9b25a', pupil: '#22170f',
  velvet: '#a8324a', gold: '#d9a521', red: '#c8102e', white: '#f4efe4', yellow: '#f2c230',
  suit: '#ece8de', stripe: '#1a1412', sock: '#a3283a', shoe: '#141414', skin: '#e0ac85', helmet: '#b9b6b2', helmetDark: '#85827e',
};
// The portador's hips: the shell bows, sways and dips about them, so his feet stay planted.
const HIP = 0.92, KNEE = 0.47;
const KID = { hip: 0.45, knee: 0.23, neck: 0.78, kneel: 0.135 }; // an aligó; kneel = his hip's height curled up on the ground

const lerp = (T, u) => { // piecewise-linear profile: T = [[u, value]...]
  let i = 1;
  while (i < T.length - 1 && u > T[i][0]) i++;
  const [u0, a] = T[i - 1], [u1, b] = T[i];
  return a + (b - a) * Math.min(1, Math.max(0, (u - u0) / (u1 - u0)));
};
const place = (rx, ry, rz, x, y, z) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z),
  new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, 'YXZ')), new THREE.Vector3(1, 1, 1));
// Bakes a sub-model built in its own frame (wing, tail) into v: the shell stays one mesh, one draw call.
const bake = (v, sub, m) => { for (const g of sub.g) v.g.push(g.applyMatrix4(m)); };

// One slice of a scaled volume: two crossed cores (chamfered corners, the dark grooves) under brick-offset scales 1 cm proud.
// hide(x, y0, y1, z): a scale that something else covers is not built (it would only z-fight under it).
function scaled(v, y, h, hw, zf, zb, row, tile = 0.075, hide = () => false) {
  const zc = (zf + zb) / 2, d = zf - zb, c = Math.min(0.08, hw * 0.4);
  v.box(0, y, zc, 2 * hw, h, d - 2 * c, AL.groove, 0).box(0, y, zc, 2 * hw - 2 * c, h, d, AL.groove, 0);
  const step = tile + 0.02, off = row % 2 ? step / 2 : 0, ty = y + 0.008, th = h - 0.016;
  const run = (half, f) => { for (let a = -half + tile / 2 + off; a <= half - tile / 2 + 1e-6; a += step) f(a); };
  run(hw - c, x => { if (!hide(x, y, y + h, zf)) v.box(x, ty, zf + 0.006, tile, th, 0.012, AL.scale); });
  run(hw - c, x => { if (!hide(x, y, y + h, zb)) v.box(x, ty, zb - 0.006, tile, th, 0.012, AL.scale); });
  run(d / 2 - c, z => { for (const s of [1, -1]) if (!hide(s * hw, y, y + h, zc + z)) v.box(s * (hw + 0.006), ty, zc + z, 0.012, th, tile, AL.scale); });
}

// A rigid wing in its own frame: root at the origin, span along -z, leading edge on top (y 0), chord downwards, faces ±x;
// s * x points away from her body.
const WING = 1.4;
function wing(s) {
  const w = new Vox(), N = 12, seg = WING / N;
  for (let k = 0; k < N; k++) {
    const z = -(k + 0.5) * seg, chord = 0.58 - 0.16 * Math.min(1, k / 6);
    w.box(-s * 0.0175, -0.09, z, 0.035, 0.09, seg, AL.edge, 0).box(s * 0.0175, -0.09, z, 0.035, 0.09, seg, AL.feather, 0); // the leading edge: red inside, silver out
    w.box(0, -0.085, z + seg / 4, 0.08, 0.07, 0.02, AL.edgeDark, 0); // its ribs
    w.box(0, -chord, z, 0.045, chord - 0.09, seg, AL.featherDark, 0);
    if (k >= 3) for (const f of [1, -1]) for (let r = 0; r < 3; r++) { // embossed feathers on both faces, staggered
      const fy = -0.12 - r * (chord - 0.1) / 3, fz = z + (r % 2 ? seg / 4 : -seg / 4);
      w.box(f * 0.0265, fy - (chord - 0.1) / 3 + 0.02, fz, 0.008, (chord - 0.1) / 3 - 0.01, seg * 0.42, AL.feather);
    }
    w.box(0, -chord - 0.08, z - seg * 0.15, 0.036, 0.1, seg * 0.62, AL.feather); // the primaries' scalloped trailing edge
  }
  w.box(0, -0.34, -1.5 * seg, 0.06, 0.2, 3 * seg - 0.02, AL.band, 0); // copper coverts over the root
  for (let i = 0; i < 3; i++) w.box(0, -0.31 + i * 0.06, -1.5 * seg, 0.07, 0.015, 3 * seg - 0.03, AL.copperDark, 0);
  w.box(0, -0.48, -WING + 0.04, 0.09, 0.475, 0.1, AL.edge, 0); // the band wraps the square tip
  return w;
}

function tail() { // the paddle (la cua), from its root at the origin backwards along -z
  const t = new Vox(), N = 9;
  for (let k = 0; k < N; k++) {
    const z = -(k + 0.5) * 0.1, round = k >= N - 2 ? (k - N + 3) * 0.07 : 0, w = 0.44 + 0.18 * Math.min(1, k / 6) - round;
    // Silver root, underside and rim; burgundy feathers occupy only the distal upper surface.
    // Rear/side daylight frames l85rZ9lxCzM at 13.5 s and 19.5 s show both surfaces.
    t.box(0, -0.04, z, w, 0.08, 0.1, AL.featherDark, 0);
    const distal = k >= 4;
    const inset = 0.035;
    if (k > 0) {
      t.box(0, 0.035, z, w - 2 * inset, 0.024, 0.09, distal ? AL.tail : AL.scale, 0);
      for (let x = -w / 2 + 0.065; x <= w / 2 - 0.06; x += 0.08)
        t.box(x, 0.054, z, 0.022, 0.014, 0.08, distal ? AL.tailDark : AL.groove, 0);
    }
  }
  t.box(0, -0.06, -0.88, 0.5, 0.11, 0.06, AL.featherDark, 0); // silver-grey lip, not a pink underside
  return t;
}

// The portador's leg: hip pivot, knee pivot; scale-striped trousers, red socks, black shoes.
function portadorLeg(s) {
  const leg = new THREE.Group(), shin = new THREE.Group();
  leg.position.set(s * 0.12, HIP, 0);
  shin.position.y = KNEE - HIP;
  const stripes = (v, y0, y1, dy) => {
    for (let y = y0; y < y1; y += 0.1) v.box(0, y - dy, 0, 0.21, 0.075, 0.22, AL.suit, 0).box(0, y + 0.075 - dy, 0, 0.22, 0.025, 0.23, AL.stripe, 0);
  };
  const tv = new Vox(); // the thigh, up into the shell
  stripes(tv, KNEE - 0.005, HIP + 0.05, HIP); // overlaps the shin a little: no gap when the knee bends
  const sv = new Vox().box(0, -KNEE, 0.03, 0.13, 0.08, 0.28, AL.shoe, 0).box(0, 0.08 - KNEE, 0, 0.12, 0.12, 0.13, AL.sock, 0);
  stripes(sv, 0.18, KNEE, KNEE);
  leg.add(tv.mesh(), shin);
  shin.add(sv.mesh());
  return { leg, shin };
}

export function buildAliga() {
  const root = new THREE.Group(), body = new THREE.Group();
  body.position.y = HIP;
  root.add(body);
  const v = new Vox();
  // the shell: a scaled sack from the rim (0.70 m, mid-thigh) to the collar (1.89 m), narrow at the top, the chest bulging forward
  const ROWS = 13, Y0 = 0.715, RH = 0.09; // the first row 5 mm into the rim
  const HW = [[0, 0.38], [0.25, 0.42], [0.5, 0.42], [0.75, 0.36], [0.92, 0.3], [1, 0.27]];
  const ZF = [[0, 0.18], [0.2, 0.3], [0.5, 0.42], [0.7, 0.45], [0.88, 0.38], [1, 0.26]];
  const ZB = [[0, -0.3], [0.3, -0.36], [0.7, -0.34], [1, -0.22]];
  const rowU = y => (Math.min(ROWS - 1, Math.max(0, Math.floor((y - Y0) / RH))) + 0.5) / ROWS; // the row a height falls in
  // the thighs: ribbed copper fans round the lower front corners, slats on an arc about a vertical axis (angle 0 faces the side)
  const TH = { cx: 0.14, cz: 0.04, r: 0.3, h: 0.42, a0: -0.9, a1: 1.45, n: 13 };
  const fan = a => TH.h * Math.sqrt(1 - 0.85 * ((2 * (a - TH.a0)) / (TH.a1 - TH.a0) - 1) ** 2); // slat height at angle a
  const onThigh = (x, y0, z) => {
    const dx = Math.abs(x) - TH.cx, dz = z - TH.cz, a = Math.atan2(dz, dx);
    return Math.hypot(dx, dz) < TH.r + 0.05 && a > TH.a0 - 0.15 && a < TH.a1 + 0.15 && y0 < 0.7 + fan(Math.min(TH.a1, Math.max(TH.a0, a)));
  };
  const V = [0, 1, 2, 3].map(k => ({ x: 0.03 + 0.04 * k, y: 1.24 + 0.045 * k })); // the V on the chest, one step per k
  const covered = (x, y0, y1, z) => onThigh(x, y0, z)
    || (z < 0 && Math.abs(x) < 0.34 && y0 < 1.2 && y1 > 0.76) || (z < 0 && Math.abs(x) < 0.23 && y0 < 1.62 && y1 > 1.19) // frills, chevrons
    || (z > 0 && Math.abs(x) < 0.2 && y0 < 1.42 && y1 > 1.23); // the V
  for (let i = 0; i < ROWS; i++) {
    const u = (i + 0.5) / ROWS;
    scaled(v, Y0 + i * RH, RH, lerp(HW, u), lerp(ZF, u), lerp(ZB, u), i, 0.075, covered);
  }
  v.box(0, 0.68, -0.06, 2 * lerp(HW, 0) + 0.06, 0.04, 0.54, AL.rim, 0); // the metal rim the legs come out of
  v.box(0, 1.87, 0.03, 0.61, 0.04, 0.6, AL.smooth, 0); // the smooth flared collar
  for (const s of [1, -1]) for (const { x, y } of V) v.box(s * x, y, lerp(ZF, rowU(y)) + 0.005, 0.045, 0.035, 0.03, AL.groove, 0);
  v.box(0, 1.22, lerp(ZF, rowU(1.22)) + 0.005, 0.05, 0.04, 0.03, AL.groove, 0); // the V's point
  for (const s of [1, -1]) for (let k = 0; k < TH.n; k++) {
    const a = TH.a0 + (TH.a1 - TH.a0) * k / (TH.n - 1), h = Math.round(fan(a) / 0.045) * 0.045; // tops between the rows' and scales' edges
    const slat = new Vox().box(0, k % 2 ? 0.005 : 0, 0, 0.085, k % 2 ? h - 0.02 : h, 0.05, k % 2 ? AL.copperDark : AL.copper, 0); // the dark ribs a little lower
    bake(v, slat, place(0, Math.atan2(s * Math.cos(a), Math.sin(a)), 0, s * (TH.cx + TH.r * Math.cos(a)), 0.7, TH.cz + TH.r * Math.sin(a)));
  }
  // back: copper chevrons and frill over the silver-scaled tail root
  for (let j = 0; j < 8; j++) v.box(0, 1.2 + j * 0.05, lerp(ZB, rowU(1.22 + j * 0.05)) - 0.025, 0.42 - 0.048 * j, 0.05, 0.05, j % 2 ? AL.copperDark : AL.copper, 0);
  for (let x = -0.28; x <= 0.281; x += 0.056) {
    const lift = Math.round(Math.abs(x) / 0.056) * 0.02; // the tubes' ends step up to the sides, clear of the rows' joints
    v.box(x, 0.95 + lift, -0.39, 0.048, 0.24 - lift, 0.1, AL.copper, 0);
    if (Math.abs(x) < 0.27) v.box(x, 0.815, -0.34, 0.05, 0.095, 0.1, AL.scale, 0);
  }
  for (const s of [1, -1]) bake(v, wing(s), place(0.28, -s * 0.45, -s * 0.12, s * 0.3, 1.8, -0.02)); // swept back, a little up and out
  bake(v, tail(), place(0.06, 0, 0, 0, 0.75, -0.3)); // the tip droops a little
  // neck: long, leaning forward a little; scaled sides and nape, the throat smooth
  for (let i = 0; i < 5; i++) {
    const u = i / 4, zc = 0.02 + 0.1 * u, hd = 0.17 - 0.03 * u, hw = 0.16 - 0.03 * u;
    scaled(v, 1.89 + i * 0.075, 0.075, hw, zc + hd, zc - hd, i, 0.06, (x, y0, y1, z) => z > zc && Math.abs(x) < 0.1);
    v.box(0, 1.89 + i * 0.075, zc + hd + 0.015, 0.2, 0.075, 0.03, AL.smooth, 0);
  }
  // head: smooth skull, a brow ledge like a visor, big gold eyes, the open hooked beak
  [[0.32, 0.36], [0.4, 0.42], [0.42, 0.44], [0.4, 0.42], [0.32, 0.34]].forEach(([w, d], i) => {
    v.box(0, 2.265 + i * 0.09, 0.06, w, 0.09, d - 0.06, AL.smooth, 0).box(0, 2.265 + i * 0.09, 0.06, w - 0.06, 0.09, d, AL.smooth, 0);
  });
  v.box(0, 2.58, 0.08, 0.46, 0.05, 0.42, AL.scale, 0); // brow
  for (const s of [1, -1]) {
    v.box(s * 0.215, 2.44, 0.15, 0.03, 0.13, 0.14, AL.eye, 0);
    v.box(s * 0.235, 2.475, 0.155, 0.01, 0.06, 0.06, AL.pupil, 0);
  }
  v.box(0, 2.42, 0.32, 0.24, 0.16, 0.14, AL.beak, 0).box(0, 2.41, 0.44, 0.2, 0.15, 0.1, AL.beak, 0);
  v.box(0, 2.37, 0.53, 0.14, 0.15, 0.08, AL.beakTip, 0).box(0, 2.28, 0.585, 0.08, 0.16, 0.05, AL.beakTip, 0); // the hook
  v.box(0, 2.29, 0.37, 0.18, 0.05, 0.22, AL.beak, 0); // lower mandible
  v.box(0, 2.335, 0.365, 0.15, 0.08, 0.2, AL.mouth, 0); // inside the open mouth
  v.box(0, 2.34, 0.48, 0.08, 0.04, 0.06, AL.white, 0); // what she holds in the beak (once a live dove: the nest's place)
  for (const [s, cols] of [[1, [AL.red, AL.white, AL.red]], [-1, [AL.yellow, AL.yellow]]]) // ribbons: Valls red-white-red on her left, yellow
    cols.forEach((c, k) => v.box(s * 0.09, 1.98, 0.34 + k * 0.022, 0.012, 0.35, 0.022, c, 0));
  // crown, on the back of the dome: gold band with fleurons, red velvet bonnet, gold arches and orb
  v.box(0, 2.71, 0.02, 0.28, 0.05, 0.28, AL.gold, 0);
  v.box(0, 2.76, 0.02, 0.24, 0.08, 0.24, AL.velvet, 0).box(0, 2.84, 0.02, 0.16, 0.03, 0.16, AL.velvet, 0);
  for (const [x, z] of [[0.12, 0.12], [-0.12, 0.12], [0.12, -0.12], [-0.12, -0.12]]) v.box(x, 2.755, 0.02 + z, 0.04, 0.045, 0.04, AL.gold, 0);
  for (const [x, z] of [[0.125, 0], [-0.125, 0], [0, 0.125], [0, -0.125]]) v.box(x, 2.755, 0.02 + z, x ? 0.012 : 0.03, 0.09, z ? 0.012 : 0.03, AL.gold, 0);
  v.box(0, 2.835, 0.02, 0.03, 0.04, 0.26, AL.gold, 0).box(0, 2.835, 0.02, 0.26, 0.04, 0.03, AL.gold, 0);
  v.box(0, 2.875, 0.02, 0.05, 0.045, 0.05, AL.gold, 0);
  const shell = v.mesh();
  shell.position.y = -HIP; // built in ground space; the pivot is at the hips
  body.add(shell);

  const legs = [], knees = [];
  for (const s of [1, -1]) {
    const { leg, shin } = portadorLeg(s);
    root.add(leg);
    legs.push(leg);
    knees.push(shin);
  }
  return { root, body, legs, knees };
}

// One aligó: a child in a white suit of black-edged scales and a grey helmet with a beak for a visor (about 1 m).
export function buildAligo() {
  const root = new THREE.Group(), { hip, knee, neck } = KID;
  const body = new THREE.Group();
  body.position.y = hip;
  root.add(body);
  const striped = (v, x, y0, y1, w, d, z = 0) => { // rows of white scales, each edged black
    for (let y = y0; y < y1 - 0.01; y += 0.08) {
      const h = Math.min(0.06, y1 - y - 0.02);
      v.box(x, y, z, w, h, d, AL.suit, 0).box(x, y + h, z, w + 0.012, 0.02, d + 0.012, AL.stripe, 0);
    }
  };
  const tv = new Vox();
  striped(tv, 0, hip - 0.035, neck, 0.28, 0.17);
  const torso = tv.mesh();
  torso.position.y = -hip;
  body.add(torso);
  const head = new THREE.Group();
  head.position.y = neck - hip;
  body.add(head);
  const hv = new Vox().box(0, 0, 0, 0.17, 0.17, 0.16, AL.skin);
  for (const s of [1, -1]) hv.box(s * 0.04, 0.08, 0.085, 0.03, 0.03, 0.01, AL.stripe, 0);
  hv.box(0, 0.11, -0.01, 0.2, 0.09, 0.2, AL.helmet, 0).box(0, 0.02, -0.09, 0.2, 0.1, 0.04, AL.helmet, 0); // cap and nape guard
  hv.box(0, 0.1, 0.0, 0.3, 0.025, 0.28, AL.helmetDark, 0); // the broad brim
  hv.box(0, 0.12, 0.17, 0.1, 0.04, 0.14, AL.helmet, 0).box(0, 0.08, 0.235, 0.05, 0.06, 0.03, AL.helmetDark, 0); // the beak over the face
  head.add(hv.mesh());
  const arms = [1, -1].map(s => {
    const a = new THREE.Group();
    a.position.set(s * 0.195, neck - 0.03 - hip, 0);
    const av = new Vox();
    striped(av, 0, -0.3, 0.0, 0.08, 0.09);
    av.box(0, -0.36, 0, 0.07, 0.07, 0.07, AL.skin);
    a.add(av.mesh());
    body.add(a);
    return a;
  });
  const legs = [], knees = [];
  for (const s of [1, -1]) {
    const l = new THREE.Group(), shin = new THREE.Group();
    l.position.set(s * 0.07, hip, 0);
    shin.position.y = knee - hip;
    const lv = new Vox();
    striped(lv, 0, knee - 0.01 - hip, 0.02, 0.11, 0.12);
    const sv = new Vox().box(0, -knee, 0.02, 0.1, 0.06, 0.17, AL.shoe, 0);
    striped(sv, 0, 0.06 - knee, 0, 0.11, 0.12);
    l.add(lv.mesh(), shin);
    shin.add(sv.mesh());
    root.add(l);
    legs.push(l);
    knees.push(shin);
  }
  return { root, body, head, arms, legs, knees };
}

// The eagle and her three aligons as one group, posed only through applyAligaPose.
export function buildAligaRig() {
  const root = new THREE.Group(), aliga = buildAliga(), aligons = [0, 1, 2].map(buildAligo);
  root.add(aliga.root, ...aligons.map(a => a.root));
  return { root, aliga, aligons };
}
// Keep the legacy hierarchy intact for static poses. The dance uses the same trouser/shoe
// vertices split into independently posed pieces: no new shell, colours or shoe dimensions.
function boxRange(mesh, first, count) {
  const source = mesh.geometry;
  const g = new THREE.BufferGeometry(), start = first * 24, end = start + count * 24;
  for (const [name, a] of Object.entries(source.attributes))
    g.setAttribute(name, new THREE.BufferAttribute(a.array.slice(start * a.itemSize, end * a.itemSize), a.itemSize));
  g.setIndex(Array.from(source.index.array.slice(first * 36, (first + count) * 36), i => i - start));
  const m = new THREE.Mesh(g, mesh.material);
  m.castShadow = m.receiveShadow = true;
  return m;
}
function danceLegs(fig, dim, oldKnee, footBoxes) {
  const group = new THREE.Group();
  const limbs = fig.legs.map((legacy, i) => {
    const upper = legacy.children.find(o => o.isMesh), lower = fig.knees[i].children[0];
    const split = boxRange;
    const thigh = split(upper, 0, upper.geometry.attributes.position.count / 24);
    const shin = split(lower, footBoxes, lower.geometry.attributes.position.count / 24 - footBoxes);
    const shoe = split(lower, 0, footBoxes);
    thigh.geometry.scale(1, dim.thigh / (dim.hip - oldKnee), 1);
    shin.geometry.scale(1, dim.shin / (oldKnee - dim.ankle), 1);
    shoe.geometry.translate(0, oldKnee, 0);
    group.add(thigh, shin, shoe);
    return { thigh, shin, shoe, hip: new THREE.Vector3(), ankle: new THREE.Vector3(), knee: new THREE.Vector3(),
      axis: new THREE.Vector3(), bend: new THREE.Vector3(), delta: new THREE.Vector3(), reachError: 0 };
  });
  return { group, limbs, dim };
}
const DOWN = new THREE.Vector3(0, -1, 0);
function fitDanceLegs(fig, p, dim, oldKnee, footBoxes) {
  const ik = fig.ik ||= danceLegs(fig, dim, oldKnee, footBoxes);
  if (ik.group.parent !== fig.root) {
    fig.legs.forEach(l => fig.root.remove(l));
    fig.root.add(ik.group);
  }
  const cy = Math.cos(p.yaw), sy = Math.sin(p.yaw);
  ik.limbs.forEach((l, i) => {
    const f = p.feet[i], dx = f.x - p.x, dz = f.z - p.z;
    // Feet are absolute in rig-root space; cancel this figure's translation and yaw.
    l.shoe.position.set(cy * dx - sy * dz, f.h, sy * dx + cy * dz);
    l.shoe.rotation.set(0, f.yaw - p.yaw, 0);
    l.hip.set((i ? -1 : 1) * dim.hipX, fig.body.position.y, fig.body.position.z);
    l.ankle.copy(l.shoe.position); l.ankle.y += dim.ankle;
    l.delta.subVectors(l.ankle, l.hip);
    const distance = l.delta.length(), lo = Math.abs(dim.thigh - dim.shin), hi = dim.thigh + dim.shin;
    // No stretching or moving planted feet to conceal an unreachable input. Expose the
    // residual for diagnostics; supplied song poses should stay strictly inside reach.
    l.reachError = Math.max(0, distance - hi, lo - distance);
    const d = Math.max(lo + 1e-9, Math.min(hi - 1e-9, distance));
    l.axis.copy(l.delta).normalize();
    // Knees prefer forward and slightly outward so the two trouser chains do
    // not fold through each other. A fixed pole keeps this solve history-free.
    l.bend.set((i ? -1 : 1) * (dim === LEGS.carrier ? 0.75 : 0.25), 0, 1);
    l.bend.addScaledVector(l.axis, -l.bend.dot(l.axis));
    if (l.bend.lengthSq() < 1e-12) l.bend.set(1, 0, 0).addScaledVector(l.axis, -l.axis.x);
    l.bend.normalize();
    const along = (dim.thigh ** 2 - dim.shin ** 2 + d ** 2) / (2 * d);
    l.knee.copy(l.hip).addScaledVector(l.axis, along)
      .addScaledVector(l.bend, Math.sqrt(Math.max(0, dim.thigh ** 2 - along ** 2)));
    l.thigh.position.copy(l.hip);
    l.thigh.quaternion.setFromUnitVectors(DOWN, l.delta.subVectors(l.knee, l.hip).normalize());
    l.shin.position.copy(l.knee);
    l.shin.quaternion.setFromUnitVectors(DOWN, l.delta.subVectors(l.ankle, l.knee).normalize());
  });
}
function legacyLegs(fig) {
  if (fig.ik) fig.root.remove(fig.ik.group);
  fig.legs.forEach(l => { if (l.parent !== fig.root) fig.root.add(l); });
}
// Dance schema: feet[0/1] = absolute {x,z,yaw,h} in rig-root space. Shoes stay
// rigid/flat; trousers solve the two-bone chain using LEGS, independently of the
// rigid shell. Numeric arms is a 0..1 raise; absent head is zero. Aligó hips use
// LEGS.aligo.kneel/curlZ during the curl, plus the dance's support lift.
// Without feet, preserve the static/legacy arrays and hierarchy below.
// A pose is plain data (metres, radians), local to the rig's root: the same pose always gives the same figure.
// aliga: x, z, yaw on the plaça; pitch (+ bows forward, about 1.2 at her big bows), roll (+ leans to her left) and lift
// (+ up, − the portador's knees giving) about his hips; legs = forward swing at each hip, knees = bend (+ foot back).
// aligons[i]: x, z, yaw; crouch 0 standing … 1 curled up in a ball on the ground; head = nod (+ down);
// arms = raise forward (0 down, π straight up); legs = forward swing. Index 0 of legs/arms/knees is the figure's left.
export const NEUTRAL = {
  aliga: { x: 0, z: 0, yaw: 0, pitch: 0, roll: 0, lift: 0, legs: [0, 0], knees: [0, 0] },
  aligons: [[-1.8, 1.4], [1.8, 1.4], [0, -2.6]].map(([x, z]) => ({ x, z, yaw: Math.atan2(-x, -z), crouch: 0, head: 0, arms: [0, 0], legs: [0, 0] })),
};
const CURL = { thigh: 1.27, knee: 3.02, torso: 1.2, head: 0.3, arms: 2.5 }; // the ball: kneeling, heels up a little, forehead and arms down
export function applyAligaPose(rig, pose) {
  const a = rig.aliga, p = pose.aliga;
  a.root.position.set(p.x, 0, p.z);
  a.root.rotation.set(0, p.yaw, 0);
  a.body.position.y = (p.feet ? LEGS.carrier.hip : HIP) + p.lift;
  a.body.rotation.set(p.pitch, 0, -p.roll, p.feet ? 'YXZ' : 'XYZ');
  if (p.feet) fitDanceLegs(a, p, LEGS.carrier, KNEE, 1);
  else {
    legacyLegs(a);
    a.legs.forEach((l, i) => l.rotation.set(-p.legs[i], 0, 0));
    a.knees.forEach((k, i) => k.rotation.set(p.knees[i], 0, 0));
  }
  rig.aligons.forEach((k, i) => {
    const q = pose.aligons[i], c = q.crouch;
    k.root.position.set(q.x, 0, q.z);
    k.root.rotation.set(0, q.yaw, 0);
    k.body.position.y = (q.feet ? LEGS.aligo.hip + c * (LEGS.aligo.kneel - LEGS.aligo.hip) + (q.lift ?? 0)
      : KID.hip + c * (KID.kneel - KID.hip));
    // A squat puts the hips behind the fixed ankles; keeping them vertically above
    // flat shoes forces the longer thigh's knee underground at the old curl height.
    k.body.position.z = q.feet ? LEGS.aligo.curlZ * c : 0;
    k.body.rotation.set(c * CURL.torso, 0, 0);
    k.head.rotation.set((q.head ?? 0) + c * CURL.head, 0, 0);
    // Spread the tucked arms slightly at the shoulder: their cuffs clear the helmet brim and folded calves.
    k.arms.forEach((m, j) => m.rotation.set(-(Array.isArray(q.arms) ? q.arms[j] : q.arms * Math.PI) - c * CURL.arms + (q.armSwing?.[j] ?? 0), 0, (j ? -1 : 1) * (0.04 + 0.04 * c)));
    if (q.feet) fitDanceLegs(k, q, LEGS.aligo, KID.knee, 1);
    else {
      legacyLegs(k);
      k.legs.forEach((l, j) => {
        l.position.y = k.body.position.y;
        l.rotation.set(-q.legs[j] - c * CURL.thigh, 0, 0);
      });
      k.knees.forEach(n => n.rotation.set(c * CURL.knee, 0, 0));
    }
  });
}
