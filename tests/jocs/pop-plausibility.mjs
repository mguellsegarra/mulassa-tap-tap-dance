// The ranking's second guard: a replay that obeys the rules is still refused when its taps answer faster than a human can.
import assert from 'node:assert/strict';
import { createRun, RUN_VERSION, TICKS_PER_S } from '../../src/jocs/games/pop/run.js';
import { verifyRun, MAX_BYTES, MAX_TAPS, MAX_TICKS } from '../../supabase/functions/pop-score/verify.js';

function mulberry(a) { return () => { a = (a + 0x6D2B79F5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// Taps each Mulassa `delay()` seconds after it shows (the bot's reading of the board), until `maxScore` or the end.
function bot(seed, delay, maxScore = 1e9) {
  const run = createRun({ cols: 4, rows: 6, seed }), due = new Map();
  while (run.game.state === 'play' && run.ticks < 600 * TICKS_PER_S && run.game.score < maxScore) {
    run.until(run.ticks + 1);
    for (const c of run.game.cells) {
      if (c.kind === 'petard') run.tap(c.i); // it must be put out, or the run ends
      if (c.kind !== 'mula') { due.delete(c.i); continue; }
      if (!due.has(c.i)) due.set(c.i, delay());
      if (c.age >= due.get(c.i)) { due.delete(c.i); run.tap(c.i); }
    }
  }
  if (run.game.state === 'play') { run.game.state = 'over'; } // stopped early: the page ends no run like this, so play it out
  return { v: RUN_VERSION, seed, cols: 4, rows: 6, ticks: run.ticks, taps: [...run.log], score: run.game.score, run };
}
// the bot only ends a run when a Mulassa burns out, so an instant bot is cut at 60 points by letting the fuse run out
function finish(b) {
  const { run } = b; run.game.state = 'play';
  run.until(MAX_TICKS);
  return { v: b.v, seed: b.seed, cols: 4, rows: 6, ticks: run.ticks, taps: [...run.log], score: run.game.score };
}
const play = (seed, delay, maxScore) => finish(bot(seed, delay, maxScore));

const instant = play(1, () => 0, 80);
assert.ok(instant.taps.length / 2 >= 60, `${instant.taps.length / 2} taps`);
assert.equal(verifyRun(instant).error, 'implausible', 'a bot that answers in the same frame');

const r = mulberry(5);
const human = () => (r() < .08 ? .05 + r() * .05 : .18 + r() * .5); // 180–680 ms, a lucky fast one now and then
for (let k = 1; k <= 10; k++) {
  const b = play(k * 31, human, 80);
  assert.equal(verifyRun(b).ok, true, `human-like run ${k}`);
}

// a short run with every tap fast is not judged
const short = play(2, () => 0, 20);
assert.ok(short.taps.length / 2 < 30);
assert.equal(verifyRun(short).ok, true, 'a short lucky run');

// the largest body the ranking can take stays under the byte cap
const big = { v: RUN_VERSION, seed: 2 ** 32 - 1, cols: 6, rows: 4, ticks: MAX_TICKS, score: 1e6, taps: Array.from({ length: MAX_TAPS * 2 }, (_, j) => (j % 2 ? 23 : MAX_TICKS)) };
assert.ok(JSON.stringify(big).length < MAX_BYTES, `${JSON.stringify(big).length} bytes`);
console.log('pop-plausibility: ok');
