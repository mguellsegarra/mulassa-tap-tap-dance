// Active generated arrangement. Live bindings keep every consumer on the same song without editing its data.
import mulassaSong from '../song.json' with { type: 'json' };
import dracSong from '../song-drac.json' with { type: 'json' };
import { beatAtTime, timeAtBeat } from '../core/beat-grid.js';
import { FIGURES, MULASSA, DRAC } from './figures.js';
import { DRAC_SIZE, DRAC_SCALE } from '../scene/models/drac.js';
import { setFigureTheme } from './figure-theme.js';

const FIGURE_SONGS = { [MULASSA.id]: mulassaSong, [DRAC.id]: dracSong };
export const menuSong = mulassaSong; // the menu loop, whoever is selected
export let selectedFigure = MULASSA;
export let song = mulassaSong;
export let BEATS = song.beats;
export let BEAT = (BEATS.at(-1) - BEATS[0]) / (BEATS.length - 1);
export let FINALE_T = song.finale;
// Scene dimensions are independent of choreography's travel envelope.
// cameras and the crowd's clearance were tuned around the Mulassa (4.03 m): the Drac's height over hers
export const figureScale = () => selectedFigure.id === DRAC.id ? DRAC_SIZE.h * DRAC_SCALE / 4.03 : 1;
export function setFigureSong(value) {
  const figure = FIGURES.find(f => f.id === (typeof value === 'string' ? value : value?.id));
  if (!figure || !FIGURE_SONGS[figure.id]) return false;
  selectedFigure = figure;
  setFigureTheme(figure.id === DRAC.id); // buttons, words and colours follow the figure
  song = FIGURE_SONGS[figure.id];
  BEATS = song.beats;
  BEAT = (BEATS.at(-1) - BEATS[0]) / (BEATS.length - 1);
  FINALE_T = song.finale;
  return true;
}
export function beatAt(t) {
  if (selectedFigure.id === MULASSA.id) { // preserve the legacy constant-tempo extrapolation
    if (t <= BEATS[0]) return (t - BEATS[0]) / BEAT;
    if (t >= BEATS.at(-1)) return BEATS.length - 1 + (t - BEATS.at(-1)) / BEAT;
  }
  return beatAtTime(BEATS, t);
}
export const songTimeAtBeat = beat => timeAtBeat(BEATS, beat);
// Count-in follows the local beat intervals, including the Drac's acceleration and final ritardando.
export const countInAt = t => [3, 2, 1].map(k => selectedFigure.id === MULASSA.id ? t - k * BEAT : songTimeAtBeat(beatAt(t) - k));
export const countInDuration = t => selectedFigure.id === MULASSA.id ? 3 * BEAT : t - songTimeAtBeat(beatAt(t) - 3);

// HUD countdown phase: integers 0/1/2 land on the very same clicks as countInAt().
export function countInPhase(t, target) {
  const phase = selectedFigure.id === MULASSA.id ? 3 + (t - target) / BEAT : 3 + beatAt(t) - beatAt(target);
  const whole = Math.round(phase) || 0;
  return Math.abs(phase - whole) < 1e-9 ? whole : phase;
}
