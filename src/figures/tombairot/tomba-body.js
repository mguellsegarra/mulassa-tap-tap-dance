// The Tombairot's body below the neck: the beehive of foam rings with its leafy fringe and the carrier's window, the
// long scaled body behind it, the gathered skirt and the tail in three hinged pieces. All in the body's frame (ground at
// y 0, front +z). Bold on purpose, the Mulassa's and the Bou's step: a ring is two real noodles, a scale a 25 cm cell.
// No two faces of different colours share a plane: every offset is 1 cm or more.
import { Vox } from '../../scene/models/voxel.js';
import { TOMBA, TOMBA_DIM, TOMBA_ROWS, TOMBA_ROWS_Z, TOMBA_ROW, tombaRingR, tombaTiers } from './tomba-form.js';

// A ring's plan about (0, zc): three boxes that step round like an octagon (the Bou's body: a core with stepped edges).
// One colour and no jitter: their tops share a plane. zMin drops the part the scaled body hides.
export function tombaRound(v, y, h, r, color, zc = 0, zMin = -Infinity) {
  for (const [w, d] of [[1, .42], [.76, .76], [.42, 1]]) {
    const z1 = zc + d * r, z0 = Math.max(zc - d * r, zMin);
    v.box(0, y, (z0 + z1) / 2, 2 * w * r, h, z1 - z0, color, 0);
  }
}
// One foam ring: the lit band and, under it, the groove where two of them touch, thinner and darker. The grooves are
// its identity: without them the lower rings, nearly the same width, read as one smooth wall.
export function tombaRing(v, y, h, r, zc, zMin) {
  tombaRound(v, y, .03, r - .03, TOMBA.groove, zc, zMin);
  tombaRound(v, y + .03, h - .03, r, TOMBA.yellow, zc, zMin);
}

function tombaRings() {
  const v = new Vox();
  for (let i = 0; i < TOMBA_DIM.rings; i++) {
    const y = TOMBA_DIM.waist + i * TOMBA_DIM.ring, r = tombaRingR(i), g = i % 2 ? .02 : 0;
    if (i) tombaRing(v, y, TOMBA_DIM.ring, r, 0, -.1); else tombaRound(v, y, TOMBA_DIM.ring, r, TOMBA.yellow, 0, -.1); // (the skirt hides the lowest groove)
    // The leafy fringe down both edges of the yellow: a tuft a ring, half a centimetre short of its seams, 3.5 cm into
    // the ring and 9.5 proud (half a centimetre off the scales' grid behind it). Every other one a tone lighter and
    // 2 cm prouder: ruffled felt. (Its front must stay 3 mm off the ring's and the groove's own fronts, 0.42 of their
    // radius: tools/qa/tombairot-probe.mjs says so when a radius changes.)
    for (const s of [-1, 1]) v.box(s * (r + .03 + g / 2), y + .005, .06 + g / 2, .13 + g, TOMBA_DIM.ring - .01, .16 + g, TOMBA.fringe[i % 2]);
  }
  // The carrier's window on the second and third rings: a dark pane 2 to 4 cm proud of them, a leafy bar at each side
  // and over it, a tuft at both lower corners.
  const y = TOMBA_DIM.waist + TOMBA_DIM.ring + .01;
  v.box(0, y, .625, .24, .25, .07, TOMBA.window, 0);
  for (const s of [-1, 1]) v.box(s * .16, y - .03, .64, .08, .31, .07, TOMBA.fringe[0]).box(s * .175, y - .08, .645, .09, .1, .08, TOMBA.fringe[1]);
  v.box(0, y + .25, .61, .3, .06, .1, TOMBA.fringe[1]);
  return v.mesh();
}

// The scaled body: a full-width box a row and a tier (nothing hollow, so no hole can open), each one felt scale on
// either flank. Every other one is 2 cm bigger all round and one flat teal: it laps the flush ones like the real scales,
// and where two of them meet at a corner their shared planes are the same colour. The flush ones are two greens.
function tombaShell() {
  const v = new Vox(), g = .02;
  TOMBA_ROWS.forEach((row, k) => {
    const z = TOMBA_ROWS_Z - (k + .5) * TOMBA_ROW, tiers = tombaTiers(row);
    tiers.forEach(([y0, y1, w], j) => {
      if ((k + j) % 2 === 0) v.box(0, y0 - g, z, 2 * (w + g), y1 - y0 + 2 * g, TOMBA_ROW + 2 * g, TOMBA.scale[1], 0);
      else v.box(0, y0, z, 2 * w, y1 - y0, TOMBA_ROW, TOMBA.scale[j % 4 ? 0 : 2]);
    });
    // red pompoms down the spine, a stepped dome sunk 3 cm into the ridge (the rump's rows carry the tail instead)
    const top = tiers.at(-1)[1];
    if (k && k < 7) v.box(0, top - .03, z, .2, .13, .2, TOMBA.red).box(0, top + .09, z, .12, .07, .12, TOMBA.red);
  });
  return v.mesh();
}

// The skirt: gathered gold satin to the ground under the whole body, 23 % of its height. A slab a fold across its full
// width (solid: its underside is closed), every other fold 4 cm proud and lit, the others in the shade. Under the rings
// it follows their octagon 1 cm inside it, its front facet in columns; under the scales two folds a row, 4 cm inside
// their flanks, and columns again across the rump's end. Every top hides 4 cm up inside the lowest ring or the lowest scales.
function tombaSkirt() {
  const v = new Vox(), h0 = TOMBA_DIM.hem, h = TOMBA_DIM.waist + .04 - h0;
  const fold = (x, z0, z1, w, lit) => v.box(x, h0, (z0 + z1) / 2, w, h, z1 - z0, TOMBA.gold[lit ? 0 : 1]);
  for (let i = -2; i <= 2; i++) fold(i * .1, .445, i % 2 ? .63 : .59, .1, i % 2);                      // the front facet
  fold(0, .345, .445, .95, true); fold(0, .25, .345, .87, false);                                       // the octagon's corner
  fold(0, .16, .25, 1.26, true); fold(0, .07, .16, 1.18, false); fold(0, TOMBA_ROWS_Z, .07, 1.26, true); // its sides
  TOMBA_ROWS.forEach(([w], k) => {
    const z = TOMBA_ROWS_Z - k * TOMBA_ROW;
    fold(0, z - TOMBA_ROW / 2, z, 2 * (w - .08), false);
    if (k < TOMBA_ROWS.length - 1) fold(0, z - TOMBA_ROW, z - TOMBA_ROW / 2, 2 * (w - .04), true);
    // the last one in seven columns, as the front facet: folds across the rump's end, 2 and 6 cm inside its scales
    else for (let i = -3; i <= 3; i++) fold(i * 2 * (w - .04) / 7, z - TOMBA_ROW + (i % 2 ? .06 : .02), z - TOMBA_ROW / 2, 2 * (w - .04) / 7, !(i % 2));
  });
  return v.mesh();
}

// The tail carries on the spine's line: it leaves the back over the rump wide and proud of it (its first three blocks
// sink 8 cm and more into the rump's steps), hangs clear behind it and curls down to the ground, tapering, where its
// tip trails. Darker than the scales (the fringe's greens), a red plate standing on the back of most blocks (the older
// edition's side photo). Three hinged pieces, each
// [hinge y, hinge z, blocks]; a block: [y0, y1, z0, z1, width, and its plate's y0, y1, z0, z1]. In the body's frame.
// Every block laps the next by 6 cm or more, and the hinges sit inside those laps.
const TOMBA_TAIL = [
  [2.2, -1.8, [[2.08, 2.42, -2.12, -1.74, .6, 2.38, 2.54, -2.04, -1.84], [1.84, 2.26, -2.44, -2.04, .53, 2.22, 2.38, -2.38, -2.16],
    [1.52, 2, -2.74, -2.36, .46, 1.95, 2.1, -2.7, -2.5]]],
  [1.6, -2.67, [[1.16, 1.66, -2.92, -2.6, .38, 1.3, 1.52, -3.03, -2.88], [.8, 1.26, -3.04, -2.74, .32, .92, 1.12, -3.14, -3]]],
  [.85, -2.94, [[.46, .9, -3.12, -2.84, .26, .57, .75, -3.21, -3.08], [.2, .54, -3.2, -2.94, .2, .29, .43, -3.28, -3.16], [.06, .28, -3.36, -3.06, .16],
    [.04, .17, -3.56, -3.3, .12]]],
];
function tombaTail() {
  let n = 0;
  return TOMBA_TAIL.map(([hy, hz, blocks]) => {
    const v = new Vox();
    for (const [y0, y1, z0, z1, w, p0, p1, q0, q1] of blocks) {
      v.box(0, y0 - hy, (z0 + z1) / 2 - hz, w, y1 - y0, z1 - z0, TOMBA.fringe[n++ % 2]);
      if (p0) v.box(0, p0 - hy, (q0 + q1) / 2 - hz, .1, p1 - p0, q1 - q0, TOMBA.red);
    }
    return { mesh: v.mesh(), y: hy, z: hz };
  });
}

export function buildTombaBody() {
  return { rings: tombaRings(), shell: tombaShell(), skirt: tombaSkirt(), tail: tombaTail() };
}
