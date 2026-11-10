// The board on the page: a run published at its end, the home's place, the board sheet and a player's card. The calls are
// ranking.js's (or ranking-mock.js's on a dev server with no Supabase), loaded only when needed. Names as on mulassa.cat's
// boards (src/ui/profile-notes.js): a guest's quieter, a confirmed address's with its check or chosen badge.
import { RUN_VERSION } from './run.js';
import { raiseBest } from './best.js';
import { badgeName } from '../../../ui/badge-names.js';
import { playerName, boardRow, levelPill } from '#plassa/board.js';

const SUPABASE = !!import.meta.env.VITE_SUPABASE_URL;
export const RANKING = SUPABASE || import.meta.env.DEV;
const service = () => (SUPABASE ? import('./ranking.js') : import('./ranking-mock.js'));
const marks = () => import('../../../ui/badge-svg.js');
// the server's no to the run itself (pop-score): sent again it can never pass, so it is not kept to retry
const REFUSED = new Set(['version', 'mismatch', 'invalid', 'too_large', 'pop_seed_used']);
const el = (tag, cls, text) => Object.assign(document.createElement(tag), cls ? { className: cls } : {}, text == null ? {} : { textContent: text });

export function setupRankingUI({ t, focusBack }) {
  const $ = id => document.getElementById(id);
  let sent = 0, boardReq = 0, cardReq = 0;

  // After a run: the server plays it again and answers with the place; a player with no name makes one in the profile's
  // steps right here (settings.js; mulassa.cat's /#nom-pop if that chunk fails), and the run waits (ranking.keep) to go then.
  const publish = run => send({ v: RUN_VERSION, seed: run.seed, level: run.level, cols: run.game.cols, rows: run.game.rows, ticks: run.ticks, taps: run.log, points: run.game.points, hits: run.game.hits });
  async function send(body) {
    const line = $('end-rank'), name = $('end-name'), mine = ++sent;
    line.hidden = false; name.hidden = true; line.classList.remove('good');
    line.textContent = '\u00a0'; // the line's height is kept from the start: the answer fades in, nothing moves (no «sending…» swapped out)
    let m;
    try {
      m = await service();
      const res = await m.publish(body);
      m.forget();
      raiseBest(res.best); // the board's best becomes this device's when higher
      if (mine !== sent) return;
      line.textContent = t(res.improved ? 'rank.newBest' : 'rank.place', { n: res.position });
      line.classList.toggle('good', res.improved);
      line.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 250, easing: 'ease-out' });
    } catch (e) {
      if (e.code === 'pop_seed_used') return; // already on the board: the line stays blank, its height kept
      if (!REFUSED.has(e.code)) m?.keep(body);
      if (mine !== sent) return;
      const nameless = e.code === 'noname' || e.code === 'released';
      line.textContent = t(nameless ? 'rank.noName' : 'rank.error');
      line.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 250, easing: 'ease-out' });
      name.hidden = !nameless;
      name.href = e.code === 'released' ? '/#nom-pop-canvi' : '/#nom-pop';
      name.dataset.kind = e.code === 'released' ? 'rename' : 'create';
    }
  }
  // back from the profile's steps: the kept run tries again, its answer on the end sheet
  async function named() {
    const kept = (await service().catch(() => null))?.pending();
    if (kept) send(kept);
  }
  function endScreen() { $('end-rank').hidden = $('end-name').hidden = true; }

  // The home's place on the board, and a run kept from before (no name then, or offline) sent now if it can go.
  async function sync() {
    if (!RANKING) return;
    const m = await service().catch(() => null); // offline with the chunk not yet loaded: the place waits for the next visit
    if (!m) return;
    const kept = m.pending();
    if (kept) try { await m.publish(kept); m.forget(); } catch (e) { if (REFUSED.has(e.code)) m.forget(); }
    const { place } = await m.me().catch(() => ({}));
    top3(m); // not awaited: the home shows without it, the three come in when they are here
    raiseBest(place?.score); // played elsewhere: the HUD and the end sheet measure a run against it; the home's button never shows the place (the owner's call, 10 Nov 2026)
  }

  // the board's look (Plassa's board.js): mulassa.cat's badge art, their names in this game's words
  const lookOf = ({ badgeArtOf, CHECK_SVG }) => ({ checkSvg: CHECK_SVG, badgeOf: id => { const art = badgeArtOf(id); return art && { art, name: badgeName(id, k => t(`badge.${k}`)) }; } });
  // a row's points on the right, its level under the name: mulassa.cat's points and pill (src/ui/board-list.js); one number ranks
  const scoreOf = r => el('b', 'score', r.score);
  const underName = r => (r.level == null ? [] : [levelPill(r.level, t(`level.${r.level}`))]);

  // the home's Top 3 (a tall phone's, style.css .c-top): the board's first three rows, a tap on one opens its card, the head
  // opens the board; none yet (an empty board, offline) and it stays hidden
  async function top3(m) {
    const [rows, art] = await Promise.all([m.board(), marks()]).catch(() => [[]]);
    if (!rows.length) return;
    const look = lookOf(art);
    $('menu-top-list').replaceChildren(...rows.slice(0, 3).map(r => boardRow(r, { look, onOpen: () => openCard(r.public_id), cells: [scoreOf(r)], sub: underName(r) })));
    $('menu-top').hidden = false;
    $('menu-top').closest('.c-hero').classList.add('has-top'); // the figures make room (style.css)
  }

  function openBoard() {
    const list = $('board-list'), note = $('board-note'), req = ++boardReq;
    list.replaceChildren();
    note.hidden = false; note.textContent = t('rank.loading');
    $('board-menu').hidden = false;
    $('board-close').focus({ focusVisible: false });
    service().then(m => Promise.all([m.board(), m.me().catch(() => ({})), marks()])).then(([rows, { place }, art]) => {
      if (req !== boardReq) return;
      const look = lookOf(art), li = r => boardRow(r, { look, onOpen: () => openCard(r.public_id), cells: [scoreOf(r)], sub: underName(r) });
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
      playerName(title, p, lookOf(art));
      const stat = (key, value) => { const box = el('div'); box.append(el('dt', '', t(key)), el('dd', '', value)); return box; };
      stats.append(stat('rank.cardBest', p.best), stat('rank.cardPlace', `#${p.position}`), stat('rank.cardRuns', p.runs), stat('rank.cardAverage', p.average));
    }, () => { if (req === cardReq) title.replaceChildren(t('rank.error')); });
  }
  function closeCard() { cardReq++; $('card-menu').hidden = true; $('board-close').focus({ focusVisible: false }); }

  $('menu-best').addEventListener('click', openBoard);
  $('menu-top-head').addEventListener('click', openBoard);
  $('board-close').addEventListener('click', closeBoard);
  $('card-close').addEventListener('click', closeCard);
  return {
    publish, named, endScreen, sync,
    // Escape closes the top sheet; false when none was open
    escape() {
      if (!$('card-menu').hidden) closeCard();
      else if (!$('board-menu').hidden) closeBoard();
      else return false;
      return true;
    },
  };
}
