// One run: the rules and the tune stepped together on a fixed clock of TICKS_PER_S, in one fixed order. The page plays
// through it and the server's replay (supabase/functions/pop-score) runs the same file over the page's log, so both reach the
// same score. The log is the taps only: pairs [tick, cell], each made after `tick` steps.
import { newGame, tick, tap, noteSounded, seeded } from './rules.js';
import { createConductor, AHEAD, LEAD } from './conductor.js';

export const RUN_VERSION = 2; // bump whenever a change here, in rules.js or in conductor.js changes what a log scores
export const TICKS_PER_S = 120;
const DT = 1 / TICKS_PER_S;

export function createRun({ cols, rows, seed, on }) {
  const game = newGame({ cols, rows, rng: seeded(seed), on }), tune = createConductor(), log = [];
  let ticks = 0;
  tune.advance(AHEAD);
  // one step of the clock: the fuses burn, the notes that reached it spawn, the tune follows the score
  function step() {
    tick(game, DT);
    ticks += 1;
    const time = ticks / TICKS_PER_S;
    for (let n = tune.due(time + LEAD); n > 0; n--) noteSounded(game);
    tune.setLevel(game.score, game.slow > 0);
    tune.advance(time + AHEAD);
  }
  return {
    game, tune, log, seed,
    get ticks() { return ticks; },
    get time() { return ticks / TICKS_PER_S; },
    tap(i) {
      if (game.state !== 'play') return;
      log.push(ticks, i);
      tap(game, i);
    },
    // run the clock up to `target` ticks, or to the end of the game
    until(target) {
      while (ticks < target && game.state === 'play') step();
    },
  };
}
