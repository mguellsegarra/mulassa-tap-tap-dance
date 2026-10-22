// The selector's desktop facts (Marc, 2026-10-20: version 3 of the mock-ups): the figure's records on this device as three
// medals, then the figure's open board as one card: the ranking line heads it (it opens Classificacions), the top 5, ··· and the rows
// round yours (names and points hook), the gaps to the first and to the next as its foot (step 2: the header and the foot). Desktops only (select.css hides
// both elsewhere: phones keep the ranking line and step 2's records). As much as the column holds without scrolling:
// the top 10 on a tall column, then fewer; names before the medals (Marc: the names and points are what hooks; step 2
// still shows each level's record), then your neighbours, the foot, the card.
import { DIFFS } from '../game/chart.js';
import { starsFor } from '../game/progress.js';
import { num, trSplit } from './sheet-kit.js';
import { tr } from '../i18n/messages.js';
import { appendName } from './profile-notes.js';
import { starIcons } from './level-stats.js';
import { calendarSeason } from './seasons-ui.js';

// The ranking line (phones: under the song; desktops: the card's header), the same words everywhere (Marc: «Una línia a tot
// arreu»): «Posició 18 de 46 · Tardor 2026» (no gendered ordinal), else how many play, else empty; no answer yet: the name alone
export function rankText(s, season = calendarSeason().name) {
  if (!s) return tr('ui.standings.title');
  if (s.pos) return s.total ? tr('ui.standings.positionOf', { pos: num(s.pos), total: num(s.total), season }) : tr('ui.standings.position', { pos: num(s.pos), season });
  return s.total ? tr('ui.standings.players', { count: s.total, n: num(s.total) }) : tr('ui.standings.empty');
}
export const rankLabel = text => (text.startsWith(tr('ui.standings.title')) ? text : tr('ui.standings.labelled', { text }));

const CROWN = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 19h18M4 16.5 3 7l5 4 4-6 4 6 5-4-1 9.5z"/></svg>';
const FLAG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 21V4M5 4h11l-2 4 2 4H5"/></svg>';
// (top rows, rows each side of yours, the foot, the medals: 2 full, 0 none). The medals never shrink to one line (Marc,
// 2026-10-21: they flashed compact while loading): rows, then the foot go first; the medals only when even the header alone won't fit
const TRIES = [[10, 2, true, 2], [10, 1, true, 2], [5, 2, true, 2], [5, 1, true, 2], [3, 1, true, 2], [1, 1, true, 2],
  [0, 1, true, 2], [0, 0, true, 2], [0, 0, false, 2], [0, 0, false, 0]];

export function setupStandings({ doc, $, onBoard, onCard = null, busy = () => false, levels = () => false, onSwapped = () => {} }) { // levels(): step 2
  const meds = $('select-meds'), card = $('select-standings');
  if (!meds || !card) return { medals() {}, board() {}, fit() {} }; // a page without them (the node tests' DOM)
  const head = $('select-standings-pos'), list = $('select-standings-rows'), foot = $('select-standings-foot'), info = $('select-info');
  const body = $('select-standings-body'), sk = $('select-standings-sk'), msg = $('select-standings-msg');
  $('select-standings-head').addEventListener('click', () => { if (!busy()) onBoard(); });
  let board = null, on = false; // on: a board is configured (the header shows before its answer)
  let state = 'loading'; // loading | ready | error: the body's skeleton and the rows cross-fade (select.css)
  const seen = new Map(); // figure + owner → the last answer's rows (memory only): the placeholder's shape
  let key = '', recent = null; // recent: [owner, rows] of the last answer shown, any figure
  const owner = k => k.slice(k.indexOf(':') + 1);

  function medals(records) { // [{ score, quality } | null] per level, or null: none at all
    meds.hidden = !records;
    if (!records) return;
    meds.innerHTML = `<p class="sel-meds-t">${tr('ui.standings.records')}</p>` + records.map((rec, l) => { // only numbers and fixed copy reach innerHTML
      const d = DIFFS[l].name, has = Number.isFinite(rec?.score), pct = has ? Math.round(rec.quality) : 0, n = has ? starsFor(rec.quality) : 0;
      // no record: the quiet words take the points' line and the % line stays as an empty slot, so the first record shifts nothing
      const label = has ? tr('ui.standings.medalAria', { level: d, score: num(rec.score), n, pct }) : tr('ui.standings.medalNone', { level: d });
      return `<div class="sel-med${has ? '' : ' none'}" role="note" aria-label="${label}"><span class="lvn lvt${l}" aria-hidden="true">${d}</span>${starIcons(n)}<b aria-hidden="true">${has ? num(rec.score) : tr('ui.standings.noRecord')}</b><small aria-hidden="true">${has ? tr('ui.standings.accuracy', { pct }) : '&nbsp;'}</small></div>`;
    }).join('');
  }
  const el = (tag, cls, text) => { const e = doc.createElement(tag); e.className = cls; if (text != null) e.textContent = text; return e; };
  function row(r, blank = false) { // blank: the placeholder's, its names not buttons
    const li = el('li', r.is_self ? 'me' : '');
    li.appendChild(el('span', 'n', num(Number(r.position))));
    const who = li.appendChild(el('span', 'who'));
    const p = { alias: r.alias, tag: r.tag ?? null, verified: r.verified === true }; // a guest's «nom#1234»; aliases are text, never HTML
    const from = { season: calendarSeason().name, position: Number(r.position), score: r.score, difficulty: r.difficulty };
    appendName(doc, who, p, blank || !onCard ? null : q => onCard({ ...q, from })); // a name opens the player's card, as on the board
    if (r.is_self) who.appendChild(el('span', 'me-tag', 'TU'));
    const d = Number(r.difficulty);
    li.appendChild(el('span', `lvl lvl${d}`, DIFFS[d]?.name ?? ''));
    li.appendChild(el('span', 'pc', `${Math.round(Number(r.quality))}%`));
    li.appendChild(el('span', 'pt', num(r.score)));
    return li;
  }
  function pick(rows, top, near, withRows) { // the rows a board shows at this size, '···' where it skips
    const me = rows.find(r => r.is_self), at = p => rows.find(r => Number(r.position) === p), pos = Number(me?.position) || 0, shown = [];
    for (let p = 1; p <= top; p++) if (at(p)) shown.push(at(p));
    if (pos && withRows) for (let p = pos - near; p <= pos + near; p++) if (p > top && at(p)) shown.push(at(p));
    return shown.flatMap((r, i) => (i && Number(r.position) > Number(shown[i - 1].position) + 1 ? ['···', r] : [r]));
  }
  const gap = (key, diff, params) => { const [a, b] = trSplit(key, 'n', params); return `<span>${a}<b>${num(diff)}</b>${b}</span>`; }; // the number in bold
  function gaps(rows) { // the foot's lines: to the first and to the next (numbers and fixed copy only)
    const me = rows.find(r => r.is_self), at = p => rows.find(r => Number(r.position) === p), pos = Number(me?.position) || 0;
    const first = at(1), next = at(pos - 1), lines = [];
    if (me && first && pos > 1 && first.score > me.score) lines.push(`${CROWN}${gap('ui.standings.toFirst', first.score - me.score)}`);
    if (me && next && pos > 2 && next.score > me.score) lines.push(`${FLAG}${gap('ui.standings.toNext', next.score - me.score, { pos: num(pos - 1) })}`);
    return lines;
  }
  // The placeholder shares the rows' own markup and grid, so it is as tall as the rows it stands for (both layers overlap in one
  // grid cell while loading, select.css). Shape (Marc, 2026-10-21): the last answer seen for this figure and owner (`seen`), so
  // the answer rarely moves the card; the first time the last answer shown to this owner (another figure's: boards look alike, so the
  // card does not grow for the placeholder and shrink for the answer), else the most a board shows (the top rows, ···, your neighbours, the foot).
  // Once answered it leaves the flow and the card hugs the rows.
  function skeleton(top, near, withFoot, withRows) {
    const blank = i => row({ position: i, alias: 'Jugador', difficulty: 0, quality: 0, score: 0 }, true), last = state === 'loading' ? seen.get(key) ?? (recent?.[0] === owner(key) ? recent[1] : null) : board?.rows;
    let lis, lines = withFoot ? null : []; // null: the foot's bar; lines: its words (they may wrap), shimmering
    if (last) {
      lis = pick(last, top, near, withRows).map(r => (r === '···' ? el('li', 'dots', '···') : blank(Number(r.position))));
      if (!last.length && withRows) lis.push(blank(1)); // an empty board: about the message's room
      if (withFoot) lines = gaps(last);
    } else {
      lis = Array.from({ length: top }, (_, i) => blank(i + 1));
      if (top) lis.push(el('li', 'dots', '···')); // your row (and its neighbours) always shows, even with no top rows
      if (withRows) lis.push(...Array.from({ length: 2 * near + 1 }, (_, i) => blank(top + 2 + i)));
    }
    const ol = el('ol', 'sel-standings-rows');
    ol.replaceChildren(...lis);
    sk.replaceChildren(ol);
    if (lines?.length !== 0) { const p = sk.appendChild(el('p', 'sel-standings-foot')); if (lines) p.innerHTML = lines.join('<i></i>'); else p.appendChild(el('span', 'bar')); }
  }
  function render(top, near, withFoot, withRows = true) { // withRows false: the foot alone (step 2)
    skeleton(top, near, withFoot, withRows);
    const rows = board?.rows ?? [], lines = gaps(rows), shown = pick(rows, top, near, withRows);
    list.replaceChildren(...shown.map(r => (r === '···' ? el('li', 'dots', '···') : row(r))));
    list.hidden = !shown.length;
    foot.innerHTML = lines.join('<i></i>');
    foot.hidden = !withFoot || !lines.length;
    msg.hidden = state === 'loading' || !!rows.length || !withRows; // an empty or failed answer says so in the room the rows would take
    msg.textContent = tr(state === 'error' ? 'ui.standings.loadFailed' : 'ui.standings.noResults');
    body.dataset.state = state === 'loading' ? 'loading' : 'ready';
  }
  function fit(least = false) { // what fits without scrolling the info block (only while laid out: desktops). least: the
    const scrolls = () => info.scrollHeight > info.clientHeight + 1; // header alone, so step 2's level row is fitted beside it first
    meds.toggleAttribute('data-gone', least);
    card.hidden = !on;
    body.hidden = least;
    if (least) return;
    if (levels()) { goals(true); if (card.getClientRects().length && scrolls()) body.hidden = true; return; } // step 2: level-stats.js refits it beside the level row
    for (const [top, near, withFoot, withMeds] of TRIES) {
      render(top, near, withFoot);
      meds.toggleAttribute('data-gone', !withMeds);
      if (!card.getClientRects().length && !meds.getClientRects().length) return; // not shown here: nothing to measure
      if (!scrolls()) return;
    }
    body.hidden = true; // the header stays: the line is the home's way to the board
  }
  // Another board (a figure or owner change) or the first answer after the placeholder fades the card out, swaps it while unseen
  // (its new size included) and fades it in
  // (Marc, 2026-10-22: easing the height read as jumps, the selector's long tasks stalled it). The same board's answer or refresh
  // (a refresh, or the cached place then the fresh one) rewrites in place. Opacity only: the compositor runs it through a long task.
  const OUT = 120, IN = 180, WAIT = 350; // WAIT: unseen, the placeholder waits this long for the answer (one fade, not two)
  let shownKey = null, swap = null, waiting = false, fade = null, timer = 0; // swap: the newest board waiting for the fade out (the old one stays meanwhile)
  const unseen = () => card.hidden || !card.getClientRects?.().length || Number(globalThis.getComputedStyle?.(info)?.opacity) < 0.1
    || globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches || !card.animate;
  function reveal() {
    clearTimeout(timer); timer = 0;
    const apply = swap; swap = null; apply(); shownKey = key;
    onSwapped(); // the selector refits and measures the new card (step 2: its level row)
    fade.cancel(); fade = card.animate({ opacity: [0, 1] }, { duration: IN, easing: 'ease-out' });
  }
  function crossFade(next, answered, set, refit) { // next: the incoming board's key; answered: it ends the placeholder's wait
    if (swap) { swap = set; waiting = !answered; if (answered && timer) reveal(); return; } // still out: the newest answer comes in
    if (shownKey === null || (next === shownKey && !(answered && state === 'loading')) || unseen()) { set(); shownKey = next; return refit(); }
    swap = set; waiting = !answered;
    fade?.cancel();
    fade = card.animate({ opacity: [1, 0] }, { duration: OUT, easing: 'ease-in', fill: 'forwards' });
    fade.finished.then(() => { if (waiting) timer = setTimeout(reveal, WAIT); else reveal(); }, () => {});
  }
  // Step 2 (Marc, 2026-10-21): the header and the foot's two gaps, no rows (the level row takes their room); level-stats.js
  // decides whether they fit beside it (after the song's credit, before the song), else the header alone.
  function goals(show) {
    if (!show) return fit(true);
    meds.toggleAttribute('data-gone', true);
    card.hidden = !on;
    body.hidden = false;
    render(0, 0, true, false);
    if (state !== 'loading' && foot.hidden) body.hidden = true; // no gaps to tell (no position, or the first)
  }
  return {
    goals,
    medals(records, refit = true) { medals(records); if (refit) fit(); }, // refit false: the caller fits once after its other writes
    // { pos, total, rows } from the board, or null (not answered yet; failed: it will not come); shown: a board is configured;
    // who: figure + owner (the placeholder's shape); refit: the caller's fitting (step 2: the level row's, level-stats.js)
    board(s, shown, failed = false, who = '', refit = fit) {
      const next = failed ? 'error' : s?.rows ? 'ready' : 'loading'; // a position without rows (the ?demo placeholder) is still waiting for them
      crossFade(who, next !== 'loading', () => {
        board = s; on = shown; key = who; state = next;
        if (state === 'ready') { seen.set(key, s.rows); recent = [owner(key), s.rows]; }
        head.textContent = rankText(s);
        $('select-standings-head').setAttribute('aria-label', rankLabel(head.textContent));
      }, () => refit());
    },
    get fading() { return Boolean(swap); }, // fading out: the old board stays put, no refit for that
    fit,
  };
}
