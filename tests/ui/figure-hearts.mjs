// A heart belongs to the account that gave it: nothing asked before a change of account lands on the next one.
import assert from 'node:assert/strict';
import { setupHearts } from '../../src/ui/figure-hearts.js';
const later = () => { let open; const p = new Promise(r => { open = r; }); return { p, open }; };
const tick = () => new Promise(r => setImmediate(r));
let list = later(); const writes = [];
const hearts = setupHearts({ service: { figureHearts: () => list.p, setFigureHeart: async (id, on) => { writes.push([id, on]); return 1; } }, needConfirmed: (r, run) => run() });
hearts.tap({ id: 'bou' }, null); await tick();
const old = list; list = later(); hearts.reload(); await tick();
old.open([{ figure: 'bou', hearts: 9, mine: true }]); await tick();
assert.equal(hearts.mine('bou'), false, "the old account's answer does not land");
list.open([{ figure: 'bou', hearts: 2, mine: false }]); await tick();
assert.equal(hearts.count('bou'), 2); assert.deepEqual(writes, [], "the old account's tap is dropped");
console.log('figure hearts ok');
