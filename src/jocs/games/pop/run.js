// One run: the rules and the tune stepped together on a fixed clock of TICKS_PER_S, in one fixed order. The page plays
// through it and the server's replay (supabase/functions/pop-score) runs the same file over the page's log, so both reach the
// same points. The log is the taps only: pairs [tick, cell], each made after `tick` steps.
import { newGame, tick, tap, beat, seeded, timeUp } from './rules.js';
import { createConductor, AHEAD } from './conductor.js';

export const RUN_VERSION = 5; // bump whenever a change here, in rules.js or in conductor.js changes what a log scores
export const TICKS_PER_S = 120;
const DT = 1 / TICKS_PER_S;
// a run ends on its own here, under the server's limits (verify.js MAX_TICKS, MAX_TAPS), so a long one is never refused
export const MAX_RUN_S = 25 * 60, MAX_RUN_TAPS = 5500;

export function createRun({ cols, rows, seed, level = 0, on }) {
  const game = newGame({ cols, rows, level, rng: seeded(seed), on }), tune = createConductor(level), log = [];
  let ticks = 0;
  tune.advance(AHEAD);
  // one step of the clock: the fuses burn, the tune follows the progression, and each half-beat step it reaches may bring a Mulassa
  function step() {
    tick(game, DT);
    ticks += 1;
    if (ticks >= MAX_RUN_S * TICKS_PER_S) timeUp(game);
    const time = ticks / TICKS_PER_S;
    for (let n = tune.due(time); n > 0; n--) beat(game);
    tune.setProgress(game.progress, game.slow > 0);
    tune.advance(time + AHEAD);
  }
  return {
    game, tune, log, seed, level,
    get ticks() { return ticks; },
    get time() { return ticks / TICKS_PER_S; },
    tap(i) {
      if (game.state !== 'play') return;
      log.push(ticks, i);
      tap(game, i);
      if (log.length / 2 >= MAX_RUN_TAPS) timeUp(game);
    },
    // run the clock up to `target` ticks, or to the end of the game
    until(target) {
      while (ticks < target && game.state === 'play') step();
    },
  };
}
