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
  by('news-x').addEventListener('click', () => menu.close());
  by('news-go').addEventListener('click', () => { toGames = true; menu.close(); });
  menu.addEventListener('close', () => {
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
      menu.showModal(); focusIn(menu, 'news-go');
      return true;
    },
  };
}
