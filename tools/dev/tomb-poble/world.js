// The slice's city as one merged, vertex-coloured mesh: real volumes from slice.json, façades from a small kit
// (stucco, shutters, iron balconies, porxos) inspired by the street's look. Nothing is copied from any imagery.
import * as THREE from 'three';
const STUCCO = ['#e5c999', '#dcb987', '#ecd6ae', '#d6a878', '#e8cfa2', '#cfae88', '#e2bf94', '#d9c3a2'];
const SHUTTER = ['#7a4f33', '#8a5b3a', '#5f4a3a', '#6f6a5a', '#94673f'];
const STONE = '#d8c6a3', IRON = '#2c2a2c', DARK = '#3b3029', PAVE = ['#7f776c', '#787066', '#857d71', '#716a60'];
const hash = s => { let h = 7; for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };
const c3 = hex => new THREE.Color(hex);
class Kit {
  constructor() { this.p = []; this.n = []; this.c = []; this.i = []; this.v = 0; }
  // A quad a,b,c,d (counter-clockwise from its front); colours bottom and top, for the walls' painted contact shade.
  quad(a, b, c, d, nx, ny, nz, low, high = low) {
    this.p.push(...a, ...b, ...c, ...d);
    for (let k = 0; k < 4; k++) this.n.push(nx, ny, nz);
    this.c.push(low.r, low.g, low.b, low.r, low.g, low.b, high.r, high.g, high.b, high.r, high.g, high.b);
    const v = this.v; this.i.push(v, v + 1, v + 2, v, v + 2, v + 3); this.v += 4;
  }
  // A plate on a façade frame: along `u` from the wall's foot, `y` up, `o` out from the wall; only its face.
  plate(f, u, w, y, h, o, col, top = col) {
    const a = [f.x + f.dx * u + f.nx * o, y, f.z + f.dz * u + f.nz * o], b = [a[0] + f.dx * w, y, a[2] + f.dz * w];
    this.quad(a, b, [b[0], y + h, b[2]], [a[0], y + h, a[2]], f.nx, 0, f.nz, col, top);
  }
  // A slab sticking out of the façade: underside, top and front (never seen from behind).
  slab(f, u, w, y, t, depth, col) {
    const P = (a, o, yy) => [f.x + f.dx * a + f.nx * o, yy, f.z + f.dz * a + f.nz * o];
    const shade = col.clone().multiplyScalar(.62);
    this.quad(P(u, depth, y), P(u + w, depth, y), P(u + w, 0, y), P(u, 0, y), 0, -1, 0, shade);
    this.quad(P(u, 0, y + t), P(u + w, 0, y + t), P(u + w, depth, y + t), P(u, depth, y + t), 0, 1, 0, col);
    this.plate(f, u, w, y, t, depth, col);
  }
  geometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
    g.setIndex(this.i); g.computeBoundingSphere();
    return g;
  }
}
const hung = (kit, f, u, top) => { // the bandera de Valls on a balcony: red, white, red, its stripes running down
  const r = c3('#d62828'), w = c3('#f7f7f2');
  kit.plate(f, u, .24, top - 1.2, 1.2, .74, r); kit.plate(f, u + .24, .24, top - 1.2, 1.2, .74, w); kit.plate(f, u + .48, .24, top - 1.2, 1.2, .74, r);
};
function window3(kit, f, u, y, floorH, rng, balcony, wide, shutter) {
  const stone = c3(STONE), w = wide ? 1.15 : .95, h = floorH * .66, x = u - w / 2, sill = y + floorH * .14;
  kit.plate(f, x - .12, w + .24, sill - .08, h + .2, .025, stone); // the frame
  kit.plate(f, x, w, sill, h, .05, shutter); // shutters, half open: a dark slit between the leaves
  kit.plate(f, u - .07, .14, sill, h, .07, c3(DARK));
  if (!balcony) { kit.slab(f, x - .1, w + .2, sill - .1, .08, .1, stone); return; }
  const d = .72, bw = w + .7, b0 = u - bw / 2, by = y + floorH * .02, iron = c3(IRON), rail = .95;
  kit.slab(f, b0, bw, by, .12, d, stone);
  kit.plate(f, b0, bw, by + rail, .05, d - .02, iron); kit.plate(f, b0, bw, by + .16, .04, d - .02, iron);
  for (let k = 0; k <= 6; k++) kit.plate(f, b0 + k * (bw - .04) / 6, .04, by + .16, rail - .12, d - .02, iron);
  if (rng() < .1) hung(kit, f, b0 + bw * .3, by + rail + .05);
}
function porxo(kit, f, L, wallLow) { // the Blat's arcades: stone piers, a stepped voxel arch, shade behind
  const stone = c3(STONE), dark = c3('#5c4c3d'), bays = Math.max(1, Math.round(L / 3.9)), b = L / bays, pier = .55, H = 3.9, R = (b - pier) / 2;
  kit.plate(f, 0, L, 0, H, .012, dark, dark.clone().multiplyScalar(.7));
  for (let i = 0; i <= bays; i++) kit.plate(f, i * b - pier / 2, pier, 0, H, .3, stone.clone().multiplyScalar(.82), stone);
  for (let i = 0; i < bays; i++) {
    const cx = (i + .5) * b;
    for (let k = 0; k < 7; k++) { // the arch's stepped soffit: filled in from the spring upwards
      const t0 = k / 7, t1 = (k + 1) / 7, half = R * Math.sqrt(1 - t1 * t1), y = H - R + R * t0;
      kit.plate(f, cx - R, R - half, y, R * (t1 - t0) + .01, .28, stone); kit.plate(f, cx + half, R - half, y, R * (t1 - t0) + .01, .28, stone);
    }
  }
  kit.plate(f, 0, L, H, .22, .3, stone);
  void wallLow;
}
function facade(kit, f, L, h, id, rng, blatDist) {
  const col = c3(STUCCO[hash(id) % STUCCO.length]).multiplyScalar(.97 + rng() * .05), low = col.clone().multiplyScalar(.74);
  kit.plate(f, 0, L, 0, h, 0, low, col);
  kit.plate(f, 0, L, h - .22, .22, .05, c3(STONE)); // the cornice
  const floors = Math.max(1, Math.round((h - .5) / 3.15)), fh = (h - .5) / floors;
  if (L < 2.1) return;
  const shutter = c3(SHUTTER[hash(id + 's') % SHUTTER.length]), plinth = col.clone().multiplyScalar(.62);
  const arcade = blatDist < 26 && L > 3.4 && floors > 1;
  if (arcade) porxo(kit, f, L, low);
  else kit.plate(f, 0, L, 0, .55, .02, plinth);
  const n = Math.max(1, Math.floor(L / 2.8)), s = L / n;
  for (let i = 0; i < n; i++) {
    const u = (i + .5) * s, r = rng();
    if (!arcade) { // ground floor: a door, a shop or a barred window
      const shop = r < .3, w = shop ? Math.min(s - .5, 2.4) : .95, dh = shop ? 2.6 : 2.25;
      kit.plate(f, u - w / 2 - .1, w + .2, 0, dh + .12, .025, c3(STONE));
      kit.plate(f, u - w / 2, w, 0, dh, .05, shop ? c3('#3f4a4c') : shutter, shop ? c3('#566265') : shutter);
    }
    for (let k = 1; k < floors; k++) window3(kit, f, u, k * fh, fh, rng, k <= 2 ? rng() < .62 : rng() < .3, k === 1, shutter);
  }
}
// The campanar de Sant Joan: an octagon rising over the old town, the one landmark seen from every street. Rough for now:
// its position is the church's map point and its height about 74 m, both to check against own photos.
function campanar(kit, cx, cz) {
  const stone = c3('#cdb891'), lit = c3('#ddc9a3'), dark = c3('#3b3029'), S = 8;
  const ring = (r, y) => Array.from({ length: S }, (_, i) => { const a = (i + .5) / S * Math.PI * 2; return [cx + Math.cos(a) * r, y, cz + Math.sin(a) * r]; });
  const band = (r0, y0, r1, y1, low, high) => {
    const A = ring(r0, y0), B = ring(r1, y1);
    for (let i = 0; i < S; i++) {
      const j = (i + 1) % S, a = (i + 1) / S * Math.PI * 2;
      kit.quad(A[j], A[i], B[i], B[j], Math.cos(a), .1, Math.sin(a), low, high);
    }
  };
  band(5.6, 0, 5.2, 44, stone.clone().multiplyScalar(.78), stone);
  band(5.9, 44, 5.9, 45.2, lit, lit);
  band(5, 45.2, 4.8, 58, stone, lit);
  for (let i = 0; i < S; i++) { // the bell openings
    const a = (i + .5) / S * Math.PI * 2, f = { x: cx + Math.cos(a) * 4.92 - Math.sin(a) * -.7, z: cz + Math.sin(a) * 4.92 + Math.cos(a) * -.7, dx: -Math.sin(a), dz: Math.cos(a), nx: Math.cos(a), nz: Math.sin(a) };
    kit.plate(f, 0, 1.4, 48, 7, .05, dark);
  }
  band(5.3, 58, 5.3, 59, lit, lit);
  band(4.4, 59, 2.4, 68, stone, lit);
  band(2.4, 68, .15, 74, stone, lit);
}
export function buildCity(slice, material) {
  let seed = 1234567; const rng = () => (seed = (seed * 48271) % 2147483647) / 2147483647;
  const kit = new Kit(), cell = slice.cell, w = slice.w, h = slice.h, grid = new Uint8Array(w * h);
  slice.walk.forEach((runs, j) => { for (let k = 0; k < runs.length; k += 2) grid.fill(1, j * w + runs[k], j * w + runs[k] + runs[k + 1]); });
  const blat = slice.path[8];
  { // one sheet under everything: the mosaic's blocks leave gaps where a wall runs diagonally across them
    const x0 = slice.x0, z0 = slice.z0, x1 = x0 + w * cell, z1 = z0 + h * cell, y = -.04, tone = c3(PAVE[1]);
    kit.quad([x0, y, z1], [x1, y, z1], [x1, y, z0], [x0, y, z0], 0, 1, 0, tone);
  }
  // The paving: a 2 m mosaic only under the streets, cobble-grey with a slight pull between tiles.
  const T = 4, tones = PAVE.map(c3);
  for (let j = 0; j < h; j += T) for (let i = 0; i < w; i += T) {
    let any = false;
    for (let b = j; b < Math.min(h, j + T + 1) && !any; b++) for (let a = i; a < Math.min(w, i + T + 1); a++) if (grid[b * w + a]) { any = true; break; }
    if (!any) continue;
    const x = slice.x0 + i * cell, z = slice.z0 + j * cell, s = T * cell, tone = tones[(i * 7 + j * 13 + (i * j) % 5) % tones.length];
    kit.quad([x, 0, z + s], [x + s, 0, z + s], [x + s, 0, z], [x, 0, z], 0, 1, 0, tone);
  }
  for (const [ax, az, bx, bz, h0, h1, kind, nx, nz, id] of slice.walls) {
    const L = Math.hypot(bx - ax, bz - az), f = { x: ax, z: az, dx: (bx - ax) / L, dz: (bz - az) / L, nx, nz };
    if (f.dx * nz - f.dz * nx < 0) { f.x = bx; f.z = bz; f.dx = -f.dx; f.dz = -f.dz; } // along = to the right, seen from the street: keeps the quads' fronts out
    if (kind === 0) kit.plate(f, 0, L, h0, h1 - h0, 0, c3('#b8a285')); // a party wall above the neighbour
    else facade(kit, f, L, h1, id, rng, Math.hypot((ax + bx) / 2 - blat[0], (az + bz) / 2 - blat[1]));
  }
  campanar(kit, slice.campanar[0], slice.campanar[1]);
  const roof = [c3('#a8583c'), c3('#b56a48'), c3('#94503a'), c3('#b89a80')];
  for (const { h: y, ring } of slice.roofs) {
    const pts = ring.map(([x, z]) => new THREE.Vector2(x, z));
    const tone = roof[hash(ring[0].join()) % roof.length], base = kit.v;
    for (const p of pts) { kit.p.push(p.x, y, p.y); kit.n.push(0, 1, 0); kit.c.push(tone.r, tone.g, tone.b); kit.v++; }
    const flip = THREE.ShapeUtils.area(pts) > 0;
    for (const [a, b, c] of THREE.ShapeUtils.triangulateShape(pts, [])) flip ? kit.i.push(base + c, base + b, base + a) : kit.i.push(base + a, base + b, base + c);
  }
  const mesh = new THREE.Mesh(kit.geometry(), material);
  mesh.matrixAutoUpdate = false; mesh.frustumCulled = false;
  const walkable = (x, z) => { const i = (x - slice.x0) / cell | 0, j = (z - slice.z0) / cell | 0; return x >= slice.x0 && z >= slice.z0 && i < w && j < h && grid[j * w + i] === 1; };
  return { mesh, walkable, tris: kit.i.length / 3 };
}
