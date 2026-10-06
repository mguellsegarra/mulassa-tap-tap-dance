// Pause toggling, page visibility, and the restart and exit actions.
import song from '../song.json';
import { G, songTime, chip } from '../game/state.js';
import { pageActive, BEATS, playFrom, BEAT } from '../core/env.js';
import { pauseGame, closePauseMenu } from './pause.js';
import { pauseMenu } from './handles.js';
import { focusIn } from './focus.js';

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
