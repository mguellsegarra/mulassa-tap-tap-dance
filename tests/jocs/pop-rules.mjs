import test from 'node:test';
import assert from 'node:assert/strict';
import { newGame, tick, tap, FUSE, swapEvery, GOODIES, TRAPS, BOMB_FUSE, BURN } from '../../src/jocs/games/pop/rules.js';

const seeded = s => () => (s = (s * 16807) % 2147483647) / 2147483647;
const game = (o = {}) => newGame({ rng: seeded(7), ...o });
const first = (g, kind) => g.cells.find(c => c.kind === kind);

test('a Mulassa appears, and tapping it scores and turns it back into a Drac', () => {
  const g = game();
  tick(g, 1.01);
  const m = first(g, 'mula');
  assert.ok(m);
  tap(g, m.i);
  assert.equal(g.score, 1);
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
  tick(g, 1.01);
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
  assert.equal(g.score, 0);
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
  assert.equal(g.score, 5);

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
  assert.equal(g.score, 2);
  assert.equal(g.cells.filter(c => c.kind === 'mula').length, 0);
});

test('nothing changes once the game is over', () => {
  const g = game();
  tap(g, 0);
  const m = g.cells[1];
  m.kind = 'mula';
  tap(g, 1);
  assert.equal(g.score, 0);
});

test('a long autoplayed game stays consistent: the pace rises, one trap and one goodie at most, goodies and traps do appear', () => {
  const g = game();
  const seen = new Set();
  for (let t = 0; t < 400 && g.state === 'play'; t += 1 / 60) {
    tick(g, 1 / 60);
    const specials = g.cells.filter(c => c.kind !== 'drac' && c.kind !== 'mula');
    assert.ok(specials.filter(c => GOODIES.includes(c.kind)).length <= 1);
    assert.ok(specials.filter(c => TRAPS.includes(c.kind)).length <= 1);
    specials.forEach(c => seen.add(c.kind));
    for (const c of g.cells) if ((c.kind === 'mula' || c.kind === 'petard') && c.age > 1) tap(g, c.i); // slow enough that a few are out at once
  }
  assert.equal(g.state, 'play');
  assert.ok(g.score > 250, `score ${g.score}`);
  assert.ok(swapEvery(g.score) < .25, 'the pace has quickened to its fastest');
  assert.ok([...GOODIES, ...TRAPS].every(k => seen.has(k)), [...seen].join());
});

test('a full board does not break spawning', () => {
  const g = game({ cols: 1, rows: 2 });
  for (let t = 0; t < 3 && g.state === 'play'; t += .1) tick(g, .1);
  assert.equal(g.state, 'play');
  assert.equal(g.cells.filter(c => c.kind === 'drac').length, 0);
});

test('a cell where a Mulassa is still burning gets nothing new until she is gone', () => {
  const g = game({ cols: 2, rows: 1 });
  g.cells[0].age = -5;
  g.since = swapEvery(0) - .01;
  tick(g, .02);
  assert.equal(g.cells[0].kind, 'drac');
  assert.equal(g.cells[1].kind, 'mula');
});

test('phones want portrait, tablets landscape, a mouse anything', async () => {
  const { wrongOrient } = await import('../../src/jocs/games/pop/orientation.js');
  const phone = { coarse: true, shortSide: 375 }, tablet = { coarse: true, shortSide: 768 }, mouse = { coarse: false, shortSide: 800 };
  assert.equal(wrongOrient({ ...phone, w: 375, h: 667 }), false);
  assert.equal(wrongOrient({ ...phone, w: 667, h: 375 }), true);
  assert.equal(wrongOrient({ ...tablet, w: 1024, h: 768 }), false);
  assert.equal(wrongOrient({ ...tablet, w: 768, h: 1024 }), true);
  assert.equal(wrongOrient({ ...mouse, w: 400, h: 900 }), false);
});

test('Mulassas come at a steady pace, whatever the tune, that quickens smoothly with the score', () => {
  const mulas = g => g.cells.filter(c => c.kind === 'mula').length;
  const g = game();
  tick(g, swapEvery(0) - .02);
  assert.equal(mulas(g), 0, 'not before its time');
  tick(g, .03);
  assert.equal(mulas(g), 1);
  tick(g, swapEvery(0) - .02);
  assert.equal(mulas(g), 1);
  tick(g, .03);
  assert.equal(mulas(g), 2, 'the next one a whole interval later: an even beat');
  assert.equal(swapEvery(0), .75);
  for (let s = 0; s < 400; s++) {
    const a = swapEvery(s), b = swapEvery(s + 1);
    assert.ok(b < a && a - b < .02, `smooth and always quicker: ${s} → ${a}, ${b}`); // no jump between two scores
  }
  assert.ok(swapEvery(250) < .25 && swapEvery(1e6) > .18, 'Level.cs\'s fastest pace, never past it');
});

test('progressive: only Mulassas at first, each special at its own score, the fire only with several Mulassas out', () => {
  const seenAt = (score, keepOut) => {
    const g = game({ rng: seeded(score + 3) }), seen = new Set();
    g.score = score;
    for (let i = 0; i < 4000; i++) {
      g.since = 9;
      tick(g, 0);
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
