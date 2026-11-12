// The board on the page: a run published at its end, the home's place, the board sheet and a player's card. The calls are
// ranking.js's (or ranking-mock.js's on a dev server with no Supabase), loaded only when needed. Names as on mulassa.cat's
// boards (src/ui/profile-notes.js): a guest's quieter, a confirmed address's with its check or chosen badge.
import { RUN_VERSION } from './run.js';
import { raiseBest } from './best.js';
import { badgeName } from '../../../ui/badge-names.js';
import { playerName, boardRow, levelPill } from '#plassa/board.js';
import { openPages, nextPage, wanted, capped, CAP } from './board-pages.js';

const SUPABASE = !!import.meta.env.VITE_SUPABASE_URL;
export const RANKING = SUPABASE || import.meta.env.DEV;
const service = () => (SUPABASE ? import('./ranking.js') : import('./ranking-mock.js'));
const marks = () => import('../../../ui/badge-svg.js');
// the server's no to the run itself (pop-score): sent again it can never pass, so it is not kept to retry
const REFUSED = new Set(['version', 'mismatch', 'invalid', 'too_large', 'pop_seed_used', 'implausible']);
// the kept run goes only when it is the one just answered: a better one waiting there (another seed) must stay
const forgetSent = (m, body) => { const p = m.pending(); if (p && p.v === body.v && p.seed === body.seed) m.forget(); };
const el = (tag, cls, text) => Object.assign(document.createElement(tag), cls ? { className: cls } : {}, text == null ? {} : { textContent: text });

// askName(run nodes): the name step opening by itself after a nameless run (settings.js promptName)
export function setupRankingUI({ t, focusBack, askName = () => {} }) {
  const $ = id => document.getElementById(id);
  let sent = 0, boardReq = 0, cardReq = 0, waiting = null; // waiting: the run the name step is for

  // After a run: the server plays it again and answers with the place; a player with no name makes one in the profile's
  // steps right here (settings.js; mulassa.cat's /#nom-pop if that chunk fails), and the run waits (ranking.keep) to go then.
  const publish = run => send({ v: RUN_VERSION, seed: run.seed, level: run.level, cols: run.game.cols, rows: run.game.rows, ticks: run.ticks, taps: run.log, points: run.game.points, hits: run.game.hits });
  // ask: a nameless answer opens the name step; not when the run is sent again as that step closes (it would open again)
  async function send(body, ask = true) {
    const line = $('end-rank'), name = $('end-name'), mine = ++sent;
    line.hidden = false; name.hidden = true; line.classList.remove('good');
    line.textContent = '\u00a0'; // the line's height is kept from the start: the answer fades in, nothing moves (no «sending…» swapped out)
    let m;
    try {
      m = await service();
      m.keep(body); // before the request: a tab closed meanwhile keeps the run for the next visit
      const res = await m.publish(body);
      forgetSent(m, body);
      raiseBest(res.best); // the board's best becomes this device's when higher
      if (mine !== sent) return;
      line.textContent = t(res.improved ? 'rank.newBest' : 'rank.place', { n: res.position });
      line.classList.toggle('good', res.improved);
      line.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 250, easing: 'ease-out' });
    } catch (e) {
      if (m && REFUSED.has(e.code)) forgetSent(m, body);
      if (e.code === 'pop_seed_used' || e.code === 'owner') return; // already on the board, or another account's kept run: the line stays blank, its height kept
      if (mine !== sent) return;
      const nameless = e.code === 'noname' || e.code === 'released';
      line.textContent = t(nameless ? 'rank.noName' : 'rank.error');
      line.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 250, easing: 'ease-out' });
      name.hidden = !nameless;
      name.href = e.code === 'released' ? '/#nom-pop-canvi' : '/#nom-pop';
      name.dataset.kind = e.code === 'released' ? 'rename' : 'create';
      // a new player is asked a moment after the line, every run, as the main game's publish prompt (until «No m'ho tornis a
      // recordar»); the button stays for after «Ara no» (a released name keeps only the button: its sheet says why)
      waiting = body;
      if (ask && e.code === 'noname') setTimeout(() => { if (mine === sent && !name.hidden && !$('end-menu').hidden) askName(runLine()); }, 700);
    }
  }
  // back from the profile's steps: the kept run tries again, its answer on the end sheet
  async function named() {
    const kept = (await service().catch(() => null))?.pending();
    if (kept) send(kept, false);
  }
  // that run as the name step shows it: its points and level (the main game's publish sheet shows its run the same way)
  const runLine = () => (waiting ? [`${waiting.points} · `, el('span', `lvt lvt${waiting.level}`, t(`level.${waiting.level}`))] : []); // «60 · FÀCIL», the level in its colour (main game: «95% a FÀCIL · ★★★»)
  function endScreen() { $('end-rank').hidden = $('end-name').hidden = true; }

  // The home's place on the board, and a run kept from before (no name then, or offline) sent now if it can go.
  async function sync() {
    if (!RANKING) return;
    const m = await service().catch(() => null); // offline with the chunk not yet loaded: the place waits for the next visit
    if (!m) return;
    const kept = m.pending();
    if (kept) try { await m.publish(kept); forgetSent(m, kept); } catch (e) { if (REFUSED.has(e.code)) forgetSent(m, kept); }
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
    const total = Number(rows[0].total); // every row carries the board's size (get_pop_board)
    if (total) $('menu-top-count').textContent = t('rank.players', { count: total, n: total.toLocaleString(document.documentElement.lang) });
    $('menu-top-list').replaceChildren(...rows.slice(0, 3).map(r => boardRow(r, { look, onOpen: () => openCard(r.public_id), cells: [scoreOf(r)], sub: underName(r) })));
    $('menu-top').hidden = false;
    $('menu-top').closest('.c-hero').classList.add('has-top'); // the figures make room (style.css)
  }

  // The board sheet, as mulassa.cat's board (src/ui/board-list.js): the top in pages of 50 (up to 500), the next one as the
  // list's end comes into view; the player's own row further down comes with its neighbours after a «…» whose button brings
  // the pages between (board-pages.js): nothing loads above the own row on its own, so it never moves away. It opens at the
  // own row; one link goes to the top or back to it. The sheet keeps one height (style.css). A late answer is dropped.
  let pages = null, moreSeen = null;
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  function openBoard() {
    const list = $('board-list'), note = $('board-note'), jump = $('board-jump'), req = ++boardReq;
    list.replaceChildren(); list.scrollTop = 0;
    jump.classList.add('off'); delete jump.dataset.state; pages = null;
    note.hidden = false; note.textContent = t('rank.loading');
    $('board-menu').hidden = false;
    $('board-close').focus({ focusVisible: false });
    service().then(m => Promise.all([m, m.me().catch(() => ({})), marks()])).then(async ([m, { place }, art]) => {
      const s = await openPages(m.board, place);
      if (req !== boardReq) return;
      const look = lookOf(art), li = r => boardRow(r, { look, onOpen: () => openCard(r.public_id), cells: [scoreOf(r)], sub: underName(r) });
      // the top's end: «Carregant-ne més…», a retry, the cap's note; the gap: «…» and its button
      const more = el('li', 'more'), gap = el('li', 'gap'), gapBtn = el('button', 'btn-link');
      gapBtn.type = 'button'; gapBtn.addEventListener('click', loadMore);
      gap.append(el('span', '', '…'), gapBtn);
      list.append(...s.top.map(li), more);
      if (s.near.length) list.append(gap, ...s.near.map(li));
      // not among the rows (a long tie before it, or a few rows under the first page): the own row apart, as 1.3.0, until a
      // page brings the real one (loadMore)
      const ghost = place && !s.top.some(r => r.is_self) && !s.near.length ? [el('li', 'gap', '…'), li({ ...place, alias: t('rank.you', { n: place.position }), is_self: true, verified: false })] : null;
      if (ghost) list.append(...ghost);
      note.hidden = s.top.length > 0;
      note.textContent = t('rank.empty');
      pages = { s, m, li, more, gap, gapBtn, ghost, req, busy: false, failed: false };
      status();
      moreSeen?.disconnect();
      moreSeen = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting) && !pages?.s.near.length) loadMore(); }, { root: list, rootMargin: '0px 0px 240px' });
      moreSeen.observe(more);
      list.scrollTop = meTop() ?? 0;
      jumpLabel();
    }).catch(() => { if (req === boardReq) note.textContent = t('rank.error'); });
  }
  function status() {
    const { s, more, gapBtn, busy, failed } = pages, n = wanted(s), word = busy ? 'rank.loadingMore' : failed ? 'rank.moreFailed' : null;
    if (s.near.length) { // the gap's button brings the pages; the end has nothing to say
      gapBtn.hidden = !n; gapBtn.disabled = busy;
      gapBtn.textContent = t(word ?? 'rank.loadMore');
      more.hidden = true;
      return;
    }
    more.replaceChildren();
    if (failed && !busy) { const retry = el('button', 'btn-link', t('rank.moreFailed')); retry.type = 'button'; retry.addEventListener('click', loadMore); more.append(retry); }
    else if (n) more.textContent = t('rank.loadingMore');
    else if (capped(s)) more.textContent = t('rank.capped', { n: CAP });
    more.hidden = !more.firstChild;
  }
  async function loadMore() {
    const p = pages;
    if (!p || p.busy || p.req !== boardReq || !wanted(p.s)) return;
    const keys = p.gap.contains(document.activeElement) || p.more.contains(document.activeElement); // pressed from the keyboard: the focus goes on
    p.busy = true;
    status();
    try {
      const { rows, joined } = await nextPage(p.m.board, p.s);
      if (p.req !== boardReq) return;
      const added = rows.map(p.li);
      p.more.before(...added);
      if (joined) { p.gap.remove(); $('board-list').append(p.more); }
      if (p.ghost && rows.some(r => r.is_self)) { for (const e of p.ghost) e.remove(); p.ghost = null; } // the real row is here
      p.busy = false; p.failed = false;
      status();
      if (keys) (added[0]?.querySelector('.player-name') ?? $('board-close')).focus(); // the button it was on is gone or busy
      jumpLabel();
      // no gap and the end still in view (a fast flick): the next one; the observer only fires on a change
      const l = $('board-list');
      if (!p.s.near.length && l.scrollHeight - l.scrollTop - l.clientHeight < 240) loadMore();
    } catch { if (p.req === boardReq) { p.busy = false; p.failed = true; status(); if (keys) (p.s.near.length ? p.gapBtn : p.more.querySelector('button'))?.focus(); } }
  }
  // the scroll that centres the own row in the list, or null with none
  function meTop() {
    const list = $('board-list'), me = list.querySelector('.me');
    if (!me) return null;
    const box = list.getBoundingClientRect(), row = me.getBoundingClientRect();
    return Math.max(0, list.scrollTop + row.top - box.top - (box.height - row.height) / 2);
  }
  // the link says «to the top» while the own row is on show (kept in place, unseen, at the very top), «to my row» otherwise
  function jumpLabel() {
    const list = $('board-list'), jump = $('board-jump'), me = list.querySelector('.me');
    const box = list.getBoundingClientRect(), row = me?.getBoundingClientRect(), seen = !me || (row.bottom > box.top && row.top < box.bottom);
    const state = `${seen}${seen && list.scrollTop < 4}`;
    if (jump.dataset.state === state) return; // a scroll event that changes nothing writes nothing
    jump.dataset.state = state;
    jump.dataset.to = seen ? 'top' : 'me';
    jump.textContent = t(seen ? 'rank.jumpTop' : 'rank.jumpMe');
    jump.setAttribute('aria-label', t(seen ? 'rank.jumpTopAria' : 'rank.jumpMeAria'));
    jump.classList.toggle('off', seen && list.scrollTop < 4);
  }
  function jumpTo() {
    const top = $('board-jump').dataset.to === 'top' ? 0 : meTop() ?? 0;
    $('board-list').scrollTo({ top, behavior: reduced() ? 'auto' : 'smooth' });
  }
  function closeBoard() { boardReq++; moreSeen?.disconnect(); pages = null; $('board-menu').hidden = true; focusBack(); }

  // a player's card: their best and place here, their published runs and average
  let opener = null; // what had the focus when the card opened: it gets it back
  function openCard(publicId) {
    opener = document.activeElement;
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
  // the card comes from a board row or the home's Top 3 (its sheet is not open then): never focus what is hidden
  function closeCard() {
    cardReq++;
    $('card-menu').hidden = true;
    const back = opener?.isConnected && opener !== document.body ? opener : $('board-menu').hidden ? $('menu-top-head') : $('board-close');
    back.focus({ focusVisible: false });
  }

  $('menu-best').addEventListener('click', openBoard);
  $('menu-top-head').addEventListener('click', openBoard);
  $('board-close').addEventListener('click', closeBoard);
  $('board-jump').addEventListener('click', jumpTo);
  $('board-list').addEventListener('scroll', jumpLabel, { passive: true });
  $('card-close').addEventListener('click', closeCard);
  return {
    publish, named, endScreen, sync, runLine,
    // Escape closes the top sheet; false when none was open
    escape() {
      if (!$('card-menu').hidden) closeCard();
      else if (!$('board-menu').hidden) closeBoard();
      else return false;
      return true;
    },
  };
}
