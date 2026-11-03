// The music (sequencer.js) and the synthesized effects, on one context that starts inside the player's first tap.
import { createSequencer, hz } from './sequencer.js';
import { store } from '../../../platform/storage.js';
import { fresh } from './fresh.js';

let on = store.get('pica-music') /* the game's first name, kept */ !== 'off', ctx = null, seq = null, sfxBus = null, noise = null, timer = 0;
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
    noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate); // a second of white noise, made once: the blast's body
    const d = noise.getChannelData(0);
    for (let k = 0; k < d.length; k++) d[k] = Math.random() * 2 - 1;
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
// filtered noise: a lowpass sweeping down from `from` to `to` Hz, fading over `dur`
function rumble(dur, vol, from, to, at = 0) {
  if (!ctx || !on) return;
  const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(), t = ctx.currentTime + at;
  src.buffer = noise;
  src.loop = true;
  f.type = 'lowpass';
  f.frequency.setValueAtTime(from, t);
  f.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(.001, t + dur);
  src.connect(f).connect(g).connect(sfxBus);
  src.start(t);
  src.stop(t + dur);
}
export const SFX = {
  // the lead voice's note, an octave up, sounding at once on the tap (waiting for the beat would feel late)
  hit: () => { const m = seq.noteNow(), f = hz(m + 12); tone(f, .1, 'triangle', .13); tone(f, .14, 'sine', .09); },
  // on the chord that's sounding: a fixed pitch clashed with the song
  // a figure springs up out of the board: a plop rising onto one of the chord's notes, under the tap's (it comes with every note)
  sprout: () => { const t = seq.tonesNow(), f = hz(72 + t[Math.floor(Math.random() * t.length)]); tone(f * .5, .14, 'sine', .12, f); tone(f, .08, 'triangle', .06, f * 1.5, .07); },
  goodie: () => { const [a, b, c] = seq.tonesNow(); [a, b, c, a + 12].forEach((pc, i) => { const f = hz(72 + pc); tone(f, .14, 'triangle', .12, f, i * .06); }); },
  wrong: () => tone(180, .35, 'triangle', .2, 70),
  fire: () => { tone(120, 1.1, 'triangle', .22, 50); tone(70, 1.1, 'sine', .2, 140); },
  // the blast: one of four, never the last one, like the board's (board-blast.js)
  boom: () => nextBoom()(),
};
const BOOMS = [
  () => { // a big bang, then the chain's bangs rolling away
    tone(90, 1.1, 'sine', .4, 28);
    rumble(1.4, .55, 2400, 90);
    for (let k = 1; k <= 5; k++) rumble(.22, .3 - k * .04, 1600, 200, k * .1);
  },
  () => { // a traca: a bang and a string of crackers
    tone(110, .5, 'sine', .35, 40);
    rumble(.5, .45, 3000, 200);
    for (let k = 1; k <= 12; k++) rumble(.09, .28, 2600 + Math.random() * 1400, 500, k * .055 + Math.random() * .03);
  },
  () => { // a cartoon: a whistle falling, a bonk, a wobble
    tone(1500, .3, 'sine', .14, 260);
    tone(140, .5, 'square', .16, 55, .28);
    rumble(.8, .5, 1800, 90, .28);
    tone(330, .45, 'triangle', .12, 220, .5);
  },
  () => { // a firework: up it goes, bang, and it sparkles
    tone(500, .3, 'sine', .1, 2200);
    rumble(1.1, .55, 3200, 120, .28);
    tone(80, .9, 'sine', .35, 30, .28);
    for (let k = 0; k < 8; k++) tone(2400 + Math.random() * 2400, .06, 'triangle', .05, 3000 + Math.random() * 1500, .45 + k * .07);
  },
];
const nextBoom = fresh(BOOMS);
