// Campanar (POC): the collection of special pieces (pieces.js). What the device earned is kept as soon as it is found;
// a piece stays new until it has really been shown (its toast or the sheet), so one the end hid still comes as new; a
// run counts each piece once and knows where it stands; ?vitrina remembers nothing, every run from none.
import assert from 'node:assert/strict';

const saved = new Map();
globalThis.localStorage = { getItem: k => saved.get(k) ?? null, setItem: (k, v) => saved.set(k, String(v)), removeItem: k => saved.delete(k) };
const { createPieces, TOTAL } = await import('../../src/jocs/games/campanar/pieces.js');
const { ORNAMENTS } = await import('../../src/jocs/games/campanar/collection.js');

assert.equal(TOTAL, 15, 'the fifteen special pieces');
assert(!('portal' in ORNAMENTS) && !('campanes' in ORNAMENTS) && !('creu' in ORNAMENTS), "the campanar's own parts are not finds");

let p = createPieces();
assert.deepEqual(p.find('F1', 12), { first: true }, 'a first find is new');
assert.equal(p.find('F1', 20), null, 'once a run');
assert.equal(p.find('portal', 3), null, 'not a piece');
assert.equal(p.at('F1'), 12, 'where it stands, for the camera');
assert.equal(p.count, 1);
assert.deepEqual(JSON.parse(saved.get('campanar-owned')), ['F1'], 'owned at once');
assert.equal(saved.get('campanar-seen'), undefined, 'not seen before it is shown');

// the run ends before its toast: a reload, a new run, it is owned and still new
p = createPieces();
p.reset();
assert.equal(p.count, 1);
assert.deepEqual(p.find('F1', 9), { first: true }, 'never shown: still new');
p.shown('F1');
p.reset();
assert.equal(p.at('F1'), undefined, 'a new run forgets where');
assert.deepEqual(p.find('F1', 9), { first: false }, 'shown once: never new again');

// a device from before owned was kept: what it saw is owned too
saved.clear();
saved.set('campanar-seen', JSON.stringify(['A6', 'portal']));
p = createPieces();
assert.equal(p.count, 1, 'seen pieces count as owned; the old basics are dropped');

// ?vitrina: nothing read nor kept, and each run from none
saved.clear();
p = createPieces({ remember: false });
p.find('A1', 4);
p.shown('A1');
assert.equal(saved.size, 0, 'nothing stored');
p.reset();
assert.equal(p.count, 0);
assert.deepEqual(p.find('A1', 4), { first: true }, 'new again in the next run');
console.log('campanar pieces ok');
