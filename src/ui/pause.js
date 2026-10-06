// The pause menu: open, close, pause the game.
import { G, chip } from '../game/state.js';
import { pauseMenu } from './handles.js';
import { focusIn } from './focus.js';

export function closePauseMenu() {
  G.pendingAction = null;
  if (pauseMenu.open) pauseMenu.close();
}
export function showPauseOptions() {
  G.pendingAction = null;
  document.getElementById('pause-options').hidden = false;
  document.getElementById('pause-confirmation').hidden = true;
  pauseMenu.setAttribute('aria-labelledby', 'pause-title');
  focusIn(pauseMenu, 'resume');
}
export function pauseGame() {
  if (G.state !== 'play' || G.paused) return;
  G.paused = true;
  chip.ctx.suspend();
  showPauseOptions();
  pauseMenu.showModal();
  focusIn(pauseMenu, 'resume');
}
