// The Bou Tradicional's game contract, src/song-bou.json, from Marc's approved v13 (music/bou-tradicional/): the
// melody (timing.json events, voice 0) on its own variable tempo map, never a constant BPM.
// Current playback is copied without re-encoding; approval.json preserves the original v13 baseline.
// Run: node tools/build_bou_chart.mjs
import { readFileSync, writeFileSync, copyFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';

const root = new URL('../', import.meta.url), at = p => new URL(p, root);
const approval = JSON.parse(readFileSync(at('music/bou-tradicional/approval.json')));
const playback = JSON.parse(readFileSync(at('music/bou-tradicional/playback.json')));
// the current mix starts `cutBeats` into v13's intro (tools/build_bou_mobile.py): the whole map moves back as far
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

// Audio: retain the baseline and publish the current mix without re-encoding.
const sha = f => createHash('sha256').update(readFileSync(f)).digest('hex');
assert.equal(sha(at('music/bou-tradicional/' + approval.audio)), approval.audioSha256, 'the packaged MP3 is not the approved one');
assert.equal(sha(at('music/bou-tradicional/' + playback.audio)), playback.audioSha256);
if (!existsSync(at(MP3)) || sha(at(MP3)) !== playback.audioSha256) copyFileSync(at('music/bou-tradicional/' + playback.audio), at(MP3));
assert.equal(sha(at(MP3)), playback.audioSha256);

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

// Level = the easiest difficulty that taps it, by its place in the 4/4 bar: beats 1 and 3 FÀCIL, beat 4 NORMAL, the
// beat 2 and the eighths between DIFÍCIL; triplets and sixteenths stay in the audio. FÀCIL stays flat (6-7 notes per
// 7 s) while the tempo climbs to 150: in a bar shorter than 1.8 s its beat 3 goes to NORMAL every other bar.
const near = (x, k) => Math.abs(x - k) < 1e-6;
const barOf = beat => Math.floor((beat - FIRST) / 4);
const fastBar = beat => { const b0 = FIRST + 4 * barOf(beat); return sec(b0 + 4) - sec(b0) < 1.8 && barOf(beat) % 2 === 1; };
function levelOf(n) {
  const p = ((n.beat - FIRST) % 4 + 4) % 4;
  if (near(p, 0)) return 0;
  if (near(p, 2)) return fastBar(n.beat) ? 1 : 0;
  if (near(p, 3)) return 1;
  if (near(p % 1, 0) || near(p % 1, 0.5)) return 2;
  return 3;
}
// GUAPA: the openings of the dance's phrases (bou-dance.js anchors), the festive last phrase and the final do.
const BIG = new Set([FIRST, barAt(19), barAt(27), barAt(35), barAt(64), barAt(72), barAt(80), barAt(88), LAST]);
for (const b of BIG) assert(melody.some(n => near(n.beat, b) && levelOf(n) === 0), `GUAPA on beat ${b} is not a FÀCIL melody note`);
// MANTÉN: the tune's long notes (two beats or more), held to a beat before they end: a beat of air before the next tap.
const holdEnd = n => n.beats >= 2 && levelOf(n) <= 1 && !BIG.has(n.beat) ? n.beat + n.beats - 1 : 0;

// Sides follow the melody: up -> PA (ka), down -> GUA (don), same -> keep; no level plays more than 4 on one side.
const taps = melody.map(n => ({ ...n, level: levelOf(n), big: BIG.has(n.beat), end: holdEnd(n) })).filter(n => n.level < 3);
const air = taps.filter(n => n.end).map(n => [n.beat, n.end]);
const chart = taps.filter(n => !air.some(([a, e]) => n.beat > a + 1e-6 && n.beat < e + 1 - 1e-6));
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

const notes = chart.map(n => [r4(sec(n.beat)), n.side, n.level, n.big ? 1 : 0, n.end ? r4(sec(n.end)) : 0]);
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
  // the ESQUELLOT (the Bou's GLOBUS, Marc 2026-10-24): the last two bars mashed up to the final hit; its notes give way (chart.js)
  balloons: [[barAt(90), barAt(92)]],
  notes,
  audio: `music/${playback.audio}?v=${playback.audioSha256.slice(0, 12)}`,
  // what the dance (game/bou-dance.js) needs from timing.json, so the game never bundles the whole 470 KB file:
  // its phrase landmarks, the bars [source bar, beat, s] and the exact 1/12-beat grid
  dance: { melodyStart: r6(timing.melodyStart), technoStart: r6(timing.technoStart), finaleCandidate: r6(timing.finaleCandidate),
    bars: timing.bars.map(b => [b.sourceBar, b.beat, r6(b.time)]), subdivision: SUB, subdivisionTimes: ST.map(r6) },
};
assert(Math.abs(song.finale - timing.finaleCandidate) < 1e-3);
writeFileSync(at('src/song-bou.json'), JSON.stringify(song) + '\n');
const per = [0, 1, 2].map(l => notes.filter(n => n[2] <= l).length);
console.log('song-bou.json:', notes.length, 'notes; per level', per.join(' / '), '; end', song.end, '; finale', song.finale);
