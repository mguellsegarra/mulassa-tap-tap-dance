// platform/haptics.js, shared by the game's pad and Mulassa Pop: Android gets each kind's pattern, an iPhone as many
// ticks of the hidden switch, 100 ms apart, inside the tap that asked for them.
import test from 'node:test';
import assert from 'node:assert/strict';

let clicks = 0;
const el = () => ({ style: {}, setAttribute() {}, appendChild() {}, click: () => { clicks += 1; } });
globalThis.document = { createElement: el, body: { appendChild() {} } };
const buzz = [];
Object.defineProperty(globalThis, 'navigator', { value: { vibrate: p => buzz.push(p) }, configurable: true, writable: true });
const { haptic } = await import('../../src/platform/haptics.js');

test('Android: one call with the kind\'s pattern, the blast the longest', () => {
  for (const kind of ['tap', 'hit', 'miss', 'big', 'boom']) haptic(kind);
  assert.equal(buzz.length, 5);
  assert.deepEqual(buzz.slice(0, 2), [8, 15]);
  const span = p => [p].flat().reduce((a, b) => a + b, 0);
  assert.ok(buzz.slice(0, 4).every(p => span(p) < span(buzz[4])));
  assert.equal(clicks, 0);
});

test('iPhone: the switch ticks once for a tap, twice for a miss, four times for the blast', async () => {
  globalThis.navigator = {};
  for (const [kind, ticks] of [['hit', 1], ['miss', 2], ['boom', 4]]) {
    clicks = 0;
    haptic(kind);
    assert.equal(clicks, 1, `${kind}: the first tick inside the tap`);
    await new Promise(go => setTimeout(go, ticks * 100 + 20));
    assert.equal(clicks, ticks, kind);
  }
});
