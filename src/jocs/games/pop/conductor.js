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
// A song's form: where it starts, where its loop goes back to, and a stretch it jumps over. The Mulassa's (melody.js) is the
// default and the server's; the page plays another tune (songs.js) on the same steps: only the notes change, never the timing.
export const MULASSA_FORM = { pickup: PICKUP, loopStart: LOOP_START, loopEnd: LOOP_END, skipFrom: SKIP_FROM, skipTo: SKIP_TO };
// the next position played: past the end, back to the loop's start; inside a skipped stretch, on after it
export const wrap = (pos, f = MULASSA_FORM) => (pos >= f.loopEnd ? wrap(pos - f.loopEnd + f.loopStart, f) : pos >= f.skipFrom && pos < f.skipTo ? pos - f.skipFrom + f.skipTo : pos);

export function createConductor(level = 0, form = MULASSA_FORM) {
  const steps = [], marks = []; // laid out and not yet taken by the audio; step times not yet reached by the game
  let pos = form.pickup, next = 0, bpm = bpmFor(0, false, level), target = bpm, score = 0, wasSlow = false, rush = false; // rush: the bell's jump, until it lands
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
        pos = wrap(pos + STEP, form);
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
