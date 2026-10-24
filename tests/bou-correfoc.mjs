// The Bou's festa rules (src/game/bou-correfoc.js) and its carretilles on the model (models/bou.js).
import assert from 'node:assert/strict';
import { BOU_FX, bouTechno, bouHush, bouMilestone, bouJetsWant, bouPairBurns, bouUpBurns, bouTileLight, bouTileRing, bouTileColour } from '../src/game/bou-correfoc.js';
import { buildBou } from '../src/scene/models/bou.js';

// the techno part: source bars 27 up to 35, inside the song
assert(BOU_FX.technoStart > 0 && BOU_FX.technoEnd > BOU_FX.technoStart + 10, 'the techno part spans its bars');
assert(!bouTechno(BOU_FX.technoStart - 0.01) && bouTechno(BOU_FX.technoStart) && !bouTechno(BOU_FX.technoEnd), 'its window is [start, end)');
// and the final's (bars 84-91), after the festa, where the carretilles and confetti keep going; never the slow run-up
assert(bouTechno(BOU_FX.finalStart) && bouTechno(BOU_FX.finalEnd - 0.01) && !bouTechno(BOU_FX.finalEnd) && !bouTechno(BOU_FX.finalStart - 0.01), 'the final window is [84, 92)');
assert(!bouTechno(BOU_FX.festaStart - 1) && BOU_FX.finalStart > BOU_FX.festaStart, 'no disco in the run-up or the carry');
assert(bouHush(BOU_FX.technoStart) && !bouHush(BOU_FX.finalStart), 'only the first disco hushes the plaça');

// the carretilles: a short burst at each 30 in a row before the festa, the whole streak from it (Marc: not all song long)
const early = BOU_FX.technoEnd + 5;
assert.equal(bouMilestone(29), 0); assert.equal(bouMilestone(30), 1); assert.equal(bouMilestone(61), 2);
assert(!bouJetsWant(early, 29, -Infinity), 'no milestone, no fire');
assert(bouJetsWant(early, 30, early) && bouJetsWant(early + BOU_FX.burst - 0.1, 40, early), 'a burst at the milestone');
assert(!bouJetsWant(early + BOU_FX.burst, 45, early), 'it ends while the streak goes on');
assert(early + BOU_FX.burst < BOU_FX.festaStart && bouJetsWant(BOU_FX.festaStart, 45, early), 'the festa burns the whole streak');
assert(!bouJetsWant(BOU_FX.festaStart + 5, 10, early), 'the festa still needs a streak');

// at any moment exactly two pairs and one up tube burn: the five jets drac-fire.js draws
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
// the ring runs out of the Bou through each bar, well past its body (Marc: a ring inside 4.5 m never showed), and fades
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
console.log('bou correfoc: techno window, five jets, disco floor and the tubes ok');
