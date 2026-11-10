// The game's rules, no drawing: Ringo Tap's Game.cs, Bomb.cs and Level.cs ported to a tick, plus the goodies.
// The Mulassa is the red apple (tap it before its fuse ends), the Drac the green one (never tap it).
export const SPECIAL_LIFE = 2.5, SLOW_TIME = 5;
// Seconds a Mulassa stays lit before she escapes, per level (Fàcil, Normal, Difícil), at the start: it shortens as the progression
// grows, down to FUSE_MIN, so a good player meets her end within minutes. game.fuse is the next one's; each cell keeps its own (c.life).
export const FUSES = [5, 4, 3], FUSE_MIN = 1.6, FUSE_SHRINK = 150; // progression at which the fuse is halved
export const FUSE = FUSES[0]; // Fàcil's at the start: the UI should use the cell's life
// The petard is lit: tap it before its fuse burns down to put it out (no points: it only saves the board), or it blows up and the game is over.
export const BOMB_FUSES = [4, 3.2, 2.4];
export const BOMB_FUSE = BOMB_FUSES[0]; // Fàcil's: the UI should use game.bombFuse
export const fuseOf = (level, progress = 0) => Math.max(FUSE_MIN, (FUSES[level] ?? FUSES[0]) * FUSE_SHRINK / (FUSE_SHRINK + progress)), bombFuseOf = level => BOMB_FUSES[level] ?? BOMB_FUSES[0];
export const BURN = .9; // a Mulassa the carretilla's Dracs burn stays on her cell that long, and nothing new comes there
export const GOODIES = ['calcot', 'campanar', 'carretilla'];
export const TRAPS = ['petard', 'mulaFalsa', 'dracFals']; // one at a time; the petard is the one you must tap
// Progressive: nothing but Mulassas at first, then each thing once it makes sense. mulas: how many must be out for it to be worth anything.
// The thresholds are on the progression (g.progress), not on the points the player sees.
const UNLOCK = { calcot: { score: 10 }, campanar: { score: 30 }, carretilla: { score: 20, mulas: 3 }, petard: { score: 15 }, dracFals: { score: 25 }, mulaFalsa: { score: 35 } };
export const LEVELS = 3; // 0 Fàcil, 1 Normal, 2 Difícil: tempo base (conductor.js), where the pace starts and the points' multiplier
// The combo is fingers at once: good taps (a Mulassa, a petard put out, a goodie) within CHORD s of a chord's first one
// each score its size (two fingers ×2, three ×3, up to COMBO_MAX), so the player lets them build up and takes them together,
// with the fuse as the risk. A lone petard or goodie pays only its own, as ever.
export const CHORD = .12, COMBO_MAX = 5;
export const MULT = [1, 2, 3]; // the points' multiplier per level, whole numbers anyone reads at a glance (the owner's choice, 9 Nov 2026)
export const GRACE = .15; // a tap this soon after a cell turned Drac is the finger's lag, not a mistake (a goodie or fake that just ran out)
export const FLURRY = [3, 5], FLURRY_WAIT = 2; // the carretilla's volley: as many Mulassas as it burnt, within these; half-beat steps before it
export const BELL_REST = 20; // seconds after the bell's slow time ends before another bell may come

// Where the Mulassas come, in blocks of BLOCK spawns: at random, or along a pattern the player can read (one at a time, on the
// beat as ever: the pattern only picks the cell). Random only before PATTERN_FROM; then a pattern a block in three, one in two
// from PATTERN_HALF, never the same one twice running. A cell of it that is taken ends the pattern: the rest of the block is random.
export const PATTERNS = ['walk', 'mirror', 'zigzag', 'corners'], BLOCK = 4, PATTERN_FROM = 10, PATTERN_HALF = 25;
// a pattern's cells (indices), from the run's dice: g.rng only, so the server's replay draws the same
export function patternPath(kind, cols, rows, rng) {
  const at = (x, y) => y * cols + x, int = n => Math.floor(rng() * n), half = Math.floor(cols / 2);
  if (kind === 'walk') { // 4 steps to a side neighbour, never back on itself
    let x = int(cols), y = int(rows);
    const path = [at(x, y)];
    while (path.length < BLOCK) {
      const next = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => [x + dx, y + dy])
        .filter(([nx, ny]) => nx >= 0 && ny >= 0 && nx < cols && ny < rows && !path.includes(at(nx, ny)));
      if (!next.length) break;
      [x, y] = next[int(next.length)];
      path.push(at(x, y));
    }
    return path;
  }
  if (kind === 'mirror') { // a pair face to face on a row, then on another: two fingers at once
    const a = int(rows), b = (a + 1 + int(rows - 1)) % rows, x1 = int(half), x2 = int(half);
    return [at(x1, a), at(cols - 1 - x1, a), at(x2, b), at(cols - 1 - x2, b)];
  }
  if (kind === 'zigzag') { // side to side, a row on each time
    const dy = rng() < .5 ? 1 : -1, y0 = dy > 0 ? int(rows - BLOCK + 1) : BLOCK - 1 + int(rows - BLOCK + 1), left = rng() < .5;
    return Array.from({ length: BLOCK }, (_, k) => at((k % 2 === 0) === left ? int(half) : cols - 1 - int(half), y0 + k * dy));
  }
  const corners = [at(0, 0), at(cols - 1, 0), at(cols - 1, rows - 1), at(0, rows - 1)], from = int(4), way = rng() < .5 ? 1 : 3; // round, either way
  return corners.map((_, k) => corners[(from + k * way) % 4]);
}

// A Mulassa every spawnBeats(progress, level) beats of the tune's CURRENT tempo, on its half-beat steps (beat() below): 2 beats
// at the start, then 1.5 and 1 (never faster) as the progression grows. Normal and Difícil start at 1.5. Integers and exact halves only.
export const spawnBeats = (progress, level = 0) => {
  const n = progress < 10 ? 2 : progress < 25 ? 1.5 : 1;
  return level > 0 && n > 1.5 ? 1.5 : n;
};

// A run's dice: mulberry32 from a 32-bit seed, so the server's replay throws the same ones (run.js).
export function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// progress: what drives the tempo, the pace and the unlocks (Mulassas +1, calçot +5, burns +1). points: what the player sees and
// the board ranks (combo × multiplier per Mulassa). hits: Mulassas tapped. pulse: half-beat steps since the last Mulassa.
export function newGame({ cols = 4, rows = 6, level = 0, rng = Math.random, on = () => {} } = {}) {
  const cells = Array.from({ length: cols * rows }, (_, i) => ({ i, kind: 'drac', prev: 'drac', age: 9, left: 0 }));
  return { cols, rows, level, fuse: fuseOf(level), bombFuse: bombFuseOf(level), rng, on, cells, recent: [], pattern: null, lastPattern: '', blockLeft: 0, progress: 0, points: 0, hits: 0, combo: 0, chordAt: -1, chordPaid: 0, clock: 0, bellAt: -BELL_REST, state: 'play', slow: 0, pulse: 0, flurry: 0, flurryWait: 0, culprit: -1 };
}

function setKind(c, kind, left = 0) {
  c.prev = c.kind;
  c.kind = kind;
  c.age = 0;
  c.left = c.life = left;
}

// the run's cap (run.js): it ends on its own, no culprit
export function timeUp(g) {
  if (g.state !== 'play') return;
  g.state = 'over';
  g.on('over', null);
}

function miss(g, c) {
  g.state = 'over';
  g.culprit = c.i;
  g.on('over', c);
}

// the next cell of the block's pattern, or null for a random one
function patternCell(g) {
  if (g.blockLeft <= 0) {
    g.blockLeft = BLOCK;
    g.pattern = null;
    const share = g.progress < PATTERN_FROM ? 0 : g.progress < PATTERN_HALF ? 1 / 3 : 1 / 2;
    if (g.rng() < share) {
      const kinds = PATTERNS.filter(k => k !== g.lastPattern), kind = kinds[Math.floor(g.rng() * kinds.length)];
      g.pattern = patternPath(kind, g.cols, g.rows, g.rng);
      g.lastPattern = kind;
    }
  }
  g.blockLeft -= 1;
  if (!g.pattern) return null;
  const c = g.cells[g.pattern.shift()];
  if (!g.pattern.length) g.pattern = null;
  if (c && c.kind === 'drac' && c.age >= 0) return c;
  g.pattern = null; // taken (a trap, a goodie, a Mulassa still out): the pattern ends here
  return null;
}

// plain: the carretilla's volley, Mulassas only, at random (no pattern, no goodie, no trap)
function spawn(g, plain = false) {
  const idle = () => g.cells.filter(c => c.kind === 'drac' && c.age >= 0); // age < 0: a Mulassa still burning there (board.js)
  const any = list => list[Math.floor(g.rng() * list.length)];
  if (!idle().length) return;
  // never the last three cells again, unless nothing else is left
  const fresh = idle().filter(c => !g.recent.includes(c.i));
  g.fuse = fuseOf(g.level, g.progress);
  setKind((!plain && patternCell(g)) || any(fresh.length ? fresh : idle()), 'mula', g.fuse);
  g.on('spawn');
  if (plain) return;
  const int = (a, b) => a + Math.floor(g.rng() * (b - a));
  const absent = list => !g.cells.some(c => list.includes(c.kind));
  const mulas = g.cells.filter(c => c.kind === 'mula').length;
  const open = list => list.filter(k => g.progress >= UNLOCK[k].score && mulas >= (UNLOCK[k].mulas ?? 0) && (k !== 'campanar' || g.clock - g.bellAt >= BELL_REST));
  // a slot each: at high scores a trap is almost always out, and it must not keep the goodies away
  if (idle().length && absent(GOODIES) && open(GOODIES).length && g.rng() < .07) setKind(any(idle()), any(open(GOODIES)), SPECIAL_LIFE);
  // Level.mustAppearFakeBomb's formula with a lower bar: Ringo Tap's first trap needed 35 points, too late for a first try
  if (idle().length && absent(TRAPS) && open(TRAPS).length && g.progress * int(1, 8) > int(60, 200)) { const k = any(open(TRAPS)); setKind(any(idle()), k, k === 'petard' ? g.bombFuse : SPECIAL_LIFE); }
}

export function tick(g, dt) {
  for (const c of g.cells) c.age += dt;
  if (g.state !== 'play') return;
  g.clock += dt;
  g.slow = Math.max(0, g.slow - dt);
  const d = g.slow > 0 ? dt / 2 : dt; // the bell slows the fuses and the spawns, not the player
  for (const c of g.cells) {
    if (c.kind === 'drac') continue;
    c.left -= d;
    if (c.left > 0) continue;
    if (c.kind === 'mula' || c.kind === 'petard') { miss(g, c); if (g.state !== 'play') return; }
    else setKind(c, 'drac');
  }
}

// One half-beat step of the tune reached the game (run.js): every spawnBeats-th one brings a Mulassa. After a carretilla, its
// volley instead: FLURRY_WAIT steps for the fire to show, then a Mulassa on each step, then the usual count from 1.
export function beat(g) {
  if (g.state !== 'play') return;
  if (g.flurry > 0) {
    if (g.flurryWait > 0) { g.flurryWait -= 1; return; }
    spawn(g, true);
    if (--g.flurry === 0) g.pulse = 1;
    return;
  }
  if (g.pulse < spawnBeats(g.progress, g.level) * 2) { g.pulse += 1; return; }
  g.pulse = 1;
  spawn(g);
}

// A good tap joins this chord (or starts one): the chord's whole worth is k × min(k, COMBO_MAX), paid as it grows, so the
// one that joins raises the ones before to its size too. A lone Mulassa pays 1; a lone petard or goodie, nothing more.
function join(g, mula, mult) {
  if (g.clock - g.chordAt > CHORD) { g.combo = 0; g.chordPaid = 0; g.chordAt = g.clock; } // a new chord
  g.combo += 1;
  if (g.combo < 2 && !mula) return 0;
  const k = g.combo, worth = Math.round(k * Math.min(k, COMBO_MAX) * mult), gained = worth - g.chordPaid;
  g.chordPaid = worth;
  g.points += gained;
  return gained;
}

export function tap(g, i) {
  if (g.state !== 'play') return;
  const c = g.cells[i], kind = c.kind, mult = MULT[g.level];
  const pay = n => { const p = Math.round(n * mult); g.points += p; return p; };
  if (kind === 'mula') {
    setKind(c, 'drac');
    g.recent = [...g.recent, i].slice(-3);
    g.progress += 1;
    g.hits += 1;
    const gained = join(g, true, mult);
    g.on('hit', c, { combo: g.combo, gained });
    g.on('chord', c, { combo: g.combo, gained });
  } else if (kind === 'petard') {
    setKind(c, 'drac');
    const gained = join(g, false, mult);
    g.on('defuse', c);
    g.on('chord', c, { combo: g.combo, gained });
  } else if (GOODIES.includes(kind)) {
    setKind(c, 'drac');
    let gained = 0;
    if (kind === 'calcot') { g.progress += 5; gained = pay(5); }
    if (kind === 'campanar') { g.slow = SLOW_TIME; g.bellAt = g.clock + SLOW_TIME; } // BELL_REST counts from the end of its slow time
    if (kind === 'carretilla') {
      let burnt = 0;
      for (const m of g.cells) if (m.kind === 'mula') {
        setKind(m, 'drac');
        m.age = -BURN; // idle() leaves the cell alone until it reaches 0
        g.progress += 1;
        burnt += 1;
        g.on('burn', m, { gained: pay(1) });
      }
      // no empty board after the fire: a volley as big as the burn (FLURRY), a beat on, a chord to take
      g.flurry = Math.min(FLURRY[1], Math.max(FLURRY[0], burnt));
      g.flurryWait = FLURRY_WAIT;
    }
    g.on('goodie', c, kind, { gained });
    const joined = join(g, false, mult);
    g.on('chord', c, { combo: g.combo, gained: joined });
  } else if (!(kind === 'drac' && c.prev !== 'drac' && c.age < GRACE)) miss(g, c);
}
