// The pause menu: open, close, pause the game.
import { G, chip } from '../game/state.js';
import { pauseMenu } from './handles.js';
import { focusIn } from './focus.js';
import { tr } from '../i18n/messages.js';

export function closePauseMenu() {
  G.pendingAction = null;
  if (pauseMenu.open) pauseMenu.close();
}
export function showPauseOptions() {
  G.pendingAction = null;
  document.getElementById('pause-options').hidden = false;
  document.getElementById('pause-confirmation').hidden = true;
  // The dance demo has no taps to sync and nothing to lose (sheets-setup.js skips the confirmation)
  const watch = Boolean(G.watch);
  document.getElementById('pause-sync').hidden = watch;
  document.getElementById('pause-text').textContent = tr(watch ? 'ui.pause.textWatch' : 'ui.pause.text');
  document.getElementById('restart-label').textContent = tr(watch ? 'ui.pause.restartWatch' : 'ui.pause.restart');
  pauseMenu.setAttribute('aria-labelledby', 'pause-title');
  focusIn(pauseMenu, 'resume');
}
export function pauseGame() {
  if (G.state !== 'play' || G.paused) return;
  G.paused = true;
  chip.suspend();
  showPauseOptions();
  pauseMenu.showModal();
  focusIn(pauseMenu, 'resume');
}
