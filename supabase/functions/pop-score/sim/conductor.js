// The tune in game time, no sound: where it is and how fast it goes. Pure, so the server's replay (supabase/functions/pop-score)
// keeps the same tempo as the page did. sequencer.js plays it.
import { PICKUP, LOOP_START, LOOP_END, SKIP_FROM, SKIP_TO } from './melody.js';

export const STEP = .5, GLIDE = 3; // eighth-note grid; BPM per second, so a rise is never heard as a jump
export const BELL_GLIDE = 200; // the bell's slow time comes and goes at once (BPM per second): it must be heard
export const AHEAD = .35; // how far ahead of the game the tune is laid out: the audio's queue
export const LEAD = .1; // a Mulassa takes that long to pop up, so its step reaches the game that early and she lands on the beat
export const BASE_BPM = [150, 165, 180]; // the opening tempo of Fàcil, Normal and Difícil; the rise on top is the same
// + − × ÷ only: they round alike in every engine (Math.exp need not), so the page and the server's replay keep the same tempo
export const bpmFor = (progress, slow = false, level = 0) => (BASE_BPM[level] + 28 * progress / (progress + 60)) * (slow ? .75 : 1);
export const layersFor = score => ({ bass: score >= 5 ? 1 : 0, kick: score >= 15 ? 1 : 0, shaker: score >= 35 ? 1 : 0, octave: score >= 70 ? 1 : 0 });
// the next position played: past the end, back to A; inside A's repeat, on in its second half (melody.js SKIP_*)
export const wrap = pos => (pos >= LOOP_END ? wrap(pos - LOOP_END + LOOP_START) : pos >= SKIP_FROM && pos < SKIP_TO ? pos - SKIP_FROM + SKIP_TO : pos);

export function createConductor(level = 0) {
  const steps = [], marks = []; // laid out and not yet taken by the audio; step times not yet reached by the game
  let pos = PICKUP, next = 0, bpm = bpmFor(0, false, level), target = bpm, score = 0, wasSlow = false, rush = false; // rush: the bell's jump, until it lands
  return {
    // the frame's progression and bell: the tempo glides towards them from the next step on
    setProgress(s, slow) { rush = rush || slow !== wasSlow; wasSlow = slow; score = s; target = bpmFor(s, slow, level); },
    // lay out every step that starts before game time `until`
    advance(until) {
      while (next < until) {
        const spb = 60 / bpm;
        steps.push({ t: next, pos, spb, score });
        marks.push(next);
        next += spb * STEP;
        const glide = (rush ? BELL_GLIDE : GLIDE) * spb * STEP;
        bpm += Math.max(-glide, Math.min(glide, target - bpm));
        if (bpm === target) rush = false;
        pos = wrap(pos + STEP);
      }
    },
    // how many steps have reached game time `now` (a LEAD early), since the last call: each one once. The game spawns on them.
    due(now) {
      let n = 0;
      while (marks.length && marks[0] - LEAD <= now) { marks.shift(); n++; }
      return n;
    },
    take: () => steps.splice(0), // the steps for the audio, each once
  };
}
