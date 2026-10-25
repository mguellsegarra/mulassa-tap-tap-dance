// The plaza: buildings, balconies, flags, trees, lamps and the ground.
import * as THREE from 'three';
import { pick, rnd, Vox, MAT } from './voxel.js';
import { buildPerson, HATS } from './people.js';
import { BAND, buildMusician } from './band.js';
import { buildBackdrop } from './backdrop.js';

// ---------------------------------------------------------------- Plaça
const WALL = ['#e8d3a8', '#f0c9a0', '#e6b98a', '#f3e2c3', '#d99a73', '#efd8b0', '#c98f6a'];
// ---- Festa major decor, hung flat on the façades so it never reaches the open square the camera moves in, and
// spread out (never two flags on neighbouring windows): hanging flags from the balconies, taller than wide, as people
// hang them (estelades blava and vermella with the triangle at the top, the bandera de Valls), strings of coloured pennants over some
// ground floors and the escut de Valls over the middle of the porxos.
const FLAG = { red: '#d62828', yellow: '#f5c518', blue: '#1f4fb8', white: '#f7f7f2', gold: '#d9a521', green: '#3a9d4b' };
// A simplified 5-point star, 7×7 voxels (top row first): chunky enough to still read as a star across the plaça.
const STAR = ['...#...', '..###..', '#######', '.#####.', '..###..', '.##.##.', '.#...#.'].flatMap((row, r) =>
  [...row.matchAll(/#+/g)].map(m => [r, m.index, m[0].length]));
// A layer in a façade's frame: a = along it (to the right as seen from the plaça), n = out of it; w along. Only its
// front face is drawn (t: the depth it would have as a box, so layers of different t never share a plane).
function fbox(v, [fx, fz], cx, cz, a, y, n, w, h, t, col) {
  const out = n + t / 2;
  v.plate(cx + fz * a + fx * out, y, cz - fx * a + fz * out, w, h, fx, fz, col);
}
// A hanging (portrait) flag centred on (cx, cz) + n, from `top` down: kind 1 estelada blava (blue triangle, white star),
// 2 estelada vermella (the yellow-and-red one: yellow triangle, red star; the stripes run down, the triangle hangs from the
// top edge pointing down, the star inside it), 3 the bandera de Valls
// ("tres faixes iguals, vermella, blanca i vermella", 2:3), hung the same way: its stripes run down too.
// Layers step 5 mm towards the plaça: no coplanar faces.
function hanging(v, face, cx, cz, top, n, W, H, kind) {
  const y0 = top - H;
  if (kind === 3) {
    fbox(v, face, cx, cz, 0, y0, n, W, H, 0.02, FLAG.red);
    fbox(v, face, cx, cz, 0, y0, n, W / 3, H - 0.01, 0.03, FLAG.white);
    return;
  }
  const s = W / 9;
  fbox(v, face, cx, cz, 0, y0, n, W, H, 0.02, FLAG.yellow);
  for (let i = 1; i < 9; i += 2) fbox(v, face, cx, cz, -W / 2 + (i + 0.5) * s, y0, n, s, H - 0.01, 0.03, FLAG.red);
  const tri = kind === 1 ? FLAG.blue : FLAG.yellow, star = kind === 1 ? FLAG.white : FLAG.red;
  const D = W * 0.8, rows = 9;
  for (let i = 0; i < rows; i++) fbox(v, face, cx, cz, 0, top - (i + 1) * D / rows, n, W * (1 - (i + 0.5) / rows), D / rows, 0.04, tri);
  // The star sits on the triangle's incentre. The vermella's yellow triangle melts into the yellow stripes, so its red
  // star is a touch smaller and higher: a clear yellow gap above the red stripes' ends, or its legs would run into them.
  const c = W * (kind === 1 ? 0.068 : 0.06), sy = top - D * (kind === 1 ? 0.36 : 0.31);
  for (const [r, start, len] of STAR) fbox(v, face, cx, cz, (start + len / 2 - 3.5) * c, sy + (2.5 - r) * c, n, len * c, c, 0.05, star);
}
// A string of little triangular pennants (red, yellow, green, blue, white) across a façade (front centre cx, cz),
// sagging from y, n out of the wall. Clipped to |along| <= lim in world terms: corner fronts run on behind the side
// rows, and strings would cross.
const PENNANT = [FLAG.red, FLAG.yellow, FLAG.green, FLAG.blue, FLAG.white];
function garland(v, face, cx, cz, along, y, n, lim = 16) {
  const [fx, fz] = face, c = fx === 0 ? cx : cz, s = fx === 0 ? fz : -fx; // world coordinate along = c + s * a
  const lo = Math.max(-along / 2 + 0.3, Math.min((-lim - c) * s, (lim - c) * s));
  const hi = Math.min(along / 2 - 0.3, Math.max((-lim - c) * s, (lim - c) * s));
  const N = Math.floor((hi - lo) / 0.45), mid = (lo + hi) / 2, k0 = (Math.random() * 5) | 0;
  if (N < 2) return;
  for (let i = 0; i < N; i++) {
    const a = mid + (i - (N - 1) / 2) * 0.45, yy = y - Math.sin(((i + 0.5) / N) * Math.PI) * 0.15; // a gentle sag
    fbox(v, face, cx, cz, a, yy, n - 0.02, 0.45, 0.025, 0.02, '#3a3230'); // the cord
    for (let k = 0; k < 3; k++) fbox(v, face, cx, cz, a, yy - 0.1 * (k + 1), n, 0.3 - k * 0.1, 0.1, 0.03, PENNANT[(i + k0) % 5]);
  }
}
// The escut de Valls ("escut caironat: de gules, una faixa d'argent; per timbre, una corona mural de ciutat"):
// a red lozenge with a white fess, a gold mural crown on top. Centred at `a` along the front, bottom at y, size s.
function escut(v, face, cx, cz, a, y, n, s) {
  const rows = 9, h = s / rows;
  for (let i = 0; i < rows; i++) {
    const w = s * 0.8 * (1 - Math.abs(i - 4) / 4.6);
    fbox(v, face, cx, cz, a, y + i * h, n, w, h, 0.03, i >= 3 && i <= 5 ? FLAG.white : FLAG.red);
  }
  fbox(v, face, cx, cz, a, y + s + 0.01, n, s * 0.5, s * 0.1, 0.03, FLAG.gold); // the crown's wall...
  for (const k of [-1, 0, 1]) fbox(v, face, cx, cz, a + k * s * 0.19, y + s + 0.01 + s * 0.1, n, s * 0.1, s * 0.08, 0.03, FLAG.gold); // ...and towers
}
function building(v, x, z, w, h, d, face, arcade, deco = v, spots = [], arms = false) {
  const col = pick(WALL);
  v.box(x, 0, z, w, h, d, col);
  v.box(x, h, z, w + 0.3, 0.25, d + 0.3, '#b5563a'); // teula
  v.box(x, h + 0.25, z, w - 0.4, 0.35, d - 0.4, '#c4613f');
  // windows on the side facing the plaça (face = unit vector [fx, fz])
  const [fx, fz] = face, along = fx === 0 ? w : d;
  const fx0 = x + fx * (w / 2 + 0.02), fz0 = z + fz * (d / 2 + 0.02); // centre of the front
  // A big hanging estelada from the eaves on a few fronts; some others get a string of pennants over the ground floor
  // (2.6–3.05 m: between the ground-floor window tops, 2.6 at the sides, and the first balconies' flags, from 3.1).
  const big = along > 4.6 && Math.abs(fx === 0 ? x : z) < 14.8 && Math.random() < 0.1; // not at the corners
  if (big) hanging(deco, face, fx0, fz0, h - 0.15, 1.0, 1.5, 2.6, Math.random() < 0.5 ? 1 : 2); // blue or vermella, half and half
  if (arms) escut(deco, face, fx0, fz0, 0, 2.9, 1.05, 0.7); // over the porxos, under the first balconies
  else if (Math.random() < (arcade ? 0.6 : 0.35)) garland(deco, face, fx0, fz0, along, 3.05, 1.05);
  for (let fl = arcade ? 1 : 0; fl * 3 + 1 < h - 1; fl++) {
    let flagged = false; // the window before this one: never two flags side by side
    for (let a = -along / 2 + 1; a <= along / 2 - 1; a += 1.8) {
      const px = x + (fx === 0 ? a : fx * (w / 2 + 0.02)), pz = z + (fz === 0 ? a : fz * (d / 2 + 0.02));
      const ww = fx === 0 ? 0.8 : 0.06, wd = fx === 0 ? 0.06 : 0.8, y = fl * 3 + 1.2;
      v.box(px, y, pz, ww, 1.4, wd, '#2e2a2a', 0);
      v.box(px + (fx === 0 ? -0.55 : 0), y, pz + (fz === 0 ? -0.55 : 0), fx === 0 ? 0.3 : 0.08, 1.4, fx === 0 ? 0.08 : 0.3, '#3f6f45');
      v.box(px + (fx === 0 ? 0.55 : 0), y, pz + (fz === 0 ? 0.55 : 0), fx === 0 ? 0.3 : 0.08, 1.4, fx === 0 ? 0.08 : 0.3, '#3f6f45');
      if (fl > 0 && Math.random() < 0.6) { // balcony
        const bx = px + fx * 0.35, bz = pz + fz * 0.35;
        v.box(bx, y - 0.1, bz, fx === 0 ? 1.2 : 0.7, 0.1, fx === 0 ? 0.7 : 1.2, '#8a8580');
        v.box(bx + fx * 0.33, y, bz + fz * 0.33, fx === 0 ? 1.2 : 0.05, 0.6, fx === 0 ? 0.05 : 1.2, '#2a2a2a');
        const hid = big && Math.abs(a) < 1.4 && y > h - 4.6; // behind the big estelada
        if (fl === 1 && !hid) spots.push({ x: px + fx * 0.3, z: pz + fz * 0.3, y, fx, fz }); // room for someone to look out
        const r = hid || flagged || (arms && fl === 1) ? 1 : Math.random(); // over the escut: bare
        // about a third of balconies, hanging under the slab: estelada vermella 11%, estelada blava 11% (as many of
        // each), bandera de Valls 8%
        const kind = r < 0.11 ? 2 : r < 0.19 ? 3 : r < 0.30 ? 1 : -1;
        if (kind >= 0) hanging(deco, face, bx + fx * 0.4, bz + fz * 0.4, y - 0.1, 0, 0.62, 1.0, kind);
        flagged = kind >= 0;
      } else flagged = false;
    }
    if (arcade) { // porxos
      for (let a = -along / 2 + 1.2; a <= along / 2 - 1; a += 2.4) {
        const px = x + (fx === 0 ? a : fx * (w / 2 + 0.02)), pz = z + (fz === 0 ? a : fz * (d / 2 + 0.02));
        v.box(px, 0, pz, fx === 0 ? 1.7 : 0.06, 2.4, fx === 0 ? 0.06 : 1.7, '#3a3230', 0);
        v.box(px, 2.4, pz, fx === 0 ? 1.1 : 0.06, 0.3, fx === 0 ? 0.06 : 1.1, '#3a3230', 0);
      }
    }
  }
}
function tree(v, x, z) {
  for (let y = 0; y < 3.2; y += 0.4) v.box(x, y, z, 0.45, 0.4, 0.45, pick(['#b8ad96', '#9d927c', '#d0c7b0']), 0);
  for (let i = 0; i < 14; i++) v.box(x + rnd(-1.4, 1.4), rnd(3, 4.8), z + rnd(-1.4, 1.4), rnd(0.9, 1.5), rnd(0.8, 1.2), rnd(0.9, 1.5), pick(['#4f9a3a', '#5fb043', '#3f8a33']), 0.08);
}
function lamp(v, x, z) {
  v.box(x, 0, z, 0.25, 0.3, 0.25, '#222').box(x, 0.3, z, 0.12, 3.6, 0.12, '#2b2b2b');
  v.box(x, 3.9, z, 0.4, 0.5, 0.4, '#fff2b0', 0).box(x, 4.4, z, 0.5, 0.12, 0.5, '#222');
}
// One hanging flag on its own (kind as in hanging(); big: the one from the eaves), a mesh per layer, for the
// z-fighting scan in tests/render/render-quality.mjs.
export function buildFlag(kind, big = false) {
  const v = new Vox(), g = new THREE.Group();
  hanging(v, [0, 1], 0, 0, big ? 2.6 : 1.0, 0, big ? 1.5 : 0.62, big ? 2.6 : 1.0, kind);
  for (const geo of v.g) g.add(new THREE.Mesh(geo, MAT));
  return g;
}
// backdrop: how many simple figures stand along the façades; balconies: how many people look out of the first floors
// (waving: skinnable people returned in `balcony` for the crowd mesh, else static boxes merged into the buildings).
// the paving: S m square of T m tiles, alternating light/dark (figures/bou/bou-show.js lights them for the Bou's disco)
export const PAVING = { size: 34, tile: 2 };
export function buildPlaza({ backdrop = 0, balconies = 0, waving = false } = {}) {
  const group = new THREE.Group();
  const v = new Vox();
  const S = PAVING.size, T = PAVING.tile;
  for (let x = -S / 2; x < S / 2; x += T) for (let z = -S / 2; z < S / 2; z += T) {
    const light = ((x + z) / T) % 2 === 0;
    v.box(x + T / 2, -0.1, z + T / 2, T - 0.06, 0.1, T - 0.06, light ? '#dccaa8' : '#cfb994', 0.03);
  }
  v.box(0, -0.2, 0, S + 40, 0.12, S + 40, '#8a7a66', 0);
  const floor = v.mesh();
  floor.castShadow = false;
  group.add(floor);

  const b = new Vox(), deco = new Vox(); // deco: the flags, merged into the buildings' mesh (no extra draw call)
  const E = S / 2 + 3, spots = [];
  // four sides of the plaça; north side has arcades like the Plaça del Blat
  let arms = true; // the escut de Valls once over the porxos, on a central front
  for (let a = -E + 1; a < E; a += 0) {
    const w = rnd(4, 6.5), here = arms && w > 5.2 && Math.abs(a + w / 2) < 8;
    if (here) arms = false;
    building(b, a + w / 2, -E, w, rnd(8, 12), 5, [0, 1], true, deco, spots, here);
    building(b, a + w / 2, E, w, rnd(7, 11), 5, [0, -1], false, deco, spots);
    a += w;
  }
  for (let a = -E + 3; a < E - 3; a += 0) {
    const w = rnd(4, 6.5);
    building(b, -E, a + w / 2, 5, rnd(7, 11), w, [1, 0], false, deco, spots);
    building(b, E, a + w / 2, 5, rnd(8, 12), w, [-1, 0], false, deco, spots);
    a += w;
  }
  // campanar de Sant Joan behind the north side
  const cx = -6, cz = -E - 9;
  b.box(cx, 0, cz, 6, 26, 6, '#cdb58c').box(cx, 26, cz, 6.6, 0.5, 6.6, '#b59c74');
  b.box(cx, 26.5, cz, 4.6, 5, 4.6, '#d4bd95');
  for (const [dx, dz, w, d] of [[0, 2.32, 1.4, 0.1], [0, -2.32, 1.4, 0.1], [2.32, 0, 0.1, 1.4], [-2.32, 0, 0.1, 1.4]]) b.box(cx + dx, 27.5, cz + dz, w, 2.6, d, '#2b2525', 0);
  b.box(cx, 31.5, cz, 3.4, 0.5, 3.4, '#b59c74').box(cx, 32, cz, 2, 2.5, 2, '#c9ae83').box(cx, 34.5, cz, 0.8, 1.5, 0.8, '#b59c74').box(cx, 36, cz, 0.12, 1.4, 0.12, '#333');
  b.box(cx, 18, cz + 3.02, 1.8, 1.8, 0.06, '#f5f0e0', 0).box(cx, 18.85, cz + 3.06, 0.8, 0.1, 0.02, '#222', 0);
  // Trees and lamps: each its own mesh (main.js hides one that would stand between the camera and the mulassa or
  // against the lens) and set back by the building fronts, out of the play camera's path (south of her, x within ~9).
  const props = [];
  const prop = (make, x, z, r, h) => { const pv = new Vox(); make(pv, x, z); const m = pv.mesh(); group.add(m); props.push({ mesh: m, x, z, r, h }); };
  for (const [x, z] of [[-15.2, -15.2], [15.2, -15.2], [-15.2, 15.2], [15.2, 15.2], [-15.2, -3], [15.2, -3]]) prop(tree, x, z, 2.2, 5.5);
  for (const [x, z] of [[-9, -16.6], [9, -16.6], [-16.6, 7], [16.6, 7], [-6, 16.6], [6, 16.6]]) prop(lamp, x, z, 0.4, 4.6);
  // banderetes strung across the plaça
  const COLS = ['#d62828', '#f5c518', '#2f62d6', '#3a9d4b', '#ffffff', '#f07a1a'];
  // ponytail: strung along the edges only, so they never sit between camera and dancers
  const e = E - 2.4;
  for (const [ax, az, bx, bz] of [[-e, -e, e, -e], [e, -e, e, e], [e, e, -e, e], [-e, e, -e, -e]]) {
    const L = Math.hypot(bx - ax, bz - az), N = Math.floor(L / 0.7);
    for (let i = 1; i < N; i++) {
      const t = i / N, y = 8 - Math.sin(t * Math.PI) * 1.6, x = ax + (bx - ax) * t, z = az + (bz - az) * t;
      const flat = ax === bx;
      for (let k = 0; k < 3; k++) { // little triangle flag
        const w = 0.34 - k * 0.12;
        b.box(x, y - 0.12 * (k + 1), z, flat ? 0.03 : w, 0.12, flat ? w : 0.03, COLS[i % COLS.length], 0);
      }
    }
  }
  // How far out the flags stay: the nearest any of them comes to the centre, along x or z (the camera keeps inside
  // inner - 1.5, so they can never stand between it and her).
  const decoReach = Math.min(...deco.g.map(g => {
    g.computeBoundingBox(); const { min, max } = g.boundingBox;
    return Math.max(min.x > 0 ? min.x : max.x < 0 ? -max.x : 0, min.z > 0 ? min.z : max.z < 0 ? -max.z : 0);
  }));
  const decoBoxes = deco.g.length;
  b.g.push(...deco.g);
  // People on the first-floor balconies, over the railing (legs hidden behind it) and above the flags hung under
  // the slab. Static ones are baked into the buildings' mesh; waving ones join the skinned crowd (main.js).
  const balcony = [];
  for (const s of spots.sort(() => Math.random() - 0.5).slice(0, balconies)) {
    const p = buildPerson({ hat: Math.random() < 0.2 ? pick(HATS) : undefined });
    for (const l of p.legs) p.g.remove(l);
    p.legs = [];
    p.g.position.set(s.x, s.y, s.z);
    p.g.rotation.y = Math.atan2(s.fx, s.fz);
    p.ph = rnd(0, Math.PI * 2);
    if (waving) { group.add(p.g); balcony.push(p); continue; }
    p.arms.forEach((a, i) => { a.rotation.x = i ? -0.5 : -0.6; a.rotation.z = i ? -0.1 : 0.1; }); // leaning on the rail
    p.g.updateMatrixWorld(true);
    p.g.traverse(o => o.isMesh && b.g.push(o.geometry.applyMatrix4(o.matrixWorld)));
  }
  group.add(b.mesh());

  // the banda de música that plays the ball (buildMusician), all of them: main.js places them and thins them out (placeBand)
  const band = BAND.map(([kind, row]) => Object.assign(buildMusician(kind), { kind, row }));
  band.forEach(p => group.add(p.g));
  const back = backdrop ? buildBackdrop(backdrop, E - 3, props) : null;
  if (back) group.add(back.mesh);
  return { group, band, balcony, backdrop: back, props, inner: E - 3, decoReach, decoBoxes }; // inner: half-width of the open square, to the building fronts (5 deep, centred on E) and their balconies
}
