// The tune in game time, no sound: where it is, how fast it goes and which notes are due. Pure, so the server's replay
// (supabase/functions/pop-score) hears the same notes, and spawns the same figures, as the page did. sequencer.js plays it.
import { MELODY, PICKUP, LOOP_START, LOOP_END } from './melody.js';

export const STEP = .5, GLIDE = 3; // eighth-note grid; BPM per second, so a rise is never heard as a jump
export const AHEAD = .35; // how far ahead of the game the tune is laid out: the audio's queue
export const LEAD = .1; // a figure takes that long to pop up, so it spawns that early and lands on its note
// + − × ÷ only: they round alike in every engine (Math.exp need not), so the page and the server's replay keep the same tempo
export const bpmFor = (score, slow = false) => (150 + 28 * score / (score + 60)) * (slow ? .8 : 1);
export const layersFor = score => ({ bass: score >= 5 ? 1 : 0, kick: score >= 15 ? 1 : 0, shaker: score >= 35 ? 1 : 0, octave: score >= 70 ? 1 : 0 });
export const wrap = pos => (pos >= LOOP_END ? pos - LOOP_END + LOOP_START : pos);
const NOTE_AT = new Set(MELODY.map(n => n[0]));

export function createConductor() {
  const steps = [], notes = []; // laid out and not yet taken by the audio; note times not yet announced to the game
  let pos = PICKUP, next = 0, bpm = bpmFor(0), target = bpm, score = 0;
  return {
    // the frame's score and bell: the tempo glides towards them from the next step on
    setLevel(s, slow) { score = s; target = bpmFor(s, slow); },
    // lay out every step that starts before game time `until`
    advance(until) {
      while (next < until) {
        const spb = 60 / bpm;
        steps.push({ t: next, pos, spb, score });
        if (NOTE_AT.has(pos)) notes.push(next);
        next += spb * STEP;
        bpm += Math.max(-GLIDE * spb * STEP, Math.min(GLIDE * spb * STEP, target - bpm));
        pos = wrap(pos + STEP);
      }
    },
    // how many notes have reached game time `now` since the last call: each one once
    due(now) {
      let n = 0;
      while (notes.length && notes[0] <= now) { notes.shift(); n++; }
      return n;
    },
    take: () => steps.splice(0), // the steps for the audio, each once
  };
}
