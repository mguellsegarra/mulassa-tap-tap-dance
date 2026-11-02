import test from 'node:test';
import assert from 'node:assert/strict';
import { winRate } from '../../tools/dev/crush-curve.mjs';

const GAMES = 40, rate = level => winRate(level - 1, GAMES);

test('every hard level is harder than the one before it and followed by relief', () => {
  for (const hard of [8, 12, 16, 20]) {
    const here = rate(hard);
    assert.ok(here < rate(hard - 1), `level ${hard} against the one before`);
    if (hard < 20) assert.ok(here < rate(hard + 1), `level ${hard} against the one after`);
  }
});

test('the game starts nearly always won and ends hard but still winnable', () => {
  assert.ok(rate(1) >= .95);
  const last = rate(20);
  assert.ok(last > .1 && last < .5);
});
