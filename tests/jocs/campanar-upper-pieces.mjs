// Campanar's pieces of the stretch from 100 to 400 m (ornament-plan.js, upper-pieces.js): the bell-ringer's house (H1),
// the gallery (H2), the sundial (H3) and the lantern (H4) are earned by what the player built, never by the device's
// clock; each goes where the facade has room for it, once a run, inside the flat floors over it and clear of the slab in
// play; and they are drawn into the meshes already pooled, so the tower gets no draw call more.
import assert from 'node:assert/strict';

const any = () => new Proxy(function () {}, { get: (t, k) => (k === Symbol.toPrimitive ? () => 0 : k === 'then' ? undefined : any()), apply: () => any(), set: () => true });
globalThis.document = any(); // stone.js paints its courses on canvases: none needed here
const { SIZE, FLOOR, metresOf } = await import('../../src/jocs/games/campanar/rules.js');
const { facade } = await import('../../src/jocs/games/campanar/facade.js');
const { upperPieceSlice } = await import('../../src/jocs/games/campanar/upper-pieces.js');
const { ornamentSlice } = await import('../../src/jocs/games/campanar/ornaments.js');
const { createOpenings } = await import('../../src/jocs/games/campanar/openings.js');

const tower = widths => widths.map(w => ({ x: 0, z: 0, w, d: w }));
const plan = (n, share) => Array(n).fill(SIZE * share);
// each piece's floors in a tower built of these side lengths
const finds = widths => {
  const f = facade(tower(widths)), at = {};
  f.courses.forEach((c, i) => c.found?.forEach(id => (at[id] ??= []).push(i)));
  return { ...f, at };
};
const H = ['H1', 'H2', 'H3', 'H4'];
// the first floor at m metres or more (the heights Marc asked for, not the plan's own numbers)
const floorAt = m => { let i = 0; while (metresOf(i) < m) i++; return i; };
const upper = at => Object.fromEntries(H.map(id => [id, at[id] ?? null]));
// a side cut a little every `every` floors (a run of every - 1 perfects), held whole from `hold` for `len` floors
const cutting = (n, every, hold = -1, len = 0, from = 1) => {
  let w = SIZE * from;
  return Array.from({ length: n }, (_, j) => (j > 0 && j % every === 0 && !(j > hold && j <= hold + len) ? (w -= SIZE * 0.002) : w));
};

// a wide tower of perfects: all four, once each, past their heights
const wide = finds(plan(200, 1));
for (const id of H) assert.equal(wide.at[id]?.length, 1, `${id}: once a run`);
const [h1] = wide.at.H1, [h2] = wide.at.H2, [h3] = wide.at.H3, [h4] = wide.at.H4;
assert(metresOf(h1) >= 100, `the house from 100 m (floor ${h1})`);
assert(h2 >= floorAt(120) + 14, `the gallery once 15 floors from 120 m are wide (floor ${h2})`);
assert(h3 >= floorAt(150) + 7, `the sundial after 8 perfects above 150 m (floor ${h3})`);
assert(metresOf(h4) >= 250, `the lantern from 250 m (floor ${h4})`);
// the house and the sundial take a bay's window: plain courses under them, none a string course, an oculus or another
// piece (one piece a bay), and clear of the bell chamber
const plainOver = (i, n, id) => {
  const c = wide.courses;
  assert.match(c[i].key, /fust/, `${id}: on a plain course`);
  assert.deepEqual(c[i].orn.filter(o => o !== 'lesenes'), [id], `${id}: worn on its floor`);
  for (let j = i + 1; j < i + n; j++) assert(/fust/.test(c[j].key) && !(c[j].orn ?? []).some(o => o !== 'lesenes'), `${id}: floor ${j} under it plain`);
  assert(i + n - 1 < wide.cap - 4, `${id}: clear of the bell chamber`);
};
plainOver(h1, 3, 'H1');
assert.match(wide.courses[h1 + 3].key, /fust/, 'nothing opens behind the house\'s smoke, the floor over it');
plainOver(h3, 2, 'H3');
// the gallery and the lantern go round a string course: the first one past their heights
const faixes = wide.courses.map((c, i) => (c.key === 'A/faixa' ? i : -1)).filter(i => i >= 0);
assert.equal(h2, faixes.find(i => i >= floorAt(120) + 14), 'the gallery on the first string course it can have');
assert.equal(h4, faixes.find(i => i >= floorAt(250)), 'the lantern on the first string course from 250 m');
assert.deepEqual(wide.courses[h4].orn.filter(o => /^(B5|F1|H4)$/.test(o)), ['H4'], 'the lanterns alone at its corners');

// skill, not luck: each wants what its hint says
assert.equal(finds([...plan(10, 1), ...plan(190, 0.3)]).at.H1, undefined, 'no house on a thin tower: no wall to hang from');
assert(metresOf(finds([...plan(10, 1), ...plan(190, 0.45)]).at.H1?.[0]) >= 100, 'a house on a C tower past 100 m');
assert.equal(finds([...plan(10, 1), ...plan(190, 0.6)]).at.H2, undefined, 'no gallery on a tower narrower than A');
assert(finds([...plan(10, 1), ...plan(190, 0.7)]).at.H2, 'a gallery on a tower still A');
assert(finds(cutting(200, 9, -1, 0, 0.72)).at.H2, 'a real wide run, cut now and then and kept A, earns the gallery');
assert.equal(finds(cutting(200, 6)).at.H3, undefined, 'no sundial without 8 perfects in a row');
assert.equal(finds(cutting(200, 6, 30, 8)).at.H3, undefined, 'no sundial for 8 perfects below 150 m');
assert(finds(cutting(200, 6, 100, 8)).at.H3?.[0] >= 104, 'the sundial once 8 perfects in a row above 150 m have been laid (floors 97 to 104)');
assert.equal(finds(plan(140, 1)).at.H4, undefined, 'no lantern under 250 m');
// the device's clock decides none of them: the same towers by day and by night find the same ones at the same floors
const RealDate = Date, at = h => class extends RealDate { constructor(...a) { super(...(a.length ? a : [2026, 10, 27, h, 30])); } };
const towers = [plan(200, 1), [...plan(10, 1), ...plan(190, 0.45)], cutting(200, 6, 100, 8)];
globalThis.Date = at(13);
const day = towers.map(w => upper(finds(w).at));
globalThis.Date = at(23);
const night = towers.map(w => upper(finds(w).at));
globalThis.Date = RealDate;
assert.deepEqual(night, day, 'the same finds by day and by night');

// in 3D: each inside the floors it was given, clear of the slab in play (AHEAD floors over the settling one), at its place
const verts = g => { const p = g.attributes.position, out = []; for (let i = 0; i < p.count; i++) out.push([p.getX(i), p.getY(i), p.getZ(i)]); return out; };
const tris = g => g.attributes.position.count / 3;
const y0 = 60 * FLOOR, C = { x: 0, z: 0, w: SIZE * 0.45, d: SIZE * 0.45 }, A = { x: 0, z: 0, w: SIZE * 0.7, d: SIZE * 0.7 };
const within = (vs, floors, what) => vs.forEach(([, y]) => assert(y >= y0 - 1e-6 && y < y0 + floors * FLOOR, `${what}: within its ${floors} floors (y ${(y - y0).toFixed(2)})`));
const house = upperPieceSlice(C, y0, ['lesenes', 'H1']), hv = [...verts(house.lit), ...verts(house.dark)];
within(hv, 4, 'the house, its smoke and all');
assert(hv.some(([x, , z]) => z > C.d / 2 + 0.3), 'the house stands out of the camera\'s wall');
// by the left quoin, so it reads from afar: an eighth of the full side past the tower's profile on the screen's left
assert(hv.some(([x, , z]) => x - z < -(C.w + C.d) / 2 - SIZE / 8), 'and past the tower\'s profile on the screen\'s left');
assert(tris(house.lit) + tris(house.dark) < 500, `the house: ${tris(house.lit) + tris(house.dark)} triangles`);
const gallery = upperPieceSlice(A, y0, ['lombard', 'H2']).lit;
within(verts(gallery), 2, 'the gallery');
for (const [x, , z] of verts(gallery)) {
  const ox = Math.abs(x) - A.w / 2, oz = Math.abs(z) - A.d / 2, out = Math.max(ox, oz);
  const along = ox > oz ? A.d / 2 - Math.abs(z) : A.w / 2 - Math.abs(x); // from the nearest corner, along its wall
  assert(out < 0.17 && (out < 1e-6 || along > 0.2), 'the gallery on its ledge, short of the corners\' gargoyles');
}
assert(tris(gallery) < 2200, `the gallery: ${tris(gallery)} triangles`);
const sundial = upperPieceSlice(A, y0, ['H3']);
within(verts(sundial.lit), 2, 'the sundial');
assert(verts(sundial.lit).every(([x, , z]) => z > A.d / 2 - 1e-6 && Math.abs(x) < A.w / 2 - 0.1), 'the sundial on the camera\'s wall, between its quoins');
assert(tris(sundial.lit) < 400, `the sundial: ${tris(sundial.lit)} triangles`);
const lantern = upperPieceSlice(A, y0, ['H4']), lv = [...verts(lantern.lit), ...verts(lantern.dark)];
within(lv, 2, 'the lantern');
assert(lv.every(([x, , z]) => Math.abs(x) > A.w / 2 - 0.1 && Math.abs(z) > A.d / 2 - 0.1), 'the lanterns at the corners');
for (const [sx, sz] of [[1, 1], [1, -1], [-1, -1], [-1, 1]]) assert(lv.some(([x, , z]) => x * sx > 0 && z * sz > 0), `a lantern at corner ${sx}, ${sz}`);
assert(tris(lantern.lit) + tris(lantern.dark) < 800, `the four lanterns: ${tris(lantern.lit) + tris(lantern.dark)} triangles`);
assert.equal(tris(ornamentSlice(A, y0, ['B5', 'H4'])), tris(ornamentSlice(A, y0, [])), 'the lanterns take the drain gargoyles\' corners');
assert.equal(upperPieceSlice(A, y0, ['lesenes', 'lombard', 'B5']), null, 'nothing for the other floors');

// no draw call more: the openings' three pooled meshes take them all (the sundial's shadow with the clock's hands), and
// no mesh nor material is made for them
const added = [], scene = { add: o => added.push(o) }, openings = createOpenings(scene), mats = added.map(m => m.material);
const slab = i => ({ position: { x: 0, y: i * FLOOR + FLOOR / 2, z: 0 }, scale: { x: A.w, z: A.d } });
const count = () => added.map(m => m.geometry.drawRange.count);
globalThis.Date = at(13);
const before = count();
openings.dress(slab(60), 'A/fust-parell', undefined, ['lesenes', 'H1']);
openings.dress(slab(67), 'A/faixa', undefined, ['lesenes', 'lombard', 'B5', 'H2', 'H4']);
openings.dress(slab(74), 'A/fust-parell', undefined, ['lesenes', 'H3']);
openings.tick();
globalThis.Date = RealDate;
assert.equal(added.length, 3, 'still the three pooled meshes');
assert.deepEqual(added.map(m => m.material), mats, 'with their own materials');
const after = count();
assert(after.every((n, k) => n > before[k]), `all drawn in them: lit, unlit and the hands' (${before} → ${after})`);
console.log('campanar upper pieces: house, gallery, sundial and lantern earned by skill alone, placed with room, no draw call more ok');
