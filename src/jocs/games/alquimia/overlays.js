import { COPY } from './copy.js';
import { iconHtml, orbHtml as orb, tintOf } from './icons.js';

// Discovery and book presentation share one overlay; progress stays with the game.
export function createAlchemyOverlays(overlay, fx, rules, getFound) {
  const T = COPY.alquimia, { ingredientsOf } = rules;
  const nameOf = id => T.items[id].name;
  const factOf = id => T.items[id].fact;
  const recipeText = (id, r = ingredientsOf(id)) => (r ? `${nameOf(r[0])} + ${nameOf(r[1])}` : T.base);

  let recipeResize;
  // Wrapped flex rows keep spare width: trim the card to its longest painted text line.
  function fitBookRecipes() {
    const cards = [...overlay.querySelectorAll('.alq-recipe-chip')];
    cards.forEach(card => { card.style.width = ''; });
    const widths = cards.map(card => {
      const left = card.getBoundingClientRect().left, range = document.createRange();
      const text = document.createTreeWalker(card, NodeFilter.SHOW_TEXT);
      let right = left, node;
      while ((node = text.nextNode())) {
        range.selectNodeContents(node);
        for (const rect of range.getClientRects()) right = Math.max(right, rect.right);
      }
      return Math.min(card.getBoundingClientRect().width, Math.ceil(right - left + parseFloat(getComputedStyle(card).paddingRight)));
    });
    cards.forEach((card, i) => { card.style.width = `${widths[i]}px`; });
  }

  function showOverlay(html, tint = null) {
    recipeResize?.disconnect();
    overlay.innerHTML = html;
    overlay.style.setProperty('--tint', tint ?? '#ffd76a');
    overlay.style.display = '';
    fx.embers(false);
  }
  const closeOverlay = () => { recipeResize?.disconnect(); overlay.style.display = 'none'; overlay.innerHTML = ''; fx.embers(true); };

  function showFound(id, pair) {
    const fact = factOf(id), got = rules.progress(getFound()), local = rules.valls.includes(id);
    // The rest of the world ends the game; Valls is counted apart, with its own first and last.
    const done = local ? (got.valls === 1 && T.firstValls(rules.valls.length)) || (got.valls === rules.valls.length && T.allValls)
      : got.general === rules.general.length && T.allFound;
    showOverlay(`<div class="alq-rays"></div><div class="alq-found">
      <h2>${nameOf(id)}</h2>${orb(id)}<p class="alq-recipe">${recipeText(id, pair)}</p>
      ${fact || done ? `<div class="alq-parch">${fact ? `<p>${fact}</p>` : ''}${done ? `<p><strong>${done}</strong></p>` : ''}</div>` : ''}
      <button class="alq-btn" data-act="go">${T.go}</button></div>`, tintOf(id));
    overlay.querySelector('[data-act="go"]').focus({ preventScroll: true });
    // offsets, not rects: the card is still animating in
    const card = overlay.querySelector('.alq-found'), big = card.querySelector('.orb');
    const y = card.offsetTop + big.offsetTop + big.offsetHeight / 2;
    overlay.querySelector('.alq-rays').style.top = `${y}px`;
    fx.burst(innerWidth / 2, y);
  }

  const RESTART = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><path d="M5.6 2.8v4.6h4.6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  // Wiping the book is rare and can't be undone: a quiet corner button, then a card that asks.
  function showBook(armed = false) {
    if (armed) return showOverlay(`<div class="alq-sheet alq-hints"><h2>${T.reset}</h2><p>${T.resetSure}</p>
      <div class="alq-actions"><button class="alq-btn alq-wipe" data-act="reset">${T.resetYes}</button><button class="alq-btn" data-act="book">${T.resetNo}</button></div></div>`);
    const got = rules.progress(getFound()), missing = rules.general.length - got.general, missingValls = rules.valls.length - got.valls;
    const entries = getFound().map(id => {
      const fact = factOf(id), ingredients = ingredientsOf(id);
      const recipe = ingredients
        ? ingredients.map(i => `<span class="alq-ingredient"><span class="alq-mini">${iconHtml(i)}</span>${nameOf(i)}</span>`).join('<span class="alq-plus">+</span>')
        : T.base;
      return `<div class="alq-entry">${orb(id)}<div><strong>${nameOf(id)}</strong><span class="alq-recipe-chip${ingredients ? '' : ' base'}">${recipe}</span></div>${fact ? `<p>${fact}</p>` : ''}</div>`;
    }).join('');
    showOverlay(`<div class="alq-sheet"><button class="alq-corner" data-act="arm" aria-label="${T.reset}">${RESTART}</button><h2>${T.book}</h2><div class="alq-list">${entries}</div>
      ${missing || missingValls ? `<p class="alq-missing">${missing ? T.missing(missing) : T.missingValls(missingValls)}</p>` : ''}
      <div class="alq-actions one"><button class="alq-btn" data-act="go">${T.go}</button></div></div>`);
    fitBookRecipes();
    recipeResize = new ResizeObserver(fitBookRecipes);
    recipeResize.observe(overlay);
  }

  return { showOverlay, closeOverlay, showFound, showBook };
}
