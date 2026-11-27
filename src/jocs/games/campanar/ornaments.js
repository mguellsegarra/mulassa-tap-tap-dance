// The prototype's ornaments in 3D (ornament-plan.js picks them, openings.js pools them; no new material): the face
// pieces' own parts inside their openings (arches.js), and what a floor wears over its course: B1's Lombard lesenes and
// the arches under a string course, B5's drain gargoyles and F1's Mulassa at the corners. Each floor builds only its
// own heights. The glass is the dark mesh's vertex colour, unlit: it reads as light in the night over 74 m.
import { Color, Vector3 } from 'three';
import { FLOOR } from './rules.js';
import { tris, prism, sector, ARCH, STEP, SILL, JAMB } from './relief.js';
import { halfWidth, walls, at } from './arches.js';
import { quoinOf } from './stone.js';
import { arcade } from './mouldings.js';

const C = c => new Color(c);
const GLASS = { amber: [C('#ffe6a0'), C('#d97a26')], flame: [C('#e8692a'), C('#7a160f')], night: [C('#2f3d6e'), C('#151a33')] };
const FLAME = [C('#fff4b8'), C('#ff9b2e')], MOON = [C('#fbf3d8'), C('#d9cca4')], IRON = C('#24170f'), SHADE = C('#5a3a24');
// an opening's glass at height y over its foot: the rose lightest in its middle, the flame's red darkest at the foot
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

// an opening's own parts (s.kind) on one wall, cut to a..c: lit stone in `lit`, glass, flame, moon and iron in `dark`
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
  if (s.kind === 'candela') { // the Candela's flame in the glass, leaning a little as a candle's does
    const y0 = s.ySill + 0.06, h = s.ySpring - y0 + (s.yApex - s.ySpring) * 0.4, w = R * 0.62;
    const pts = [[0, y0 + h * 0.3]]; // its outline, then wound to face out as the niche's quads do
    for (let j = 0; j <= 16; j++) {
      const t = j / 16, side = t < 0.5 ? -1 : 1, v = side < 0 ? t * 2 : (1 - t) * 2; // up the left, down the right
      pts.push([side * w * Math.sin(Math.PI * v ** 0.8) * (1 - v * 0.35) + v ** 3 * w * 0.25, y0 + h * v]);
    }
    fan(dark, P, [pts[0], ...pts.slice(1).reverse()], -roomD + 0.012, a, c, (u, y) => FLAME[0].clone().lerp(FLAME[1], Math.min(1, Math.abs(u) / w + Math.abs(y - y0 - h * 0.3) / h)));
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

// a block along a corner's diagonal: from s0 to s1 out of the corner c (dir out, side across), w wide, y0..y1
function beam(t, c, dir, side, s0, s1, w0, w1, y0, y1, k, kSide = STEP) {
  const p = (s, sw, y) => new Vector3(c.x + dir.x * s + side.x * sw, y, c.z + dir.z * s + side.z * sw);
  const A = [p(s0, -w0, y0), p(s1, -w1, y0), p(s1, w1, y0), p(s0, w0, y0)], T = A.map(v => v.clone().setY(y1));
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
// F1: the Mulassa's head out of corner c, its snout the spout: a neck with a mane, a long head, open jaws, two long ears
function mulassa(t, c, dir, side, y, k = 1.5) {
  const B = (s0, s1, w0, w1, ya, yb, col, sw = 0) => beam(t, { x: c.x + side.x * sw * k, z: c.z + side.z * sw * k }, dir, side,
    s0 * k, s1 * k, w0 * k, w1 * k, y + ya * k, y + yb * k, col);
  B(-0.04, 0.16, 0.045, 0.04, 0, 0.08, ARCH);
  B(-0.02, 0.15, 0.01, 0.01, 0.08, 0.1, STEP); // the mane
  B(0.12, 0.27, 0.05, 0.045, 0.02, 0.1, SILL); // the head
  B(0.25, 0.38, 0.038, 0.032, 0.05, 0.095, ARCH); // the snout, its upper jaw
  B(0.25, 0.35, 0.03, 0.025, 0.005, 0.03, STEP); // the lower jaw: the mouth is the spout
  for (const sw of [-0.03, 0.03]) B(0.13, 0.17, 0.014, 0.006, 0.1, 0.2, ARCH, sw); // its long ears
  for (const sw of [-0.04, 0.04]) B(0.24, 0.255, 0.008, 0.008, 0.07, 0.085, JAMB, sw); // its eyes
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
    // the Mulassa at the corner the camera sees in profile (on the screen's left), the drain gargoyles at the others
    if (sx < 0 && sz > 0 && corners.includes('F1')) mulassa(t, c, dir, side, y0 + 0.15);
    else if (corners.includes('B5')) gargoyle(t, c, dir, side, y0 + 0.3);
  }
  return t.geo();
}
