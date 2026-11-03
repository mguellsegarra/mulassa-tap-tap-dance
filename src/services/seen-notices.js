// The one-time sheets a profile has seen, kept on this device and on the server (202611030001_seen_notices.sql), so another
// device or a new sign-in does not show them again. Every sheet has its own id ('stats', `season:<id>`, 'badge-news'...;
// lowercase, [a-z0-9:._-], at most 64). Hints about this device (gpu-hint, photo help) stay device-only and do not use this.
//   load(owner)              reads the server's list once per owner and service (offline: this device's marks only, asked again next time)
//   seen(owner, id, legacy)  seen here or on the server (a mark only here is sent again once the list is read); legacy: the sheet's older device-only key, uploaded once if set
//   mark(owner, id)          here at once, on the server in the background (offline or refused: this device still remembers)
//   forget(owner, id)        this device's mark and the cached list (the profile was deleted: the server cascades by itself)
import { leaderboard } from './leaderboard.js';
import { store } from '../platform/storage.js';

const noticeSeenKey = (owner, id) => `seen:${owner}:${id}`;

export function createSeenNotices({ service, kv = store } = {}) {
  let svc = service;
  const server = new Map(); // owner → Set of ids, once read
  const api = {
    use(next) { svc = next; server.clear(); },
    async load(owner) {
      if (!owner || server.has(owner)) return;
      const from = svc;
      try {
        const ids = await svc.seenNotices?.(owner); // the server answers for this owner only, or refuses
        if (svc === from && Array.isArray(ids)) server.set(owner, new Set(ids)); // the service changed meanwhile: dropped
      } catch { /* offline or another session now: next time */ }
    },
    seen(owner, id, legacy) {
      if (!owner) return false;
      const there = server.get(owner);
      if (kv.get(noticeSeenKey(owner, id)) === '1') { if (there && !there.has(id)) api.mark(owner, id); return true; } // a mark the server missed (offline, refused): sent again
      if (there?.has(id)) return true;
      if (legacy && kv.get(legacy) === '1') { api.mark(owner, id); return true; } // shortcut: drop `legacy` once 1.2.9 is old
      return false;
    },
    mark(owner, id) {
      if (!owner) return;
      kv.set(noticeSeenKey(owner, id), '1');
      server.get(owner)?.add(id);
      Promise.resolve().then(() => svc.markNoticeSeen?.(id, owner)).catch(() => {});
    },
    forget(owner, id) { kv.remove?.(noticeSeenKey(owner, id)); server.delete(owner); },
  };
  return api;
}

export const seenNotices = createSeenNotices({ service: leaderboard });
