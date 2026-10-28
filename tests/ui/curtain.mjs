// Free play's curtain: down first, the switch under it, up only once frames run smooth (or a cap); a later switch owns it.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const src = readFileSync(new URL('../../src/ui/curtain.js', import.meta.url), 'utf8').replace(/^export /gm, '');
const classes = new Set(), el = { id: '', setAttribute() {}, classList: { add: (...c) => c.forEach(x => classes.add(x)), remove: (...c) => c.forEach(x => classes.delete(x)) } };
let now = 0, timers = [], frames = [];
const coarse = { matches: false };
const ctx = { document: { createElement: () => el, body: { append() {} } }, matchMedia: q => q.includes('coarse') ? coarse : { matches: false }, performance: { now: () => now },
  setTimeout: (f, ms) => timers.push([now + ms, f]), requestAnimationFrame: f => frames.push(f) };
vm.runInNewContext(src + '\nthis.api = { curtain, curtainCover };', ctx);
const { curtain, curtainCover } = ctx.api;
const wait = ms => { now += ms; const due = timers.filter(t => t[0] <= now); timers = timers.filter(t => t[0] > now); due.forEach(t => t[1]()); };
const frame = ms => { now += ms; const f = frames; frames = []; f.forEach(g => g(now)); };

let swapped = 0;
curtain(() => swapped++);
assert(classes.has('down') && swapped === 0, 'down first, the switch waits for it to cover');
wait(90); assert.equal(swapped, 1, 'the switch runs under the curtain');
frame(130); frame(80); frame(16); frame(16); assert(classes.has('down'), 'stalled frames keep it down');
frame(16); assert(!classes.has('down'), 'three smooth frames lift it');

curtainCover(); assert(classes.has('now') && classes.has('down'), 'an outside fullscreen change covers at once');
for (let i = 0; i < 20; i++) frame(40); assert(classes.has('down'), 'still janky: still down');
for (let i = 0; i < 30; i++) frame(40); assert(!classes.has('down') && !classes.has('now'), 'the cap lifts it anyway');

curtain(() => {}); wait(90); frame(16); curtainCover(); for (let i = 0; i < 12; i++) frame(16);
assert(!classes.has('down'), 'a later change takes the curtain over and lifts it');
coarse.matches = true; swapped = 0;
curtain(() => swapped++); assert(swapped === 1 && !classes.has('down'), 'touch: the switch runs at once, no curtain');
curtainCover(); assert(!classes.has('down'), 'touch: a fullscreen change does not cover');
console.log('curtain ok');
