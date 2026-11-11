// A tap on a cover's dimmed backdrop, outside its sheet, does what Escape does (mulassa.cat's ui/backdrop.js, for the
// games' covers instead of native dialogs): the pause resumes, a board closes. Press and release both on the backdrop
// itself, and no swipe, so dragging out of a sheet or scrolling from the margin never closes it.
export function closeOnBackdrop(close) {
  let down = null, x = 0, y = 0;
  addEventListener('pointerdown', e => {
    down = e.target?.matches?.('.cover:not([hidden])') ? e.target : null;
    x = e.clientX; y = e.clientY;
  }, true);
  addEventListener('click', e => {
    if (!down || e.target !== down || Math.hypot(e.clientX - x, e.clientY - y) > 10) return;
    down = null;
    close();
  }, true);
}
