// Campanar's shaft, terraces and spire: a long body is parted in bays by thin string courses, an opening in each (a
// window, a slit where the last window is near), none over the clock in its body; a wide terrace gets a balustrade on its
// outer edge, never on the body over it; and the stone spire stops at Valls' proportion however many floors it hides.
import assert from 'node:assert/strict';
import { SIZE, FLOOR } from '../../src/jocs/games/campanar/rules.js';
import { facade, BAY } from '../../src/jocs/games/campanar/facade.js';
import { terraceRail, TERRACE } from '../../src/jocs/games/campanar/coping.js';
import { spireHeight } from '../../src/jocs/games/campanar/crown.js';

const tower = widths => widths.map(w => ({ x: 0, z: 0, w, d: w }));
const kind = k => (k === 'A/faixa' ? '=' : /espitllera/.test(k) ? 'e' : /mainell/.test(k) ? 'W' : /fust/.test(k) ? '.' : /arquets/.test(k) ? 'a' : k);
const plan = (n, w) => Array(n).fill(SIZE * w);
// a long thin body (too thin for a clock) over the wide foot, then floors too thin for bells: its bays, a slit in each
// (the window ten floors apart is too wide for it), string courses BAY floors apart between plain floors
const thin = facade(tower([...plan(12, 1), ...plan(24, 0.35), ...plan(3, 0.15)])), body = thin.bodies.find(b => b.lo === 12);
const shaft = thin.courses.slice(body.lo, thin.cap - 2).map(c => kind(c.key)).join('');
assert.equal(shaft, '..ee..=..ee..=..ee...', 'the body\'s opening two floors over its foot, then bays');
assert.equal(shaft.lastIndexOf('=') - shaft.indexOf('='), BAY);
// a long wide body with the clock: the bay over its arches stays plain, then bays again; windows ten floors apart, a
// slit between them
const wide = facade(tower([...plan(9, 1), ...plan(36, 0.6), 0.1 * SIZE])).courses.map(c => kind(c.key)).join('');
assert.match(wide, /a\.{6}=\.\.WW\.\.=\.\.ee\.\.=\.\.WW/, `the shaft over the clock: ${wide}`);
// a wide tower ending 21 to 30 floors up still gets its whole bell chamber (a run that ends while a bay's opening is half
// laid gets a smaller one: nothing settled changes)
for (let n = 21; n <= 30; n++) assert.equal(facade(tower(plan(n, 1))).courses.at(-5).key, 'A/campanes-04', `${n} floors: the whole chamber`);

// the terrace: a narrow ledge, or a wide one on one side only (a rail squeezed against the wall over it), gets the
// weathering; a terrace round the body over it a balustrade on its outer edge, flat stone tones for the lit pool, clear of
// the body over it and inside the ledge (but for the plinth's lip), the corner pinnacles about a floor tall
const lower = { x: 0.1, z: -0.2, w: 2, d: 1.8 };
assert.equal(terraceRail(lower, { ...lower, w: lower.w - TERRACE * 0.9, x: lower.x - TERRACE * 0.45 }, 3), null, 'a narrow ledge: weathering');
assert.equal(terraceRail(lower, { x: 0.3, z: -0.2, w: 0.9, d: 1.8 - 0.04 }, 3), null, 'a terrace on one side only: weathering');
const upper = { x: 0.1, z: -0.2, w: 1.0, d: 0.9 }; // a terrace all round
const g = terraceRail(lower, upper, 3), p = g.attributes.position;
assert.equal(g.attributes.color.count, p.count);
assert.equal(g.attributes.normal.count, p.count);
let top = 0;
for (let i = 0; i < p.count; i++) {
  const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
  top = Math.max(top, y);
  assert(!(Math.abs(x - upper.x) < upper.w / 2 - 1e-9 && Math.abs(z - upper.z) < upper.d / 2 - 1e-9), `balustrade inside the body over it at ${x}, ${z}`);
  assert(Math.abs(x - lower.x) <= lower.w / 2 + SIZE * 0.013 && Math.abs(z - lower.z) <= lower.d / 2 + SIZE * 0.013 && y >= 3, 'on the terrace');
}
assert(top - 3 > FLOOR * 0.6 && top - 3 < FLOOR * 1.2, `small pinnacles (${(top - 3).toFixed(2)})`);
assert(p.count > 0, 'a rail round the terrace');

// the spire: as tall as the floors it covers (the campanar never lower than built), never shorter than reads
const base = { x: 0, z: 0, w: 0.8, d: 0.7 };
assert.equal(spireHeight(base, 0.9), 0.9);
assert.equal(spireHeight(base, 0.2), 0.7 * 1.2);
assert.equal(spireHeight(base, 12 * FLOOR), 12 * FLOOR, 'a tall spire for many thin floors, not capped');
console.log('campanar shaft: bays with string courses and openings, a balustrade on wide terraces, the spire as tall as built ok');
