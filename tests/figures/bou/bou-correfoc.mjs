// The Bou's festa rules (src/figures/bou/bou-correfoc.js) and its carretilles on the model (models/bou.js).
import assert from 'node:assert/strict';
import { BOU_FX, bouTechno, bouHush, bouJetsWant, bouCarried, bouTubeBurns, bouTubeOn, bouTileLight, bouTileRing, bouTileColour, bouSoftTileLight } from '../../../src/figures/bou/bou-correfoc.js';
import * as THREE from 'three';
import { buildBou, BOU_TUBE_K } from '../../../src/figures/bou/bou.js';

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

// its back's tubes all burn at once (in turns the fire walked along its back); carried by its colla, its head's instead
for (let i = 0; i < BOU_FX.back + 3; i++) {
  assert.equal(bouTubeBurns(i, false), i < BOU_FX.back, `tube ${i} on the plaça`);
  assert.equal(bouTubeBurns(i, true), i >= BOU_FX.back, `tube ${i} carried`);
  assert(bouTubeBurns(i, false, true) && bouTubeBurns(i, true, true), `tube ${i} in free play's burst: all of them, back, horns and mouth`);
}
// set down, the head's jets fade out: its back's tubes must not grow in for that moment (they blinked on an iPhone)
for (let i = 0; i < BOU_FX.back; i++) {
  assert(!bouTubeOn(i, bouCarried(BOU_FX.carryEnd), false, bouJetsWant(BOU_FX.carryEnd, -Infinity), false), `back tube ${i} stays in as the head's jets fade`);
  assert(bouTubeOn(i, false, false, false, true), `back tube ${i} already out stays out while its burst fades`);
}
assert(!bouCarried(BOU_FX.festaStart - 0.01) && bouCarried(BOU_FX.festaStart) && bouCarried(BOU_FX.carryEnd - 0.01) && !bouCarried(BOU_FX.carryEnd), 'carried over [festaStart, carryEnd)');

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

// the model: three pairs along its back's edges and one up the middle, then a horn tip each and its mouth; hidden until
// they burn, pointing out and up, up, out of each horn and ahead
const bou = buildBou();
assert.equal(bou.fire.length, BOU_FX.back + 3);
assert(bou.fire.every(t => !t.visible), 'the tubes are hidden at rest');
const tubeDir = t => new THREE.Vector3(0, 0, 1).applyQuaternion(t.quaternion);
for (const [i, t] of bou.fire.entries()) {
  const d = tubeDir(t);
  if (i < 6) assert(Math.sign(d.x) === Math.sign(t.position.x) && Math.abs(d.x) > 0.5 && d.y > 0.5, `back tube ${i} points out of its flank and up (flat, the far flank's hid behind its back)`);
  else if (i === 6) assert(d.y > 0.9, 'the middle tube points up');
  else if (i < 9) assert(Math.sign(d.x) === Math.sign(t.position.x) && Math.abs(d.x) > 0.99, `horn tube ${i} lies along its horn, pointing out`);
  else assert(d.z > 0.99, 'the mouth tube points ahead');
}
// each back tube stands in the back: its foot under the surface there (on air it read as floating beside the body), its mouth clear of it
bou.root.updateMatrixWorld(true);
const shell = []; bou.body.traverse(o => { if (o.isMesh && o.geometry.attributes.position.count > 600) shell.push(o); });
const down = new THREE.Raycaster(), foot = new THREE.Vector3(), tip = new THREE.Vector3();
for (let i = 0; i < BOU_FX.back; i++) {
  bou.fire[i].getWorldPosition(foot); bou.fire[i].localToWorld(tip.set(0, 0, 0.18 * BOU_TUBE_K));
  down.set(new THREE.Vector3(foot.x, 9, foot.z), new THREE.Vector3(0, -1, 0));
  const top = down.intersectObjects(shell, false)[0].point.y;
  assert(foot.y < top && foot.y > top - 0.05, `back tube ${i}: its foot ${((top - foot.y) * 100).toFixed(1)} cm into the back`);
  assert(tip.y > top + 0.15, `back tube ${i}: its mouth well clear of the back`);
}
// the mouth's: held between the lips (against the mouth's roof, the jaw closed up to it), the mouth still while it is there
const jawDrop = () => { bou.cap.play(0, 21.8, 0); return bou.cap.jaw.rotation.x; }; // beat 21.8: mid-gape
const gape = jawDrop();
bou.cap.jaw.userData.bite = 1;
const bite = jawDrop();
assert(gape > 0.4 && bite > 0.05 && bite < 0.15, `it gapes ${gape.toFixed(2)} rad on its own, ${bite.toFixed(2)} holding the tube`);
bou.cap.play(0, 21.8, 1);
assert.equal(bou.cap.jaw.rotation.x, bite, 'a BRAMA does not open the mouth round the tube either');
let tongue = false; bou.cap.jaw.traverse(o => { if (o !== bou.cap.jaw && o.isGroup && o.visible && o.children.some(c => c.isMesh) && o.position.z > 0.4) tongue = true; });
assert(!tongue, 'no tongue out while it holds the tube');
console.log('bou correfoc: techno window, the tubes that burn, disco floor and the tubes ok');

// First techno: alternating warm tiles, dimmer than the final and bounded around the Bou.
assert.equal(BOU_FX.softDisco.colour, '#ffd66b');
for (const beat of [0, .25, .5, 1, 1.75, 2, 80.3]) {
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
    const light = bouSoftTileLight(i, j, beat, 0);
    if ((i + j) % 2) assert.equal(light, 0, 'every other tile stays dark throughout the pulse');
    else assert(light > 0 && light <= .4, 'the yellow tiles stay softly lit');
    assert.equal(bouSoftTileLight(i, j, beat, BOU_FX.softDisco.reach), 0, 'no yellow light beyond its reach');
  }
}
assert(bouSoftTileLight(0, 0, 0, 0) < bouTileLight(0, 0, 0, 0), 'first-techno tiles are dimmer than the final');
console.log('Bou first techno: soft yellow checkerboard, bounded pulse and reach ok');
