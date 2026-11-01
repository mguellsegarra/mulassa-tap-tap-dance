// The ribbon that points at a playable figure's heart: once per figure, never over a sheet, never once the heart is given.
import assert from 'node:assert/strict';
import { setupHeartTip } from '../../src/ui/heart-tip.js';
const made = [], memory = new Map();
const node = () => ({ parentElement: { getBoundingClientRect: () => ({ width: 100 }), offsetWidth: 100 }, style: { setProperty() {} }, classList: { add() {}, remove() {}, toggle() {} }, setAttribute() {}, append(...c) { this.kids = c; }, addEventListener(k, f) { (this.fs ||= []).push(f); this.click = e => { for (const g of this.fs) g(e ?? { stopPropagation() {} }); }; }, remove() { made.splice(made.indexOf(this), 1); }, getBoundingClientRect: () => ({ left: 10, bottom: 10, width: 50 }) });
const heart = { ...node(), checkVisibility: () => true };
let root = null, sheet = null; const doc = { querySelector: () => sheet, getElementById: id => id === 'select' || id === 'loader' ? root : heart, createElement() { return node(); }, body: { append(e) { made.push(e); } } };
let f = { id: 'mulassa' }, busy = false, mine = false, count = null;
const timers = []; globalThis.setTimeout = (f, ms) => { timers.push({ f, ms }); return timers.length; }; globalThis.clearTimeout = () => {};
const settle = () => { for (const t of timers.splice(0)) if (t.ms < 1000) t.f(); else timers.push(t); }; // what is leaving has left; the 6 s stay pending
const expire = () => { for (const t of timers.splice(0)) t.f(); settle(); }; // its leaving animation and any spent timer
const tip = setupHeartTip({ store: { get: k => memory.get(k), set: (k, v) => memory.set(k, v) }, figure: () => f, busy: () => busy, doc, win: { innerWidth: 400 },
  hearts: { count: () => count, mine: () => mine } });
tip.update(); assert.equal(made.length, 0, 'the totals not in yet: nothing');
count = 3; busy = true; tip.update(); assert.equal(made.length, 0, 'not over a sheet');
busy = false; sheet = {}; tip.update(); assert.equal(made.length, 0, 'not under any open dialog, even one busy() does not list');
sheet = null; tip.update(); assert.equal(made.length, 1, 'the first time');
tip.update(); assert.equal(made.length, 1, 'once');
f = { id: 'drac' }; tip.update(); settle(); assert.equal(made.length, 1, 'moving on: this one is seen, the next figure gets its own');
made[0].click(); settle(); assert.equal(made.length, 0, 'a tap clears it');
assert.equal(heart.tapped ?? 0, 0, 'and gives no heart: only the heart does');
f = { id: 'mulassa' }; tip.update(); assert.equal(made.length, 0, 'seen stays seen');
f = { id: 'bou' }; mine = true; tip.update(); assert.equal(made.length, 0, 'it already has the heart');
mine = false; tip.update(); assert.equal(made.length, 0, 'taking a heart back does not bring the ribbon: this player knows the heart');
f = { id: 'bull' }; mine = false; tip.update(); assert.equal(made.length, 1); mine = true; tip.update(); settle(); assert.equal(made.length, 0, 'giving the heart takes it away');
mine = false; tip.update(); assert.equal(made.length, 0, 'and it stays away');
f = { id: 'solo' }; tip.update(); assert.equal(made.length, 1); assert.equal(memory.get('heart-tip-solo'), '1', 'counted as soon as it shows: a reload does not bring it back');
expire(); assert.equal(made.length, 0, 'it goes by itself');
console.log('heart tip ok');
