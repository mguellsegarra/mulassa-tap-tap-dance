// The game's rules, no drawing: Ringo Tap's Game.cs, Bomb.cs and Level.cs ported to a tick, plus the goodies.
// The Mulassa is the red apple (tap it before its fuse ends), the Drac the green one (never tap it).
export const FUSE = 5, SPECIAL_LIFE = 2.5, SLOW_TIME = 5, NO_MUSIC_GAP = 2.5;
export const GOODIES = ['calcot', 'campanar', 'carretilla'];
export const TRAPS = ['petard', 'mulaFalsa', 'dracFals'];
// Progressive: nothing but Mulassas at first, then each thing once it makes sense. mulas: how many must be out for it to be worth anything.
const UNLOCK = { calcot: { score: 10 }, campanar: { score: 30 }, carretilla: { score: 20, mulas: 3 }, petard: { score: 15 }, dracFals: { score: 25 }, mulaFalsa: { score: 35 } };

// Level.cs, verbatim (its music pitch steps became sequencer.js's tempo curve)
export const swapEvery = s => s < 10 ? .75 : s < 25 ? .6 : s < 50 ? .5 : s < 100 ? .4 : s < 250 ? .3 : .2;

export function newGame({ cols = 4, rows = 6, rng = Math.random, on = () => {} } = {}) {
  const cells = Array.from({ length: cols * rows }, (_, i) => ({ i, kind: 'drac', prev: 'drac', age: 9, left: 0 }));
  return { cols, rows, rng, on, cells, recent: [], score: 0, state: 'play', slow: 0, nextSwap: 1, since: 0, culprit: -1 };
}

function setKind(c, kind, left = 0) {
  c.prev = c.kind;
  c.kind = kind;
  c.age = 0;
  c.left = left;
}

function miss(g, c) {
  g.state = 'over';
  g.culprit = c.i;
  g.on('over', c);
}

function spawn(g) {
  const idle = () => g.cells.filter(c => c.kind === 'drac' && c.age >= 0); // age < 0: a Mulassa still burning there (board.js)
  const any = list => list[Math.floor(g.rng() * list.length)];
  if (!idle().length) return;
  // never the last three cells again, unless nothing else is left
  const fresh = idle().filter(c => !g.recent.includes(c.i));
  setKind(any(fresh.length ? fresh : idle()), 'mula', FUSE);
  g.on('spawn');
  const int = (a, b) => a + Math.floor(g.rng() * (b - a));
  const absent = list => !g.cells.some(c => list.includes(c.kind));
  const mulas = g.cells.filter(c => c.kind === 'mula').length;
  const open = list => list.filter(k => g.score >= UNLOCK[k].score && mulas >= (UNLOCK[k].mulas ?? 0));
  // a slot each: at high scores a trap is almost always out, and it must not keep the goodies away
  if (idle().length && absent(GOODIES) && open(GOODIES).length && g.rng() < .07) setKind(any(idle()), any(open(GOODIES)), SPECIAL_LIFE);
  // Level.mustAppearFakeBomb's formula with a lower bar: Ringo Tap's first trap needed 35 points, too late for a first try
  if (idle().length && absent(TRAPS) && open(TRAPS).length && g.score * int(1, 8) > int(60, 200)) setKind(any(idle()), any(open(TRAPS)), SPECIAL_LIFE);
}

export function tick(g, dt) {
  for (const c of g.cells) c.age += dt;
  if (g.state !== 'play') return;
  g.slow = Math.max(0, g.slow - dt);
  const d = g.slow > 0 ? dt / 2 : dt; // the bell slows the fuses and the spawns, not the player
  for (const c of g.cells) {
    if (c.kind === 'drac') continue;
    c.left -= d;
    if (c.left > 0) continue;
    if (c.kind === 'mula') { miss(g, c); if (g.state !== 'play') return; }
    else setKind(c, 'drac');
  }
  g.since += d;
  g.nextSwap -= d;
  if (g.nextSwap <= 0) spawned(g); // no note for too long: a phone refused the audio, and the game must go on without it
}

function spawned(g) {
  spawn(g);
  g.since = 0;
  g.nextSwap = NO_MUSIC_GAP;
}

// A note of the tune is sounding: the Mulassas appear on them. Level.cs's pace is the shortest gap between two, so fast
// passages skip notes rather than flood the board.
export function noteSounded(g) {
  if (g.state === 'play' && g.since >= swapEvery(g.score) * .9) spawned(g);
}

export function tap(g, i) {
  if (g.state !== 'play') return;
  const c = g.cells[i], kind = c.kind;
  if (kind === 'mula') {
    setKind(c, 'drac');
    g.recent = [...g.recent, i].slice(-3);
    g.score += 1;
    g.on('hit', c);
  } else if (GOODIES.includes(kind)) {
    setKind(c, 'drac');
    if (kind === 'calcot') g.score += 5;
    if (kind === 'campanar') g.slow = SLOW_TIME;
    if (kind === 'carretilla') for (const m of g.cells) if (m.kind === 'mula') {
      setKind(m, 'drac');
      g.score += 1;
      g.on('burn', m);
    }
    if (kind === 'carretilla') { g.since = -1.2 + swapEvery(g.score); g.nextSwap = 1.2; } // a breath while the Dracs burn them
    g.on('goodie', c, kind);
  } else miss(g, c);
}
