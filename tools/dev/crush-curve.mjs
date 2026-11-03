// Seguici Crush's difficulty curve, measured with a casual player and not with real games (no stats leave the device).
//   node tools/dev/crush-curve.mjs            win rate of every level against its target
//   node tools/dev/crush-curve.mjs tune 7     a new table row for level 7 (0-based), to paste into levels.js
import { pathToFileURL } from 'node:url';
import { newGame, swap, findMoves } from '../../src/jocs/games/crush/rules.js';
import { LEVELS, levelFor } from '../../src/jocs/games/crush/levels.js';

const COLS = 7, ROWS = 11; // a common phone; levelFor scales the goal for other heights
const SKILL = .7; // how often the player looks for the best move; otherwise any move will do

const mulberry = s => () => {
  s = s + 0x6D2B79F5 | 0;
  let t = Math.imul(s ^ s >>> 15, 1 | s);
  t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
  return ((t ^ t >>> 14) >>> 0) / 4294967296;
};
const copy = (g, seed) => ({ ...g, rng: mulberry(seed), board: g.board.map(row => row.map(p => ({ ...p }))) });

function playGame(level, seed) {
  const pick = mulberry(seed + 7777), g = newGame(level, mulberry(seed), COLS, ROWS);
  while (g.status === 'playing') {
    const moves = findMoves(g.board);
    let move = moves[Math.floor(pick() * moves.length)];
    if (pick() < SKILL) {
      let top = -1;
      for (const m of moves) {
        const k = copy(g, seed);
        swap(k, m.a, m.b);
        const gained = k.collected - g.collected + pick() * .1;
        if (gained > top) { top = gained; move = m; }
      }
    }
    swap(g, move.a, move.b);
  }
  return g;
}

// Falls from about 100% to about 40%; the first four levels are then eased by hand in levels.js; from level 5 on, every fourth level is hard and the next one a relief.
export const targetFor = i => {
  const base = 1 - .6 * i / 19, saw = i < 4 ? 0 : i % 4 === 3 ? -.12 : i % 4 === 0 ? .1 : 0;
  return Math.min(.98, Math.max(.25, base + saw));
};

// Moves left in each won game, lowest first; the same seeds every time, so two levels compare fairly.
function wins(level, games, tag) {
  const left = [];
  for (let s = 0; s < games; s++) {
    const g = playGame(level, s * 31 + tag * 1009 + 1);
    if (g.status === 'won') left.push(g.moves);
  }
  return left.sort((a, b) => a - b);
}
export const winRate = (i, games) => wins(levelFor(i, ROWS), games, i).length / games;

// The table row for a level with this many pieces to collect on the phone's board.
export function rowFor(i, n, games) {
  const L = levelFor(i, ROWS), base = LEVELS[i];
  const left = wins({ ...L, n }, games, i), at = q => (left.length ? left[Math.floor((left.length - 1) * q)] : 0);
  const two = Math.max(1, at(.4)), three = Math.min(base.moves - 1, Math.max(two + 1, at(.85)));
  return [Math.max(6, Math.round(n / (L.n / base.n))), base.moves, two, three];
}

function tune(i, games) {
  const L = levelFor(i, ROWS), target = targetFor(i);
  let lo = Math.max(6, L.n >> 2), hi = L.n * 3;
  while (hi - lo > 1) {
    const n = (lo + hi) >> 1;
    if (wins({ ...L, n }, games, i).length / games >= target) lo = n; else hi = n;
  }
  return rowFor(i, lo, games);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv[2] === 'tune') console.log(JSON.stringify(tune(+process.argv[3], 200)));
  else for (const i of LEVELS.keys()) console.log(i + 1, 'target', targetFor(i).toFixed(2), 'win', winRate(i, 200).toFixed(2));
}
