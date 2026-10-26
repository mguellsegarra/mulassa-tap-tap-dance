// «Música en pausa»: back from another app or tab with the menu's sound still stopped (iOS waits for a tap), a card says so and
// any tap on it wakes the sound; it stays away when the sound came back, in a run, or when the menu is silent anyway.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const src = readFileSync(new URL('../../src/ui/audio-resume.js', import.meta.url), 'utf8').replace(/^import .*;\n/gm, '').replace(/^export /gm, '');
const on = {}, card = { open: false, showModal() { this.open = true; }, close() { if (!this.open) return; this.open = false; on.close?.(); }, addEventListener: (k, f) => { on[k] = f; } };
let wakes = 0, suspends = 0, stateChange = null;
const reports = [], later = [];
const chip = { menuMusic: true, wake() { wakes++; }, suspend() { suspends++; chip.ctx.state = 'suspended'; },
  ctx: { state: 'suspended', currentTime: 5, addEventListener: (_, f) => { stateChange = f; }, removeEventListener: () => { stateChange = null; } } };
Object.defineProperty(chip, 'running', { get: () => chip.ctx.state === 'running' });
const ctx = { G: { state: 'select', activityEpoch: 0 }, chip, setTimeout: (f, ms) => { assert.equal(ms, 700); later.push(f); }, focusIn() {},
  errors: { report: (kind, tags) => reports.push([kind, tags.state]) }, document: { hidden: false, getElementById: id => (id === 'audio-resume-menu' ? card : null) } };
vm.runInNewContext(src + '\nthis.offer = offerAudioResume;', ctx);
const back = (played = 0) => { ctx.offer(); chip.ctx.currentTime += played; later.splice(0).forEach(f => f()); }; // returning, then 700 ms

back();
assert.equal(card.open, true, 'the selector came back silent: the card shows');
assert.deepEqual(reports.at(-1), ['audio-not-back', 'suspended'], 'and tells the error reports in which state');
on.click(); // a tap on the card or its backdrop
assert.deepEqual([wakes, card.open], [1, false], 'any tap wakes the sound inside the gesture and closes the card');

back(); assert.equal(card.open, true);
chip.ctx.state = 'running'; stateChange();
assert.equal(card.open, false, 'the sound came back by itself: the card goes away');
assert.equal(stateChange, null, 'and stops listening');

back(0.7); assert.equal(card.open, false, 'running and its clock moved: no card');
back(0);
assert.equal(card.open, true, '`running` with its clock standing still: the card shows');
assert.deepEqual([suspends, chip.ctx.state], [1, 'suspended'], 'suspended, so the tap\'s wake() really restarts it');
on.click(); chip.ctx.state = 'suspended';

ctx.G.state = 'play'; back(); assert.equal(card.open, false, 'a run has its own pause menu');
ctx.G.state = 'select'; chip.menuMusic = false; back(); assert.equal(card.open, false, 'the menu sound is off: nothing to resume');
chip.free = true; back(); assert.equal(card.open, true, 'free play keeps the plaça sound with the music off');
on.click(); chip.ctx.state = 'suspended';
ctx.offer(); ctx.G.activityEpoch++; later.splice(0).forEach(f => f());
assert.equal(card.open, false, 'left again before the check: no card');
ctx.offer(); ctx.document.hidden = true; later.splice(0).forEach(f => f());
assert.equal(card.open, false, 'hidden at the check: no card');
console.log('«Música en pausa»: shown when the sound stays stopped or frozen, any tap resumes, gone when it comes back');
