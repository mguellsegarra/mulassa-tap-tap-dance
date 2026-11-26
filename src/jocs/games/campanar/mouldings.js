// The campanar's one-floor courses in relief (facade.js; pooled by openings.js): the string course over the big ashlar, a
// moulded band proud of the wall; the cornice of blind arches over the clock, a band of small round arches in relief
// between a sill band and a cornice; and the parapet over the bell chamber, a cornice under it, a smaller arcade, and a
// coping overhanging its top, and in the middle of each face a small gable with a sunk trefoil standing over them. Every
// band runs round the four walls mitred at the corners; the arches stay between the quoins.
import { ShapeUtils, Vector2 } from 'three';
import { walls, at } from './arches.js';
import { quoinOf } from './stone.js';
import { tris, prism, sector, moulding, ARCH, STEP, SILL, JAMB } from './relief.js';

const FIELD = ARCH.clone().lerp(JAMB, 0.45); // the shadowed wall inside a blind arch
// profiles [y over the floor's foot, out of the wall], from the wall up and out and back, and each face's tone
const IMPOSTA = [[0.1, 0], [0.1, 0.02], [0.13, 0.02], [0.17, 0.055], [0.29, 0.055], [0.29, 0.075], [0.35, 0.075], [0.4, 0]];
const IMPOSTA_K = [STEP, ARCH, STEP, SILL, STEP, ARCH, SILL];
// the shaft's thin string course (Valls' «impostes fines» between its bays): one step, slimmer than the imposta
const FAIXA = [[0.16, 0], [0.16, 0.02], [0.19, 0.02], [0.22, 0.045], [0.3, 0.045], [0.34, 0]], FAIXA_K = [STEP, ARCH, STEP, SILL, SILL];
const SILL_BAND = [[0.08, 0], [0.08, 0.03], [0.13, 0.03], [0.13, 0]], SILL_K = [STEP, SILL, ARCH];
const CORNICE = [[0.33, 0], [0.33, 0.028], [0.355, 0.05], [0.39, 0.05], [0.39, 0]], CORNICE_K = [STEP, ARCH, SILL, ARCH];
const FOOT = [[0, 0], [0, 0.02], [0.03, 0.03], [0.07, 0.07], [0.11, 0.075], [0.11, 0]], FOOT_K = [STEP, ARCH, STEP, SILL, ARCH];
const COPING = [[0.37, 0], [0.37, 0.03], [0.405, 0.04], [0.43, 0.065], [0.48, 0.065], [0.48, 0]], COPING_K = [STEP, ARCH, STEP, SILL, SILL];

// a row of blind round arches on wall b from y0 up, about `pitch` apart between the quoins: posts and a ring of
// voussoirs proud of the wall, the wall inside each arch in shade; ys the springing, depth how proud; none within `gap`
// of the middle
function arcade(t, P, b, y0, ys, pitch, depth, gap = 0) {
  const span = b.u1 - b.u0 - 2 * quoinOf(b.u1 - b.u0) - 0.02, n = Math.max(1, Math.floor(span / pitch)), p = span / n;
  const ro = p * 0.47, ri = ro * 0.68;
  for (let k = 0; k < n; k++) {
    const u = (b.u0 + b.u1) / 2 + (k + 0.5 - n / 2) * p, arc = [];
    if (gap && Math.abs(u - (b.u0 + b.u1) / 2) < gap + ro) continue;
    for (let j = 0; j <= 8; j++) { const th = Math.PI / 2 - j * Math.PI / 8; arc.push([u + ri * Math.sin(th), ys + ri * Math.cos(th), false]); }
    prism(t, P, [[u - ri, y0, false], [u + ri, y0, false], ...arc], 0, 0.004, -9, 9, FIELD);
    for (const sg of [-1, 1]) prism(t, P, [[u + sg * ri, y0, true], [u + sg * ro, y0, true], [u + sg * ro, ys, true], [u + sg * ri, ys, true]], 0, depth, -9, 9, ARCH, STEP);
    for (let j = 0; j < 7; j++) prism(t, P, sector(u, ys, ri, ro, -Math.PI / 2 + j * Math.PI / 7, -Math.PI / 2 + (j + 1) * Math.PI / 7, true), 0, depth, -9, 9, j % 2 ? SILL : ARCH, STEP);
  }
}
// the remat's central gable on a face w wide: its half width (none on a face too narrow for it), the foot of its slopes
// under the floor's top `top`, its coping's depth, its trefoil's lobe radius and centre height (0.04 clear of the
// coping's underside and of the foot course); one floor's numbers, as the profiles
export function gableOf(w, top) {
  const hw = Math.min(w * 0.17, w / 2 - quoinOf(w) - 0.06);
  if (hw < 0.09) return null;
  const ct = 0.035, lobe = Math.min(hw * 0.2, 0.065); // the trefoil reaches 1.4 lobes down and 1.8 up from its centre
  return { hw, ct, yS: top - Math.min(0.22, hw), lobe, yc: (0.15 + 1.4 * lobe + top - ct - 0.04 - 1.8 * lobe) / 2 };
}
// a trefoil's outline round (u, y), three lobes of radius l, CCW: the union of three circles, star-shaped about the centre
const trefoil = (u, y, l) => Array.from({ length: 36 }, (_, j) => {
  const a = j * Math.PI / 18, du = Math.cos(a), dy = Math.sin(a);
  const r = Math.max(...[0, 1, 2].map(i => {
    const c = Math.PI / 2 + i * 2 * Math.PI / 3, pu = l * 0.8 * Math.cos(c), py = l * 0.8 * Math.sin(c), d = du * pu + dy * py;
    return d + Math.sqrt(d * d - 0.64 * l * l + l * l);
  }));
  return [u + r * du, y + r * dy];
});
// the gable on wall b standing on the foot course (0.11) up to the floor's top: a tympanum proud of the arcade and of the
// coping behind it, a pierced face with a trefoil sunk in shade, posts each side, and a coping along both slopes
function gable(t, P, b, top) {
  const g = gableOf(b.u1 - b.u0, top);
  if (!g) return;
  const { hw, ct, yS, lobe, yc } = g, u = (b.u0 + b.u1) / 2, ho = hw + 0.025, d1 = 0.075, d2 = 0.095, dH = 0.03;
  const yl = x => top - ct - x * (top - yS) / ho; // under the coping, x from the middle
  const body = [[u - hw, 0.11], [u + hw, 0.11], [u + hw, yl(hw)], [u, top - ct], [u - hw, yl(hw)]];
  const hole = trefoil(u, yc, lobe), v2 = q => q.map(([x, y]) => new Vector2(x, y));
  for (const [i, j, k] of ShapeUtils.triangulateShape(v2(body), [v2(hole)])) {
    const all = [...body, ...hole], [A, B, C] = [all[i], all[j], all[k]];
    const ccw = (B[0] - A[0]) * (C[1] - A[1]) - (B[1] - A[1]) * (C[0] - A[0]) > 0;
    t.tri((ccw ? [A, B, C] : [A, C, B]).map(p => P(p[0], p[1], d1)), [ARCH, ARCH, ARCH]);
  }
  for (let j = 0; j < 3; j++) { // the bottom and both sides; the top is under the coping
    const [p, q] = [body[(j + 4) % 5], body[j]];
    t.quad(P(p[0], p[1], 0), P(q[0], q[1], 0), P(q[0], q[1], d1), P(p[0], p[1], d1), STEP);
  }
  hole.forEach((p, j) => { // the trefoil's sides, facing in, and the stone deep in it
    const q = hole[(j + 1) % hole.length];
    t.quad(P(q[0], q[1], d1 - dH), P(p[0], p[1], d1 - dH), P(p[0], p[1], d1), P(q[0], q[1], d1), STEP);
  });
  prism(t, P, hole.map(([x, y]) => [x, y, false]), 0, d1 - dH, -9, 9, FIELD);
  for (const sg of [-1, 1]) {
    const x0 = u + sg * hw, x1 = u + sg * (hw - 0.045); // a post, a little prouder, up to the slope
    prism(t, P, [[Math.min(x0, x1), 0.11, true], [Math.max(x0, x1), 0.11, true], [Math.max(x0, x1), yl(hw), true], [Math.min(x0, x1), yl(hw), true]], 0, d1 + 0.008, -9, 9, ARCH, STEP);
    const slope = [[u, top - ct], [u + sg * ho, yS - ct], [u + sg * ho, yS], [u, top]]; // its edge at the middle bare
    prism(t, P, (sg > 0 ? slope : slope.reverse()).map((p, j) => [...p, j < 3]), 0, d2, -9, 9, SILL, STEP);
  }
}
const course = draw => (r, y0) => {
  const t = tris();
  for (const b of walls(r, y0)) draw(t, (u, y, n) => at(b, u, y, n), b);
  return t.geo();
};
// floor y0's course in plan r → its lit geometry
export const COURSES = {
  'A/imposta': course((t, P, b) => moulding(t, P, b, IMPOSTA, IMPOSTA_K)),
  'A/faixa': course((t, P, b) => moulding(t, P, b, FAIXA, FAIXA_K)),
  'A/arquets': course((t, P, b) => {
    moulding(t, P, b, SILL_BAND, SILL_K);
    arcade(t, P, b, 0.13, 0.19, 0.25, 0.026);
    moulding(t, P, b, CORNICE, CORNICE_K);
  }),
  'A/remat': course((t, P, b) => {
    moulding(t, P, b, FOOT, FOOT_K);
    moulding(t, P, b, [[0.14, 0], [0.14, 0.022], [0.16, 0.022], [0.16, 0]], [STEP, SILL, ARCH]);
    const g = gableOf(b.u1 - b.u0, 0.48);
    arcade(t, P, b, 0.16, 0.25, 0.2, 0.02, g ? g.hw + 0.03 : 0);
    moulding(t, P, b, COPING, COPING_K);
    gable(t, P, b, 0.48);
  }),
};
