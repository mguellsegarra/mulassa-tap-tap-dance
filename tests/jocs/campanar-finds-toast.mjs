// Campanar (POC): a find in play (bands.js over Plassa's toastDiscovery). One toast at a time: a new one takes the place of
// the one showing, never queued; «NOU» and rays only the first time; two pieces on one floor toast the rarer, the other
// stays new for the collection; the band shows each piece once, icons only; the run's end clears the toast at once and
// toasts nothing, so nothing covers the end's words and buttons.
import assert from 'node:assert/strict';

// a DOM just big enough: elements, a class list, the few tags the markup uses (innerHTML parsed, self-closing paths too)
class El {
  constructor(tag) { Object.assign(this, { tagName: tag.toUpperCase(), children: [], parent: null, className: '', hidden: false, attrs: {}, text: '' }); this.style = { setProperty: (k, v) => { this.style[k] = v; } }; }
  get firstChild() { return this.children[0] ?? null; }
  get lastChild() { return this.children.at(-1) ?? null; }
  get isConnected() { return this.parent?.isConnected ?? this === document.body; }
  get classList() { const set = new Set(this.className.split(' ').filter(Boolean)); return { add: c => { set.add(c); this.className = [...set].join(' '); }, remove: c => { set.delete(c); this.className = [...set].join(' '); }, toggle: (c, on) => (on ? set.add(c) : set.delete(c), this.className = [...set].join(' ')), contains: c => set.has(c) }; }
  set textContent(t) { this.children = []; this.text = t; }
  get textContent() { return this.text + this.children.map(c => c.textContent).join(''); }
  set innerHTML(html) {
    this.children = [];
    let at = this;
    for (const [, close, tag, attrs, self] of html.matchAll(/<(\/?)([a-z]+)([^>]*?)(\/?)>/g)) {
      if (close) { at = at.parent; continue; }
      const el = new El(tag);
      el.className = /class="([^"]*)"/.exec(attrs)?.[1] ?? '';
      at.append(el);
      if (!self) at = el;
    }
  }
  append(...els) { for (const e of els) { e.parent?.children.splice(e.parent.children.indexOf(e), 1); e.parent = this; this.children.push(e); } }
  replaceChildren(...els) { this.children = []; this.append(...els); }
  remove() { this.parent?.children.splice(this.parent.children.indexOf(this), 1); this.parent = null; }
  setAttribute(k, v) { this.attrs[k] = v; }
  all(cls) { return [...(this.className.split(' ').includes(cls) ? [this] : []), ...this.children.flatMap(c => c.all(cls))]; }
}
const timers = [];
Object.assign(globalThis, {
  document: { body: new El('body'), createElement: t => new El(t), createElementNS: (_, t) => new El(t) },
  Image: class extends El { constructor() { super('img'); } },
  setTimeout: (fn, ms) => timers.push({ fn, ms }) && timers.length, clearTimeout: id => { if (timers[id - 1]) timers[id - 1].fn = () => {}; },
  localStorage: { m: new Map(), getItem(k) { return this.m.get(k) ?? null; }, setItem(k, v) { this.m.set(k, v); }, removeItem(k) { this.m.delete(k); } },
});
const flush = () => { for (const t of timers.splice(0)) t.fn(); }; // every pending timer, once
const { createBands } = await import('../../src/jocs/games/campanar/bands.js');
const { createPieces } = await import('../../src/jocs/games/campanar/pieces.js');

const toasts = () => document.body.all('discovery-toast');
const right = new El('div'), pieces = createPieces(), bands = createBands(new El('div'), right, pieces);
pieces.reset();
bands.reset();

bands.found(['A1'], 5);
assert.equal(toasts().length, 1);
assert.match(toasts()[0].textContent, /^NOUÒcul/, 'a first find: its badge and name');
assert.equal(toasts()[0].all('discovery-rays').length, 1, 'and its rays');

bands.found(['F1', 'B5'], 9); // a string course's two gargoyles at once, the rarer first
assert.equal(toasts().length, 1, 'never two: the new one replaces it at once');
assert.match(toasts()[0].textContent, /Gàrgola de drac/, 'the rarer one gets the toast');
assert.equal(right.children.length, 3, 'both in the band all the same, icons only');
assert(right.children.every(c => c.className === 'orb'), 'no name pills');
pieces.reset();
assert.deepEqual(pieces.find('B5', 1), { first: true }, 'the one without a toast is still new');
assert.deepEqual(pieces.find('F1', 1), { first: false }, 'the one shown is not');

// the next run: a piece seen before comes back without badge nor rays; a piece found twice in a run joins once
pieces.reset();
bands.reset();
assert.equal(toasts().length, 0, 'a new run starts clear');
bands.found(['F1'], 9);
bands.found(['F1'], 30);
assert.equal(right.children.length, 1);
assert.doesNotMatch(toasts()[0].textContent, /NOU/);
assert.equal(toasts()[0].all('discovery-rays').length, 0);
flush();
flush(); // its fade, then gone
assert.equal(toasts().length, 0, 'it goes by itself');

// the end: the toast showing goes at once, and the crown's finds settling after it toast nothing
bands.found(['A6'], 40);
bands.over();
assert.equal(toasts().length, 0, 'nothing over the end');
bands.found(['D1'], 60);
assert.equal(toasts().length, 0);
pieces.reset();
assert.deepEqual(pieces.find('D1', 1), { first: true }, 'an end find stays new for the collection');
console.log('campanar finds toast ok');
