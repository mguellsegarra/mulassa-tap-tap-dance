// A Mulassa Pop run made with no name (or offline) waits on the device for one (ranking.keep): the best one waits, and a
// run kept by an older version is replaced, since pop-score refuses its version for good and it would block every new one.
import assert from 'node:assert/strict';

const mem = new Map();
globalThis.localStorage = { getItem: k => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, String(v)), removeItem: k => mem.delete(k) };
const { keep, pending, forget } = await import('../../src/jocs/games/pop/ranking.js');

keep({ v: 2, points: 40 });
keep({ v: 2, points: 30 });
assert.equal(pending().points, 40, 'the best run of this version waits');
keep({ v: 2, points: 55 });
assert.equal(pending().points, 55, 'a better one takes its place');
mem.set('pop-pending', JSON.stringify({ v: 1, points: 900 }));
keep({ v: 2, points: 10 });
assert.deepEqual(pending(), { v: 2, points: 10 }, "an older version's run, however high, gives way");
forget();
assert.equal(pending(), null);
console.log('pop pending run: best kept, an older version replaced ok');
