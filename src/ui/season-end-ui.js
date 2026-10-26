// The end-of-season sheet (#season-end-menu), its art drawn with the Saló de la fama's pieces (seasons-ui.js).
import { byId, num, trSplit, posDisc } from './sheet-kit.js';
import { tr } from '../i18n/messages.js';
import { FIGURE_NAMES } from './stats-view.js';
import { calendarSeason, seasonLine, figureSeasons, openSeason, hallEl, htmlEl, nestSvg, pixelOf, CAL_SVG } from './seasons-ui.js';

// --- «Tardor 2026 s’ha acabat» (#season-end-menu): once per profile and season (decision 17), at the first selector after a
// season ended where this profile published. A podium on any board: that figure on its step, «Has fet podi!» (or «Primer
// lloc!»); none: a garland and «Gràcies per fer plaça!». Then every board it was on with its place, and the season now open.
// The whole podium lives in the Saló de la fama («Saló de la fama» opens it: onHall(figure, back)). Season 0 never ends.
export const seasonSeenKey = (userId, seasonId) => `season-seen-${userId}-${seasonId}`;
const CONFETTI = [[18, 22, '#f5c518', 20], [44, 8, '#fff3d6', -30], [70, 26, '#d9955a', 40], [150, 10, '#f5c518', -15], [176, 28, '#fff3d6', 25], [202, 14, '#d6dbe2', -40], [110, 4, '#d9955a', 10], [32, 44, '#d6dbe2', 60], [190, 46, '#f5c518', -55]];
const PODIUM_FILL = ['#f5c518', '#d6dbe2', '#d9955a']; // the boards' podium discs
function podiumArt(figure, pos) {
  const blocks = { 2: [20, 66, 44], 1: [80, 52, 58], 3: [140, 76, 34] }; // place: x, top, height (ground at 110)
  let s = `<svg class="se-art" viewBox="0 0 220 116" aria-hidden="true">${CONFETTI.map(([x, y, f, r], i) => `<rect class="cf" style="--i:${i}" x="${x}" y="${y}" width="${i % 3 ? 5 : 4}" height="${i % 3 ? 9 : 4}" rx="1" fill="${f}" transform="rotate(${r} ${x} ${y})"/>`).join('')}`;
  for (const [place, [x, top, h]] of Object.entries(blocks)) {
    const me = Number(place) === pos;
    s += `<g class="blk${me ? ' me' : ''}"><rect x="${x}" y="${top}" width="60" height="${h}" rx="3" fill="${me ? PODIUM_FILL[place - 1] : '#4a3424'}"${me ? ' stroke="#fff3d6" stroke-width="2.5"' : ''}/><text x="${x + 30}" y="${top + Math.min(h - 6, 30)}" text-anchor="middle" font-family="'Jersey 10', monospace" font-size="28" fill="${me ? '#2a1a10' : '#e8d8b8'}">${place}</text></g>`;
  }
  const [x, top] = blocks[pos];
  return `${s}<g class="who">${nestSvg(pixelOf(figure), x + 4, top - 40, 52, 40)}</g><path d="M6 110.5h208" stroke="#e8d8b866" stroke-width="1.5"/></svg>`;
}
function garlandArt(figure) {
  const flags = ['#fff3d6', '#f5c518', '#d64545', '#fff3d6', '#f5c518', '#d64545', '#fff3d6', '#f5c518', '#d64545'];
  return `<svg class="se-art garland" viewBox="0 0 220 100" aria-hidden="true"><path d="M4 8Q110 40 216 8" stroke="#e8d8b8" stroke-width="1.5" fill="none"/>${flags.map((f, i) => {
    const t = (i + 0.5) / flags.length, x = 4 + 212 * t, y = 8 + 64 * t * (1 - t);
    return `<path class="flag" style="--i:${i}" d="M${x - 8} ${y - 1}L${x + 8} ${y - 1}L${x} ${y + 14}Z" fill="${f}"/>`;
  }).join('')}<g class="who">${nestSvg(pixelOf(figure), 80, 44, 60, 46)}</g></svg>`;
}
export function setupSeasonEnd({ focusIn, service, store, onHall = () => {}, doc = document, now = () => Date.now() }) {
  const $ = byId(doc), menu = $('season-end-menu'), body = $('season-end-boards');
  let back = null, hallFigure = null;
  // what to tell: { userId, season: { id, name }, boards: [{ figure, entry }], open: { name, endsAt } } for the newest unseen season,
  // or null (the older ones come on later visits, one at a time: show() marks only the season it shows)
  async function news() {
    if (!service.configured) return null;
    const userId = await service.ownerId();
    if (!userId) return null;
    const t = now(), found = new Map(), lists = [];
    for (const figure of Object.keys(FIGURE_NAMES)) {
      const list = await figureSeasons(service, figure, t); lists.push(list);
      for (const e of list) {
        if (e.endsAt == null || e.endsAt > t || !e.myPosition || store.get(seasonSeenKey(userId, e.seasonId))) continue;
        if (!found.has(e.seasonId)) found.set(e.seasonId, { id: e.seasonId, name: e.name, boards: [] });
        found.get(e.seasonId).boards.push({ figure, entry: e });
      }
    }
    const newest = [...found.values()].sort((a, b) => b.id - a.id)[0];
    return newest ? { userId, season: newest, boards: newest.boards, open: openSeason(lists, t) } : null; // only a season shown is marked seen: the older ones wait their turn
  }
  function show({ userId, season, boards, open = calendarSeason(now()) }, onBack = null) {
    store.set(seasonSeenKey(userId, season.id), '1'); // once, even if closed at once
    $('season-end-title').textContent = tr('ui.seasons.ended', { name: season.name });
    const top = boards.filter(b => b.entry.myPosition <= 3).sort((a, b) => a.entry.myPosition - b.entry.myPosition)[0];
    hallFigure = (top ?? boards[0]).figure;
    const art = htmlEl(doc, 'div', 'se-art-box', top ? podiumArt(top.figure, top.entry.myPosition) : garlandArt(hallFigure));
    const cheer = hallEl(doc, 'h3', `se-cheer${top ? ' gold' : ''}`, tr(!top ? 'ui.seasons.thanks' : top.entry.myPosition === 1 ? 'ui.seasons.first' : 'ui.seasons.podium'));
    // the receipt: a row per board, its place on the right (the podium's disc on a podium)
    const table = hallEl(doc, 'table', 'se-ledger'), tbody = hallEl(doc, 'tbody'), headRow = hallEl(doc, 'tr'), thead = hallEl(doc, 'thead');
    table.appendChild(hallEl(doc, 'caption', '', tr('ui.seasons.ledger')));
    for (const t of [tr('ui.seasons.colFigure'), tr('ui.seasons.colPlace')]) { const th = hallEl(doc, 'th', '', t); th.setAttribute('scope', 'col'); headRow.appendChild(th); }
    thead.appendChild(headRow);
    for (const { figure, entry } of boards) {
      const trow = hallEl(doc, 'tr'), th = hallEl(doc, 'th'), cell = hallEl(doc, 'span', 'cell'), nm = hallEl(doc, 'span', 'nm', FIGURE_NAMES[figure] ?? figure);
      th.setAttribute('scope', 'row');
      if (entry.previousDance) nm.appendChild(hallEl(doc, 'small', '', ` ${tr('ui.seasons.previousTag')}`));
      cell.append(htmlEl(doc, 'span', 'pix', pixelOf(figure)), nm); th.appendChild(cell);
      const td = hallEl(doc, 'td'), val = hallEl(doc, 'span', 'val');
      if (entry.myPosition <= 3) val.appendChild(posDisc(doc, entry.myPosition)).setAttribute('aria-hidden', 'true'); // the number beside it says it
      val.append(hallEl(doc, 'b', '', num(entry.myPosition)), ' ', hallEl(doc, 'span', 'of', tr('ui.seasons.ofTotal', { n: num(entry.players) })));
      td.appendChild(val); trow.append(th, td); tbody.appendChild(trow);
    }
    table.append(thead, tbody);
    const now2 = htmlEl(doc, 'p', 'se-now', CAL_SVG), line = hallEl(doc, 'span');
    const [pre, post] = trSplit('ui.seasons.now', 'name'); line.append(pre, hallEl(doc, 'b', '', open.name), (post + seasonLine(open, now()).slice(open.name.length)).replace(/^ ·/, '\u00a0·')); // the «·» stays with the name: a wrap falls after it
    now2.appendChild(line);
    body.replaceChildren(art, cheer, table, now2);
    back = onBack;
    menu.showModal(); focusIn(menu, 'season-end-ok');
  }
  $('season-end-ok').addEventListener('click', () => menu.close());
  $('season-end-close').addEventListener('click', () => menu.close());
  // the whole podium: the Saló de la fama, over the selector, with this sheet's way back
  $('season-end-hall').addEventListener('click', () => { const b = back; back = null; menu.close(); onHall(hallFigure, b); });
  menu.addEventListener('close', () => { const b = back; back = null; b?.(); });
  return {
    // true once shown; any failure (offline, no profile) is silent: the next start asks again
    async check(canShow = () => true, onBack = null) {
      try { const n = await news(); if (n && canShow()) { show(n, onBack); return true; } } catch { /* quiet */ }
      return false;
    },
    show, news,
    get isOpen() { return menu.open; },
  };
}
