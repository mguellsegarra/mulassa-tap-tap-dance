// Sends this device's statistics to the profile (docs/rankings-strategy.md §7) and keeps who owns them straight.
// The owner is the session's user id (never shown, never sent anywhere else); without a profile the numbers stay under 'none'.
//   statsSync.init()          once at start: owner = the open profile, if any (needs no network when there is no session)
//   statsSync.afterRun()      after a run is closed (stats.js recordRun), never during play: debounced, silent, retried next run
//   statsSync.holdWhile(fn)   fn() true = a song is on: the upload waits (flow/main wires it once: () => G.state === 'play')
//   statsSync.noticeNeeded()  true while the open profile has not seen the privacy notice (nothing is sent until it has)
//   statsSync.acceptNotice()  the notice was shown and read: marks it and sends what is waiting
// Profile changes (create, open, confirm, sign out, delete) arrive by themselves through service.onAccount.
import { leaderboard } from './leaderboard.js';
import { store } from '../platform/storage.js';
import { loadStats, saveStats, payload, markSent, transferNone, forgetOwner, setStatsOwner } from '../game/stats.js';

const NOTICE = id => `stats-notice-${id}`;
export const statsNoticeSeen = (owner, kv = store) => kv.get(NOTICE(owner)) === '1';
export const markStatsNoticeSeen = (owner, kv = store) => kv.set(NOTICE(owner), '1');

// merge_stats takes a profile once a minute (leaderboard_rate_limit); the first try after a run waits a moment so it never
// competes with the results screen.
const GAP = 61000, SETTLE = 2000;
const sign = p => { let h = 5381; const t = JSON.stringify([p.buckets, p.days]); for (let i = 0; i < t.length; i++) h = ((h << 5) + h + t.charCodeAt(i)) | 0; return `${t.length}:${h >>> 0}`; };

export function createStatsSync({ service, kv = store, io = { load: loadStats, save: saveStats }, now = Date.now, timer = setTimeout, clear = clearTimeout } = {}) {
  // Per owner (an id is never reused) and service (use() starts over): the rest of this is answered by one server for one profile.
  const refused = new Set(), accepted = new Map(); // refused: buckets the server rejects even alone, left out until the page reloads (their counters stay untouched here); accepted: bucket → its JSON the server took alone
  const mark = (id, key) => `${id}|${key}`;
  let svc = service, unsubscribe = null, owner = null, lastTry = -Infinity, wait = null, running = false, again = false, hold = () => false;

  // A profile was created or opened: from now on this device's runs count for it, and what was played without one joins it
  // (decision 30: once; later play without a profile starts a new 'none').
  function adopt(userId) {
    owner = userId || null;
    setStatsOwner(owner);
    if (!owner) return;
    const s = io.load();
    if (s.owners.none) io.save(transferNone(s, owner));
  }
  // Decision 31: a deleted profile takes its numbers with it; they never pass to anyone else.
  function forget(userId) {
    io.save(forgetOwner(io.load(), userId));
    kv.remove?.(NOTICE(userId));
    if (owner === userId) adopt(null);
  }
  async function refresh() {
    try { adopt(await svc.ownerId()); } catch { /* offline: the owner stays as it was */ }
  }
  async function send() {
    if (!owner) return 'no-profile';
    if (!statsNoticeSeen(owner, kv)) return 'notice';
    const id = owner, stats = io.load(), p = payload(stats, id);
    for (const key of Object.keys(p.buckets)) if (refused.has(mark(id, key))) delete p.buckets[key];
    if (!Object.keys(p.buckets).length && !p.days.length) return 'empty';
    const signature = sign(p);
    if (stats.owners[id]?.sent === signature) return 'unchanged';
    lastTry = now();
    try { await svc.syncStats({ ...p, owner: id }); } catch (error) {
      if (error?.code === 'gone') forget(id);
      if (error?.code === 'session') { await refresh(); if (owner !== id) request(); } // the session is no longer this owner's: whoever it is now goes next
      if (error?.code === 'stats_time') { request(); return 'later'; } // the server's time budget grows with real time
      if (error?.code === 'stats') return isolate(id, p);
      return error?.code ?? 'error';
    }
    io.save(markSent(io.load(), id, signature)); // re-read: a run may have closed while the request was out
    return 'sent';
  }
  // The server refused the document and does not say which bucket (merge_stats rolls back whole, and a refusal does not use up
  // the minute, an acceptance does). Try them alone: each bucket the server takes alone is remembered (unchanged, it is not asked
  // again) and ends the attempt, since the minute is spent; one refused alone is left out. The next attempt picks up where this
  // one stopped, so every valid bucket (and the days, with the whole document) gets through and the bad one is found. Never
  // edited: clipping a counter would invent numbers the player did not play.
  async function isolate(id, p) {
    let found = false; // a bucket refused in this pass: the rest is worth a try without it
    for (const key of Object.keys(p.buckets)) {
      const text = JSON.stringify(p.buckets[key]);
      if (accepted.get(mark(id, key)) === text) continue;
      try { await svc.syncStats({ ...p, buckets: { [key]: p.buckets[key] }, days: [], owner: id }); } catch (error) {
        if (error?.code === 'stats_time') { request(); return 'later'; } // valid, only early: never left out
        if (error?.code !== 'stats') return error?.code ?? 'error';
        refused.add(mark(id, key)); found = true;
        continue;
      }
      accepted.set(mark(id, key), text); request(); return 'partial';
    }
    if (found) request(); // what is left may go now; a refusal that no bucket explains (days) is not retried
    return 'stats';
  }
  async function go() {
    wait = null;
    if (hold()) { wait = timer(go, SETTLE * 2); return; }
    if (running) { again = true; return; }
    running = true;
    try { await send(); } catch { /* silent: the next run tries again */ } finally { running = false; }
    if (again) { again = false; request(); }
  }
  function request() {
    if (wait) return;
    wait = timer(go, Math.max(SETTLE, lastTry + GAP - now()));
  }
  const events = e => { if (e.type === 'gone') forget(e.userId); else refresh().then(request); };
  function use(next) {
    unsubscribe?.(); svc = next; refused.clear(); accepted.clear(); unsubscribe = svc.onAccount?.(events) ?? null;
  }
  use(svc);

  return {
    use,
    async init() {
      try {
        const id = await svc.ownerId();
        if (!id) return adopt(null);
        let profile = true;
        try { profile = !!(await svc.profile()); } catch { /* offline: trust the session */ }
        adopt(profile ? id : null);
        request();
      } catch { adopt(null); }
    },
    afterRun: request,
    holdWhile(fn) { hold = fn; },
    noticeNeeded: () => !!owner && !statsNoticeSeen(owner, kv),
    acceptNotice() { if (owner) { markStatsNoticeSeen(owner, kv); request(); } },
    forget,
    send, // the upload itself, for tests and for a «Sincronitza» button if one ever exists
    get owner() { return owner; },
    cancel() { if (wait) clear(wait); wait = null; },
  };
}

export const statsSync = createStatsSync({ service: leaderboard });
