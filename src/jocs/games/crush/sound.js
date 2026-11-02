// Synth blips, samples and a music loop, all through one master gain so one button silences everything.
// The context starts on the first tap, as iOS requires.
const KEY = 'minijocs.muted';
const MAX_BLIPS = 5; // a big cascade fires dozens at once; past a few the ear hears no more, only the speaker clipping
let ctx, master, sfx, live = 0;
export const isMuted = () => localStorage.getItem(KEY) === '1';

function audio() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = isMuted() ? 0 : 1;
    // Phone speakers distort on any peak, so nothing leaves without passing a limiter.
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -14;
    limiter.knee.value = 6;
    limiter.ratio.value = 20;
    limiter.attack.value = .002;
    limiter.release.value = .12;
    const trim = ctx.createGain();
    trim.gain.value = .8;
    master.connect(limiter).connect(trim).connect(ctx.destination);
    sfx = ctx.createBiquadFilter();
    sfx.type = 'lowpass';
    sfx.frequency.value = 3000; // the cure for shrill
    sfx.connect(master);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

export function audioOut() {
  return { ctx: audio(), out: master };
}

export function setMuted(on) {
  localStorage.setItem(KEY, on ? '1' : '0');
  if (master) master.gain.value = on ? 0 : 1;
}

export function blip(freq, ms = 90, type = 'triangle', gain = .12) {
  const a = audio();
  if (live >= MAX_BLIPS) return;
  live++;
  const t = a.currentTime, osc = a.createOscillator(), amp = a.createGain();
  osc.onended = () => { live--; };
  osc.type = type;
  osc.frequency.value = freq;
  amp.gain.setValueAtTime(gain, t);
  amp.gain.exponentialRampToValueAtTime(.0001, t + ms / 1000);
  osc.connect(amp).connect(sfx);
  osc.start(t);
  osc.stop(t + ms / 1000);
}

export async function loadSample(url) {
  const data = await (await fetch(url)).arrayBuffer();
  return audio().decodeAudioData(data);
}

// Returns the source, so a caller can stop it or wait for its end.
export function playSample(buffer, gain = 1, loop = false) {
  const a = audio(), src = a.createBufferSource(), amp = a.createGain();
  src.buffer = buffer;
  src.loop = loop;
  amp.gain.value = gain;
  src.connect(amp).connect(master);
  src.start();
  return src;
}
