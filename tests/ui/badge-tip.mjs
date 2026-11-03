// A badge's name over it: on a mouse's hover; on a finger's tap on it or within 44 px of it, a tap the row (open the card)
// never hears. The name keeps its own tap over its text, a badge inside a button (the profile's entry) keeps the button's.
import assert from 'node:assert/strict';
import { setupBadgeTip } from '../../src/ui/badge-tip.js';

// a fake DOM: just what the module reads (closest, rects, the topmost element at a point)
const listeners = {}, rect = (left, top, w, h) => ({ left, top, right: left + w, bottom: top + h, width: w, height: h });
function el(cls, r, parent = null, tag = 'span') {
  const e = { cls, tag, r, parentElement: parent, dataset: {}, style: { setProperty() {} }, classList: { remove() {}, toggle() {} }, setAttribute() {},
    getBoundingClientRect: () => e.r, querySelector: () => null, matches: s => s.split(',').some(x => x.trim() === `.${cls}`),
    closest(s) { for (let n = e; n; n = n.parentElement) if (s.split(',').some(x => { x = x.trim(); return x === n.tag || x === `.${n.cls}` || (x === '.player-badge[data-tip]' && n.cls === 'player-badge' && n.dataset.tip); })) return n; return null; },
    contains: o => { for (let n = o; n; n = n.parentElement) if (n === e) return true; return false; } };
  return e;
}
const row = el('row', rect(0, 0, 300, 50), null, 'li');
const name = el('player-name', rect(10, 10, 80, 18), row, 'button');
const mark = el('player-badge', rect(94, 11, 16, 16), row); mark.dataset.tip = 'Valls';
const entry = el('badge-edit', rect(0, 100, 60, 30), null, 'button'), owned = el('player-badge', rect(4, 107, 16, 16), entry); owned.dataset.tip = 'UAF';
let covered = false, clickCapture = null; // a sheet over the row: the mark's centre shows that sheet, not the mark
const shown = [];
const doc = {
  addEventListener: (t, f, capture) => { (listeners[t] ||= []).push(f); if (t === 'click') clickCapture = capture === true; }, querySelectorAll: () => [mark, owned],
  elementFromPoint: (x, y) => covered ? null : [owned, mark].find(m => x >= m.r.left && x <= m.r.right && y >= m.r.top && y <= m.r.bottom) ?? row,
  createElement: () => ({ ...el('badge-tip', rect(0, 0, 50, 20)), offsetWidth: 50, offsetHeight: 20, isConnected: false,
    showPopover() { this.isConnected = true; shown.push(this.textContent); }, hidePopover() {}, remove() { this.isConnected = false; } }),
  body: { append() {} },
};
const timers = []; globalThis.setTimeout = f => timers.push(f); globalThis.clearTimeout = () => {};
setupBadgeTip({ doc, win: { innerWidth: 400, addEventListener() {} } });
const tipOn = () => shown.at(-1) ?? null;
assert.equal(clickCapture, true, 'the click is heard on the way down: before the row (whose own listener opens the card) can act');

// a click as the browser sends it; `heard`: whether it reached the row (which opens the card)
function tap(target, x, y, { pointerType = 'touch', detail = 1 } = {}) {
  shown.length = 0; let heard = true;
  const e = { target, clientX: x, clientY: y, pointerType, detail, preventDefault() {}, stopPropagation() { heard = false; } };
  for (const f of listeners.click) f(e);
  return { tip: tipOn(), heard };
}
const reset = () => { for (const f of timers.splice(0)) f(); };

assert.deepEqual(tap(mark, 100, 18), { tip: 'Valls', heard: false }, 'a tap on the mark: its name, and no card');
reset();
assert.deepEqual(tap(row, 100, 18 + 8 + 13), { tip: 'Valls', heard: false }, '13 px under it still counts (a 44 px target)');
reset();
assert.deepEqual(tap(row, 110 + 13, 18), { tip: 'Valls', heard: false }, 'and 13 px past it');
reset();
assert.deepEqual(tap(row, 110 + 30, 18), { tip: null, heard: true }, 'further off: the row\'s tap');
assert.deepEqual(tap(name, 50, 18), { tip: null, heard: true }, 'the name\'s text keeps its tap');
assert.deepEqual(tap(name, 92, 35), { tip: 'Valls', heard: false }, 'past the name\'s text (its invisible pad): the mark\'s');
reset();
assert.deepEqual(tap(row, 100, 35, { detail: 0 }), { tip: null, heard: true }, 'a key on the row is no finger');
covered = true;
assert.deepEqual(tap(row, 100, 35), { tip: null, heard: true }, 'a mark under a sheet or scrolled away is not near anything');
covered = false;
assert.deepEqual(tap(owned, 10, 112), { tip: null, heard: true }, 'a mark inside a button: the button\'s (the profile opens the picker)');
assert.deepEqual(tap(entry, 30, 112), { tip: null, heard: true }, 'and near it too');

// a second tap on the same mark puts it away; it goes by itself too
tap(mark, 100, 18); assert.equal(tipOn(), 'Valls');
const again = tap(mark, 100, 18); assert.equal(again.heard, false); assert.equal(again.tip, null, 'a second tap: away');
reset(); tap(mark, 100, 18); assert.equal(timers.length, 1, 'a finger\'s tip has a timer'); reset();

// a mouse: on hover, off when it leaves; a click on the mark only must not open the card
shown.length = 0; for (const f of listeners.pointerover) f({ pointerType: 'mouse', target: mark });
assert.equal(tipOn(), 'Valls', 'hover shows it');
for (const f of listeners.pointerout) f({ pointerType: 'mouse', relatedTarget: row });
for (const f of listeners.pointerover) f({ pointerType: 'mouse', target: mark }); assert.equal(shown.length, 2, 'out and back over: shown again');
assert.deepEqual(tap(mark, 100, 18, { pointerType: 'mouse' }), { tip: null, heard: false }, 'a click over it keeps it (already up) and opens no card');
assert.deepEqual(tap(row, 100, 35, { pointerType: 'mouse' }), { tip: null, heard: true }, 'a mouse gets no 44 px target: the row is the row');

// clicks that carry no pointerType (some browsers): the press before the click says what it was
const press = pointerType => { for (const f of listeners.pointerdown ?? []) f({ pointerType }); };
press('mouse'); assert.deepEqual(tap(row, 100, 35, { pointerType: '' }), { tip: null, heard: true }, 'a mouse near the mark: the row\'s click (the card opens)');
press('touch'); assert.deepEqual(tap(row, 100, 35, { pointerType: '' }), { tip: 'Valls', heard: false }, 'a finger near it: the mark\'s'); reset();
press('touch'); assert.deepEqual(tap(row, 100, 35, { pointerType: 'mouse' }), { tip: 'Valls', heard: false }, 'WebKit\'s click after a tap says mouse: the press counts'); reset();
const canvas = el('hud', rect(0, 0, 400, 400), null, 'canvas');
assert.deepEqual(tap(canvas, 100, 35), { tip: null, heard: true }, 'a tap on the game canvas looks for no mark');
console.log('badge tip ok');
