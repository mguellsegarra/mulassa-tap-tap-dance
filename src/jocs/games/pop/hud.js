// The run's HUD over the board: the score, the campanar's chip, the words that float up from a tapped cell, and the bell's
// slow time, seen (a cold tint, style.css .slow) and heard (audio.js). flow.js feeds it the run; board.js gets the HUD's edge.
import { slowMusic, SFX } from './audio.js';
import { CHORD } from './rules.js';

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
    if (force) $('combo').hidden = true; // a new run: no streak yet
    if (force || game.points !== shownScore) $('score').textContent = shownScore = game.points;
    // the campanar's own portrait (the home's card), its name for the effect, and the seconds left: rebuilt when they change
    const secs = game.slow > 0 ? Math.ceil(game.slow) : 0, chips = secs ? `${secs}` : '';
    if (chips !== shownChips) {
      shownChips = chips;
      $('chips').innerHTML = secs ? `<span class="chip"><img src="${document.querySelector('.c-card[data-kind="campanar"] img').src}" alt=""><span>${t('chip.slow')}</span><b>${secs}</b></span>` : '';
    }
    setSlow(game.slow > 0, game.state === 'play');
  }

  // «Combo ×3 +9»: a chord of fingers (rules.js combo) and its whole points, under the score, from its second tap; it pops on
  // each one that joins and goes CHORD_HOLD ms after the chord can take no more. A single tap shows nothing: its sound is enough.
  const CHORD_HOLD = 450;
  let chordGone = 0;
  function combo(n, total) {
    const el = $('combo');
    el.textContent = `${t('combo', { n })} +${total}`;
    el.style.top = `${bottom + 6}px`;
    el.hidden = false;
    el.getAnimations().forEach(a => a.cancel());
    el.animate([{ scale: .7 }, { scale: 1.15, offset: .4 }, { scale: 1 }], { duration: 180, easing: 'ease-out' });
    clearTimeout(chordGone);
    chordGone = setTimeout(() => el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200 }).finished.then(() => { el.hidden = true; }, () => {}), CHORD * 1000 + CHORD_HOLD);
  }

  return { floatText, sync, setSlow, combo };
}
