// Sync calibration maths and the first-game practice steps.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CAL, clickTimes, measureOffset, fmtMs, verdict, offsetDraft } from '../src/game/calibration.js';
import { Chip, Clicker } from '../src/platform/audio.js';
import { STEPS, buildStep, stepBeats, stepDone, stepPassed } from '../src/game/practice.js';
import { practiceText } from '../src/game/figure-theme.js';
import { WINDOWS } from '../src/game/progress.js';

const song = JSON.parse(readFileSync(new URL('../src/song.json', import.meta.url)));
const beat = 60 / song.bpm, clicks = clickTimes(5, CAL.clicks, CAL.beat); // the metronome has its own tempo
assert.equal(clicks.length, CAL.clicks);
assert(Math.abs(clicks[3] - clicks[2] - CAL.beat) < 1e-9, 'clicks one beat apart');
const jitter = [0.004, -0.006, 0.002, -0.003, 0.005, -0.001, 0.003, -0.004, 0, 0];
const tapsAt = lag => clicks.map((c, i) => c + lag + jitter[i]);

assert.equal(measureOffset(tapsAt(0.073), clicks), 73, 'the median lag, in ms');
assert.equal(measureOffset(tapsAt(-0.05), clicks), -50, 'early tappers get a negative offset');
assert.equal(measureOffset(tapsAt(0.3), clicks), 300, 'Bluetooth-sized lags still map to the right click');
const messy = tapsAt(0.08);
messy[0] += 0.2; messy[1] -= 0.1; // finding the pulse: ignored
messy[6] += 0.19; // one stray tap: dropped as an outlier
messy.push(messy[4] + 0.03); // a double tap: only the first counts
assert.equal(measureOffset(messy, clicks), 80, 'warm-up clicks, outliers and double taps are ignored');
assert.equal(measureOffset(tapsAt(0.07).slice(0, 5), clicks), null, 'too few taps: no measurement');
assert.equal(measureOffset([], clicks), null);
assert.equal(fmtMs(73), '+73 ms'); assert.equal(fmtMs(-20), '−20 ms'); assert.equal(fmtMs(0), '0 ms');

// The measured offset makes taps land PERFECTE: the game and the metronome subtract the same reported latency,
// so only the unreported delay (and the player's habit) goes into offsetMs, never counted twice.
const reported = 0.04, hidden = 0.09; // outputLatency the browser knows about / Bluetooth delay it doesn't
const ctx = { currentTime: 0, outputLatency: reported };
const clicker = Object.assign(Object.create(Clicker.prototype), { ctx });
const calTaps = clicks.map(c => { ctx.currentTime = c + reported + hidden; return clicker.heard(); }); // tap when heard
const offsetMs = measureOffset(calTaps, clicks);
assert.equal(offsetMs, 90, 'only the hidden delay is measured');
const chip = Object.assign(Object.create(Chip.prototype), { ctx, t0: 100 });
for (const note of [1.5, 10.25, 60]) {
  ctx.currentTime = chip.t0 + note + reported + hidden; // the note reaches the ears; the player taps right then
  const songTime = chip.now() - offsetMs / 1000; // as main.js songTime()
  assert(Math.abs(songTime - note) < 1e-9 && Math.abs(songTime - note) <= WINDOWS[2].perfect, 'calibrated taps are PERFECTE');
}
assert.match(verdict(8), /perfecte/); assert.match(verdict(-12), /perfecte/);
assert.match(verdict(73), /retard/); assert.match(verdict(-40), /abans/);
{ // the stored offset is written only on a real change: opening/closing the sheet never re-saves it (nor pops the toast)
  const writes = [], write = v => writes.push(v), d = offsetDraft(4);
  assert.equal(d.commit(write), false, 'open and close: nothing saved');
  d.set(14); d.set(4);
  assert.equal(d.commit(write), false, '+ then −: back to the same value, nothing saved');
  d.set(73);
  assert.equal(d.commit(write), true); assert.deepEqual(writes, [73], 'a changed value is saved once');
  assert.equal(d.commit(write), false, 'and not again on close');
  assert.deepEqual(writes, [73]);
}
console.log('sync calibration ok');

// Practice: GUA, PA, GUAPA, MANTÉN, GLOBUS, each on the beat grid, relaxed, and passable.
assert.deepEqual(STEPS.map(s => s.word), ['GUA', 'PA', 'GUAPA', 'MANTÉN', 'GLOBUS']);
let total = 0;
for (const [i, step] of STEPS.entries()) {
  const notes = buildStep(step, song.beats, 4, i);
  const line = d => practiceText(i, d);
  assert(line('touch') && line('keys') && line('touch').length <= 45 && line('keys').length <= 45, `${step.word}: one short line per input`);
  assert(step.need >= 1 && step.need <= notes.length, `${step.word}: passable`);
  notes.forEach((n, j) => {
    assert(song.beats.includes(n.t) && (!n.end || song.beats.includes(n.end)), `${step.word}: on the song's beat grid`);
    assert.equal(n.phrase, i);
    if (j) assert(n.t - (notes[j - 1].end || notes[j - 1].t) >= beat * 2 - 1e-3, `${step.word}: relaxed, two beats apart`);
  });
  total += (stepBeats(step) + 5) * beat; // + the pause between steps
  const played = kind => notes.map(n => ({ ...n, hit: kind, tail: n.end && !n.balloon ? kind : undefined, count: n.balloon ? (kind === 'miss' ? 1 : n.need) : 0 }));
  assert(stepDone(played('good')) && stepPassed(step, played('good')), `${step.word}: good play passes`);
  assert(!stepPassed(step, played('miss')), `${step.word}: all missed retries`);
  assert(!stepDone(notes.map(n => ({ ...n, hit: null }))), `${step.word}: not done before it is judged`);
}
assert(total > 15 && total < 35, `about 20-30 s of practice (${total.toFixed(1)} s)`);
const [guapa, hold, balloon] = [2, 3, 4].map(i => buildStep(STEPS[i], song.beats, 4));
assert(guapa.every(n => n.big && n.input === 'B'), 'GUAPA notes are big, both buttons');
assert(hold.every(n => n.end > n.t && 'LR'.includes(n.input)), 'MANTÉN notes are holds');
assert(balloon.length === 1 && balloon[0].balloon && balloon[0].need > 0, 'GLOBUS is a balloon');
const heldHead = hold.map(n => ({ ...n, hit: 'perfect' }));
assert(!stepDone(heldHead), 'a hold is done only once its tail is judged');
console.log('practice steps ok');

// The menu ambient still loading when a game or the practice starts must never start under it.
{
  let resolveAmbient, started = 0;
  const amb = Object.create(Chip.prototype);
  amb.unlock = () => {};
  amb.ctx = { currentTime: 0, createBufferSource: () => ({ connect: t => t, start() { started++; }, stop() {} }),
    createGain: () => ({ connect: t => t, disconnect() {}, gain: { setValueAtTime() {}, linearRampToValueAtTime() {}, setTargetAtTime() {} } }) };
  amb.ambient = new Promise(r => { resolveAmbient = r; });
  amb.menu(true); amb.menu(false);
  resolveAmbient({});
  await new Promise(r => setTimeout(r));
  assert.equal(started, 0, 'menu(false) cancels a loop still loading');
  amb.menu(true);
  await new Promise(r => setTimeout(r));
  assert.equal(started, 1, 'the menu loop still plays on the title');
}
console.log('menu ambient never leaks into play ok');
