// Mulassa Games' row of cards: the chosen card fills the hero above (on a phone, the one on the left). Touching a card only
// chooses it, so nobody starts a game by accident; «Juga» in the hero plays.
import { setupHeroVideo } from './hero-video.js';
export function setupGamesCarousel(doc = document) {
  const by = id => doc.getElementById(id), row = by('games-grid'), hero = by('games-hero');
  const cards = [...row.querySelectorAll('[data-game]')];
  const heroName = by('games-hero-name'), heroDesc = by('games-hero-desc');
  let on = -1, wheelAt = 0, drag = null, dragged = false;

  const wide = matchMedia('(min-width: 701px)'), art = by('games-hero-art');
  const clip = setupHeroVideo({ video: by('games-hero-video'), wide });
  // The hero's still: the frame the game's clip starts on, so the clip fades in over itself; a game with no clip (or no
  // motion wanted) shows its picture. The wide one only where it shows (a big screen, style.css): a phone never downloads it.
  const showStill = () => {
    const card = cards[on];
    if (!card) return;
    const src = card.querySelector('img').getAttribute('src'), poster = clip.poster(card);
    if (wide.matches) art.src = poster ?? card.dataset.hero ?? src; else by('games-hero-back').src = poster ?? src;
  };
  wide.addEventListener?.('change', showStill);
  for (const card of cards) { const poster = clip.poster(card); if (poster) new Image().src = poster; } // ready before a change of game
  const choose = i => {
    if (i === on) return;
    on = i;
    cards.forEach((card, k) => card.classList.toggle('on', k === on));
    const card = cards[on];
    hero.style.setProperty('--game', getComputedStyle(card).getPropertyValue('--game'));
    hero.classList.toggle('soon', 'soon' in card.dataset); // nothing to play yet: no «Juga»
    showStill();
    clip.show(card);
    heroName.textContent = card.querySelector('.sel-card-name').textContent;
    heroDesc.textContent = card.querySelector('.game-desc').textContent;
  };
  const sync = () => {
    const rest = row.getBoundingClientRect().left + parseFloat(getComputedStyle(row).paddingLeft); // where the chosen card's left edge rests
    let best = 0, least = Infinity;
    cards.forEach((card, i) => {
      const r = card.getBoundingClientRect(), gap = Math.abs(r.left - rest);
      if (gap < least) { least = gap; best = i; }
    });
    choose(best);
  };
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fits = () => row.scrollWidth <= row.clientWidth + 1; // a big screen shows every card: nothing scrolls, a click chooses
  const goTo = (i, smooth = !reduced()) => {
    i = Math.max(0, Math.min(cards.length - 1, i));
    if (fits()) { choose(i); return; }
    cards[i].scrollIntoView({ inline: 'start', block: 'nearest', behavior: smooth ? 'smooth' : 'auto' });
  };

  row.addEventListener('scroll', () => requestAnimationFrame(sync), { passive: true });
  row.addEventListener('focusin', e => { const i = cards.indexOf(e.target.closest?.('[data-game]')); if (i >= 0 && i !== on) goTo(i); });
  by('games-menu').addEventListener('keydown', e => {
    const step = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
    if (!step) return;
    e.preventDefault();
    const next = cards[Math.max(0, Math.min(cards.length - 1, on + step))];
    next.focus({ preventScroll: true }); goTo(cards.indexOf(next));
  });
  // a mouse wheel moves one card, so a big screen needs no scrollbar
  row.addEventListener('wheel', e => {
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
    e.preventDefault();
    if (performance.now() - wheelAt < 220) return;
    wheelAt = performance.now(); goTo(on + Math.sign(e.deltaY));
  }, { passive: false });
  // mouse drag; touch already scrolls natively
  row.addEventListener('pointerdown', e => { if (e.pointerType === 'mouse') drag = { x: e.clientX, from: row.scrollLeft, moved: false }; });
  addEventListener('pointermove', e => {
    if (!drag) return;
    const dx = e.clientX - drag.x;
    if (Math.abs(dx) > 4) { drag.moved = true; row.style.scrollSnapType = 'none'; }
    row.scrollLeft = drag.from - dx;
  });
  addEventListener('pointerup', () => {
    if (!drag) return;
    dragged = drag.moved; drag = null;
    if (dragged) { row.style.scrollSnapType = ''; goTo(on); }
  });
  by('games-hero-play').addEventListener('click', () => cards[on].click());
  goTo(0, false); if (!fits()) sync(); // the first game, chosen from the start

  return {
    // false: this click only chooses (or ended a drag), no game starts. A pointer on a card only ever chooses: «Juga» plays;
    // Enter on the chosen card (a click with no pointer, detail 0) plays too, so the keyboard needs no detour
    take(card, e) {
      if (dragged) { dragged = false; return false; }
      const i = cards.indexOf(card);
      if (i === on && !e?.detail) return true;
      goTo(i);
      return false;
    },
  };
}
