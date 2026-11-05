// Mulassa Pop's best on this device (best.js): the board's best raises it (a best made on another device under the same
// name), never lowers it, so a run here is measured against the player's real best.
import assert from 'node:assert/strict';

const mem = new Map();
globalThis.localStorage = { getItem: k => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, String(v)), removeItem: k => mem.delete(k) };
const { best, raiseBest } = await import('../../src/jocs/games/pop/best.js');

assert.equal(best(), 0, 'nothing played here');
assert.equal(raiseBest(57), true, "the board's 57 from another device");
assert.equal(best(), 57);
assert.equal(raiseBest(40), false, 'a lower one never lowers it');
assert.equal(raiseBest(undefined), false, 'no place on the board: nothing');
assert.equal(best(), 57);
assert.equal(mem.get('pica-best'), '57', "kept under the game's first name");
console.log('pop best: raised by the board, never lowered ok');
