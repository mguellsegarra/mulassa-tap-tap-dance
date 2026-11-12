// A sheet nobody asked for (data-unasked: the greeting's news, notices and tips) comes up under a finger busy elsewhere:
// a tap outside never closes it, and for its first 400 ms a tap inside presses nothing. A sheet the player opened still
// closes on a tap outside (src/ui/backdrop.js). A sheet added after the module runs (a game page mounts mulassa.cat's) is
// guarded the same.
import assert from 'node:assert/strict';

const on = {};
let now = 0, observed = [];
const sheet = unasked => {
  const d = {
    open: false, unasked, dataset: {}, closed: 0,
    matches: s => s === 'dialog.sheet[open]:not([data-unasked])' ? d.open && !unasked : s === 'dialog[data-unasked]' ? unasked : s === 'dialog.sheet[open]' && d.open,
    closest: s => (s === 'dialog[data-unasked][open]' && unasked && d.open ? d : null),
    getBoundingClientRect: () => ({ left: 100, right: 300, top: 100, bottom: 500 }),
    dispatchEvent: () => true,
    close() { d.open = false; d.closed++; },
    showModal() { d.open = true; for (const [, cb] of observed) cb([{ target: d }]); }, // the document-wide watch sees it
  };
  return d;
};
const news = sheet(true), help = sheet(false);
Object.assign(globalThis, {
  addEventListener: (type, fn) => (on[type] ??= []).push(fn),
  document: {},
  MutationObserver: class { constructor(cb) { this.cb = cb; } observe(t) { observed.push([t, this.cb]); } },
  performance: { now: () => now },
});
await import('../../src/ui/backdrop.js');

const fire = (type, target, x, y) => {
  let stopped = false, prevented = false;
  const e = { target, clientX: x, clientY: y, preventDefault: () => { prevented = true; }, stopImmediatePropagation: () => { stopped = true; } };
  for (const fn of on[type] ?? []) { if (stopped) break; fn(e); }
  return { stopped, prevented };
};
const tapOutside = d => { fire('pointerdown', d, 10, 10); fire('click', d, 10, 10); };
const button = d => ({ closest: s => d.closest(s) }); // an element inside the sheet

now = 1000; news.showModal();
assert.equal(fire('click', button(news), 200, 300).stopped, true, 'a tap inside at once presses nothing');
now = 1399;
assert.equal(fire('click', button(news), 200, 300).prevented, true, 'still not armed at 399 ms');
now = 1400;
assert.equal(fire('click', button(news), 200, 300).stopped, false, 'armed at 400 ms');
tapOutside(news);
assert.equal(news.open, true, 'a tap outside never closes a sheet nobody asked for');

news.close(); now = 5000; news.showModal(); now = 5100;
assert.equal(fire('click', button(news), 200, 300).stopped, true, 'shown again: the 400 ms start over');

const late = sheet(true); // mounted after the import (Pop's in-app tip)
now = 7000; late.showModal(); now = 7100;
assert.equal(fire('click', button(late), 200, 300).stopped, true, 'a sheet added later presses nothing for 400 ms either');

help.showModal(); now = 9000;
tapOutside(help);
assert.equal(help.open, false, 'a sheet the player opened still closes on a tap outside');
console.log('backdrop: unasked sheets ignore taps outside and their first 400 ms ok');
