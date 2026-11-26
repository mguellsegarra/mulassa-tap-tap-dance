// ?ritme=fable, a trial: Tower to the beat. The slab's travel is a musical clock: it leaves the edge on a downbeat and
// crosses the middle of the tower on the next one (a bar of four beats later), so a tap on the "one" is a perfect. Its
// place comes from the audio clock, never from frame time: a dropped frame cannot put the slab off the music.
// The band follows the player: a cut tells how early or late the tap was, and the tempo bends that way from that tap on
// (late: slower, early: faster); each perfect raises it one beat a minute. The music and its tune are ritme-loop.js:
// a perfect sings the tune's note for its bar, on the beat. A cut leaves that bar's note unsung and the tune goes on with
// the chords (held back a bar, its next note would be out of the chord by then).
import { audioCtx, audioOut, bubble } from './audio.js';
import { ritmeLoopStep, ritmePerfect, ritmeScore, ritmeTempo } from './ritme-loop.js';

export const RITME = new URLSearchParams(location.search).get('ritme') === 'fable';
const RITME_BPM = ritmeTempo; // 138 for our song, the game's own first speed: its reach in one bar
const RITME_MIN = 100, RITME_MAX = 184;
const RITME_BEND = 0.16; // a tap a whole beat late slows the music this much (early: speeds it), a tap at most 15%
const RITME_AHEAD = 0.2; // seconds of music scheduled ahead of the clock: a long frame on a phone leaves no hole

let bpm = RITME_BPM, b0 = 0, t0 = 0; // the tempo map: beat b0 at clock time t0, bpm from there
let origin = null; // the downbeat the slab in play leaves the edge on (null: the run's first slab still to come)
let held = null; // the beat a pause froze the clock at
let playing = false, nextStep = 0, level = 0;
export const ritmeLog = import.meta.env.DEV ? [] : null; // dev: what the proof run plots (tools read it from __campanar)
// The phone's mix, after Neon's chain: nothing under 125 Hz (a small speaker only rattles there), the shrill top rolled
// off, a limiter for the moments everything lands on one beat, and headroom after it.
function ritmeMaster() {
  const hp = new BiquadFilterNode(audioCtx, { type: 'highpass', frequency: 125 }), lp = new BiquadFilterNode(audioCtx, { type: 'lowpass', frequency: 3400, Q: 0.5 });
  const limit = new DynamicsCompressorNode(audioCtx, { threshold: -10, knee: 6, ratio: 12, attack: 0.002, release: 0.08 }), trim = new GainNode(audioCtx, { gain: 0.6 });
  audioOut.disconnect();
  audioOut.connect(hp).connect(lp).connect(limit).connect(trim).connect(audioCtx.destination);
  return trim;
}
const ritmeEnd = RITME ? ritmeMaster() : audioOut;
export const ritmeAudio = import.meta.env.DEV && { ctx: audioCtx, out: ritmeEnd, score: ritmeScore, beat: () => ritmeBeat(), origin: () => origin }; // dev: the proof run's recorder, taps and plot

// The audio clock, as heard, on the page's timeline. currentTime moves in blocks (up to tens of ms on a phone), so the
// slab would stutter on it: the true clock is the highest (currentTime - page time) seen, let fall slowly so a slower
// audio clock is followed too. Minus the output's latency: the slab shows the beat that is sounding, not the one scheduled.
// Without a running context (not unlocked yet, no audio device) the page's clock carries on alone.
let ritmeLag = 0, ritmeSkew = 0;
function clock(ms = performance.now()) {
  if (audioCtx.state === 'running') {
    ritmeLag = audioCtx.outputLatency || audioCtx.baseLatency || 0;
    const d = audioCtx.currentTime - ritmeLag - performance.now() / 1000;
    if (Math.abs(d - ritmeSkew) > 0.05) { t0 += d - ritmeSkew; ritmeSkew = d; } // the context woke or glitched: the beat goes on from where it was
    else if (d > ritmeSkew) ritmeSkew = d;
    else ritmeSkew -= 2e-5;
  }
  return ms / 1000 + ritmeSkew;
}
const beatAt = t => b0 + (t - t0) * bpm / 60;
const ritmeBeat = ms => held ?? beatAt(clock(ms));
const whenBeat = b => t0 + (b - b0) * 60 / bpm + ritmeLag; // the context's time to schedule beat b at

export function ritmeStart() {
  bpm = RITME_BPM; b0 = -1; t0 = clock(); // a beat of air before the first sound
  origin = held = null; level = 0; nextStep = 0; playing = true;
  if (ritmeLog) ritmeLog.length = 0;
}
export function ritmeStop() { playing = false; }
export function ritmeHold(on) {
  if (on) held ??= ritmeBeat();
  else if (held !== null) { b0 = held; t0 = clock(); held = null; }
}

// each frame: schedules the music a little ahead. → whether the next slab may come out (its downbeat has come)
export function ritmeTick(waiting) {
  if (!playing || held !== null) return false;
  const now = clock();
  for (; nextStep / 4 < beatAt(now + RITME_AHEAD); nextStep++) {
    const when = whenBeat(nextStep / 4);
    if (when < audioCtx.currentTime) continue; // behind after a long stall: skipped, never bunched up
    ritmeLoopStep(nextStep, when, level);
    if (nextStep % 4 === 0) ritmeLog?.push({ k: 'beat', t: when, beat: nextStep / 4 });
  }
  if (!waiting) return false;
  origin ??= Math.ceil(beatAt(now) / 4) * 4;
  return beatAt(now) >= origin;
}

// the slab's place, in reaches off the middle (-1 … 1), and its way: edge, middle a bar later, far edge, back
export function ritmeAt(ms) {
  const x = (((ritmeBeat(ms) - origin) % 16) + 16) % 16;
  return x < 8 ? { at: x / 4 - 1, dir: 1 } : { at: 3 - x / 4, dir: -1 };
}
export const ritmeSpeed = range => range * bpm / 240; // the slab's, in units a second

// A drop at page time ms: streak > 0 a perfect (that many in a row), 0 a cut, -1 the miss that ends the run.
// A perfect's note waits for the downbeat it was for (sounds at once when that has passed): on the grid
export function ritmeDrop(ms, streak) {
  const t = clock(ms), b = beatAt(t);
  const cross = origin + 4 + 8 * Math.round((b - origin - 4) / 8), off = b - cross; // beats late (early: negative)
  ritmeLog?.push({ k: streak > 0 ? 'perfect' : streak ? 'miss' : 'cut', t: t + ritmeLag, beat: b, off, bpm });
  if (streak < 0) return;
  level = streak;
  const lead = Math.max(0, whenBeat(cross) - audioCtx.currentTime);
  b0 = b; t0 = t; // the tempo changes from this tap on
  if (streak) bpm += 1;
  else {
    bpm *= Math.min(1.15, Math.max(0.85, 1 - RITME_BEND * off));
    // the cut's own word: a short glide down (late, slowing) or up (early, rushing)
    bubble(620, off > 0 ? 410 : 930, { at: 0.03, glide: 0.09, len: 0.14, peak: 0.3 });
  }
  bpm = Math.min(RITME_MAX, Math.max(RITME_MIN, bpm));
  origin = Math.round(b / 4) * 4; // the next slab leaves on the downbeat nearest the tap
  if (!streak) return;
  const midi = ritmePerfect(cross / 4, audioCtx.currentTime + 0.015 + lead, 15 / bpm);
  ritmeLog?.push({ k: 'note', t: audioCtx.currentTime + lead, beat: cross, midi });
}
