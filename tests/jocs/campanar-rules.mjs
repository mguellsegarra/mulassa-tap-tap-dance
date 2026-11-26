// Campanar (POC): a drop keeps what stands on the floor below, squared on the axis, a near drop snaps whole; the metres follow the real
// campanar's scale; and the painter that turns the tower the player built into the campanar, floor by floor as each
// turns to stone: bells on the last floor wide enough for them, the floors too thin for them left for the spire, the
// motifs whole, bodies never wider than built, and a settled floor never changed again, over realistic runs.
import assert from 'node:assert/strict';
import { SIZE, PERFECT, drop, metresOf, REAL } from '../../src/jocs/games/campanar/rules.js';
import { facade, createFacade } from '../../src/jocs/games/campanar/facade.js';
import { TOL } from '../../src/jocs/games/campanar/bodies.js';

const top = { x: 0, z: 0, w: SIZE, d: SIZE };
// the cut: the overhang falls on its side, what landed and the offcut add up to the floor below; what is left is squared
// on the tower's axis with the same area (B Escairat), inside the floor below
const cut = drop(top, 0.6, 'x');
assert.equal(cut.perfect, false);
assert.equal(cut.landed.w + cut.cut.w, SIZE, 'nothing lost or made by a cut');
assert.equal(cut.landed.d, SIZE, 'the other side untouched where it landed');
assert(cut.cut.x > cut.landed.x, 'the offcut on the side it overhung');
assert.equal(cut.landed.x + cut.landed.w / 2, top.x + top.w / 2, 'what landed ends at the floor below');
assert.equal(cut.placed.w, cut.placed.d, 'squared');
assert(Math.abs(cut.placed.w * cut.placed.d - cut.landed.w * cut.landed.d) < 1e-9, 'with the same area');
assert.deepEqual([cut.placed.x, cut.placed.z], [top.x, top.z], 'on the axis');
assert(cut.placed.w <= top.w, 'inside the floor below');
assert.deepEqual(drop(top, PERFECT * 0.9, 'z'), { placed: top, landed: null, cut: null, perfect: true }, 'a near drop snaps whole');
assert.deepEqual(drop(top, SIZE, 'x'), { miss: true }, 'nothing over the floor below: the run ends');
// the metres: 42 floors are the real campanar's 74 m
assert.equal(metresOf(42), REAL);
assert.equal(metresOf(0), 0);

const tower = (n, width) => Array.from({ length: n }, (_, i) => { const w = width(i); return { x: 0, z: 0, w, d: w }; });
const keys = f => f.courses.map(c => c.key);
// a clean tower: the portal at the foot, the clock earned on the way with its cornice of blind arches over it, the bell
// chamber under the parapet on top, and today's crown
const clean = facade(tower(24, () => SIZE));
assert.equal(clean.top, 'crown');
assert.deepEqual(keys(clean).slice(-5).reverse(), ['A/remat', 'A/campanes-01', 'A/campanes-02', 'A/campanes-03', 'A/campanes-04']);
assert.deepEqual(keys(clean).slice(0, 3), ['A/portal-03', 'A/portal-02', 'A/portal-01'], 'the portal at the foot');
const clock = keys(clean).indexOf('A/rellotge3-03');
assert(clock >= 12 && keys(clean)[clock + 3] === 'A/arquets', 'the clock once, the blind arches over it');
// a needle: the bells stay on the stone, the floors too thin for them are left for the spire, the top a vane
const needle = tower(41, i => (i < 10 ? SIZE : Math.max(0.3, SIZE - 0.29 * (i - 9))));
const n = facade(needle);
assert.equal(n.top, 'vane');
assert(needle[n.cap].w / SIZE >= 0.22, 'the bell chamber on a slab wide enough for bells');
assert(keys(n).slice(n.cap + 1).every(k => k === 'agulla'), 'nothing but the spire over the parapet');
assert(keys(n).slice(0, n.cap + 1).every(k => k !== 'agulla'), 'the parapet and under it all stone');
// a motif over several slabs is centred on the part they share
const off = tower(21, () => SIZE).map((r, i) => (i > 12 ? { ...r, x: 0.4, w: SIZE - 0.8 } : r));
const bells = facade(off).courses.filter(c => c.key.includes('campanes'));
assert(bells.length >= 2 && bells.every(c => c.cx === 0.4), 'the bell opening centred on what its slabs share');
// a short tower still gets bells (the smallest that fit) and its crown
const short = facade(tower(5, () => SIZE));
assert(keys(short).some(k => k.includes('campanes')) && short.top === 'crown');
assert.deepEqual(facade([]).courses, [], 'no floor, nothing to paint');
// the bodies: a small taper is gathered into one straight body on its narrowest plan, a big step starts a new one;
// only the ground floor keeps its own plan
const small = TOL * SIZE * 0.4, steps = [SIZE, SIZE - small, SIZE - 2 * small, SIZE - 3 * small, SIZE - 4 * small, SIZE - 1.2, SIZE - 1.2];
const built = steps.map(w => ({ x: 0, z: 0, w, d: w }));
const shaped = facade(built);
assert.deepEqual(shaped.bodies.map(b => [b.lo, b.hi]), [[0, 4], [5, 6]], 'a new body only past the taper it gathers');
assert.deepEqual(shaped.rects[0], built[0], 'the ground floor keeps its plan: the plinth');
assert.deepEqual(shaped.rects[1], built[4], 'the rest of the body takes its narrowest plan');
// realistic runs (each tap off by a human error that grows with speed, now and then a bad one, until a miss), played
// floor by floor as the scene does: a floor settled as it turns to stone never changes at the end, the floors still in
// colour are given its plan so none overhangs the stone under it, a glacis meets the floor over it, the stone is never
// wider than built, and the scene's play gives the same campanar as facade()
const rng = s => () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
const inside = (a, b) => a.x - a.w / 2 >= b.x - b.w / 2 - 1e-9 && a.x + a.w / 2 <= b.x + b.w / 2 + 1e-9
  && a.z - a.d / 2 >= b.z - b.d / 2 - 1e-9 && a.z + a.d / 2 <= b.z + b.d / 2 + 1e-9;
for (let seed = 1; seed <= 200; seed++) {
  const r = rng(seed), gauss = () => Math.sqrt(-2 * Math.log(r() + 1e-9)) * Math.cos(2 * Math.PI * r());
  let last = { x: 0, z: 0, w: SIZE, d: SIZE };
  const played = [last];
  for (let k = 1; k < 80; k++) {
    let f = gauss() * ([0.035, 0.05, 0.07, 0.025][seed % 4] + k * 0.0012);
    if (r() < 0.06) f += (r() < 0.5 ? -1 : 1) * (0.12 + r() * 0.15);
    const axis = k % 2 ? 'x' : 'z', d = drop(last, last[axis] + f * SIZE, axis);
    if (d.miss) break;
    played.push(last = d.placed);
  }
  assert(played.every(p => p.w === p.d && p.x === 0 && p.z === 0), `run ${seed}: every floor square on the axis`);
  const live = createFacade(), settled = [], shown = played.map(p => ({ ...p }));
  for (let k = 1; k <= played.length; k++) {
    while (live.ready(played.slice(0, k))) {
      const i = live.settled, c = { ...live.settle(played.slice(0, k)) };
      settled.push(c);
      if (c.key === 'agulla') continue;
      shown[i] = c.rect;
      for (const [j, p] of c.ahead) shown[j] = p;
      for (let j = i + 1; j < k && settled[j]?.key !== 'agulla'; j++) {
        if (j < played.length && (j >= settled.length || settled[j].key !== 'agulla') && Math.min(played[j].w, played[j].d) / SIZE >= 0.22)
          assert(inside(shown[j], j === i + 1 && c.batter ? c.batter : shown[j - 1]), `run ${seed}, floor ${j}: in colour over narrower stone`);
      }
    }
  }
  const end = live.finish(played), whole = facade(played);
  assert.deepEqual(end.rects, whole.rects, `run ${seed}: the scene's play and facade(), the same campanar`);
  assert.deepEqual(keys(end), keys(whole));
  settled.forEach((c, i) => {
    if (c.key === 'agulla') return;
    assert.equal(end.courses[i].key, c.key, `run ${seed}, floor ${i}: its course as it turned to stone`);
    assert.deepEqual(end.rects[i], c.rect, `run ${seed}, floor ${i}: its plan as it turned to stone`);
    assert(inside(c.rect, played[i]), `run ${seed}, floor ${i}: never wider than built`);
    if (c.batter && settled[i + 1] && settled[i + 1].key !== 'agulla') assert.deepEqual(c.batter, settled[i + 1].rect, `run ${seed}, floor ${i}: the glacis meets the floor over it`);
  });
}
console.log('campanar: the cut, the metres, the painter (bells on stone, the spire over them, motifs whole) and 200 realistic runs ok');
