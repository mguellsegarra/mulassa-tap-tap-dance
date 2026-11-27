// The Tombairot's body below the neck, four meshes: the beehive of foam rings with its leafy fringe and the carrier's
// window, the long scaled body behind it, the tail hanging from its rump and the gathered skirt. All in the body's frame
// (ground at y 0, front +z). Bold on purpose: a ring is two real noodles and a scale a 25 cm cell, to read at phone size.
import { Vox } from '../../scene/models/voxel.js';
import { TOMBA_V1 as K, TOMBA_V1_DIM as D, TOMBA_V1_SCALES_Y, TOMBA_V1_BACK_HEM, tombaV1RingR, tombaV1ConeR, tombaV1ShellIn, tombaV1SkirtIn } from './tomba-form.js';

// A ring's plan: three boxes that step round like an octagon (the Bou's body: a core with stepped edges). One colour
// and no jitter: their tops share a plane. zMin drops the part the shell hides.
export function tombaV1Round(v, y, h, r, color, zMin = -r) {
  for (const [w, d] of [[1, .42], [.76, .76], [.42, 1]]) {
    const z1 = d * r, z0 = Math.max(-z1, zMin);
    v.box(0, y, (z0 + z1) / 2, 2 * w * r, h, z1 - z0, color, 0);
  }
}
// One foam ring: the lit band and, under it, the groove where two of them touch, thinner and darker. The grooves are
// its identity: without them the lower rings, nearly the same width, read as one smooth wall.
export function tombaV1Ring(v, y, r, zMin) {
  tombaV1Round(v, y, .03, r - .03, K.groove, zMin);
  tombaV1Round(v, y + .03, D.ring - .03, r, K.yellow, zMin);
}

// The surface cells of the solid inside(x, y, z), on a grid s x h x s: only the ones with a free side, top or underside
// (the rest could never be seen; the lowest layer's underside is the caller's to close). `odd`: a 3D checkerboard;
// `front`: nothing ahead of the cell.
function tombaV1Cells(inside, { s, h = s, y0 = 0, layers = 1, reach = 2.5 }) {
  const out = [], n = Math.ceil(reach / s);
  for (let k = 0; k < layers; k++) {
    const y = y0 + k * h, ym = y + h / 2;
    for (let ix = -n; ix <= n; ix++) for (let iz = -n; iz <= n; iz++) {
      const x = ix * s, z = iz * s;
      if (!inside(x, ym, z)) continue;
      const side = !inside(x + s, ym, z) || !inside(x - s, ym, z) || !inside(x, ym, z + s) || !inside(x, ym, z - s);
      const top = !inside(x, ym + h, z);
      if (side || top || (k && !inside(x, ym - h, z))) out.push({ x, y, z, k, odd: (ix + iz + k) & 1, side, top, front: !inside(x, ym, z + s) });
    }
  }
  return out;
}
// Felt scales, a cell each. Every other one is 1.5 cm bigger all round and one flat teal: they overlap the flush ones
// like the real scales, and where two big ones meet at a corner their shared planes are the same colour (no flicker).
// The flush ones are two greens. Red pompoms along the spine at zs, each sunk 4 cm into the highest scale under it.
function tombaV1Scales(v, cells, zs) {
  const s = D.cell, g = .018;
  for (const c of cells) {
    if (c.front) v.box(c.x, c.y, c.z, s, s, s, K.lining, 0);
    else if (c.odd) v.box(c.x, c.y - g, c.z, s + 2 * g, s + 2 * g, s + 2 * g, K.scale[1], 0);
    else v.box(c.x, c.y, c.z, s, s, s, K.scale[c.k % 2 ? 0 : 2]);
  }
  for (const z of zs) {
    const y = Math.max(...cells.filter(c => !c.x && Math.abs(c.z - z) <= s / 2 + 1e-6).map(c => c.y + s));
    v.box(0, y - .04, z, .19, .19, .19, K.red).box(0, y + .14, z, .11, .07, .11, K.red);
  }
  return v;
}

function tombaV1Rings() {
  const v = new Vox();
  for (let i = 0; i < D.rings; i++) tombaV1Ring(v, D.waist + i * D.ring, tombaV1RingR(i), -.1);
  // The leafy fringe down both edges of the yellow: a block a ring on the widest box's front corner, 5 cm into its side
  // and 11 cm into its front, 8.7 and 3 cm proud of them at every radius (a block set by a share of the radius met one
  // of the octagon's planes at some ring; 8.7, not 8: off the scales' 12.5 cm grid at every radius). Every other one a tone lighter and 1.5 cm prouder: ruffled felt (the top one
  // among them: its top clears the top ring's).
  for (let i = 1; i < D.rings; i++) {
    const r = tombaV1RingR(i), g = i % 2 ? 0 : .015;
    for (const s of [-1, 1]) v.box(s * (r + .0185 + g / 2), D.waist + i * D.ring - g, .42 * r - .04 + g / 2, .137 + g, D.ring + 2 * g, .14 + g, K.fringe[i % 2]);
  }
  // The carrier's window: a dark pane proud of the rings (off their seams: its top would share a ring's top plane) and
  // a leafy frame, each bar on its own front plane, a tuft at both lower corners.
  v.box(0, .922, .545, .24, .26, .1, K.window, 0);
  for (const s of [-1, 1]) v.box(s * .155, .905, .565, .07, .3, .1, K.fringe[0]).box(s * .19, .85, .575, .12, .09, .12, K.fringe[1]);
  v.box(0, .872, .565, .38, .05, .11, K.fringe[0]).box(0, 1.182, .56, .3, .04, .09, K.fringe[1]);
  return v.mesh();
}

function tombaV1Shell() {
  const s = D.cell, cells = tombaV1Cells(tombaV1ShellIn, { s, y0: TOMBA_V1_SCALES_Y, layers: 6 }).filter(c => {
    if (!c.side && !c.top) return false; // the back's underside, over the skirt's hollow: never seen
    const r = tombaV1ConeR(c.y + s), x = Math.abs(c.x) + s / 2, z = c.z + s / 2; // wholly inside the rings: nor these
    return !(c.z - s / 2 > -.1 && ((x < .76 * r && z < .76 * r) || (x < r && z < .42 * r)));
  });
  return tombaV1Scales(new Vox(), cells, [-.5, -.9, -1.3, -1.7, -2.05]).mesh();
}

// The skirt: gathered satin under the outline, a column a cell in two golds (every other one 2 cm proud and 1 cm taller:
// the pleats), flaring out in tiers towards the ground about (0, zc); its top tier 6% inside the outline, so what hangs
// over it (the lowest ring, the scales) stays proud. Behind the wings it rises to the back's higher hem. A dark floor
// closes it from below, a strip a row.
function tombaV1Skirt(top) {
  const v = new Vox(), s = D.cell, zc = -.9, tiers = 2, tier = (top - D.hem) / tiers, flare = t => .94 + .08 * t;
  const cells = tombaV1Cells((x, _, z) => tombaV1SkirtIn(x, z), { s });
  for (let t = 0; t < tiers; t++) for (const c of cells.filter(c => c.side)) {
    const f = flare(t), g = c.odd ? .02 : 0, rise = !t && c.z < -.4 ? TOMBA_V1_BACK_HEM + .1 - top : 0;
    v.box(c.x * f, top - (t + 1) * tier - g / 2, zc + (c.z - zc) * f, s * f + 2 * g, tier + rise + g, s * f + 2 * g, K.gold[c.odd], 0);
  }
  const f = flare(tiers - 1) * .93; // (7% inside the columns' outer faces: never one plane with them)
  for (const z of new Set(cells.map(c => c.z))) {
    const w = Math.max(...cells.filter(c => c.z === z).map(c => c.x));
    v.box(0, D.hem + .03, zc + (z - zc) * f, (2 * w + s) * f, .04, s * f, K.goldIn, 0);
  }
  return v.mesh();
}

// The tail: it hangs from the rump's top down to the ground, a stepped chain of scaled blocks with red plates down its
// back (the older edition's side photo). Built from its hinge (0, 0, 0) down: the first block sits on the rump's top
// edge, 16 cm into it; the rest hang 2 cm and more clear of the rump and of the skirt, drifting out towards the tip.
function tombaV1Tail() {
  const v = new Vox(), steps = [[-.02, .34], [-.22, .34], [-.24, .32], [-.25, .3], [-.26, .28], [-.27, .24], [-.28, .2]];
  steps.forEach(([z, w], i) => {
    const y = -.05 - (i + 1) * .26, odd = i % 2, g = odd ? .018 : 0; // each 4 cm into the one above, never the same width
    v.box(0, y - g, z, w + 2 * g, .3 + 2 * g, w + 2 * g, odd ? K.scale[1] : K.scale[i % 4 ? 0 : 2], 0);
    if (!odd) v.box(0, y + .06, z - w / 2 - .05, .12, .18, .14, K.red).box(0, y + .11, z - w / 2 - .14, .08, .08, .06, K.red);
  });
  v.box(0, -.05 - 8 * .26 + .12, -.28, .12, .16, .12, K.lining, 0); // its teal tip
  return v.mesh();
}

export function buildTombaV1Body() {
  const top = D.waist + .065; // the skirt's top, half a ring up inside the lowest one
  return { rings: tombaV1Rings(), shell: tombaV1Shell(), skirt: tombaV1Skirt(top), tail: tombaV1Tail(), skirtTop: top };
}
