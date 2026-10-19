// iOS Low Power Mode caps Safari's rAF at 30 Hz (WebKit AnimationFrameRate.cpp: LowPowerMode is a half-speed reason,
// 30 fps, animation frame rates ignored while throttled). The quality monitor must not read that cap as slow frames,
// while still telling it apart from a device that really misses its frames. Synthetic rAF deltas, no browser.
import assert from 'node:assert/strict';
import { frameMonitor, framePacer } from '../src/platform/render-quality.js';

let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647; // repeatable jitter
const V60 = 1000 / 60;
// frames: [ms, play] pairs; every frame lands on a 60 Hz vsync (± jitter, as rAF timestamps do)
const frames = (s, { every = 2, miss = 0, jitter = 0.6, play = true, missBy = 1 } = {}) => {
  const out = [];
  for (let t = 0; t < s * 1000;) {
    const ms = (rnd() < miss ? every + missBy : every) * V60 + (rnd() * 2 - 1) * jitter;
    out.push([ms, play]); t += ms;
  }
  return out;
};
const lpm = (s, o) => frames(s, { every: 2, ...o }); // the 30 Hz cap: every other vsync
const at60 = (s, o) => frames(s, { every: 1, ...o });
const steps = (...parts) => { const got = [], m = frameMonitor(k => got.push(k)); for (const [ms, play] of parts.flat()) m(ms, play); return got; };
// the boot as WebKit drew it (/tmp/mulassa-stutter webkit-full-summary.json: 410, 167, 82, 68 ms gaps)
const boot = [[167, false], [410, false], [68, false], [82, false]];

const failures = [];
const check = (name, fn) => { try { fn(); } catch (e) { failures.push(`${name}: ${e.message.split('\n')[0]}`); } };

check('Low Power Mode, menus then a song: one step at most, never two (was medium → minimal at once)', () =>
  assert.deepEqual(steps(boot, lpm(20, { play: false }), lpm(100)), [1]));
check('Low Power Mode with rough timestamps (±1.5 ms): the same', () =>
  assert.deepEqual(steps(lpm(60, { jitter: 1.5 })), [1]));
check('Low Power Mode, a rare missed refresh (2%): no step past the one', () =>
  assert.deepEqual(steps(lpm(90, { miss: 0.02 })), [1]));
check('Low Power Mode, really missing its 30 Hz refreshes (25%): steps down', () =>
  assert(steps(lpm(30, { miss: 0.25 })).length >= 2, 'judged against 30, the misses still count'));
check('Low Power Mode and far too slow even for 30 (66+ ms): two steps at once', () =>
  assert.equal(steps(frames(12, { every: 4 }))[0], 2));
check('Low Power Mode, hitching in play (5 frames of 120 ms within 3 s): a spike step', () => {
  const f = lpm(20); for (const i of [450, 465, 480, 495, 510]) f[i] = [120, true];
  assert(steps(f).length >= 2);
});
check('Low Power Mode, missed refreshes are no spikes (50 ms at 30 Hz is one refresh late)', () => {
  const f = lpm(20); for (let i = 200; i < 260; i += 10) f[i] = [50.4, true];
  assert.deepEqual(steps(f), [1]);
});
check('60 Hz smooth after the boot hitches: no step', () => assert.deepEqual(steps(boot, at60(60)), []));
check('60 Hz, 15% scattered misses: steps down as before', () => assert(steps(at60(30, { miss: 0.15 })).length >= 1));
check('60 Hz device too slow for 60, drawing an exact 33 ms: one step (the cap cannot be told apart), not two', () =>
  assert.deepEqual(steps(at60(3), frames(30, { every: 2, jitter: 0 })), [1]));
check('120 Hz paced to an even 60 (framePacer): no step', () => {
  const p = framePacer(), gaps = []; let last = 0;
  for (let t = 0; t < 30000; t += 1000 / 120) if (p(t)) { if (t) gaps.push([t - last, true]); last = t; }
  assert.deepEqual(steps(gaps), []);
});
for (const at of [1.3, 3.1, 4.9, 6.4, 8.8]) check(`60 → 30 Hz at ${at} s (Low Power Mode switched on): only the one step`, () =>
  assert.deepEqual(steps(at60(at), lpm(40)), [1]));
check('30 → 60 Hz: back to judging against 60 (misses at 60 step down again)', () =>
  assert(steps(lpm(20), at60(20), at60(20, { miss: 0.2 })).length >= 2));
check('30 → 60 Hz, smooth: nothing after the one step', () => assert.deepEqual(steps(lpm(20), at60(40)), [1]));
check('background gaps (hidden tab) in Low Power Mode: still one step, ever', () => {
  const gap = [[5000, false]], parts = [];
  for (let i = 0; i < 6; i++) parts.push(lpm(7), gap);
  assert.deepEqual(steps(...parts), [1]);
});
check('a gap resets the cap: a 60 Hz device that comes back missing frames steps down', () =>
  assert(steps(lpm(10), [[5000, false]], at60(20, { miss: 0.2 })).length >= 2));

if (failures.length) { console.error(failures.map(f => `FAIL ${f}`).join('\n')); process.exit(1); }
console.log('low-power: ok');
