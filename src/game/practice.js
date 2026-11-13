// First-game practice: five short steps played on the real lane (same notes, judge and FX as the song), each
// a few notes on the song's own beat grid (song.bpm), two beats apart so there is time to think.
// notes: [beat, input, holdBeats]; input L = GUA, R = PA, B = GUAPA (both), P = GLOBUS (balloon, any side).
// A drum run has its own steps (docs/agents/drum-mode.md), in the same notes: GUA = the left centre, PA = the right one,
// GUAPA = both rims; r = a roll (any zone) instead of the holds.
import { tr } from '../i18n/messages.js';
// Done on this device or by the profile on any (the seen-notices registry, id 'tutorial'); done here before there was a
// profile (or before 1.2.11) and not yet on the server: the profile learns it now.
export function practiceSeen(doneHere, owner, notices) {
  if (doneHere && owner && !notices.seen(owner, 'tutorial')) notices.mark(owner, 'tutorial');
  return doneHere || notices.seen(owner, 'tutorial');
}
const KEY_STEPS = [
  { word: 'GUA', notes: [[0, 'L'], [2, 'L'], [4, 'L'], [6, 'L']], need: 3 },
  { word: 'PA', notes: [[0, 'R'], [2, 'R'], [4, 'R'], [6, 'R']], need: 3 },
  { word: 'GUAPA', notes: [[0, 'B'], [2, 'B'], [4, 'B']], need: 2 },
  { word: tr('game.practice.hold.word'), notes: [[0, 'L', 3], [5, 'R', 3]], need: 1 },
  { word: tr('game.practice.balloon.word'), notes: [[0, 'P', 4]], need: 1, pumps: 6 },
];
const DRUM_STEPS = [
  KEY_STEPS[0], KEY_STEPS[1],
  { word: 'GUA PA', notes: [[0, 'L'], [2, 'R'], [4, 'L'], [6, 'R']], need: 3 },
  KEY_STEPS[2],
  { word: 'ROLL', notes: [[0, 'r', 4]], need: 1 },
  { word: tr('game.practice.balloon.word'), notes: [[0, 'P', 4]], need: 1, pumps: 6 },
].map(step => ({ ...step, drum: true })); // drum: the step's text lines (hud/draw.js), never a note's flag
export let STEPS = KEY_STEPS; // the practice in use: flow.js sets it from G.drum as a practice starts
export const setPracticeDrum = on => (STEPS = on ? DRUM_STEPS : KEY_STEPS);

// The step's notes, starting on beat k0 of `beats` (the song's beat times), shaped like makeDanceChart's.
export function buildStep(step, beats, k0, phrase = 0) {
  return step.notes.map(([b, input, len = 0]) => {
    const t = beats[k0 + b], end = len ? beats[k0 + b + len] : 0;
    if (input === 'P') return { t, end, balloon: true, need: step.pumps, input, phrase };
    if (input === 'r') return { t, end, roll: true, input: 'P', phrase };
    return { t, end, input, big: input === 'B', phrase };
  });
}
export const stepBeats = step => Math.max(...step.notes.map(([b, , len = 0]) => b + len)); // beats from first note to last end

const good = k => k === 'perfect' || k === 'good';
const passed = n => n.balloon ? n.count >= n.need : n.roll ? n.count > 0 : n.end ? good(n.tail) : good(n.hit);
// Every note judged (a hold only once its tail is; a roll has no verdict, its end is flow.js's endT), then: enough of them done right?
export const stepDone = notes => notes.every(n => n.roll || (n.hit && (n.balloon || !n.end || n.tail)));
export const stepPassed = (step, notes) => Boolean(step) && notes.filter(passed).length >= step.need;
// The step to play at index i, or null once past the last one (a skipped/bumped index, NaN): the practice is over.
export const stepAt = i => i >= 0 && i < STEPS.length ? STEPS[Math.floor(i)] : null;
