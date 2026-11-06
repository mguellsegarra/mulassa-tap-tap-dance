// The music (sequencer.js), the home's (menu-music.js) and the synthesized effects, on one context. A browser lets it sound
// only after a tap on the page (Chrome also after one on mulassa.cat's games sheet that led here): unlock() is every tap.
import { createSequencer, hz } from './sequencer.js';
import { fresh } from './fresh.js';
import { audioClock } from '../../../platform/audio-clock.js';
import { createMenuMusic } from './menu-music.js';
import homeUrl from './menu-music.mp3?url';
import homeLoop from './menu-music.json' with { type: 'json' };
import { MELODY } from './melody.js';
import { createPageAudio } from '#plassa/page-audio.js';
import { musicPref } from '#plassa/music-pref.js';

musicPref.adopt('pica-music'); // Pop's own key until Plassa's one switch (the game's first name)
let on = musicPref.get(), ctx = null, clock = null, seq = null, sfxBus = null, noise = null, timer = 0;
let music = null, home = null, homeOn = false, out = null, life = null, hooks = {}; // out: everything's last gain (page-audio.js fades it) // music: on/off for everything musical; home: the home's music, homeOn while it should play
let tune = null, offset = 0; // the run's conductor; audio time = game time + offset
let armed = false; // from «Juga»'s tap (the 3, 2, 1) to the run's pause or end: the run should sound

// The tune is laid out by the game's frames (conductor.js), ahead of them; the timer queues it. The offset only grows: after
// a stall the music waits for the game rather than bursting the notes it missed (and followGame keeps it on the game's clock).
const LEAD = .02; // a note is queued at least this far ahead of the audio clock
const at = t => { offset = Math.max(offset, ctx.currentTime + LEAD - t); return t + offset; };
const pump = () => seq.play(tune.take(), at);
const run = () => { clearInterval(timer); timer = setInterval(pump, 80); pump(); };

export const musicOn = () => on;
export function setMusicOn(v) {
  on = v;
  musicPref.set(v);
  seq?.gain(v ? .9 : 0);
  music?.gain.setTargetAtTime(v ? 1 : 0, ctx.currentTime, .05);
}
// made with the page, suspended until the browser lets it sound (unlock)
function audio() {
  if (ctx) return true;
  try { ctx = new AudioContext(); } catch { return false; } // no Web Audio: a silent game
  clock = audioClock(ctx);
  out = ctx.createGain();
  out.connect(ctx.destination);
  life = createPageAudio(ctx, out, { hearing: () => on && (homeOn || armed), stall: () => !!hooks.stall?.() });
  seq = createSequencer(ctx, out);
  sfxBus = ctx.createBiquadFilter();
  sfxBus.type = 'lowpass';
  sfxBus.frequency.value = 3000;
  sfxBus.connect(out);
  noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate); // a second of white noise, made once: the blast's body
  const d = noise.getChannelData(0);
  for (let k = 0; k < d.length; k++) d[k] = Math.random() * 2 - 1;
  music = ctx.createGain();
  music.gain.value = on ? 1 : 0;
  music.connect(out);
  home = createMenuMusic(ctx, music, { url: homeUrl, loop: homeLoop });
  return true;
}
// every tap or key: the first one the browser counts lets the context run (a suspended one stays as it is)
export const unlock = () => life?.gesture(); // never a paused run's: nothing should sound then (its menu is tapped too)
// main.js: what a stalled clock does to the game (page-audio.js); watch() each frame
export const audioPage = h => { hooks = h; };
export const watchAudio = now => life?.watch(now);
// the home: its music, as soon as the browser lets it sound (Chrome may at once, coming from the games sheet's tap)
export function startHomeMusic() {
  if (!audio()) return;
  homeOn = true;
  home.play();
  life.resume(); // refused without a tap yet: unlock() asks again on the first one
}
export function stopHomeMusic() {
  homeOn = false;
  home?.stop();
}
// a hidden page: page-audio.js stops the sound and brings it back (a run pauses: page-leave.js, main.js)
// inside «Juga»'s tap, before the 3, 2, 1: the home's music goes and the context may run (iOS needs that tap's gesture)
export function armAudio() {
  if (!audio()) return;
  stopHomeMusic();
  armed = true;
  life.wake();
}
// inside the tap that starts a game (or after armAudio): browsers only let audio start from a gesture
export function startMusic(conductor) {
  if (!audio()) return;
  stopHomeMusic();
  armed = true;
  life.wake();
  tune = conductor;
  offset = ctx.currentTime + LEAD; // game time 0 is queued now; at() keeps every note a little ahead of the clock
  clock.run();
  seq.start();
  seq.slow(false);
  seq.gain(on ? .9 : 0);
  run();
}
export function stopMusic() {
  armed = false;
  if (!seq) return;
  clearInterval(timer);
  seq.stop();
}
// The game's clock loses what a long frame or a stall took (main.js caps a frame), while the notes already queued play on:
// the music would drift ahead of the board. Each frame, game time `t` is due at audio time t + offset; when the audio clock
// is past that, later notes move later to meet the game. Never earlier: the game only falls behind the music.
export function followGame(t) {
  if (!ctx || ctx.state !== 'running') return; // not sounding yet (iOS starts late) or suspended: nothing to drift from
  const late = clock.at() + LEAD - (t + offset);
  if (late > .03) offset += late; // under 30 ms is the clocks' own jitter
}
export const slowMusic = v => seq?.slow(v);
export function pauseMusic() {
  clearInterval(timer);
  armed = false;
  life?.hush();
}
export function resumeMusic() {
  armed = true;
  life?.wake();
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
  // a Mulassa springs up out of the board: a plop rising onto the tune's note sounding now (the tap plays it an octave up)
  sprout: () => { const f = hz(seq.noteNow()); tone(f * .5, .14, 'sine', .12, f); tone(f, .08, 'triangle', .06, f * 1.5, .07); },
  goodie: () => { const [a, b, c] = seq.tonesNow(); [a, b, c, a + 12].forEach((pc, i) => { const f = hz(72 + pc); tone(f, .14, 'triangle', .12, f, i * .06); }); },
  // the campanar: a low bell in the chord's key, its inharmonic partials ringing long; and a lift when the slow time ends
  bell: () => { const f = hz(48 + seq.tonesNow()[0]); [[1, .3, 2.6], [2, .14, 1.8], [2.4, .1, 1.4], [3, .07, 1], [4.2, .04, .7]].forEach(([k, v, d]) => tone(f * k, d, 'sine', v)); },
  unbell: () => { const [a, b, c] = seq.tonesNow(); [c, b, a + 12].forEach((pc, i) => tone(hz(72 + pc) * .5, .16, 'triangle', .1, hz(72 + pc), i * .05)); },
  // the base's UI blip (packages/plassa/src/ui-sound.js): a press or a keyboard move; never queued while the browser holds the sound
  ui: () => { if (ctx?.state === 'running') tone(880, .04, 'triangle', .06); },
  wrong: () => tone(180, .35, 'triangle', .2, 70),
  // the 3, 2, 1: the Ball de la Mulassa's first three notes (melody.js: G, G, C), each on a kick (the sequencer's, harder);
  // the 1 a little louder
  count: n => {
    const last = n === 1, f = hz(MELODY[3 - n][2]);
    tone(130, .22, 'sine', last ? .55 : .45, 42);
    tone(f, .22, 'triangle', last ? .17 : .14); tone(f, .3, 'sine', last ? .12 : .1);
  },
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
