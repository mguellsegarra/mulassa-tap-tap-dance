// Everything the game sounds like, synthesised: no audio files, and the tempo follows the street.
// Its own context, because the shared blip cannot be muted or scheduled ahead.
const MUTE_KEY = 'minijocs.corre.mute';
// A made-up gralla tune in D minor, one number per sixteenth: semitones above D4, null is a rest.
const TUNE = [12, null, 10, 12, 15, null, 12, 10, 8, null, 10, 12, 10, null, 7, null,
  12, null, 10, 12, 15, null, 17, 15, 19, null, 17, 15, 12, null, null, null,
  7, null, 8, 10, 12, null, 10, 8, 7, null, 8, 10, 12, null, 15, null,
  17, 15, 12, 10, 12, null, 10, 8, 7, null, 5, null, 7, null, null, null];
const BASS = [0, 0, -2, -2, -4, -4, -5, -5];
const hz = semis => 293.66 * 2 ** (semis / 12);

export function createAudio() {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const master = ctx.createGain(), bus = ctx.createGain();
  master.connect(ctx.destination);
  bus.connect(master);
  let muted = localStorage.getItem(MUTE_KEY) === '1', timer = 0, step = 0, at = 0, tempo = 160;
  master.gain.value = muted ? 0 : 1;
  const noise = ctx.createBuffer(1, ctx.sampleRate / 2, ctx.sampleRate);
  noise.getChannelData(0).forEach((_, i, a) => { a[i] = Math.random() * 2 - 1; });

  function tone(freq, t, ms, type, gain, to = bus, slide = 0) {
    const o = ctx.createOscillator(), a = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + ms / 1000);
    a.gain.setValueAtTime(gain, t);
    a.gain.exponentialRampToValueAtTime(.0001, t + ms / 1000);
    o.connect(a).connect(to);
    o.start(t);
    o.stop(t + ms / 1000);
  }
  function hiss(t, ms, gain, freq, kind = 'highpass') {
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), a = ctx.createGain();
    s.buffer = noise;
    f.type = kind;
    f.frequency.value = freq;
    a.gain.setValueAtTime(gain, t);
    a.gain.exponentialRampToValueAtTime(.0001, t + ms / 1000);
    s.connect(f).connect(a).connect(master);
    s.start(t);
    s.stop(t + ms / 1000);
  }
  const reed = ctx.createBiquadFilter(); // the gralla's nasal bite
  reed.type = 'bandpass'; reed.frequency.value = 1500; reed.Q.value = 1.2;
  reed.connect(bus);

  function playStep(i, t) {
    const n = TUNE[i % TUNE.length], beat = 60 / tempo / 4;
    if (n !== null) { tone(hz(n), t, beat * 1700, 'sawtooth', .16, reed); tone(hz(n + 12), t, beat * 900, 'square', .012); }
    const s = i % 16;
    if (s % 4 === 0) tone(130, t, 120, 'sine', .34, bus, 45); // bombo
    if (s === 4 || s === 12 || s === 14 || s === 15) hiss(t, 90, .16, 1400); // tabal
    if (s % 2 === 1) hiss(t, 28, .035, 7000);
    if (s % 2 === 0) tone(hz(BASS[Math.floor(i / 8) % 8] - 24), t, beat * 1500, 'triangle', .17);
  }
  function pump() {
    while (at < ctx.currentTime + .12) { playStep(step++, at); at += 60 / tempo / 4; }
  }
  const now = () => ctx.currentTime;
  return {
    get muted() { return muted; },
    toggleMute() {
      muted = !muted;
      master.gain.value = muted ? 0 : 1;
      localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
    },
    music(bpm) {
      ctx.resume();
      tempo = bpm;
      clearInterval(timer);
      step = 0; at = now() + .05; bus.gain.value = 1;
      pump();
      timer = setInterval(pump, 30);
    },
    tempo(bpm) { tempo = bpm; },
    silence() { clearInterval(timer); timer = 0; },
    gain() { [0, 1, 2].forEach(i => tone(660 * 1.26 ** i, now() + i * .055, 130, 'square', .1)); hiss(now(), 200, .05, 3000); },
    lose() { tone(330, now(), 330, 'sawtooth', .16, bus, 80); },
    boom() { hiss(now(), 300, .3, 900, 'lowpass'); tone(90, now(), 240, 'square', .18, bus, 40); },
    hit() { hiss(now(), 70, .13, 500 + Math.random() * 800); tone(100 + Math.random() * 50, now(), 70, 'square', .07); },
    floor(i) { tone(392 * 1.08 ** i, now(), 150, 'square', .1); },
    fanfare() { [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, now() + i * .11, 220, 'sawtooth', .13, reed)); hiss(now() + .55, 700, .12, 2500); },
    fail() { [392, 349, 311, 233].forEach((f, i) => tone(f, now() + i * .16, 240, 'sawtooth', .12, reed)); },
    close() { clearInterval(timer); ctx.close(); },
  };
}
