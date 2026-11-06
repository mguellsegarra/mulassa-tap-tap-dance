// The games' audio through the page's life (packages/plassa/src/page-audio.js): nothing reported before the first tap, a
// frozen clock stopped and woken by the next tap (or left to the run's pause), leaving pauses the run and fades out,
// a sound that does not come back is reported, and iOS's session follows what should sound.
import assert from 'node:assert/strict';

const timers = [];
globalThis.setTimeout = (f, ms) => { timers.push({ f, ms }); return timers.length; };
globalThis.clearTimeout = id => { if (timers[id - 1]) timers[id - 1].f = null; };
const fire = () => { for (const t of timers.splice(0).filter(x => x.f)) t.f(); };
const flush = () => new Promise(r => setImmediate(r));
let focused = true;
globalThis.document = Object.assign(new EventTarget(), { hidden: false, hasFocus: () => focused });
const win = new EventTarget();
globalThis.addEventListener = win.addEventListener.bind(win);
globalThis.matchMedia = () => ({ matches: true });
const session = { type: 'auto' };
Object.defineProperty(globalThis, 'navigator', { value: { audioSession: session, userActivation: { isActive: true } }, configurable: true });

const { errors } = await import('../src/errors.js');
const reports = [];
errors.report = kind => reports.push(kind);
const { createPageAudio } = await import('../src/page-audio.js');

const ctx = {
  state: 'suspended', currentTime: 0, destination: {}, sampleRate: 48000,
  resume() { this.state = 'running'; return Promise.resolve(); },
  suspend() { this.state = 'suspended'; return Promise.resolve(); },
  createBuffer: () => ({}), createBufferSource: () => ({ connect() {}, start() {} }),
};
const out = { gain: { value: 1, cancelScheduledValues() {}, setTargetAtTime(v) { this.value = v; } } };
let hearing = true, inRun = false;
const log = [];
const life = createPageAudio(ctx, out, { hearing: () => hearing, stall: () => inRun && log.push('pause') > 0 });

// before the first tap a refused context is not a stall
for (let t = 0; t <= 3000; t += 500) life.watch(t);
assert.deepEqual(reports, [], 'no report before the page was ever tapped');

life.gesture();
assert.equal(ctx.state, 'running', 'the first tap wakes it');
assert.equal(session.type, 'playback', 'something sounds: the playback session');

// running with its clock standing still (AirPods dropping out), on the home: stopped, reported once, the next tap wakes it
for (let t = 4000; t <= 5200; t += 400) life.watch(t);
fire();
assert.deepEqual(reports.splice(0), ['menu-audio-stalled']);
assert.equal(ctx.state, 'suspended', 'stopped, so a tap can restart it');
life.gesture();
assert.equal(ctx.state, 'running', 'the next tap wakes it');
life.gesture(); // the tap after it finds it running: back for good (as mulassa.cat's audio-resume.js)

// in a run the game handles it (its pause), nothing is reported
inRun = true;
for (let t = 6000; t <= 7200; t += 400) life.watch(t);
assert.deepEqual([log.splice(0), reports], [['pause'], []], 'a run pauses instead');

// leaving the page: a fade, the context stops; 'auto' while hidden
document.hidden = true;
document.dispatchEvent(new Event('visibilitychange'));
assert.equal(out.gain.value, 0, 'faded out');
fire();
assert.deepEqual([ctx.state, session.type], ['suspended', 'auto']);

// back, something should sound, iOS keeps it stopped: reported, then the next tap wakes it
inRun = false;
ctx.resume = function () { return Promise.resolve(); }; // refused without a tap
document.hidden = false;
document.dispatchEvent(new Event('visibilitychange'));
await flush();
fire();
assert.deepEqual(reports.splice(0), ['audio-not-back'], 'the sound that did not come back is reported');
ctx.resume = function () { this.state = 'running'; return Promise.resolve(); };
life.gesture();
assert.equal(ctx.state, 'running');

// nothing should sound (music off): iOS's ambient session, and a tap never starts the context (it would pause Spotify)
hearing = false;
life.hush(); fire();
life.gesture();
assert.deepEqual([ctx.state, session.type], ['suspended', 'ambient'], 'a silent page stays stopped on iOS');
console.log('page audio: no report before a tap, frozen clock stopped and woken, run pauses, leave fades, not-back reported, iOS session ok');
