// Three of the rhythm's songs (ritme-loop.js; &canco=mulassa|drac|bou pins one): the three figures' own tunes. The notes are
// the main game's scores (music/: the Mulassa's score.json, drac-score.json, the Bou's Gralla I); the chords are its
// generators' (tools/music/build_taiko.py, build_drac.py) and, for the Bou, what its Gralla baixa and Gralla II spell.
// A slab is a bar of four beats. Each bar's first note is a tone of its chord: it is the perfect's.
// · Mulassa, C minor then C major as in the game: part A at the game's half speed (a score bar is two slabs: bars 1-7 and
//   16), then B (17-23, 49) and C (50-57), a score bar half a slab. Bar 16's rest holds a G, bar 57 ends on A's pickup.
// · Drac, G major (the game's key, an octave up), a steady 126 (the score's own mark): two score bars a slab, bars 1-8,
//   1-7, 9-20, 22 and 35-38. Its two triplets are straightened (22: two sixteenths; 35: an eighth and two sixteenths).
// · Bou, at pitch: the fast theme in C minor (27-30), its A minor answer (31-34), the C major fanfare (35-38) and the
//   theme in major (60-63), a score bar a slab.
const RITME_TRIADS = { C: [0, 4, 7], Cm: [0, 3, 7], D: [2, 6, 9], Dm: [2, 5, 9], Dm7: [2, 5, 9, 12], Eb: [3, 7, 10], E: [4, 8, 11],
  F: [5, 9, 12], G: [7, 11, 14], G7: [7, 11, 14, 17], Ab: [8, 12, 15], Am: [9, 12, 16], Bb: [10, 14, 17] };
// the bass in A2-A3 (what a phone still gives, as the first song's), the chord from F3 up
function ritmeChord(name) {
  const [r, ...up] = RITME_TRIADS[name], low = 45 + (r + 3) % 12, mid = 53 + (r + 7) % 12, fold = m => m > 57 ? m - 12 : m;
  return { root: low, fifth: fold(low + 7), third: fold(low + up[0] - r), notes: [mid, ...up.map(t => mid + t - r), ...(up.length < 3 ? [mid + 12] : [])] };
}
// a bar as ritme-loop.js reads it, from its chord or its two halves' chords ("C G"): the bass moves with the second
function ritmeBarOf(name) {
  const [a, b] = name.split(' ').map(ritmeChord);
  return b ? [a.root, b.root, b.third, a.notes, b.notes, a.root] : [a.root, a.fifth, a.third, a.notes];
}
const ritmeBars = s => s.split('|').map(ritmeBarOf);

// bpm: its first speed; per: the tune's notes a bar; bounce: the bar the second section's band comes in at
export const RITME_CANCONS = {
  mulassa: { bpm: 138, per: 8, bounce: 16,
    bars: ritmeBars('Cm|Cm|Eb|Eb|Eb Bb|Cm G|Cm|G|Ab|Ab|Eb|Eb|G|G|C|C|C G|G7 C|C G|G7 C|C Dm|F C|C Dm|Dm7 C'),
    tune: [
      72, 0, 0, 0, 0, 0, 74, 0, 75, 0, 0, 0, 77, 0, 0, 0, 75, 0, 0, 0, 74, 0, 0, 0, 75, 0, 0, 0, 77, 0, 0, 0, // A, bars 1-2
      79, 0, 0, 0, 0, 0, 77, 0, 75, 0, 0, 0, 74, 0, 0, 0, 72, 0, 0, 0, 67, 0, 0, 0, 67, 0, 0, 0, 67, 0, 0, 0, // 3-4
      72, 0, 0, 0, 0, 0, 74, 0, 75, 0, 0, 0, 77, 0, 0, 0, 75, 0, 0, 0, 74, 0, 0, 0, 75, 0, 0, 0, 77, 0, 0, 0, // 5-6
      79, 0, 0, 0, 0, 0, 0, 0, 67, 0, 67, 0, 67, 0, 67, 0, 72, 0, 0, 0, 0, 0, 0, 0, 67, 0, 0, 0, 76, 0, 76, 0, // 7, 16
      72, 67, 72, 76, 74, 71, 71, 69, 67, 69, 71, 74, 72, 67, 76, 76, // B
      72, 67, 72, 76, 74, 71, 71, 69, 67, 69, 71, 74, 72, 0, 79, 79,
      76, 72, 76, 79, 77, 74, 74, 76, 77, 76, 77, 81, 79, 76, 79, 79, // C
      76, 72, 76, 79, 77, 74, 74, 76, 77, 74, 72, 71, 72, 0, 67, 67,
    ] },
  drac: { bpm: 126, per: 16, bounce: 8,
    bars: ritmeBars('G|D G|G|D G|G|D G|G|D G|D|D|G|D G|G C|D G|G|D G'),
    tune: [
      79, 0, 0, 74, 79, 0, 83, 0, 79, 0, 0, 0, 78, 0, 79, 0,
      81, 0, 0, 84, 83, 0, 81, 0, 83, 0, 79, 0, 86, 0, 83, 0,
      79, 0, 0, 74, 79, 0, 83, 0, 79, 0, 0, 0, 78, 0, 79, 0,
      81, 0, 0, 84, 83, 0, 81, 0, 79, 0, 0, 0, 86, 0, 83, 0,
      79, 0, 0, 74, 79, 0, 83, 0, 79, 0, 0, 0, 78, 0, 79, 0,
      81, 0, 0, 84, 83, 0, 81, 0, 83, 0, 79, 0, 86, 0, 83, 0,
      79, 0, 0, 74, 79, 0, 83, 0, 79, 0, 0, 0, 78, 0, 79, 0,
      81, 0, 0, 84, 83, 0, 81, 0, 79, 0, 0, 0, 78, 0, 79, 0,
      81, 0, 0, 83, 81, 0, 79, 0, 81, 0, 78, 0, 78, 0, 79, 0, // bar 10
      81, 0, 0, 83, 81, 0, 79, 0, 78, 0, 0, 0, 86, 0, 83, 0,
      79, 0, 0, 74, 79, 0, 83, 0, 79, 0, 0, 0, 78, 0, 79, 0,
      81, 0, 0, 84, 83, 0, 81, 0, 83, 0, 79, 0, 86, 0, 83, 0,
      79, 0, 0, 74, 79, 0, 83, 0, 79, 0, 0, 0, 84, 0, 83, 0,
      81, 0, 0, 79, 81, 0, 83, 0, 79, 0, 0, 0, 0, 0, 76, 78,
      79, 0, 0, 74, 79, 0, 74, 79, 83, 0, 0, 0, 79, 0, 0, 83, // bar 35
      81, 0, 0, 79, 78, 0, 0, 81, 79, 0, 0, 0, 86, 0, 83, 0,
    ] },
  bou: { bpm: 132, per: 16, bounce: 8,
    bars: ritmeBars('Cm|G Cm|Cm|G Cm|Am|E Am|Am|E Am|C|C|C|C|C|G C|C|G C'),
    tune: [
      79, 0, 0, 77, 75, 0, 74, 0, 72, 0, 67, 0, 72, 0, 75, 0, // bar 27
      74, 0, 67, 0, 74, 0, 77, 0, 75, 0, 0, 0, 72, 0, 0, 0,
      79, 0, 0, 77, 75, 0, 74, 0, 72, 0, 67, 0, 72, 0, 75, 0,
      74, 0, 77, 0, 75, 0, 74, 0, 72, 0, 0, 0, 0, 0, 0, 0,
      76, 0, 0, 74, 72, 0, 71, 0, 69, 0, 64, 0, 69, 0, 72, 0, // bar 31
      71, 0, 64, 0, 71, 0, 74, 0, 72, 0, 0, 0, 69, 0, 0, 0,
      76, 0, 0, 74, 72, 0, 71, 0, 69, 0, 64, 0, 69, 0, 72, 0,
      71, 0, 74, 0, 72, 0, 71, 0, 69, 0, 0, 0, 67, 0, 0, 0,
      79, 0, 79, 79, 79, 0, 79, 0, 79, 0, 81, 0, 79, 0, 77, 0, // bar 35
      76, 0, 76, 0, 74, 0, 74, 0, 72, 0, 0, 0, 67, 0, 0, 0,
      79, 0, 79, 79, 79, 0, 79, 0, 79, 0, 81, 0, 79, 0, 77, 0,
      76, 0, 0, 0, 74, 0, 0, 0, 72, 0, 0, 0, 0, 0, 0, 0,
      79, 0, 0, 77, 76, 0, 74, 0, 72, 0, 67, 0, 72, 0, 76, 0, // bar 60
      74, 0, 67, 0, 74, 0, 77, 0, 76, 0, 0, 0, 72, 0, 0, 0,
      79, 0, 0, 77, 76, 0, 74, 0, 72, 0, 67, 0, 72, 0, 76, 0,
      74, 0, 77, 0, 76, 0, 74, 0, 72, 0, 0, 0, 0, 0, 0, 0,
    ] },
};
