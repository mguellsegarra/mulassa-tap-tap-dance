// The rules, no drawing. See docs/jocs/subara-referent.md for what comes from SubaraCity and what does not.
export const COLS = 5, ROWS = 6, COLORS = 4;
export const DEMOLITIONS = 2;
export const CAMPANAR = 10; // the value where a block turns into a monument and loses its colour
export const MONUMENTS = [1, 2, 3, 4, 6, 8]; // monuments gathered into one block to reach each next one
const ORDINARY = 9;
// Which of the 15 pieces a block shows: its value up to 9, then by how many monuments it has gathered.
export const pieceOf = b => b.bells ? ORDINARY + MONUMENTS.findLastIndex(m => b.bells >= m) : b.v - 1;
export const RANKS = [ // lowest score of each, top one first
  { id: 'gegant', from: 16000 },
  { id: 'aliga', from: 8000 },
  { id: 'mulassa', from: 4000 },
  { id: 'cavallets', from: 2000 },
  { id: 'nans', from: 0 },
];
export const rankOf = score => RANKS.find(r => score >= r.from).id;

function newBlock(g) {
  return { id: g.nextId++, color: Math.floor(g.rng() * COLORS), v: 1, bells: 0 };
}

export function newVila(rng = Math.random) {
  const g = { rng, nextId: 1, grid: [], score: 0, years: 0, demolitions: DEMOLITIONS, campanars: 0, state: 'play' };
  for (let r = 0; r < ROWS; r++) g.grid.push(Array.from({ length: COLS }, () => newBlock(g)));
  settle(g);
  return g;
}

export const linked = (a, b) => a.bells || b.bells ? Boolean(a.bells && b.bells) : a.color === b.color;

// The connected blocks that would merge with the one at (c, r), as [c, r] pairs. Up, down, left and right only.
export function groupAt(g, c, r) {
  const start = g.grid[r]?.[c];
  if (!start) return [];
  const seen = new Set([start]), group = [[c, r]];
  for (const [x, y] of group) {
    for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
      const b = g.grid[ny]?.[nx];
      if (b && !seen.has(b) && linked(start, b)) { seen.add(b); group.push([nx, ny]); }
    }
  }
  return group;
}

export function hasMove(g) {
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (groupAt(g, c, r).length > 1) return true;
  return false;
}

// Blocks fall, new ones drop in from the top, and the game ends once nothing can merge and nothing can be demolished.
function settle(g) {
  for (let c = 0; c < COLS; c++) {
    const kept = g.grid.map(row => row[c]).filter(Boolean);
    const fresh = Array.from({ length: ROWS - kept.length }, () => newBlock(g));
    [...fresh, ...kept].forEach((b, r) => { g.grid[r][c] = b; });
  }
  g.state = hasMove(g) ? 'play' : g.demolitions > 0 ? 'stuck' : 'over';
}

// What merging the group at (c, r) would leave on the tapped cell, without doing it. Null if the block is alone.
export function preview(g, c, r) {
  const group = groupAt(g, c, r);
  if (group.length < 2) return null;
  const blocks = group.map(([x, y]) => g.grid[y][x]);
  const v = Math.min(CAMPANAR, blocks.reduce((sum, b) => sum + b.v, 0));
  const bells = blocks.reduce((sum, b) => sum + b.bells, 0);
  const sum = blocks.reduce((total, b) => total + b.v, 0);
  const points = bells ? bells * bells * 100 : sum * group.length * 5 + (v === CAMPANAR ? 100 : 0);
  return { group, blocks, v, bells, points };
}

export function merge(g, c, r) {
  if (g.state !== 'play') return null;
  const p = preview(g, c, r);
  if (!p) return null;
  const target = g.grid[r][c];
  for (const [x, y] of p.group) if (g.grid[y][x] !== target) g.grid[y][x] = null;
  const became = p.v === CAMPANAR && !target.bells;
  target.v = p.v;
  target.bells = p.bells || (became ? 1 : 0);
  if (became) g.campanars++;
  g.score += p.points;
  g.years++;
  const gone = p.blocks.filter(b => b !== target);
  settle(g);
  return { target, gone, points: p.points, became, joined: p.bells > 0 };
}

// Only when stuck: take any one block off the board.
export function demolish(g, c, r) {
  if (g.state !== 'stuck' || !g.grid[r]?.[c]) return null;
  const block = g.grid[r][c];
  g.grid[r][c] = null;
  g.demolitions--;
  g.years++;
  settle(g);
  return block;
}
