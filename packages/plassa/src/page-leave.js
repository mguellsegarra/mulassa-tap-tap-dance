// Leaving the page: hidden, the window losing focus (another app, the URL bar, devtools) or pagehide (bfcache). A run
// must pause then, sound or not (mulassa.cat's ui/pause-actions.js); page-audio.js stops the sound on the same events.
export const pageActive = () => !document.hidden && document.hasFocus();
export function onPageLeave(fn) {
  const check = () => { if (!pageActive()) fn(); };
  document.addEventListener('visibilitychange', check);
  addEventListener('blur', check);
  addEventListener('pagehide', fn);
}
