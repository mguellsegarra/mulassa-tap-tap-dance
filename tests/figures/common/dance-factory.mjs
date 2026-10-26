// Independent pre-refactor captures, generated before changing either choreography, including the default feet.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { gunzipSync } from 'node:zlib';
import { makeDance, dancePose, newPose } from '../../../src/game/dance.js';
import { makeDracDance, dracPose, newDracPose, ARRANGEMENT as DRAC_ARR, END_BEAT as DRAC_END } from '../../../src/figures/drac/dance-drac.js';
import { makeDracFeet, dracFeet, newDracFeet } from '../../../src/figures/drac/drac-feet.js';
import { buildDrac } from '../../../src/figures/drac/drac.js';
import { poseDrac } from '../../../src/figures/drac/drac-motion.js';
import { createTransport } from '../../../tools/dev/music-editor/preview/transport.js';
import { timeAtBeat, beatAtTime } from '../../../src/core/beat-grid.js';

const fixture = JSON.parse(gunzipSync(readFileSync(new URL('fixtures/dance-before-factories.json.gz', import.meta.url))));
// The Drac's song now follows the score (a new choreography): its capture is retired, the factory must match today's default.
fixture.drac = { arrangement: DRAC_ARR, end: DRAC_END, samples: fixture.drac.samples.map(([b]) => [b, { ...dracPose(newDracPose(), b) }]) };
const same = (actual, expected, label) => {
  for (const key of Object.keys(expected)) assert(actual[key] === expected[key], `${label}: ${key} ${actual[key]} !== ${expected[key]}`); // JSON normalises -0
};
let seed = 0x47a34;
const random = () => ((seed = (1664525 * seed + 1013904223) >>> 0) / 2 ** 32);
for (const [id, make, baseline, create] of [['mulassa', makeDance, dancePose, newPose], ['drac', makeDracDance, dracPose, newDracPose]]) {
  const captured = fixture[id], instance = make(captured), out = create();
  for (const [beat, expected] of captured.samples) {
    same(baseline(out, beat), expected, `${id} default at ${beat}`);
    same(instance.pose(out, beat), expected, `${id} factory at ${beat}`);
  }
  // The compiled timeline also includes intro at zero. That representation must be identical too.
  const intro = make({ arrangement: [[0, 'intro'], ...captured.arrangement], end: captured.end });
  for (const [beat, expected] of captured.samples) same(intro.pose(out, beat), expected, `${id} explicit intro at ${beat}`);
  const keys = Object.keys(create()).filter(k => typeof out[k] === 'number' && k !== 'beat'), maximum = Object.fromEntries(keys.map(k => [k, 0]));
  const step = 1 / 128, prev = create();
  baseline(prev, -8);
  for (let beat = -8 + step; beat <= captured.end + 16; beat += step) {
    baseline(out, beat);
    for (const key of keys) maximum[key] = Math.max(maximum[key], Math.abs(out[key] - prev[key]) / step);
    Object.assign(prev, out);
  }
  const labels = [...captured.arrangement.map(row => row[1]), 'A', 'B8', 'unknown', 'intro'];
  for (let trial = 0; trial < 12; trial++) {
    let end = 0;
    const arrangement = Array.from({ length: 12 }, () => {
      const row = [end, labels[Math.floor(random() * labels.length)]];
      end += [0.25, 0.5, 1, 3, 8, 16, 32][Math.floor(random() * 7)];
      return row;
    });
    const dance = make({ arrangement, end });
    dance.pose(prev, -8);
    for (let beat = -8 + step; beat <= end + 20; beat += step) {
      dance.pose(out, beat);
      for (const key of keys) {
        assert(Number.isFinite(out[key]), `${id} edited ${key} finite`);
        assert(Math.abs(out[key] - prev[key]) / step <= maximum[key] + 1e-9, `${id} edited ${key} exceeds today's speed at ${beat}`);
      }
      Object.assign(prev, out);
    }
    for (const [beat] of arrangement) {
      dance.pose(prev, beat - 1e-8); dance.pose(out, beat + 1e-8);
      for (const key of keys) assert(Math.abs(out[key] - prev[key]) <= maximum[key] * 2e-8 + 1e-9, `${id} jumps at section ${beat}`);
    }
    for (let i = 0; i < 30; i++) {
      const beat = random() * end, expected = { ...dance.pose(out, beat) };
      dance.pose(out, random() * end); baseline(out, random() * captured.end);
      same(dance.pose(out, beat), expected, `${id} seek ${beat}`);
    }
  }
  for (const label of labels) {
    const only = make({ arrangement: [[0, label]], end: 0.5 });
    for (const beat of [-10, 0, 0.25, 0.5, 2, 100]) for (const key of keys) assert(Number.isFinite(only.pose(out, beat)[key]), `${id} single ${label}`);
  }
}
// Repeated sections carry their own turns and set pieces, rather than continuing a single song's absolute cues.
for (const [make, create, label] of [[makeDance, newPose, 'C'], [makeDracDance, newDracPose, 'D3']]) {
  const repeated = make({ arrangement: [[0, label], [32, label], [64, 'roll']], end: 68 }), p = create();
  assert(Math.abs(repeated.pose(p, 32).yaw - 4 * Math.PI) < 0.02, `${label} first two turns`);
  assert(Math.abs(repeated.pose(p, 64).yaw - 8 * Math.PI) < 0.02, `${label} repeats its two turns`);
}
{
  const repeated = makeDracDance({ arrangement: [[0, 'C'], [16, 'B'], [30, 'C'], [46, 'roll']], end: 50 }), p = newDracPose();
  assert(repeated.pose(p, 10).rear > 0.95 && repeated.pose(p, 40).rear > 0.95, 'each C carries its rear from local beat 8');
  assert(repeated.pose(p, 23).rear < 0.01, 'the middle B does not borrow C from the absolute baseline');
}
const baselineFeet = makeDracFeet(makeDracDance(fixture.drac), fixture.drac.end);
for (const [beat, expected] of fixture.feet) {
  const actual = dracFeet(newDracFeet(), beat, false, 0.7);
  const factory = baselineFeet(newDracFeet(), beat, false, 0.7);
  for (let i = 0; i < 2; i++) same(factory[i], actual[i], `factory foot ${i} at ${beat}`);
}

// An edited foot plan must plant against that instance's path, even when a second rig uses another timeline.
const edited = { arrangement: [[0, 'intro'], [2, 'D3'], [10, 'B'], [17, 'C3'], [25, 'E'], [32, 'D3'], [40, 'roll']], end: 44 };
const dance = makeDracDance(edited), feet = makeDracFeet(dance, edited.end), pose = newDracPose(), rig = buildDrac();
const alternate = makeDracDance({ arrangement: [[0, 'B'], [9, 'roll']], end: 13 });
const alternateFeet = makeDracFeet(alternate, 13), alternateRig = buildDrac();
const corner = new THREE.Vector3(), previous = Array.from({ length: 2 }, () => new THREE.Vector3());
const wasDown = [false, false], touched = [0, 0];
for (let beat = 0; beat < edited.end + 4; beat += 1 / 128) {
  dance.pose(pose, beat); poseDrac(rig, pose, 0.7, feet); rig.root.updateMatrixWorld(true);
  for (let i = 0; i < 2; i++) {
    corner.set(0.21, 0, 0.43).applyMatrix4(rig.legs[i].shoe.matrixWorld);
    assert(corner.y >= -1e-9, `edited foot underground at ${beat}`);
    const down = Math.abs(corner.y) < 1e-9;
    if (down && wasDown[i]) assert(corner.distanceTo(previous[i]) < 1e-8, `edited planted shoe slides at ${beat}`);
    if (down && !wasDown[i]) touched[i]++;
    previous[i].copy(corner); wasDown[i] = down;
  }
  alternate.pose(pose, beat); poseDrac(alternateRig, pose, 0, alternateFeet);
}
assert(touched.every(n => n > 20), 'edited feet take real steps');
const saved = JSON.stringify(feet(newDracFeet(), 15.3, false, 0.7));
alternateFeet(newDracFeet(), 7, false); feet(newDracFeet(), 1, false);
assert.equal(JSON.stringify(feet(newDracFeet(), 15.3, false, 0.7)), saved, 'instance foot plans are seekable and independent');

// AudioContext test double: advance the AUDIO clock and run the scheduling callback. Wall time does not drive a beat.
const callbacks = new Map(), originalInterval = globalThis.setInterval, originalClear = globalThis.clearInterval;
let serial = 0;
globalThis.setInterval = fn => { const id = ++serial; callbacks.set(id, fn); return id; };
globalThis.clearInterval = id => callbacks.delete(id);
const voices = [], buffers = [];
const param = () => ({ setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {}, cancelScheduledValues() {} });
const audio = {
  currentTime: 0, destination: {}, resume: async () => {}, createPeriodicWave: () => ({}),
  createGain: () => ({ gain: param(), connect() {}, disconnect() {} }),
  createOscillator() { const v = { frequency: param(), setPeriodicWave() {}, connect() {}, disconnect() {}, start(t) { this.startTime = t; }, stop(t) { this.stopTime = t; } }; voices.push(v); return v; },
  createBufferSource() { const s = { connect() {}, disconnect() {}, start(t, offset) { this.startTime = t; this.offset = offset; }, stop() { this.stopped = true; } }; buffers.push(s); return s; },
};
try {
  const timeline = { beats: [0.1, 0.6, 1.2, 1.65, 2.1, 2.55], end: 4, melody: [[0, 1, 60], [1, 1, 64], [2, 1, 67], [3, 1, 72]] };
  const transport = createTransport(audio), ticks = [], off = transport.onTick((sec, beat) => ticks.push([sec, beat]));
  transport.load(timeline); await transport.play();
  assert(transport.playing); assert.equal(callbacks.size, 1);
  assert(voices.some(v => v.startTime === 0.1), 'melody scheduled ahead');
  audio.currentTime = 0.4;
  assert.equal(transport.time(), 0.4); assert.equal(transport.beat(), beatAtTime(timeline.beats, 0.4));
  transport.seek(0.8); assert.equal(transport.time(), 0.8);
  assert(voices.some(v => v.startTime === 0.4), 'seek resumes the remainder of a sounding melody note');
  transport.pause(); const held = transport.time(); audio.currentTime += 5;
  assert.equal(transport.time(), held); assert.equal(callbacks.size, 0); assert(!transport.playing);
  transport.setLoop(0.6, 1.2); transport.seek(0.6); await transport.play();
  const origin = audio.currentTime;
  for (const delta of [0.01, 0.45, 0.55, 0.65, 1.4, 5]) {
    audio.currentTime = origin + delta; for (const fn of callbacks.values()) fn();
    const expected = 0.6 + delta % 0.6;
    assert(Math.abs(transport.time() - expected) < 1e-12, `loop time ${delta}`);
    assert(Math.abs(transport.beat() - beatAtTime(timeline.beats, expected)) < 1e-12);
  }
  transport.setLoop(0, null); transport.pause();
  assert(ticks.length > 6); off(); const before = ticks.length; transport.seek(0); assert.equal(ticks.length, before);
  transport.load(timeline, { duration: timeAtBeat(timeline.beats, 5) });
  transport.seek(0.8); await transport.play(); assert.equal(buffers.at(-1).offset, 0.8);
  transport.setLoop(0.6, 1.2); assert(buffers.at(-2).stopped); assert.equal(buffers.at(-1).loopStart, 0.6); assert.equal(buffers.at(-1).loopEnd, 1.2);
  transport.pause(); assert(buffers.at(-1).stopped); assert.equal(callbacks.size, 0);
  // A pending resume must not resurrect playback after a pause or load.
  let resume;
  audio.resume = () => new Promise(resolve => { resume = resolve; });
  const pending = transport.play(); transport.pause(); resume(); await pending; assert(!transport.playing);
} finally { globalThis.setInterval = originalInterval; globalThis.clearInterval = originalClear; }
console.log('dance factories ok: exact baseline, edited continuity, deterministic seeks, planted edited feet, audio transport');
