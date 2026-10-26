// Pause toggling, page visibility, a WebGL context that never comes back, and the restart and exit actions.
import song from '../song.json';
import { G, songTime, chip } from '../game/state.js';
import { pageActive, BEATS, playFrom, BEAT } from '../core/env.js';
import { pauseGame, closePauseMenu } from './pause.js';
import { pauseMenu } from './handles.js';
import { focusIn } from './focus.js';
import { glc, renderer } from '../scene/stage.js';
import { errors } from '../services/errors.js';

export function togglePause() {
  if (G.state !== 'play' || !pageActive()) return;
  if (!G.paused) {
    if (!G.collapseT) pauseGame();
  } else if (G.resuming == null) {
    // back from the pause: the recording restarts where it stopped after a 3, 2, 1 on the pulse; the run stays frozen until then
    const tp = songTime();
    closePauseMenu();
    document.activeElement?.blur();
    G.paused = false;
    chip.resume();
    if (tp < (G.practice ? BEATS[0] : BEATS.find(b => b >= playFrom) ?? playFrom)) return; // still in the start's own count-in: it carries on
    G.paused = true; G.resuming = tp;
    const chart = G.chart, at = [3, 2, 1].map(k => tp - k * BEAT);
    if (G.practice) { chip.startClock(3 * BEAT, tp); chip.countIn(at); return; }
    chip.start(3 * BEAT, tp, song.tail).then(ok => { if (ok && G.chart === chart) chip.countIn(at); });
  }
}
function syncPageActivity() {
  if (!pageActive()) {
    pauseGame();
    chip?.ctx.suspend();
  } else if (!G.paused || G.resuming != null) {
    chip?.wake();
  }
}
document.addEventListener('visibilitychange', syncPageActivity);
addEventListener('blur', syncPageActivity);
addEventListener('focus', syncPageActivity);
addEventListener('pagehide', () => {
  pauseGame();
  chip?.ctx.suspend();
});
addEventListener('pageshow', syncPageActivity);
// A lost WebGL context that is never restored (a browser that stops WebGL for the page after repeated GPU crashes) left
// the run going on with no 3D and nothing said. After NO_RESTORE_MS on screen: the music stops and the error card offers a reload.
const NO_RESTORE_MS = 5000;
let restoreTimer = 0;
function restoreLate() {
  restoreTimer = 0;
  if (!renderer.getContext().isContextLost()) return;
  if (!pageActive()) { restoreTimer = setTimeout(restoreLate, NO_RESTORE_MS); return; } // hidden: the browser may restore it once back
  errors.report('webgl-not-restored');
  G.paused = true; // so the suspended music doesn't open the pause menu, a modal that would sit over the card
  chip?.ctx.suspend();
  document.querySelectorAll('dialog[open]').forEach(d => d.close());
  window.__mulassaFail?.('Ups! El joc s’ha aturat', 'El mòbil ha deixat de mostrar el joc en 3D. Torna-ho a provar.', true);
}
glc.addEventListener('webglcontextlost', () => { clearTimeout(restoreTimer); restoreTimer = setTimeout(restoreLate, NO_RESTORE_MS); });
glc.addEventListener('webglcontextrestored', () => { clearTimeout(restoreTimer); restoreTimer = 0; });
export function requestPauseAction(action) {
  if (!G.paused) return;
  G.pendingAction = action;
  document.getElementById('pause-options').hidden = true;
  document.getElementById('pause-confirmation').hidden = false;
  document.getElementById('confirm-title').textContent = action === 'restart' ? 'Reiniciar el ball?' : 'Tornar al menú?';
  document.getElementById('confirm-action').textContent = action === 'restart' ? 'Sí, reinicia' : 'Sí, torna al menú';
  pauseMenu.setAttribute('aria-labelledby', 'confirm-title');
  focusIn(pauseMenu, 'cancel-action');
}
