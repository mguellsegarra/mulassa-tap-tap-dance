import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createGame, bestGrid, fitCards, CARD } from '../../src/jocs/games/memory/game.js';
import { LEVELS } from '../../src/jocs/games/memory/figures.js';

const figs = ['a', 'b'].map(name => ({ name }));
const noShuffle = () => .999; // j === i: the deck stays as built: a, b, a, b
const fresh = () => createGame(figs, noShuffle);

test('deals each figure twice', () => {
  assert.equal(createGame(figs).cards.length, 4);
  assert.deepEqual(fresh().cards.map(c => c.figure.name), ['a', 'b', 'a', 'b']);
});

test('a pair stays up and counts one move', () => {
  const g = fresh();
  assert.equal(g.flip(0).type, 'open');
  assert.equal(g.flip(2).type, 'match');
  assert.deepEqual([g.moves, g.pairs, g.cards[0].up, g.cards[2].up], [1, 1, true, true]);
});

test('a miss locks the board until hide()', () => {
  const g = fresh();
  g.flip(0);
  assert.equal(g.flip(1).type, 'miss');
  assert.equal(g.flip(2), null, 'a third card while two are open');
  g.hide();
  assert.deepEqual([g.cards[0].up, g.cards[1].up, g.moves, g.pairs], [false, false, 1, 0]);
  assert.equal(g.flip(0).type, 'open');
});

test('an open or matched card cannot be turned, so it cannot pair with itself', () => {
  const g = fresh();
  g.flip(0);
  assert.equal(g.flip(0), null);
  g.flip(2);
  assert.equal(g.flip(2), null);
  assert.equal(g.moves, 1);
});

test('wins on the last pair only', () => {
  const g = fresh();
  g.flip(0);
  assert.equal(g.flip(2).won, false);
  g.flip(1);
  assert.equal(g.flip(3).won, true);
});

test('the big mode keeps cards tappable: fewer on a phone, all of them on a desktop', () => {
  const phone = fitCards(25, 296, 490), desktop = fitCards(25, 1256, 730);
  assert.equal(desktop, 50);
  assert.ok(phone >= 28 && phone < 50 && phone % 2 === 0, `phone: ${phone}`);
  const { size } = bestGrid(phone, 296, 490, CARD.w, CARD.h, CARD.gap);
  assert.ok(size * CARD.w >= 48);
  assert.equal(fitCards(25, 40, 40), 2, 'never zero, whatever the window');
});

test('levels go from fewer cards to more, without repeating a figure', () => {
  const counts = LEVELS.map(l => l.figures.length);
  assert.deepEqual(counts, [...counts].sort((a, b) => a - b));
  for (const { figures } of LEVELS) assert.equal(new Set(figures.map(x => x.id)).size, figures.length);
});

test('picks the grid with the biggest cards for the room', () => {
  const grid = (w, h) => { const { cols, rows } = bestGrid(20, w, h, 3, 4, .3); return [cols, rows]; };
  assert.deepEqual(grid(296, 500), [4, 5]);
  assert.deepEqual(grid(1256, 720), [7, 3]);
  assert.deepEqual(grid(800, 120), [10, 2]);
  const fourteen = bestGrid(14, 296, 500, 3, 4, .3);
  assert.ok(fourteen.cols > 2 && fourteen.cols * fourteen.rows >= 14, 'a prime-ish count must not fall back to two columns');
});

test("the music is the Mulassa's current ambient loop, at its versioned URL", () => {
  const song = JSON.parse(readFileSync(new URL('../../src/song-mulassa.json', import.meta.url)));
  const sound = readFileSync(new URL('../../src/jocs/games/memory/sound.js', import.meta.url), 'utf8');
  for (const part of [`/${song.ambient}`, `start: ${song.ambientLoop.start}`, `end: ${song.ambientLoop.end}`]) assert.ok(sound.includes(part), part);
});
