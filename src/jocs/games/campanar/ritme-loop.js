// The music of Tower's rhythm (ritme.js): a song a run, a bar a slab, all of it the campanar's own bubbles (audio.js), no
// samples. Five songs take turns run after run: Fable's (C Am F G twice, an arpeggio under a calm tune), Neon's (its eight
// chords, bouncing bass, chord stabs and toy-marimba hook), then the Mulassa's, the Drac's and the Bou's (ritme-cancons.js).
// Always: a kick on the "one" (where the slab crosses the middle) and three woodblock ticks climbing to it, the count that
// says when to tap.
// The lead voice is the player's: each bar's tune starts on its "one", and that note is never played by the band, only by
// a perfect (ritmePerfect). Perfects in a row bring the band in: a bass from the first; hats, kicks and the rest of the
// bar's tune (the band answering the player's note) from the second; arpeggio or stabs from the fourth. A cut sends it
// back to the bare count.
import { bubble } from './audio.js';
import { RITME_CANCONS } from './ritme-cancons.js';
import { store } from '#plassa/storage.js';

const ritmeHz = m => 440 * 2 ** ((m - 69) / 12);
// a bar: the bass's root, fifth and walk-up (C3-G3: an octave a phone's speaker still gives), the chord, the chord of its second half
const RITME_BARS = [
  [48, 55, 52, [60, 64, 67, 72]], [45, 52, 48, [57, 60, 64, 69]], [53, 48, 50, [53, 57, 60, 65]], [55, 50, 52, [55, 59, 62, 67]], // C Am F G
  [48, 55, 52, [60, 64, 67, 72]], [45, 52, 48, [57, 60, 64, 69]], [53, 48, 50, [53, 57, 60, 65]], [55, 50, 52, [55, 59, 62, 67]],
  [48, 55, 52, [60, 64, 67]], [45, 52, 48, [60, 64, 69]], [53, 48, 50, [60, 65, 69]], [55, 50, 52, [59, 62, 67]], // Neon's: C Am7 Fmaj7 G6
  [48, 55, 52, [60, 64, 67]], [52, 47, 50, [59, 64, 67]], [53, 55, 50, [60, 65, 69], [62, 67, 71]], [48, 55, 50, [60, 64, 67]], // C Em7 F→G C
];
// the tune, eight eighths a bar (0: a rest). Each bar's first note is a tone of its chord: it is the perfect's
const RITME_TUNE = [
  79, 0, 0, 76, 79, 0, 84, 0, 81, 0, 0, 79, 76, 0, 72, 0, 77, 0, 0, 81, 84, 0, 81, 0, 79, 0, 0, 74, 79, 0, 83, 0,
  84, 0, 0, 79, 76, 0, 79, 0, 81, 0, 0, 76, 81, 0, 84, 0, 81, 0, 0, 77, 81, 0, 79, 77, 74, 0, 0, 79, 83, 0, 79, 0,
  76, 0, 79, 0, 81, 79, 76, 0, 72, 0, 74, 76, 79, 0, 76, 0, 77, 0, 81, 0, 79, 77, 76, 74, 74, 0, 79, 0, 76, 0, 74, 0, // Neon's hook
  76, 0, 79, 81, 84, 0, 81, 79, 79, 0, 76, 0, 74, 76, 79, 0, 81, 0, 77, 79, 83, 0, 79, 83, 84, 0, 79, 0, 76, 0, 74, 76,
];
const RITME_TICKS = [0, 784, 880, 988];
// bounce: the bar Neon's kind of band starts at. Fable's at 138, the game's own first speed; Neon's at 138 too (Marc: as it sounded in the shared song; its prototype ran at 104)
const RITME_SONGS = {
  fable: { bpm: 138, per: 8, bounce: Infinity, bars: RITME_BARS.slice(0, 8), tune: RITME_TUNE.slice(0, 64) },
  neon: { bpm: 138, per: 8, bounce: 0, bars: RITME_BARS.slice(8), tune: RITME_TUNE.slice(64) },
  ...RITME_CANCONS,
};
const RITME_ORDER = ['fable', 'neon', 'mulassa', 'drac', 'bou'];
const RITME_PIN = new URLSearchParams(location.search).get('canco'); // &canco=<id>: that song every run (dev)
export let ritmeSong = RITME_SONGS.fable;
// at each run's start: the next song in the order, where the last run left it (on this device, across sessions)
export function ritmeNextSong() {
  if (Object.hasOwn(RITME_SONGS, RITME_PIN ?? '')) return (ritmeSong = RITME_SONGS[RITME_PIN]);
  const i = (Number(store.get('campanar-canco')) || 0) % RITME_ORDER.length;
  store.set('campanar-canco', String(i + 1));
  return (ritmeSong = RITME_SONGS[RITME_ORDER[i]]);
}

const ritmeNote = (m, when, len, peak, type = 'triangle') => bubble(ritmeHz(m), ritmeHz(m), { when, type, glide: 0.001, len, peak, attack: 0.005 });
function ritmeBass(m, when, len, peak) {
  ritmeNote(m, when, len, peak);
  ritmeNote(m + 12, when, len * 0.55, peak * 0.3, 'sine'); // its octave: what a phone gives of it
}

// step: the sixteenth since the run began; when: the context's time it sounds at; level: perfects in a row
export function ritmeLoopStep(step, when, level) {
  const { bars, tune, per } = ritmeSong, i = step % 16, bar = (step >> 4) % bars.length, neon = bar >= ritmeSong.bounce;
  const [root, fifth, walk, chord, half, mid] = bars[bar], note = i % (16 / per) ? 0 : tune[bar * per + i * per / 16]; // half, mid: a chord change at the half bar
  if (i === 0) bubble(150, 55, { when, glide: 0.08, len: 0.2, peak: 0.4 });
  else if (i % 4 === 0) {
    bubble(RITME_TICKS[i / 4] * 1.25, RITME_TICKS[i / 4], { when, glide: 0.008, len: 0.05, peak: 0.16 });
    if (level >= 2) bubble(140, 55, { when, glide: 0.07, len: 0.15, peak: 0.22 });
  }
  if (level >= 1) {
    if (!neon) { if (i === 0 || i === 6 || i === 10) ritmeBass(i === 10 && half ? fifth : root, when, 0.28, 0.22); }
    else if (i === 0) ritmeBass(root, when, 0.26, 0.22);
    else if (i === 6) ritmeBass(mid ?? fifth, when, 0.18, 0.15);
    else if (i === 8) ritmeBass(fifth, when, 0.26, 0.19);
    else if (i === 14) ritmeBass(walk, when, 0.16, 0.14);
  }
  if (level >= 2 && i % 4 === 2) bubble(7000, 5200, { when, glide: 0.01, len: 0.03, peak: 0.09 });
  if (level >= 2 && i && note) ritmeNote(note, when, 0.2, 0.13);
  if (level < 4) return;
  if (!neon) { if (i % 2 === 0) ritmeNote((i >= 8 && half || chord)[(i / 2) % 4], when, 0.13, 0.07); } // under the tune, an octave below it
  else if (i === 4 || i === 12) for (const m of i === 12 && half || chord) ritmeNote(m, when, 0.18, 0.055, 'sine');
}

// A perfect on the "one" of `bar`: the tune's note there, so always a tone of the chord sounding under it. A marimba
// (Marc chose it over a glockenspiel and a celesta, 27 Nov 2026): the note, its tuned fourth partial and a knock, soft
// enough that the kick and bass on the same instant leave the limiter alone (Stack's sine and octave, 0.4 + 0.26, drove it)
const RITME_MARIMBA = [[1, 0.24, 0.32], [4, 0.05, 0.06], [10, 0.015, 0.02]]; // [partial ratio, peak, length s]
export function ritmePerfect(bar, when) {
  const m = ritmeSong.tune[(bar % ritmeSong.bars.length) * ritmeSong.per], f = ritmeHz(m);
  for (const [k, peak, len] of RITME_MARIMBA) bubble(f * k, f * k, { when, glide: 0.001, len, peak, attack: 0.003 });
  return m;
}
// A slab set down off the beat, at the tap: a short muted pluck on a tone of `bar`'s chord, its lowest when late, its
// highest when early, so it never sounds out of key
export function ritmeCut(bar, late) {
  const chord = ritmeSong.bars[bar % ritmeSong.bars.length][3], f = ritmeHz(late ? chord[0] : chord.at(-1));
  bubble(f, f, { at: 0.01, type: 'triangle', glide: 0.001, len: 0.09, peak: 0.2, attack: 0.002 });
  bubble(2 * f, 2 * f, { at: 0.01, glide: 0.001, len: 0.04, peak: 0.06, attack: 0.002 });
}
