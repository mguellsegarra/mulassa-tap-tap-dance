// Back from another app or tab with the menu's sound still stopped (iOS waits for a tap): no card, the next tap anywhere wakes
// it; nothing waits when the sound came back, in a run, or when the menu is silent anyway.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const src = readFileSync(new URL('../../src/ui/audio-resume.js', import.meta.url), 'utf8').replace(/^import .*;\n/gm, '').replace(/^export /gm, '');
let wakes = 0, suspends = 0, focus = true;
const reports = [], later = [], on = {};
// Like Chip.wake(): refused without focus, and only a stopped context resumes (a `running` one is just unhushed)
const chip = { menuMusic: true, suspend() { suspends++; chip.ctx.state = 'suspended'; },
  wake() { if (!focus) return; wakes++; if (chip.ctx.state !== 'running') chip.ctx.state = 'running'; }, ctx: { state: 'suspended', currentTime: 5 } };
Object.defineProperty(chip, 'running', { get: () => chip.ctx.state === 'running' });
const ctx = { G: { state: 'select', activityEpoch: 0 }, chip, setTimeout: (f, ms) => { assert.equal(ms, 700); later.push(f); },
  errors: { report: (kind, tags) => reports.push([kind, tags.audioState]) }, document: { hidden: false },
  addEventListener: (ev, f, o) => { assert.equal(o.capture, true); on[ev] = f; } };
vm.runInNewContext(src + '\nthis.check = checkAudioBack; this.stalled = audioStalled;', ctx);
assert.deepEqual(Object.keys(on), ['touchend', 'click', 'keydown'], 'taps and keys are heard from the import on, ahead of the sheets\' handlers');
const back = (played = 0) => { ctx.check(); chip.ctx.currentTime += played; later.splice(0).forEach(f => f()); }; // returning, then 700 ms
const tap = (ev = 'touchend') => on[ev]();

tap(); assert.equal(wakes, 0, 'no stopped sound: a tap wakes nothing here');
back();
assert.deepEqual(reports.at(-1), ['audio-not-back', 'suspended'], 'the selector came back silent: reported with its state');
back(); assert.equal(reports.length, 1, 'already waiting: no second report');
focus = false; tap();
assert.equal(chip.running, false, 'the tap that gives focus back (another Safari tab) is refused');
focus = true; tap('keydown');
assert.deepEqual([wakes, chip.running], [1, true], 'the next tap or key wakes it');
tap(); assert.equal(wakes, 1, 'once it plays, taps no longer touch it');

chip.ctx.state = 'suspended'; back(); // waiting, then left again without a tap, and back with a frozen `running` context
chip.ctx.state = 'running'; ctx.G.activityEpoch++; back(0);
assert.deepEqual([suspends, chip.ctx.state], [1, 'suspended'], 'frozen while `running`: suspended even if a tap was already awaited');
tap(); assert.equal(chip.running, true, 'so the tap\'s wake() really restarts it');
chip.ctx.state = 'running'; back(0.7); tap(); assert.equal(wakes, 2, 'running and its clock moved: nothing waits');

chip.ctx.state = 'suspended';
ctx.G.state = 'play'; back(); tap(); assert.equal(wakes, 2, 'a run has its own pause menu');
ctx.G.state = 'select'; chip.menuMusic = false; back(); tap(); assert.equal(wakes, 2, 'the menu sound is off: nothing to resume');
chip.free = true; back(); tap(); assert.equal(wakes, 3, 'free play keeps the plaça sound with the music off');
tap(); chip.ctx.state = 'suspended'; // the next tap finds it playing and stops waiting
ctx.check(); ctx.G.activityEpoch++; later.splice(0).forEach(f => f()); tap(); tap();
assert.equal(wakes, 3, 'left again before the check: nothing waits');
ctx.check(); ctx.document.hidden = true; later.splice(0).forEach(f => f()); tap(); tap();
assert.equal(wakes, 3, 'hidden at the check: nothing waits');
chip.ctx.state = 'running'; tap(); ctx.stalled(); // on the menu, the loop's clock froze without leaving (AirPods)
assert.deepEqual([reports.at(-1), chip.ctx.state], [['menu-audio-stalled', 'running'], 'suspended'], 'reported and suspended');
tap(); assert.equal(chip.running, true, 'the next tap wakes it');
// A blur with the page on screen (Android's address bar): our own suspend, no report, but a tap still wakes it
{
  const before = reports.length;
  ctx.document.hidden = false; tap(); // the case above left the page hidden, and still waiting
  const woke = wakes;
  chip.ctx.state = 'suspended'; ctx.check(true); later.splice(0).forEach(f => f());
  assert.equal(reports.length, before, 'the blur is not reported as sound that failed to come back');
  tap(); assert.deepEqual([wakes, chip.running], [woke + 1, true], 'the next tap wakes it');
  tap();
  chip.ctx.state = 'suspended'; ctx.check(true); later.splice(0).forEach(f => f());
  back(); assert.deepEqual(reports.at(-1), ['audio-not-back', 'suspended'], 'a real return that stays silent after it is still reported');
  assert.equal(reports.length, before + 1);
}
console.log('Sound back from another app: no card, the next tap anywhere wakes it when it stayed stopped or frozen');
