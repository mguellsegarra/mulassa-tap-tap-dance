// The pieces of the stretch from 100 to 400 m in 3D (ornament-plan.js picks them, openings.js pools them; no new material):
// H1, the bell-ringer's cottage hung on corbels off the camera's wall by its left quoin, so it sticks out of the tower's
// profile; H2, a gallery of little arches on a corbelled ledge round a string course; H3, a sundial painted on the
// camera's wall, its gnomon in iron (its shadow is the clock's hands' mesh, clock.js); H4, a wrought-iron lantern on a
// bracket off each corner. Stone, tiles and geraniums go in the lit mesh; the lit window, the smoke and the lantern's
// glass in the unlit one, so they read as light. Each is built whole with the floor it settles on and stays within the
// flat floors over it (facade.js).
import { Color } from 'three';
import { walls, at } from './arches.js';
import { quoinOf } from './stone.js';
import { tris, prism, sector, ARCH, STEP, SILL } from './relief.js';
import { box, beam, IRON, cornersOf } from './ornaments.js';

const C = c => new Color(c);
const ROOF_TILE = [C('#a34a2a'), C('#c9623a'), C('#dc7d52')], LIT_WINDOW = [C('#ffe39a'), C('#f59a35')];
const POT = C('#a9502d'), LEAF = C('#4c7a36'), GERANIUM = C('#e2312a'), SMOKE = [C('#ece8f2'), C('#9d98b8')];
const PLASTER = C('#f3e4c4'), PAINT = C('#7c3320'), SUN = C('#d9a23e'), LANTERN_GLASS = [C('#fff0b8'), C('#ffb347')];
const VALLS_LAT = 41.29 * Math.PI / 180;
const ALL = [-9, 9]; // a piece built whole: no floor's cut

// H1 on wall b: two stepped corbels, a floor, the cottage in the tower's stone with its gable end out, a tiled roof, a
// chimney and its thread of smoke, and in the gable end one lit window with a pot of red geraniums on its sill
function bellRingerHouse(t, dark, b) {
  const W = 0.2, D = 0.4, E = 0.8, uc = b.u0 + quoinOf(b.u1 - b.u0) + W + 0.03, P = (u, y, n) => at(b, uc + u, y, n); // E: its eaves
  const B = (u0, u1, y0, y1, z0, z1, k, kSide = STEP, to = t) => box(to, P, u0, u1, y0, y1, z0, z1, ...ALL, k, kSide);
  for (const u of [-0.13, 0.13]) for (let k = 0; k < 3; k++) B(u - 0.035, u + 0.035, 0.2 + k * 0.08, 0.28 + k * 0.08, 0, 0.13 + k * 0.12, k % 2 ? SILL : ARCH);
  B(-W - 0.02, W + 0.02, 0.44, 0.48, 0, D + 0.02, SILL);
  B(-W, W, 0.48, E, 0, D, ARCH);
  prism(t, P, [[-W, E, true], [W, E, true], [0, E + 0.2, true]], 0, D, ...ALL, ARCH, STEP); // the gable
  const run = 0.2 / W, eave = W + 0.05, ey = E - 0.05 * run, top = E + 0.24; // the roof's slope, its eaves 0.05 out past the walls
  for (const sg of [-1, 1]) { // each slope, then two courses of tiles across it and the ridge
    const slope = [[0, E + 0.2], [sg * eave, ey], [sg * eave, ey + 0.04], [0, top]];
    prism(t, P, (sg > 0 ? slope : slope.reverse()).map(p => [...p, true]), 0, D + 0.06, ...ALL, ROOF_TILE[0], ROOF_TILE[1]);
    for (const f of [0.35, 0.7]) {
      const u = sg * eave * f, y = ey + 0.04 + (top - ey - 0.04) * (1 - f), row = [[u, y], [u + sg * 0.03, y - 0.03 * run], [u + sg * 0.03, y - 0.03 * run + 0.016], [u, y + 0.016]];
      prism(t, P, (sg > 0 ? row : row.reverse()).map(p => [...p, true]), 0, D + 0.06, ...ALL, ROOF_TILE[0], ROOF_TILE[2]);
    }
  }
  B(-0.022, 0.022, E + 0.225, E + 0.26, 0, D + 0.065, ROOF_TILE[0], ROOF_TILE[2]);
  B(0.08, 0.14, E + 0.08, E + 0.34, 0.04, 0.11, ARCH); // the chimney and its cap
  B(0.07, 0.15, E + 0.34, E + 0.37, 0.03, 0.12, SILL);
  for (let k = 0; k < 8; k++) { // the smoke, a thin wisp swaying up and fading into the night
    const c = j => [0.11 + 0.035 * Math.sin(j * 0.9), E + 0.37 + j * 0.05, 0.006 + j * 0.0016], [ua, ya, wa] = c(k), [ub, yb, wb] = c(k + 1);
    prism(dark, P, [[ua - wa, ya, true], [ua + wa, ya, true], [ub + wb, yb, true], [ub - wb, yb, true]], 0.07, 0.082, ...ALL, SMOKE[0].clone().lerp(SMOKE[1], k / 7));
  }
  B(-0.07, 0.07, 0.64, 0.72, D - 0.01, D + 0.004, LIT_WINDOW[0], LIT_WINDOW[0], dark); // the lit window, warmer low
  B(-0.07, 0.07, 0.56, 0.64, D - 0.01, D + 0.004, LIT_WINDOW[1], LIT_WINDOW[1], dark);
  for (const [u0, u1, y0, y1] of [[-0.087, -0.07, 0.56, 0.74], [0.07, 0.087, 0.56, 0.74], [-0.087, 0.087, 0.72, 0.74]]) B(u0, u1, y0, y1, D, D + 0.012, SILL);
  B(-0.1, 0.1, 0.54, 0.56, D, D + 0.045, SILL);
  B(-0.035, 0.035, 0.56, 0.6, D + 0.008, D + 0.04, POT);
  B(-0.055, 0.055, 0.597, 0.622, D + 0.004, D + 0.045, LEAF);
  for (const [u, y] of [[-0.042, 0.615], [-0.016, 0.627], [0.014, 0.622], [0.04, 0.613], [0, 0.64]]) B(u - 0.011, u + 0.011, y, y + 0.024, D + 0.014, D + 0.04, GERANIUM);
}

// H2 round wall b: a ledge on corbels on the string course, a row of little round arches on colonnettes along its edge
// and a rail over them; short of the corners, where the drain gargoyles are
function galleryBand(t, b) {
  const edge = Math.max(quoinOf(b.u1 - b.u0), 0.24), u0 = b.u0 + edge, u1 = b.u1 - edge, out = 0.16, P = (u, y, n) => at(b, u, y, n);
  if (u1 - u0 < 0.3) return;
  const n = Math.round((u1 - u0) / 0.16), p = (u1 - u0) / n, front = [out - 0.04, out - 0.01], ys = 0.48; // big enough to read from afar
  box(t, P, u0, u1, 0.3, 0.345, 0, out, ...ALL, SILL, STEP);
  for (let k = 0; k <= n; k++) {
    const u = u0 + k * p;
    box(t, P, u - 0.012, u + 0.012, 0.345, ys, ...front, ...ALL, ARCH, STEP);
    if (k % 2 === 0) box(t, P, u - 0.02, u + 0.02, 0.22, 0.3, 0, out * 0.75, ...ALL, ARCH, STEP); // a corbel under every other one
  }
  for (let k = 0; k < n; k++) for (let j = 0; j < 5; j++) {
    const uc = u0 + (k + 0.5) * p, ri = p / 2 - 0.012;
    prism(t, P, sector(uc, ys, ri, ri + 0.02, -Math.PI / 2 + j * Math.PI / 5, -Math.PI / 2 + (j + 1) * Math.PI / 5), ...front, ...ALL, j % 2 ? SILL : ARCH, STEP);
  }
  box(t, P, u0 - 0.01, u1 + 0.01, ys + p / 2 + 0.005, ys + p / 2 + 0.03, out - 0.045, out + 0.005, ...ALL, SILL, STEP);
}

// H3 on wall b: a plastered panel under a little cornice, its hour lines painted from six to six round a sun at the
// gnomon's foot (the lines of a south wall at Valls' latitude), and the iron gnomon on its stay
function sundialFace(t, b) {
  const hw = Math.min(0.3, -b.u0 - quoinOf(b.u1 - b.u0) - 0.06), y0 = 0.16, y1 = y0 + hw * 2.3, fy = y1 - 0.12, P = (u, y, n) => at(b, u, y, n);
  box(t, P, -hw, hw, y0, y1, 0, 0.012, ...ALL, PLASTER, STEP);
  box(t, P, -hw - 0.03, hw + 0.03, y0 - 0.03, y0, 0, 0.03, ...ALL, SILL, STEP);
  for (const sg of [-1, 1]) box(t, P, sg > 0 ? hw : -hw - 0.03, sg > 0 ? hw + 0.03 : -hw, y0, y1, 0, 0.024, ...ALL, ARCH, STEP);
  box(t, P, -hw - 0.045, hw + 0.045, y1, y1 + 0.04, 0, 0.05, ...ALL, SILL, STEP);
  for (let h = 6; h <= 18; h++) {
    const [du, dy] = shadowDir(h), reach = Math.min(du ? (hw - 0.03) / Math.abs(du) : 9, (fy - y0 - 0.03) / -dy), w = h % 3 ? 0.004 : 0.007;
    const n = [-dy * w, du * w], a = [du * 0.06, fy + dy * 0.06], z = [du * reach, fy + dy * reach];
    prism(t, P, [[a[0] - n[0], a[1] - n[1], true], [z[0] - n[0], z[1] - n[1], true], [z[0] + n[0], z[1] + n[1], true], [a[0] + n[0], a[1] + n[1], true]], 0.012, 0.015, ...ALL, PAINT);
  }
  const disc = (r, k) => Array.from({ length: k }, (_, j) => [r * Math.cos(j * 2 * Math.PI / k), fy + r * Math.sin(j * 2 * Math.PI / k), true]);
  prism(t, P, disc(0.04, 14), 0.012, 0.018, ...ALL, SUN, PAINT);
  for (let j = 0; j < 8; j++) prism(t, P, sector(0, fy, 0.05, 0.075, j * Math.PI / 4 - 0.12, j * Math.PI / 4 + 0.12, true), 0.012, 0.016, ...ALL, SUN);
  const foot = at(b, 0, fy, 0), Y = foot.y;
  beam(t, foot, b.N, b.T, 0, 0.2, 0.006, 0.005, [Y - 0.006, Y - 0.146], [Y + 0.006, Y - 0.134], IRON, IRON); // the gnomon, out and down
  beam(t, foot, b.N, b.T, 0, 0.11, 0.004, 0.004, [Y - 0.15, Y - 0.083], [Y - 0.142, Y - 0.075], IRON, IRON); // its stay
}
// the gnomon's shadow on a south wall at hour h (solar, 12 at noon): [along the wall, up], from straight down at noon to
// level at six; mornings to the left as seen from outside
const shadowDir = h => { const th = Math.atan(Math.tan((h - 12) * Math.PI / 12) * Math.cos(VALLS_LAT)); return [Math.sin(th), -Math.cos(th)]; };
// H3's shadow for the clock's hands' mesh, at the device's time: a dark wedge from the gnomon's foot, none at night
const sundialShadow = (b, hw, fy) => (t, d) => {
  const h = d.getHours() + d.getMinutes() / 60;
  if (h < 6 || h > 18) return;
  const [du, dy] = shadowDir(h), len = Math.min(du ? (hw - 0.03) / Math.abs(du) : 9, (fy - 0.19) / -dy) * 0.85, w = 0.024;
  const k = C('#6f6878'), P = (u, y, n) => at(b, u, y, n); // a cool grey, apart from the painted lines
  prism(t, P, [[-dy * w, fy + du * w, true], [du * len, fy + dy * len, true], [dy * w, fy - du * w, true]], 0.015, 0.017, ...ALL, k);
};

// H4 at corner c (out along dir, side across): a wall plate, an arm with its stay, a hanging lantern of four iron posts
// round lit glass under a stepped cap, a finial under it
function wallLantern(t, dark, c, dir, side, y, K = 1.3) {
  const Bm = (s0, s1, w0, w1, ya, yb, k = IRON, to = t, sw = 0) => beam(to, { x: c.x + side.x * sw * K, z: c.z + side.z * sw * K }, dir, side,
    s0 * K, s1 * K, w0 * K, w1 * K, Array.isArray(ya) ? ya.map(v => y + v * K) : y + ya * K, Array.isArray(yb) ? yb.map(v => y + v * K) : y + yb * K, k, k);
  Bm(-0.02, 0.012, 0.035, 0.035, 0.06, 0.26);
  Bm(0, 0.3, 0.008, 0.008, 0.235, 0.252);
  Bm(0, 0.2, 0.006, 0.006, [0.08, 0.235], [0.095, 0.25]);
  Bm(0.278, 0.29, 0.004, 0.004, 0.19, 0.236);
  Bm(0.235, 0.335, 0.05, 0.05, 0.165, 0.18); // the cap, stepped, and its knob
  Bm(0.255, 0.315, 0.03, 0.03, 0.18, 0.192);
  Bm(0.275, 0.295, 0.01, 0.01, 0.192, 0.2);
  Bm(0.245, 0.325, 0.04, 0.04, 0.115, 0.165, LANTERN_GLASS[0], dark); // its glass
  Bm(0.25, 0.32, 0.035, 0.035, 0.07, 0.115, LANTERN_GLASS[1], dark);
  for (const s of [0.24, 0.322]) for (const sw of [-0.042, 0.042]) Bm(s, s + 0.008, 0.004, 0.004, 0.06, 0.165, IRON, t, sw);
  Bm(0.24, 0.33, 0.046, 0.046, 0.05, 0.065);
  Bm(0.276, 0.294, 0.008, 0.002, 0.02, 0.05);
}

// what floor y0 in plan r wears of the upper stretch (orn: 'H1'…'H4') → { lit, dark, shadow } (shadow: H3's, drawn with
// the clock's hands), or null when it wears none of them
export function upperPieceSlice(r, y0, orn) {
  if (!orn.some(o => /^H\d$/.test(o))) return null;
  const t = tris(), dark = tris(), ws = walls(r, y0), cam = ws.find(b => b.mat === 4); // the camera's wall (arches.js CAM)
  let shadow = null;
  if (orn.includes('H1')) bellRingerHouse(t, dark, cam);
  if (orn.includes('H2')) for (const b of ws) galleryBand(t, b);
  if (orn.includes('H3')) {
    sundialFace(t, cam);
    const hw = Math.min(0.3, -cam.u0 - quoinOf(cam.u1 - cam.u0) - 0.06);
    shadow = sundialShadow(cam, hw, 0.16 + hw * 2.3 - 0.12);
  }
  if (orn.includes('H4')) for (const { c, dir, side } of cornersOf(r)) wallLantern(t, dark, c, dir, side, y0 + 0.3); // all four, as the gargoyles
  return { lit: t.geo(), dark: dark.geo(), shadow };
}
