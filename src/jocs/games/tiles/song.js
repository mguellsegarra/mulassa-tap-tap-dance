// The tune as tiles: the Ball de la Mulassa's notes in the run's seconds, each in one of four columns, and the chord under
// each beat. A is played once (the tune's own cut), after a count-in of LEAD beats.
import { MELODY, PICKUP, SKIP_FROM, SKIP_TO, CHORDS, chordAt } from './tune.js';

// the tune's own tempo; dev: ?bpm=120 tries another
const asked = +new URLSearchParams(globalThis.location?.search).get('bpm');
export const BPM = asked >= 60 && asked <= 220 ? asked : 152, SPB = 60 / BPM, LEAD = 4;
const HOLD_FROM = 2; // beats: a note this long is held, not tapped
export const OPEN = 0, HIT = 1, MISS = 2, HELD = 3; // a note's state: waiting, played, gone by, being held
const CUT = SKIP_TO - SKIP_FROM;
export const END = 222 + 6 - CUT - PICKUP + LEAD; // the beat the last note ends on

export function buildNotes() {
  let col = 1, prev = null;
  return MELODY.filter(n => n[0] < SKIP_FROM || n[0] >= SKIP_TO).map(([b, len, midi]) => {
    const beat = (b >= SKIP_TO ? b - CUT : b) - PICKUP + LEAD;
    // a quaver off the beat plays by itself: the fast part asks for a tap a beat, not two
    if (b % 1) return { t: beat * SPB, len: len * SPB, midi, ghost: true, voice: null };
    // the column follows the tune: up a step when it rises, down when it falls, turning back at an edge
    if (prev !== null && midi !== prev) {
      const d = Math.sign(midi - prev);
      col += col + d < 0 || col + d > 3 ? -d : d;
    }
    prev = midi;
    // a held note lets go half a beat early, so the same finger reaches the next one; it pays a point at each whole beat
    const hold = len >= HOLD_FROM ? (len - .5) * SPB : 0;
    return { t: beat * SPB, len: len * SPB, hold, dots: hold ? Math.ceil(len - .5) - 1 : 0, got: 0, midi, col, state: OPEN, voice: null };
  });
}
// the chord's pitch classes under a beat of the run
export function chordFor(beat) {
  const src = beat - LEAD + PICKUP;
  return CHORDS[chordAt(src >= SKIP_FROM ? src + CUT : src)];
}
