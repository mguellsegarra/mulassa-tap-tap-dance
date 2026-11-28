// The app's home button (plassa/home-hold.js): a short tap only says how, a hold leaves once, a key leaves at once; a second
// finger, a script's click (the double-tap guard's) and a cover over the button never leave. Real timers: HOLD_MS is 800 ms.
import test from 'node:test';
import assert from 'node:assert/strict';

class Node extends EventTarget {
  constructor() { super(); this.style = {}; this.attrs = {}; this.textContent = ''; const set = new Set(); this.classList = { add: c => set.add(c), remove: c => set.delete(c), contains: c => set.has(c) }; }
  setAttribute(k, v) { this.attrs[k] = v; } getAttribute(k) { return this.attrs[k] ?? null; }
  querySelectorAll() { return []; } querySelector() { return null; } insertAdjacentHTML() {} appendChild() {} append() {}
  getBoundingClientRect() { return { left: 16, top: 16, right: 60, bottom: 60, width: 44, height: 44 }; }
  contains(n) { return n === this; } setPointerCapture() {} click() {} // haptics.js's hidden switch
  get offsetWidth() { return 120; } get offsetHeight() { return 34; }
}
let cover = false, dialog = false;
const el = new Node();
globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
globalThis.document = {
  head: { append() {} }, body: { append() {}, appendChild() {} }, createElement: () => new Node(), documentElement: { dataset: {} },
  elementFromPoint: () => (cover ? new Node() : el), querySelector: q => (q === 'dialog[open]' && dialog ? {} : null), querySelectorAll: () => [],
};
globalThis.getComputedStyle = () => ({ position: 'absolute' });
globalThis.addEventListener = () => {};
globalThis.innerWidth = 375;
const { holdToHome, HOLD_MS } = await import('../../packages/plassa/src/home-hold.js');

let left = 0;
holdToHome(el, { hint: 'Mantén premut per tornar', leave: () => { left++; } });
const holding = () => el.classList.contains('holding');
const ev = (type, props = {}) => Object.assign(new Event(type, { cancelable: true }), props);
const press = (id = 1) => el.dispatchEvent(ev('pointerdown', { pointerId: id, button: 0 }));
const release = (id = 1) => el.dispatchEvent(ev('pointerup', { pointerId: id }));
const wait = ms => new Promise(r => setTimeout(r, ms));
const reset = async () => { left = 0; cover = dialog = false; await wait(2100); }; // past the once-per-exit guard

test('a short tap does not leave; it shows the hint', async () => {
  press(); await wait(100); release(); await wait(HOLD_MS);
  assert.equal(left, 0);
  assert.equal(holding(), false, 'the ring stops');
});

test('a hold leaves once, even released late with its click after', async () => {
  await reset();
  press(); await wait(HOLD_MS + 150); release(); el.dispatchEvent(ev('click'));
  await wait(50);
  assert.equal(left, 1);
});

test('a second finger changes nothing; the first one releasing cancels', async () => {
  await reset();
  press(1); await wait(200); press(2); await wait(100); release(1); await wait(HOLD_MS);
  assert.equal(left, 0);
});

test('a finger sliding off the button lets it go', async () => {
  await reset();
  press(); await wait(200); el.dispatchEvent(ev('pointermove', { pointerId: 1, clientX: 200, clientY: 300 })); await wait(HOLD_MS);
  assert.equal(left, 0);
  release();
});

test('a script\'s click (the double-tap guard) never leaves', async () => {
  await reset();
  el.dispatchEvent(ev('click'));
  assert.equal(left, 0);
});

test('Enter or Space leave at once; a cover or a sheet over the button stops any way out', async () => {
  await reset();
  el.dispatchEvent(ev('keydown', { key: ' ', repeat: false }));
  assert.equal(left, 1);
  await reset();
  cover = true; press(); await wait(HOLD_MS + 100); release();
  el.dispatchEvent(ev('keydown', { key: 'Enter', repeat: false }));
  cover = false; dialog = true; el.dispatchEvent(ev('keydown', { key: 'Enter', repeat: false }));
  assert.equal(left, 0);
});
