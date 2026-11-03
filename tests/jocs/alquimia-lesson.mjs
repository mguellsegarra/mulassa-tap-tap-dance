// The first game's guided start (lesson.js): who gets it, what each step lets through, and that the hand never moves on
// before the discovery has been seen; ?nou, the dev-only way back to a new player; the one-time hint card's trigger.
import test from 'node:test';
import assert from 'node:assert/strict';
import { LESSON, lessonStart, acceptsPick, acceptsHint, afterHint, afterDiscovery, coachTarget, newPlayer } from '../../src/jocs/games/alquimia/lesson.js';
import { restoreHints, endsFreeStart, FREE_UNTIL } from '../../src/jocs/games/alquimia/hints.js';
import { rulesFor } from '../../src/jocs/games/alquimia/rules.js';

const STARTERS = 4, PAIR = ['terra', 'aigua'];

test('only a new player gets it, and it resumes at the hint after leaving halfway', () => {
  assert.equal(lessonStart({ done: false, found: STARTERS, starters: STARTERS, vaporNew: true }), 'mix');
  assert.equal(lessonStart({ done: false, found: STARTERS + 1, starters: STARTERS, vaporNew: false }), 'hint');
  assert.equal(lessonStart({ done: true, found: STARTERS, starters: STARTERS, vaporNew: true }), null, 'never twice');
  assert.equal(lessonStart({ done: false, found: 20, starters: STARTERS, vaporNew: true }), null, 'not for an old save');
});

test('the scripted first mix makes something new from the starting elements', () => {
  const rules = rulesFor(), start = rules.restore([]);
  assert.equal(start.length, STARTERS);
  assert(LESSON.every(id => start.includes(id)), 'both are starting elements');
  assert(rules.mix(start, ...LESSON).isNew, 'Foc + Aigua makes a new element');
});

test('each step lets through only what the hand points at', () => {
  assert(acceptsPick('mix', 'foc', 0) && !acceptsPick('mix', 'terra', 0), 'Foc first');
  assert(acceptsPick('mix', 'aigua', 1) && !acceptsPick('mix', 'foc', 1), 'then Aigua');
  assert(!acceptsPick('hint', 'foc', 0) && !acceptsPick('book', 'foc', 0), 'no element while the bulb or the book waits');
  assert(acceptsPick('follow', 'terra', 0, PAIR) && !acceptsPick('follow', 'aigua', 0, PAIR), 'the hint, in its order');
  assert(acceptsPick('follow', 'aigua', 1, ['aigua', 'aigua']), 'the same element twice');
  assert(acceptsPick(null, 'vent', 0) && acceptsPick('done', 'vent', 0), 'free play after it');
  assert(!acceptsHint('mix') && !acceptsHint('book') && acceptsHint('hint') && acceptsHint(null));
});

test('the steps follow one another: mix, hint, follow, book', () => {
  assert.equal(afterDiscovery('mix'), 'hint');
  assert.equal(afterHint('hint'), 'follow');
  assert.equal(afterDiscovery('follow'), 'book');
  assert.equal(afterHint(null), null, 'a hint outside the lesson changes nothing');
  assert.equal(afterDiscovery(null), null);
});

test('the hand waits while a mix plays out, then points at the next step', () => {
  assert.equal(coachTarget('hint', { locked: true, picked: 2 }), null, 'not over the discovery');
  assert.equal(coachTarget('book', { locked: true, picked: 2 }), null);
  assert.equal(coachTarget('hint', { locked: false, picked: 0 }), 'hint');
  assert.equal(coachTarget('mix', { locked: false, picked: 1 }), 'aigua');
  assert.equal(coachTarget('follow', { locked: false, picked: 0, pair: PAIR }), 'terra');
  assert.equal(coachTarget('mix', { locked: false, picked: 2 }), null, 'both picked: brewing');
  assert.equal(coachTarget('done', { locked: false, picked: 0 }), null);
  assert.equal(coachTarget(null, { locked: false, picked: 0 }), null);
});

// A Storage look-alike: key(i), length, getItem, setItem, removeItem.
const storage = init => {
  const m = new Map(Object.entries(init));
  return { get length() { return m.size; }, key: i => [...m.keys()][i] ?? null, getItem: k => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k), dump: () => Object.fromEntries(m) };
};
const SAVE = { 'minijocs.alquimia.found': '["vapor","fang"]', 'minijocs.alquimia.hints': '{}', 'minijocs.alquimia.lesson': '1', 'minijocs.alquimia.catalana': '[]', 'mulassa.records': 'keep' };

test('?nou wipes only this game, and ?nou=pista resumes at the hint', () => {
  let s = storage(SAVE);
  newPlayer(new URLSearchParams('nou'), s);
  assert.deepEqual(s.dump(), { 'mulassa.records': 'keep' });
  s = storage(SAVE);
  newPlayer(new URLSearchParams('nou=pista'), s);
  assert.deepEqual(s.dump(), { 'mulassa.records': 'keep', 'minijocs.alquimia.found': '["vapor"]' });
  s = storage(SAVE);
  newPlayer(new URLSearchParams(''), s);
  assert.deepEqual(s.dump(), SAVE, 'no flag, no change (Q is empty on public hosts: tests/build/flags.mjs)');
});

test('the hint card about the store shows once, at the discovery that ends the free start', () => {
  const s = restoreHints(null, 0, FREE_UNTIL - 2);
  assert(!endsFreeStart(s, FREE_UNTIL - 1), 'still free');
  assert(endsFreeStart(s, FREE_UNTIL), 'this one ends it');
  assert(!endsFreeStart({ ...s, introDone: true }, FREE_UNTIL + 1), 'never again');
});
