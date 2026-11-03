// «Novetats»: a new game told once, in the greeting's queue, only to who had played before it existed (who starts today
// finds it in the menu). Several unseen ones tell only the newest. A later game is one more line in NEWS.
import { tr } from '../i18n/messages.js';
const SEEN_KEY = 'news-seen';
export const NEWS = [
  { id: 'jocs-1', title: 'ui.news.title', text: 'ui.news.text', games: ['pica', 'memory', 'crush'] },
  { id: 'jocs-2', title: 'ui.news.alchemyTitle', text: 'ui.news.alchemyText', games: ['alchemy'] },
];

export function setupNews({ focusIn, store, played, onGames, force = false, doc = document, win = globalThis, news = NEWS }) {
  const by = id => doc.getElementById(id), menu = by('news-menu');
  let back = null, toGames = false, onButton = false;
  const seen = () => { try { const v = JSON.parse(store.get(SEEN_KEY)); return Array.isArray(v) ? v : []; } catch { return []; } };
  const markAll = () => store.set(SEEN_KEY, JSON.stringify(news.map(n => n.id)));
  // the ribbon under the corner button, seen through a hole in the backdrop: the sheet's text says «the button up there»
  const place = () => {
    if (!menu.open) return;
    const r = by('free').getBoundingClientRect(), tip = by('news-tip'), centre = r.left + r.width / 2;
    // 20 under it: the tail (9) and the bob (5) never reach the button
    const x = Math.max(12, Math.min(centre - tip.offsetWidth / 2, win.innerWidth - tip.offsetWidth - 12));
    tip.style.left = `${x}px`; tip.style.top = `${r.bottom + 20}px`; tip.style.setProperty('--tail', `${centre - x}px`);
    menu.style.setProperty('--hole-x', `${centre}px`); menu.style.setProperty('--hole-y', `${r.top + r.height / 2}px`); menu.style.setProperty('--hole-r', `${r.width / 2 + 5}px`);
  };
  win.addEventListener?.('resize', place);
  by('news-x').addEventListener('click', () => menu.close());
  const goToGames = () => { toGames = true; menu.close(); };
  by('news-go').addEventListener('click', goToGames);
  by('news-tip').addEventListener('click', goToGames);
  // the button shows through the backdrop, so a tap on it is the backdrop's: it closes the sheet (backdrop.js) and must still do what the button does
  menu.addEventListener('pointerdown', e => {
    const r = by('free').getBoundingClientRect();
    onButton = e.target === menu && e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
  });
  menu.addEventListener('cancel', () => { if (onButton) toGames = true; onButton = false; });
  menu.addEventListener('close', () => {
    const b = back, go = toGames; back = null; toGames = false;
    if (go) onGames(); else b?.();
  });
  return {
    get isOpen() { return Boolean(menu?.open); },
    // true once shown
    show(onBack = null) {
      if (menu.open) return false;
      const was = seen(), unseen = force ? news : news.filter(n => !was.includes(n.id));
      if (!unseen.length) return false;
      if (!force && !played()) { markAll(); return false; }
      const n = unseen[unseen.length - 1];
      by('news-title').textContent = tr(n.title);
      by('news-text').textContent = tr(n.text);
      by('news-pics').replaceChildren(...n.games.map(g => { // each game's name is its card's, in the games sheet
        const fig = doc.createElement('figure'), img = doc.createElement('img'), name = doc.createElement('figcaption');
        img.src = `/jocs/menu/cards/${g}.jpg`; img.alt = ''; img.width = 600; img.height = 750;
        name.textContent = doc.querySelector(`[data-game="${g}"] .sel-card-name`)?.textContent ?? '';
        fig.append(img, name);
        return fig;
      }));
      if (!force) markAll();
      back = onBack;
      menu.showModal(); place(); focusIn(menu, 'news-go');
      return true;
    },
  };
}
