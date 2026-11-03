import test from 'node:test';
import assert from 'node:assert/strict';
import { restoreHints, requestHint, refreshHints, hintView, MAX, EVERY, FREE_UNTIL } from '../../src/jocs/games/alquimia/hints.js';

const T0 = 1_800_000_000_000, PAIR = ['foc', 'aigua'];
const used = s => ({ ...s, pair: null }); // the hint's result was found

test('free until FREE_UNTIL elements, and it stays over after starting again', () => {
  let s = restoreHints(null, T0, FREE_UNTIL - 1);
  let r = requestHint(s, PAIR, T0, FREE_UNTIL - 1);
  assert.equal(r.status, 'free');
  assert.equal(r.state.credits, MAX);
  r = requestHint(used(r.state), PAIR, T0, FREE_UNTIL);
  assert.equal(r.status, 'spent');
  assert.equal(r.state.credits, MAX - 1);
  s = restoreHints(JSON.stringify(r.state), T0, 4); // started again: 4 elements
  assert.equal(requestHint(used(s), PAIR, T0, 4).status, 'spent');
});

test('one back every EVERY, never above MAX', () => {
  const s = requestHint(restoreHints(null, T0, 20), PAIR, T0, 20).state;
  assert.equal(refreshHints(s, T0 + EVERY - 1000).credits, MAX - 1);
  assert.equal(refreshHints(s, T0 + EVERY).credits, MAX);
  const later = refreshHints(s, T0 + 50 * EVERY);
  assert.equal(later.credits, MAX);
  assert.equal(later.nextAt, null);
});

test('spending again keeps the running wait', () => {
  let s = requestHint(restoreHints(null, T0, 20), PAIR, T0, 20).state;
  s = requestHint(used(s), PAIR, T0 + EVERY / 2, 20).state;
  assert.equal(s.credits, MAX - 2);
  assert.equal(s.nextAt, T0 + EVERY);
  s = refreshHints(s, T0 + EVERY + EVERY / 4);
  assert.equal(s.credits, MAX - 1);
  assert.equal(hintView(s, T0 + EVERY + EVERY / 4).remainingMs, EVERY * 3 / 4);
});

test('a clock set back gives nothing; forward refills up to MAX; junk gives a full store', () => {
  let s = requestHint(restoreHints(null, T0, 20), PAIR, T0, 20).state;
  s = refreshHints(s, T0 + 10 * 60e3);
  const back = refreshHints(s, T0 - 3600e3);
  assert.equal(back.credits, MAX - 1);
  assert.equal(hintView(back, T0 - 3600e3).remainingMs, EVERY - 10 * 60e3);
  assert.equal(refreshHints(s, T0 + 9 * EVERY).credits, MAX);
  for (const junk of ['{', '{"credits":9}', '{"credits":-1}', '[]']) assert.equal(restoreHints(junk, T0, 20).credits, MAX);
});

test('asking again for the hint you have is free; no pair costs nothing; empty store says so', () => {
  let r = requestHint(restoreHints(null, T0, 20), PAIR, T0, 20);
  r = requestHint(restoreHints(JSON.stringify(r.state), T0, 20), ['terra', 'terra'], T0, 20);
  assert.deepEqual([r.status, r.pair, r.state.credits], ['repeat', PAIR, MAX - 1]);
  assert.equal(requestHint(used(r.state), null, T0, 20).status, 'none');
  let s = { ...used(r.state), credits: 0, nextAt: T0 + EVERY };
  r = requestHint(s, ['aigua', 'aigua'], T0, 20);
  assert.deepEqual([r.status, r.pair], ['empty', null]);
});
