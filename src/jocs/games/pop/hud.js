// The run's HUD over the board: the score, the campanar's chip, the words that float up from a tapped cell, and the bell's
// slow time, seen (a cold tint, style.css .slow) and heard (audio.js). flow.js feeds it the run; board.js gets the HUD's edge.
import { slowMusic, SFX } from './audio.js';

export function createHud({ board, t }) {
  const $ = id => document.getElementById(id);
  const hud = $('hud');
  let shownScore = -1, shownChips = '', shownSlow = false, bottom = 0;
  // measured when it changes size: a layout read every frame costs a phone
  new ResizeObserver(() => { bottom = hud.getBoundingClientRect().bottom; }).observe(hud);

  function floatText(i, text) {
    const s = board.screenOf(i), el = document.createElement('div');
    el.className = 'float';
    el.textContent = text;
    el.style.left = `${s.x}px`;
    el.style.top = `${s.y}px`;
    el.addEventListener('animationend', () => el.remove());
    document.body.append(el);
    const half = el.offsetWidth / 2 + 8; // a long word on an edge cell stays on screen (ЗАТИШЬЕ! is about 200 px)
    el.style.left = `${Math.min(innerWidth - half, Math.max(half, s.x))}px`;
  }

  // the bell's slow time: the music muffled, the board tinted; its end lifts back (only heard in a run, not on its way out)
  function setSlow(v, playing) {
    if (v === shownSlow) return;
    shownSlow = v;
    document.body.classList.toggle('slow', v);
    slowMusic(v);
    if (!v && playing) SFX.unbell();
  }

  function sync(game, force) {
    board.insets.top = hud.hidden ? 0 : bottom;
    if (force || game.score !== shownScore) $('score').textContent = shownScore = game.score;
    // the campanar's own portrait (the home's card), its name for the effect, and the seconds left: rebuilt when they change
    const secs = game.slow > 0 ? Math.ceil(game.slow) : 0, chips = secs ? `${secs}` : '';
    if (chips !== shownChips) {
      shownChips = chips;
      $('chips').innerHTML = secs ? `<span class="chip"><img src="${document.querySelector('.c-card[data-kind="campanar"] img').src}" alt=""><span>${t('chip.slow')}</span><b>${secs}</b></span>` : '';
    }
    setSlow(game.slow > 0, game.state === 'play');
  }

  return { floatText, sync, setSlow };
}
