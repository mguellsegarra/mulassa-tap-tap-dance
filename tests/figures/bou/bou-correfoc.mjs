// The Bou's festa rules (src/figures/bou/bou-correfoc.js) and its carretilles on the model (models/bou.js).
import assert from 'node:assert/strict';
import { BOU_FX, BOU_BILLS, bouTechno, bouHush, bouJetsWant, bouPairBurns, bouUpBurns, bouTileLight, bouTileRing, bouTileColour, bouHeroSpot, bouBillPlan, bouFlutterDrop, bouWind } from '../../../src/figures/bou/bou-correfoc.js';
import { buildBou } from '../../../src/figures/bou/bou.js';

// the techno part: source bars 27 up to 35, inside the song
assert(BOU_FX.technoStart > 0 && BOU_FX.technoEnd > BOU_FX.technoStart + 10, 'the techno part spans its bars');
assert(!bouTechno(BOU_FX.technoStart - 0.01) && bouTechno(BOU_FX.technoStart) && !bouTechno(BOU_FX.technoEnd), 'its window is [start, end)');
// and the final's (bars 84-91), after the festa, where the carretilles and confetti keep going; never the slow run-up
assert(bouTechno(BOU_FX.finalStart) && bouTechno(BOU_FX.finalEnd - 0.01) && !bouTechno(BOU_FX.finalEnd) && !bouTechno(BOU_FX.finalStart - 0.01), 'the final window is [84, 92)');
assert(!bouTechno(BOU_FX.festaStart - 1) && BOU_FX.finalStart > BOU_FX.festaStart, 'no disco in the run-up or the carry');
assert(bouHush(BOU_FX.technoStart) && !bouHush(BOU_FX.finalStart), 'only the first disco hushes the plaça');

// the carretilles: a burst wherever the confetti would have flown, none before one, none from a streak alone
const early = BOU_FX.technoEnd + 5;
assert(!bouJetsWant(early, Infinity), 'no confetti moment yet, no fire');
assert(bouJetsWant(early, early) && bouJetsWant(early + BOU_FX.burst - 0.1, early), 'a burst from the moment');
assert(!bouJetsWant(early + BOU_FX.burst, early), 'and it ends');
assert(!bouJetsWant(early, early + 1), 'a moment from a later run (a restart) lights nothing');
// carried round: on fire all the way; stopped and set down: no sparks, even after a confetti moment
assert(bouJetsWant(BOU_FX.festaStart, Infinity) && bouJetsWant(BOU_FX.carryEnd - 0.01, Infinity), 'it burns all the way round');
assert(!bouJetsWant(BOU_FX.carryEnd, BOU_FX.carryEnd) && !bouJetsWant(BOU_FX.quietEnd - 0.01, BOU_FX.quietEnd - 1), 'no sparks while it is set down');

// the end's banknotes: they rain through the bombo (dur s); the hero lands `hero` m from the Bou towards the camera, last
// and on top of the mound round it; the rest round the Bou, never all in one spot, all from above
const hero = bouHeroSpot(0, 0, 0, 12, {}), dur = 6.4;
assert(Math.abs(hero.x) < 1e-9 && Math.abs(hero.z - BOU_BILLS.hero) < 1e-9, 'the hero spot is towards the lens');
const n = 600, plans = Array.from({ length: n }, (_, i) => bouBillPlan(i, n, hero.x, hero.z, 0, 0, dur, {}));
const top = plans[n - 1], rest = plans.slice(0, -1);
assert(top.x === hero.x && top.z === hero.z, 'the hero lands on its spot');
assert(rest.every(p => p.y < top.y), 'the hero lies on top');
assert(rest.every(p => p.delay >= 0 && p.delay <= dur), 'they all fall within the bombo');
assert(rest.filter(p => p.delay > dur / 2).length > n * 0.4, 'the rain keeps up to the end');
const heap = plans.slice(0, Math.floor(n * BOU_BILLS.near));
assert(heap.every(p => p.delay < top.delay && Math.hypot(p.x - hero.x, p.z - hero.z) < BOU_BILLS.heap + 1e-9), 'the mound falls round the hero, before it');
assert(heap.length >= n * 0.25, `a mound under the camera (${heap.length})`);
const hi = heap.filter(p => p.y > 0.006 + BOU_BILLS.step * BOU_BILLS.layers / 2), lo = heap.filter(p => p.y <= 0.006 + BOU_BILLS.step * BOU_BILLS.layers / 2);
const meanR = a => a.reduce((s, p) => s + Math.hypot(p.x - hero.x, p.z - hero.z), 0) / a.length;
assert(meanR(hi) < meanR(lo), 'the mound is higher in its middle (no note floating over bare floor at its edge)');
assert(plans.every(p => Math.hypot(p.x - hero.x, p.z - hero.z) <= BOU_BILLS.spread + 1e-9 && p.high > 0.5 && p.drop > 0), 'all round the hero, from above');
assert(rest.filter(p => p.delay === 0).length > n * 0.1, 'the sky is full at once');
assert(new Set(plans.map(p => p.y)).size >= BOU_BILLS.layers, 'stacked on distinct heights');
const ys = [...new Set(plans.map(p => p.y))].sort((a, b) => a - b);
assert(ys.every((y, k) => !k || y - ys[k - 1] >= BOU_BILLS.step / 2 - 1e-9), 'any two heights at least half a step apart: two overlapping notes never share a plane');
assert(BOU_BILLS.ripple * 2 * BOU_BILLS.scale < BOU_BILLS.step / 2, 'a lying note\'s wind ripple stays under the step to the next');
// fluttering: fastest through the middle of its swing, nearly hanging at its ends, never rising
for (let p = 0; p < 7; p += 0.05) { const v = bouFlutterDrop(1, p); assert(v > 0 && v <= 1.8 + 1e-9, `descent ${v}`); }
assert(bouFlutterDrop(1, 0) > 4 * bouFlutterDrop(1, Math.PI / 2), 'it hangs at the ends of its swing');
for (let t = 0; t < 60; t += 0.25) { const w = bouWind(t); assert(w >= 0.1 && w <= 1, `the wind in 0..1 (${w})`); }

// at any moment exactly two pairs and one up tube burn: the five jets common/fire.js draws
for (let c = 0; c < 30; c += 0.05) {
  let pairs = 0, ups = 0;
  for (let p = 0; p < BOU_FX.pairs; p++) pairs += bouPairBurns(c, p);
  for (let u = 0; u < BOU_FX.ups; u++) ups += bouUpBurns(c, u);
  assert.equal(pairs, 2, `two pairs at ${c.toFixed(2)} s`); assert.equal(ups, 1, `one up tube at ${c.toFixed(2)} s`);
}
// they move on from the rump: the newest pair keeps burning as the next lights
assert(bouPairBurns(0, 0) && bouPairBurns(BOU_FX.pair, 0) && bouPairBurns(BOU_FX.pair, 1) && !bouPairBurns(2 * BOU_FX.pair, 0));

// the floor: on a beat every other tile flashes (far from the ring), the other half on the next; never brighter than 1
const far = 15;
for (const beat of [10, 11]) {
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
    const k = bouTileLight(i, j, beat, far), lit = (i + j) % 2 === beat % 2;
    assert(lit ? k > 0.05 : k < 0.01, `tile ${i},${j} at beat ${beat}: ${k}`);
  }
}
for (let f = 0; f < 1; f += 0.1) for (let d = 0; d < 20; d += 0.5) { const k = bouTileLight(0, 1, 3 + f, d); assert(k >= 0 && k <= 1, `light in 0..1 (${k})`); }
// the ring runs out of the Bou through each bar, well past its body (a ring inside 4.5 m never showed), and fades
const ringAt = beat => { let best = 0, at = 0; for (let d = 0; d < 20; d += 0.1) { const k = bouTileRing(beat, d); if (k > best) { best = k; at = d; } } return at; };
assert(ringAt(9) > 3 && ringAt(10.5) > 8 && ringAt(11.5) > 11, `the ring travels out to the crowd (${ringAt(9)}, ${ringAt(10.5)}, ${ringAt(11.5)} m)`);
assert(bouTileRing(8.1, ringAt(8.1)) > bouTileRing(11.5, ringAt(11.5)), 'it fades as it goes');
assert(ringAt(8) >= BOU_FX.ring0 - 0.1 && bouTileRing(8, 1) < 0.1, 'it starts clear of the Bou, not under it');
// multicolour: every colour is used, the colour of a tile moves on each beat, side by side lit tiles mostly differ
const used = new Set();
let same = 0, pairs = 0;
for (let i = 0; i < 17; i++) for (let j = 0; j < 17; j++) {
  const c = bouTileColour(i, j, 17, 4); used.add(c);
  assert.notEqual(c, bouTileColour(i, j, 17, 5), 'a tile changes colour on the next beat');
  if (i < 16 && j < 16) { pairs++; same += c === bouTileColour(i + 1, j + 1, 17, 4); } // (diagonal: lit together)
}
assert.equal(used.size, BOU_FX.disco.length, 'every disco colour shows');
assert(same / pairs < 0.3, `neighbouring lit tiles mostly differ (${same}/${pairs} the same)`);

// the model: 12 tubes along the back's edges and 3 up the middle, hidden until they burn, mouths pointing out or up
const bou = buildBou();
assert.equal(bou.fire.length, 15);
assert(bou.fire.every(t => !t.visible), 'the tubes are hidden at rest');
for (const [i, t] of bou.fire.entries()) {
  const q = t.quaternion; // +z through its quaternion
  const x = 2 * (q.x * q.z + q.w * q.y), y = 2 * (q.y * q.z - q.w * q.x);
  if (i < 12) assert(Math.sign(x) === Math.sign(t.position.x) && Math.abs(x) > 0.9, `side tube ${i} points out of its flank`);
  else assert(y > 0.9, `up tube ${i} points up`);
}
console.log('bou correfoc: techno window, five jets, the end\'s banknotes, disco floor and the tubes ok');
