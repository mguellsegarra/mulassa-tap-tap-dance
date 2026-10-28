// «Gira el mòbil» before free play on an iPhone held upright. iOS has no orientation lock and no page fullscreen, so the
// selector explains it first: Safari recommends the home-screen app, then both ask to turn the phone, and free
// play starts by itself once it is on its side. Other devices pass straight through (fullscreen.js locks Android).
// The home-screen recommendation is told once (FREE_FS_KEY); later taps only ask to turn, with a bubble back to its steps
// in Safari.
export const FREE_FS_KEY = 'free-hint';
export function setupFreeGate({ focusIn, onEnter, store = null, ua = navigator.userAgent ?? '', standalone = navigator.standalone, portrait = () => innerHeight > innerWidth, doc = document, listen = addEventListener }) {
  const by = id => doc.getElementById(id), turn = by('free-hint-menu'), fs = by('free-fs-menu');
  const iphone = /iPhone|iPod/.test(ua), isOpen = () => Boolean(turn.open || fs.open);
  // A wrapped box keeps its widest size: the bubble is cut to its longest line, so no hole is left on its right
  const hug = menu => {
    const b = menu.querySelector?.('.ios-bubble');
    if (!b || b.hidden) return;
    b.style.width = '';
    const r = doc.createRange(); r.selectNodeContents(b.querySelector('button') ?? b); // the text's line boxes, not the block's
    const right = Math.max(...[...r.getClientRects()].map(x => x.right));
    b.style.width = `${Math.ceil(right - b.getBoundingClientRect().left + parseFloat(getComputedStyle(b).paddingRight))}px`;
  };
  const askTurn = () => { turn.showModal(); hug(turn); focusIn(turn, 'free-hint-close'); };
  const showSteps = () => { fs.showModal(); hug(fs); focusIn(fs, 'free-fs-ok'); };
  by('free-hint-home').hidden = !iphone || standalone !== false;
  by('free-hint-home-go').addEventListener('click', () => { turn.close(); showSteps(); });
  by('free-hint-close').addEventListener('click', () => turn.close());
  by('free-fs-close').addEventListener('click', () => fs.close());
  by('free-fs-ok').addEventListener('click', () => { fs.close(); askTurn(); });
  const turned = () => { if (isOpen() && !portrait()) { turn.close(); fs.close(); onEnter(); } };
  listen('resize', turned); listen('orientationchange', turned);
  listen('resize', () => { if (turn.open) hug(turn); if (fs.open) hug(fs); });
  return {
    get isOpen() { return isOpen(); },
    // true when a sheet took the tap: free play waits for the turn
    ask() {
      if (!iphone || !portrait() || isOpen()) return false;
      if (standalone !== false || store?.get(FREE_FS_KEY) === '1') askTurn();
      else { store?.set(FREE_FS_KEY, '1'); showSteps(); }
      return true;
    },
  };
}
