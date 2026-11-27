// Campanar (POC): the altimeter's famous heights (collection.js). Every run passes the fixed ones and one of the band's
// Catalan bell towers, in turn; whichever it gets, the heights stay in order and 12 m or more apart, so one never covers
// the next on the ruler (bands.js shows one from 20 m before it).
import assert from 'node:assert/strict';

const { milestonesOf, TOWERS } = await import('../../src/jocs/games/campanar/collection.js');

const seen = new Set();
for (let k = -1; k < TOWERS.length * 2; k++) {
  const run = milestonesOf(k);
  run.slice(1).forEach((x, i) => assert(x.m - run[i].m >= 12, `run ${k}: ${run[i].name} and ${x.name} only ${x.m - run[i].m} m apart`));
  const towers = run.filter(x => TOWERS.includes(x));
  assert.equal(towers.length, 1, `run ${k}: one bell tower of the band`);
  seen.add(towers[0]);
}
assert.equal(seen.size, TOWERS.length, 'every bell tower of the band gets its turn');
assert.equal(milestonesOf(0)[2], TOWERS[0], 'the turn starts with the first');
assert.notEqual(milestonesOf(0)[2], milestonesOf(1)[2], 'the next run passes the next one');
console.log('campanar milestones: in order, 12 m or more apart, each bell tower of the band in turn ok');
