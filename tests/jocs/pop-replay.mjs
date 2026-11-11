// The ranking's guarantee: the server replays a Mulassa Pop run with the page's very simulation and records only the score that
// replay reaches. A real run passes; a changed score, a tap moved or added, an unknown layout or version do not.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { POP_SIM } from '../../tools/jocs/pop-sim.mjs';
import { createRun, RUN_VERSION, TICKS_PER_S } from '../../src/jocs/games/pop/run.js';
import { botTap } from '../../src/jocs/games/pop/autoplay.js';
import { verifyRun, MAX_TICKS } from '../../supabase/functions/pop-score/verify.js';

for (const f of POP_SIM) {
  const page = readFileSync(new URL(`../../src/jocs/games/pop/${f}`, import.meta.url), 'utf8');
  const server = readFileSync(new URL(`../../supabase/functions/pop-score/sim/${f}`, import.meta.url), 'utf8');
  assert.equal(server, page, `${f}: the server's copy differs; run node tools/jocs/pop-sim.mjs`);
}

// a run as the page plays it: uneven frames, the bot's taps between them, a slip now and then
function play(seed, { cols = 4, rows = 6, level = 0, rnd = mulberry(seed) } = {}) {
  const run = createRun({ cols, rows, seed, level });
  let clock = 0;
  while (run.game.state === 'play' && clock < 900) {
    clock += rnd() < .05 ? .05 : 1 / 60 + (rnd() - .5) * .006;
    run.until(Math.floor(clock * TICKS_PER_S));
    if (run.game.state === 'play' && rnd() < .6) { const i = botTap(run.game, rnd); if (i >= 0) run.tap(i); }
    if (run.game.state === 'play' && rnd() < .001) run.tap(Math.floor(rnd() * cols * rows));
  }
  return { v: RUN_VERSION, seed, level, cols, rows, ticks: run.ticks, taps: [...run.log], points: run.game.points, hits: run.game.hits };
}
function mulberry(a) { return () => { a = (a + 0x6D2B79F5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

let best = null;
const levels = new Set();
for (let k = 1; k <= 45; k++) {
  const body = play(k * 7919, { ...(k % 2 ? {} : { cols: 6, rows: 4 }), level: k % 3 });
  assert.deepEqual(verifyRun(body), { ok: true, seed: body.seed, level: body.level, points: body.points, hits: body.hits, ticks: body.ticks }, `seed ${body.seed}`);
  levels.add(body.level);
  assert.ok(body.points >= body.hits, 'a Mulassa is worth at least 1');
  if (!best || body.points > best.points) best = body;
}
assert.equal(levels.size, 3, 'replays pass at every level');
assert.ok(best.points >= 20 && best.taps.length >= 40, `a run worth testing (${best.points} points)`);

const no = (change, error = 'mismatch', why = '') => assert.equal(verifyRun({ ...best, ...change }).error, error, why || Object.keys(change).join());
no({ points: best.points + 1 });
no({ points: best.points - 1 });
no({ hits: best.hits + 1 });
no({ hits: best.hits - 1 });
no({ level: (best.level + 1) % 3 }, 'mismatch', 'another level is another run');
no({ level: (best.level + 2) % 3 }, 'mismatch', 'another level is another run');
no({ level: 3 }, 'invalid');
no({ level: -1 }, 'invalid');
no({ level: 1.5 }, 'invalid');
no({ level: undefined }, 'invalid', 'a body with no level');
no({ points: undefined }, 'invalid', 'a body with no points');
no({ hits: undefined }, 'invalid', 'a body with no hits');
no({ ticks: best.ticks + TICKS_PER_S }, 'mismatch'); // played on after the end
no({ seed: best.seed + 1 });
no({ taps: best.taps.slice(0, -2) }); // a tap left out
{ // the second tap moved onto a Drac: that run ends there
  const r = createRun({ cols: best.cols, rows: best.rows, seed: best.seed });
  r.until(best.taps[0]); r.tap(best.taps[1]); r.until(best.taps[2]);
  const drac = r.game.cells.find(c => c.kind === 'drac' && c.age >= 0).i;
  no({ taps: best.taps.map((x, j) => (j === 3 ? drac : x)) });
}
no({ taps: [...best.taps, best.ticks, 0] }); // a tap after the end
no({ taps: [5, 0, 4, 0] }, 'invalid'); // out of order
no({ v: RUN_VERSION + 1 }, 'version');
no({ cols: 5, rows: 5 }, 'invalid');
no({ ticks: MAX_TICKS + 1 }, 'invalid');
no({ taps: [0, 99] }, 'invalid');
no({ seed: -1 }, 'invalid');
no({ taps: 'x' }, 'invalid');
assert.equal(verifyRun(null).error, 'invalid');
console.log(`pop-replay: ok (best bot run ${best.points} points, ${best.hits} hits, level ${best.level}, ${best.taps.length / 2} taps)`);
