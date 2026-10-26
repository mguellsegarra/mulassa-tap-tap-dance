// Playability of every song's charts after their tempo changes: the shortest gap between notes (in seconds, so it follows the
// local tempo) and the taps a balloon asks for versus a human tap rate.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { makeDanceChart } from '../../src/game/chart.js';

const MIN_GAP = [0.39, 0.39, 0.19]; // s per level: today's shortest (0.395, 0.395, 0.197 on the Mulassa), nothing denser
const TAP_RATE = 12; // taps/s a person keeps up for a few seconds; the same rate autoplay mashes at (judge.js)
const HANDOFF = 0.06; // a balloon takes taps until this long before its end (state.js)
const problems = (chart, diff) => {
  const out = [];
  chart.forEach((n, i) => {
    if (i && n.t - chart[i - 1].t < MIN_GAP[diff] - 1e-3) out.push(`notes ${(n.t - chart[i - 1].t).toFixed(3)} s apart at ${n.t.toFixed(2)}`);
    if (n.balloon && n.need > TAP_RATE * (n.end - n.t - HANDOFF)) out.push(`balloon at ${n.t.toFixed(2)} needs ${n.need} taps in ${(n.end - n.t - HANDOFF).toFixed(2)} s`);
  });
  return out;
};

for (const key of ['mulassa', 'drac', 'bou']) {
  const song = JSON.parse(readFileSync(new URL(`../../src/song-${key}.json`, import.meta.url)));
  for (const diff of [0, 1, 2]) assert.deepEqual(problems(makeDanceChart(song, diff), diff), [], `${key} level ${diff}`);
}
// the check itself: a crafted chart with a too-close note and an impossible balloon fails
assert.equal(problems([{ t: 1 }, { t: 1.1 }, { t: 3, end: 4, balloon: true, need: 40 }], 2).length, 2);
console.log('chart playable ok');
