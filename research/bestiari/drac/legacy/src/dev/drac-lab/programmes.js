// The lab's two programmes, each one song clock: the current Drac (the game's own song-drac.json grid, mp3 and dance)
// and the proposal (music/drac-trial-form.json through the same compiler the generators use, its trial dance). Pure:
// no DOM, no audio. Video seconds come from the reference recording (docs/drac-reference-trial.md).
import { compileForm } from '../../music-form/compile.js';
import { timeAtBeat, beatAtTime } from '../../core/beat-grid.js';
import { dracPose, END_BEAT } from '../../game/dance-drac.js';
import { dracFeet, makeDracFeet } from '../../game/drac-feet.js';
import { makeTrialDracDance } from './trial-dance.js';
import song from '../../song-drac.json' with { type: 'json' };
import form from '../../../music/drac-form.json' with { type: 'json' };
import trialForm from '../../../music/drac-trial-form.json' with { type: 'json' };
import score from '../../../music/drac-score.json' with { type: 'json' };

export const VIDEO = { url: '/drac-reference/pm-lEViiPK0.mp4', source: 'https://www.youtube.com/watch?v=pm-lEViiPK0', duration: 111.934, pickup: 0.058 };
// What the recording shows (video seconds), for the markers; the dance tables cite the same windows.
export const OBSERVED = [[0, 16, 'Passos curts i balanceig, de cara'], [16, 20, 'Una volta al lloc'], [20, 30, 'Balanceig, obre i tanca'],
  [30, 43, 'Avança cap a la càmera, arc i retorn'], [43, 60, 'Passos i balanceig'], [60, 64, 'Volta al lloc'], [64, 73, 'Prepara'],
  [73, 86, 'Segon avanç, arc i retorn'], [86, 101, 'Girs seguits més ràpids'], [101, 104, 'Para de cara']];
// Chroma-DTW estimates (beat -> video second), a hypothesis per form, not an annotation: research form-candidates.json.
const ANCHORS = {
  current: [[11, 0], [12, 0.232], [42, 15.209], [56, 25.31], [72, 37.558], [104, 62.52], [128, 78.658], [132, 81.154], [146, 91.893], [152, 95.26], [157, 99.439]],
  proposal: [[11, 0.058], [12, 0.232], [28, 7.933], [42, 15.228], [56, 22.872], [72, 30.437], [104, 44.969], [128, 56.521], [132, 57.992], [146, 64.377],
    [162, 73.085], [194, 88.72], [218, 99.498], [223, 101.936]],
};
export const TRIAL_AUDIO_META = '/music/drac-trial-v1.json'; // written by tools/build_drac_trial.py with the mp3s

function programme(id, name, timeline, dance, feet, anchors, audio) {
  const pickupAt = timeAtBeat(timeline.beats, 11);
  const sections = timeline.arrangement.filter(([, l]) => l !== 'intro').map(([b, label]) => ({ beat: b, label, sec: timeAtBeat(timeline.beats, b) }));
  return { id, name, timeline, dance, feet, anchors, audio, pickupAt, sections, duration: timeAtBeat(timeline.beats, timeline.end + 1) };
}

export function buildProgrammes() {
  const current = compileForm(form, score), proposal = compileForm(trialForm, score);
  if (current.unresolved.length || proposal.unresolved.length) throw new Error('drac lab: a form does not compile');
  // the game's grid (rounded in song-drac.json, as the game plays it) and its own arrangement and dance
  const currentTimeline = { ...current, beats: song.beats, arrangement: song.arrangement, end: END_BEAT };
  const trialDance = makeTrialDracDance(proposal);
  return {
    current: programme('current', 'Actual', currentTimeline, { pose: dracPose }, dracFeet, ANCHORS.current, { joc: '/' + song.audio }),
    proposal: programme('proposal', 'Proposta', proposal, trialDance, makeDracFeet(trialDance, proposal.end), ANCHORS.proposal, {}),
  };
}

// Piecewise linear through [[x, y]] (ascending x), extended by the end segments' slopes; `inv` swaps the axes.
function lerp(points, x, inv) {
  const X = inv ? 1 : 0, Y = inv ? 0 : 1, n = points.length;
  let i = 0;
  while (i < n - 2 && x > points[i + 1][X]) i++;
  const a = points[i], b = points[i + 1];
  return a[Y] + (x - a[X]) * (b[Y] - a[Y]) / (b[X] - a[X]);
}
// Video second shown for a programme's beat. 'offset': the recording runs at its own speed from the pickup (one
// constant shift, + `offset` s); 'anchors': it follows the DTW estimates (resynced, rate = local slope).
export function videoAt(p, beat, mode, offset = 0) {
  if (mode === 'anchors') return lerp(p.anchors, beat) + offset;
  return timeAtBeat(p.timeline.beats, beat) - p.pickupAt + VIDEO.pickup + offset;
}
export function beatAtVideo(p, sec, mode, offset = 0) {
  if (mode === 'anchors') return lerp(p.anchors, sec - offset, true);
  return beatAtTime(p.timeline.beats, sec - offset - VIDEO.pickup + p.pickupAt);
}
// The video's speed relative to the song at a beat (1 in 'offset' mode): the local slope of the anchors over the beat's.
export function videoRate(p, beat, mode) {
  if (mode !== 'anchors') return 1;
  const d = 0.25, dv = lerp(p.anchors, beat + d) - lerp(p.anchors, beat - d);
  const dt = timeAtBeat(p.timeline.beats, beat + d) - timeAtBeat(p.timeline.beats, beat - d);
  return Math.min(2, Math.max(0.5, dv / dt));
}
