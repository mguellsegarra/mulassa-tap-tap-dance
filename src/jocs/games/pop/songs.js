// Pop's tunes, the page's only (the server's replay needs no notes): each with its notes [beat, beats, midi], its harmony and
// its form (conductor.js). A run plays one, looped; the next run the next one (flow.js), so the same tune never comes twice running.
import { MELODY, chordAt as mulassaChord } from './melody.js';
import { DRAC } from './melody-drac.js';
import { MULASSA_FORM } from './conductor.js';

// a generated tune (tools/jocs/pop-drac.mjs): from its first note to its last, then round again from the first
// held: its lead holds each note its written length (a gralla's), not the Mulassa's decaying pluck
const whole = (t, home) => ({
  melody: t.melody, held: true,
  chordAt: beat => t.chords.find(([a, b]) => beat >= a && beat < b)?.[2] ?? home,
  form: { pickup: t.from, loopStart: t.from, loopEnd: t.to, skipFrom: Infinity, skipTo: Infinity },
});
export const SONGS = { mulassa: { melody: MELODY, chordAt: mulassaChord, form: MULASSA_FORM }, drac: whole(DRAC, 'G') };
export const SONG_IDS = Object.keys(SONGS);
