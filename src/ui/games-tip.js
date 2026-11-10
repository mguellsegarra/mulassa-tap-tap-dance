// «Més jocs!» beside the games button (under it on a narrow phone), as Mulassa Pop's bubble: it pops in on the selector and comes back every few seconds
// (CSS .games-tip), always, as Pop's. CSS hides it with the button (play, the reel) and in free play.
import { tr } from '../i18n/messages.js';

export function setupGamesTip({ doc = document, win = globalThis } = {}) {
  const btn = doc.getElementById('free');
  let tip = null;
  // where the title's lettering ends: its <svg> box runs wider than what it paints
  const logoRight = () => {
    const svg = doc.querySelector('#select > .sel-logo'), m = svg?.getScreenCTM?.();
    if (!m) return 0;
    const bb = svg.getBBox(); return m.a * (bb.x + bb.width) + m.e;
  };
  const place = () => {
    if (!tip || !btn.checkVisibility?.()) return;
    const r = btn.getBoundingClientRect(), w = tip.offsetWidth, h = tip.offsetHeight;
    // beside the button, on its left, where the row has room (Pop's bubble sits beside its button too); under it on a narrow phone
    const side = r.left - 14 - w >= logoRight() + 12;
    tip.classList.toggle('games-tip-side', side);
    if (side) { tip.style.left = `${r.left - 14 - w}px`; tip.style.top = `${r.top + r.height / 2 - h / 2}px`; return; }
    const centre = r.left + r.width / 2, x = Math.max(12, Math.min(centre - w / 2, win.innerWidth - w - 12)); // fixed in the body: screen pixels, no zoom
    tip.style.left = `${x}px`; tip.style.top = `${r.bottom + 14}px`;
    tip.style.setProperty('--tail', `${centre - x}px`);
  };
  win.addEventListener?.('resize', place);
  return {
    update() {
      if (!tip) {
        tip = doc.createElement('div'); tip.className = 'sel-heart-tip games-tip'; tip.setAttribute('aria-hidden', 'true'); // the button's own name says it
        tip.textContent = tr('ui.games.tip');
        btn.after(tip); // #free's sibling, outside #select's zoom: CSS hides it with the button (no :has, select-pending.css)
      }
      place();
    },
  };
}
