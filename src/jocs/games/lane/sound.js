// The Mulassa's voice and the run's few sounds, all synthesised: a nasal bray (a sawtooth through a band-pass), her hooves.
// shortcut: its own AudioContext, with no page-audio.js life (fade on leaving, iOS session); take Plassa's when this game goes on.
let ctx = null, out = null, noise = null;

export function unlock() { // from a tap or a key: the browser lets the page sound after it
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    out = ctx.createGain();
    out.gain.value = .5;
    out.connect(ctx.destination);
    noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  if (ctx.state !== 'running') ctx.resume().catch(() => {});
}
const ready = () => ctx?.state === 'running';

function env(at, attack, decay, peak) {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, at);
  g.gain.linearRampToValueAtTime(peak, at + attack);
  g.gain.exponentialRampToValueAtTime(.0001, at + attack + decay);
  g.connect(out);
  return g;
}
// One syllable of a bray: from f0 to f1 Hz, with the wobble a donkey's voice has.
function bray(at, f0, f1, dur, peak) {
  const o = ctx.createOscillator(), nose = ctx.createBiquadFilter(), wob = ctx.createOscillator(), depth = ctx.createGain();
  o.type = 'sawtooth';
  o.frequency.setValueAtTime(f0, at);
  o.frequency.exponentialRampToValueAtTime(f1, at + dur);
  wob.frequency.value = 28;
  depth.gain.value = f0 * .04;
  wob.connect(depth).connect(o.frequency);
  nose.type = 'bandpass';
  nose.frequency.value = 1250;
  nose.Q.value = 2.5;
  o.connect(nose).connect(env(at, .015, dur, peak));
  for (const n of [o, wob]) { n.start(at); n.stop(at + dur + .08); }
}
function thump(at, freq, dur, peak) {
  const s = ctx.createBufferSource(), f = ctx.createBiquadFilter();
  s.buffer = noise;
  f.type = 'bandpass';
  f.frequency.value = freq;
  f.Q.value = 3;
  s.connect(f).connect(env(at, .002, dur, peak));
  s.start(at, Math.random() * .5);
  s.stop(at + dur + .05);
}

export const SFX = {
  // a lane change: a short «hi!», up to the right and down to the left
  lane(dir) { if (ready()) bray(ctx.currentTime, dir > 0 ? 430 : 520, dir > 0 ? 640 : 350, .11, .2); },
  // the hit: a thud, then the whole «iii-aaah»
  crash() {
    if (!ready()) return;
    const at = ctx.currentTime;
    thump(at, 180, .25, .9);
    bray(at + .05, 760, 620, .28, .3);
    bray(at + .36, 330, 170, .5, .32);
  },
  clop(high) { if (ready()) thump(ctx.currentTime, high ? 1100 : 850, .035, .1); }, // a hoof on the road
};
