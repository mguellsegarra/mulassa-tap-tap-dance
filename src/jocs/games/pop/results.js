// A run's end: the blast and its culprit, then the end sheet with the score, this device's best and the board's answer
// (ranking-ui.js). flow.js says when; the best lives here.
import { store } from '../../../platform/storage.js';
import { stopMusic, SFX } from './audio.js';
import { haptic } from '../../../platform/haptics.js';
import { RANKING } from './ranking-ui.js';

const BEST = 'pica-best'; // the game's first name: kept, so a best score survives the rename
export const END_SHEET_MS = 1200; // the blast plays out before the sheet comes up (tests/jocs/pop-blast.mjs)
export const best = () => +store.get(BEST) || 0;

export function createResults({ board, t, rankingUI }) {
  const $ = id => document.getElementById(id);
  $('end-art').innerHTML = $('boot-art').innerHTML.replace('class="mula-load"', 'class="mula-load sad"');

  // a Mulassa or a bomb ends the run by running out; the rest by being tapped: the kind alone says which
  function blast(cell) {
    $('end-why').querySelector('img').src = document.querySelector(`.c-card[data-kind="${cell.kind}"] img`).src;
    $('end-why').querySelector('span').textContent = t(`end.why.${cell.kind}`);
    SFX.wrong();
    SFX.boom();
    haptic('boom'); // a tapped Drac's inside the tap (iPhone too); a fuse running out vibrates on Android only
    board.explodeAll(cell.i);
    stopMusic();
    $('pause').style.visibility = 'hidden'; // hidden would close its grid column and move the score
  }

  // practice: a dev run (?autoplay, ?campanar) neither sets the best nor goes on the board
  function show(run, { practice }) {
    const { game } = run, was = best(), record = game.score > was;
    if (record && !practice) store.set(BEST, game.score);
    $('end-title').textContent = t(record ? 'end.record' : 'end.over');
    $('end-score').textContent = game.score;
    $('end-best').textContent = record ? t('end.recordSub') : t('end.best', { best: was });
    $('end-best').classList.toggle('record', record);
    rankingUI.endScreen();
    if (RANKING && !practice && game.score > 0) rankingUI.publish(run);
    $('end-menu').hidden = false;
    $('hud').hidden = true;
    $('again').focus({ focusVisible: false });
  }

  return { blast, show };
}
