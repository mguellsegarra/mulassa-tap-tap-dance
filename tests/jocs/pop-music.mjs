import test from 'node:test';
import assert from 'node:assert/strict';
import { MELODY, CHORDS, chordAt, LOOP_START, LOOP_END, SKIP_FROM, SKIP_TO } from '../../src/jocs/games/pop/melody.js';
import { createSequencer } from '../../src/jocs/games/pop/sequencer.js';
import { bpmFor, layersFor, createConductor, STEP, LEAD, BASE_BPM } from '../../src/jocs/games/pop/conductor.js';

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

test('each level opens at its own tempo (150, 165, 180) and rises by the same amount; the bell is a quarter slower', () => {
  assert.deepEqual([0, 1, 2].map(l => bpmFor(0, false, l)), [150, 165, 180]);
  assert.deepEqual(BASE_BPM, [150, 165, 180]);
  for (const l of [0, 1, 2]) {
    for (const s of [10, 60, 300]) assert.equal(bpmFor(s, false, l) - BASE_BPM[l], bpmFor(s) - 150);
    assert.ok(Math.abs(bpmFor(60, true, l) - bpmFor(60, false, l) * .75) < 1e-9);
    const first = createConductor(l);
    first.advance(.1);
    assert.equal(60 / first.take()[0].spb, BASE_BPM[l], `level ${l} plays its base tempo from the first step`);
  }
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
    createDynamicsCompressor: () => node({ threshold: param(), knee: param(), ratio: param(), attack: param(), release: param() }), createDelay: () => node({ delayTime: param() }),
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
  // the pads: the held voices, tagged by the sequencer
  const pads = ctx.started.filter(o => o.pad);
  assert.ok(pads.length > 50);
  for (const a of pads) for (const b of pads) if (b.t > a.t) assert.ok(b.t >= a.end - 1e-6, `pad at ${a.t} rings to ${a.end}, next chord at ${b.t}`);
});

// A phone's speaker (the Galaxy S10's) buzzed on low pure sines held together and on a sine lead: the pads sit from C4 up,
// nothing tonal goes under C3, and the lead is a triangle.
test('on a phone speaker: pads from C4 up, no tone under C3, a triangle lead', () => {
  const ctx = fakeCtx(), seq = createSequencer(ctx), tune = createConductor();
  seq.start();
  tune.setProgress(100, false);
  tune.advance(60);
  seq.play(tune.take(), t => t);
  const hz = m => 440 * 2 ** ((m - 69) / 12), tones = ctx.started.filter(o => o.frequency.value > 0); // the kick sweeps its own
  assert.ok(tones.filter(o => o.pad).every(o => o.frequency.value >= hz(60) - 1e-6));
  for (const o of tones) assert.ok(o.frequency.value >= hz(48) - 1e-6, `${o.frequency.value} Hz`);
  const first = hz(MELODY[0][2]), lead = tones.filter(o => !o.pad && o.frequency.value === first && o.t === tones[0].t); // the tune's first note
  assert.deepEqual(lead.map(o => o.type), ['triangle', 'sine']);
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

test('the conductor lays out the tune ahead of game time and keeps the audio\'s steps for it, each once', () => {
  const tune = createConductor();
  tune.advance(4);
  const steps = tune.take();
  assert.ok(steps.length >= 4 * bpmFor(0) / 60 / STEP && tune.take().length === 0, 'the steps go to the audio once');
});

test('the conductor says how many steps the game has reached, a LEAD early, each once', () => {
  const tune = createConductor(); // 150 BPM: a step every .2 s
  tune.advance(1);
  assert.equal(tune.due(-LEAD - .01), 0);
  assert.equal(tune.due(0), 1, 'the first step is due LEAD before it sounds');
  assert.equal(tune.due(0), 0);
  assert.equal(tune.due(.45), 2, 'the steps at .2 and .4, each LEAD early');
  assert.equal(tune.due(.85), 2, 'then .6 and .8');
});

test('the tempo follows the progression it is given, gliding, and the bell slows it', () => {
  const tune = createConductor();
  tune.setProgress(200, false);
  tune.advance(20);
  const spb = tune.take().map(s => s.spb);
  for (let k = 1; k < spb.length; k++) assert.ok(spb[k] <= spb[k - 1] + 1e-12, 'only faster');
  assert.ok(Math.abs(60 / spb.at(-1) - bpmFor(200)) < 1e-9, 'it reaches the target');
  tune.setProgress(200, true);
  tune.advance(40);
  assert.ok(Math.abs(60 / tune.take().at(-1).spb - bpmFor(200, true)) < 1e-9);
});

test('the bell drops the tempo at once and gives it back at once, then rises glide as before', () => {
  const tune = createConductor(), bpms = () => tune.take().map(s => 60 / s.spb);
  tune.setProgress(200, false);
  tune.advance(20);
  tune.take();
  tune.setProgress(200, true);
  tune.advance(20.5);
  assert.ok(Math.abs(bpms().at(-1) - bpmFor(200, true)) < 1e-9, 'slow within half a second');
  tune.setProgress(200, false);
  tune.advance(21);
  assert.ok(Math.abs(bpms().at(-1) - bpmFor(200)) < 1e-9, 'back up within half a second');
  tune.setProgress(400, false); // a progression rise, no bell: the slow glide again
  tune.advance(21.5);
  assert.ok(bpms().at(-1) < bpmFor(400) - 1, 'no jump on a score rise');
});

test('A plays once: from its first half straight on into the second\'s cadence, so B comes after 56 + 8 beats, then C, then A again', async () => {
  const { wrap } = await import('../../src/jocs/games/pop/conductor.js');
  const at = b => MELODY.filter(n => n[0] >= b && n[0] < b + 8).map(n => [n[0] - b, n[1], n[2]]);
  assert.deepEqual(at(SKIP_FROM - 8), at(SKIP_TO - 8), 'the two halves are one phrase before the jump: it is not heard');
  assert.equal(wrap(SKIP_FROM - .5), SKIP_FROM - .5);
  assert.equal(wrap(SKIP_FROM), SKIP_TO, 'on at the second half\'s cadence');
  assert.equal(chordAt(SKIP_TO), 'C', 'which lands A in major for B');
  assert.equal(wrap(LOOP_END), LOOP_START, 'after C, back to A');
  let pos = LOOP_START, beats = 0;
  while (pos < 144) { pos = wrap(pos + .5); beats += .5; }
  assert.equal(beats, 144 - LOOP_START - (SKIP_TO - SKIP_FROM), 'B after 64 beats of A, not 128');
});

for (const id of ['drac']) test(`the ${id}: a chord on every step of its loop, its notes inside it, and the very same step times as the Mulassa (the score never depends on the tune)`, async () => {
  const { SONGS } = await import('../../src/jocs/games/pop/songs.js');
  const { form, melody, chordAt: at } = SONGS[id];
  for (let b = form.loopStart; b < form.loopEnd; b += .5) assert.ok(CHORDS[at(b)], `${id} beat ${b}`);
  for (const [b, d] of melody) assert.ok(b >= form.loopStart && b + d <= form.loopEnd + 1e-9, `${id} note at ${b}`);
  const times = f => { const c = createConductor(1, f); c.setProgress(120, false); c.advance(400); return c.take().map(s => [s.t, s.spb]); };
  assert.deepEqual(times(form), times(SONGS.mulassa.form));
  const c = createConductor(0, form);
  c.advance(400);
  const pos = c.take().map(s => s.pos);
  assert.equal(pos[0], form.pickup);
  assert.ok(pos.some((p, i) => i && p < pos[i - 1]), 'it loops');
  assert.ok(pos.every(p => p >= form.loopStart && p < form.loopEnd));
});
