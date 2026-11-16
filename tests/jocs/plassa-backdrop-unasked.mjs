// A game's cover nobody asked for (data-unasked: a pause by itself, Pop's end sheet) comes up under fingers busy on the
// board: its backdrop does nothing, and for its first 400 ms a tap inside presses nothing. A cover the player opened still
// closes on a tap on its backdrop (packages/plassa/src/backdrop.js).
import assert from 'node:assert/strict';

const on = {};
let now = 0, observer = null;
const cover = unasked => {
  const c = {
    hidden: true, unasked, dataset: {},
    matches: s => (s === '.cover:not([hidden]):not([data-unasked])' ? !c.hidden && !unasked : s === '.cover[data-unasked]' && unasked),
    closest: s => (s === '.cover[data-unasked]:not([hidden])' && unasked && !c.hidden ? c : null),
    show() { c.hidden = false; observer([{ target: c }]); },
  };
  return c;
};
Object.assign(globalThis, {
  addEventListener: (type, fn) => (on[type] ??= []).push(fn),
  document: {},
  MutationObserver: class { constructor(cb) { observer = cb; } observe() {} },
  performance: { now: () => now },
});
const { closeOnBackdrop } = await import('../../packages/plassa/src/backdrop.js');
let closes = 0;
closeOnBackdrop(() => closes++);

const fire = (type, target) => {
  let stopped = false;
  const e = { target, clientX: 5, clientY: 5, preventDefault() {}, stopImmediatePropagation: () => { stopped = true; } };
  for (const fn of on[type] ?? []) { if (stopped) break; fn(e); }
  return stopped;
};
const tapBackdrop = c => { fire('pointerdown', c); fire('click', c); };
const button = c => ({ closest: s => c.closest(s) }); // «Surt», inside the cover

const pause = cover(true), board = cover(false);
now = 1000; pause.show();
assert.equal(fire('click', button(pause)), true, 'a tap inside at once presses nothing');
now = 1399;
assert.equal(fire('click', button(pause)), true, 'still not armed at 399 ms');
now = 1400;
assert.equal(fire('click', button(pause)), false, 'armed at 400 ms');
tapBackdrop(pause);
assert.equal(closes, 0, 'its backdrop does nothing');

board.show();
assert.equal(fire('click', button(board)), false, 'a cover the player opened: its buttons work at once');
tapBackdrop(board);
assert.equal(closes, 1, 'and its backdrop closes it');
console.log('plassa backdrop: unasked covers ignore their backdrop and their first 400 ms ok');
