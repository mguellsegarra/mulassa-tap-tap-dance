// The campanar's clock in 3D (facade.js's motif `clock`: A's over three floors, C's over two), one on each wall: a
// moulded stone ring proud of the wall, as big as the bay lets it be short of the quoins and of the arcading over it, a
// light dial set back inside it, dark hour marks and a boss in relief; and the hands, which tell the device's own time.
// The ring, dial and marks are pooled with the openings (openings.js), each floor its own heights as it settles; the
// hands are one small mesh of their own, every clock's, rebuilt only when the minute changes.
import { Color, MeshLambertMaterial, DoubleSide } from 'three';
import { FLOOR } from './rules.js';
import { LEN } from './facade.js';
import { walls, at } from './arches.js';
import { quoinOf } from './stone.js';
import { tris, prism, sector, pool, ARCH, STEP, SILL, JAMB } from './relief.js';

const DIAL = new Color('#fbf2d8'), INK = new Color('#262b38'), SHADOW = ARCH.clone().lerp(JAMB, 0.7), N = 40, TAU = Math.PI * 2;
// heights off the wall: the ring's outer step and inner face, the dial, the marks' face, the hands, the boss
const Z = { step: 0.036, ring: 0.058, dial: 0.014, mark: 0.022, hour: 0.026, minute: 0.036, boss: 0.046 };

// the clock's piece floor i wears (`A/rellotge3-0<n>`, `C/rellotge-0<n>`, n counting down from the first floor) → its
// floors and the first one; null for any other course
export function clockOf(key, i) {
  const m = /^(A|C)\/rellotge3?-0(\d)$/.exec(key), n = m && LEN.clock[m[1]];
  return m && { n, lo: i - (n - +m[2]) };
}
// each wall's clock: centred on the motif's middle, its radius the most the bay allows (a little air under the arcading
// over it and beside the quoins)
export function clockFaces(r, o) {
  const cy = o.n * FLOOR / 2, y0 = o.lo * FLOOR;
  // R: the ring's; its shadow on the wall reaches 3.5% past it
  return walls(r, y0).map(b => ({ b, cy, R: Math.min(cy - 0.035, Math.min(-b.u0, b.u1) - quoinOf(b.u1 - b.u0) - 0.035) / 1.035 }));
}
// the hands' angles (radians, clockwise from twelve) at h:m: the hour hand moves on through its hour
export const handAngles = (h, m) => ({ hour: ((h % 12) + m / 60) * TAU / 12, minute: (m % 60) * TAU / 60 });

const disc = (cy, rad, n = N) => Array.from({ length: n }, (_, k) => [rad * Math.sin(-k * TAU / n), cy + rad * Math.cos(-k * TAU / n), false]);
// a bar from radius r0 to r1 along angle th, w wide, its corners as a prism's polygon
const bar = (cy, th, r0, r1, w) => {
  const s = Math.sin(th), c = Math.cos(th), px = c * w / 2, py = -s * w / 2;
  return [[s * r0 - px, cy + c * r0 - py], [s * r1 - px, cy + c * r1 - py], [s * r1 + px, cy + c * r1 + py], [s * r0 + px, cy + c * r0 + py]].map(p => [...p, true]);
};
// floor y0's slice of every wall's clock: its shadow on the wall, the ring in two steps, the dial, the marks, the boss
export function clockSlice(r, y0, o) {
  const t = tris(), a = y0 - o.lo * FLOOR, c = a + FLOOR;
  for (const { b, cy, R } of clockFaces(r, o)) {
    const P = (u, y, n) => at(b, u, y, n), ri = R * 0.84;
    for (let k = 0; k < N; k++) {
      const t0 = k * TAU / N, t1 = (k + 1) * TAU / N;
      prism(t, P, sector(0, cy, R * 0.99, R * 1.035, t0, t1), 0, 0.002, a, c, SHADOW);
      prism(t, P, sector(0, cy, R * 0.93, R, t0, t1), 0, Z.step, a, c, STEP, JAMB);
      prism(t, P, sector(0, cy, ri, R * 0.93, t0, t1), 0, Z.ring, a, c, k % 2 ? SILL : ARCH, STEP);
    }
    prism(t, P, disc(cy, ri), 0, Z.dial, a, c, DIAL);
    for (let k = 0; k < 12; k++) prism(t, P, bar(cy, k * TAU / 12, ri * (k % 3 ? 0.74 : 0.64), ri * 0.9, ri * (k % 3 ? 0.045 : 0.075)), Z.dial, Z.mark, a, c, INK);
    prism(t, P, disc(cy, ri * 0.07, 12).map(p => [p[0], p[1], true]), Z.dial, Z.boss, a, c, INK);
  }
  return t.geo();
}

// the hands: one mesh drawn from the first frame (empty), filled once the clock's last floor settles and again only
// when the minute changes. → { show(faces), tick(), reset(), mat }
export function createClockHands(scene) {
  const mat = new MeshLambertMaterial({ vertexColors: true, side: DoubleSide, emissive: '#ffffff', emissiveIntensity: 0 });
  const hands = pool(scene, mat);
  let faces = null, minute = -1;
  const draw = () => {
    const d = new Date(), { hour, minute: mn } = handAngles(d.getHours(), d.getMinutes()), t = tris();
    for (const { b, cy, R } of faces) {
      const P = (u, y, n) => at(b, u, y, n), ri = R * 0.84;
      const hand = (th, len, w, z) => { // tapered, a short tail past the boss, a point at the tip
        const s = Math.sin(th), co = Math.cos(th), pt = (x, y) => [x * co + y * s, cy - x * s + y * co, true];
        prism(t, P, [pt(-w / 2, -len * 0.16), pt(w / 2, -len * 0.16), pt(w * 0.32, len * 0.9), pt(0, len), pt(-w * 0.32, len * 0.9)], Z.dial, z, -9, 9, INK);
      };
      hand(hour, ri * 0.55, ri * 0.085, Z.hour);
      hand(mn, ri * 0.8, ri * 0.055, Z.minute);
    }
    hands.reset();
    hands.add(t.geo());
  };
  return {
    mat,
    show(f) { faces = f; minute = -1; },
    tick() { // nothing to do but a division until the minute turns
      if (!faces) return;
      const m = Math.floor(Date.now() / 60000);
      if (m !== minute) { minute = m; draw(); }
    },
    reset() { faces = null; hands.reset(); mat.emissiveIntensity = 0; },
  };
}
