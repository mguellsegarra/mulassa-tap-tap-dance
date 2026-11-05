// What pop-score accepts: a Mulassa Pop run the server plays again from its seed and its taps, with the page's own simulation
// (sim/, copied by tools/jocs/pop-sim.mjs), so the score it records is its own and never the player's word. Plain JS, for
// Deno and for the tests (tests/jocs/pop-replay.mjs). docs/jocs/pop-ranking.md.
import { createRun, RUN_VERSION, TICKS_PER_S } from './sim/run.js';

export const MAX_BYTES = 64 * 1024; // the body, read before it is parsed
export const MAX_TICKS = 30 * 60 * TICKS_PER_S; // half an hour of play: the replay's work is bounded by this
export const MAX_TAPS = 6000;
const LAYOUTS = new Set(['4x6', '6x4']); // portrait and landscape boards (main.js layout())
const int = (x, lo, hi) => Number.isInteger(x) && x >= lo && x <= hi;
// A human needs ~150 ms to answer a Mulassa that just appeared; a bot built from sim/ answers in the same frame. Judged only
// from MIN_JUDGED scoring taps on, so a short lucky run is never punished.
const FAST_S = .1, FAST_SHARE = .25, MIN_JUDGED = 30;
const no = error => ({ ok: false, error });

// body: { v, seed, cols, rows, ticks, taps: [tick, cell, ...], score } → { ok, seed, score, ticks } or { ok: false, error }
export function verifyRun(body) {
  if (!body || typeof body !== 'object') return no('invalid');
  const { v, seed, cols, rows, ticks, taps, score } = body;
  if (v !== RUN_VERSION) return no('version');
  if (!int(seed, 0, 2 ** 32 - 1) || !LAYOUTS.has(`${cols}x${rows}`) || !int(ticks, 1, MAX_TICKS) || !int(score, 0, 1e6)
    || !Array.isArray(taps) || taps.length % 2 || taps.length > MAX_TAPS * 2) return no('invalid');
  const run = createRun({ cols, rows, seed });
  let judged = 0, fast = 0;
  for (let j = 0, last = 0; j < taps.length; j += 2) {
    const [t, cell] = [taps[j], taps[j + 1]];
    if (!int(t, last, ticks) || !int(cell, 0, cols * rows - 1)) return no('invalid');
    last = t;
    run.until(t);
    if (run.game.state !== 'play') return no('mismatch'); // a tap after the end
    const c = run.game.cells[cell];
    if (c.kind === 'mula') { judged++; if (c.age < FAST_S) fast++; } // age: seconds since the Mulassa appeared there
    run.tap(cell);
  }
  run.until(ticks);
  // the run must have ended where the page says, with the page's score: anything else is not the run that was played
  if (run.game.state !== 'over' || run.ticks !== ticks || run.game.score !== score) return no('mismatch');
  if (judged >= MIN_JUDGED && fast > judged * FAST_SHARE) return no('implausible');
  return { ok: true, seed, score, ticks };
}
