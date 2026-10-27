// «Gira el mòbil» before free play on an iPhone held upright. iOS has no orientation lock and no page fullscreen, so the
// selector explains it first: Safari recommends the home-screen app, then both ask to turn the phone, and free
// play starts by itself once it is on its side. Other devices pass straight through (fullscreen.js locks Android).
// The home-screen recommendation is told once (FREE_FS_KEY); later taps only ask to turn.
export const FREE_FS_KEY = 'free-hint';
export function setupFreeGate({ focusIn, onEnter, store = null, ua = navigator.userAgent ?? '', standalone = navigator.standalone, portrait = () => innerHeight > innerWidth, doc = document, listen = addEventListener }) {
  const by = id => doc.getElementById(id), turn = by('free-hint-menu'), fs = by('free-fs-menu');
  const iphone = /iPhone|iPod/.test(ua), isOpen = () => Boolean(turn.open || fs.open);
  const askTurn = () => { turn.showModal(); focusIn(turn, 'free-hint-close'); };
  by('free-hint-close').addEventListener('click', () => turn.close());
  by('free-fs-close').addEventListener('click', () => fs.close());
  by('free-fs-ok').addEventListener('click', () => { fs.close(); askTurn(); });
  const turned = () => { if (isOpen() && !portrait()) { turn.close(); fs.close(); onEnter(); } };
  listen('resize', turned); listen('orientationchange', turned);
  return {
    get isOpen() { return isOpen(); },
    // true when a sheet took the tap: free play waits for the turn
    ask() {
      if (!iphone || !portrait() || isOpen()) return false;
      if (standalone !== false || store?.get(FREE_FS_KEY) === '1') askTurn();
      else { store?.set(FREE_FS_KEY, '1'); fs.showModal(); focusIn(fs, 'free-fs-ok'); }
      return true;
    },
  };
}
