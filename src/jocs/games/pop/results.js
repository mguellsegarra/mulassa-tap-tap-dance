// A run's end: the blast, then the end sheet: what ended it, alive (hero.js solo) under a title of its own, the score, this
// device's best and the board's answer (ranking-ui.js). flow.js says when.
import { stopMusic, SFX } from './audio.js';
import { haptic } from '../../../platform/haptics.js';
import { RANKING } from './ranking-ui.js';
import { best, raiseBest } from './best.js';

export const END_SHEET_MS = 1200; // the blast plays out before the sheet comes up (tests/jocs/pop-blast.mjs)

export function createResults({ board, hero, t, rankingUI }) {
  const $ = id => document.getElementById(id);
  let culprit = 'drac'; // 'time': the run's cap ended it (run.js), no culprit

  // a Mulassa or a bomb ends the run by running out; the rest by being tapped: the kind alone says which
  function blast(cell) {
    culprit = cell ? cell.kind : 'time';
    if (cell) SFX.wrong();
    SFX.boom();
    haptic('boom'); // a tapped Drac's inside the tap (iPhone too); a fuse running out vibrates on Android only
    board.explodeAll(cell?.i);
    stopMusic();
    $('pause').style.visibility = 'hidden'; // hidden would close its grid column and move the score
  }

  // practice: a dev run (?autoplay, ?campanar) neither sets the best nor goes on the board
  function show(run, { practice }) {
    const { game } = run, was = best(), record = game.points > was;
    if (record && !practice) raiseBest(game.points);
    $('end-title').textContent = t(`end.title.${culprit}`); // a record says so below, in the best's line
    hero.show(culprit === 'time' ? 'mula' : culprit, $('end-art')); // time's up: the Mulassa, who outlasted it
    $('end-score').textContent = game.points;
    $('end-best').textContent = record ? t('end.recordSub') : t('end.best', { best: was });
    $('end-best').classList.toggle('record', record);
    rankingUI.endScreen();
    if (RANKING && !practice && game.points > 0) rankingUI.publish(run);
    $('end-menu').hidden = false;
    $('hud').hidden = true;
    $('again').focus({ focusVisible: false });
  }

  return { blast, show };
}
