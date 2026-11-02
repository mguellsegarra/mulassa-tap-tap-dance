// The Seguici's order, confirmed by the owner; it also decides each level's goal.
export const SEGUICI = ['drac', 'basilisc', 'bou', 'lleo', 'mulassa', 'nans', 'aliga'];

// [pieces to collect, moves, kinds on the board, moves left for 2 stars, for 3 stars]. Goals walk SEGUICI in order.
// Tuned by simulation for a casual player's win rate: about 100% at level 1 falling to about 40% at level 20, a sawtooth
// from level 5 on: every fourth level is hard and the next one easy, so a hard level is followed by relief.
const TABLE = [
  [28,  15,  4,  8,  12],
  [52,  15,  4,  3,  8],
  [63,  15,  4,  3,  7],
  [46,  15,  4,  6,  9],
  [16,  16,  5,  6,  11],
  [14,  18,  6,  6,  11],
  [82,  14,  4,  3,  7],
  [101,  14,  4,  2,  6],
  [27,  18,  5,  5,  9],
  [27,  16,  5,  2,  7],
  [33,  18,  5,  3,  6],
  [20,  18,  6,  4,  8],
  [106,  16,  4,  3,  7],
  [29,  16,  5,  2,  8],
  [39,  18,  5,  2,  6],
  [20,  18,  6,  3,  9],
  [34,  18,  5,  3,  6],
  [23,  18,  6,  1,  6],
  [20,  18,  6,  3,  9],
  [27,  20,  6,  4,  6],
];

// The owner finds the Bou and the Lleó hard to tell apart, so a board never holds both.
const RIVAL = { bou: 'lleo', lleo: 'bou' };
const kindsFor = (goal, count) => [goal, ...SEGUICI.filter(k => k !== goal && k !== (RIVAL[goal] ?? 'bou')).slice(0, count - 1)];

export const LEVELS = TABLE.map(([n, moves, kinds, two, three], i) => {
  const goal = SEGUICI[i % SEGUICI.length];
  return { goal, n, moves, kinds: kindsFor(goal, kinds), stars: [two, three] };
});

export const MIN_ROWS = 8, MAX_ROWS = 13;
// A taller board means more matches per move, so the goal grows to keep a level as hard. How much was measured by simulation: more kinds, fewer goal pieces on the board.
const GOAL_PER_ROW = { 4: .15, 5: .18, 6: .11 };
export const levelFor = (i, rows) => {
  const level = LEVELS[i];
  return { ...level, n: Math.round(level.n * (1 + GOAL_PER_ROW[level.kinds.length] * (rows - MIN_ROWS))) };
};
