// Mulassa Pop's lost GPU (gpu-guard.js): a loss pauses the run; back within 5 s on screen, the game goes on; never back,
// the error card; time hidden does not count (the browser may restore it once the page is back).
import assert from 'node:assert/strict';

const timers = [];
globalThis.setTimeout = (f, ms) => { timers.push({ f, ms }); return timers.length; };
globalThis.clearTimeout = id => { if (timers[id - 1]) timers[id - 1].f = null; };
const fire = () => { const t = timers.splice(0).filter(x => x.f); for (const x of t) x.f(); return t.length; };
globalThis.document = { hidden: false };
const { guardGpu } = await import('#plassa/gpu-guard.js');

const canvas = () => { const c = new EventTarget(); c.lose = () => c.dispatchEvent(new Event('webglcontextlost', { cancelable: true })); c.back = () => c.dispatchEvent(new Event('webglcontextrestored')); return c; };
const log = [];
const board = canvas(), hero = canvas();
guardGpu([board, hero], { lost: c => log.push(['lost', c === board]), restored: c => log.push(['restored', c === board]), dead: () => log.push(['dead']) });

const ev = new Event('webglcontextlost', { cancelable: true });
board.dispatchEvent(ev);
assert.ok(ev.defaultPrevented, 'the browser is asked to restore it');
board.back();
fire();
assert.deepEqual(log.splice(0), [['lost', true], ['restored', true]], 'back in time: no error card');

board.lose(); hero.lose(); hero.back();
fire();
assert.deepEqual(log.splice(0), [['lost', true], ['lost', false], ['restored', false], ['dead']], 'one canvas still lost after 5 s: the card');

board.back();
board.lose();
document.hidden = true;
fire();
assert.deepEqual(log.splice(0), [['restored', true], ['lost', true]], 'hidden: it waits');
document.hidden = false;
fire();
assert.deepEqual(log.splice(0), [['dead']], 'on screen again and still lost: the card');
console.log('pop gpu guard: pause on loss, back in time, a card when it never comes back, hidden time ignored ok');
