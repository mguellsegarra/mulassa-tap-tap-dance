import test from 'node:test';
import assert from 'node:assert/strict';
import { LADDER, OVER_SECS, newGame, tick, drop, pick, mergeInto, mergeScore, clampX } from '../../src/jocs/games/suika/rules.js';

const ORDER = ['nan', 'barretVerd', 'arlequi', 'diable', 'drac', 'aliga', 'lleo', 'basilisc', 'mulassa', 'gegant', 'calcot'];
const run = (g, secs) => { for (let i = 0; i < secs * 60; i++) tick(g, 1 / 60); };
// Drops one figure of the given tier straight down, ignoring the turn order.
function place(g, tier, x) {
  g.held = tier;
  assert.equal(drop(g, x), true);
}

test('the ladder runs in the approved order and always grows', () => {
  assert.deepEqual(LADDER.map(f => f.id), ORDER);
  for (let t = 1; t < LADDER.length; t++) assert.ok(LADDER[t].r > LADDER[t - 1].r, LADDER[t].id);
});

test('two of a figure become the next one, and two of the last become nothing', () => {
  for (let t = 0; t < LADDER.length - 1; t++) assert.equal(mergeInto(t), t + 1);
  assert.equal(mergeInto(LADDER.length - 1), null);
});

test('only the five smallest ever drop', () => {
  const seen = new Set();
  for (let i = 0; i < 100; i++) seen.add(pick(() => i / 100));
  assert.deepEqual([...seen].sort(), [0, 1, 2, 3, 4]);
});

test('a real merge replaces the pair with the next figure and scores it', () => {
  const events = [], g = newGame(140, { rng: () => 0, on: (ev, d) => events.push([ev, d]) });
  place(g, 2, 50);
  run(g, 1.5);
  place(g, 2, 50);
  run(g, 1.5);
  assert.deepEqual(g.bodies.map(b => b.tier), [3]);
  assert.equal(g.score, mergeScore(2));
  assert.equal(g.top, 3);
  assert.equal(events.filter(([ev]) => ev === 'merge').length, 1);
});

test('two of the last figure leave the box empty and pay the top score', () => {
  const g = newGame(160, { rng: () => 0 }), last = LADDER.length - 1;
  place(g, last, 30);
  run(g, 1.5);
  place(g, last, 30);
  run(g, 1.5);
  assert.equal(g.bodies.length, 0);
  assert.equal(g.score, mergeScore(last));
});

test('different figures do not merge, and stay inside the box', () => {
  const g = newGame(140, { rng: () => 0 });
  [0, 1, 2, 3].forEach((t, i) => { place(g, t, 50 + i); run(g, 1); });
  run(g, 3);
  assert.equal(g.bodies.length, 4);
  assert.equal(g.score, 0);
  for (const b of g.bodies) assert.ok(b.x >= b.r - 1 && b.x <= 100 - b.r + 1 && b.y <= 140 - b.r + 1);
});

test('drop refuses while waiting for the next figure, and clamps to the walls', () => {
  const g = newGame(140, { rng: () => 0 });
  assert.equal(drop(g, -50), true);
  assert.equal(g.bodies[0].x, clampX(-50, g.bodies[0].tier));
  assert.equal(drop(g, 50), false);
  run(g, 1);
  assert.notEqual(g.held, null);
});

test('the game ends only after a figure stays above the rim, and a passing one does not count', () => {
  const g = newGame(140, { rng: () => 0 });
  place(g, 3, 50);
  run(g, OVER_SECS + 1); // it starts above the rim and falls straight in
  assert.equal(g.state, 'play');
  // Fill a low box so a figure rests above the rim.
  const low = newGame(30, { rng: () => 0 }), over = [];
  low.on = ev => over.push(ev);
  [10, 9, 10].forEach((t, i) => { place(low, t, 30 + i * 20); run(low, .1); });
  run(low, OVER_SECS / 2);
  assert.equal(low.state, 'play', 'not yet: it has not been above long enough');
  run(low, OVER_SECS * 2);
  assert.equal(low.state, 'over');
  assert.deepEqual(over.filter(ev => ev === 'over'), ['over']);
  const score = low.score;
  run(low, 1);
  assert.equal(low.score, score, 'nothing moves once it is over');
});
