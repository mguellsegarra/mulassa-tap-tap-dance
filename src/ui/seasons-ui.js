// Seasons (docs/rankings/strategy.md §4-5): the open season's name and days left (the board's header), podiums, the
// «Saló de la fama» sheet (one closed season of a figure at a time, «Estrena 2026» included: its estendard, podium, how many
// played, where the player came; «Tria temporada» lists them by year); the end-of-season sheet is season-end-ui.js. All of
// it reads get_seasons (service.seasons).
import { DIFFS } from '../game/chart.js';
import { byId, num, posDisc } from './sheet-kit.js';
import { tr } from '../i18n/messages.js';
import { fmtDate, fmtDateRange } from '../i18n/format.js';
import { mulaSpinner } from './loader.js';
import { appendName } from './profile-notes.js';
import { FIGURE_NAMES } from './stats-view.js';
import { FIGURES, MULASSA, portraitArt, portraitPalette } from '../game/figures.js';
import { pixelSvg } from './select-strip.js';
import { SELECTOR_PORTRAITS } from './selector-portraits.js';
import { setupFigurePicker } from './figure-picker.js';

const DAY = 864e5, SEASON_NAMES = [0, 1, 2, 3].map(i => tr(`ui.seasons.name.${i}`));
// Europe/Madrid's offset at `t` (ms): seasons turn at 00:00 Catalan time
function madridOffset(t) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Madrid', hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric' })
    .formatToParts(t).map(x => [x.type, Number(x.value)]));
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute) - Math.floor(t / 6e4) * 6e4;
}
// The quarter `now` falls in, as the server names it (decision 34), for a board with no result yet to name it by
export function calendarSeason(now = Date.now()) {
  const p = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Madrid', year: 'numeric', month: 'numeric' }).formatToParts(now);
  const y = Number(p.find(x => x.type === 'year').value), q = Math.floor((Number(p.find(x => x.type === 'month').value) - 1) / 3);
  const end = Date.UTC(q === 3 ? y + 1 : y, (q + 1) % 4 * 3, 1);
  return { name: `${SEASON_NAMES[q]} ${y}`, endsAt: end - madridOffset(end) };
}
// «Tardor 2026 · queden 23 dies»; a season with no end («Estrena 2026») or a closed one: its name alone
export function seasonLine({ name, endsAt }, now = Date.now()) {
  if (endsAt == null || endsAt <= now) return name;
  const days = Math.ceil((endsAt - now) / DAY);
  return tr('ui.seasons.line', { name, rest: days <= 1 ? tr('ui.seasons.endsToday') : tr('ui.seasons.daysLeft', { days }) });
}
// «d’Estrena 2026», «d’Hivern 2027», «de Tardor 2026»: «de» before a season's name, elided before a vowel or h
export const ofSeason = name => tr(/^[aeiouàèéíïòóúüh]/i.test(name) ? 'ui.seasons.ofElided' : 'ui.seasons.of', { name });
// a board's name in the history: «Mulassa», or «Mulassa (ball anterior)» when a newer dance shares the season (decision 29)
export const boardName = (figure, e) => e.previousDance ? tr('ui.seasons.boardPrevious', { figure: FIGURE_NAMES[figure] ?? figure }) : FIGURE_NAMES[figure] ?? figure;

// get_seasons for a figure, kept a minute: the board, the hall and the cards all ask for it. The answer carries the caller's own
// places (myPosition), so it is kept per owner, and an account event (another profile, a publication) drops it.
const seasonCache = new Map(); // service → Map(owner|figure → { at, p })
export async function figureSeasons(service, figure, now = Date.now()) {
  const owner = await Promise.resolve(service.ownerId?.()).catch(() => null) ?? '';
  let mine = seasonCache.get(service);
  if (!mine) { mine = new Map(); seasonCache.set(service, mine); service.onAccount?.(() => mine.clear()); }
  const key = `${owner}|${figure}`, hit = mine.get(key);
  if (hit && now - hit.at < 60e3) return hit.p;
  const p = service.seasons(figure);
  mine.set(key, { at: now, p });
  p.catch(() => { if (mine.get(key)?.p === p) mine.delete(key); }); // a failure is not remembered
  return p;
}
export const forgetSeasons = service => seasonCache.get(service)?.clear(); // a publication moved someone

// 1-2-3: the disc, the name (a button to the player's card), the level, the points
export function podiumList(doc, podium, onName) {
  const ol = doc.createElement('ol'); ol.className = 'podium';
  for (const p of podium) {
    const li = doc.createElement('li');
    const pos = posDisc(doc, p.position);
    const who = doc.createElement('span'); who.className = 'who';
    appendName(doc, who, { alias: p.alias, tag: p.tag ?? null, verified: p.verified }, onName);
    const lvl = doc.createElement('span'); lvl.className = `lvl lvl${Number(p.difficulty)}`; lvl.textContent = DIFFS[Number(p.difficulty)]?.name ?? '';
    const pts = doc.createElement('span'); pts.className = 'pts'; pts.textContent = num(p.score);
    li.append(pos, who, lvl, pts);
    ol.appendChild(li);
  }
  return ol;
}
// the closed seasons of a list, newest first: an end date passed, or the open-ended «Estrena 2026» (history from the start)
export const closedSeasons = (list, now = Date.now()) => list.filter(e => e.endsAt == null || e.endsAt <= now);

// --- the drawn pieces (static SVG strings, never data): the estendard, the figures
// the figure's selector drawing as a flat silhouette (a CSS mask over currentColor), kept once per figure
const figMasks = new Map();
const figMask = id => figMasks.get(id) ?? figMasks.set(id, `url('data:image/svg+xml,${encodeURIComponent(SELECTOR_PORTRAITS[id] ?? '').replace(/'/g, '%27')}')`).get(id);
const figHtml = id => `<i class="fig-mask" aria-hidden="true" style="--m:${figMask(id)}"></i>`;
// the small estendard hung from a gold rod (a decorative exception to the colour roles, AGENTS.md); dashed while still to come
const ESTENDARD_SVG = '<svg viewBox="0 0 64 90" aria-hidden="true"><path class="cord" d="M5 8 Q32 -3 59 8"/><path class="cloth" d="M10 9h44v72l-22-11-22 11z"/><path class="inner" d="M14 13h36v61l-18-9-18 9z"/><path class="rod" d="M4 8.5h56"/><circle class="knob" cx="4" cy="8.5" r="2.6"/><circle class="knob" cx="60" cy="8.5" r="2.6"/></svg>';
export const pixelOf = id => { const f = FIGURES.find(x => x.id === id) ?? MULASSA; return pixelSvg(portraitArt(f), portraitPalette(f), '#2a1a10'); };
export const nestSvg = (svg, x, y, w, h) => svg.replace('<svg ', `<svg x="${x}" y="${y}" width="${w}" height="${h}" `);
const LIST_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h3M4 12h3M4 18h3M10 6h10M10 12h10M10 18h10"/></svg>';
const BACK_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>';
export const CAL_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>';
export const hallEl = (doc, tag, cls = '', text = null) => { const e = doc.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
export const htmlEl = (doc, tag, cls, html) => { const e = hallEl(doc, tag, cls); e.innerHTML = html; return e; };
const playerCount = n => tr('ui.seasons.players', { count: n, n: num(n) });
const levelName = d => DIFFS[Number(d)]?.name ?? '';

// «1 d’octubre – 31 de desembre de 2026» (narrow phones: «1 d’oct. – 31 de des. 2026»), in Catalan time; `until` is the next
// season's first instant. With no end known («Estrena 2026» alone): «des del 27 de setembre de 2026».
const catDate = (o, t) => fmtDate(t, { timeZone: 'Europe/Madrid', day: 'numeric', ...o }).replace(/ del (\d{4})/g, ' de $1');
export function seasonDates({ startsAt, until }, month = 'long') {
  if (!Number.isFinite(until)) return tr(/^1 /.test(catDate({ month }, startsAt)) ? 'ui.seasons.sinceElided' : 'ui.seasons.since', { date: catDate({ month, year: 'numeric' }, startsAt) });
  return fmtDateRange(startsAt, until - 1, { timeZone: 'Europe/Madrid', day: 'numeric', month, year: 'numeric' }).replace(/[\u2009\u202f]/g, ' ').replace(/ del (\d{4})/g, ' de $1'); // ICU's thin spaces: a plain one may wrap
}
// a figure's closed seasons, one each (a dance replaced mid-season: its boards, the current dance first), newest first;
// «Estrena 2026» has no end of its own: it lasted until the next season began
export function hallSeasons(list, now = Date.now()) {
  const by = new Map();
  for (const e of closedSeasons(list, now)) {
    if (!by.has(e.seasonId)) by.set(e.seasonId, { id: e.seasonId, name: e.name, startsAt: e.startsAt, until: e.endsAt ?? Math.min(...list.filter(x => x.seasonId > e.seasonId).map(x => x.startsAt)), boards: [] });
    by.get(e.seasonId).boards.push(e);
  }
  for (const s of by.values()) s.boards.sort((a, b) => a.previousDance - b.previousDance);
  return [...by.values()];
}
// the open season (its days left), from the figures' answers or the calendar
export const openSeason = (lists, t) => lists.flat().find(e => e.endsAt != null && e.endsAt > t) ?? calendarSeason(t);

// --- Saló de la fama (#seasons-menu): one figure at a time (the board's dropdown, figure-picker.js), one season at a time: its
// estendard, dates and players, the podium (a dance replaced mid-season: one quiet link to its other board), the player's place
// («12 de 48»: a plain number, never a gendered ordinal) in its own band, «Mira la classificació» (onBoard(figure, entry):
// that board; entry null: the open season's) and «Tria temporada» (the seasons by year, in the same sheet). onCard(p): a player's card. One height: loading, empty, error inside its box.
export function setupSeasons({ focusIn, service, onBoard = () => {}, onCard = () => {}, doc = document, now = () => Date.now(), minLoad = 600 }) {
  const $ = byId(doc), menu = $('seasons-menu'), view = $('seasons-list'), status = $('seasons-status'), retry = $('seasons-retry');
  const picker = setupFigurePicker({ doc, menu, focusIn, prefix: 'seasons-fig-',
    ids: { button: 'seasons-figure', pic: 'seasons-figure-pic', name: 'seasons-figure-name', picker: 'seasons-picker', list: 'seasons-figures', main: 'seasons-main' },
    onPick: id => { if (figure !== id) { figure = id; load(); } } });
  let figure = 'mulassa-valls', req = 0, back = null, seasons = [], open = null, pick = 0, dance = 0;
  function say(text, { spin = false, again = false } = {}) {
    status.textContent = text; retry.hidden = !again; status.parentElement.hidden = !text;
    if (spin) status.prepend(mulaSpinner(doc));
  }
  // desktop (profile.css): the sheet hugs its view; a change of view keeps the last one's height until the next is drawn
  const hold = () => { if (!menu.style.getPropertyValue('--hall-h')) menu.style.setProperty('--hall-h', `${menu.offsetHeight}px`); };
  const fit = () => menu.style.removeProperty('--hall-h');
  menu.addEventListener('click', e => { if (e.target.closest('#seasons-figure')) hold(); }, true); // «Tria figura»: before the picker swaps the view
  const button = (cls, text, id, svg = '') => { const b = htmlEl(doc, 'button', cls, svg); b.type = 'button'; b.append(text); if (id) b.id = id; return b; };
  function estendard(empty = false) { const e = htmlEl(doc, 'span', `estendard${empty ? ' empty' : ''}`, ESTENDARD_SVG + figHtml(figure)); return e; }
  function podium(b) {
    const [first, ...rest] = b.podium, box = hallEl(doc, 'div', 'hall-podium-list');
    const who = (p, into) => { appendName(doc, into, { alias: p.alias, tag: p.tag ?? null, verified: p.verified }, q => onCard(q)); if (p.position === b.myPosition) into.appendChild(hallEl(doc, 'span', 'me-tag', tr('ui.seasons.me'))); };
    if (first) {
      const top = hallEl(doc, 'div', `pod-first${first.position === b.myPosition ? ' me' : ''}`), text = hallEl(doc, 'div'), name = hallEl(doc, 'div', 'who');
      who(first, name);
      const pts = hallEl(doc, 'div', 'pts', tr('ui.seasons.points', { n: num(first.score) })); pts.appendChild(hallEl(doc, 'span', `lvl lvt${Number(first.difficulty)}`, levelName(first.difficulty)));
      text.append(name, pts); top.append(posDisc(doc, 1), text); box.appendChild(top);
    }
    const ol = hallEl(doc, 'ol', 'pod-rest');
    for (const p of rest) {
      const li = hallEl(doc, 'li', p.position === b.myPosition ? 'me' : ''), name = hallEl(doc, 'span', 'who'), pts = hallEl(doc, 'span', 'pts', num(p.score));
      who(p, name); pts.appendChild(hallEl(doc, 'span', `lvl lvt${Number(p.difficulty)}`, levelName(p.difficulty)));
      li.append(posDisc(doc, p.position), name, pts); ol.appendChild(li);
    }
    box.appendChild(ol);
    return box;
  }
  // the player's place: its own band, unless the podium already says «TU»
  function mine(b) {
    if (b.myPosition != null && b.myPosition <= 3) return null;
    const band = hallEl(doc, 'div', `hall-mine${b.myPosition ? '' : ' none'}`), left = hallEl(doc, 'div');
    left.appendChild(hallEl(doc, 'span', 'hall-lab', tr('ui.seasons.yourPlace')));
    if (!b.myPosition) { left.appendChild(hallEl(doc, 'span', 'none-t', tr('ui.seasons.noResult'))); band.appendChild(left); return band; }
    const place = hallEl(doc, 'span', 'place', num(b.myPosition)); place.append(' ', hallEl(doc, 'small', '', tr('ui.seasons.ofTotal', { n: num(b.players) })));
    left.appendChild(place); band.appendChild(left);
    if (b.myScore != null) { const pts = hallEl(doc, 'span', 'mpts', tr('ui.seasons.points', { n: num(b.myScore) })); pts.appendChild(hallEl(doc, 'span', `lvl lvt${Number(b.myDifficulty)}`, levelName(b.myDifficulty))); band.appendChild(pts); }
    return band;
  }
  function detail(focus = null) {
    const s = seasons[pick], b = s.boards[dance], multi = s.boards.length > 1;
    const root = hallEl(doc, 'div', 'hall-view hall-detail'), main = hallEl(doc, 'div', 'hall-main');
    const head = hallEl(doc, 'section', 'hall-season'), text = hallEl(doc, 'div', 'hall-stext'), dates = hallEl(doc, 'p', 'hall-dates');
    dates.append(hallEl(doc, 'span', 'd-long', seasonDates(s)), hallEl(doc, 'span', 'd-short', seasonDates(s, 'short')));
    const meta = hallEl(doc, 'p', 'hall-meta', b.previousDance ? tr('ui.seasons.metaPrevious', { players: playerCount(b.players) }) : playerCount(b.players)); // the figure: the dropdown above
    text.append(hallEl(doc, 'h3', 'hall-name', s.name), dates, meta);
    // a dance replaced mid-season: one quiet line to its other board (it opened on the one the player was on)
    if (multi) {
      const next = (dance + 1) % s.boards.length, line = hallEl(doc, 'p', 'hall-dance');
      line.appendChild(hallEl(doc, 'span', 'hall-dance-t', tr('ui.seasons.twoDances'))); // short phones drop it: the meta says «(ball anterior)»
      const go = button('btn btn-link btn-small', tr(s.boards[next].previousDance ? 'ui.seasons.seePrevious' : 'ui.seasons.seeCurrent'), 'seasons-dance');
      go.addEventListener('click', () => { dance = next; detail('seasons-dance'); });
      line.appendChild(go); text.appendChild(line);
    }
    head.append(estendard(), text);
    const pod = hallEl(doc, 'section', 'hall-podium');
    pod.appendChild(hallEl(doc, 'h4', 'hall-lab', tr('ui.seasons.podiumTitle')));
    pod.appendChild(podium(b));
    main.append(head, pod);
    const band = mine(b); if (band) main.appendChild(band);
    const acts = hallEl(doc, 'div', 'hall-actions'), board = button('btn btn-primary', tr('ui.seasons.seeBoard'), 'seasons-board');
    board.setAttribute('aria-haspopup', 'dialog');
    board.addEventListener('click', () => { menu.close(); onBoard(figure, b); });
    acts.appendChild(board);
    if (seasons.length > 1) { const idx = button('btn btn-secondary', tr('ui.seasons.pick'), 'seasons-pick', LIST_SVG); idx.addEventListener('click', () => index()); acts.appendChild(idx); }
    root.append(main, acts);
    view.replaceChildren(root); fit();
    if (focus) focusIn(menu, focus);
  }
  // every closed season by year: its winner, the player's place («—» where they did not publish); the shown one cream
  function index() {
    hold(); // the index scrolls inside the detail's height
    const root = hallEl(doc, 'div', 'hall-view hall-index'), head = hallEl(doc, 'div', 'hall-idx-head');
    const backBtn = htmlEl(doc, 'button', 'sheet-x hall-back', BACK_SVG); backBtn.type = 'button'; backBtn.id = 'seasons-back';
    backBtn.setAttribute('aria-label', tr('ui.seasons.backTo', { name: seasons[pick].name })); backBtn.addEventListener('click', () => detail('seasons-pick'));
    head.append(backBtn, hallEl(doc, 'h3', '', tr('ui.seasons.pick')), hallEl(doc, 'span'));
    const cap = hallEl(doc, 'div', 'hall-idx-cap'); cap.append(hallEl(doc, 'span', '', tr('ui.seasons.indexCap')), hallEl(doc, 'span', '', tr('ui.seasons.indexYou')));
    const list = hallEl(doc, 'div', 'hall-idx');
    let year = null, ul = null;
    seasons.forEach((s, i) => {
      const y = /\d{4}$/.exec(s.name)?.[0] ?? '';
      if (y !== year) { year = y; list.appendChild(hallEl(doc, 'h4', 'hall-year', y)); ul = list.appendChild(hallEl(doc, 'ul')); }
      const me = s.boards.find(x => x.myPosition), win = s.boards[0].podium[0], row = hallEl(doc, 'button', 'idx-row');
      row.type = 'button'; if (i === pick) { row.setAttribute('aria-current', 'true'); row.id = 'seasons-current'; }
      const main = hallEl(doc, 'span', 'r-main'), name = hallEl(doc, 'span', 'r-name', s.name), sub = hallEl(doc, 'span', 'r-sub');
      if (s.boards.length > 1) name.appendChild(hallEl(doc, 'span', 'r-two', tr('ui.seasons.twoBalls', { n: s.boards.length })));
      if (win) { sub.appendChild(posDisc(doc, 1)); appendName(doc, sub, { alias: win.alias, tag: win.tag ?? null, verified: win.verified }); } // a row is one button: no card from here
      main.append(name, sub);
      const side = hallEl(doc, 'span', 'r-side');
      if (me) side.append(hallEl(doc, 'b', '', num(me.myPosition)), hallEl(doc, 'small', '', tr('ui.seasons.ofTotal', { n: num(me.players) })));
      else { const dash = hallEl(doc, 'b', 'dash', '—'); dash.setAttribute('aria-label', tr('ui.seasons.noMine')); side.append(dash, hallEl(doc, 'small', '', tr('ui.seasons.ofTotal', { n: num(s.boards[0].players) }))); }
      row.append(main, side);
      row.addEventListener('click', () => { pick = i; dance = Math.max(0, s.boards.findIndex(x => x.myPosition)); detail('seasons-pick'); });
      ul.appendChild(hallEl(doc, 'li')).appendChild(row);
    });
    root.append(head, cap, list);
    view.replaceChildren(root);
    focusIn(menu, 'seasons-current');
    doc.getElementById?.('seasons-current')?.scrollIntoView?.({ block: 'nearest' });
  }
  // no closed season yet (the Drac's first): an empty estendard, the open season, its board
  function empty() {
    const root = hallEl(doc, 'div', 'hall-view hall-empty'), mid = hallEl(doc, 'div', 'hall-wait'), until = open.endsAt - 1;
    mid.append(estendard(true), hallEl(doc, 'p', 'empty-h', tr('ui.seasons.firstOpen')), hallEl(doc, 'p', 'empty-p', tr('ui.seasons.firstOpenHint')),
      hallEl(doc, 'span', 'kind-chip hall-open', tr('ui.seasons.openUntil', { name: open.name, date: catDate({ month: 'long' }, until) })));
    const acts = hallEl(doc, 'div', 'hall-actions'), board = button('btn btn-primary', tr('ui.seasons.seeBoard'), 'seasons-board');
    board.setAttribute('aria-haspopup', 'dialog');
    board.addEventListener('click', () => { menu.close(); onBoard(figure, null); });
    acts.appendChild(board); root.append(mid, acts);
    view.replaceChildren(root); fit();
  }
  async function load() {
    const r = ++req;
    if (view.firstChild) hold();
    view.replaceChildren(); say(tr('ui.seasons.loading'), { spin: true });
    picker.paint(figure);
    const shown = minLoad > 0 ? new Promise(res => setTimeout(res, minLoad)) : null;
    let all;
    try { all = await figureSeasons(service, figure, now()); } catch (e) {
      await shown; if (r !== req || !menu.open) return;
      say(e?.message || tr('ui.seasons.loadFailed'), { again: true }); return;
    }
    await shown; if (r !== req || !menu.open) return;
    say('');
    seasons = hallSeasons(all, now()); open = openSeason([all], now()); pick = 0;
    if (!seasons.length) { empty(); return; }
    dance = Math.max(0, seasons[0].boards.findIndex(x => x.myPosition));
    detail();
  }
  retry.addEventListener('click', () => { load(); focusIn(menu, 'seasons-close'); });
  $('seasons-close').addEventListener('click', () => { if (picker.open) picker.show(false); else menu.close(); });
  menu.addEventListener('close', () => { req++; const b = back; back = null; b?.(); });
  return {
    open(which = 'mulassa-valls', onBack = null) {
      if (!service.configured || menu.open) return;
      figure = which; back = onBack; picker.show(false); view.replaceChildren(); fit(); // the last visit's view: not its height
      menu.showModal(); focusIn(menu, 'seasons-close');
      load();
    },
    get isOpen() { return menu.open; },
  };
}
