// Match-3 rules: pure, no DOM. Every change comes back as events the view can replay, so the view never decides anything.
export const CARRETILLA = 'carretilla';
export const TRONADA = 'tronada';
const ALL = '*';

const STRIDE = 64; // keys only name a cell, so they need not know the board's shape
const key = (r, c) => r * STRIDE + c;
const cellOf = k => ({ r: Math.floor(k / STRIDE), c: k % STRIDE });
const at = (board, k) => board[Math.floor(k / STRIDE)][k % STRIDE];
const allKeys = board => board.flatMap((row, r) => row.map((_, c) => key(r, c)));
export const adjacent = (a, b) => Math.abs(a.r - b.r) + Math.abs(a.c - b.c) === 1;

function piece(g, kind, special, dir) {
  const p = { id: g.nextId++, kind };
  if (special) p.special = special;
  if (dir) p.dir = dir;
  return p;
}
const randomKind = g => g.kinds[Math.floor(g.rng() * g.kinds.length)];

// Lines of 3+ of one kind; lines sharing a cell join, which is what makes L and T a single match.
export function findGroups(board) {
  const runs = [], rows = board.length, cols = board[0].length;
  for (const axis of ['row', 'col']) {
    const [lines, len] = axis === 'row' ? [rows, cols] : [cols, rows];
    const cellAt = axis === 'row' ? (l, i) => board[l][i] : (l, i) => board[i][l];
    const keyAt = axis === 'row' ? (l, i) => key(l, i) : (l, i) => key(i, l);
    for (let line = 0; line < lines; line++) {
      for (let start = 0, i = 1; i <= len; i++) {
        const { kind } = cellAt(line, start);
        if (i < len && kind && cellAt(line, i).kind === kind) continue;
        if (kind && i - start >= 3) {
          const cells = [];
          for (let j = start; j < i; j++) cells.push(keyAt(line, j));
          runs.push({ cells, axis, kind });
        }
        start = i;
      }
    }
  }
  let groups = [];
  for (const run of runs) {
    const touching = groups.filter(g => run.cells.some(k => g.cells.has(k)));
    groups = groups.filter(g => !touching.includes(g));
    groups.push({
      kind: run.kind,
      cells: new Set([...run.cells, ...touching.flatMap(g => [...g.cells])]),
      runs: [run, ...touching.flatMap(g => g.runs)],
    });
  }
  return groups;
}

const swapCells = (board, a, b) => { [board[a.r][a.c], board[b.r][b.c]] = [board[b.r][b.c], board[a.r][a.c]]; };

// Any special can always be swapped: carretilles fire and the tronada needs a partner, not a line.
function isMove(board, a, b) {
  if (board[a.r][a.c].special || board[b.r][b.c].special) return true;
  swapCells(board, a, b);
  const ok = findGroups(board).length > 0;
  swapCells(board, a, b);
  return ok;
}

export function findMoves(board) {
  const moves = [], rows = board.length, cols = board[0].length;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const a = { r, c };
    if (c < cols - 1 && isMove(board, a, { r, c: c + 1 })) moves.push({ a, b: { r, c: c + 1 } });
    if (r < rows - 1 && isMove(board, a, { r: r + 1, c })) moves.push({ a, b: { r: r + 1, c } });
  }
  return moves;
}

function freshBoard(g) {
  const board = [];
  for (let r = 0; r < g.rows; r++) {
    board.push([]);
    for (let c = 0; c < g.cols; c++) {
      const banned = [];
      if (c >= 2 && board[r][c - 1].kind === board[r][c - 2].kind) banned.push(board[r][c - 1].kind);
      if (r >= 2 && board[r - 1][c].kind === board[r - 2][c].kind) banned.push(board[r - 1][c].kind);
      let kind;
      do kind = randomKind(g); while (banned.includes(kind));
      board[r].push(piece(g, kind));
    }
  }
  return board;
}

// More moves and goal pieces to start from mean an easier level with nothing on screen to give it away.
const boardValue = (g, board, moves) => moves + board.flat().filter(p => p.kind === g.level.goal).length;

function dealBoard(g, boards) {
  let best = null, top = -1;
  for (let dealt = 0; dealt < boards; ) {
    const board = freshBoard(g), moves = findMoves(board).length;
    if (!moves) continue;
    dealt++;
    const value = boardValue(g, board, moves);
    if (value > top) { best = board; top = value; }
  }
  return best;
}

// level: { goal, n, moves, kinds, stars }; help: see helpFor
export function newGame(level, rng, cols, rows, { assist = 0, boards = 1, gift = false } = {}) {
  const g = { level, rng, cols, rows, assist, gift, kinds: level.kinds, nextId: 1, board: null, moves: level.moves, collected: 0, status: 'playing' };
  g.board = dealBoard(g, boards);
  if (gift) {
    const p = g.board[Math.floor(rng() * rows)][Math.floor(rng() * cols)];
    p.special = CARRETILLA;
    p.dir = rng() < .5 ? 'row' : 'col';
  }
  return g;
}

// Where a 4 or 5 leaves its special: on the cell the player moved if it is in the longest line, else mid-line.
function reward(group, hot) {
  const longest = group.runs.reduce((a, b) => (b.cells.length > a.cells.length ? b : a));
  const len = longest.cells.length;
  if (len < 4) return null;
  const spot = longest.cells.find(k => hot.includes(k)) ?? longest.cells[Math.floor((len - 1) / 2)];
  // a sideways line leaves a carretilla that fires across it, so it reaches pieces the line did not
  return { at: spot, special: len >= 5 ? TRONADA : CARRETILLA, dir: longest.axis === 'row' ? 'col' : 'row', kind: len >= 5 ? null : group.kind };
}

function mostCommonKind(board, hit) {
  const count = new Map();
  for (const k of allKeys(board)) {
    const { kind } = at(board, k);
    if (kind && !hit.has(k)) count.set(kind, (count.get(kind) ?? 0) + 1);
  }
  return [...count].sort((a, b) => b[1] - a[1])[0]?.[0];
}

// Spreads a clear through every special it touches. `wave` is how far the blast travelled, so the view can stagger pops.
function blast(board, groups, seeds) {
  const hit = new Map(), stack = [], fired = [];
  const touch = (k, wave) => {
    if (hit.has(k)) return;
    hit.set(k, wave);
    if (at(board, k).special) stack.push(k);
  };
  for (const g of groups) for (const k of g.cells) touch(k, 0);
  for (const k of seeds.keys()) touch(k, 0);
  while (stack.length) {
    const k = stack.pop(), p = at(board, k), wave = hit.get(k), { r, c } = cellOf(k);
    if (p.special === CARRETILLA) {
      fired.push({ r, c, special: CARRETILLA, dir: p.dir });
      if (p.dir === 'row') board[r].forEach((_, i) => touch(key(r, i), wave + Math.abs(i - c)));
      else board.forEach((_, i) => touch(key(i, c), wave + Math.abs(i - r)));
    } else {
      const target = seeds.get(k) ?? mostCommonKind(board, hit);
      const targets = [];
      for (const t of allKeys(board)) {
        if (t === k || !(target === ALL || at(board, t).kind === target)) continue;
        targets.push(cellOf(t));
        touch(t, wave + 1 + targets.length % 6);
      }
      fired.push({ r, c, special: TRONADA, targets });
    }
  }
  return { hit, fired };
}

function clearStep(g, step, groups, seeds, hot) {
  const { board } = g;
  const { hit, fired } = blast(board, groups, seeds);
  const spawns = new Map(), into = new Map();
  for (const group of groups) {
    const prize = reward(group, hot);
    if (!prize) continue;
    spawns.set(prize.at, prize);
    for (const k of group.cells) if (k !== prize.at) into.set(k, cellOf(prize.at));
  }
  const cells = [];
  for (const [k, wave] of hit) {
    const p = at(board, k), { r, c } = cellOf(k);
    cells.push({ id: p.id, r, c, kind: p.kind, wave, into: into.get(k) });
    if (p.kind === g.level.goal) g.collected++;
    board[r][c] = null;
  }
  const spawned = [];
  for (const [k, prize] of spawns) {
    const { r, c } = cellOf(k), p = piece(g, prize.kind, prize.special, prize.special === CARRETILLA ? prize.dir : undefined);
    board[r][c] = p;
    spawned.push({ r, c, piece: p });
  }
  return { t: 'clear', step, cells, fired, spawned, collected: g.collected };
}

// With assist, a new piece sometimes copies a neighbour, so matches and cascades come more often: the lever
// EA and Ascarza measured in match-3s. It only ever helps and nothing on screen changes.
function fallingKind(g, r, c) {
  if (g.assist && g.rng() < g.assist) {
    const near = g.board[r + 1]?.[c] ?? g.board[r]?.[c - 1];
    if (near) return near.kind;
  }
  return randomKind(g);
}

function gravity(g) {
  const shifts = [], drops = [];
  for (let c = 0; c < g.cols; c++) {
    let to = g.rows - 1;
    for (let r = g.rows - 1; r >= 0; r--) {
      const p = g.board[r][c];
      if (!p) continue;
      if (r !== to) { g.board[to][c] = p; g.board[r][c] = null; shifts.push({ id: p.id, c, from: r, to }); }
      to--;
    }
    // new pieces queue above the board, so they arrive one after another rather than as a block
    for (let r = to, above = 1; r >= 0; r--, above++) {
      const p = piece(g, fallingKind(g, r, c));
      g.board[r][c] = p;
      drops.push({ piece: p, c, from: -above, to: r });
    }
  }
  return { t: 'fall', shifts, drops };
}

// Keeps the same pieces and only recolours if plain shuffling keeps failing, so a shuffle always ends.
function reshuffle(g) {
  const pieces = g.board.flat(), place = i => ({ r: Math.floor(i / g.cols), c: i % g.cols });
  for (let tries = 0; ; tries++) {
    for (let i = pieces.length - 1; i > 0; i--) {
      const j = Math.floor(g.rng() * (i + 1));
      [pieces[i], pieces[j]] = [pieces[j], pieces[i]];
    }
    if (tries > 200) for (const p of pieces) if (!p.special) p.kind = randomKind(g);
    pieces.forEach((p, i) => { const { r, c } = place(i); g.board[r][c] = p; });
    if (!findGroups(g.board).length && findMoves(g.board).length) break;
  }
  return { t: 'shuffle', pieces: pieces.map((p, i) => ({ id: p.id, kind: p.kind, ...place(i) })) };
}

// What a swap sets off by itself: a map from the special's cell to what it aims at (undefined: a carretilla, it just fires).
function swapSeeds(board, a, b) {
  const pa = board[a.r][a.c], pb = board[b.r][b.c], seeds = new Map();
  const isT = p => p.special === TRONADA;
  if (isT(pa) && isT(pb)) { seeds.set(key(a.r, a.c), ALL); seeds.set(key(b.r, b.c), ALL); return seeds; }
  if (isT(pa)) { seeds.set(key(a.r, a.c), pb.kind); return seeds; }
  if (isT(pb)) { seeds.set(key(b.r, b.c), pa.kind); return seeds; }
  if (pa.special) seeds.set(key(a.r, a.c), undefined);
  if (pb.special) seeds.set(key(b.r, b.c), undefined);
  return seeds;
}

// Help grows gently with the times this level has been lost, up to a cap, and goes away when it is won.
export const assistFor = losses => Math.min(.3, .1 * Math.log1p(losses));
const BOARDS_AFTER = 2, GIFT_AFTER = 3, MAX_BOARDS = 5;
export const helpFor = losses => ({
  assist: assistFor(losses),
  boards: losses >= BOARDS_AFTER ? Math.min(MAX_BOARDS, losses + 1) : 1,
  gift: losses >= GIFT_AFTER, // the one help the player sees: they should know the game is on their side
});

// One phrase at the end of a chain, stronger the longer it was, as Candy Crush does (notes/estudi-joc-referents.md).
export const praiseTier = steps => (steps < 3 ? 0 : steps <= 4 ? 2 : steps <= 6 ? 3 : 4);

// Plays one player swap to the end. An invalid swap costs nothing and only yields 'swap' + 'back'.
export function swap(g, a, b) {
  if (g.status !== 'playing' || !adjacent(a, b)) return [];
  const ids = { aId: g.board[a.r][a.c].id, bId: g.board[b.r][b.c].id };
  swapCells(g.board, a, b);
  const seeds = swapSeeds(g.board, a, b);
  let groups = findGroups(g.board);
  const first = { t: 'swap', a, b, ...ids, moves: g.moves };
  if (!seeds.size && !groups.length) {
    swapCells(g.board, a, b);
    return [first, { t: 'back', a, b, ...ids }];
  }
  first.moves = --g.moves;
  const events = [first], hot = [key(a.r, a.c), key(b.r, b.c)];
  let steps = 0;
  for (let active = seeds; active.size || groups.length; active = new Map()) {
    steps++;
    events.push(clearStep(g, steps, groups, active, steps === 1 ? hot : []));
    events.push(gravity(g));
    groups = findGroups(g.board);
  }
  const tier = praiseTier(steps);
  if (tier) events.push({ t: 'praise', tier });
  if (g.collected >= g.level.n) g.status = 'won';
  else if (g.moves <= 0) g.status = 'lost';
  else if (!findMoves(g.board).length) events.push(reshuffle(g));
  return events;
}

export const starsFor = g => 1 + g.level.stars.filter(left => g.moves >= left).length;
