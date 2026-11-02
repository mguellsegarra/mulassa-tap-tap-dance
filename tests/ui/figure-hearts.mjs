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
// a tap the server refuses says so, and changes nothing
{ const notes = []; let on = false, tries = 0;
  const note = () => ({ style: {}, offsetWidth: 100, setAttribute() {}, remove() { notes.splice(notes.indexOf(this), 1); } });
  const doc = { defaultView: { innerWidth: 400, matchMedia: () => ({ matches: true }) }, createElement: note, body: { append: n => notes.push(n) } };
  const button = { ownerDocument: doc, getBoundingClientRect: () => ({ left: 380, width: 40, bottom: 50 }), closest: () => null, querySelector: () => ({ classList: { add() {}, remove() {} }, getBoundingClientRect: () => ({}) }) };
  const h = setupHearts({ service: { figureHearts: async () => [{ figure: 'bou', hearts: 4, mine: false }], setFigureHeart: async () => { tries++; if (!on) throw new Error('down'); return 5; } }, needConfirmed: (r, run) => run() });
  h.tap({ id: 'bou' }, button); await tick(); await tick();
  assert.equal(notes.length, 1); assert.equal(notes[0].style.left, '288px', 'kept inside the screen'); assert.equal(h.count('bou'), 4); assert.equal(h.mine('bou'), false);
  const first = notes[0]; h.tap({ id: 'bou' }, button); await tick(); await tick();
  assert.equal(tries, 2, 'the failed tap let the next one through'); assert(notes.length === 1 && notes[0] !== first, 'a second failure replaces the note');
  h.reload(); assert.equal(notes.length, 0, 'another account does not inherit it');
  await h.load(); h.tap({ id: 'bou' }, button); await tick(); await tick(); assert.equal(notes.length, 1);
  on = true; h.tap({ id: 'bou' }, button); await tick(); await tick(); assert.equal(notes.length, 0, 'a retry that saves clears it'); assert.equal(h.mine('bou'), true); }
// on a pending card the note keeps to its button's width, centred in the room above the next button
{ const notes = [];
  const doc = { defaultView: { innerWidth: 668, matchMedia: () => ({ matches: true }) }, createElement: () => ({ style: {}, offsetWidth: 200, offsetHeight: 30, setAttribute() {}, remove() {} }), body: { append: n => notes.push(n) } };
  const card = { querySelector: () => ({ getBoundingClientRect: () => ({ top: 100, height: 44 }) }) };
  const button = { ownerDocument: doc, getBoundingClientRect: () => ({ left: 29, width: 229, bottom: 50 }), closest: s => (s === '.sel-pending' ? card : null), querySelector: () => ({ classList: { add() {}, remove() {} }, getBoundingClientRect: () => ({}) }), classList: { add() {}, remove() {} } };
  const h = setupHearts({ service: { figureHearts: async () => [], setFigureHeart: async () => { throw new Error('down'); } }, needConfirmed: (r, run) => run() });
  h.tap({ id: 'os' }, button); await tick(); await tick();
  assert.equal(notes[0].style.maxWidth, '229px', 'no wider than the button');
  assert.equal(notes[0].style.top, '60px', 'the same room above and below');
  h.reload(); }
console.log('figure hearts ok');
// the account changed: until the new identity is read, nothing of the last one shows or can be inverted
{
  const writes = [], h = setupHearts({ service: { figureHearts: async () => [{ figure: 'bou', hearts: 4, mine: true }], setFigureHeart: async (id, on) => { writes.push(on); return 1; } }, needConfirmed: (_, run) => run() });
  await h.load();
  assert(h.mine('bou'));
  h.forget();
  assert(!h.mine('bou') && h.count('bou') === null, 'at once, not after the identity read');
  // a tap right after, with the identity read still going: its save is the new account's and must land
  let saved; const slow = new Promise(r => { saved = r; }), done = [];
  const g = setupHearts({ service: { figureHearts: async () => [], setFigureHeart: async (id, on) => { done.push(on); await slow; return 1; } }, needConfirmed: (_, run) => run() });
  await g.load(); g.forget();
  const btn = { ownerDocument: { defaultView: { matchMedia: () => ({ matches: true }) } }, querySelector: () => ({ classList: { remove() {}, add() {} }, getBoundingClientRect: () => ({}) }), getBoundingClientRect: () => ({}), closest: () => null };
  g.tap({ id: 'bou' }, btn); await tick(); await tick();
  await g.load(); saved(); await tick(); await tick();
  assert.deepEqual(done, [true]); assert(g.mine('bou'), 'what the identity read ends with is only a load: the saved heart stays on');
}
// a tap shows at once, before the server answers; a refusal undoes it
{
  let answer; const seen = [], icon = { classList: { add: c => seen.push(c), remove() {} }, getBoundingClientRect: () => ({}) };
  const doc = { defaultView: { innerWidth: 400, matchMedia: () => ({ matches: true }) }, createElement: () => ({ style: {}, offsetWidth: 100, setAttribute() {}, remove() {} }), body: { append() {} } };
  const button = { ownerDocument: doc, getBoundingClientRect: () => ({ left: 10, width: 40, bottom: 50 }), closest: () => null, querySelector: () => icon };
  const h = setupHearts({ service: { figureHearts: async () => [{ figure: 'bou', hearts: 4, mine: false }], setFigureHeart: () => new Promise((ok, no) => { answer = { ok, no }; }) }, needConfirmed: (_, run) => run() });
  await h.load(); h.tap({ id: 'bou' }, button); await tick();
  assert(h.mine('bou')); assert.equal(h.count('bou'), 5, 'counted before the answer'); assert(seen.includes('sel-heart-pop'), 'the burst too');
  answer.ok(5); await tick(); assert(h.mine('bou')); assert.equal(h.count('bou'), 5);
  seen.length = 0; h.tap({ id: 'bou' }, button); await tick();
  assert(!h.mine('bou')); assert.equal(h.count('bou'), 4); assert.equal(seen.length, 0, 'taking it back: no burst');
  answer.no(new Error('down')); await tick(); assert(h.mine('bou'), 'refused: it was never taken back'); assert.equal(h.count('bou'), 5);
  h.reload();
}
