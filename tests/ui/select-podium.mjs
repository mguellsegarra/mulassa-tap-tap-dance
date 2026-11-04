// Step 2's podium (src/ui/select-podium.js) keeps a level's rows for a minute; forget() (a badge saved, select-ui.js's reread)
// makes the next fit ask again, so the player's own row shows the new mark instead of the old check.
import assert from 'node:assert/strict';
import { setupPodium } from '../../src/ui/select-podium.js';

const node = () => ({ parentElement: { removeAttribute() {} }, hidden: true, addEventListener() {} });
const nodes = new Map();
const $ = id => (nodes.has(id) ? nodes.get(id) : (nodes.set(id, node()), nodes.get(id)));
let asks = 0, pending = null, t = 0;
const podium = setupPodium({ doc: {}, win: { matchMedia: () => ({ matches: true }) }, $, onBoard() {}, onCard() {}, refit() {}, now: () => t,
  load: () => { asks++; return pending ?? Promise.resolve([]); } });
const fit = () => podium.fit({ on: true, figure: 'mulassa-valls', level: 1, owner: 'o', s: { pos: 2, total: 9 } });

fit(); await null; await null;
fit();
assert.equal(asks, 1, 'within the minute: the cached rows, no second ask');
podium.forget();
fit();
assert.equal(asks, 2, 'after forget(): asked again');

// an ask started before forget() and answered after it never replaces the newer one's place
let late; pending = new Promise(r => { late = r; });
podium.forget(); fit(); // asks (pending)
pending = null; podium.forget(); fit(); // asks again, answered at once
await null; await null;
t = 50e3; late([]); await null; await null; // unguarded, this would restart the minute with the old rows
t = 70e3; fit();
assert.equal(asks, 5, 'the late old answer was dropped: the fresh one (t=0) has expired, so it asks again');
console.log('select-podium ok');
