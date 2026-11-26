// The portal at the campanar's foot in 3D (arches.js measures it; openings.js pierces the wall and pools it): a hood band
// proud of the wall round a pointed doorway, its archivolts stepping in, order after order, each one's reveal a share of
// the wall's depth and its step facing out, light capitals at the springing, and the door a wall's depth in: dark wood
// planks, two leaves, iron straps. Its floors settle on different taps: each builds only its own heights.
import { Color } from 'three';
import { FLOOR } from './rules.js';
import { halfWidth, cuts, walls, at, inset } from './arches.js';
import { tris, prism, ARCH, STEP, SILL, JAMB } from './relief.js';

const WOOD = [new Color('#4a2a17'), new Color('#5a341d')], SEAM = new Color('#2a170c'), IRON = new Color('#262224');

// floor y0's slice of the portal o (chamberOf's, at its foot o.y0, centred on cx, cz) in the plan r: lit pieces only
export function portalSlice(r, y0, o) {
  const t = tris(), { s } = o, a = y0 - o.y0, c = a + FLOOR, tWall = Math.min(s.tWall, Math.min(r.w, r.d) * 0.19);
  const Q = Array.from({ length: s.orders + 1 }, (_, k) => inset(s, k * s.step)), hood = inset(s, -s.band), door = Q.at(-1);
  const dz = tWall / Q.length, proud = s.band * 0.45, hi = Math.min(c, hood.yApex), ys = hi > a + 1e-4 ? cuts({ ...hood, lights: Q }, a, hi) : [];
  const shade = k => ARCH.clone().lerp(JAMB, Math.min(1, k / Q.length));
  for (const b of walls(r, o.cx, o.cz, o.y0)) {
    const P = (u, y, n) => at(b, u, y, n);
    for (let j = 0; j < ys.length - 1; j++) {
      const ya = ys[j], yb = ys[j + 1], ha = halfWidth(ya, hood), hb = halfWidth(yb, hood);
      const w = Q.map(q => [halfWidth(ya, q), halfWidth(yb, q)]);
      for (const sg of [-1, 1]) {
        const L = (u, y, n) => P(sg * u, y, n);
        // the hood: its face, its outer edge down to the wall
        t.quad(L(w[0][0], ya, proud), L(ha, ya, proud), L(hb, yb, proud), L(w[0][1], yb, proud), SILL);
        t.quad(L(ha, ya, proud), L(ha, ya, 0), L(hb, yb, 0), L(hb, yb, proud), STEP);
        Q.forEach((_, k) => { // order k's reveal, then the step in to the next
          const z0 = k ? -k * dz : proud, z1 = -(k + 1) * dz, [wa, wb] = w[k];
          t.quad(L(wa, ya, z0), L(wa, ya, z1), L(wb, yb, z1), L(wb, yb, z0), shade(k), shade(k + 0.8), shade(k + 0.8), shade(k));
          if (k < s.orders) t.quad(L(wa, ya, z1), L(w[k + 1][0], ya, z1), L(w[k + 1][1], yb, z1), L(wb, yb, z1), k ? STEP : ARCH);
        });
      }
      // the door in six planks, the seam between its two leaves dark
      const [da, db] = w.at(-1), z = -tWall;
      for (let p = 0; p < 6; p++) {
        const u0 = door.hw * (p / 3 - 1), u1 = door.hw * ((p + 1) / 3 - 1);
        const l = [Math.max(u0, -da), Math.max(u0, -db)], rr = [Math.min(u1, da), Math.min(u1, db)];
        if (rr[0] - l[0] > 1e-5 || rr[1] - l[1] > 1e-5) t.quad(P(l[0], ya, z), P(rr[0], ya, z), P(rr[1], yb, z), P(l[1], yb, z), WOOD[p % 2]);
      }
      const sa = Math.min(da, 0.007), sb = Math.min(db, 0.007);
      if (sa > 1e-5 || sb > 1e-5) t.quad(P(-sa, ya, z + 0.002), P(sa, ya, z + 0.002), P(sb, yb, z + 0.002), P(-sb, yb, z + 0.002), SEAM);
    }
    // the capitals at the springing, and the door's iron straps, each leaf's: cut to this floor
    const cap = s.ySpring, cw = hood.hw + s.band * 0.3, z = -tWall;
    for (const sg of [-1, 1]) {
      const rect = (u0, u1, y0r, y1r) => [[u0, y0r, true], [u1, y0r, true], [u1, y1r, true], [u0, y1r, true]].map(([u, y, f]) => [sg * u, y, f]);
      prism(t, P, rect(s.hw, cw, cap - s.band * 0.9, cap), 0, proud * 1.7, a, c, SILL, STEP);
      for (const hy of [door.ySpring * 0.22, door.ySpring * 0.82]) prism(t, P, rect(0.02, door.hw - 0.012, hy, hy + 0.03), z, z + 0.01, a, c, IRON);
    }
  }
  return t.geo();
}
