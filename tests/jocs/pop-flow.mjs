// Mulassa Pop's flow and HUD (flow.js, hud.js: the page's real modules through Vite, the board, hero, results and ranking replaced
// by recorders):
// - the board is fitted after the HUD is measured (hud.js owns board.insets.top: read at a run's start and when the HUD
//   resizes, never per frame; a hidden HUD keeps the last), and fitted again when the HUD changes size;
// - a fuse that ends the run during the bell's slow time does not frost the end sheet again (no hud.sync after the end);
// - the carretilla's «+N» words ride the run's clock: a pause holds them, a quit drops them, no wall-clock timer outlives either.
import assert from 'node:assert/strict';
import { viteLoad } from './pop-ssr.mjs';

const mem = new Map(), els = {};
const fakeEl = () => ({ hidden: false, textContent: '', style: {}, dataset: {}, firstChild: { style: {}, offsetWidth: 0 }, classList: { add() {}, remove() {}, toggle() {} }, animate: () => ({ finished: Promise.resolve(), }), getAnimations: () => [], addEventListener() {}, focus() {}, click() {}, setAttribute() {}, appendChild() {}, querySelector: () => null });
Object.assign(globalThis, {
  localStorage: { getItem: k => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, String(v)), removeItem: k => mem.delete(k) },
  document: { getElementById: id => (els[id] ??= fakeEl()), activeElement: null, body: { classList: { toggle() {} }, appendChild() {} }, addEventListener() {}, createElement: fakeEl },
  matchMedia: () => ({ matches: false, addEventListener() {} }),
  location: { search: '' }, innerWidth: 375, innerHeight: 667, addEventListener() {},
});
const observers = [];
globalThis.ResizeObserver = class { constructor(fn) { observers.push(fn); } observe() {} };
delete globalThis.AudioContext; // a silent game: audio.js has nothing to play
const { load, close } = await viteLoad();
const { createHud } = await load('hud.js');
const { createFlow } = await load('flow.js');
const $ = id => els[id] ??= fakeEl();

// --- hud.js
{
  const board = { insets: { top: 68 }, screenOf: () => ({ x: 0, y: 0 }) };
  let bottom = 52, reads = 0;
  $('hud').hidden = true;
  $('hud').getBoundingClientRect = () => { reads++; return { bottom }; };
  const hud = createHud({ board, t: k => k });
  let refits = 0;
  hud.watchInset(() => { refits++; });
  const game = { points: 0, slow: 0, state: 'play' };
  hud.sync(game, true);
  assert.equal(board.insets.top, 68, 'a hidden HUD has no edge to measure: the last inset stays');
  $('hud').hidden = false;
  hud.sync(game, true);
  assert.equal(board.insets.top, 52, "a run's start measures the HUD at once, before the board fits to it");
  assert.equal(refits, 0, 'the start itself asks for no refit: the board fits right after');
  const before = reads;
  for (let i = 0; i < 100; i++) hud.sync({ ...game, points: i });
  assert.equal(reads, before, 'no layout read per frame');
  bottom = 60;
  observers[0]();
  assert.deepEqual([board.insets.top, refits], [60, 1], 'the HUD changed size: the inset follows and the board refits');
  observers[0]();
  assert.equal(refits, 1, 'unchanged: no refit');
  $('hud').hidden = true;
  bottom = 0;
  observers[0]();
  assert.deepEqual([board.insets.top, refits], [60, 1], 'hidden (the end sheet): the board keeps the frame it had');
}

// --- flow.js
const calls = [];
const board = { setGame: () => calls.push('setGame'), fit() {}, frame() {}, burst() {}, shake() {}, punch() {}, fountain() {}, burn() {}, dragonFire: () => new Map([[1, .5]]), pick: () => -1, insets: { top: 0 } };
const hud = { sync: (g, force) => calls.push(force ? 'sync:force' : 'sync'), setSlow() {}, floatText: (i, text) => calls.push(`float:${text}`), combo() {}, watchInset() {} };
const flow = createFlow({ board, hero: { back() {} }, hud, results: { blast() {}, show() {} }, rankingUI: { sync() {} }, t: k => k, booted: () => false });
const toPlay = () => { for (let n = 0; n < 60 && flow.mode !== 'play'; n++) flow.step(.05); assert.equal(flow.mode, 'play'); };

flow.start();
assert.ok(calls.indexOf('sync:force') >= 0 && calls.indexOf('sync:force') < calls.indexOf('setGame'), 'the HUD is measured (hud.sync) before the board fits to it (setGame)');
toPlay();

{ // a fuse runs out during the bell's slow time
  const g = flow.game;
  g.slow = 3;
  Object.assign(g.cells[0], { kind: 'mula', age: 1, left: .001, life: 5, prev: 'drac' });
  calls.length = 0;
  flow.step(.05);
  assert.equal(flow.mode, 'ending', 'the fuse ended the run');
  assert.ok(!calls.includes('sync'), 'and the HUD is not synced after it: its frost would come back over the end sheet');
}

flow.showMenu();
flow.start();
toPlay();
{ // the carretilla's words: on the run's clock
  const g = flow.game, cell = i => g.cells[i];
  const carretilla = () => { g.on('burn', cell(1), { gained: 3 }); g.on('goodie', cell(2), 'carretilla', { gained: 1 }); };
  const words = () => calls.filter(c => c === 'float:+3').length;
  calls.length = 0;
  carretilla();
  flow.step(.3);
  assert.equal(words(), 0, 'not before her Mulassa goes up');
  flow.step(.3);
  assert.equal(words(), 1, 'at its time on the game clock');

  calls.length = 0;
  carretilla();
  flow.pause();
  await new Promise(go => setTimeout(go, 700)); // a wall-clock timer would have fired by now
  for (let n = 0; n < 20; n++) flow.step(.05);
  assert.equal(words(), 0, 'a pause holds the word: the clock stands still');
  flow.showMenu();
  await new Promise(go => setTimeout(go, 100));
  flow.start();
  toPlay();
  for (let n = 0; n < 40; n++) flow.step(.05);
  assert.equal(words(), 0, 'a quit drops it: the next run never shows the last one\'s');
}
flow.showMenu();
await close();
console.log('pop-flow: ok');
