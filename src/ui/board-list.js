// The Classificació sheet (#board-menu, docs/rankings/strategy.md §4): one board per figure and season, every level mixed
// by points, the player's own row. Publishing the run is src/ui/board-ui.js's; it builds this and hands it the run.
import { PAGE } from '../services/leaderboard.js';
import { baseName } from '../services/leaderboard-identity.js';
import { DIFFS } from '../game/chart.js';
import { boardIssue } from '../services/leaderboard-errors.js';
import { num, trSplit, posDisc } from './sheet-kit.js';
import { tr } from '../i18n/messages.js';
import { mulaSpinner } from './loader.js';
import { appendName, GUEST_ROW } from './profile-notes.js';
import { figureSeasons, seasonLine, calendarSeason, closedSeasons, podiumList, ofSeason } from './seasons-ui.js';
import { MULASSA } from '../game/figures.js';
import { setupFigurePicker, PICKER_FIGURES, figurePortrait } from './figure-picker.js';
import { traitsOf } from '../figures/index.js';

const BOARD_CAP = 500; // rows the list shows at most (10 pages): past it, «Mostrant els 500 primers»

const withArticle = f => tr(`ui.board.withArticle.${traitsOf(f.id).article}`, { name: f.name });
const CLOUD_OFF = '<svg viewBox="0 0 24 24"><path d="M8 18h9.5a3.5 3.5 0 0 0 .4-7A6 6 0 0 0 7 9.1 4.5 4.5 0 0 0 8 18zM4 4l16 16"/></svg>';

// canPublish(): a run on the results screen not yet published (with runFigure() its figure) for «Publica el teu resultat»;
// openPublish(): that sheet; publishing(): it is open (closing this one then goes nowhere)
export function setupBoardList({ doc, $, service, store, focusIn, minLoad, now, observe, onCard, onSeasons, onKeep, currentFigure,
  canPlay = () => false, onPlay = () => {}, canPublish, runFigure, openPublish, publishing }) {
  const boardMenu = $('board-menu'), tbody = $('board-rows'), table = $('board-table'), box = $('board-scroll');
  const place = $('board-place'), jump = $('board-jump'), jumpLabel = $('board-jump-t');
  Object.assign(jumpLabel.dataset, { top: tr('ui.board.jumpTopShort'), me: tr('ui.board.jumpMeShort') }); // both labels' width reserved (base.css)
  let listReq = 0, back = null;
  // --- Classificació: one board per figure and season (the open one unless the Saló de la fama asked for a closed one),
  // every level ranked by points, in pages of 50 (leaderboard.js): every rank in order, the next page as the list's end
  // comes into view (or «Carrega’n més»), at most BOARD_CAP rows. It opens at the player's own row (the first page carries
  // it with 5 neighbours each side: a row further down shows after a gap that fills as pages come); one link goes to the
  // top or back to that row. The figure is a button over the list: «Tria figura» opens in the same sheet. A late answer
  // (or one for a closed / reopened sheet, another figure) is dropped. The sheet keeps one height throughout (index.html:
  // a fixed box holds list, loading, empty, error; the list scrolls inside it).
  const more = $('board-more'), moreStatus = $('board-more-status'), moreBtn = $('board-more-btn');
  // shownBoard: { byPos (rank → row, pages and the own row's neighbours), loaded (ranks 1..loaded all here), total, done }
  let shownBoard = null, moreBusy = false, moreFailed = false;
  // win: the own row's neighbours drawn past the unbroken list ({ from, to }), gap: the row between them (null once joined)
  let win = null, gap = null, meRow = null;
  // which board: the figure, and a closed season ({ seasonId, version, name }) or null (the open one)
  let figure = MULASSA.id, season = null, openName = null; // openName: the open board's season, as its header says it
  const figureOf = id => PICKER_FIGURES.find(f => f.id === id) ?? MULASSA;
  const canPublishNow = () => Boolean(canPublish() && !season && runFigure() === figure);
  const el = (tag, className, text) => { const e = doc.createElement(tag); e.className = className; if (text != null) e.textContent = text; return e; };
  // «Tria figura»: the list's place in the sheet (header and links stay). A figure: its open season's board (from a closed
  // season, the shown figure too: back to now; the history has its own sheet)
  const picker = setupFigurePicker({ doc, menu: boardMenu, focusIn, prefix: 'board-pick-',
    ids: { button: 'board-figure', pic: 'board-figure-pic', name: 'board-figure-name', picker: 'board-picker', list: 'board-figures', main: 'board-main' },
    onPick: id => { const change = figure !== id || season; figure = id; season = null; if (change) loadList({ min: 0 }); } });
  function setBoardStatus(text, { retry = false, publish = false, play = '', hint = '', kind = '', art = '' } = {}) {
    $('board-status').textContent = text;
    $('board-status').dataset.kind = kind; // 'empty' | 'error': a headline (index.html), '' the loading line
    $('board-hint').textContent = hint; $('board-hint').hidden = !hint;
    $('board-art').innerHTML = art; $('board-art').hidden = !art; $('board-art').dataset.kind = kind;
    $('board-retry').hidden = !retry;
    $('board-publish').hidden = !publish;
    $('board-play').hidden = !play; $('board-play-name').textContent = play;
    $('board-previous').hidden = true;
  }
  // the first page (with the caller's row) of a figure's open board, or of the closed season being shown
  const boardQuery = () => (season ? { version: season.version, season: season.seasonId } : { figure });
  // a page (ranks from+1 .. from+PAGE, plus the first page's neighbours) into the board: ranks deduped, `loaded` = how
  // far the ranks run unbroken from the top; the end: every rank here (total), a short page, or an empty one
  function absorb(b, rows, from) {
    for (const r of rows) b.byPos.set(Number(r.position), r);
    b.total = Number(rows[0]?.total) || b.total;
    let n = b.loaded;
    while (b.byPos.has(n + 1)) n++;
    const page = rows.filter(r => Number(r.position) > from && Number(r.position) <= from + PAGE).length;
    b.loaded = n;
    b.done = !page || (b.total ? n >= b.total : page < PAGE);
  }
  // a row's player: the name without its «#1234» (get_leaderboard_all composes it for old clients), the tag, the check
  const playerOf = r => ({ alias: baseName(r.alias, r.tag ?? null), tag: r.tag ?? null, verified: r.verified === true });
  function row(r) {
    const trow = doc.createElement('tr'), td = () => trow.appendChild(doc.createElement('td'));
    const pos = Number(r.position);
    td().appendChild(posDisc(doc, pos));
    const name = td(), who = name.appendChild(el('div', 'who'));
    const at = figure; // the card shows this row (the season's name read on the tap: the header may answer after the rows)
    const from = () => ({ figure: at, season: season?.name ?? openName ?? calendarSeason(now()).name, position: pos, score: r.score, difficulty: r.difficulty });
    appendName(doc, who, playerOf(r), p => onCard({ ...p, from: from() })); // a confirmed address: the check (nothing more); a guest: «#1234», quieter
    if (r.is_self) { trow.className = 'me'; meRow = trow; who.appendChild(el('span', 'me-tag', tr('ui.board.me'))); }
    const level = DIFFS[Number(r.difficulty)]?.name; // the level played (a coloured pill) and the longest streak, on a small line under the name
    if (level) {
      const sub = name.appendChild(el('div', 'sub'));
      sub.appendChild(el('span', `lvl lvl${Number(r.difficulty)}`, level));
      if (r.max_combo != null) { const [pre, post] = trSplit('ui.board.streak', 'n'), st = sub.appendChild(el('span', 'streak', pre)); st.append(el('b', '', num(r.max_combo)), post); }
    }
    const pct = `${Math.round(Number(r.quality))}%`;
    td().textContent = pct;
    const pts = td(); pts.textContent = num(r.score);
    pts.appendChild(el('span', 'pct-sub', pct)); // portrait phones: the % under the points, its column's room goes to the name (CSS shows one)
    return trow;
  }
  // under a guest's own row: a quiet way to keep the profile (the Perfil's e-mail step)
  function guestHint() {
    const trow = el('tr', 'me-hint'), td = trow.appendChild(doc.createElement('td'));
    td.colSpan = 4; td.setAttribute?.('colspan', '4');
    const b = td.appendChild(el('button', 'btn btn-link btn-small', GUEST_ROW));
    b.type = 'button'; b.setAttribute('aria-haspopup', 'dialog');
    b.addEventListener('click', () => onKeep()); // over the board
    return trow;
  }
  // between the unbroken list and the own row's neighbours: the ranks not loaded yet, and a way to load them
  function gapRow() {
    const trow = el('tr', 'gap'), td = trow.appendChild(doc.createElement('td'));
    td.colSpan = 4; td.setAttribute?.('colspan', '4');
    const btn = td.appendChild(el('button', 'btn btn-link btn-small', tr('ui.board.loadMore')));
    btn.type = 'button'; btn.addEventListener('click', () => loadMore());
    return { row: trow, btn };
  }
  const rowsOf = r => (r.is_self && r.tag != null && !season && onKeep ? [row(r), guestHint()] : [row(r)]);
  const shownRanks = b => Math.min(b.loaded, BOARD_CAP);
  // ranks from..to into the list: before the gap while there is one, never twice (the neighbours are already there)
  function appendRanks(b, from, to) {
    for (let p = from; p <= to; p++) {
      if (win && p >= win.from && p <= win.to) continue;
      if (gap && p < win.from) gap.row.before(...rowsOf(b.byPos.get(p))); else tbody.append(...rowsOf(b.byPos.get(p)));
    }
    if (gap && to >= win.from - 1) { gap.row.remove(); gap = null; } // joined up
  }
  function updateMore() { // the list's end: loading, «Carrega’n més», the cap; with a gap, the gap's own button does it
    const b = shownBoard, capped = Boolean(b && !b.done && b.loaded >= BOARD_CAP);
    if (gap) {
      gap.btn.hidden = capped; gap.btn.disabled = moreBusy;
      gap.btn.textContent = tr(moreBusy ? 'ui.board.loadingMore' : moreFailed ? 'ui.board.moreFailedRetry' : 'ui.board.loadMore');
    }
    more.hidden = Boolean(gap) || !b || !b.loaded || (b.done && !moreBusy && !moreFailed); // at the end: nothing, no gap
    if (more.hidden) { moreBtn.hidden = true; moreStatus.textContent = ''; return; }
    moreStatus.textContent = moreBusy ? tr('ui.board.loadingMore') : moreFailed ? tr('ui.board.moreFailed')
      : capped ? tr('ui.board.capped', { n: num(BOARD_CAP) }) : ''; // the end of the list needs no line
    if (moreBusy) moreStatus.prepend(mulaSpinner(doc, { mini: true }));
    moreBtn.hidden = moreBusy || b.done || capped;
  }
  // an open season with no result yet: who won the season before, under the invitation (decision 4); no history at all:
  // no «Temporades anteriors» either
  async function previousPodium(req) {
    let list = [];
    try { list = closedSeasons(await figureSeasons(service, figure, now()), now()); } catch { return; }
    if (req !== listReq || !boardMenu.open || shownBoard?.loaded) return;
    const e = list.find(x => !x.previousDance) ?? list[0];
    $('board-seasons').hidden = !e;
    if (!e?.podium?.length) return;
    const box = $('board-previous');
    box.replaceChildren(el('h3', '', tr('ui.board.podiumOf', { season: ofSeason(e.name) })), podiumList(doc, e.podium, p => onCard(p)));
    box.hidden = false;
  }
  const reduced = () => globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const scrollList = (top, smooth) => (smooth && box.scrollTo ? box.scrollTo({ top, behavior: reduced() ? 'auto' : 'smooth' }) : (box.scrollTop = top));
  // the own row in the middle of the box, snapped so no row sits half under the top
  function meTop() {
    if (!meRow?.offsetHeight) return 0;
    const head = table.tHead?.offsetHeight ?? 0;
    const want = meRow.offsetTop - head - (box.clientHeight - head - meRow.offsetHeight) / 2;
    const first = [...tbody.children].reverse().find(tr => tr.offsetTop - head <= want) ?? tbody.children[0];
    return Math.max(0, first.offsetTop - head);
  }
  // the link follows the list: the own row in view → «Al capdamunt» (nothing at the very top), else «A la meva fila», its arrow towards it
  let jumpTo = 'top';
  function syncJump() {
    const seen = meRow && meRow.offsetTop < box.scrollTop + box.clientHeight && meRow.offsetTop + meRow.offsetHeight > box.scrollTop;
    jumpTo = !meRow || seen ? 'top' : 'me';
    jumpLabel.textContent = tr(jumpTo === 'top' ? 'ui.board.jumpTopShort' : 'ui.board.jumpMeShort');
    jump.setAttribute('aria-label', tr(jumpTo === 'top' ? 'ui.board.jumpTopAria' : 'ui.board.jumpMeAria'));
    jump.classList.toggle('down', jumpTo === 'me' && meRow.offsetTop >= box.scrollTop);
    const off = jumpTo === 'top' && box.scrollTop < 4;
    jump.classList.toggle('off', off); // kept in place (visibility) for a player with a row, so the line never shifts
    jump.hidden = off && !meRow; // no position: no empty band under «12 participants» (it may shift when the link comes)
  }
  box.addEventListener('scroll', syncJump, { passive: true });
  jump.addEventListener('click', () => scrollList(jumpTo === 'top' ? 0 : meTop(), true));
  function showEmpty() {
    const f = figureOf(figure), publish = canPublishNow();
    if (season) return setBoardStatus(tr('ui.board.nobody'), { kind: 'empty', art: figurePortrait(f) });
    const play = !publish && canPlay() ? tr('ui.board.playWith', { figure: withArticle(f) }) : ''; // the button says it: the hint doesn't repeat it
    setBoardStatus(tr('ui.board.emptyTitle'), { kind: 'empty', art: figurePortrait(f), publish, play,
      hint: tr(publish ? 'ui.board.emptyHintPublish' : play ? 'ui.board.emptyHintFirst' : 'ui.board.emptyHintPlay', { figure: withArticle(f) }) });
    previousPodium(listReq);
  }
  function render() {
    picker.paint(figure);
    tbody.replaceChildren(); win = null; gap = null; meRow = null;
    table.hidden = true; place.hidden = true;
    if (!shownBoard) { updateMore(); return; }
    const b = shownBoard, self = [...b.byPos.values()].find(r => r.is_self);
    if (!b.loaded) { updateMore(); showEmpty(); return; }
    setBoardStatus('');
    const shown = shownRanks(b);
    appendRanks(b, 1, shown);
    const at = Number(self?.position);
    if (self && at > shown) { // far down: a gap (unless it already joins), then the own row's neighbours from the first page
      win = { from: Math.max(shown + 1, at - 5), to: at + 5 };
      if (win.from > shown + 1) { gap = gapRow(); tbody.append(gap.row); }
      for (let p = win.from; p <= win.to; p++) if (b.byPos.has(p)) tbody.append(...rowsOf(b.byPos.get(p)));
    }
    updateMore();
    const total = b.total || b.loaded;
    $('board-summary').textContent = self ? (b.total ? tr('ui.board.positionOf', { pos: num(at), total: num(b.total) }) : tr('ui.board.position', { pos: num(at) })) : tr('ui.seasons.players', { count: total, n: num(total) });
    const offer = !self && canPublishNow(); // a run on the results screen not published yet: where it would land
    $('board-place-sub').hidden = offer; $('board-publish-link').hidden = !offer;
    place.hidden = false;
    table.hidden = false;
    box.scrollTop = 0;
    if (self) box.scrollTop = meTop();
    syncJump();
  }
  // «Tardor 2026 · queden 23 dies»: the server's name for the board's season (its rows say which), else the calendar's
  async function header(req, rows) {
    const line = $('board-season');
    if (season) { line.textContent = season.name; return; }
    openName = null;
    line.textContent = seasonLine(calendarSeason(now()), now());
    const id = rows[0]?.season_id;
    if (id == null) return;
    try {
      const e = (await figureSeasons(service, figure, now())).find(x => x.seasonId === id);
      if (e && req === listReq) { line.textContent = seasonLine(e, now()); openName = e.name; }
    } catch { /* the calendar's line stands */ }
  }
  // The dancing Mulassa shows while it loads, at least `minLoad` ms when the sheet opens so it never just flashes; then
  // the list fades in (index.html).
  async function loadList({ min = minLoad } = {}) {
    const req = ++listReq;
    shownBoard = null; moreBusy = false; moreFailed = false; render();
    $('board-seasons').hidden = false;
    setBoardStatus(tr('ui.board.loading'));
    $('board-status').prepend(mulaSpinner(doc));
    $('board-season').textContent = season ? season.name : seasonLine(calendarSeason(now()), now()); // from the first frame
    const shown = min > 0 ? new Promise(r => setTimeout(r, min)) : null;
    let rows;
    try { rows = (await service.listAll(boardQuery())) ?? []; } catch (e) {
      await shown;
      boardIssue('leaderboard-list-failed', e);
      if (req !== listReq || !boardMenu.open) return;
      // the headline says what failed; under it what to do (the service's own words unless it is the connection again)
      const hint = e?.code === 'unavailable' || !e?.message ? tr('ui.board.checkConnection') : e.message;
      setBoardStatus(tr('ui.board.loadFailed'), { retry: true, kind: 'error', art: CLOUD_OFF, hint });
      return;
    }
    await shown;
    if (req !== listReq || !boardMenu.open) return;
    header(req, rows);
    const b = { byPos: new Map(), loaded: 0, total: 0, done: false };
    absorb(b, rows, 0);
    shownBoard = b; render();
  }
  // the next page: from the scroll (the list's end in view), «Carrega’n més» or the gap's button; one at a time, dropped if stale
  async function loadMore() {
    const b = shownBoard;
    if (moreBusy || !b || b.done || b.loaded >= BOARD_CAP || !boardMenu.open) return;
    const req = listReq, from = b.loaded;
    moreBusy = true; moreFailed = false; updateMore();
    let rows;
    try { rows = (await service.listAll({ ...boardQuery(), offset: from, limit: PAGE })) ?? []; } catch (e) {
      if (req !== listReq || shownBoard !== b) return;
      boardIssue('leaderboard-list-failed', e);
      moreBusy = false; moreFailed = true; updateMore(); // the button stays: another try
      return;
    }
    if (req !== listReq || shownBoard !== b || !boardMenu.open) return;
    moreBusy = false;
    const before = shownRanks(b);
    absorb(b, rows, from);
    appendRanks(b, before + 1, shownRanks(b));
    updateMore();
    if (!gap && box.scrollHeight - box.scrollTop - box.clientHeight < 240) loadMore(); // still at the end (a tall screen, a fast flick): the next one
  }
  moreBtn.addEventListener('click', () => loadMore());
  observe(more, box, () => { if (!gap) loadMore(); });
  $('board-publish').addEventListener('click', () => { openPublish(); boardMenu.close(); }); // the board doesn't go back behind it
  $('board-play').addEventListener('click', () => { const f = figure; back = null; boardMenu.close(); onPlay(f); }); // to the selector, not back where it came from
  $('board-publish-link').addEventListener('click', () => { openPublish(); boardMenu.close(); });
  $('board-seasons').addEventListener('click', () => onSeasons(figure)); // over the board: its «Mira la classificació» comes back to it
  // which: { figure (default: the run's, else the selector's), seasonId + version + name (a closed season's board) }
  function openBoard(onBack = null, which = {}) {
    if (!service.configured) return;
    if (!boardMenu.open || onBack) back = onBack; // a season picked over the open board keeps its way back
    figure = figureOf(which.figure ?? runFigure() ?? currentFigure() ?? MULASSA.id).id;
    season = which.seasonId != null && which.version ? { seasonId: which.seasonId, version: which.version, name: which.name ?? '' } : null;
    picker.show(false);
    if (!boardMenu.open) boardMenu.showModal();
    focusIn(boardMenu, 'board-close');
    loadList();
  }
  $('board-retry').addEventListener('click', () => { loadList(); focusIn(boardMenu, 'board-close'); });
  $('board-close').addEventListener('click', () => { if (picker.open) picker.show(false); else boardMenu.close(); });
  boardMenu.addEventListener('close', () => {
    listReq++;
    const b = back; back = null;
    if (b && !publishing()) b(); // opened from Configuració: back to it
  });
  return { openBoard, get open() { return boardMenu.open; } };
}
