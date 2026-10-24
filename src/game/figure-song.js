// Active generated arrangement. Live bindings keep every consumer on the same song without editing its data.
import mulassaSong from '../song.json' with { type: 'json' };
import dracSong from '../song-drac.json' with { type: 'json' };
import bouSong from '../song-bou.json' with { type: 'json' };
import { beatAtTime, timeAtBeat } from '../core/beat-grid.js';
import { FIGURES, MULASSA, DRAC, BOU } from './figures.js';
import { DRAC_SIZE, DRAC_SCALE } from '../scene/models/drac.js';
import { setFigureTheme } from './figure-theme.js';

const FIGURE_SONGS = { [MULASSA.id]: mulassaSong, [DRAC.id]: dracSong, [BOU.id]: bouSong };
export const menuSong = mulassaSong; // the menu loop, whoever is selected
export const figureSong = id => FIGURE_SONGS[id]; // any figure's song, selected or not (free mode's radio)
export let selectedFigure = MULASSA;
export let song = mulassaSong;
export let BEATS = song.beats;
export let BEAT = (BEATS.at(-1) - BEATS[0]) / (BEATS.length - 1);
export let FINALE_T = song.finale;
// Where a run starts in the recording: ?from (env.js), else the song's own start (the Bou skips its soft pre-roll).
let from = 0;
export let playFrom = 0;
export const setPlayFrom = s => { from = s; playFrom = from || song.start || 0; };
// Scene dimensions are independent of choreography's travel envelope.
// cameras and the crowd's clearance were tuned around the Mulassa (4.03 m): the Drac's height over hers
// the Bou stands ~2.2 m to the horns, but travels and turns with its two carriers: a little more room than its height
const BOU_SCALE = 0.8;
export const figureScale = () => selectedFigure.id === DRAC.id ? DRAC_SIZE.h * DRAC_SCALE / 4.03 : selectedFigure.id === BOU.id ? BOU_SCALE : 1;
// the crowd's clearance to its body box (crowd.js): the Bou is low but as long as the Mulassa (3.8 m, horns to tail)
export const figureReach = () => selectedFigure.id === BOU.id ? 0.9 : figureScale();
export function setFigureSong(value) {
  const figure = FIGURES.find(f => f.id === (typeof value === 'string' ? value : value?.id));
  if (!figure || !FIGURE_SONGS[figure.id]) return false;
  selectedFigure = figure;
  setFigureTheme(figure.id === DRAC.id ? 'drac' : figure.id === BOU.id ? 'bou' : 'mulassa'); // buttons, words and colours follow the figure
  song = FIGURE_SONGS[figure.id];
  BEATS = song.beats;
  BEAT = (BEATS.at(-1) - BEATS[0]) / (BEATS.length - 1);
  FINALE_T = song.finale;
  playFrom = from || song.start || 0;
  return true;
}
// Both songs change tempo phrase by phrase: every reading goes through the local beat grid (beyond its ends, the first /
// last beat's length carries on). BEAT is only the song's mean beat, never a clock.
export const beatAt = t => beatAtTime(BEATS, t);
export const songTimeAtBeat = beat => timeAtBeat(BEATS, beat);
// Count-in follows the local beat intervals, including the accelerations and final ritardandos.
export const countInAt = t => [3, 2, 1].map(k => songTimeAtBeat(beatAt(t) - k));
export const countInDuration = t => t - songTimeAtBeat(beatAt(t) - 3);

// HUD countdown phase: integers 0/1/2 land on the very same clicks as countInAt().
export function countInPhase(t, target) {
  const phase = 3 + beatAt(t) - beatAt(target);
  const whole = Math.round(phase) || 0;
  return Math.abs(phase - whole) < 1e-9 ? whole : phase;
}

// Every figure counts in the same way (timbal, 3 2 1, BALLA! on the song's first beat); its song's own intro plays after.
export const startCueAt = from => BEATS.find(b => b >= from) ?? from;
