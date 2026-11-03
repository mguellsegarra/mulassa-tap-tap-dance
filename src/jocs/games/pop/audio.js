// The music (sequencer.js) and the synthesized effects, on one context that starts inside the player's first tap.
import { createSequencer, hz } from './sequencer.js';
import { store } from '../../../platform/storage.js';

let on = store.get('pica-music') /* the game's first name, kept */ !== 'off', ctx = null, seq = null, sfxBus = null, timer = 0;
let tune = null, offset = 0; // the run's conductor; audio time = game time + offset

// The tune is laid out by the game's frames (conductor.js), ahead of them; the timer queues it. The offset only grows: after
// a stall the music waits for the game rather than bursting the notes it missed.
const at = t => { offset = Math.max(offset, ctx.currentTime + .02 - t); return t + offset; };
const pump = () => seq.play(tune.take(), at);
const run = () => { clearInterval(timer); timer = setInterval(pump, 80); pump(); };

export const musicOn = () => on;
export function setMusicOn(v) {
  on = v;
  store.set('pica-music', v ? 'on' : 'off');
  seq?.gain(v ? .9 : 0);
}
// inside the tap that starts a game: browsers only let audio start from a gesture
export function startMusic(conductor) {
  if (!ctx) {
    ctx = new AudioContext();
    seq = createSequencer(ctx);
    sfxBus = ctx.createBiquadFilter();
    sfxBus.type = 'lowpass';
    sfxBus.frequency.value = 3000;
    sfxBus.connect(ctx.destination);
  }
  ctx.resume();
  tune = conductor;
  offset = ctx.currentTime - (ctx.outputLatency || 0); // game time 0 is heard now; at() keeps every note a little ahead of the clock
  seq.start();
  seq.gain(on ? .9 : 0);
  run();
}
export function stopMusic() {
  if (!seq) return;
  clearInterval(timer);
  seq.gain(0); // what is queued fades out instead of cutting
}
export function pauseMusic() {
  clearInterval(timer);
  ctx?.suspend();
}
export function resumeMusic() {
  ctx?.resume();
  if (seq) run();
}

function tone(freq, dur, type = 'sine', vol = .1, to = freq, at = 0) {
  if (!ctx || !on) return;
  const o = ctx.createOscillator(), g = ctx.createGain(), t = ctx.currentTime + at;
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  o.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(.001, t + dur);
  o.connect(g).connect(sfxBus);
  o.start(t);
  o.stop(t + dur);
}
export const SFX = {
  // the lead voice's note, an octave up, sounding at once on the tap (waiting for the beat would feel late)
  hit: () => { const m = seq.noteNow(), f = hz(m + 12); tone(f, .1, 'triangle', .13); tone(f, .14, 'sine', .09); },
  // on the chord that's sounding: a fixed pitch clashed with the song
  goodie: () => { const [a, b, c] = seq.tonesNow(); [a, b, c, a + 12].forEach((pc, i) => { const f = hz(72 + pc); tone(f, .14, 'triangle', .12, f, i * .06); }); },
  wrong: () => tone(180, .35, 'triangle', .2, 70),
  fire: () => { tone(120, 1.1, 'triangle', .22, 50); tone(70, 1.1, 'sine', .2, 140); },
  boom: () => tone(90, .9, 'sine', .35, 30),
};
