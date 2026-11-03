// The «Jocs» sheet's row of cards: the centred card is the chosen one and fills the hero above. The first tap on another
// card brings it to the centre, so a phone never starts a game by accident; a tap on the centred one plays.
export function setupGamesCarousel(doc = document) {
  const by = id => doc.getElementById(id), row = by('games-grid'), hero = by('games-hero');
  const cards = [...row.querySelectorAll('[data-game]')];
  const heroName = by('games-hero-name'), heroDesc = by('games-hero-desc');
  let on = -1, wheelAt = 0, drag = null, dragged = false;

  const choose = i => {
    if (i === on) return;
    on = i;
    cards.forEach((card, k) => card.classList.toggle('on', k === on));
    const card = cards[on], src = card.querySelector('img').getAttribute('src');
    hero.style.setProperty('--game', getComputedStyle(card).getPropertyValue('--game'));
    by('games-hero-back').src = by('games-hero-art').src = src;
    heroName.textContent = card.querySelector('.sel-card-name').textContent;
    heroDesc.textContent = card.querySelector('.game-desc').textContent;
  };
  const sync = () => {
    const mid = row.getBoundingClientRect().left + row.clientWidth / 2;
    let best = 0, least = Infinity;
    cards.forEach((card, i) => {
      const r = card.getBoundingClientRect(), gap = Math.abs(r.left + r.width / 2 - mid);
      if (gap < least) { least = gap; best = i; }
    });
    choose(best);
  };
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const goTo = (i, smooth = !reduced()) => {
    i = Math.max(0, Math.min(cards.length - 1, i));
    cards[i].scrollIntoView({ inline: 'center', block: 'nearest', behavior: smooth ? 'smooth' : 'auto' });
  };

  row.addEventListener('scroll', () => requestAnimationFrame(sync), { passive: true });
  row.addEventListener('focusin', e => { const i = cards.indexOf(e.target.closest?.('[data-game]')); if (i >= 0 && i !== on) goTo(i); });
  by('games-menu').addEventListener('keydown', e => {
    const step = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
    if (!step) return;
    e.preventDefault(); e.stopPropagation(); // not a game key while the sheet is up
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

  return {
    // false: this click only moves the row (or ended a drag), no game starts
    take(card) {
      if (dragged) { dragged = false; return false; }
      const i = cards.indexOf(card);
      if (i === on) return true;
      goTo(i);
      return false;
    },
    opened() { goTo(Math.max(on, 0), false); sync(); },
  };
}
