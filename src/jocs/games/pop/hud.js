// The run's HUD over the board: the score, the campanar's chip, the words that float up from a tapped cell, and the bell's
// slow time, seen (a cold tint, style.css .slow) and heard (audio.js). flow.js feeds it the run; board.js gets the HUD's edge.
import { slowMusic, SFX } from './audio.js';
import { CHORD } from './rules.js';

export function createHud({ board, t }) {
  const $ = id => document.getElementById(id);
  const hud = $('hud');
  let shownScore = -1, shownChips = '', shownSlow = false, bottom = 0, onInset = () => {};
  // The board's top inset is the HUD's bottom edge, and this file is its one owner (board.insets.top). Read when the run
  // starts (sync force) and when the HUD changes size, never every frame: a layout read costs a phone. A hidden HUD keeps the last.
  function measure() {
    if (hud.hidden) return false;
    const b = hud.getBoundingClientRect().bottom;
    if (b === bottom) return false;
    bottom = board.insets.top = b;
    return true;
  }
  new ResizeObserver(() => { if (measure()) onInset(); }).observe(hud);

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
    if (force) $('combo').hidden = true; // a new run: no streak yet
    if (force || game.points !== shownScore) $('score').textContent = shownScore = game.points;
    // the campanar's own portrait (the home's card), its name for the effect, and the seconds left: rebuilt when they change
    const secs = game.slow > 0 ? Math.ceil(game.slow) : 0, chips = secs ? `${secs}` : '';
    if (chips !== shownChips) {
      shownChips = chips;
      $('chips').innerHTML = secs ? `<span class="chip"><img src="/jocs/pop/cards/campanar.png" alt=""><span>${t('chip.slow')}</span><b>${secs}</b></span>` : '';
    }
    setSlow(game.slow > 0, game.state === 'play');
    if (force) measure(); // a new run: its board is fitted to this HUD, not the last frame's
  }

  // «Combo ×3 +9»: a chord of fingers (rules.js combo) and its whole points, under the score, from its second tap; it pops on
  // each one that joins and goes CHORD_HOLD ms after the chord can take no more. A single tap shows nothing: its sound is enough.
  const CHORD_HOLD = 250;
  let chordGone = 0;
  function combo(n, total) {
    const el = $('combo');
    el.textContent = `${t('combo', { n })} +${total}`;
    el.style.top = `${bottom + 6}px`;
    el.hidden = false;
    el.getAnimations().forEach(a => a.cancel());
    el.animate([{ scale: .4, color: '#fff' }, { scale: 1.2 + .15 * Math.min(n, 5), offset: .35, color: '#fff' }, { scale: 1 }], { duration: 200, easing: 'ease-out' }); // bigger as the chord grows
    // the screen lit gold, stronger as the chord grows
    const flash = $('combo-flash'), m = Math.min(n, 5);
    flash.hidden = false;
    flash.getAnimations().forEach(a => a.cancel());
    flash.animate([{ opacity: 0 }, { opacity: .45 + .11 * m, offset: .2 }, { opacity: 0 }], { duration: 220, fill: 'forwards' }).finished.then(() => { flash.hidden = true; }, () => {});
    clearTimeout(chordGone);
    chordGone = setTimeout(() => el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200 }).finished.then(() => { el.hidden = true; }, () => {}), CHORD * 1000 + CHORD_HOLD);
  }

  return { floatText, sync, setSlow, combo, watchInset: fn => { onInset = fn; } };
}
