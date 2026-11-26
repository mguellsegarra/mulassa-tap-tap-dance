// The campanar's sounds, synthesised after the reference game's two: pure sine "bubbles", a pitch that leaps up in a few
// ms and dies in tens of ms. A slab set down is one high bubble; a perfect drop two, a fifth then an octave, a semitone
// higher for each perfect in a row (up to six). The fall is a bubble going down; the tower turning into the campanar a
// run of bubbles climbing. One AudioContext, unlocked by the first tap (gesture.js).
import { blipOn } from '#plassa/ui-sound.js';

const ctx = new (window.AudioContext || window.webkitAudioContext)();
const out = ctx.createGain();
out.gain.value = 0.9;
out.connect(ctx.destination);
export const unlock = () => { if (ctx.state !== 'running') ctx.resume().catch(() => {}); };
export const uiBlip = blipOn(ctx, out);

// from → to Hz in `glide` s; a 2 ms attack, then an exponential decay that is silent by `len`. LEAD: scheduled a little
// ahead, so a busy main thread starts it late as a whole instead of cutting its attack (a click)
const LEAD = 0.015;
function bubble(from, to, { at = 0, glide = 0.01, len = 0.05, peak = 0.5 } = {}) {
  if (ctx.state !== 'running') return;
  const t = ctx.currentTime + LEAD + at, o = ctx.createOscillator(), g = ctx.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(from, t);
  o.frequency.exponentialRampToValueAtTime(to, t + glide);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(peak, t + 0.002);
  g.gain.setTargetAtTime(0, t + 0.004, len / 4);
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
