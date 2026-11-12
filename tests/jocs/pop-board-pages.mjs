// Mulassa Pop's long board (board-pages.js): the top grows a page at a time up to the cap, the own row far down comes with its
// neighbours, and the pages close the gap to them without a row twice or missing.
import assert from 'node:assert/strict';
import { openPages, nextPage, wanted, capped, PAGE, CAP, NEAR } from '../../src/jocs/games/pop/board-pages.js';

const boardOf = (n, self) => Array.from({ length: n }, (_, i) => ({ position: i + 1, total: n, is_self: i + 1 === self, public_id: i }));
const service = rows => { const calls = []; return { calls, fetch: async (o, l) => { calls.push([o, l]); return rows.slice(o, o + Math.min(l, 50)); } }; };
const drain = async (fetch, s) => { for (let i = 0; i < 50 && wanted(s); i++) await nextPage(fetch, s); };
const ids = rows => rows.map(r => r.public_id);

{ // the own row at 120 of 300: neighbours first, then pages up to them, joined once, every row once and in order
  const rows = boardOf(300, 120), { fetch, calls } = service(rows);
  const s = await openPages(fetch, { position: 120 });
  assert.equal(s.top.length, PAGE);
  assert.deepEqual(ids(s.near), ids(rows.slice(120 - 1 - NEAR, 120 + NEAR)), 'the own row with five each side');
  assert.deepEqual(calls[1], [114, PAGE], 'one page from five above its position, room for a tie');
  const { joined } = await nextPage(fetch, s);
  assert(!joined && s.top.length === 100, 'a full page, the gap still there');
  const last = await nextPage(fetch, s);
  assert(last.joined && last.rows.length === 14, 'the page stops where the neighbours start, and joins them');
  assert.deepEqual(s.near, []);
  await drain(fetch, s);
  assert.deepEqual(ids(s.top), ids(rows), 'the whole board once, in order');
  assert.equal(wanted(s), 0);
}
{ // a long board: the top stops at the cap, the own row's window stays apart
  const rows = boardOf(5000, 1234), { fetch } = service(rows);
  const s = await openPages(fetch, { position: 1234 });
  await drain(fetch, s);
  assert.equal(s.top.length, CAP);
  assert(capped(s), 'the cap note shows');
  assert(s.near.some(r => r.is_self) && s.near.length === 2 * NEAR + 1);
}
{ // the own row inside the first page: nothing more asked
  const { fetch, calls } = service(boardOf(80, 7));
  const s = await openPages(fetch, { position: 7 });
  assert(s.near.length === 0 && calls.length === 1);
}
{ // just under it: its rows and neighbours join the first page, no gap, every row once
  const rows = boardOf(80, 52), { fetch } = service(rows);
  const s = await openPages(fetch, { position: 52 });
  assert.equal(s.near.length, 0);
  assert.deepEqual(ids(s.top), ids(rows.slice(0, 57)), 'down to five under the own row');
  await drain(fetch, s);
  assert.deepEqual(ids(s.top), ids(rows));
}
{ // no place, a short board, an empty one
  const { fetch } = service(boardOf(10));
  const s = await openPages(fetch, null);
  assert.equal(wanted(s), 0); assert(!capped(s));
  const empty = await openPages(service([]).fetch, null);
  assert.equal(empty.total, 0); assert.equal(wanted(empty), 0);
}
{ // a page that fails leaves the state as it was, to be asked again
  const rows = boardOf(200), ok = service(rows);
  const s = await openPages(ok.fetch, null);
  await assert.rejects(nextPage(async () => { throw new Error('offline'); }, s));
  assert.equal(s.top.length, PAGE);
  await nextPage(ok.fetch, s);
  assert.deepEqual(ids(s.top), ids(rows.slice(0, 100)));
}
// a board with ties as get_pop_board ranks it: `scores` best first, position = rank(), the own row at index `self`
const tiedBoard = (scores, self) => scores.map((sc, i) => ({ position: 1 + scores.findIndex(x => x === sc), total: scores.length, is_self: i === self, public_id: i }));
{ // a tie before the own row pushes it past index position - 1: the window still finds it, once
  const scores = Array.from({ length: 3000 }, (_, i) => 3000 - i); for (let i = 1200; i < 1230; i++) scores[i] = 1800; // 30 tied at 1201
  const rows = tiedBoard(scores, 1228), { fetch } = service(rows);
  const s = await openPages(fetch, { position: 1201 });
  assert(s.near.some(r => r.is_self), 'the own row, 28 rows past its position, is in the window');
  assert.deepEqual(ids(s.near), ids(rows.slice(1228 - NEAR, 1228 + NEAR + 1)), 'five each side of where it really is');
}
{ // the same just under the first page: joined, no ghost needed, no row twice
  const scores = Array.from({ length: 200 }, (_, i) => 200 - i); for (let i = 30; i < 60; i++) scores[i] = 170;
  const rows = tiedBoard(scores, 58), { fetch } = service(rows);
  const s = await openPages(fetch, { position: 31 });
  assert.equal(s.near.length, 0); assert(s.top.some(r => r.is_self), 'the own row joined the first page');
  await drain(fetch, s);
  assert.deepEqual(ids(s.top), ids(rows), 'every row once, in order');
}
{ // a tie longer than a page: no window (the UI shows the own row apart until a page brings it)
  const scores = Array.from({ length: 400 }, (_, i) => 400 - i); for (let i = 100; i < 300; i++) scores[i] = 250;
  const { fetch } = service(tiedBoard(scores, 290));
  const s = await openPages(fetch, { position: 101 });
  assert.equal(s.near.length, 0);
  assert(!s.top.some(r => r.is_self));
}
{ // the board shrank after the first page: a short answer ends the paging instead of asking again and again
  const rows = boardOf(120), shrunk = rows.slice(0, 80), { fetch, calls } = service(rows);
  const s = await openPages(fetch, null);
  const late = async (o, l) => { calls.push([o, l]); return shrunk.slice(o, o + l); };
  await nextPage(late, s);
  assert.equal(s.top.length, 80);
  assert.equal(wanted(s), 0, 'nothing more to ask');
}
console.log('pop board pages OK');
