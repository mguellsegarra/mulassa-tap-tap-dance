// The hand-drawn pending silhouettes must read as whole figures: rasterised (nonzero fill, like the browser), each
// card has exactly as many separate pieces as figures it shows. A gap between two shapes shows the halo as a seam
// (an arm, a plume or a sword floating beside the body), so it fails here instead of in a screenshot.
import assert from 'node:assert/strict';
import { SILHOUETTE_DRAWINGS } from '../../../src/ui/pending-silhouettes.js';

const RES = .5; // design units per sample: shapes must overlap by about one unit (a tenth of a cell) to count as joined

// SVG path data → closed polylines (M L H V Q C A Z, absolute and relative)
function polylines(d) {
  const tokens = d.match(/[a-zA-Z]|-?(?:\d+\.?\d*|\.\d+)(?:e-?\d+)?/g), out = [];
  let i = 0, cmd = '', x = 0, y = 0, sx = 0, sy = 0, pts = null;
  const num = () => +tokens[i++], to = (nx, ny) => { pts.push([nx, ny]); x = nx; y = ny; };
  const curve = (f, n = 16) => { for (let k = 1; k <= n; k++) { const [px, py] = f(k / n); pts.push([px, py]); } };
  while (i < tokens.length) {
    if (/[a-zA-Z]/.test(tokens[i])) cmd = tokens[i++];
    const rel = cmd === cmd.toLowerCase(), ox = rel ? x : 0, oy = rel ? y : 0;
    switch (cmd.toUpperCase()) {
      case 'M': { if (pts) out.push(pts); const nx = num() + ox, ny = num() + oy; pts = [[nx, ny]]; x = sx = nx; y = sy = ny; cmd = rel ? 'l' : 'L'; break; }
      case 'L': to(num() + ox, num() + oy); break;
      case 'H': to(num() + ox, y); break;
      case 'V': to(x, num() + oy); break;
      case 'Q': { const x0 = x, y0 = y, cx = num() + ox, cy = num() + oy, ex = num() + ox, ey = num() + oy;
        curve(t => [(1 - t) ** 2 * x0 + 2 * (1 - t) * t * cx + t * t * ex, (1 - t) ** 2 * y0 + 2 * (1 - t) * t * cy + t * t * ey]); x = ex; y = ey; break; }
      case 'C': { const x0 = x, y0 = y, c1x = num() + ox, c1y = num() + oy, c2x = num() + ox, c2y = num() + oy, ex = num() + ox, ey = num() + oy;
        const b = (a, p, q, e, t) => (1 - t) ** 3 * a + 3 * (1 - t) ** 2 * t * p + 3 * (1 - t) * t * t * q + t ** 3 * e;
        curve(t => [b(x0, c1x, c2x, ex, t), b(y0, c1y, c2y, ey, t)]); x = ex; y = ey; break; }
      case 'A': { // endpoint → centre parameterisation (SVG 1.1 F.6.5); our arcs are unrotated
        let rx = Math.abs(num()), ry = Math.abs(num()); num(); const large = num(), sweep = num(), ex = num() + ox, ey = num() + oy;
        const x1 = (x - ex) / 2, y1 = (y - ey) / 2, lam = x1 * x1 / (rx * rx) + y1 * y1 / (ry * ry);
        if (lam > 1) { rx *= Math.sqrt(lam); ry *= Math.sqrt(lam); }
        const sq = Math.sqrt(Math.max(0, (rx * rx * ry * ry - rx * rx * y1 * y1 - ry * ry * x1 * x1) / (rx * rx * y1 * y1 + ry * ry * x1 * x1))) * (large === sweep ? -1 : 1);
        const cxp = sq * rx * y1 / ry, cyp = -sq * ry * x1 / rx, cx = cxp + (x + ex) / 2, cy = cyp + (y + ey) / 2;
        const ang = (ux, uy, vx, vy) => Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
        const t1 = ang(1, 0, (x1 - cxp) / rx, (y1 - cyp) / ry); let dt = ang((x1 - cxp) / rx, (y1 - cyp) / ry, (-x1 - cxp) / rx, (-y1 - cyp) / ry);
        if (!sweep && dt > 0) dt -= 2 * Math.PI; if (sweep && dt < 0) dt += 2 * Math.PI;
        curve(t => [cx + rx * Math.cos(t1 + dt * t), cy + ry * Math.sin(t1 + dt * t)], 32); x = ex; y = ey; break; }
      case 'Z': out.push(pts); pts = null; x = sx; y = sy; break;
      default: throw new Error(`unsupported path command ${cmd}`);
    }
  }
  if (pts) out.push(pts);
  return out;
}

// One <path>: nonzero winding over all its subpaths, scanline at sample centres.
function fill(grid, w, d) {
  const edges = polylines(d).flatMap(p => p.map((a, k) => [a, p[(k + 1) % p.length]]));
  for (let j = 0; j < grid.length / w; j++) {
    const y = (j + .5) * RES, hits = [];
    for (const [[ax, ay], [bx, by]] of edges) if ((ay <= y) !== (by <= y)) hits.push([ax + (y - ay) / (by - ay) * (bx - ax), by > ay ? 1 : -1]);
    hits.sort((a, b) => a[0] - b[0]);
    let wind = 0;
    for (let k = 0; k < hits.length - 1; k++) {
      wind += hits[k][1];
      if (wind) for (let i = Math.max(0, Math.ceil(hits[k][0] / RES - .5)); i < w && (i + .5) * RES < hits[k + 1][0]; i++) grid[j * w + i] = 1;
    }
  }
}
// 4-connected components; a piece under MIN samples is the sampled tip of a hairline curve (a horn, a leaf), not a shape
const MIN = 8;
const pieces = (grid, w) => {
  const seen = new Uint8Array(grid.length); let n = 0;
  for (let s = 0; s < grid.length; s++) if (grid[s] && !seen[s]) {
    let size = 0; const stack = [s]; seen[s] = 1;
    while (stack.length) { const p = stack.pop(), px = p % w; size++; for (const q of [p - w, p + w, px ? p - 1 : -1, px < w - 1 ? p + 1 : -1]) if (q >= 0 && q < grid.length && grid[q] && !seen[q]) { seen[q] = 1; stack.push(q); } }
    if (size >= MIN) n++;
  }
  return n;
};

for (const [id, { vb: [vw, vh], d, parts = 1 }] of Object.entries(SILHOUETTE_DRAWINGS)) {
  const w = vw * 10 / RES, grid = new Uint8Array(w * (vh * 10 / RES));
  for (const shape of d) { // shrink each shape by one sample before the union: touching edges must overlap, not just meet
    const one = new Uint8Array(grid.length); fill(one, w, shape);
    for (let s = 0; s < one.length; s++) if (one[s] && one[s - w] && one[s + w] && (s % w) && one[s - 1] && (s % w < w - 1) && one[s + 1]) grid[s] = 1;
  }
  assert.equal(pieces(grid, w), parts, `${id}: ${parts} whole figure(s), no shape left floating apart`);
}
for (const id of ['gegants-ciutat-valls', 'gegants-olot']) { // groups as wide as their card: ink centred (dx), so neither side meets the card's edge
  const { vb: [vw], d, dx = 0 } = SILHOUETTE_DRAWINGS[id], xs = d.flatMap(s => polylines(s).flat().map(([x]) => x + dx));
  assert(Math.abs(Math.min(...xs) + Math.max(...xs) - vw * 10) <= 2, `${id}: centred in its viewBox`);
}
{ // the check itself: a deliberate one-unit gap is caught, an overlap is not
  const w = 40 / RES, grid = new Uint8Array(w * w); fill(grid, w, 'M2 2h10v10H2Z'); fill(grid, w, 'M13 2h10v10H13Z');
  assert.equal(pieces(grid, w), 2, 'a one-unit gap splits the figure');
  fill(grid, w, 'M11 4h3v4h-3Z'); assert.equal(pieces(grid, w), 1, 'a bridge joins it');
  const g2 = new Uint8Array(w * w); fill(g2, w, 'M2 2h10v10H2ZM2 10h10v-6H2Z'); // the second runs the other way: their overlap is empty
  assert.equal(pieces(g2, w), 2, 'opposite windings inside one path cancel into a see-through line');
}
console.log(`silhouettes: ${Object.keys(SILHOUETTE_DRAWINGS).length} drawings, each a whole figure ok`);
