// iPhones zoom on a quick second tap whatever touch-action says: cancel that tap's default and click for it.
// Pointer events (pads, sticks), scrolling and single taps are untouched; text fields keep their own taps.
export function stopDoubleTapZoom() {
  let lastTouchEnd = -1e9;
  document.addEventListener('touchend', e => {
    const quick = e.timeStamp - lastTouchEnd < 350; lastTouchEnd = e.timeStamp;
    if (!quick || e.touches?.length || !e.cancelable || e.target.closest?.('input, textarea, select, [contenteditable="true"]')) return;
    e.preventDefault();
    e.target.closest?.('button, a, label, summary, [role="button"]')?.click();
  }, { passive: false });
}
