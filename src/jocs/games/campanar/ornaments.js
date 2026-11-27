// The prototype's ornaments in 3D (ornament-plan.js picks them, openings.js pools them; no new material): the face
// pieces' own parts inside their openings (arches.js), and what a floor wears over its course: B1's Lombard lesenes and
// the arches under a string course, B5's drain gargoyles and F1's dragon at the corners. Each floor builds only its
// own heights. The glass is the dark mesh's vertex colour, unlit: it reads as light in the night over 74 m.
import { Color, Vector3 } from 'three';
import { FLOOR } from './rules.js';
import { tris, prism, sector, ARCH, STEP, SILL, JAMB } from './relief.js';
import { halfWidth, walls, at } from './arches.js';
import { quoinOf } from './stone.js';
import { arcade } from './mouldings.js';

const C = c => new Color(c);
const GLASS = { amber: [C('#ffe6a0'), C('#d97a26')], blue: [C('#5d8bd6'), C('#1b2f6b')], night: [C('#2f3d6e'), C('#151a33')] };
const MANTLE = [C('#f6f3ff'), C('#9fb6e8')], HALO = C('#ffd76a'), FACE = C('#f3dcbf'); // F8's Virgin, in the blue glass
const MOON = [C('#fbf3d8'), C('#d9cca4')], IRON = C('#24170f'), SHADE = C('#5a3a24');
// an opening's glass at height y over its foot: the rose lightest in its middle, the Virgin's blue darkest at the foot
export function glassAt(s, y) {
  const [hi, lo] = GLASS[s.glass], mid = (s.ySill + s.yApex) / 2, h = (s.yApex - s.ySill) / 2;
  const k = s.glass === 'amber' ? Math.abs(y - mid) / h : 1 - (y - s.ySill) / (s.yApex - s.ySill);
  return hi.clone().lerp(lo, Math.max(0, Math.min(1, k)));
}
// a ring of n sectors round (u, y), r0..r1, from z0 to z1 out of the wall
const ring = (t, P, u, y, r0, r1, z0, z1, a, c, k, n = 20, ends = false, gap = 0) => {
  for (let j = 0; j < n; j++) {
    const t0 = j * 2 * Math.PI / n, t1 = (j + 1) * 2 * Math.PI / n - gap;
    prism(t, P, sector(u, y, r0, r1, t0, t1, ends), z0, z1, a, c, Array.isArray(k) ? k[j % k.length] : k, STEP);
  }
};
// a polygon [u, y] (convex, or star-shaped about its first point) in colours col(u, y), cut to a..c, flat at z
function fan(t, P, poly, z, a, c, col) {
  for (let j = 1; j < poly.length - 1; j++) {
    const q = [poly[0], poly[j], poly[j + 1]].map(p => [...p, false]);
    const lo = [a, y => y >= a - 1e-6], hi = [c, y => y <= c + 1e-6];
    let cl = q;
    for (const [lim, keep] of [lo, hi]) { // Sutherland-Hodgman on the triangle, as relief.js clipY
      const out = [];
      cl.forEach((p, i) => {
        const n = cl[(i + 1) % cl.length], pin = keep(p[1]), nin = keep(n[1]);
        if (pin) out.push(p);
        if (pin !== nin) out.push([p[0] + (n[0] - p[0]) * (lim - p[1]) / (n[1] - p[1]), lim]);
      });
      cl = out;
    }
    for (let i = 1; i < cl.length - 1; i++) { const tri = [cl[0], cl[i], cl[i + 1]]; t.tri(tri.map(p => P(p[0], p[1], z)), tri.map(p => col(p[0], p[1]))); }
  }
}
const box = (t, P, u0, u1, y0, y1, z0, z1, a, c, k, kSide = k) => prism(t, P, [[u0, y0, true], [u1, y0, true], [u1, y1, true], [u0, y1, true]], z0, z1, a, c, k, kSide);

// an opening's own parts (s.kind) on one wall, cut to a..c: lit stone in `lit`, glass, the Virgin, moon and iron in `dark`
export function pieceSlice(s, lit, dark, P, a, c, tWall, roomD) {
  const yc = (s.ySill + s.yApex) / 2, R = s.hw;
  if (s.kind === 'ocul') ring(lit, P, 0, yc, R, R * 1.5, 0, 0.022, a, c, [SILL, ARCH], 12, true, 0.05); // its voussoirs
  if (s.kind === 'rosassa') { // a boss, six spokes, six petals, set in the reveal; dentils round its moulding
    const z0 = -tWall * 0.5, z1 = -tWall * 0.1;
    ring(lit, P, 0, yc, 0, R * 0.16, z0, z1 + 0.01, a, c, SILL, 12);
    for (let k = 0; k < 6; k++) {
      const th = k * Math.PI / 3, w = 0.016, d = [Math.cos(th), Math.sin(th)], n = [-d[1], d[0]];
      const pt = (r, sw) => [d[0] * r + n[0] * sw, yc + d[1] * r + n[1] * sw, true];
      prism(lit, P, [pt(R * 0.15, -w), pt(R, -w), pt(R, w), pt(R * 0.15, w)], z0, z1, a, c, ARCH, STEP);
      const pc = [Math.cos(th + Math.PI / 6) * R * 0.56, yc + Math.sin(th + Math.PI / 6) * R * 0.56];
      ring(lit, P, pc[0], pc[1], R * 0.4, R * 0.44, z0, z1, a, c, ARCH, 18);
    }
    ring(lit, P, 0, yc, R + s.band + 0.006, R + s.band + 0.045, 0, 0.03, a, c, SILL, 40, true, 0.07);
  }
  if (s.kind === 'candela') { // F8 (Marc: the Virgin, nothing of Valls): her mantle from her head to the sill, her face, a gold halo
    const y0 = s.ySill + 0.05, H = s.ySpring + (s.yApex - s.ySpring) * 0.45 - y0, w = R * 0.8, z = -roomD + 0.012;
    const hy = y0 + H * 0.8, hr = Math.min(w * 0.24, H * 0.11); // her head
    const disc = (u, y, r) => [[u, y], ...Array.from({ length: 21 }, (_, j) => [u + Math.cos(j * Math.PI / 10) * r, y + Math.sin(j * Math.PI / 10) * r])];
    fan(dark, P, disc(0, hy, hr * 1.7), z, a, c, () => HALO);
    const mantle = [[0, y0 + H * 0.35], [w * 0.8, y0], [w * 0.5, y0 + H * 0.45], [w * 0.34, y0 + H * 0.72], [hr * 1.2, hy + hr * 0.6], [0, hy + hr * 1.35],
      [-hr * 1.2, hy + hr * 0.6], [-w * 0.34, y0 + H * 0.72], [-w * 0.5, y0 + H * 0.45], [-w * 0.8, y0], [w * 0.8, y0]]; // counter-clockwise, as the moon's, closed along the sill
    fan(dark, P, mantle, z + 0.002, a, c, (u, y) => MANTLE[0].clone().lerp(MANTLE[1], Math.min(1, Math.abs(u) / w * 1.3)));
    fan(dark, P, disc(0, hy, hr), z + 0.004, a, c, () => FACE);
  }
  if (s.kind === 'lluna') { // the moon wedged in the window, behind three bars and a cross bar
    const m = [R * 0.12, s.ySpring - R * 0.15], mr = R * 0.86, pts = [m];
    for (let j = 0; j <= 32; j++) pts.push([m[0] + Math.cos(j * Math.PI / 16) * mr, m[1] + Math.sin(j * Math.PI / 16) * mr]);
    const mare = (u, y) => Math.hypot(u - m[0] + mr * 0.3, y - m[1] - mr * 0.25) < mr * 0.32 || Math.hypot(u - m[0] - mr * 0.35, y - m[1] + mr * 0.3) < mr * 0.22;
    fan(dark, P, pts, -tWall * 0.75, a, c, (u, y) => MOON[mare(u, y) ? 1 : 0]);
    for (const u of [-R * 0.5, 0, R * 0.5]) {
      let top = s.ySpring;
      while (top < s.yApex && halfWidth(top + 0.01, s) > Math.abs(u) + 0.008) top += 0.01;
      box(dark, P, u - 0.008, u + 0.008, s.ySill, top, -tWall * 0.5, -tWall * 0.3, a, c, IRON);
    }
    box(dark, P, -R, R, s.ySpring - 0.008, s.ySpring + 0.008, -tWall * 0.5, -tWall * 0.3, a, c, IRON);
  }
  if (s.kind === 'escala') for (let k = 0; k < 3; k++) { // its steps climbing across, in the shade behind the window
    const u0 = -R + k * R * 0.66;
    box(dark, P, u0, u0 + R * 0.7, s.ySill, s.ySill + 0.04 + k * 0.05, -roomD, -roomD + 0.09, a, c, SHADE, SHADE.clone().multiplyScalar(0.7));
  }
  if (s.kind === 'replà') { // i18n-ok: a piece kind, never shown; the landing's floor and its iron railing
    box(dark, P, -R, R, s.ySill, s.ySill + 0.04, -roomD, -tWall, a, c, SHADE);
    box(dark, P, -R, R, s.ySill + 0.17, s.ySill + 0.185, -tWall - 0.05, -tWall - 0.035, a, c, IRON);
    for (let k = 0; k < 6; k++) { const u = -R + (k + 0.5) * R / 3; box(dark, P, u - 0.005, u + 0.005, s.ySill + 0.04, s.ySill + 0.17, -tWall - 0.05, -tWall - 0.04, a, c, IRON); }
  }
}

// a block along a corner's diagonal: from s0 to s1 out of the corner c (dir out, side across), w0..w1 wide, its bottom
// y0 and top y1 level, or sloping as [y at s0, y at s1]
function beam(t, c, dir, side, s0, s1, w0, w1, y0, y1, k, kSide = STEP) {
  const p = (s, sw, y, e) => new Vector3(c.x + dir.x * s + side.x * sw, y[e] ?? y, c.z + dir.z * s + side.z * sw);
  const face = y => [p(s0, -w0, y, 0), p(s1, -w1, y, 1), p(s1, w1, y, 1), p(s0, w0, y, 0)], A = face(y0), T = face(y1);
  t.quad(T[0], T[3], T[2], T[1], k); // its top, its two sides, its end and its underside
  t.quad(A[0], A[1], T[1], T[0], kSide);
  t.quad(A[2], A[3], T[3], T[2], kSide);
  t.quad(A[1], A[2], T[2], T[1], k);
  t.quad(A[0], A[3], A[2], A[1], JAMB);
}
// a drain gargoyle out of corner c: a spout, a head with its jaws open, a dog's ears
function gargoyle(t, c, dir, side, y) {
  beam(t, c, dir, side, -0.04, 0.3, 0.06, 0.045, y + 0.02, y + 0.1, ARCH);
  beam(t, c, dir, side, 0.24, 0.4, 0.07, 0.055, y + 0.05, y + 0.14, SILL); // the head and its upper jaw
  beam(t, c, dir, side, 0.26, 0.38, 0.05, 0.04, y - 0.01, y + 0.025, ARCH); // the lower jaw, the mouth between
  for (const sw of [-0.045, 0.045]) beam(t, { x: c.x + side.x * sw, z: c.z + side.z * sw }, dir, side, 0.24, 0.29, 0.015, 0.01, y + 0.14, y + 0.17, STEP);
}
// F1: a gothic dragon out of corner c, read in profile: clawed forelegs gripping the cornice, bat wings folded against
// the corner, a scaled neck with a spiked crest, a horned head whose open jaws show the dark throat, the spout
function dragon(t, c, dir, side, y, k = 1.5) {
  const Y = v => (Array.isArray(v) ? v.map(e => y + e * k) : y + v * k);
  const B = (s0, s1, w0, w1, ya, yb, col, sw = 0, colSide = STEP) => beam(t, { x: c.x + side.x * sw * k, z: c.z + side.z * sw * k }, dir, side,
    s0 * k, s1 * k, w0 * k, w1 * k, Y(ya), Y(yb), col, colSide);
  B(-0.04, 0.07, 0.055, 0.05, [0, 0.01], 0.12, ARCH); // its shoulders
  for (const sw of [-1, 1]) {
    B(-0.03, 0.04, 0.004, 0.004, [0.085, 0.12], [0.21, 0.16], ARCH, sw * 0.06); // a wing's membrane, scalloped between its fingers
    B(0.04, 0.1, 0.004, 0.004, [0.1, 0.115], [0.16, 0.12], ARCH, sw * 0.06);
    B(-0.03, 0.1, 0.008, 0.006, [0.2, 0.115], [0.225, 0.13], SILL, sw * 0.062); // its leading bone
    B(-0.05, -0.02, 0.006, 0.002, [0.22, 0.22], [0.25, 0.23], STEP, sw * 0.062); // the claw at its elbow
    B(0.02, 0.06, 0.012, 0.01, [0.06, 0.005], [0.1, 0.035], ARCH, sw * 0.062); // a foreleg down the string course's face, under the wing
    for (const toe of [-0.008, 0.008]) B(0.045, 0.075, 0.006, 0.002, [0.005, -0.03], [0.03, -0.015], STEP, sw * 0.062 + toe); // its claws under its edge
    B(0.24, 0.255, 0.008, 0.008, 0.12, 0.135, JAMB, sw * 0.042, JAMB); // an eye
    B(0.17, 0.28, 0.003, 0.012, [0.22, 0.15], [0.235, 0.17], STEP, sw * 0.026); // a horn sweeping back
  }
  // the neck in scale collars, each a little narrower than the one behind it, rising to the head
  [[0.07, 0.14, 0.045, 0.04, [0.03, 0.045], [0.12, 0.13]], [0.14, 0.2, 0.04, 0.036, [0.045, 0.06], [0.13, 0.14]],
    [0.2, 0.25, 0.036, 0.034, [0.06, 0.07], [0.14, 0.15]]].forEach(([s0, s1, w0, w1, ya, yb], j) => B(s0, s1, w0, w1, ya, yb, j % 2 ? ARCH : SILL));
  for (const [s, top] of [[0, 0.12], [0.07, 0.125], [0.14, 0.135], [0.2, 0.145]]) B(s, s + 0.05, 0.006, 0.002, top, [top + 0.05, top], STEP); // its crest
  B(0.23, 0.3, 0.045, 0.04, [0.07, 0.075], [0.165, 0.15], ARCH); // the skull
  B(0.29, 0.4, 0.035, 0.022, 0.085, [0.15, 0.11], SILL); // the upper jaw
  B(0.28, 0.38, 0.03, 0.018, [0.06, 0.02], [0.08, 0.04], ARCH); // the lower jaw, open
  B(0.27, 0.37, 0.016, 0.016, [0.065, 0.042], [0.09, 0.085], JAMB, 0, JAMB); // the throat between them: the spout
  for (const sw of [-0.015, 0.015]) B(0.37, 0.39, 0.005, 0.003, [0.06, 0.065], 0.085, SILL, sw); // its fangs
}

// what floor y0 in plan r wears over its course (orn: 'lesenes', 'lombard', 'B5', 'F1') → its lit geometry
export function ornamentSlice(r, y0, orn) {
  const t = tris(), top = orn.includes('lombard') ? 0.16 : FLOOR; // under a string course the lesenes stop at it
  for (const b of walls(r, y0)) {
    const P = (u, y, n) => at(b, u, y, n), half = (b.u1 - b.u0) / 2, q = quoinOf(b.u1 - b.u0), lw = Math.min(0.06, half * 0.18);
    if (orn.includes('lesenes')) for (const sg of [-1, 1]) box(t, P, sg > 0 ? half - q - lw : -half + q, sg > 0 ? half - q : -half + q + lw, 0, top, 0, 0.018, -9, 9, ARCH, STEP);
    if (orn.includes('lombard')) arcade(t, P, b, 0.02, 0.07, 0.16, 0.018, 0, q + lw);
  }
  const corners = orn.filter(o => o === 'B5' || o === 'F1');
  if (corners.length) for (const [sx, sz] of [[1, 1], [1, -1], [-1, -1], [-1, 1]]) {
    const c = { x: r.x + sx * r.w / 2, z: r.z + sz * r.d / 2 }, dir = new Vector3(sx, 0, sz).normalize(), side = new Vector3(-sz, 0, sx).normalize();
    // the dragon at the corner the camera sees in profile (on the screen's left), the drain gargoyles at the others
    if (sx < 0 && sz > 0 && corners.includes('F1')) dragon(t, c, dir, side, y0 + 0.15);
    else if (corners.includes('B5')) gargoyle(t, c, dir, side, y0 + 0.3);
  }
  if (orn.includes('E1')) storkNest(t, walls(r, y0).find(b => b.mat === 4)); // the camera's wall (arches.js CAM)
  return t.geo();
}

const TWIG = [C('#6e4a2c'), C('#8b6239'), C('#5a3b22'), C('#9c7346')], CUP = C('#3f2a18');
const WHITE = C('#f4f1ea'), BLACK = C('#1c1917'), RED = C('#d2401e');
const hash = j => { const x = Math.sin(j * 127.1) * 43758.5453; return x - Math.floor(x); }; // a twig's fixed jitter
// the stork in profile (u forward, y up from its feet), each part [outline, half its thickness across, colour]: long
// red legs, a white body with black flight feathers, an upright neck, a long red beak
const STORK = [
  ...[-0.01, 0.012].map((u, j) => [[[u - 0.005, 0], [u + 0.005, 0], [u + 0.005, 0.1], [u - 0.005, 0.1]], [-0.016, 0.006][j], RED, 0.01]),
  [[[0, 0.085], [0.05, 0.105], [0.06, 0.15], [-0.015, 0.168], [-0.1, 0.13], [-0.065, 0.095]], 0.036, WHITE],
  [[[-0.04, 0.1], [-0.01, 0.11], [-0.03, 0.137], [-0.112, 0.135], [-0.09, 0.104]], 0.038, BLACK], // only the wing's rear: a white back
  [[[0.028, 0.14], [0.058, 0.135], [0.072, 0.225], [0.048, 0.232]], 0.017, WHITE],
  [[[0.046, 0.218], [0.076, 0.214], [0.082, 0.238], [0.064, 0.252], [0.046, 0.24]], 0.021, WHITE],
  [[[0.076, 0.218], [0.15, 0.2], [0.08, 0.236]], 0.009, RED],
  [[[0.064, 0.232], [0.07, 0.232], [0.07, 0.238], [0.064, 0.238]], 0.022, BLACK],
];
// E1: a stork standing in its twig nest on the parapet's gable (mouldings.js remat, its apex at the floor's top) on wall
// b, side on to the camera: rings of twigs, a dark cup and stray sticks; a little over life size, so it reads from afar
function storkNest(t, b, R = 0.16, h = 0.085, S = 1.5) {
  const o = at(b, 0, 0.455, 0.03);
  for (let L = 0; L < 4; L++) for (let j = 0; j < 9; j++) { // its rim, wider up, the sticks of each ring across the ones under
    const th = (j + L * 0.37) * 2 * Math.PI / 9, rL = R * (0.72 + 0.1 * L), rad = new Vector3(Math.cos(th), 0, Math.sin(th));
    const c = { x: o.x + rad.x * rL, z: o.z + rad.z * rL }, len = 2 * Math.PI * rL / 9 * 0.75, dy = (hash(L * 9 + j) - 0.5) * 0.012;
    beam(t, c, new Vector3(-rad.z, 0, rad.x), rad, -len, len, 0.018, 0.018, o.y + L * h / 4 + dy, o.y + (L + 1) * h / 4 + 0.01 + dy, TWIG[(j + L) % 4], TWIG[(j + L + 2) % 4]);
  }
  for (let j = 0; j < 4; j++) {
    const th = j * Math.PI / 4, dir = new Vector3(Math.cos(th), 0, Math.sin(th)), side = new Vector3(-Math.sin(th), 0, Math.cos(th));
    beam(t, o, dir, side, -R * 0.8, R * 0.8, 0.05, 0.05, o.y, o.y + h * 0.6, CUP, TWIG[2]);
  }
  for (let j = 0; j < 7; j++) { // stray sticks
    const th = (j + 0.5) * 2 * Math.PI / 7 + hash(j) * 0.5, rad = new Vector3(Math.cos(th), 0, Math.sin(th)), y = o.y + h * (0.3 + 0.6 * hash(j + 20));
    beam(t, o, rad, new Vector3(-rad.z, 0, rad.x), R * 0.7, R * (1.25 + 0.2 * hash(j + 40)), 0.006, 0.004, y, y + 0.01, TWIG[j % 4]);
  }
  // the stork on the cup, its side to the camera (which looks down the (-1, -1, -1) diagonal): forward to the screen's right
  const fw = new Vector3(1, 0, -1).normalize(), across = new Vector3(1, 0, 1).normalize(), foot = o.clone().setY(o.y + h * 0.25); // its feet down in the cup, the rim over them
  const Q = (u, y, n) => foot.clone().addScaledVector(fw, u * S).addScaledVector(across, n * S).setY(foot.y + y * S);
  for (const [poly, w, k, w1] of STORK) prism(t, Q, poly.map(p => [...p, true]), w1 === undefined ? -w : w, w1 === undefined ? w : w + w1, -9, 9, k, k.clone().multiplyScalar(0.8));
}
