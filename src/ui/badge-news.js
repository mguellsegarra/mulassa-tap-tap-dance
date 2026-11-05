// Once per profile on a device, told by the idle selector's greeting (greeting.js): a confirmed player can now wear a badge, and a
// registered player without a confirmed e-mail sees them all and is offered the confirmation, which lands on the picker. No
// profile, a released name (it must pick another first), an older server or a badge already chosen: nothing to tell.
import { appendName } from './profile-notes.js';
import { ASSOCIATION_BADGES, VALLS_BADGES, FLAG_BADGES, TOWN_BADGES } from './player-badges.js';
import { byId } from './sheet-kit.js';
import { tr } from '../i18n/messages.js';
import { createSeenNotices } from '../services/seen-notices.js';

const newsSeenKey = publicId => `badge-news-seen:${publicId}`; // the older device-only mark; 'badge-news' in the seen-notices registry now
// what the news shows: Valls first, then the big towns and Valls's own; no esteladas (the picker still has every badge)
const NEWS_TURN = ['town:valls', 'senyera', 'town:barcelona', 'town:tarragona', 'town:reus', 'town:girona', 'town:lleida'];
const NEWS_SHELF = ['town:valls', 'town:barcelona', 'town:tarragona', 'town:reus', 'town:girona', 'town:lleida', 'senyera', 'colla-vella',
  'colla-joves', 'town:terrassa', 'town:mataro', 'town:manresa', 'town:valencia', 'town:castello', 'campanar-valls', 'town:tortosa',
  'town:vilanova', 'town:vilafranca', 'uaf', 'town:olot', 'town:berga'];
const NEWS_ROWS = 3;

export function setupBadgeNews({ focusIn, service, store, notices = createSeenNotices({ service, kv: store }), badges, profile, refresh, idle = () => true, reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches, doc = document }) {
  const $ = byId(doc), menu = $('badge-news-menu'), shelf = $('badge-news-shelf'), nameBox = $('badge-news-name');
  const all = [...ASSOCIATION_BADGES, ...VALLS_BADGES, ...FLAG_BADGES, ...TOWN_BADGES];
  let back = null, next = null, turner = 0, seen = null, held = false;

  const wear = (alias, id) => { nameBox.replaceChildren(); appendName(doc, nameBox, { alias, verified: true, badgeId: id }); };
  function fillShelf() { // once: the shelf's drawings, twice each, that only this sheet needs
    if (shelf.childElementCount) return;
    const shown = NEWS_SHELF.map(id => all.find(b => b.id === id)).filter(Boolean);
    for (let r = 0; r < NEWS_ROWS; r++) {
      const row = doc.createElement('div'), line = doc.createElement('div'), part = shown.filter((_, i) => i % NEWS_ROWS === r);
      row.className = 'badge-news-row'; line.className = 'badge-news-line';
      for (const b of [...part, ...part]) { // doubled: the row scrolls half its width and starts over unseen
        const chip = doc.createElement('span');
        chip.className = 'badge-news-chip'; chip.innerHTML = b.art(); // ours, from the catalogue
        line.append(chip);
      }
      row.append(line); shelf.append(row);
    }
  }
  // after the e-mail steps: confirmed lands on the picker, anything else was a cancel
  async function afterLink(onBack) {
    let p = null;
    try { await refresh(); p = await service.profile(); } catch { /* offline: the selector, the badge can wait */ }
    if (!idle()) return; // a game or a sheet started meanwhile: nothing opens over it
    if (p?.verified) badges.open(onBack); else onBack?.();
  }

  $('badge-news-later').addEventListener('click', () => menu.close());
  $('badge-news-go').addEventListener('click', () => { next = menu.dataset.kind; menu.close(); });
  menu.addEventListener('close', () => {
    clearInterval(turner);
    if (seen) notices.mark(seen, 'badge-news');
    const b = back, kind = next;
    back = next = null;
    if (kind === 'confirmed') badges.open(b);
    else if (kind === 'guest') profile.open('link', () => afterLink(b));
    else b?.();
  });
  return {
    get isOpen() { return menu.open; },
    // a profile made during this visit has just been offered all this: the news waits for the next visit
    holdVisit() { held = true; },
    // true once shown; still(): the selector is still idle and its owner the same after the read
    async show(onBack = null, still = () => true) {
      if (menu.open || held || !service.publishingEnabled) return false;
      let p = null;
      try { p = await service.profile?.(); } catch { return false; } // offline: the next visit asks again
      if (!p?.alias || !p.publicId || p.released || p.canBadge !== true) return false;
      let owner = null;
      try { owner = await service.ownerId(); await notices.load(owner); } catch { return false; }
      if (!owner || notices.seen(owner, 'badge-news', newsSeenKey(p.publicId))) return false;
      if (p.verified && p.badgeId) { notices.mark(owner, 'badge-news'); return false; }
      if (!still()) return false;
      const kind = p.verified ? 'confirmed' : 'guest';
      seen = owner; back = onBack; next = null; menu.dataset.kind = kind;
      $('badge-news-title').textContent = tr(`ui.badgeNews.${kind}.title`, { count: all.length, n: all.length });
      $('badge-news-text').textContent = tr(`ui.badgeNews.${kind}.text`);
      $('badge-news-go').textContent = tr(kind === 'confirmed' ? 'ui.badgeNews.confirmed.go' : 'ui.confirm.action');
      nameBox.hidden = kind !== 'confirmed'; shelf.hidden = kind !== 'guest';
      if (kind === 'guest') fillShelf();
      else {
        let at = 0;
        wear(p.alias, NEWS_TURN[0]);
        if (!reduced()) turner = setInterval(() => { at = (at + 1) % NEWS_TURN.length; wear(p.alias, NEWS_TURN[at]); }, 1400);
      }
      menu.showModal(); focusIn(menu, 'badge-news-go');
      return true;
    },
  };
}
