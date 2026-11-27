// Campanar's openings stay on their own wall, over towers of every width as the facade lays them out: the unlit glass,
// niches, stairs and lamps never outside their floor's plan (A10's lamp glow poked out of a thin tower's side), and
// every frame proud of a wall (a sill, a moulded band, the rose's dentils, an oculus's voussoirs) a hair clear of its
// quoins and of the Lombard lesenes along them (A10's lights on a narrow face, the rose a little under 0.69 of the side,
// a C window at 0.40 of it).
import assert from 'node:assert/strict';

const any = () => new Proxy(function () {}, { get: (t, k) => (k === Symbol.toPrimitive ? () => 0 : k === 'then' ? undefined : any()), apply: () => any(), set: () => true });
globalThis.document = any(); // stone.js paints its courses on canvases: none needed here
const { SIZE, FLOOR, drop } = await import('../../src/jocs/games/campanar/rules.js');
const { facade } = await import('../../src/jocs/games/campanar/facade.js');
const { createOpenings } = await import('../../src/jocs/games/campanar/openings.js');
const { ornamentSlice } = await import('../../src/jocs/games/campanar/ornaments.js');
const { chamberOf } = await import('../../src/jocs/games/campanar/arches.js');
const { quoinOf } = await import('../../src/jocs/games/campanar/stone.js');

const HAIR = 0.005; // the least wall left between a frame and a quoin or a lesene
const added = [], openings = createOpenings({ add: o => added.push(o) }), [litMesh, darkMesh] = added;
const verts = (mesh, n0, n1 = mesh.geometry.drawRange.count) => {
  const a = mesh.geometry.attributes.position.array, out = [];
  for (let k = n0; k < n1; k++) out.push([a[3 * k], a[3 * k + 1], a[3 * k + 2]]);
  return out;
};
// how far along wall face (its length `face`) a frame may reach from the wall's middle: to the lesene's inner edge as
// drawn (ornaments.js), else to the quoin's as the shader paints it (stone.js)
function reach(r, y0, lesenes, alongX) {
  const face = alongX ? r.w : r.d;
  if (!lesenes) return face / 2 - quoinOf(face);
  let inner = Infinity;
  const g = ornamentSlice(r, y0, ['lesenes']);
  for (const [x, , z] of verts({ geometry: g }, 0, g.attributes.position.count)) {
    const proudZ = Math.abs(z - r.z) > r.d / 2 + 1e-4, proudX = Math.abs(x - r.x) > r.w / 2 + 1e-4;
    if (alongX ? proudZ && !proudX : proudX && !proudZ) inner = Math.min(inner, alongX ? Math.abs(x - r.x) : Math.abs(z - r.z));
  }
  return inner;
}

const worst = { dark: null, frame: null };
let floors = 0;
const keep = (k, what, amount) => { if (amount > (worst[k]?.amount ?? 0)) worst[k] = { what, amount }; };
function check(rects, name) {
  const { courses } = facade(rects);
  openings.reset();
  courses.forEach((c, i) => {
    if (!chamberOf(c.key, i)) return;
    const r = rects[i], y0 = i * FLOOR, l0 = litMesh.geometry.drawRange.count, d0 = darkMesh.geometry.drawRange.count;
    const m = { position: { x: r.x, y: y0 + FLOOR / 2, z: r.z }, scale: { x: r.w, z: r.d } };
    openings.dress(m, c.key, c.batter, c.orn);
    floors++;
    const what = `${name} floor ${i} ${c.key} at ${(Math.min(r.w, r.d) / SIZE).toFixed(3)} of the side`;
    for (const [x, , z] of verts(darkMesh, d0)) keep('dark', what, Math.max(Math.abs(x - r.x) - r.w / 2, Math.abs(z - r.z) - r.d / 2));
    // the opening's own lit stone comes first; the lesenes and the arches over it (orn) after it
    const own = litMesh.geometry.drawRange.count - (c.orn?.length ? ornamentSlice(r, y0, c.orn).attributes.position.count : 0);
    const les = !!c.orn?.includes('lesenes'), lim = { x: reach(r, y0, les, true), z: reach(r, y0, les, false) };
    for (const [x, , z] of verts(litMesh, l0, own)) {
      const ox = Math.abs(x - r.x) - r.w / 2, oz = Math.abs(z - r.z) - r.d / 2;
      if (ox > 1e-3 && oz > 1e-3) keep('frame', `${what}: round a corner`, Math.min(ox, oz) + HAIR);
      else if (oz > 1e-3) keep('frame', what, Math.abs(x - r.x) - lim.x + HAIR);
      else if (ox > 1e-3) keep('frame', what, Math.abs(z - r.z) - lim.z + HAIR);
    }
  });
}

// held at one share of the side from the start, every share a window set can stand at, long enough for the moon (G6)
const held = (share, n) => Array.from({ length: n }, (_, j) => ({ x: 0, z: 0, w: SIZE * (j < 2 ? 1 : share), d: SIZE * (j < 2 ? 1 : share) }));
for (let s = 0.22; s <= 1.0001; s += 0.005) check(held(s, 230), `held at ${s.toFixed(3)}`);
// realistic runs: each drop off by a human error, now and then a bad one, until a miss (campanar-facade-rhythm.mjs)
const rng = s => () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
for (let seed = 1; seed <= 120; seed++) {
  const r = rng(seed), gauss = () => Math.sqrt(-2 * Math.log(r() + 1e-9)) * Math.cos(2 * Math.PI * r());
  let last = { x: 0, z: 0, w: SIZE, d: SIZE };
  const played = [last];
  for (let k = 1; k < 260; k++) {
    let f = r() < 0.5 ? 0 : gauss() * [0.01, 0.02, 0.04][seed % 3];
    if (r() < 0.02) f += (r() < 0.5 ? -1 : 1) * (0.05 + r() * 0.1);
    const axis = k % 2 ? 'x' : 'z', d = drop(last, last[axis] + f * SIZE, axis);
    if (d.miss) break;
    played.push(last = d.placed);
  }
  check(played, `run ${seed}`);
}
assert(floors > 5000, `enough opening floors dressed (${floors})`);
assert(!(worst.dark?.amount > 0.003), `the unlit parts inside the floor's plan: ${worst.dark?.what} pokes out ${worst.dark?.amount.toFixed(3)}`);
assert(!(worst.frame?.amount > 0), `the frames a hair clear of the quoins and lesenes: ${worst.frame?.what} over by ${worst.frame?.amount.toFixed(3)}`);
console.log(`campanar openings fit: ${floors} opening floors, unlit parts inside the plan, frames clear of quoins and lesenes ok`);
