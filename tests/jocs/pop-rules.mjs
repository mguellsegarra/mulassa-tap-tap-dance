import test from 'node:test';
import assert from 'node:assert/strict';
import { newGame, tick, tap, beat, FUSE, FUSES, BOMB_FUSES, spawnBeats, COMBO_MAX, CHORD, MULT, GRACE, BELL_REST, FUSE_MIN, FUSE_SHRINK, fuseOf, FLURRY_WAIT, PATTERNS, BLOCK, patternPath, GOODIES, TRAPS, BOMB_FUSE, BURN } from '../../src/jocs/games/pop/rules.js';
import { createRun, TICKS_PER_S, MAX_RUN_S, MAX_RUN_TAPS } from '../../src/jocs/games/pop/run.js';
import { MAX_TICKS, MAX_TAPS } from '../../supabase/functions/pop-score/verify.js';
import { LEAD } from '../../src/jocs/games/pop/conductor.js';

const seeded = s => () => (s = (s * 16807) % 2147483647) / 2147483647;
const game = (o = {}) => newGame({ rng: seeded(7), ...o });
const first = (g, kind) => g.cells.find(c => c.kind === kind);
const spawnNow = g => { g.pulse = 99; beat(g); }; // the next half-beat step brings a Mulassa

test('a Mulassa appears, and tapping it scores and turns it back into a Drac', () => {
  const g = game();
  spawnNow(g);
  const m = first(g, 'mula');
  assert.ok(m);
  tap(g, m.i);
  assert.deepEqual([g.progress, g.points, g.hits], [1, 1, 1]);
  assert.equal(m.kind, 'drac');
  assert.equal(g.state, 'play');
});

test('tapping a Drac ends the game', () => {
  const g = game();
  tap(g, 0);
  assert.equal(g.state, 'over');
  assert.equal(g.culprit, 0);
});

test('a Mulassa left alone for its fuse ends the game, not before', () => {
  const g = game();
  spawnNow(g);
  const m = first(g, 'mula');
  for (let t = 0; t < FUSE - .1; t += .05) tick(g, .05);
  assert.equal(g.state, 'play');
  assert.ok(m.left > 0);
  for (let t = 0; t < .2; t += .05) tick(g, .05);
  assert.equal(g.state, 'over');
  assert.equal(g.culprit, m.i);
});

test('a trap ends the game when tapped, and one left alone goes away', () => {
  for (const kind of TRAPS.filter(k => k !== 'petard')) {
    let g = game();
    g.cells[3].kind = kind;
    g.cells[3].left = 1;
    tap(g, 3);
    assert.equal(g.state, 'over', kind);
    g = game();
    g.cells[3].kind = kind;
    g.cells[3].left = .1;
    tick(g, .2);
    assert.equal(g.cells[3].kind, 'drac', kind);
    assert.equal(g.state, 'play', kind);
  }
});

test('the petard is lit: tapping it puts it out (no points, it only saves the board), letting its fuse burn out ends the game', () => {
  let g = game(), events = [];
  g.on = e => events.push(e);
  Object.assign(g.cells[3], { kind: 'petard', left: BOMB_FUSE });
  tap(g, 3);
  assert.deepEqual([g.progress, g.points, g.hits], [0, 0, 0]);
  assert.equal(g.cells[3].kind, 'drac');
  assert.deepEqual(events, ['defuse']);
  g = game();
  Object.assign(g.cells[3], { kind: 'petard', left: .1 });
  tick(g, .2);
  assert.equal(g.state, 'over');
  assert.equal(g.culprit, 3);
});

test('the carretilla\'s Mulasses burn on their cells for BURN, in the rules: nothing spawns there meanwhile', () => {
  const g = game();
  Object.assign(g.cells[0], { kind: 'carretilla', left: 2 });
  Object.assign(g.cells[1], { kind: 'mula', left: 3 });
  tap(g, 0);
  assert.equal(g.cells[1].age, -BURN);
});

test('goodies: calçot +5, bell slows the clock, rocket clears', () => {
  const put = (g, i, kind) => { g.cells[i].kind = kind; g.cells[i].left = 2; };
  let g = game();
  put(g, 0, 'calcot');
  tap(g, 0);
  assert.deepEqual([g.progress, g.points, g.hits, g.combo], [5, 5, 0, 0], 'the calçot is not a hit and has no combo');

  g = game();
  put(g, 0, 'campanar');
  put(g, 1, 'mula');
  tap(g, 0);
  const before = g.cells[1].left;
  tick(g, .4);
  assert.ok(Math.abs(before - g.cells[1].left - .2) < 1e-9);

  g = game();
  put(g, 0, 'carretilla');
  put(g, 1, 'mula');
  put(g, 2, 'mula');
  tap(g, 0);
  assert.deepEqual([g.progress, g.points, g.hits], [2, 2, 0], 'burns count for the progression and the points, not as hits');
  assert.equal(g.cells.filter(c => c.kind === 'mula').length, 0);
});

test('nothing changes once the game is over', () => {
  const g = game();
  tap(g, 0);
  const m = g.cells[1];
  m.kind = 'mula';
  tap(g, 1);
  assert.deepEqual([g.progress, g.points, g.hits], [0, 0, 0]);
});

test('a long autoplayed game stays consistent: the pace rises, one trap and one goodie at most, goodies and traps do appear', () => {
  const run = createRun({ cols: 4, rows: 6, seed: 7 }), g = run.game, seen = new Set();
  while (run.ticks < 400 * TICKS_PER_S && g.state === 'play') {
    run.until(run.ticks + 2);
    const specials = g.cells.filter(c => c.kind !== 'drac' && c.kind !== 'mula');
    assert.ok(specials.filter(c => GOODIES.includes(c.kind)).length <= 1);
    assert.ok(specials.filter(c => TRAPS.includes(c.kind)).length <= 1);
    specials.forEach(c => seen.add(c.kind));
    for (const c of g.cells) if ((c.kind === 'mula' || c.kind === 'petard') && c.age > 1) run.tap(c.i); // slow enough that a few are out at once
  }
  assert.equal(g.state, 'play');
  assert.ok(g.progress > 250, `progress ${g.progress}`);
  assert.equal(spawnBeats(g.progress), 1, 'the pace has quickened to its fastest: one a beat');
  assert.ok(g.points >= g.hits, 'every Mulassa scores at least 1');
  assert.ok([...GOODIES, ...TRAPS].every(k => seen.has(k)), [...seen].join());
});

test('a full board does not break spawning', () => {
  const g = game({ cols: 1, rows: 2 });
  for (let k = 0; k < 4; k++) spawnNow(g);
  for (let t = 0; t < 3 && g.state === 'play'; t += .1) tick(g, .1);
  assert.equal(g.state, 'play');
  assert.equal(g.cells.filter(c => c.kind === 'drac').length, 0);
});

test('a cell where a Mulassa is still burning gets nothing new until she is gone', () => {
  const g = game({ cols: 2, rows: 1 });
  g.cells[0].age = -5;
  spawnNow(g);
  assert.equal(g.cells[0].kind, 'drac');
  assert.equal(g.cells[1].kind, 'mula');
});

test('phones want portrait, tablets landscape, a mouse anything', async () => {
  const { wrongOrient } = await import('#plassa/orientation.js');
  const phone = { coarse: true, shortSide: 375 }, tablet = { coarse: true, shortSide: 768 }, mouse = { coarse: false, shortSide: 800 };
  assert.equal(wrongOrient({ ...phone, w: 375, h: 667 }), false);
  assert.equal(wrongOrient({ ...phone, w: 667, h: 375 }), true);
  assert.equal(wrongOrient({ ...tablet, w: 1024, h: 768 }), false);
  assert.equal(wrongOrient({ ...tablet, w: 768, h: 1024 }), true);
  assert.equal(wrongOrient({ ...mouse, w: 400, h: 900 }), false);
});

test('a Mulassa every N beats: 2 at the start, then 1.5 and 1, never faster; Normal and Difícil start at 1.5', () => {
  assert.deepEqual([0, 9, 10, 24, 25, 69, 70, 5000].map(p => spawnBeats(p)), [2, 2, 1.5, 1.5, 1, 1, 1, 1]);
  assert.deepEqual([0, 9, 10, 24, 25, 70].map(p => spawnBeats(p, 1)), [1.5, 1.5, 1.5, 1.5, 1, 1]);
  assert.deepEqual([0, 25, 70].map(p => spawnBeats(p, 2)), [1.5, 1, 1]);
  for (const [progress, level, beats] of [[0, 0, 2], [10, 0, 1.5], [30, 0, 1], [80, 0, 1], [0, 1, 1.5], [0, 2, 1.5], [30, 2, 1]]) {
    const g = game({ cols: 8, rows: 8, level }), at = [];
    g.progress = progress;
    g.on = e => { if (e === 'spawn') at.push(calls); };
    let calls = 0;
    for (; calls < 24;) { calls++; beat(g); }
    assert.equal(at[0], beats * 2 + 1, `${progress}/${level}: the first one after ${beats * 2} half-beat steps`);
    at.slice(1).forEach((c, k) => assert.equal(c - at[k], beats * 2, `${progress}/${level}: every ${beats} beats`));
  }
});

test('the run spawns on the conductor\'s half-beat steps, a LEAD early, at the tempo of the moment, at every level', () => {
  for (const [level, bpm, beats] of [[0, 150, 2], [1, 165, 1.5], [2, 180, 1.5]]) {
    const times = [], run = createRun({ cols: 6, rows: 4, seed: 3, level, on: e => { if (e === 'spawn') times.push(run.time); } });
    run.until(4 * TICKS_PER_S); // nobody taps: the progression stays 0, so the tempo and the pace stay at their start
    const steps = run.tune.take().map(s => s.t);
    assert.ok(times.length >= 4, `level ${level}: ${times.length} spawns`);
    times.forEach((t, k) => {
      assert.ok(steps.some(st => t >= st - LEAD - 1e-9 && t <= st - LEAD + 1 / TICKS_PER_S + 1e-9), `level ${level}: spawn ${k} at ${t} is on a step`);
      assert.ok(Math.abs(t + LEAD - (k + 1) * beats * 60 / bpm) < 1 / TICKS_PER_S + 1e-9, `level ${level}: spawn ${k} at ${t}, every ${beats} beats of ${bpm}`);
    });
  }
});

test('the carretilla\'s volley: FLURRY_WAIT steps, then as many Mulassas as it burnt (3 to 5), one a step, nothing else; then the usual count', () => {
  for (const [burn, volley] of [[1, 3], [4, 4], [8, 5]]) {
    const g = game({ cols: 8, rows: 8 }), mulas = () => g.cells.filter(c => c.kind === 'mula').length;
    g.progress = 100; // a Mulassa a beat (two steps), traps and goodies open
    Object.assign(g.cells[0], { kind: 'carretilla', left: 2 });
    for (let i = 1; i <= burn; i++) Object.assign(g.cells[i], { kind: 'mula', left: 2 });
    tap(g, 0);
    assert.equal(mulas(), 0, 'all burnt');
    for (let k = 0; k < FLURRY_WAIT; k++) beat(g);
    assert.equal(mulas(), 0, 'the fire shows first');
    for (let k = 1; k <= volley; k++) { beat(g); assert.equal(mulas(), k, `burn ${burn}: step ${k}`); }
    assert.ok(!g.cells.some(c => TRAPS.includes(c.kind) || (GOODIES.includes(c.kind) && c.i !== 0)), 'Mulassas only');
    beat(g);
    assert.equal(mulas(), volley, 'then the count from 1: a step more');
    beat(g);
    assert.equal(mulas(), volley + 1);
  }
});

test('chord: a Mulassa tapped within CHORD s of the chord\'s first one joins it, later starts a new one', () => {
  for (const [wait, combo] of [[CHORD - .01, 2], [CHORD + .01, 1]]) {
    const g = game();
    [0, 1].forEach(i => Object.assign(g.cells[i], { kind: 'mula', left: 50 }));
    tick(g, .5); tap(g, 0); tick(g, wait); tap(g, 1);
    assert.equal(g.combo, combo, `${wait} s`);
  }
});

test('fuses depend on the level: 5 / 4 / 3 s a Mulassa, 4 / 3.2 / 2.4 s the petard, exposed as game.fuse and game.bombFuse', () => {
  assert.deepEqual([FUSES, BOMB_FUSES], [[5, 4, 3], [4, 3.2, 2.4]]);
  [0, 1, 2].forEach(level => {
    const g = game({ level });
    assert.deepEqual([g.fuse, g.bombFuse], [FUSES[level], BOMB_FUSES[level]]);
    spawnNow(g);
    const m = first(g, 'mula');
    assert.equal(m.left, FUSES[level], 'left starts at the level\'s fuse');
    for (let t = 0; t < FUSES[level] - .1; t += .05) tick(g, .05);
    assert.equal(g.state, 'play');
    for (let t = 0; t < .2; t += .05) tick(g, .05);
    assert.equal(g.state, 'over', `level ${level}: she escapes after ${FUSES[level]} s`);
    const p = game({ level, rng: () => .5 });
    p.progress = 500;
    for (let n = 0; n < 200 && !p.cells.some(c => c.kind === 'petard'); n++) { spawnNow(p); p.cells.forEach(c => { if (c.kind === 'mula') c.kind = 'drac'; }); }
    const bomb = first(p, 'petard');
    if (bomb) assert.equal(bomb.left, BOMB_FUSES[level], 'the petard lights with the level\'s fuse');
  });
});

test('at high progression no two spawns are closer than one beat (two half-beat steps)', () => {
  for (const level of [0, 1, 2]) {
    const g = game({ cols: 8, rows: 8, level }), at = [];
    g.progress = 5000;
    g.on = e => { if (e === 'spawn') at.push(calls); };
    let calls = 0;
    for (; calls < 40;) { calls++; beat(g); }
    assert.ok(at.length >= 10);
    at.slice(1).forEach((c, k) => assert.ok(c - at[k] >= 2, `level ${level}: ${c - at[k]} steps`));
  }
});

test('combo: fingers at once, each Mulassa of a k-finger chord worth k × the level\'s multiplier, up to COMBO_MAX; one at a time is ×1', () => {
  const chord = (level, n) => {
    const g = game({ level }), gains = [];
    g.on = (e, c, x) => { if (e === 'hit') gains.push(x.gained); };
    for (let i = 0; i < n; i++) Object.assign(g.cells[i], { kind: 'mula', left: 50 });
    tick(g, .5);
    for (let i = 0; i < n; i++) tap(g, i);
    return [gains, g.points, g.combo];
  };
  assert.deepEqual(chord(0, 3), [[1, 3, 5], 9, 3], 'three fingers: 3 × 3');
  assert.deepEqual(chord(0, 6)[1], 6 * COMBO_MAX, 'six: each at ×5');
  assert.deepEqual(chord(1, 3), [[1, 4, 7], 12, 3]); // round(9 × 1.3)
  assert.deepEqual(chord(2, 3), [[2, 4, 8], 14, 3]); // round(9 × 1.6)
  const g = game();
  [0, 1].forEach(i => Object.assign(g.cells[i], { kind: 'mula', left: 50 }));
  tick(g, .5); tap(g, 0); tick(g, .3); tap(g, 1);
  assert.deepEqual([g.points, g.combo], [2, 1], 'a streak in time is no combo');
});

test('points: the level\'s multiplier (1, 1.3, 1.6, rounded) per Mulassa, a calçot 5 × it, a burn 1 × it; hits and the progression do not scale', () => {
  assert.deepEqual(MULT, [1, 1.3, 1.6]);
  const want = [[1, 5, 1], [1, 7, 1], [2, 8, 2]]; // a Mulassa alone, a calçot, a burn
  for (const level of [0, 1, 2]) {
    const [one, calcot, burn] = want[level], g = game({ level }), events = [];
    g.on = (...a) => events.push(a);
    ['mula', 'calcot', 'carretilla', 'mula', 'mula'].forEach((kind, i) => Object.assign(g.cells[i], { kind, left: 50 }));
    tap(g, 0);
    tap(g, 1); // calçot
    assert.equal(g.points, one + calcot);
    tap(g, 2); // carretilla burns the two Mulassas out
    assert.deepEqual([g.points, g.hits, g.progress], [one + calcot + 2 * burn, 1, 1 + 5 + 2]);
    assert.deepEqual(events.map(([e, , x, y]) => [e, ...(e === 'goodie' ? [x, y.gained] : [x.gained])]),
      [['hit', one], ['goodie', 'calcot', calcot], ['burn', burn], ['burn', burn], ['goodie', 'carretilla', 0]]);
  }
});

test('a run ends on its own at MAX_RUN_S or MAX_RUN_TAPS, under the server\'s limits, with no culprit', () => {
  assert.ok(MAX_RUN_S * TICKS_PER_S < MAX_TICKS && MAX_RUN_TAPS < MAX_TAPS);
  const ends = [], run = createRun({ cols: 4, rows: 6, seed: 1, level: 0, on: (e, c) => { if (e === 'over') ends.push(c); } });
  while (run.game.state === 'play') { run.until(run.ticks + 600); run.game.cells.forEach(c => { if (c.kind !== 'drac') c.left = 50; }); } // nothing escapes
  assert.deepEqual([run.ticks, ends], [MAX_RUN_S * TICKS_PER_S, [null]]);
  const taps = createRun({ cols: 4, rows: 6, seed: 1, level: 0 });
  for (let n = 0; n < MAX_RUN_TAPS; n++) { Object.assign(taps.game.cells[0], { kind: 'mula', left: 50 }); taps.tap(0); }
  assert.equal(taps.game.state, 'over');
});

test('the Mulassa\'s fuse shortens with the progression, down to FUSE_MIN; each keeps the one she was lit with', () => {
  [0, 1, 2].forEach(level => {
    assert.equal(fuseOf(level, 0), FUSES[level]);
    assert.equal(fuseOf(level, FUSE_SHRINK), Math.max(FUSE_MIN, FUSES[level] / 2));
    assert.equal(fuseOf(level, 1e6), FUSE_MIN);
  });
  const g = game();
  spawnNow(g);
  const early = first(g, 'mula');
  g.progress = FUSE_SHRINK;
  spawnNow(g);
  const late = g.cells.find(c => c.kind === 'mula' && c !== early);
  assert.deepEqual([early.life, late.life, g.fuse], [5, 2.5, 2.5]);
});

test('a tap within GRACE of a cell turning Drac is forgiven (a goodie or fake that just ran out, a double tap); later it ends the game', () => {
  for (const kind of ['calcot', 'mulaFalsa', 'mula']) {
    const g = game();
    Object.assign(g.cells[0], { kind, left: .01 });
    if (kind === 'mula') tap(g, 0); else tick(g, .02); // tapped, or ran out
    assert.equal(g.cells[0].kind, 'drac');
    tick(g, GRACE / 2); tap(g, 0);
    assert.equal(g.state, 'play', kind);
    tick(g, GRACE); tap(g, 0);
    assert.equal(g.state, 'over', kind);
  }
});

test('the bell rests BELL_REST s after its slow time before another may come', () => {
  const bells = clock => {
    const g = game({ rng: seeded(11) });
    g.progress = 40; g.bellAt = 0; g.clock = clock; // its slow time ended at 0
    let n = 0;
    for (let i = 0; i < 2000; i++) { spawnNow(g); if (g.cells.some(c => c.kind === 'campanar')) n++; g.cells.forEach(c => { c.kind = 'drac'; }); }
    return n;
  };
  assert.equal(bells(BELL_REST - .1), 0);
  assert.ok(bells(BELL_REST) > 0);
});

test('progressive: only Mulassas at first, each special at its own score, the fire only with several Mulassas out', () => {
  const seenAt = (score, keepOut) => {
    const g = game({ rng: seeded(score + 3) }), seen = new Set();
    g.progress = score;
    for (let i = 0; i < 4000; i++) {
      spawnNow(g);
      g.cells.forEach(c => { if (c.kind !== 'drac' && c.kind !== 'mula') seen.add(c.kind); });
      g.cells.forEach(c => { if (c.kind !== 'mula' || !keepOut) { c.kind = 'drac'; c.left = 0; } }); // clear for the next roll
      if (keepOut) g.cells.filter(c => c.kind === 'mula').slice(keepOut).forEach(c => { c.kind = 'drac'; });
    }
    return seen;
  };
  assert.deepEqual([...seenAt(9, 0)], []);
  assert.deepEqual([...seenAt(12, 0)], ['calcot']);
  assert.ok(seenAt(16, 0).has('petard'));
  assert.ok(!seenAt(16, 0).has('carretilla'));
  assert.ok(!seenAt(25, 0).has('carretilla'), 'one Mulassa out: no fire');
  assert.ok(seenAt(25, 3).has('carretilla'), 'several out: fire');
  assert.ok(!seenAt(29, 3).has('campanar'));
  assert.ok(seenAt(31, 0).has('campanar'));
  assert.ok(!seenAt(34, 0).has('mulaFalsa'));
  assert.ok(seenAt(36, 0).has('mulaFalsa'));
});

test('patterns: random before PATTERN_FROM, then blocks along a walk, mirrored pairs, a zigzag or the corners; a taken cell ends one', () => {
  const at = (g, from) => { const seen = []; g.on = (e) => { if (e === 'spawn') seen.push(g.cells.findIndex(c => c.kind === 'mula' && c.age === 0)); }; return seen; };
  const run = (progress, n, seed = 5) => {
    const g = game({ rng: seeded(seed) }), seen = at(g);
    g.progress = progress;
    for (let k = 0; k < n; k++) { spawnNow(g); g.cells.forEach(c => { c.kind = 'drac'; c.age = 9; }); }
    return { g, seen };
  };
  const neighbours = (a, b) => Math.abs((a % 4) - (b % 4)) + Math.abs(Math.floor(a / 4) - Math.floor(b / 4)) === 1;
  assert.equal(run(0, 400).g.lastPattern, '', 'none before PATTERN_FROM');
  const { seen } = run(100, 400);
  const blocks = Array.from({ length: 100 }, (_, b) => seen.slice(b * BLOCK, b * BLOCK + BLOCK));
  const walks = blocks.filter(b => b.slice(1).every((c, k) => neighbours(b[k], c)));
  const corners = blocks.filter(b => b.every(c => [0, 3, 20, 23].includes(c)) && new Set(b).size === 4);
  const mirrors = blocks.filter(b => b[0] + b[1] === 2 * Math.floor(b[0] / 4) * 4 + 3 && Math.floor(b[0] / 4) === Math.floor(b[1] / 4));
  assert.ok(walks.length > 5 && corners.length > 5 && mirrors.length > 5, `${walks.length} ${corners.length} ${mirrors.length}`);
  assert.deepEqual(run(100, 200, 9).seen, run(100, 200, 9).seen, 'the same dice, the same cells (the server replays them)');
  for (const kind of PATTERNS) for (const [c, r] of [[4, 6], [6, 4]]) {
    const p = patternPath(kind, c, r, seeded(1));
    assert.ok(p.length >= 2 && new Set(p).size === p.length && p.every(i => i >= 0 && i < c * r), `${kind} ${c}x${r}`);
  }
  const g = game({ rng: seeded(2) });
  g.progress = 100; g.pattern = [5, 6]; g.blockLeft = 2;
  g.cells[5].kind = 'petard';
  spawnNow(g);
  assert.equal(g.pattern, null, 'its cell taken: the pattern ends');
  assert.notEqual(g.cells[5].kind, 'mula');
});
