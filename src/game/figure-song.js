// Active generated arrangement. Live bindings keep every consumer on the same song without editing its data.
import mulassaSong from '../song-mulassa.json' with { type: 'json' };
import dracSong from '../song-drac.json' with { type: 'json' };
import bouSong from '../song-bou.json' with { type: 'json' };
import tombaSong from '../song-tombairot.json' with { type: 'json' };
import { beatAtTime, timeAtBeat } from '../core/beat-grid.js';
import { FIGURES, MULASSA, DRAC, BOU, TOMBA_ID } from './figures.js';
import { setFigureTheme } from './figure-theme.js';
import { traitsOf } from '../figures/index.js';
import { Q } from '../core/flags.js';

const FIGURE_SONGS = { [MULASSA.id]: mulassaSong, [DRAC.id]: dracSong, [BOU.id]: bouSong, [TOMBA_ID]: tombaSong }; // (null in a build while unreleased: tools/deploy/unreleased-figure.mjs)
// Dev: ?canco=<key> (mulassa, drac, bou, tombairot) gives a figure that can dance any song (its trait anySong: the
// generic engine, game/choreo/) that song instead of its own, until the selector has its song step.
const DEV_SONGS = { mulassa: mulassaSong, drac: dracSong, bou: bouSong, tombairot: tombaSong }, DEV_KEY = Q.get('canco');
const DEV_SONG = (Object.hasOwn(DEV_SONGS, DEV_KEY) && DEV_SONGS[DEV_KEY]) || null;
export const menuSong = mulassaSong; // the menu loop, whoever is selected
export const figureSong = id => FIGURE_SONGS[id]; // a figure's own recording, selected or not (free mode's radio)
export const danceSong = id => (traitsOf(id).anySong && DEV_SONG) || FIGURE_SONGS[id]; // the song it dances
// The title and credits of the song a figure dances: its own, or those of the figure the song belongs to
export const songCredit = figure => FIGURES.find(f => FIGURE_SONGS[f.id] && FIGURE_SONGS[f.id] === danceSong(figure.id)) ?? figure;
export let songSwapped = false; // the selected figure dances another figure's song: no record, statistics, board or challenge
export let selectedFigure = MULASSA;
export let song = mulassaSong;
export let BEATS = song.beats;
export let BEAT = (BEATS.at(-1) - BEATS[0]) / (BEATS.length - 1);
export let FINALE_T = song.finale;
// Stage framing and body clearance are figure traits, independent of choreography's travel envelope.
export const figureScale = () => traitsOf(selectedFigure.id).sceneScale;
export const figureReach = () => traitsOf(selectedFigure.id).sceneReach;
export function setFigureSong(value) {
  const figure = FIGURES.find(f => f.id === (typeof value === 'string' ? value : value?.id));
  if (!figure || !FIGURE_SONGS[figure.id]) return false;
  selectedFigure = figure;
  setFigureTheme(traitsOf(figure.id).key); // buttons, words and colours follow the figure
  song = danceSong(figure.id); songSwapped = song !== FIGURE_SONGS[figure.id];
  BEATS = song.beats;
  BEAT = (BEATS.at(-1) - BEATS[0]) / (BEATS.length - 1);
  FINALE_T = song.finale;
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
