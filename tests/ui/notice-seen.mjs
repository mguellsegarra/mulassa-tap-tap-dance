// When a notice counts as read (src/ui/sheet-kit.js onScreen / whenSeen), on a fake page: below the fold, cut
// off by a sheet's scrolling body, in a background tab, under another sheet, hidden or gone never count; it must stay on
// screen for the whole dwell in a row, and a cancel (the sheet closed, a repaint) stops it for good.
import assert from 'node:assert/strict';
import { onScreen, whenSeen } from '../../src/ui/sheet-kit.js';

const box = (top, height, left = 0, width = 300) => ({ top, left, width, height, bottom: top + height, right: left + width });
function page() {
  const win = { innerWidth: 375, innerHeight: 667, getComputedStyle: el => ({ overflow: el.overflow || 'visible' }) };
  const doc = { visibilityState: 'visible', defaultView: win, top: null, elementFromPoint: () => doc.top };
  const node = (rect, parent = null, extra = {}) => ({ rect, parentElement: parent, ownerDocument: doc, isConnected: true, clientTop: 0, clientLeft: 0,
    getBoundingClientRect() { return this.rect; }, getClientRects() { return this.lines ?? [this.rect]; }, closest: () => null, contains(o) { for (let n = o; n; n = n.parentElement) if (n === this) return true; return false; }, ...extra });
  doc.body = node(box(0, 667, 0, 375));
  const sheet = node(box(200, 467, 0, 375), doc.body, { overflow: 'hidden' });
  const scroll = node(box(240, 300, 0, 375), sheet, { overflow: 'auto hidden', clientHeight: 300, clientWidth: 375 });
  const note = node(box(300, 40, 20, 300), scroll);
  doc.top = note;
  return { doc, win, sheet, scroll, note };
}

{ // onScreen
  const p = page();
  assert.equal(onScreen(p.note), true, 'in the window, inside its scrolling box, on top');
  p.note.rect = box(560, 40, 20, 300); assert.equal(onScreen(p.note), false, 'below the scrolling box (scrolled away)');
  p.note.rect = box(650, 40, 20, 300); assert.equal(onScreen(p.note), false, 'below the fold');
  p.note.rect = box(300, 40, 20, 300); p.scroll.clientHeight = 50; assert.equal(onScreen(p.note), false, 'cut off by the box');
  p.scroll.clientHeight = 300; assert.equal(onScreen(p.note), true, 'scrolled into view');
  p.doc.visibilityState = 'hidden'; assert.equal(onScreen(p.note), false, 'a background tab');
  p.doc.visibilityState = 'visible';
  const other = { parentElement: null }; p.doc.top = other; assert.equal(onScreen(p.note), false, 'another sheet over it');
  p.doc.top = p.note;
  p.note.checkVisibility = () => false; assert.equal(onScreen(p.note), false, 'display none, visibility hidden or opacity 0 on the way up');
  delete p.note.checkVisibility;
  p.note.closest = () => ({}); assert.equal(onScreen(p.note), false, 'inside [hidden] or [inert]'); p.note.closest = () => null;
  p.note.isConnected = false; assert.equal(onScreen(p.note), false, 'no longer on the page'); p.note.isConnected = true;
  // an inline notice over two lines: the corner of its box is its parent's, each line's middle is its own
  const para = { parentElement: p.scroll };
  p.note.lines = [box(300, 20, 180, 140), box(320, 20, 20, 200)];
  p.doc.elementFromPoint = (x, y) => (p.note.lines.some(b => x >= b.left && x <= b.right && y >= b.top && y <= b.bottom) ? p.note : para);
  assert.equal(onScreen(p.note), true, 'a wrapped span: every line on top');
  p.doc.elementFromPoint = (x, y) => (y > 320 ? para : p.note); assert.equal(onScreen(p.note), false, 'its last line covered');
  delete p.note.lines; p.doc.elementFromPoint = () => p.doc.top;
  p.note.rect = box(300, 0, 20, 0); assert.equal(onScreen(p.note), false, 'no size');
}
{ // whenSeen: a fake clock and timers
  let t = 0, queue = [];
  const timer = (f, ms) => { const h = { f, at: t + ms }; queue.push(h); return h; }, clear = h => { queue = queue.filter(x => x !== h); };
  const run = until => { while (queue.length) { queue.sort((a, b) => a.at - b.at); if (queue[0].at > until) break; const h = queue.shift(); t = h.at; h.f(); } t = until; };
  let on = false, fired = 0;
  const opts = { dwell: 1000, every: 200, seen: () => on, now: () => t, timer, clear };
  const stop = whenSeen({}, () => fired++, opts);
  run(5000); assert.equal(fired, 0, 'never on screen: never');
  on = true; run(5600); assert.equal(fired, 0, 'not yet a second');
  on = false; run(5800); on = true; run(6600); assert.equal(fired, 0, 'an interruption starts the second again');
  run(7000); assert.equal(fired, 1, 'a second in a row: read');
  run(20000); assert(fired === 1 && !queue.length, 'once, then nothing more is checked');
  stop();
  const late = whenSeen({}, () => fired++, opts); run(20400); late(); run(30000);
  assert(fired === 1 && !queue.length, 'cancelled (closed, repainted): never, and nothing left running');
}
console.log('notice read: on screen, in view, on top, for a second ok');
