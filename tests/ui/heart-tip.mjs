// The ribbon that points at a playable figure's heart: once per figure, never over a sheet, never once the heart is given.
import assert from 'node:assert/strict';
import { setupHeartTip } from '../../src/ui/heart-tip.js';
const made = [], memory = new Map();
const node = () => ({ style: { setProperty() {} }, classList: { add() {}, remove() {}, toggle() {} }, setAttribute() {}, append(...c) { this.kids = c; }, addEventListener(k, f) { (this.fs ||= []).push(f); this.click = e => { for (const g of this.fs) g(e ?? { stopPropagation() {} }); }; }, remove() { made.splice(made.indexOf(this), 1); }, getBoundingClientRect: () => ({ left: 10, bottom: 10, width: 50 }) });
const heart = { ...node(), checkVisibility: () => true };
let root = null; const doc = { getElementById: id => id === 'select' || id === 'loader' ? root : heart, createElement() { return node(); }, body: { append(e) { made.push(e); } } };
let f = { id: 'mulassa' }, busy = false, mine = false, count = null;
const timers = []; globalThis.setTimeout = f => { timers.push(f); return timers.length; }; globalThis.clearTimeout = () => {};
const tip = setupHeartTip({ store: { get: k => memory.get(k), set: (k, v) => memory.set(k, v) }, figure: () => f, busy: () => busy, doc, win: { innerWidth: 400 },
  hearts: { count: () => count, mine: () => mine } });
tip.update(); assert.equal(made.length, 0, 'the totals not in yet: nothing');
count = 3; busy = true; tip.update(); assert.equal(made.length, 0, 'not over a sheet');
busy = false; tip.update(); assert.equal(made.length, 1, 'the first time');
tip.update(); assert.equal(made.length, 1, 'once');
f = { id: 'drac' }; tip.update(); assert.equal(made.length, 1, 'moving on: this one is seen, the next figure gets its own');
made[0].kids[1].click(); assert.equal(made.length, 0, 'closed');
f = { id: 'mulassa' }; tip.update(); assert.equal(made.length, 0, 'seen stays seen');
f = { id: 'bou' }; mine = true; tip.update(); assert.equal(made.length, 0, 'it already has the heart');
mine = false; tip.update(); assert.equal(made.length, 1); mine = true; tip.update(); assert.equal(made.length, 0, 'giving the heart takes it away');
f = { id: 'tap' }; mine = false; tip.update(); let tapped = 0; heart.click = () => tapped++; made[0].click({ stopPropagation() {} }); assert.equal(tapped, 1, 'tapping the ribbon taps the heart'); assert.equal(made.length, 0);
f = { id: 'solo' }; mine = false; tip.update(); assert.equal(made.length, 1); assert.equal(memory.get('heart-tip-solo'), '1', 'counted as soon as it shows: a reload does not bring it back');
timers.at(-1)(); assert.equal(made.length, 0, 'it goes by itself');
console.log('heart tip ok');
