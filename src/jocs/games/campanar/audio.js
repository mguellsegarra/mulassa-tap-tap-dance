// The campanar's sounds, synthesised after the reference game's two: pure sine "bubbles", a pitch that leaps up in a few
// ms and dies in tens of ms. A slab set down is one high bubble; a perfect drop two, a fifth then an octave, a semitone
// higher for each perfect in a row (up to six). The fall is a bubble going down; the tower turning into the campanar a
// run of bubbles climbing. One AudioContext, unlocked by the first tap (gesture.js).
import { blipOn } from '#plassa/ui-sound.js';
import { STACK_TRY } from './stack.js';

const ctx = new (window.AudioContext || window.webkitAudioContext)();
export { ctx as audioCtx }; // ritme.js: the slab on the audio clock
const out = ctx.createGain();
out.gain.value = new URLSearchParams(location.search).has('mute') ? 0 : 0.9; // ?mute: the clock still runs, silent
out.connect(ctx.destination);
export { out as audioOut };
export const unlock = () => { if (ctx.state !== 'running') ctx.resume().catch(() => {}); };
export const uiBlip = blipOn(ctx, out);

// from → to Hz in `glide` s; a 2 ms attack, then an exponential decay that is silent by `len`. LEAD: scheduled a little
// ahead, so a busy main thread starts it late as a whole instead of cutting its attack (a click)
const LEAD = 0.015;
// when: the context's own time instead of `at` seconds from now (the music's grid, ritme-loop.js)
export function bubble(from, to, { at = 0, when, type = 'sine', glide = 0.01, len = 0.05, peak = 0.5, attack = 0.002 } = {}) {
  if (ctx.state !== 'running') return;
  const t = when ?? ctx.currentTime + LEAD + at, o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(from, t);
  o.frequency.exponentialRampToValueAtTime(to, t + glide);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(peak, t + attack);
  g.gain.setTargetAtTime(0, t + attack + 0.002, len / 4);
  o.connect(g).connect(out);
  o.start(t);
  o.stop(t + len + 0.03);
}
const SCALE = [0, 2, 4, 7, 9, 12, 14, 16];

export const SFX = {
  place: () => bubble(1000, 1290, { glide: 0.008, len: 0.045, peak: 0.45 }),
  // the reference plays its sample faster for each step: higher and shorter
  perfect: streak => {
    const r = 2 ** (Math.min(streak - 1, 6) / 12);
    bubble(450 * r, 670 * r, { glide: 0.03 / r, len: 0.05 / r, peak: 0.55 });
    bubble(500 * r, 1030 * r, { at: 0.08 / r, glide: 0.02 / r, len: 0.045 / r, peak: 0.6 });
  },
  miss: () => bubble(520, 210, { glide: 0.18, len: 0.25, peak: 0.4 }),
  // the crown on: a bell, a few inharmonic sine partials that ring and fade
  bell: () => [[0.5, 0.25, 2.2], [1, 0.3, 1.6], [1.19, 0.12, 1.1], [1.5, 0.1, 0.9], [2, 0.12, 0.8], [2.74, 0.06, 0.5]]
    .forEach(([k, peak, len]) => bubble(660 * k, 660 * k, { glide: 0.001, len, peak })),
  // the whole tower turning into the campanar: one bubble per step of the cascade, up a major scale
  turn: i => { const r = 2 ** (SCALE[i % SCALE.length] / 12); bubble(600 * r, 900 * r, { glide: 0.012, len: 0.06, peak: 0.3 }); },
};

// ?stack: Stack's own sounds, read from Marc's recording (26 Nov 2026). A slab set down is one sampled click played at
// 1x or 1.25x (0.75x on the drop that ends the run): a 1150 Hz blip of 25 ms and a soft one an octave below 90 ms later.
// A perfect is a soft sine note and its octave 90 ms behind, about half a second long: C4 on the first, one step up
// the C major scale for each perfect in a row (C D E F G heard; past five in a row is our guess), back to C after a cut.
const STACK_MAJOR = [0, 2, 4, 5, 7, 9, 11];
function stackClick(r) {
  bubble(1000 * r, 1150 * r, { glide: 0.005 / r, len: 0.05 / r, peak: 0.5 });
  bubble(520 * r, 575 * r, { at: 0.09 / r, glide: 0.004 / r, len: 0.03 / r, peak: 0.28 });
}
if (STACK_TRY) Object.assign(SFX, {
  place: () => stackClick(Math.random() < 0.35 ? 1.25 : 1),
  miss: () => stackClick(0.75),
  perfect: streak => {
    const d = Math.min(streak - 1, 14), f = 261.63 * 2 ** (STACK_MAJOR[d % 7] / 12 + Math.floor(d / 7)); // two octaves, then it stays
    bubble(f, f, { glide: 0.001, len: 0.6, peak: 0.5, attack: 0.012 });
    bubble(2 * f, 2 * f, { at: 0.09, glide: 0.001, len: 0.55, peak: 0.4, attack: 0.012 });
  },
});
