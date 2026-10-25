// The selector's fold: what is still to come starts folded into one chevron card and one «Pròximament» pill; either
// unfolds it in place (its cards, its towns' pills), the fold and an «Amaga» pill fold it back. setupSelect (select-ui.js)
// owns the selection; this owns whether it is open and the short exit (closing) the rows play before it folds.
import { playable } from '../game/figures.js';
import { tr } from '../i18n/messages.js';

export function setupFold({ doc, win, $, root, towns, strip, pending, cards, pills, restPills, later, bar, fold, soonPill, foldLabel,
  scrolling, townScrolling, flip, layout, reduced, sfx, view, roveCard, pick, press, figureOf }) {
  let open = true;
  const arrivals = new Map();
  let closing = false, townExit = null, settling = false; // settling: unfold() measures once after the steps it runs (each measure forces a layout)
  const FOLD_MS = 240;
  function clearTownExit() {
    if (!townExit) return;
    townExit.animation?.cancel(); townExit.layer.remove(); townExit = null;
  }
  function exitTowns() {
    // Keep only a painted copy of the outgoing pills. Their real layout can then reach its
    // folded size now, so centring and the fade share one motion instead of two queued ones.
    if (!win.matchMedia?.('(pointer: fine)').matches || reduced()) return false;
    const rect = towns.getBoundingClientRect(), zoom = parseFloat(win.getComputedStyle(root).zoom) || 1;
    const layer = towns.cloneNode(true), scroll = towns.scrollLeft;
    layer.removeAttribute('id'); layer.removeAttribute('role'); layer.removeAttribute('aria-label');
    layer.setAttribute('aria-hidden', 'true'); layer.inert = true;
    Object.assign(layer.style, { left: `${rect.left / zoom}px`, top: `${rect.top / zoom}px`,
      right: 'auto', width: `${rect.width / zoom}px`, height: `${rect.height / zoom}px`,
      transform: 'none', translate: 'none', pointerEvents: 'none', zIndex: '1', justifyContent: win.getComputedStyle(towns).justifyContent,
      paddingLeft: win.getComputedStyle(towns).paddingLeft, paddingRight: win.getComputedStyle(towns).paddingRight });
    [...layer.children].forEach((el, i) => { if (!restPills.includes(bar[i])) el.style.visibility = 'hidden'; else el.style.opacity = win.getComputedStyle(bar[i]).opacity; });
    root.append(layer); layer.scrollLeft = scroll;
    townExit = { layer, animation: null };
    restPills.forEach(p => { p.hidden = true; });
    return true;
  }
  const onScreen = el => { const b = el.getBoundingClientRect(); return !(b.right <= 0 || b.left >= win.innerWidth * 2); }; // only these fade: each animated item is a compositor layer (unfolding: 170–355 ms of compositing on an iPhone)
  function revealItems(on) { // unfold() fades them in after its measure, whose layout its reads reuse
    for (const el of [...later, ...restPills]) { arrivals.get(el)?.cancel(); el.hidden = !on; el.inert = !on; }
  }
  function finishFold() {
    if (open) return;
    townScrolling.to(townScrolling.target, true);
    const header = townExit ? null : headerPositions();
    clearTownExit();
    closing = false; root.toggleAttribute('data-folding', false);
    arrivals.get(pending)?.cancel(); pending.inert = false;
    flip.snap(view.shown); revealItems(false); // snap before the hidden items re-lay the strip: measure()'s own snap would read it already moved
    if (view.shown) { layout.measure(); if (header) moveHeader(header); else if (reduced()) for (const el of [towns, $('select-info')]) arrivals.get(el)?.cancel(); }
  }
  // The collapsed towns can fit beside the corner buttons. Preserve their painted position across
  // that one layout change, then move on the compositor; the first pill also accounts for centring.
  function headerPositions() {
    return [towns, $('select-info')].map(el => ({ el, rect: (el === towns ? pills[0] : el).getBoundingClientRect() }));
  }
  function moveHeader(before) {
    const zoom = parseFloat(win.getComputedStyle?.(root).zoom) || 1;
    for (const { el, rect } of before) {
      arrivals.get(el)?.cancel();
      const after = (el === towns ? pills[0] : el).getBoundingClientRect();
      const x = (rect.left - after.left) / zoom, y = (rect.top - after.top) / zoom;
      if (!reduced() && el.animate && (Math.abs(x) > 1 || Math.abs(y) > 1)) {
        arrivals.set(el, el.animate({ transform: [`translate(${x}px, ${y}px)`, 'translate(0, 0)'] }, { duration: FOLD_MS, easing: 'ease-in-out', fill: 'backwards' }));
      }
    }
  }
  function foldedMax() {
    const padding = parseFloat(win.getComputedStyle?.(strip).paddingRight) || 0;
    const margin = parseFloat(win.getComputedStyle?.(fold).marginRight) || 0;
    return Math.max(0, fold.offsetLeft + fold.offsetWidth + margin + padding - strip.clientWidth);
  }
  function unfold(on, how) { // shows or hides what is still to come: its cards and banners, its towns' pills
    if (on === open || !fold) return;
    open = on;
    townScrolling.stop();
    const items = [...later, ...restPills];
    const restoreFocus = !on && items.includes(doc.activeElement);
    restPills.forEach(p => { p.tabIndex = on ? 0 : -1; });
    const text = soonPill?.querySelector?.('.sel-soon-text'), label = () => { // the toggles' state (their look changes with it)
      fold.setAttribute('aria-expanded', String(open)); fold.setAttribute('aria-label', open ? tr('ui.select.foldHide') : foldLabel);
      soonPill?.setAttribute('aria-expanded', String(open));
      if (text) text.textContent = tr(open ? 'ui.select.hide' : 'ui.select.soon');
    };
    if (how === 'open') { label(); for (const el of items) el.hidden = !on; return; }
    sfx('menu');
    const foldingHeader = !on ? headerPositions() : null, movingTowns = !on && exitTowns();
    label();
    if (on) {
      const header = headerPositions();
      clearTownExit();
      closing = false; root.toggleAttribute('data-folding', false);
      arrivals.get(pending)?.cancel(); pending.inert = false;
      revealItems(true);
      roveCard(view.cur);
      if (view.shown) { layout.measure(); moveHeader(header); }
      // flip.play() (from the fold card) already fades in what it shows after its slides: a second fade on top ended first and blinked them out
      if (!reduced()) for (const el of items) if (el.animate && onScreen(el)) arrivals.set(el, el.getAnimations?.()[0] ?? el.animate({ opacity: [0, 1] }, { duration: 180 }));
      // Keep the existing cards in place; reveal just enough of the first new card to invite navigation.
      const first = cards.find(c => later.includes(c));
      const right = first ? first.offsetLeft + first.offsetWidth - strip.clientWidth + 12 : scrolling.target;
      scrolling.to(how === 'tap' ? Math.max(scrolling.target, right) : scrolling.target);
    } else {
      // Commit the selection before the exit starts. Keep the outgoing panel's text for its CSS fade;
      // the disclosure's keyboard focus is independent of the selected card and never needs a teaser here.
      const target = cards.find(c => figureOf(c) === (playable(view.figure) ? view.figure : view.lastPlayable));
      settling = true; try { pick(target, 'fold'); } finally { settling = false; }
      press(view.figure.town);
      closing = true;
      root.toggleAttribute('data-folding', true);
      const exiting = movingTowns ? later : items;
      for (const el of items) el.inert = true;
      if (view.shown) layout.measure();
      if (restoreFocus) (how === 'pill' ? soonPill : fold)?.focus({ preventScroll: true });
      const destination = Math.min(scrolling.target, foldedMax());
      // Both rows arrive before the outgoing items lose their layout boxes (or a far pill would be clamped abruptly).
      const pill = pills.find(p => p.dataset.town === view.figure.town);
      const townDestination = Math.max(0, Math.min(pill.offsetLeft - (towns.clientWidth - pill.offsetWidth) / 2, layout.rowEdge(towns) - towns.clientWidth));
      // No start time: the fades start at their first painted frame. Timed from the click, the re-layout's slow first frame (~150 ms)
      // ate most of them, so the catalogue jumped to a quarter and vanished.
      if (movingTowns) {
        townScrolling.to(0, true);
        moveHeader(foldingHeader);
        townExit.animation = townExit.layer.animate({ opacity: [1, 0] }, { duration: FOLD_MS, fill: 'forwards', easing: 'ease-in-out' });
      }
      const fade = new Set(reduced() ? [] : exiting.filter(el => el.animate && onScreen(el))); for (const el of exiting) { // every read before the first cancel: each one restyles
        arrivals.get(el)?.cancel();
        if (fade.has(el)) {
          arrivals.set(el, el.animate({ opacity: [1, 0] }, { duration: FOLD_MS, fill: 'forwards', easing: 'ease-in-out' }));
        }
      }
      // The rows' timed scroll (whose end removes the items) starts with the fades, once they are ready
      const go = () => { if (!closing || open) return; if (!movingTowns) townScrolling.to(townDestination, false, null, FOLD_MS); scrolling.to(destination, false, finishFold, FOLD_MS); };
      const first = townExit?.animation ?? exiting.map(el => arrivals.get(el)).find(Boolean);
      if (first?.ready) first.ready.then(go, () => {}); else go();
    }
  }
  unfold(false, 'open');
  return {
    unfold, finishFold,
    get open() { return open; }, get closing() { return closing; },
    get settling() { return settling; }, set settling(on) { settling = on; },
    settleHeader() { for (const el of [towns, $('select-info')]) arrivals.get(el)?.cancel(); }, // a resize or leaving: no slide still under way
  };
}
