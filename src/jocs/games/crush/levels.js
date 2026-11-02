// The Seguici's order, confirmed by the owner; it also decides each level's goal.
export const SEGUICI = ['drac', 'basilisc', 'bou', 'lleo', 'mulassa', 'calcot', 'aliga'];

// [pieces to collect, moves, moves left for 2 stars, for 3 stars].
// Tuned by tools/dev/crush-curve.mjs for a casual player's win rate: about 100% at level 1 falling to about 40% at level 20, a
// sawtooth from level 5 on: every fourth level is hard and the next one easy, so a hard level is followed by relief.
// The first four sit about 30% under what the tool asks for: a first-time player is not its practised bot.
const TABLE = [
  [28, 15, 10, 12],
  [45, 15, 8, 11],
  [52, 15, 7, 10],
  [56, 15, 6, 10],
  [17, 16, 6, 10],
  [13, 18, 5, 11],
  [86, 14, 3, 6],
  [103, 14, 2, 5],
  [26, 18, 5, 10],
  [26, 16, 3, 7],
  [31, 18, 4, 9],
  [19, 18, 3, 8],
  [112, 16, 3, 6],
  [30, 16, 2, 7],
  [36, 18, 3, 7],
  [20, 18, 3, 9],
  [35, 18, 3, 7],
  [20, 18, 3, 8],
  [21, 18, 3, 8],
  [26, 20, 3, 6],
];

// Each level's figures, its goal first. Measured on the board's colours with the gelatine pieces: the closest pair in each level stays as far apart as its count allows, Calçot and Àliga never share a board.
const FIGURES = [
  ['drac', 'basilisc', 'lleo', 'mulassa'],
  ['basilisc', 'drac', 'mulassa', 'aliga'],
  ['bou', 'drac', 'basilisc', 'aliga'],
  ['lleo', 'drac', 'basilisc', 'mulassa'],
  ['mulassa', 'drac', 'basilisc', 'lleo', 'aliga'],
  ['calcot', 'drac', 'basilisc', 'bou', 'lleo', 'mulassa'],
  ['aliga', 'drac', 'basilisc', 'mulassa'],
  ['drac', 'basilisc', 'lleo', 'mulassa'],
  ['basilisc', 'drac', 'lleo', 'mulassa', 'aliga'],
  ['bou', 'drac', 'basilisc', 'lleo', 'calcot'],
  ['lleo', 'drac', 'basilisc', 'mulassa', 'aliga'],
  ['mulassa', 'drac', 'basilisc', 'bou', 'lleo', 'aliga'],
  ['calcot', 'basilisc', 'lleo', 'mulassa'],
  ['aliga', 'drac', 'basilisc', 'lleo', 'mulassa'],
  ['drac', 'basilisc', 'lleo', 'mulassa', 'aliga'],
  ['basilisc', 'drac', 'bou', 'lleo', 'mulassa', 'calcot'],
  ['bou', 'drac', 'basilisc', 'lleo', 'aliga'],
  ['lleo', 'drac', 'basilisc', 'bou', 'mulassa', 'aliga'],
  ['mulassa', 'drac', 'basilisc', 'bou', 'lleo', 'calcot'],
  ['calcot', 'drac', 'basilisc', 'bou', 'lleo', 'mulassa'],
];

export const LEVELS = TABLE.map(([n, moves, two, three], i) => ({ goal: FIGURES[i][0], n, moves, kinds: FIGURES[i], stars: [two, three] }));

export const MIN_ROWS = 8, MAX_ROWS = 13;
// A taller board means more matches per move, so the goal grows to keep a level as hard. How much was measured by simulation: more kinds, fewer goal pieces on the board.
const GOAL_PER_ROW = { 4: .15, 5: .18, 6: .11 };
export const levelFor = (i, rows) => {
  const level = LEVELS[i];
  return { ...level, n: Math.round(level.n * (1 + GOAL_PER_ROW[level.kinds.length] * (rows - MIN_ROWS))) };
};
