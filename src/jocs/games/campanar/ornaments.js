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
const MOON = [C('#fbf3d8'), C('#d9cca4')];
export const IRON = C('#24170f');
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
export const box = (t, P, u0, u1, y0, y1, z0, z1, a, c, k, kSide = k) => prism(t, P, [[u0, y0, true], [u1, y0, true], [u1, y1, true], [u0, y1, true]], z0, z1, a, c, k, kSide);

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
  if (s.kind === 'escala' || s.kind === 'replà') splayedReveal(lit, P, s, tWall); // i18n-ok: a piece kind, never shown
  if (s.kind === 'escala') stairInside(dark, P, s, a, c, tWall, roomD, { y0: s.ySill + 0.02, n: 5, lamp: [-R * 0.3, s.ySill + 0.2, 0.4] });
  if (s.kind === 'replà') stairInside(dark, P, s, a, c, tWall, roomD, { y0: s.ySill + 0.06, flat: 0.55, n: 3, lamp: [-R * 0.2, s.ySill + 0.2, 0.45], front: true }); // i18n-ok
}
// A10's light: the reveal splayed from the wall's face in to a narrower round-headed light, its sill sloping up into it.
// Its floor holds the whole opening (arches.js STAIR), so nothing is cut to the floor's heights
function splayedReveal(lit, P, s, tWall, d = s.hw * 0.18) {
  const rim = (hw, y0) => [[-hw, y0], ...Array.from({ length: 17 }, (_, j) => [-Math.cos(Math.PI * j / 16) * hw, s.ySpring + Math.sin(Math.PI * j / 16) * hw]), [hw, y0]];
  const o = rim(s.hw, s.ySill), i = rim(s.hw - d, s.ySill + d * 0.7), zi = -tWall * 0.92;
  o.forEach((p, j) => {
    const q = o[(j + 1) % o.length], pi = i[j], qi = i[(j + 1) % i.length];
    lit.quad(P(p[0], p[1], 0), P(q[0], q[1], 0), P(qi[0], qi[1], zi), P(pi[0], pi[1], zi), ARCH, ARCH, JAMB, JAMB);
  });
}
const TREAD = [C('#e6a862'), C('#6b4426')], STRINGER = C('#2a190d'), HANDRAIL = C('#3b2414'), LAMP = [C('#fff3cf'), C('#ffb257'), C('#22130a')];
// A10's stair seen through its light: a landing (`flat` of the span, its floor at y0) and n steps climbing to the right,
// a dark band against a lamp's warm light on the back wall (lamp: [u, y, its glow's radius]), their treads catching it:
// the play camera looks down through the light, so the wall under the flight shows lit too; a handrail over the walk
// line on iron balusters, along the back wall or along the front (a landing's)
function stairInside(dark, P, s, a, c, tWall, roomD, { y0, flat = 0, n, lamp, front = false }) {
  const w = s.hw * 1.25, uF = -w + 2 * w * flat, run = (w - uF) / n, rise = Math.min(0.06, run), zB = -roomD, zF = -tWall - 0.01;
  const disc = (u, y, r, m) => [[u, y], ...Array.from({ length: m + 1 }, (_, j) => [u + Math.cos(j * 2 * Math.PI / m) * r, y + Math.sin(j * 2 * Math.PI / m) * r])];
  const [lu, ly, lr] = lamp;
  fan(dark, P, disc(lu, ly, lr, 16), zB + 0.002, a, c, (u, y) => LAMP[1].clone().lerp(LAMP[2], Math.min(1, Math.hypot(u - lu, y - ly) / lr)));
  fan(dark, P, disc(lu, ly, 0.014, 8), zB + 0.004, a, c, () => LAMP[0]); // the lamp itself
  const warm = u => TREAD[0].clone().lerp(TREAD[1], Math.min(1, Math.abs(u - lu) / (w * 1.5)));
  if (flat) box(dark, P, -w, uF, y0 - 0.04, y0, zB, zF, a, c, STRINGER, warm((uF - w) / 2));
  for (let k = 0; k < n; k++) { const u = uF + k * run; box(dark, P, u, u + run, y0 + k * rise - 0.03, y0 + (k + 1) * rise, zB, zF, a, c, STRINGER, warm(u + run / 2)); }
  const h = 0.1, top = u => y0 + (u < uF ? 0 : (Math.floor((u - uF) / run) + 1) * rise), rail = u => y0 + h + Math.max(0, u - uF) / run * rise;
  const [z0, z1] = front ? [zF - 0.025, zF - 0.01] : [zB + 0.02, zB + 0.035];
  const bar = (u0, u1) => [[u0, rail(u0), true], [u1, rail(u1), true], [u1, rail(u1) + 0.014, true], [u0, rail(u0) + 0.014, true]];
  for (const [u0, u1] of [[-w, uF], [uF, w]]) if (u1 - u0 > 1e-4) prism(dark, P, bar(u0, u1), z0, z1, a, c, HANDRAIL);
  for (let u = -w + run / 2; u < w; u += front ? run / 2 : run) box(dark, P, u - 0.004, u + 0.004, top(u), rail(u), z0 + 0.003, z1 - 0.003, a, c, IRON);
}

// a block along a corner's diagonal: from s0 to s1 out of the corner c (dir out, side across), w0..w1 wide, its bottom
// y0 and top y1 level, or sloping as [y at s0, y at s1]
export function beam(t, c, dir, side, s0, s1, w0, w1, y0, y1, k, kSide = STEP) {
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
// F1: a gothic dragon out of corner c, read in profile: clawed forelegs gripping the cornice, bat wings folded up over its
// shoulders, a scaled neck with a spiked crest, a horned head whose open jaws show the dark throat, the spout. Its masses
// are sleeves round a run, lit on top and dark beneath; over the floor's top (y over FLOOR) every part keeps out of both
// walls' lines (s > |sw|), where the next slab slides and a cut's overhang falls.
function dragon(t, c, dir, side, y, k = 1.7) {
  const DEEP = new Color('#5c3e24'), MOUTH = new Color('#2b1a0f');
  const P = (s, sw, h) => new Vector3(c.x + (dir.x * s + side.x * sw) * k, y + h * k, c.z + (dir.z * s + side.z * sw) * k);
  const shade = (lit, f) => DEEP.clone().lerp(lit, f);
  // a sleeve through rings [s, y, sw, half width, half height, its stone] square to the run, n-sided, capped at both ends
  const tube = (pts, lit = ARCH, n = 6, under = 0.12) => {
    const rings = pts.map(([s, h, sw, rw, rh, k1 = lit], i) => {
      const [s0, h0] = pts[Math.max(0, i - 1)], [s1, h1] = pts[Math.min(pts.length - 1, i + 1)], l = Math.hypot(s1 - s0, h1 - h0) || 1;
      return Array.from({ length: n }, (_, j) => {
        const u = Math.cos(j * 2 * Math.PI / n), v = Math.sin(j * 2 * Math.PI / n);
        return [P(s - (h1 - h0) / l * rh * u, sw + rw * v, h + (s1 - s0) / l * rh * u), shade(k1, under + (1 - under) * (0.5 + 0.5 * u))];
      });
    });
    rings.slice(1).forEach((r, i) => r.forEach((e, j) => {
      const a = rings[i][j], b = rings[i][(j + 1) % n], d = r[(j + 1) % n];
      t.quad(a[0], b[0], d[0], e[0], a[1], b[1], d[1], e[1]);
    }));
    for (const end of [rings[0], rings.at(-1)]) for (let j = 1; j < n - 1; j++) t.tri([end[0][0], end[j][0], end[j + 1][0]], [end[0][1], end[j][1], end[j + 1][1]]);
  };
  // a flat fan [s, y, sw, its colour] from its first point
  const fan = pts => pts.slice(2).forEach((p, j) => t.tri([pts[0], pts[j + 1], p].map(([s, h, sw]) => P(s, sw, h)), [pts[0][3], pts[j + 1][3], p[3]]));
  tube([[-0.03, 0.07, 0, 0.055, 0.055], [0.04, 0.085, 0, 0.072, 0.066], [0.11, 0.1, 0, 0.062, 0.056]]); // its crouching body
  // the neck in scale collars, the skull, the upper jaw down to the snout
  tube([[0.1, 0.1, 0, 0.056, 0.056], [0.15, 0.15, 0, 0.05, 0.05, SILL], [0.2, 0.187, 0, 0.044, 0.042], [0.25, 0.207, 0, 0.04, 0.038, SILL],
    [0.3, 0.222, 0, 0.044, 0.04, SILL], [0.345, 0.215, 0, 0.036, 0.03], [0.39, 0.2, 0, 0.026, 0.022], [0.43, 0.19, 0, 0.02, 0.016], [0.45, 0.186, 0, 0.012, 0.01]], ARCH, 6, 0.08);
  tube([[0.29, 0.185, 0, 0.03, 0.018], [0.35, 0.15, 0, 0.024, 0.013], [0.405, 0.125, 0, 0.016, 0.01], [0.42, 0.123, 0, 0.008, 0.006]], ARCH, 6, 0.05); // the lower jaw, open
  for (const sw of [-0.016, 0.016]) fan([[0.28, 0.2, sw, MOUTH], [0.34, 0.186, sw, MOUTH], [0.42, 0.176, sw, MOUTH], [0.4, 0.134, sw, MOUTH], [0.34, 0.16, sw, MOUTH]]); // the throat
  for (const sw of [-0.014, 0.014]) {
    for (const s of [0.375, 0.4]) fan([[s - 0.007, 0.182, sw, SILL], [s + 0.007, 0.18, sw, SILL], [s, 0.162, sw, ARCH]]); // its teeth
    for (const s of [0.36, 0.385]) fan([[s - 0.007, 0.156, sw, SILL], [s + 0.007, 0.15, sw, SILL], [s - 0.002, 0.172, sw, ARCH]]);
    fan([[0.42, 0.178, sw, SILL], [0.436, 0.176, sw, SILL], [0.432, 0.142, sw, ARCH]]); // a fang over the lip
  }
  for (const sg of [-1, 1]) {
    fan([[0.293, 0.222, sg * 0.041, MOUTH], [0.322, 0.222, sg * 0.04, MOUTH], [0.322, 0.238, sg * 0.04, MOUTH], [0.293, 0.236, sg * 0.041, MOUTH]]); // an eye socket
    tube([[0.285, 0.245, sg * 0.03, 0.014, 0.01], [0.335, 0.237, sg * 0.03, 0.01, 0.008]], SILL, 4); // its brow
    // a horn sweeping back
    tube([[0.29, 0.25, sg * 0.024, 0.017, 0.017], [0.275, 0.3, sg * 0.03, 0.013, 0.013],
      [0.24, 0.345, sg * 0.034, 0.008, 0.008], [0.195, 0.372, sg * 0.03, 0.001, 0.001]], SILL, 5);
    // a foreleg: shoulder, elbow back, wrist forward on the cornice, three claws hooked over its edge
    tube([[0.07, 0.11, sg * 0.05, 0.028, 0.028], [0.035, 0.05, sg * 0.055, 0.022, 0.022], [0.1, 0.005, sg * 0.05, 0.018, 0.018], [0.118, -0.005, sg * 0.05, 0.02, 0.013]], ARCH, 5);
    for (const o of [-0.016, 0, 0.016]) tube([[0.11, 0, sg * 0.05 + o, 0.008, 0.008], [0.145, -0.012, sg * 0.05 + o * 1.3, 0.006, 0.006], [0.16, -0.04, sg * 0.05 + o * 1.4, 0.001, 0.001]], SILL, 4);
    // a wing folded up over the shoulder: its arm to the wrist, a finger to the tip, the membrane between its fingers
    // scalloped, in shade where it folds against the body
    const W = [0.2, 0.32, sg * 0.078], tip = [0.15, 0.43, sg * 0.08], F = [[0.09, 0.36, sg * 0.07], [0.075, 0.26, sg * 0.064]];
    tube([[0.05, 0.13, sg * 0.05, 0.016, 0.016], W.concat(0.012, 0.012), tip.concat(0.002, 0.002)], SILL, 4);
    for (const f of F) tube([W.concat(0.008, 0.008), f.concat(0.002, 0.002)], SILL, 4);
    const wk = ARCH.clone().lerp(DEEP, 0.45);
    fan([[...W, ARCH], [...tip, SILL], [0.13, 0.375, sg * 0.074, wk], [...F[0], wk], [0.11, 0.29, sg * 0.068, wk], [...F[1], wk],
      [0.085, 0.19, sg * 0.058, DEEP], [0.05, 0.13, sg * 0.05, DEEP]]);
  }
  // its crest: spikes down its back and neck
  for (const [s, top] of [[0.02, 0.15], [0.08, 0.16], [0.15, 0.2], [0.2, 0.229], [0.25, 0.245]]) {
    fan([[s - 0.02, top - 0.006, 0, STEP], [s + 0.015, top - 0.006, 0, STEP], [s - 0.025, top + 0.03, 0, SILL]]);
  }
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
    else if (corners.includes('B5') && !(sx > 0 && sz < 0 && orn.includes('H4'))) gargoyle(t, c, dir, side, y0 + 0.3); // H4's lantern there (upper-pieces.js)
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
