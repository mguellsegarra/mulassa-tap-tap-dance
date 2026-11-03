// The board on the page: a run published at its end, the home's place, the board sheet and a player's card. The calls are
// ranking.js's (or ranking-mock.js's on a dev server with no Supabase), loaded only when needed. Names as on mulassa.cat's
// boards (src/ui/profile-notes.js): a guest's quieter, a confirmed address's with its check or chosen badge.
import { RUN_VERSION } from './run.js';

const SUPABASE = !!import.meta.env.VITE_SUPABASE_URL;
export const RANKING = SUPABASE || import.meta.env.DEV;
const service = () => (SUPABASE ? import('./ranking.js') : import('./ranking-mock.js'));
const marks = () => import('../../../ui/badge-svg.js');
const el = (tag, cls, text) => Object.assign(document.createElement(tag), cls ? { className: cls } : {}, text == null ? {} : { textContent: text });

export function setupRankingUI({ t, focusBack }) {
  const $ = id => document.getElementById(id);
  let sent = 0, boardReq = 0, cardReq = 0;

  // After a run: the server plays it again and answers with the place; a player with no name is sent to make one on
  // mulassa.cat (/#nom-pop), which comes back here, and the run waits (ranking.keep) to go then.
  async function publish(run) {
    const line = $('end-rank'), name = $('end-name'), mine = ++sent;
    const body = { v: RUN_VERSION, seed: run.seed, cols: run.game.cols, rows: run.game.rows, ticks: run.ticks, taps: run.log, score: run.game.score };
    line.hidden = false; name.hidden = true; line.classList.remove('good');
    line.textContent = t('rank.sending');
    const m = await service();
    try {
      const res = await m.publish(body);
      m.forget();
      showPlace(res.position); // on the home's pill before the player goes back to it
      if (mine !== sent) return;
      line.textContent = t(res.improved ? 'rank.newBest' : 'rank.place', { n: res.position });
      line.classList.toggle('good', res.improved);
    } catch (e) {
      if (e.code === 'pop_seed_used') { if (mine === sent) line.hidden = true; return; }
      m.keep(body);
      if (mine !== sent) return;
      const nameless = e.code === 'noname' || e.code === 'released';
      line.textContent = t(nameless ? 'rank.noName' : 'rank.error');
      name.hidden = !nameless;
      name.href = e.code === 'released' ? '/#nom-pop-canvi' : '/#nom-pop';
    }
  }
  function showPlace(position) {
    $('menu-rank').hidden = !position;
    if (position) $('menu-rank').textContent = ` · #${position}`;
  }
  function endScreen() { $('end-rank').hidden = $('end-name').hidden = true; }

  // The home's place on the board, and a run kept from before (no name then, or offline) sent now if it can go.
  async function sync() {
    if (!RANKING) return;
    const m = await service();
    const kept = m.pending();
    if (kept) try { await m.publish(kept); m.forget(); } catch (e) { if (e.code === 'pop_seed_used') m.forget(); }
    const { place } = await m.me().catch(() => ({}));
    showPlace(place?.position);
  }

  // a player's name as the main boards show it, into `into`
  function nameInto(into, p, { badgeArtOf, CHECK_SVG }) {
    into.append(el('span', `alias${p.verified ? '' : ' guest'}${p.released ? ' released' : ''}`, p.alias));
    if (!p.verified) return;
    const art = badgeArtOf(p.badge_id), mark = el('span', art ? 'player-badge' : 'verified-check');
    mark.innerHTML = art ?? CHECK_SVG; // our own markup, never the player's
    into.append(mark);
  }

  function openBoard() {
    const list = $('board-list'), note = $('board-note'), req = ++boardReq;
    list.replaceChildren();
    note.hidden = false; note.textContent = t('rank.loading');
    $('board-menu').hidden = false;
    $('board-close').focus({ focusVisible: false });
    service().then(m => Promise.all([m.board(), m.me().catch(() => ({})), marks()])).then(([rows, { place }, art]) => {
      if (req !== boardReq) return;
      const li = r => {
        const row = el('li', r.is_self ? 'me' : ''), who = el('button', 'who');
        who.type = 'button';
        who.addEventListener('click', () => openCard(r.public_id));
        who.append(el('i', '', r.position));
        nameInto(who, r, art);
        who.append(el('b', '', r.score));
        row.append(who);
        return row;
      };
      list.append(...rows.map(li));
      if (place && !rows.some(r => r.is_self)) list.append(el('li', 'gap', '…'), li({ ...place, alias: t('rank.you', { n: place.position }), is_self: true, verified: false }));
      note.hidden = rows.length > 0;
      note.textContent = t('rank.empty');
      list.querySelector('.me')?.scrollIntoView({ block: 'nearest' });
    }, () => { if (req === boardReq) note.textContent = t('rank.error'); });
  }
  function closeBoard() { boardReq++; $('board-menu').hidden = true; focusBack(); }

  // a player's card: their best and place here, their published runs and average
  function openCard(publicId) {
    const req = ++cardReq, title = $('card-name'), stats = $('card-stats');
    title.replaceChildren(t('rank.loading')); stats.replaceChildren();
    $('card-menu').hidden = false;
    $('card-close').focus({ focusVisible: false });
    service().then(m => Promise.all([m.player(publicId), marks()])).then(([p, art]) => {
      if (req !== cardReq) return;
      if (!p) { title.replaceChildren(t('rank.error')); return; }
      title.replaceChildren();
      nameInto(title, p, art);
      const stat = (key, value) => { const box = el('div'); box.append(el('dt', '', t(key)), el('dd', '', value)); return box; };
      stats.append(stat('rank.cardBest', p.best), stat('rank.cardPlace', `#${p.position}`), stat('rank.cardRuns', p.runs), stat('rank.cardAverage', p.average));
    }, () => { if (req === cardReq) title.replaceChildren(t('rank.error')); });
  }
  function closeCard() { cardReq++; $('card-menu').hidden = true; $('board-close').focus({ focusVisible: false }); }

  $('menu-best').addEventListener('click', openBoard);
  $('board-close').addEventListener('click', closeBoard);
  $('card-close').addEventListener('click', closeCard);
  return {
    publish, endScreen, sync,
    // Escape closes the top sheet; false when none was open
    escape() {
      if (!$('card-menu').hidden) closeCard();
      else if (!$('board-menu').hidden) closeBoard();
      else return false;
      return true;
    },
  };
}
