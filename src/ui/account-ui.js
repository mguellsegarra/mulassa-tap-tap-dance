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
import { mulaSpinner } from './loader.js';
import { statsData, renderStats, sinceText, FIGURE_NAMES } from './stats-view.js';
import { figureSeasons, boardName } from './seasons-ui.js';
import { ALIAS_KEY } from '../services/leaderboard-identity.js';

const HALL_FIGURE = 'mulassa-valls'; // the figure whose first season holds everything played before the seasons
const BADGE_TIP_KEY = 'badge-edit-tip-seen', BADGE_TIP_MS = 6000, BADGE_TIP_LEAVE_MS = 260; // LEAVE: sel-tip-out's length

export function setupAccount({ focusIn, profile, badges, service, store, stats, onSync = () => {}, onHall = () => {}, doc = document, now = () => Date.now() }) {
  const $ = byId(doc), menu = $('account-menu'), box = $('account-stats'), status = $('account-status'), notice = $('stats-notice-menu');
  let req = 0, back = null, shown = null, wins = [];
  const local = () => { const s = loadStats(), o = s.owners[getStatsOwner()]; return { since: s.since, buckets: { ...o?.counters, ...o && { practice: o.practice } }, days: o?.days ?? [] }; };
  // the statistics with the podiums among them (they arrive later: painted again with them)
  // wait: nothing played here yet but the server may know more: 'loading' (the dancing Mulassa) or 'failed' sit inside the statistics' room, so its answer shifts nothing
  function paint(d, since, wait = '') {
    const played = d.runs > 0;
    shown = [d, since, wait];
    $('account-empty').hidden = played || Boolean(wait);
    status.hidden = !wait;
    status.replaceChildren();
    if (wait === 'loading') status.append(mulaSpinner(doc), tr('ui.stats.loading'));
    else if (wait) status.textContent = tr('ui.stats.loadFailed');
    box.hidden = !played;
    if (!played) box.replaceChildren();
    if (played) renderStats(doc, box, d, { own: true, podiums: wins, onSync: () => { const b = leave(); onSync(() => open(b)); } });
    $('account-since').textContent = played && since ? sinceText(since) : '';
  }
  // «Rècord del ball anterior»: the old dance's best per level on this device (src/game/records.js), read only
  function previous() {
    const ul = $('account-previous-list'); ul.replaceChildren();
    DIFFS.forEach((d, l) => {
      const r = readPreviousDanceRecord(store, l);
      if (!r) return;
      // the level word wears its colour wherever the translation puts it (a marker splits the line around it)
      const [before, after] = tr('ui.account.previousLine', { level: '\u0000', score: num(r.score), pct: Math.round(r.quality) }).split('\u0000');
      const word = doc.createElement('span'); word.className = `lvt${l}`; word.textContent = d.name;
      const li = doc.createElement('li'); li.append(before, word, after);
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
    const waiting = service.configured && !d.runs, settle = (wait = '') => { if (waiting && r === req) paint(d, mine.since, wait); };
    paint(d, mine.since, waiting ? 'loading' : '');
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
    let failed = false;
    try { server = await service.myStats(); } catch { failed = true; } // this device's numbers stand (with none: «No s’han pogut carregar»)
    if (r !== req) return;
    if (!server) return settle(failed ? 'failed' : '');
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
    Promise.resolve(profile.refresh()).then(pointAtBadge);
    load();
  }
  // The heart's red ribbon under the name's pencil, once ever: the mark is what changes the badge, and nothing says so.
  function pointAtBadge() {
    const edit = menu.open && $('profile-row').querySelector('.badge-edit');
    if (!edit || edit.checkVisibility?.() === false || store.get(BADGE_TIP_KEY) === '1') return;
    store.set(BADGE_TIP_KEY, '1');
    const tip = doc.createElement('div'), r = edit.lastElementChild.getBoundingClientRect(), box = menu.getBoundingClientRect(); // the pencil: the button's last child
    tip.className = 'sel-heart-tip account-badge-tip'; tip.setAttribute('role', 'status'); tip.textContent = tr('ui.badge.editTip');
    menu.append(tip);
    const centre = r.left + r.width / 2 - box.left - menu.clientLeft, x = Math.max(8, Math.min(centre - tip.offsetWidth / 2, box.width - tip.offsetWidth - 8));
    tip.style.left = `${x}px`; tip.style.top = `${r.top - box.top - menu.clientTop - tip.offsetHeight - 13}px`; tip.style.setProperty('--tail', `${centre - x}px`); // above the name: under it, it would cover the sheet's buttons
    const hide = () => { tip.classList.add('sel-tip-out'); setTimeout(() => tip.remove(), BADGE_TIP_LEAVE_MS); }, timer = setTimeout(hide, BADGE_TIP_MS);
    tip.addEventListener('click', hide);
    menu.addEventListener('close', () => { clearTimeout(timer); tip.remove(); }, { once: true }); // leaves with its sheet
  }
  // another sheet takes this one's place (the profile's steps, the sync), then comes back here: it keeps where to return
  const leave = () => { const b = back; back = null; menu.close(); return b; };
  $('profile-row').addEventListener('click', e => {
    const act = e.target.closest?.('button')?.dataset.act;
    if (!act) return;
    if (act === 'forget') { profile.forget(); return; }
    const b = leave();
    if (act === 'badge') badges.open(() => open(b)); else profile.open(act, () => open(b));
  });
  $('account-close').addEventListener('click', () => menu.close());
  menu.addEventListener('close', () => { req++; const b = back; back = null; b?.(); });

  // --- the statistics notice, once per existing profile (statsSync.noticeNeeded); «D'acord» or closing it: seen
  let noticeBack = null;
  for (const id of ['stats-notice-ok', 'stats-notice-close']) $(id).addEventListener('click', () => notice.close());
  // a guest's notice also offers the confirmation: it closes like «D'acord» (the notice is seen) and the profile steps open, back to where this one would
  // the season button counts like «D'acord» (the notice is seen, it never comes back over the hall or the board) and opens the Saló de la fama, back to where the notice would go
  $('stats-notice-hall').addEventListener('click', () => { const b = noticeBack; noticeBack = null; notice.close(); onHall(HALL_FIGURE, b); });
  notice.addEventListener('close', () => { stats.acceptNotice(); const b = noticeBack; noticeBack = null; b?.(); });
  return {
    open,
    get isOpen() { return menu.open || notice.open; },
    // true once shown
    notice(onBack = null) {
      if (!stats.noticeNeeded() || notice.open) return false;
      noticeBack = onBack;
      notice.showModal(); focusIn(notice, 'stats-notice-ok');
      notice.querySelector?.('.sheet-body')?.scrollTo?.(0, 0); // a small phone scrolls: it starts at the title, not at the focused button
      return true;
    },
  };
}
