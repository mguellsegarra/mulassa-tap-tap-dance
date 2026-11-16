// A tap on a cover's dimmed backdrop, outside its sheet, does what Escape does (mulassa.cat's ui/backdrop.js, for the
// games' covers instead of native dialogs): the pause resumes, a board closes. Press and release both on the backdrop
// itself, and no swipe, so dragging out of a sheet or scrolling from the margin never closes it.
// A cover nobody asked for (data-unasked: a pause by itself, the end sheet) comes up under fingers busy on the board, as
// ui/backdrop.js's sheets: its backdrop does nothing, and for its first ARM_MS no tap inside presses its buttons either.
const ARM_MS = 400;
export function closeOnBackdrop(close) {
  let down = null, x = 0, y = 0;
  addEventListener('pointerdown', e => {
    down = e.target?.matches?.('.cover:not([hidden]):not([data-unasked])') ? e.target : null;
    x = e.clientX; y = e.clientY;
  }, true);
  addEventListener('click', e => {
    if (!down || e.target !== down || Math.hypot(e.clientX - x, e.clientY - y) > 10) return;
    down = null;
    close();
  }, true);
  new MutationObserver(records => {
    for (const { target: c } of records) if (!c.hidden && c.matches?.('.cover[data-unasked]')) c.dataset.since = String(performance.now());
  }).observe(document, { subtree: true, attributes: true, attributeFilter: ['hidden'] });
  addEventListener('click', e => {
    const c = e.target?.closest?.('.cover[data-unasked]:not([hidden])');
    if (c && performance.now() - Number(c.dataset.since) < ARM_MS) { e.preventDefault(); e.stopImmediatePropagation(); }
  }, true);
}
