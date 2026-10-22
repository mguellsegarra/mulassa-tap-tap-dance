// «Perfil» (#account-menu, the round button in the selector's corner row): the profile block (src/ui/profile-ui.js), the
// player's statistics (src/ui/stats-view.js, unfolded, in the second person: this device's at once, every device's from the
// server when there is a profile, whichever has more; the season podiums among them), the previous dance's record and since
// when it counts. Private: the days played, the streaks and the errors per kind are shown only here. Plus the statistics notice (#stats-notice-menu): a profile that existed before the
// statistics sees it once before anything is sent (decision: nothing goes until it has been seen).
import { loadStats, getStatsOwner } from '../game/stats.js';
import { readPreviousDanceRecord } from '../game/records.js';
import { DIFFS } from '../game/chart.js';
import { byId, num } from './sheet-kit.js';
import { tr } from '../i18n/messages.js';
import { statsData, renderStats, sinceText, FIGURE_NAMES } from './stats-view.js';
import { figureSeasons, boardName } from './seasons-ui.js';

export function setupAccount({ focusIn, profile, service, store, stats, onSync = () => {}, doc = document, now = () => Date.now() }) {
  const $ = byId(doc), menu = $('account-menu'), box = $('account-stats'), notice = $('stats-notice-menu');
  let req = 0, back = null, shown = null, wins = [];
  const local = () => { const s = loadStats(), o = s.owners[getStatsOwner()]; return { since: s.since, buckets: { ...o?.counters, ...o && { practice: o.practice } }, days: o?.days ?? [] }; };
  // the statistics with the podiums among them (they arrive later: painted again with them)
  // pending: nothing played here yet but the server may know more: a quiet skeleton keeps the room, so its answer shifts nothing
  function paint(d, since, pending = false) {
    const played = d.runs > 0;
    shown = [d, since, pending];
    $('account-empty').hidden = played || pending;
    box.hidden = !played && !pending;
    box.classList.toggle('loading', pending);
    if (pending) box.replaceChildren();
    if (played) renderStats(doc, box, d, { own: true, podiums: wins, onSync: () => { const b = leave(); onSync(() => open(b)); } });
    $('account-since').textContent = played && since ? sinceText(since) : '';
  }
  // «Rècord del ball anterior»: the old dance's best per level on this device (src/game/records.js), read only
  function previous() {
    const ul = $('account-previous-list'); ul.replaceChildren();
    DIFFS.forEach((d, l) => {
      const r = readPreviousDanceRecord(store, l);
      if (!r) return;
      const li = doc.createElement('li'); li.textContent = tr('ui.account.previousLine', { level: d.name, score: num(r.score), pct: Math.round(r.quality) });
      ul.appendChild(li);
    });
    $('account-previous').hidden = !ul.children.length;
  }
  async function podiums(r) {
    const lines = [];
    for (const figure of Object.keys(FIGURE_NAMES)) {
      for (const e of await figureSeasons(service, figure, now()).catch(() => [])) {
        if (e.myPosition && e.myPosition <= 3 && (e.endsAt == null || e.endsAt <= now())) lines.push({ position: e.myPosition, place: num(e.myPosition), text: tr('ui.stats.podiumAt', { season: e.name, board: boardName(figure, e) }) });
      }
    }
    if (r !== req || !lines.length) return;
    wins = lines; paint(...shown);
  }
  async function load() {
    const r = ++req, mine = local();
    const d = statsData(mine.buckets, mine.days);
    wins = [];
    const waiting = service.configured && !d.runs && getStatsOwner() !== 'none', settle = () => { if (waiting && r === req) paint(d, mine.since); };
    paint(d, mine.since, waiting);
    previous();
    $('account-join').hidden = true;
    if (!service.configured) return;
    let signed = false;
    try { signed = Boolean(await service.ownerId()); } catch { /* offline: this device's numbers stand */ }
    if (r !== req) return;
    $('account-join').hidden = signed; // no profile: «Crea un perfil per guardar-les…»
    if (!signed) return settle();
    podiums(r);
    let server = null;
    try { server = await service.myStats(); } catch { /* this device's numbers stand */ }
    if (r !== req) return;
    if (!server) return settle();
    const all = statsData(server.buckets, server.days);
    if (all.runs < d.runs) return; // not sent yet (the notice, offline): this device knows more
    paint({ ...all, daysPlayed: server.daysPlayed, streak: server.currentStreak ?? all.streak, bestStreak: server.longestStreak ?? all.bestStreak }, mine.since);
  }
  function open(onBack = null) {
    if (menu.open) return;
    back = onBack;
    menu.showModal();
    focusIn(menu, 'account-close');
    menu.querySelector?.('.sheet-body')?.scrollTo?.(0, 0);
    profile.refresh();
    load();
  }
  // another sheet takes this one's place (the profile's steps, the sync), then comes back here: it keeps where to return
  const leave = () => { const b = back; back = null; menu.close(); return b; };
  $('profile-row').addEventListener('click', e => {
    const act = e.target.closest?.('button')?.dataset.act;
    if (!act) return;
    if (act === 'forget') { profile.forget(); return; }
    const b = leave(); profile.open(act, () => open(b));
  });
  $('account-close').addEventListener('click', () => menu.close());
  menu.addEventListener('close', () => { req++; const b = back; back = null; b?.(); });

  // --- the statistics notice, once per existing profile (statsSync.noticeNeeded); «D'acord» or closing it: seen
  let noticeBack = null;
  for (const id of ['stats-notice-ok', 'stats-notice-close']) $(id).addEventListener('click', () => notice.close());
  notice.addEventListener('close', () => { stats.acceptNotice(); const b = noticeBack; noticeBack = null; b?.(); });
  return {
    open,
    get isOpen() { return menu.open || notice.open; },
    // true once shown
    notice(onBack = null) {
      if (!stats.noticeNeeded() || notice.open) return false;
      noticeBack = onBack;
      notice.showModal(); focusIn(notice, 'stats-notice-ok');
      return true;
    },
  };
}
