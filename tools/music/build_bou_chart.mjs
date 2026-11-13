// The Bou Tradicional's game contract, src/song-bou.json, from the approved v13 (music/bou-tradicional/): the
// melody (timing.json events, voice 0) on its own variable tempo map, never a constant BPM.
// Current playback is copied without re-encoding; approval.json preserves the original v13 baseline.
// Run: node tools/music/build_bou_chart.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';

const root = new URL('../../', import.meta.url), at = p => new URL(p, root);
const approval = JSON.parse(readFileSync(at('music/bou-tradicional/approval.json')));
const playback = JSON.parse(readFileSync(at('music/bou-tradicional/playback.json')));
// the current mix starts `cutBeats` into v13's intro (tools/music/build_bou_mobile.py): the whole map moves back as far
const shiftTiming = (raw, cut) => {
  const T0 = raw.subdivisionTimes[cut * raw.subdivision], s = t => t - T0;
  return { ...raw, introBeats: raw.introBeats - cut, duration: s(raw.duration), musicEnd: s(raw.musicEnd), melodyStart: s(raw.melodyStart),
    technoStart: s(raw.technoStart), finaleCandidate: s(raw.finaleCandidate), finalNoteStart: s(raw.finalNoteStart),
    beats: raw.beats.slice(cut).map(s), subdivisionTimes: raw.subdivisionTimes.slice(cut * raw.subdivision).map(s),
    bars: raw.bars.map(b => ({ ...b, beat: b.beat - cut, time: s(b.time), end: s(b.end) })),
    events: raw.events.map(e => ({ ...e, beat: e.beat - cut, start: s(e.start), end: s(e.end) })) };
};
const timing = shiftTiming(JSON.parse(readFileSync(at('music/bou-tradicional/timing.json'))), playback.cutBeats ?? 0);
assert.equal(playback.baseSha256, approval.audioSha256, 'remix must retain the approved v13 source');
const MP3 = 'public/music/' + playback.audio;

// Audio: the baseline stays in the package; the current mix is only in public/music.
const sha = f => createHash('sha256').update(readFileSync(f)).digest('hex');
assert.equal(sha(at('music/bou-tradicional/' + approval.audio)), approval.audioSha256, 'the packaged MP3 is not the approved one');
assert.equal(sha(at(MP3)), playback.audioSha256, 'the public MP3 is not the current mix');

// Beat -> seconds on the 1/12-beat subdivision grid (keeps the bar-63 ritardando inside its beats).
const SUB = timing.subdivision, ST = timing.subdivisionTimes;
const sec = b => { const x = b * SUB, i = Math.min(Math.floor(x), ST.length - 2); return ST[i] + (x - i) * (ST[i + 1] - ST[i]); };
const r4 = x => Math.round(x * 1e4) / 1e4, r6 = x => Math.round(x * 1e6) / 1e6;
const FIRST = timing.introBeats, LAST = timing.bars.at(-1).beat; // melody from beat 8; the final do on beat 316
const barAt = n => timing.bars.find(b => b.sourceBar === n).beat;

// The tune: voice 0, one note per attack (bar 4's octave chord keeps its top note).
const melody = [];
for (const e of timing.events.filter(e => e.voice === 0).sort((a, b) => a.beat - b.beat || b.pitch - a.pitch)) {
  if (melody.length && Math.abs(melody.at(-1).beat - e.beat) < 1e-6) continue;
  melody.push({ beat: e.beat, beats: e.beats, pitch: e.pitch });
}
assert(melody.length > 300 && Math.abs(melody[0].beat - FIRST) < 1e-6 && Math.abs(melody.at(-1).beat - LAST) < 1e-6);

// Level = the easiest difficulty that taps it. Each bar is read by the shape of its four beats (h: a note of two
// beats or more starts there, q: one beat, e: shorter, t: a triplet, -: none) and always gets the same taps, all on
// the beats. FÀCIL: the bar's first beat and the long notes that close a phrase (the two quarters after a run), not
// an even pulse; NORMAL adds the beats of the run; DIFÍCIL taps every eighth. Triplets and sixteenths stay in the audio.
const near = (x, k) => Math.abs(x - k) < 1e-2;
const barOf = beat => Math.floor((beat - FIRST + 1e-6) / 4);
const TAPS = { // shape: [FÀCIL's beats, NORMAL's]
  'h-e-': [[0, 2], [0, 2]], 'h--t': [[0, 3], [0, 3]], 'h-qe': [[0], [0, 2]], 'h-qt': [[0], [0, 2]], 'h---': [[0], [0]], 'q---': [[0], [0]],
  tttt: [[0, 2], [0, 1, 2]], teqe: [[0, 2], [0, 1, 2]], 'tte-': [[0, 2], [0, 1, 2]],
  qqqq: [[0, 2, 3], [0, 1, 2, 3]], 'qqh-': [[0, 1, 2], [0, 1, 2]],
  eeee: [[0], [0, 1, 2]], eeqq: [[0, 2, 3], [0, 2, 3]], 'eeh-': [[0, 2], [0, 1, 2]], 'eeq-': [[0, 2], [0, 1, 2]],
};
const LEVEL = new Map(); // beat -> level; a note off the grid has none
const RUN = new Map(); // beat -> the end of a run held from its first note, on NORMAL and DIFÍCIL
{
  const bars = new Map();
  for (const n of melody) bars.set(barOf(n.beat), [...(bars.get(barOf(n.beat)) ?? []), n]);
  for (const [k, list] of bars) {
    const b0 = FIRST + 4 * k, at = p => list.find(n => near(n.beat - b0, p)), frac = f => list.filter(n => near((n.beat - b0) % 1, f)).length;
    const shape = [0, 1, 2, 3].map(p => { const n = at(p); return !n ? '-' : n.beats > 1.99 ? 'h' : n.beats > 0.99 ? 'q' : n.beats < 0.4 ? 't' : 'e'; }).join('');
    let taps = TAPS[shape];
    if (frac(2 / 3) >= 2 && !frac(1 / 3)) { // bars 9-16 gallop (tan-ta on every beat): every other beat, then three, then all four
      const f = at(0) ? [0, 2] : [1, 3];
      taps = [f, [...f, f[0] + 1], [0, 1, 2, 3]];
    }
    // a little of MANTÉN on the runs: in the third bar of each four-bar phrase (the run comes back) NORMAL and DIFÍCIL
    // hold its first two beats instead of tapping them, then tap its end
    else if (shape === 'eeee' && k % 4 === 3) { taps = [[0], [0, 3], [0, 3, 3.5]]; RUN.set(b0, b0 + 2); }
    assert(taps, `bar at beat ${b0}: no taps for the shape ${shape}`);
    const eighths = list.map(n => n.beat - b0).filter(p => near(p * 2, Math.round(p * 2)));
    [taps[0], taps[1], taps[2] ?? eighths].forEach((ps, L) => { for (const p of ps) { const n = at(p); if (n && !LEVEL.has(n.beat)) LEVEL.set(n.beat, L); } });
  }
}
const levelOf = n => LEVEL.get(n.beat) ?? 3;
// GUAPA: the openings of the dance's phrases (bou-dance.js anchors), the festive last phrase and the final do. Not the
// song's first note: its long do is held, as every time it comes back.
const BIG = new Set([barAt(19), barAt(27), barAt(35), barAt(64), barAt(72), barAt(80), barAt(88), LAST]);
for (const b of BIG) assert(melody.some(n => near(n.beat, b) && levelOf(n) === 0), `GUAPA on beat ${b} is not a FÀCIL melody note`);

// Sides follow the melody: up -> PA (ka), down -> GUA (don), same -> keep; no level plays more than 4 on one side.
const chart = melody.map(n => ({ ...n, level: levelOf(n), big: BIG.has(n.beat), end: 0 })).filter(n => n.level < 3);
// MANTÉN: a note of a beat or more is held as long as it sounds, up to a beat before the next tap of any level.
chart.forEach((n, i) => {
  const end = Math.min(n.beat + n.beats, (chart[i + 1]?.beat ?? Infinity) - 1);
  if (n.level <= 1 && !n.big && end - n.beat >= 1 - 1e-6) n.end = end; // (a FÀCIL note's hold shows on FÀCIL: song.easyHolds)
});
// and a BRAMA answers the long do: the short note that closes a held one of two beats, before the tune rests
chart.forEach((n, i) => {
  const held = chart[i - 1], rest = (chart[i + 1]?.beat ?? Infinity) - (n.beat + n.beats) > 0.25;
  if (held?.end && held.beats >= 2 && near(held.beat + held.beats, n.beat) && rest && n.level === 0) n.big = true;
});
let last = null;
for (const n of chart) { n.side = last == null ? 'don' : n.pitch > last.pitch ? 'ka' : n.pitch < last.pitch ? 'don' : last.side; last = n; }
for (let lvl = 0; lvl < 3; lvl++) {
  for (let guard = 0; ; guard++) {
    assert(guard < 500, 'side runs do not settle');
    let run = [], flip = null;
    for (const n of chart) {
      if (n.level > lvl || n.big) { if (n.big) run = []; continue; }
      run = run.length && run[0].side === n.side ? [...run, n] : [n];
      // the easier charts are settled: flip this level's own latest note of the run, never one they share
      if (run.length > 4) { flip = run.findLast(m => m.level === lvl); break; }
    }
    if (!flip) break;
    flip.side = flip.side === 'don' ? 'ka' : 'don';
  }
}

// a hold's end: one number, or [FÀCIL, NORMAL, DIFÍCIL] for a held run, which FÀCIL only taps
const holdOf = n => (RUN.has(n.beat) && !n.big ? [0, r4(sec(RUN.get(n.beat))), r4(sec(RUN.get(n.beat)))] : n.end ? r4(sec(n.end)) : 0);
const notes = chart.map(n => [r4(sec(n.beat)), n.side, n.level, n.big ? 1 : 0, holdOf(n)]);
const S = b => r4(sec(b));
const song = {
  figure: 'bou-tradicional-valls', revision: timing.revision,
  bpm: Math.round(timing.tempoBpm[0]), // the opening tempo only: the grid below changes phrase by phrase
  duration: r4(timing.duration),
  end: S(LAST), // the final do: the last tap
  tail: Math.floor(timing.duration * 10) / 10, // the whole approved fade
  finale: S(barAt(88)), // timing.json finaleCandidate: the last phrase, the festive ending
  sections: [[0, 'A'], [S(barAt(19)), 'B'], [S(barAt(27)), 'A'], [S(barAt(35)), 'B'], [S(barAt(60)), 'A'], [S(barAt(72)), 'B']],
  beats: timing.beats.map(r4),
  // the ESQUELLOT (the Bou's GLOBUS): the last two bars mashed up to the final hit; its notes give way (chart.js)
  balloons: [[barAt(90), barAt(92)]],
  // MANTÉN on FÀCIL too (chart.js): its opening is the long do held, on every level (the owner, 13/11/2026)
  easyHolds: true,
  notes,
  audio: `music/${playback.audio}?v=${playback.audioSha256.slice(0, 12)}`,
  // what the dance (figures/bou/bou-dance.js) needs from timing.json, so the game never bundles the whole 470 KB file:
  // its phrase landmarks, the bars [source bar, beat, s] and the exact 1/12-beat grid
  dance: { melodyStart: r6(timing.melodyStart), technoStart: r6(timing.technoStart), finaleCandidate: r6(timing.finaleCandidate),
    bars: timing.bars.map(b => [b.sourceBar, b.beat, r6(b.time)]), subdivision: SUB, subdivisionTimes: ST.map(r6) },
};
assert(Math.abs(song.finale - timing.finaleCandidate) < 1e-3);
writeFileSync(at('src/song-bou.json'), JSON.stringify(song) + '\n');
const per = [0, 1, 2].map(l => notes.filter(n => n[2] <= l).length);
console.log('song-bou.json:', notes.length, 'notes; per level', per.join(' / '), '; end', song.end, '; finale', song.finale);
