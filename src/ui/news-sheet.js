// «Novetats»: a new game told once, in the greeting's queue, only to who had played before it existed (who starts today
// finds it in the menu). Several unseen ones tell only the newest. A later game is one more line in NEWS.
// Seen once per profile on any device: the seen-notices registry (`news:<id>`, on the server); without a profile, or
// offline, this device's own list (SEEN_KEY), which is also sent up once a profile reads the registry.
import { tr } from '../i18n/messages.js';
import { createSeenNotices } from '../services/seen-notices.js';
const SEEN_KEY = 'news-seen';
export const NEWS = [
  { id: 'jocs-1', title: 'ui.news.title', text: 'ui.news.text', games: [{ id: 'pop', name: 'Mulassa Pop' }] }, // a game's name is its brand, the same in every language
];

export function setupNews({ focusIn, store, played, onGames, service = null, notices = createSeenNotices({ service, kv: store }), force = false, doc = document, news = NEWS }) {
  const by = id => doc.getElementById(id), menu = by('news-menu');
  let back = null, toGames = false;
  const seen = () => { try { const v = JSON.parse(store.get(SEEN_KEY)); return Array.isArray(v) ? v : []; } catch { return []; } };
  const noticeId = id => `news:${id}`;
  const markAll = owner => { store.set(SEEN_KEY, JSON.stringify(news.map(n => n.id))); for (const n of news) notices.mark(owner, noticeId(n.id)); }; // mark(null): device only
  // the profile's owner and its registry; null without a session or offline (this device's list answers alone)
  const reader = async () => { try { const owner = await service?.ownerId?.(); if (owner) await notices.load(owner); return owner ?? null; } catch { return null; } };
  // The games button and its «Més jocs!» stay bright through the sheet's dimming: a hole in the backdrop round them (the
  // backdrop takes --spot from the sheet, base.css), so «el botó lila, a dalt a la dreta» points at something one can see
  const spot = () => {
    const btn = by('free'), tip = btn?.nextElementSibling?.classList?.contains('games-tip') ? btn.nextElementSibling : null, win = doc.defaultView;
    menu.style.removeProperty?.('--spot'); tip?.classList.remove('games-tip-on');
    if (!menu.open || !btn?.checkVisibility?.() || !win) return;
    tip?.classList.add('games-tip-on'); // held up while the sheet tells of it (it comes and goes otherwise)
    const rs = [btn, tip].filter(e => e?.checkVisibility?.()).map(e => e.getBoundingClientRect()), pad = 8;
    const x = Math.min(...rs.map(r => r.left)) - pad, y = Math.min(...rs.map(r => r.top)) - pad;
    const w = Math.max(...rs.map(r => r.right)) + pad - x, h = Math.max(...rs.map(r => r.bottom)) + pad - y;
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${win.innerWidth}' height='${win.innerHeight}'><mask id='m'><rect width='100%' height='100%' fill='white'/>`
      + `<rect x='${x}' y='${y}' width='${w}' height='${h}' rx='${Math.min(h / 2, 40)}'/></mask><rect width='100%' height='100%' mask='url(#m)'/></svg>`;
    menu.style.setProperty('--spot', `url("data:image/svg+xml,${encodeURIComponent(svg)}")`);
  };
  doc.defaultView?.addEventListener?.('resize', spot);
  by('news-x').addEventListener('click', () => menu.close());
  by('news-go').addEventListener('click', () => { toGames = true; menu.close(); });
  menu.addEventListener('close', () => {
    spot();
    const b = back, go = toGames; back = null; toGames = false;
    if (go) onGames(); else b?.();
  });
  return {
    get isOpen() { return Boolean(menu?.open); },
    // true once shown; still(): the selector is still idle and its owner the same after the read
    async show(onBack = null, still = () => true) {
      if (menu.open) return false;
      const owner = await reader(), here = seen();
      for (const id of here) if (owner && !notices.seen(owner, noticeId(id))) notices.mark(owner, noticeId(id)); // seen here before the registry: sent up once
      const unseen = force ? news : news.filter(n => !here.includes(n.id) && !(owner && notices.seen(owner, noticeId(n.id))));
      if (!unseen.length || menu.open || !still()) return false;
      if (!force && !played()) { markAll(owner); return false; }
      const n = unseen[unseen.length - 1];
      by('news-title').textContent = tr(n.title);
      by('news-text').textContent = tr(n.text);
      by('news-pics').replaceChildren(...n.games.map(g => { // the game's still, its name under it in the game's colour
        const fig = doc.createElement('figure'), img = doc.createElement('img'), name = doc.createElement('figcaption');
        img.src = `/jocs/menu/cards/${g.id}.jpg`; img.alt = ''; img.width = 600; img.height = 750;
        name.className = `news-${g.id}`; name.textContent = g.name;
        fig.append(img, name);
        return fig;
      }));
      if (!force) markAll(owner);
      back = onBack;
      menu.showModal(); spot(); focusIn(menu, 'news-go');
      return true;
    },
  };
}
