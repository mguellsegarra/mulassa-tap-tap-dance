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
// A run whose audio clock stands still is stuck at its count-in («PREPARATS…») or mid-song: suspended (iOS after an app
// switch: resume() only works inside a tap) or `running` with a frozen currentTime (a stalled output device, seen on a
// phone after several runs). Pause it after 1 s: the pause's suspend and Continua's resume() inside a tap wake it.
let stallT = null, lastCt = NaN;
export function watchAudio(now) {
  const ct = chip?.ctx?.currentTime, moved = ct !== lastCt;
  lastCt = ct;
  if (G.state !== 'play' || G.paused || chip?.t0 == null || !pageActive() || (moved && chip.ctx.state === 'running')) { stallT = null; return; }
  stallT ??= now;
  if (now - stallT > 1000) { stallT = null; pauseGame(); }
}
function syncPageActivity() {
  if (!pageActive()) {
    G.activityEpoch++;
    pauseGame();
    chip?.clearMenuSfx?.();
    chip?.suspend();
  } else if (!G.paused || G.resuming != null) {
    chip?.wake();
    if (chip?.woke) chip.resume(); // back from another app there is no gesture (wake() skips it): an unlocked context may resume, else it stayed mute until a tap (iOS)
  } else chip?.suspend(); // paused: a hidden page may never have run suspend()'s timer
}
document.addEventListener('visibilitychange', syncPageActivity);
addEventListener('blur', syncPageActivity);
addEventListener('focus', syncPageActivity);
addEventListener('pagehide', () => {
  G.activityEpoch++;
  chip?.clearMenuSfx?.();
  pauseGame();
  chip?.suspend();
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
