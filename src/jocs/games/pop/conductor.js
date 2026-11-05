// The tune in game time, no sound: where it is and how fast it goes. Pure, so the server's replay (supabase/functions/pop-score)
// keeps the same tempo as the page did. sequencer.js plays it.
import { PICKUP, LOOP_START, LOOP_END } from './melody.js';

export const STEP = .5, GLIDE = 3; // eighth-note grid; BPM per second, so a rise is never heard as a jump
export const BELL_GLIDE = 200; // the bell's slow time comes and goes at once (BPM per second): it must be heard
export const AHEAD = .35; // how far ahead of the game the tune is laid out: the audio's queue
// + − × ÷ only: they round alike in every engine (Math.exp need not), so the page and the server's replay keep the same tempo
export const bpmFor = (score, slow = false) => (150 + 28 * score / (score + 60)) * (slow ? .75 : 1);
export const layersFor = score => ({ bass: score >= 5 ? 1 : 0, kick: score >= 15 ? 1 : 0, shaker: score >= 35 ? 1 : 0, octave: score >= 70 ? 1 : 0 });
export const wrap = pos => (pos >= LOOP_END ? pos - LOOP_END + LOOP_START : pos);

export function createConductor() {
  const steps = []; // laid out and not yet taken by the audio
  let pos = PICKUP, next = 0, bpm = bpmFor(0), target = bpm, score = 0, wasSlow = false, rush = false; // rush: the bell's jump, until it lands
  return {
    // the frame's score and bell: the tempo glides towards them from the next step on
    setLevel(s, slow) { rush = rush || slow !== wasSlow; wasSlow = slow; score = s; target = bpmFor(s, slow); },
    // lay out every step that starts before game time `until`
    advance(until) {
      while (next < until) {
        const spb = 60 / bpm;
        steps.push({ t: next, pos, spb, score });
        next += spb * STEP;
        const glide = (rush ? BELL_GLIDE : GLIDE) * spb * STEP;
        bpm += Math.max(-glide, Math.min(glide, target - bpm));
        if (bpm === target) rush = false;
        pos = wrap(pos + STEP);
      }
    },
    take: () => steps.splice(0), // the steps for the audio, each once
  };
}
