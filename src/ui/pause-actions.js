// Pause toggling, page visibility, and the restart and exit actions.
import { song, countInAt, countInDuration } from '../game/figure-song.js';
import { G, songTime, chip } from '../game/state.js';
import { pageActive, BEATS, playFrom } from '../core/env.js';
import { pauseGame, closePauseMenu } from './pause.js';
import { pauseMenu } from './handles.js';
import { focusIn } from './focus.js';
import { tr } from '../i18n/messages.js';

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
    const chart = G.chart, at = countInAt(tp), lead = countInDuration(tp);
    if (G.practice) { chip.startClock(lead, tp); chip.countIn(at); return; }
    chip.start(lead, tp, song.tail).then(ok => { if (ok && G.chart === chart) chip.countIn(at); });
  }
}
function syncPageActivity() {
  if (!pageActive()) {
    G.activityEpoch++;
    pauseGame();
    chip?.clearMenuSfx?.();
    chip?.ctx.suspend();
  } else if (!G.paused || G.resuming != null) {
    chip?.wake();
  }
}
document.addEventListener('visibilitychange', syncPageActivity);
addEventListener('blur', syncPageActivity);
addEventListener('focus', syncPageActivity);
addEventListener('pagehide', () => {
  G.activityEpoch++;
  chip?.clearMenuSfx?.();
  pauseGame();
  chip?.ctx.suspend();
});
addEventListener('pageshow', syncPageActivity);
export function requestPauseAction(action) {
  if (!G.paused) return;
  G.pendingAction = action;
  document.getElementById('pause-options').hidden = true;
  document.getElementById('pause-confirmation').hidden = false;
  document.getElementById('confirm-title').textContent = tr(action === 'restart' ? 'ui.pause.confirmRestartTitle' : 'ui.pause.confirmMenuTitle');
  document.getElementById('confirm-action').textContent = tr(action === 'restart' ? 'ui.pause.confirmRestart' : 'ui.pause.confirmMenu');
  pauseMenu.setAttribute('aria-labelledby', 'confirm-title');
  focusIn(pauseMenu, 'cancel-action');
}
