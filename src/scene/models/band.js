// The band and the cobla: the musicians, where they stand and how they play.
import * as THREE from 'three';
import { buildPerson } from './people.js';
import { Vox } from './voxel.js';

// ---------------------------------------------------------------- The band
// The Ball de la Mulassa is played by a banda de música: Bofarull's 1987 tune, arranged for wind band in 2007 (the
// score in music/ is its reduction, percussion left out). In the Sant Joan videos the band stands in a row at the edge
// of the ring, facing her: white shirts, gold ties, dark trousers; clarinets, trumpets, trombone, a bombo on a harness.
// The exact line-up and the second row are an artistic choice. Order = who stays at lower quality (PROFILES band),
// row 0 the front row (woodwinds, trumpets), 1 behind it (low brass, percussion).
export const BAND = [['clarinet', 0], ['trumpet', 0], ['trombone', 1], ['tuba', 1], ['clarinet', 0], ['bombo', 1],
  ['sax', 0], ['caixa', 1], ['trumpet', 0], ['plats', 1]];
// A figure can bring its own players instead (its scene's `band`, figure-scenes.js). The Drac dances to a mitja cobla:
// two players and three instruments, the xeremies and the flabiol with its tamborí, in white shirts and dark trousers.
export const COBLA = [['flabiol', 0], ['xeremies', 0]];
export const BAND_LOOKS = { banda: { shirt: '#f5f5ef', pants: '#1f2230', tie: '#e8b830' }, cobla: { shirt: '#f5f5ef', pants: '#1f2230' } };
const BRASS = '#e2b13c', BRASS_D = '#b8872a', WOOD = '#1d1b1f', KEYS = '#c9ccd2', HEAD = '#f1ead8', REED = '#3a2015', BAG = '#7a5636';
const HIP = 0.78, REACH = 0.49, _o = new THREE.Object3D(), _m = new THREE.Matrix4(), _v = new THREE.Vector3();
const at = (a, b, t) => a.map((x, i) => x + (b[i] - x) * t);
// a square tube from a to b (person space), w thick: instruments aren't axis-aligned
function rod(v, a, b, w, color) {
  const g = new THREE.BoxGeometry(w, w, Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]));
  _o.position.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
  _o.lookAt(b[0], b[1], b[2]);
  _o.updateMatrix();
  return v.add(g.applyMatrix4(_o.matrix), color, 0);
}
// Point a straight arm's hand at a spot (person space): rotation x/z (Euler XYZ takes -y to (sin z, -cos z cos x,
// -cos z sin x)); closer than the arm is long, it shortens (a bent elbow, foreshortened) so the hand lands on it.
function grip(arm, x, y, z) {
  const dx = x - arm.position.x, dy = y - arm.position.y - HIP, dz = z - arm.position.z, l = Math.hypot(dx, dy, dz);
  arm.rotation.set(Math.atan2(-dz, -dy), 0, Math.asin(dx / l));
  arm.scale.y = Math.min(1, Math.max(0.65, l / REACH));
  arm.updateMatrix();
  _v.set(0, -REACH, 0).applyMatrix4(arm.matrix);
  return [_v.x, _v.y + HIP, _v.z]; // where the hand is
}
// Parts built in person space, baked into the torso or an arm (so skinCrowd merges them with the body, and a
// swinging arm swings its stick or cymbal)
function onTorso(p, v) { const m = v.mesh(); m.position.y = -HIP; p.torso.add(m); }
function onArm(arm, v) {
  const m = v.mesh();
  m.geometry.applyMatrix4(_m.makeTranslation(0, HIP, 0).multiply(arm.matrix).invert());
  arm.add(m);
}
export function buildMusician(kind, look = BAND_LOOKS.banda, p = buildPerson(look)) {
  const [L, R] = p.arms; // arms[0] is at +x: their left (they face +z)
  const t = new Vox(), l = new Vox(), r = new Vox();
  if (look.tie) t.box(0, 1.0, 0.135, 0.07, 0.32, 0.02, look.tie, 0).box(0, 1.27, 0.14, 0.1, 0.07, 0.03, look.tie, 0); // tie and knot
  const lips = [0, 1.46, 0.17];
  if (kind === 'clarinet') { // black, straight down-forward from the lips, silver rings, a small flared bell
    const b = [0, 0.98, 0.5];
    rod(t, lips, b, 0.05, WOOD);
    for (const k of [0.3, 0.56]) rod(t, at(lips, b, k), at(lips, b, k + 0.03), 0.06, KEYS);
    rod(t, at(lips, b, 0.86), at(lips, b, 0.97), 0.08, WOOD);
    rod(t, at(lips, b, 0.93), at(lips, b, 1.02), 0.11, WOOD);
    grip(L, ...at(lips, b, 0.28)); grip(R, ...at(lips, b, 0.52));
  } else if (kind === 'xeremies') { // Mallorcan bagpipes: a round bag held out at the left side below the arm, drones over that shoulder, chanter across both hands
    const x = 0.37, y = 1.01, z = 0.32; // three crossed boxes read as round; each one's faces clear the others'
    t.box(x, y - 0.2, z, 0.3, 0.4, 0.28, BAG, 0).box(x, y - 0.15, z, 0.36, 0.3, 0.2, BAG, 0).box(x, y - 0.14, z, 0.2, 0.28, 0.34, BAG, 0);
    rod(t, lips, [0.3, 1.19, 0.4], 0.03, REED); // the blowpipe, down into the bag
    for (const [bx, tx, ty, tz] of [[0.34, 0.5, 1.92, -0.2], [0.42, 0.66, 1.72, -0.12]]) { // two drones, each with a tip
      const a = [bx, 1.18, 0.24], b = [tx, ty, tz];
      rod(t, a, at(a, b, 0.93), 0.035, REED); // stops inside the tip: flush ends flickered
      rod(t, at(a, b, 0.86), b, 0.065, KEYS);
    }
    const top = [0.22, 1.19, 0.3], end = [-0.18, 0.87, 0.38]; // the chanter, out of the bag's inner side
    rod(t, top, end, 0.04, REED);
    rod(t, at(top, end, 0.93), at(top, end, 1.03), 0.075, REED);
    grip(L, ...at(top, end, 0.35)); grip(R, ...at(top, end, 0.62));
  } else if (kind === 'flabiol') { // the short pipe up in the left hand, the tamborí under that forearm, its skin outwards, the stick in the right
    const b = [0.03, 1.3, 0.62];
    rod(t, lips, b, 0.03, REED);
    grip(L, ...at(lips, b, 0.55));
    t.box(0.2, 1.0, 0.36, 0.3, 0.3, 0.14, '#8a5a2c');
    t.box(0.2, 1.02, 0.428, 0.26, 0.26, 0.03, HEAD, 0);
    rod(r, grip(R, -0.1, 1.08, 0.46), [0.14, 1.03, 0.47], 0.022, '#d8c39a');
  } else if (kind === 'sax') { // alto: neck from the lips, body down the chest, the bow and the bell turned up
    const top = [0.03, 1.34, 0.29], bot = [0.05, 0.9, 0.33];
    rod(t, lips, [0.02, 1.41, 0.26], 0.03, BRASS);
    rod(t, [0.02, 1.41, 0.26], top, 0.04, BRASS);
    rod(t, top, bot, 0.08, BRASS);
    rod(t, bot, [0.05, 0.9, 0.47], 0.09, BRASS);
    rod(t, [0.05, 0.87, 0.47], [0.05, 1.1, 0.48], 0.1, BRASS);
    rod(t, [0.05, 1.07, 0.48], [0.05, 1.17, 0.49], 0.16, BRASS_D);
    for (const k of [0.25, 0.45, 0.65]) rod(t, at(top, bot, k), at(top, bot, k + 0.04), 0.09, KEYS);
    grip(L, ...at(top, bot, 0.2)); grip(R, ...at(top, bot, 0.62));
  } else if (kind === 'trumpet') { // level from the lips, a touch raised: valves, then the bell
    const b = [0, 1.52, 0.74];
    rod(t, lips, at(lips, b, 0.97), 0.035, BRASS); // stops inside the bell: its end flush with the bell's mouth flickered
    t.box(0, 1.37, 0.43, 0.06, 0.1, 0.1, BRASS_D, 0);
    for (const k of [0, 1, 2]) t.box(0, 1.47, 0.4 + k * 0.03, 0.025, 0.07, 0.02, KEYS, 0); // valve buttons
    rod(t, at(lips, b, 0.78), at(lips, b, 0.9), 0.08, BRASS);
    rod(t, at(lips, b, 0.88), at(lips, b, 0.97), 0.12, BRASS);
    rod(t, at(lips, b, 0.95), b, 0.17, BRASS_D);
    grip(L, 0.02, 1.4, 0.42); grip(R, -0.02, 1.47, 0.44);
  } else if (kind === 'trombone') { // the slide forward and a little down, the bell above it, by the left cheek
    rod(t, lips, [0, 1.4, 0.98], 0.03, BRASS);
    rod(t, [0, 1.33, 0.26], [0, 1.28, 0.98], 0.03, BRASS);
    rod(t, [0, 1.26, 0.98], [0, 1.42, 0.98], 0.04, BRASS); // the slide's crook
    rod(t, [0, 1.3, 0.62], [0, 1.43, 0.62], 0.025, BRASS); // the brace the right hand holds
    rod(t, [0.07, 1.53, 0.08], [0.07, 1.53, 0.47], 0.04, BRASS);
    rod(t, [0.07, 1.53, 0.44], [0.07, 1.53, 0.55], 0.1, BRASS);
    rod(t, [0.07, 1.53, 0.53], [0.07, 1.53, 0.6], 0.18, BRASS_D);
    rod(t, [0, 1.46, 0.22], [0.07, 1.53, 0.1], 0.03, BRASS);
    grip(L, 0.05, 1.45, 0.27); grip(R, 0, 1.37, 0.62);
  } else if (kind === 'tuba') { // held against the chest, the bell up by the left side of the head
    rod(t, lips, [0, 1.34, 0.26], 0.03, BRASS);
    t.box(0.02, 0.92, 0.33, 0.28, 0.44, 0.22, BRASS);
    t.box(-0.08, 1.1, 0.46, 0.1, 0.14, 0.05, BRASS_D, 0); // valves
    t.box(0.19, 1.3, 0.31, 0.2, 0.3, 0.2, BRASS);
    t.box(0.19, 1.6, 0.31, 0.3, 0.1, 0.3, BRASS);
    t.box(0.19, 1.7, 0.31, 0.38, 0.05, 0.38, BRASS_D, 0);
    t.box(0.19, 1.72, 0.31, 0.26, 0.04, 0.26, '#6b4a14', 0); // the dark inside of the bell
    grip(L, 0.13, 1.25, 0.37); grip(R, -0.08, 1.18, 0.5);
  } else if (kind === 'bombo') { // bass drum on a harness, heads to the sides; the mallet swings in the right hand
    t.box(0, 0.75, 0.42, 0.26, 0.5, 0.5, '#a3182f');
    t.box(0, 0.79, 0.42, 0.3, 0.42, 0.42, HEAD, 0);
    for (const x of [-0.1, 0.1]) t.box(x, 0.74, 0.42, 0.03, 0.52, 0.52, BRASS, 0); // hoops
    for (const s of [1, -1]) t.box(s * 0.13, 1.05, 0.14, 0.05, 0.33, 0.02, '#26262e', 0); // harness straps
    grip(L, 0.1, 1.27, 0.42);
    const h = grip(R, -0.42, 1.08, 0.42);
    rod(r, h, [-0.2, 1.03, 0.42], 0.025, '#7a4a22');
    r.box(-0.195, 0.99, 0.42, 0.08, 0.08, 0.08, HEAD, 0);
  } else if (kind === 'caixa') { // snare at the left hip on a sling, a stick in each hand
    t.box(0.06, 0.86, 0.36, 0.34, 0.13, 0.34, KEYS);
    t.box(0.06, 0.885, 0.36, 0.35, 0.05, 0.35, '#a3182f', 0);
    t.box(0.06, 0.99, 0.36, 0.3, 0.012, 0.3, HEAD, 0);
    rod(t, [0.2, 0.98, 0.22], [-0.16, 1.37, 0.15], 0.04, '#26262e');
    rod(l, grip(L, 0.2, 1.1, 0.33), [0.08, 1.01, 0.4], 0.022, '#d8c39a');
    rod(r, grip(R, -0.1, 1.1, 0.33), [0.03, 1.01, 0.4], 0.022, '#d8c39a');
  } else if (kind === 'plats') { // a pair of cymbals, one in each hand, crashed together
    for (const [arm, v, s] of [[L, l, 1], [R, r, -1]]) {
      grip(arm, s * 0.12, 1.2, 0.4);
      v.box(s * 0.04, 1.03, 0.4, 0.016, 0.34, 0.22, BRASS, 0).box(s * 0.04, 1.09, 0.4, 0.016, 0.22, 0.34, BRASS, 0);
      v.box(s * 0.06, 1.17, 0.4, 0.03, 0.06, 0.06, BRASS_D, 0);
    }
  }
  onTorso(p, t);
  if (l.g.length) onArm(L, l);
  if (r.g.length) onArm(R, r);
  p.rest = [L.rotation.x, L.rotation.z, R.rotation.x, R.rotation.z];
  return p;
}
// Two rows at the ring's edge (front r 9.7 m, back 10.6, staggered so the back row plays between shoulders), centred
// on azimuth az (x = cos, z = sin), facing the middle. Only the first n of the line-up play: everyone else is hidden
// (scale 0, skinCrowd).
export function placeBand(band, n, az, lineup = 'banda') {
  const on = band.filter(p => p.lineup === lineup).slice(0, n), rows = [on.filter(p => !p.row), on.filter(p => p.row)];
  band.forEach(p => p.g.scale.setScalar(on.includes(p) ? 1 : 0));
  rows.forEach((row, k) => row.forEach((p, j) => {
    const r = 9.7 + k * 0.9, a = az + (j - (row.length - 1) / 2 + k * 0.5) * 0.85 / r;
    p.g.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
    p.g.rotation.set(0, Math.atan2(-p.g.position.x, -p.g.position.z), 0);
  }));
}
// 0 on the hit, up over most of the beat, then a quick stroke down onto the next one
const stroke = f => (f < 0.7 ? Math.sin((f / 0.7) * Math.PI / 2) : Math.cos(((f - 0.7) / 0.3) * Math.PI / 2));
const frac = x => x - Math.floor(x);
// The band plays the song's beat (beat: fractional beat index; live 0..1: 0 holds the instruments still). Winds nod
// on each beat and sway over two; the bombo and the caixa's right stick hit on the beat, the left stick between, the
// plats crash every other beat.
export function poseBand(band, beat, live = 1) {
  const nod = 0.05 * live * Math.cos(Math.PI * frac(beat)) ** 2, sway = 0.04 * live * Math.sin(Math.PI * beat);
  for (const p of band) {
    if (!p.g.scale.x) continue;
    const [L, R] = p.arms, [lx, lz, rx, rz] = p.rest;
    p.torso.rotation.set(nod, 0, sway);
    if (p.kind === 'bombo') {
      const s = stroke(frac(beat)) * live;
      R.rotation.x = rx - 0.25 * s; R.rotation.z = rz - 0.5 * s;
    } else if (p.kind === 'flabiol') {
      R.rotation.x = rx - 0.35 * stroke(frac(beat)) * live;
    } else if (p.kind === 'caixa') {
      R.rotation.x = rx - 0.45 * stroke(frac(beat)) * live;
      L.rotation.x = lx - 0.45 * stroke(frac(beat + 0.5)) * live;
    } else if (p.kind === 'plats') {
      const o = stroke(frac(beat / 2)) * live;
      L.rotation.z = lz + 0.4 * o; R.rotation.z = rz - 0.4 * o;
    }
  }
}
