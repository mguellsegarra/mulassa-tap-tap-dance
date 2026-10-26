// Pause toggling, page visibility, a WebGL context that never comes back, and the restart and exit actions.
import { song, countInAt, countInDuration, BEATS } from '../game/figure-song.js';
import { G, songTime, chip } from '../game/state.js';
import { pageActive, playFrom } from '../core/env.js';
import { pauseGame, closePauseMenu } from './pause.js';
import { pauseMenu } from './handles.js';
import { focusIn } from './focus.js';
import { tr } from '../i18n/messages.js';
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
  chip?.suspend();
  document.querySelectorAll('dialog[open]').forEach(d => d.close());
  window.__mulassaFail?.(tr('ui.webgl.lostTitle'), tr('ui.webgl.lostText'), true);
}
glc.addEventListener('webglcontextlost', () => { clearTimeout(restoreTimer); restoreTimer = setTimeout(restoreLate, NO_RESTORE_MS); });
glc.addEventListener('webglcontextrestored', () => { clearTimeout(restoreTimer); restoreTimer = 0; });
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
