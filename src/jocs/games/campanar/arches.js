// The openings' shapes over a motif's foot (openings.js builds them): each set's measures for the bell chamber and the
// windows, which piece of the motif floor i wears, the arch's profile, what is open at a height, and the four walls'
// frames the opening is set out on.
import { Vector3 } from 'three';
import { LEN } from './facade.js';

// each set's opening over the motif's foot (half width, sill, the arch's springing and apex), the wall's thickness and
// the niche's depth, the bell's mouth and how deep it hangs; S1: XS's opening on a single floor
const BELLS = {
  A: { hw: 0.292, ySill: 0.12, ySpring: 1.15, yApex: 1.75, tWall: 0.135, roomD: 0.56, D: 0.37, mullion: true },
  C: { hw: 0.21, ySill: 0.21, ySpring: 0.8, yApex: 1.2, tWall: 0.105, roomD: 0.44, D: 0.26, bellZ: 0.135 },
  XS: { hw: 0.156, ySill: 0.15, ySpring: 0.52, yApex: 0.8, tWall: 0.075, roomD: 0.32, D: 0.19, bellZ: 0.1 },
  S1: { hw: 0.108, ySill: 0.065, ySpring: 0.255, yApex: 0.415, tWall: 0.06, roomD: 0.22, D: 0.128, bellZ: 0.074 },
};
// the windows (facade.js's motif `window`), measured on their old painted textures, no bell: A's and C's mainell, a round
// arch (its apex a half width over the springing) over two round-headed lights (centred at ±c, half width lw, springing
// `rise` over the arch's) either side of a mullion, the stone between them a tympanum; each light's head a margin inside
// the arch (campanar-windows.mjs), or the arch cuts it; XS's espitllera, one narrow pointed slit
const mainell = (s, c, lw, rise) => ({ ...s, lights: [-c, c].map(u => ({ c: u, hw: lw, ySill: s.ySill, ySpring: s.ySpring + rise, yApex: s.ySpring + rise + lw })) });
const WINDOW_SETS = {
  A: mainell({ hw: 0.285, ySill: 0.094, ySpring: 0.555, yApex: 0.84, band: 0.09, tWall: 0.135, roomD: 0.4 }, 0.14, 0.11, 0.035),
  C: mainell({ hw: 0.232, ySill: 0.107, ySpring: 0.634, yApex: 0.866, band: 0.07, tWall: 0.105, roomD: 0.32 }, 0.12, 0.085, 0.025),
  XS: { hw: 0.028, ySill: 0.17, ySpring: 0.71, yApex: 0.77, sillH: 0.03, tWall: 0.075, roomD: 0.2 },
};
// the portal at the foot (facade.js's motif `portal`), measured on its old painted textures: the door's pointed arch, and
// round it `orders` stepped archivolts `step` wider each and concentric with it, a hood `band` round the outermost; the
// wall pierced by that outermost order (s), the door a wall's depth in
const portal = (door, step, orders, band, tWall) => ({ ...inset(door, -step * orders), door, step, orders, band, tWall });
const PORTALS = {
  A: portal({ hw: 0.3, ySill: 0, ySpring: 0.67, yApex: 1.21 }, 0.05, 2, 0.05, 0.16),
  C: portal({ hw: 0.216, ySill: 0, ySpring: 0.5, yApex: 0.79 }, 0.035, 2, 0.035, 0.12),
};
// the prototype's face pieces (ornament-plan.js), kind: what ornaments.js adds in the opening. A round opening (`round`)
// is a circle from its sill to its apex. ocul: A1's oculus, its ring of voussoirs, on every wall (common); the rest
// only on the camera's wall (faces): rosassa, A6's rose of six petals over three floors, lit glass behind it; candela,
// F8's lancet with the Virgin in its blue glass (its key kept from the study); lluna, G6's window with the moon caught in its bars; escala, A10's
// stair, a small window a floor climbing across the wall (off: its middle along the wall) to a landing with a railing
const round = (R, yc, more) => ({ round: true, hw: R, ySill: yc - R, ySpring: yc - R, yApex: yc + R, sillH: 0, ...more });
const CAM = [4]; // the wall the camera looks at most (+z, in the light)
const OCULI = Object.fromEntries([['A', 0.15, 0.135], ['C', 0.12, 0.105], ['XS', 0.09, 0.075]]
  .map(([k, R, t]) => [k, round(R, 0.24, { band: 0.006, tWall: t, roomD: t * 2.2, kind: 'ocul' })]));
const ROSES = { A: round(0.46, 0.72, { band: 0.05, tWall: 0.135, roomD: 0.2, kind: 'rosassa', faces: CAM, glass: 'amber' }) };
const lancet = (hw, more) => ({ hw, ySill: 0.1, ySpring: 0.62, yApex: 0.62 + hw * 1.6, band: 0.04, tWall: 0.09, roomD: 0.14, faces: CAM, ...more });
const CANDELES = { A: lancet(0.16, { kind: 'candela', glass: 'blue' }), C: lancet(0.14, { kind: 'candela', glass: 'blue' }), XS: lancet(0.1, { kind: 'candela', glass: 'blue' }) };
const LLUNES = { A: lancet(0.17, { kind: 'lluna', glass: 'night' }), C: lancet(0.15, { kind: 'lluna', glass: 'night' }), XS: lancet(0.11, { kind: 'lluna', glass: 'night' }) };
// the stair's floors bottom up: three narrow round-headed lights climbing across the wall, then the landing's wider one;
// a thin reveal splayed in to each light (ornaments.js), so the play camera, looking down from one side, still sees the
// stair behind it
const step = (off, hw, ySill, yApex, kind) => ({ off, hw, ySill, ySpring: yApex - hw, yApex, band: 0.03, sillH: 0.035, tWall: 0.07, roomD: 0.17, faces: CAM, kind });
const STAIR = [step(-0.27, 0.1, 0.08, 0.42, 'escala'), step(-0.11, 0.1, 0.08, 0.42, 'escala'), step(0.05, 0.1, 0.08, 0.42, 'escala'),
  step(0.2, 0.16, 0.06, 0.43, 'replà')]; // i18n-ok: a piece kind, never shown
const SETS = { campanes: BELLS, mainell: WINDOW_SETS, espitllera: WINDOW_SETS, portal: PORTALS, ocul: OCULI, rosassa: ROSES, candela: CANDELES, lluna: LLUNES };
const MOTIF = { campanes: 'bells', mainell: 'window', espitllera: 'window', portal: 'portal', ocul: 'ocul', rosassa: 'rosassa', candela: 'candela', lluna: 'lluna' };
// the opening's piece floor i wears (facade.js: `<set>/campanes-0<n>`, a window's `<set>/mainell-0<n>`,
// `XS/espitllera-0<n>` or `<set>/portal-0<n>`, n counting down from the motif's first floor; or XS's whole bell opening
// on one floor) → its set's measures and that first floor; null for any other course
export function chamberOf(key, i) {
  if (key === 'XS/campanes-master') return { s: BELLS.S1, lo: i };
  const m = /^(A|C|XS)\/(campanes|mainell|espitllera|portal|ocul|rosassa|candela|lluna|escala)-0(\d)$/.exec(key);
  if (m?.[2] === 'escala') return { s: STAIR[LEN.escala[m[1]] - +m[3]], lo: i }; // each of its floors an opening of its own
  return m && { s: SETS[m[2]][m[1]], lo: i - (LEN[MOTIF[m[2]]][m[1]] - +m[3]) };
}
// a pointed arch's profile d inside s (outside, d < 0), concentric: the same two centres and springing
export function inset(s, d) {
  if (s.round) return round(s.hw - d, (s.ySill + s.yApex) / 2);
  if (s.ySpring >= s.yApex) return { ...s, hw: s.hw - d, ySpring: s.yApex - d, yApex: s.yApex - d }; // a square head
  const H = s.yApex - s.ySpring, uc = (s.hw * s.hw - H * H) / (2 * s.hw), r = s.hw - uc - d;
  return { hw: s.hw - d, ySill: s.ySill, ySpring: s.ySpring, yApex: s.ySpring + Math.sqrt(Math.max(0, r * r - uc * uc)) };
}
// the opening's half width at height y over the motif's foot: straight jambs, then a two-centred pointed arch
export function halfWidth(y, s) {
  if (y < s.ySill - 1e-5 || y > s.yApex + 1e-5) return 0;
  if (s.round) { const dy = y - (s.ySill + s.yApex) / 2; return Math.sqrt(Math.max(0, s.hw * s.hw - dy * dy)); }
  if (y <= s.ySpring) return s.hw;
  const H = Math.max(0.001, s.yApex - s.ySpring), uc = (s.hw * s.hw - H * H) / (2 * s.hw), r = s.hw - uc;
  const dy = Math.min(H, y - s.ySpring);
  return Math.max(0, uc + Math.sqrt(Math.max(0, r * r - dy * dy)));
}
// what is open at height y, [u0, u1] each: the window's lights (inside its arch), or the whole opening
export const holes = (s, y) => {
  const w = halfWidth(y, s);
  if (!s.lights) return [[-w, w]];
  return s.lights.map(l => { // a light closed (or out of the narrowing arch) is a point, never an inverted interval
    const h = halfWidth(y, l), c = Math.max(-w, Math.min(w, l.c));
    return [Math.min(c, Math.max(-w, l.c - h)), Math.max(c, Math.min(w, l.c + h))];
  });
};
// the heights from a to b where the opening (or a light) changes: its sill, springing and apex, 16 steps along the arch
export function cuts(s, a, b) {
  const ys = new Set([a, b]);
  for (const l of [s, ...(s.lights ?? [])]) {
    const a0 = Math.max(a, l.ySpring), a1 = Math.min(b, l.yApex);
    for (const k of [l.ySill, l.ySpring, l.yApex]) if (k > a + 1e-4 && k < b - 1e-4) ys.add(k);
    const n = l.round ? Math.ceil(64 * (l.yApex - l.ySill)) : 16; // a circle all round, about 1/64 a step
    if (a1 > a0 + 1e-4) for (let k = 1; k < n; k++) ys.add(a0 + (a1 - a0) * k / n);
  }
  return [...ys].sort((p, q) => p - q);
}
// a plan's four walls in the box's material order (+x, -x, +z, -z): o on the wall's middle (every motif is centred on
// the plan, which is on the tower's axis) at the motif's foot, T along it the way stone.js's u grows, N out of it;
// u0..u1 the wall along T
export function walls(r, y0) {
  const hw = r.w / 2, hd = r.d / 2;
  return [
    { mat: 0, o: new Vector3(r.x + hw, y0, r.z), T: new Vector3(0, 0, -1), N: new Vector3(1, 0, 0), u0: -hd, u1: hd },
    { mat: 1, o: new Vector3(r.x - hw, y0, r.z), T: new Vector3(0, 0, 1), N: new Vector3(-1, 0, 0), u0: -hd, u1: hd },
    { mat: 4, o: new Vector3(r.x, y0, r.z + hd), T: new Vector3(1, 0, 0), N: new Vector3(0, 0, 1), u0: -hw, u1: hw },
    { mat: 5, o: new Vector3(r.x, y0, r.z - hd), T: new Vector3(-1, 0, 0), N: new Vector3(0, 0, -1), u0: -hw, u1: hw },
  ];
}
// the walls an opening s pierces (all four, or its faces), each framed on the opening's middle (s.off along the wall);
// off: how far, for the stone's UVs
export const wallsOf = (r, y0, s) => walls(r, y0).filter(b => !s.faces || s.faces.includes(b.mat)).map(b => shift(b, s.off ?? 0));
export const shift = (b, off) => ({ ...b, off, o: b.o.clone().addScaledVector(b.T, off), u0: b.u0 - off, u1: b.u1 - off });
export const at = (b, u, y, n) => new Vector3(b.o.x + b.T.x * u + b.N.x * n, b.o.y + y, b.o.z + b.T.z * u + b.N.z * n);
