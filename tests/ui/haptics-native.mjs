// Inside the Capacitor app haptic() goes to the native engine (plassa/native.js), never to vibrate or the iPhone switch:
// the first impulse at once (it is the tap's), a pattern's later ones on their own times.
import test from 'node:test';
import assert from 'node:assert/strict';

const calls = [], buzz = [];
const Haptics = { impact: o => { calls.push(['impact', o.style]); return Promise.resolve(); }, notification: o => { calls.push(['notification', o.type]); return Promise.resolve(); } };
globalThis.Capacitor = ({ isNativePlatform: () => true, Plugins: { Haptics } });
let clicks = 0;
globalThis.document = { createElement: () => ({ style: {}, setAttribute() {}, appendChild() {}, click: () => { clicks += 1; } }), body: { appendChild() {} } };
Object.defineProperty(globalThis, 'navigator', { value: { vibrate: p => buzz.push(p) }, configurable: true, writable: true });
const { haptic } = await import('../../src/platform/haptics.js');

test('the app: native impulses, the first inside the call, the rest of a pattern after it', async () => {
  haptic('tap');
  assert.deepEqual(calls, [['impact', 'LIGHT']], 'a tap is one light impulse, at once');
  calls.length = 0;
  haptic('boom');
  assert.equal(calls.length, 1, 'only the first impulse is synchronous');
  await new Promise(go => setTimeout(go, 620));
  assert.equal(calls.length, 5);
  assert.deepEqual(calls.at(-1), ['notification', 'WARNING']);
  assert.equal(buzz.length + clicks, 0, 'neither vibrate nor the iPhone switch');
});
