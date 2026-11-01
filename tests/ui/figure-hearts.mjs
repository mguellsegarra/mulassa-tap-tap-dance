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
console.log('figure hearts ok');
