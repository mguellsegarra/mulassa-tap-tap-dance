// A song's dance structure, read from its own data (song-*.json), for the generic dance engine (game/choreo/planner.js).
// Pure and symbolic, no audio analysis: the sections (the arrangement's labels in beats, else `sections` in seconds),
// each split into 8-beat phrases from its first beat (research/reenfocament-cancons/decisions.md 5: beats and phrases
// of 8, whatever the song's bar), the finale and the last hit as beats, and an intensity step per section.
// Everything is in beats of the song's own grid: the tempo is read from `beats`, never from song.bpm.
import { beatAtTime } from '../../core/beat-grid.js';

const CHOREO_PHRASE = 8;
const CHOREO_SHORT = 4; // a section's tail shorter than this joins its last phrase; longer, it is a short phrase of its own

// Section rows [beat, label] from the arrangement (Mulassa, Drac) or the coarse A/B sections (seconds), on whole beats
// from 0 (a lead-in before the grid's first beat starts nothing earlier)
function choreoSections(song) {
  const B = song.beats;
  const rows = (song.arrangement ?? song.sections.map(([t, l]) => [beatAtTime(B, t), l])).map(([b, l]) => [Math.max(0, Math.round(b)), l]);
  return rows.filter(([b], i) => b < (rows[i + 1]?.[0] ?? Infinity)); // two on one beat (a half-beat pickup): the later one
}

// The intensity step (research/motor-ball/coreografia.md, «Com creix la intensitat» and rules 5 and 7): 0 waiting,
// 1 sober, 2 lively, 3 comic, 4 the finale. The first full section is sober; each new section goes a step up unless it is
// clearly weaker (sparser notes, fewer big ones, a slower local tempo), then a step down; never two steps at once. A song
// whose sections never climb to 3 gets its last one there all the same: the figure's own moves (its signature, step 3)
// belong on every song's strong moments (decisions.md 9). A chartless song (no notes yet) climbs on its sections alone.
const choreoDrive = s => (s.density * (1 + s.big) + 1e-6) * s.tempo;

// song: { beats, notes, finale, end, arrangement? | sections }
export function songStructure(song) {
  const B = song.beats, end = Math.round(beatAtTime(B, song.end)), finale = Math.round(beatAtTime(B, song.finale));
  const rows = choreoSections(song);
  const firstNote = song.notes.length ? Math.floor(beatAtTime(B, song.notes[0][0]) + 0.01) : rows[0]?.[0] ?? 0;
  const tempoAt = b => { const k = Math.max(0, Math.min(b, B.length - 2)); return 60 / (B[k + 1] - B[k]); };
  const meanTempo = end / (B[Math.min(end, B.length - 1)] - B[0]) * 60; // beats a minute over the whole song
  const sections = [];
  for (let i = 0; i < rows.length; i++) {
    const start = rows[i][0], stop = Math.min(rows[i + 1]?.[0] ?? end, finale);
    if (stop - start < 1) continue;
    const label = rows[i][1], family = label.replace(/[0-9]+$/, '');
    const notes = song.notes.filter(([t]) => { const b = beatAtTime(B, t); return b >= start - 0.01 && b < stop - 0.01; });
    let tempo = 0;
    for (let b = start; b < stop; b++) tempo += tempoAt(b);
    sections.push({
      start, len: stop - start, label, family,
      density: notes.length / (stop - start), big: notes.length ? notes.filter(n => n[3]).length / notes.length : 0,
      tempo: tempo / (stop - start) / meanTempo, level: 0,
    });
  }
  // steps: sections before the first note (and short pickups) wait; the rest climb from sober
  let prev = null;
  for (const s of sections) {
    if (s.start + s.len <= firstNote || s.len < CHOREO_PHRASE) { s.level = prev ? prev.level : 0; continue; }
    if (!prev) s.level = 1;
    else { const r = choreoDrive(s) / choreoDrive(prev); s.level = Math.max(1, Math.min(3, prev.level + (r < 0.8 ? -1 : r > 1.12 || s.label !== prev.label ? 1 : 0))); }
    prev = s;
  }
  if (prev && !sections.some(s => s.level === 3)) prev.level = 3;
  // phrases of 8 from each section's start; a short tail joins the last one or stands alone
  const phrases = [];
  for (const s of sections) {
    const n = Math.max(1, Math.floor(s.len / CHOREO_PHRASE)), tail = s.len - n * CHOREO_PHRASE;
    for (let k = 0; k < n; k++) phrases.push({ start: s.start + k * CHOREO_PHRASE, len: CHOREO_PHRASE, section: s });
    if (s.len < CHOREO_PHRASE) phrases.at(-1).len = s.len;
    else if (tail >= CHOREO_SHORT) phrases.push({ start: s.start + n * CHOREO_PHRASE, len: tail, section: s });
    else phrases.at(-1).len += tail;
  }
  return { first: firstNote, finale, end, sections, phrases };
}
