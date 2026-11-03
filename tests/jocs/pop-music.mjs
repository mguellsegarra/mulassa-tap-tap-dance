import test from 'node:test';
import assert from 'node:assert/strict';
import { MELODY, CHORDS, chordAt, LOOP_START, LOOP_END } from '../../src/jocs/games/pop/melody.js';
import { createSequencer } from '../../src/jocs/games/pop/sequencer.js';
import { bpmFor, layersFor, createConductor, STEP } from '../../src/jocs/games/pop/conductor.js';

test('every beat of the loop has a known chord, and the tune stays on the eighth-note grid', () => {
  for (let b = LOOP_START; b < LOOP_END; b += .5) assert.ok(CHORDS[chordAt(b)], `beat ${b}`);
  for (const [b] of MELODY) assert.equal(b % .5, 0, `note at ${b}`);
});

test('the tempo only rises with the score, stays playable, and the bell slows it', () => {
  let last = 0;
  for (let s = 0; s <= 1000; s += 5) { assert.ok(bpmFor(s) > last); last = bpmFor(s); }
  assert.ok(bpmFor(0) >= 140 && bpmFor(1000) <= 180);
  assert.ok(bpmFor(50, true) < bpmFor(50));
});

test('voices only come in as the score grows', () => {
  const on = s => Object.values(layersFor(s)).reduce((a, b) => a + b);
  assert.equal(on(0), 0);
  for (let s = 0; s < 200; s++) assert.ok(on(s + 1) >= on(s));
  assert.equal(on(200), 4);
});

// A stand-in AudioContext that records when each oscillator sounds.
function fakeCtx() {
  const started = [];
  const param = () => ({ value: 0, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {}, setTargetAtTime() {} });
  const node = extra => ({ connect: x => x, ...extra });
  return {
    started, currentTime: 0, sampleRate: 100, destination: node(),
    createGain: () => node({ gain: param() }), createBiquadFilter: () => node({ frequency: param(), Q: param(), type: '' }),
    createDynamicsCompressor: () => node(), createDelay: () => node({ delayTime: param() }),
    createBuffer: () => ({ getChannelData: () => new Float32Array(10) }),
    createBufferSource: () => node({ start() {}, stop() {} }),
    createOscillator() {
      const o = node({ type: 'sine', frequency: param(), start(t) { o.t = t; started.push(o); }, stop(t) { o.end = t; } });
      return o;
    },
  };
}

test('the held harmony has stopped before the next chord starts, so two chords never ring together', () => {
  const ctx = fakeCtx(), seq = createSequencer(ctx), tune = createConductor();
  seq.start();
  tune.advance(300);
  seq.play(tune.take(), t => t);
  // the pads are the only voices in the octave under middle C held for more than a beat's fraction
  const pads = ctx.started.filter(o => o.pad);
  assert.ok(pads.length > 50);
  for (const a of pads) for (const b of pads) if (b.t > a.t) assert.ok(b.t >= a.end - 1e-6, `pad at ${a.t} rings to ${a.end}, next chord at ${b.t}`);
});

test('the tap can ask which note of the tune is sounding', () => {
  const ctx = fakeCtx(), seq = createSequencer(ctx), tune = createConductor();
  seq.start();
  tune.advance(4);
  seq.play(tune.take(), t => t + .05); // queued ahead of the clock: the clock decides, not the queue
  ctx.currentTime = 0.06;
  assert.equal(seq.noteNow(), MELODY[0][2]);
  ctx.currentTime = 3.9;
  const played = MELODY.filter(n => n[0] <= 12 + (3.9 - .05) * bpmFor(0) / 60).at(-1)[2];
  assert.equal(seq.noteNow(), played);
});

test('the conductor announces each note of the tune once, when game time reaches it, and keeps the audio\'s steps for it', () => {
  const tune = createConductor();
  tune.advance(.35);
  assert.equal(tune.due(-.01), 0);
  assert.equal(tune.due(0), 1, 'the pickup\'s first note at time 0');
  assert.equal(tune.due(0), 0, 'once');
  tune.advance(4);
  const beats = MELODY.filter(n => n[0] < 12 + 4 * bpmFor(0) / 60).length;
  assert.equal(1 + tune.due(4), beats);
  const steps = tune.take();
  assert.ok(steps.length >= 4 * bpmFor(0) / 60 / STEP && tune.take().length === 0, 'the steps go to the audio once');
});

test('the tempo follows the level it is given, gliding, and the bell slows it', () => {
  const tune = createConductor();
  tune.setLevel(200, false);
  tune.advance(20);
  const spb = tune.take().map(s => s.spb);
  for (let k = 1; k < spb.length; k++) assert.ok(spb[k] <= spb[k - 1] + 1e-12, 'only faster');
  assert.ok(Math.abs(60 / spb.at(-1) - bpmFor(200)) < 1e-9, 'it reaches the target');
  tune.setLevel(200, true);
  tune.advance(40);
  assert.ok(Math.abs(60 / tune.take().at(-1).spb - bpmFor(200, true)) < 1e-9);
});

test('the bell drops the tempo at once and gives it back at once, then rises glide as before', () => {
  const tune = createConductor(), bpms = () => tune.take().map(s => 60 / s.spb);
  tune.setLevel(200, false);
  tune.advance(20);
  tune.take();
  tune.setLevel(200, true);
  tune.advance(20.5);
  assert.ok(Math.abs(bpms().at(-1) - bpmFor(200, true)) < 1e-9, 'slow within half a second');
  tune.setLevel(200, false);
  tune.advance(21);
  assert.ok(Math.abs(bpms().at(-1) - bpmFor(200)) < 1e-9, 'back up within half a second');
  tune.setLevel(400, false); // a score rise, no bell: the slow glide again
  tune.advance(21.5);
  assert.ok(bpms().at(-1) < bpmFor(400) - 1, 'no jump on a score rise');
});
