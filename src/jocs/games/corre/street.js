// The rest of the carrer de la Cort, by rule, from open photos and its measured course, in the materials and palette of the Plaça del Blat viewer:
// tall plain fronts on stone ground floors, deep balconies on slabs, bracketed eaves and hanging globes. Wider than the real street, so a big colla fits;
// it narrows to the real width where the viewer's world takes over.
import { BufferAttribute } from 'three';
import { Vox } from '../../../scene/models/voxel.js';
import { LONGEST } from './rules.js';

export const STREET_LENGTH = LONGEST + 40; // metres to the mouth of the plaça; every level ends there, and longer ones start further back
export const HALF = 5.6;
export const NARROW = 3.4; // the real Cort, near enough
export const X_SPAN = HALF - .9; // metres from the middle to the edge of play
export const MESH_FROM = -STREET_LENGTH + 15; // from here on it is the real world
const FUNNEL = [-STREET_LENGTH + 36, -STREET_LENGTH + 20];
// The real Cort's heading against its chord every 12 m from the square, from the LiDAR long section S03. It sums to nothing, so it repeats.
const HEADING = [.3, .35, .38, .29, .29, .26, .1, .09, .03, -.08, -.27, -.32, -.32, -.35, -.39, -.39];
const STEP = 2, TABLE = (() => {
  const t = [0], n = HEADING.length;
  for (let s = 0; s < STREET_LENGTH + 80; s += STEP) {
    const f = s / 12, i = Math.floor(f), a = HEADING[i % n], b = HEADING[(i + 1) % n];
    t.push(t.at(-1) + (a + (b - a) * (f - i)) * Math.min(1, s / 40) * STEP); // straightens into the square, whose world lies along z
  }
  return t;
})();
// How far the street's centre lies from z = 0's axis at z. Everything in the street is sheared by it: rules and collisions stay straight.
export const bend = z => {
  const s = Math.max(0, MESH_FROM - z) / STEP, i = Math.min(TABLE.length - 2, Math.floor(s));
  return TABLE[i] + (TABLE[i + 1] - TABLE[i]) * (s - i);
};
export const heading = z => -Math.atan(bend(z - 1) - bend(z)); // the yaw of something running along the street at z
const CHUNK = 60, FLOOR = 3.3;
const KIND = { none: 0, setts: 2, ashlar: 5, plaster: 6, tile: 7 };
const P = { plaster: ['#E9D9B8', '#E2CFA9', '#F2DFB6', '#D9C8A8', '#EAD3A6', '#E7C899', '#EECBA9'], stone: '#DEBE8C', stone2: '#D3B27A', trim: '#E3C99B', under: '#8F7558', timber: '#7E4827', door: '#5C3119', glass: '#1F5C60', iron: '#2E2A2C', shutter: '#2F8052', roof: '#B87958', street: '#9A9C9B', leaf: '#4F9A38', flags: ['#E23A2A', '#FFC928', '#2F7FD6', '#3FA648'] };

// The width at any point: wide for the run, stepping in to the real street.
export const halfAt = z => (z >= FUNNEL[0] ? HALF : z <= FUNNEL[1] ? NARROW : NARROW + (HALF - NARROW) * (z - FUNNEL[1]) / (FUNNEL[0] - FUNNEL[1]));

class Voxels extends Vox { // boxes that know which texture layer they wear
  kind = 0;
  use(kind) { this.kind = KIND[kind]; return this; }
  add(g, color, jitter) {
    g.setAttribute('surfaceKind', new BufferAttribute(new Uint8Array(g.attributes.position.count).fill(this.kind), 1));
    return super.add(g, color, jitter);
  }
}

function seeded(seed) { // the same street every time
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
}

function balcony(v, dir, x, y, z, w) { // the Cort's: a thick stone slab on brackets, well out from the wall, with an iron rail
  v.use('ashlar').box(x + dir * .55, y, z, 1.1, .2, w + .3, P.stone, 0);
  v.box(x + dir * .2, y - .3, z - w / 2, .4, .3, .2, P.stone2, 0);
  v.box(x + dir * .2, y - .3, z + w / 2, .4, .3, .2, P.stone2, 0);
  v.use('none').box(x + dir * 1, y + 1.05, z, .06, .06, w + .25, P.iron, 0);
  for (let i = 0; i <= 5; i++) v.box(x + dir * 1, y + .2, z - w / 2 + i * w / 5, .04, .85, .04, P.iron, 0);
  for (const s of [-1, 1]) {
    v.box(x + dir * .55, y + 1.05, z + s * w / 2, .95, .06, .06, P.iron, 0);
    v.box(x + dir * .55, y + .2, z + s * w / 2, .04, .85, .04, P.iron, 0);
  }
}

// Each layer of the front has its own depth: two faces in one plane flicker at a distance.
function house(v, side, z0, width, floors, r) {
  const half = halfAt(z0 - width / 2) + r() * .3, x = side * half, tall = floors * FLOOR + 1.6, mid = z0 - width / 2, back = 9, dir = -side; // fronts do not line up
  const color = P.plaster[Math.floor(r() * P.plaster.length)], wood = r() < .75, balconies = .55 + r() * .4;
  v.use('plaster').box(x + side * (back / 2 + .02), 0, mid, back, tall, width - .04, color, .015);
  v.use('ashlar').box(x + dir * .04, 0, mid, .12, FLOOR - .2, width, P.stone2, .01); // the ground floor's stone, .10
  v.box(x + dir * .1, FLOOR - .3, mid, .3, .25, width, P.trim, 0);
  v.box(x + dir * .14, tall - .4, mid, .55, .4, width + .1, P.trim, 0); // cornice
  for (let z = z0 - .5; z > z0 - width; z -= 1.1) v.box(x + dir * .55, tall - .7, z, .5, .3, .3, P.stone2, 0); // its brackets
  v.use('tile').box(x + side * 2.1, tall, mid, 5, .7, width, P.roof, .03);
  v.box(x + dir * .45, tall, mid, 1.1, .16, width + .1, P.roof, .02);
  const bays = Math.max(2, Math.round(width / 3.4)), bay = width / bays;
  for (let b = 0; b < bays; b++) {
    const z = z0 - bay * (b + .5), arched = r() < .25, dw = Math.min(1.9, bay * .6);
    v.use('ashlar').box(x + dir * .09, 0, z, .1, 2.75, dw + .5, P.stone, .01); // door surround, .14
    if (arched) v.box(x + dir * .09, 2.75, z, .1, .3, dw - .1, P.stone2, .01);
    v.use('none').box(x + dir * .17, 0, z, .08, 2.5, dw, arched ? P.door : (r() < .5 ? '#2B2A2C' : P.timber), 0); // shop shutters and doors, .21
    for (let f = 0; f < floors; f++) {
      const y = FLOOR + f * FLOOR + .1, w = .95, h = 2.35; // tall and narrow: balcony doors
      v.use('none').box(x + dir * .04, y, z, .14, h, w + .2, wood ? P.timber : P.shutter, 0); // the frame, .11
      v.box(x + dir * .08, y + .08, z, .14, h - .16, w - .16, P.glass, 0); // .15
      if (r() < balconies) {
        balcony(v, dir, x, y - .12, z, w + .5);
        if (r() < .18) v.use('none').box(x + dir * .85, y + .08, z + .3, .3, .3, .3, P.leaf, .1);
      }
    }
  }
}

function lamps(v, z) { // twin white globes hung on a wire across the street, as in the photos
  const y = 11;
  v.use('none').box(0, y + .9, z, HALF * 2 + 1, .05, .05, P.iron, 0);
  v.box(0, y + .2, z, .08, .7, .08, P.iron, 0);
  v.box(0, y + .2, z, .9, .06, .06, P.iron, 0);
  for (const s of [-1, 1]) v.box(s * .45, y - .3, z, .36, .5, .36, '#FFFDF4', 0);
}

export function buildStreet(scene, material) {
  const r = seeded(4137), houses = [], stretches = [], START = 30;
  for (const side of [-1, 1]) {
    let z = START;
    while (z > MESH_FROM) {
      const width = Math.max(4, Math.min(z - MESH_FROM, 6 + r() * 9));
      houses.push({ side, z, width, floors: 3 + Math.floor(r() * 2.6) });
      z -= width;
    }
  }
  // one merged mesh per stretch: culled by the camera and a single draw call each
  for (let top = START; top > MESH_FROM; top -= CHUNK) {
    const v = new Voxels(), end = Math.max(top - CHUNK, MESH_FROM);
    for (const h of houses) if (h.z <= top && h.z > top - CHUNK) house(v, h.side, h.z, h.width, h.floors, r);
    for (let z = top; z > end - 3; z -= 3) { // short slabs, so that the curve stays a curve; a darker lane down the middle, as in the photos
      v.use('setts').box(0, -.2, z - 1.5, HALF * 2 + 3, .2, 3, '#ABABA6', 0);
      v.box(0, -.15, z - 1.5, HALF * .9, .16, 3, P.street, 0);
    }
    for (let z = top - 20; z > Math.max(end, FUNNEL[0] + 12); z -= 40) lamps(v, z);
    const m = v.mesh(), a = m.geometry.attributes.position;
    for (let i = 0; i < a.count; i++) a.setX(i, a.getX(i) + bend(a.getZ(i)));
    m.geometry.computeBoundingSphere();
    m.material = material;
    m.castShadow = m.receiveShadow = false;
    m.userData.top = top;
    scene.add(m);
    stretches.push(m);
  }
  return stretches;
}
