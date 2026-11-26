// Campanar's windows (arches.js): each piece of a window motif finds its set and its first floor, and what is open at
// any height stays inside the arch: A's and C's two lights either side of a stone mullion, closed over their heads
// (the tympanum), XS's one slit; the bell chamber keeps its single opening.
import assert from 'node:assert/strict';
import { chamberOf, halfWidth, holes, inset } from '../../src/jocs/games/campanar/arches.js';
import { LEN } from '../../src/jocs/games/campanar/facade.js';
import { FLOOR } from '../../src/jocs/games/campanar/rules.js';

for (const set of ['A', 'C', 'XS']) {
  const file = set === 'XS' ? 'espitllera' : 'mainell';
  const lo = chamberOf(`${set}/${file}-02`, 15), hi = chamberOf(`${set}/${file}-01`, 16);
  assert(lo && hi && lo.s === hi.s && lo.lo === 15 && hi.lo === 15, `${set}: both floors of the window know its first floor`);
  const { s } = lo, n = s.lights ? 2 : 1;
  assert.equal(!!s.lights, set !== 'XS', `${set}: ${set === 'XS' ? 'a slit' : 'two lights'}`);
  for (let y = s.ySill; y <= s.yApex; y += 0.01) {
    const w = halfWidth(y, s), hs = holes(s, y);
    assert.equal(hs.length, n);
    for (const [a, b] of hs) assert(a >= -w - 1e-9 && b <= w + 1e-9 && a <= b + 1e-9, `${set} y ${y.toFixed(2)}: open only inside the arch`);
    if (n === 2 && y < s.lights[0].ySpring) assert(hs[1][0] - hs[0][1] > 0.05, `${set} y ${y.toFixed(2)}: a mullion between the lights`);
  }
  if (n === 2) for (const [a, b] of holes(s, (s.lights[0].yApex + s.yApex) / 2)) assert(b - a < 1e-9, `${set}: stone over the lights' heads`);
  // each light's round head a margin inside the arch, or the arch cuts it (it sprang over the arch's springing once)
  for (const l of s.lights ?? []) for (let y = s.ySill; y <= l.yApex; y += 0.005) {
    assert(Math.abs(l.c) + halfWidth(y, l) <= halfWidth(y, s) - 0.02, `${set} y ${y.toFixed(3)}: the light's head inside the arch`);
  }
  // the moulded band runs round the arch as deep at the crown as on the jambs, and that crown is still on the window's floors
  const band = s.band ?? Math.max(0.036, s.hw * 0.18);
  assert(inset(s, -band).yApex <= LEN.window[set] * FLOOR - 0.01, `${set}: the band's crown under the floor over the window`);
}
assert.equal(chamberOf('A/campanes-04', 20).lo, 20);
assert.equal(chamberOf('A/campanes-04', 20).s.lights, undefined);
assert.equal(chamberOf('A/portal-02', 1).lo, 0); // the portal is pierced too, from its first floor
assert.equal(chamberOf('A/fust-parell', 1), null);
console.log('campanar windows: two lights or a slit inside the arch, both floors on the same motif ok');
