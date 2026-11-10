// iPhones zoom on a quick second tap whatever touch-action says: cancel that tap's default and click for it.
// Pointer events (pads, sticks), scrolling and single taps are untouched; text fields keep their own taps.
// A finger lifting while another rests counts too: two thumbs drumming zoomed iPads and iPhones.
export function stopDoubleTapZoom() {
  let lastTouchEnd = -1e9;
  document.addEventListener('touchend', e => {
    const quick = e.timeStamp - lastTouchEnd < 350; lastTouchEnd = e.timeStamp;
    if (!quick || !e.cancelable || e.target.closest?.('input, textarea, select, [contenteditable="true"]')) return;
    e.preventDefault();
    e.target.closest?.('button, a, label, summary, [role="button"]')?.click();
  }, { passive: false });
  document.addEventListener('gesturestart', e => e.preventDefault()); // Safari's pinch zoom (it ignores user-scalable=no); #hud steers its camera with pointers
}
