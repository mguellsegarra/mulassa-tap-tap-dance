// The selector's desktop facts (Marc, 2026-10-20: version 3 of the mock-ups): the figure's records on this device as three
// medals, then the Mulassa board as one card: the position heads it (it opens Classificacions), the top 5, ··· and the rows
// round yours (names and points hook), the gaps to the first and to the next as its foot. Desktops only (select.css hides
// both elsewhere: phones keep the position chip and step 2's records). As much as the column holds without scrolling:
// the top 10 on a tall column, then fewer; names before the medals (Marc: the names and points are what hooks; step 2
// still shows each level's record), then your neighbours, the foot, the card.
import { DIFFS } from '../game/chart.js';
import { starsFor } from '../game/progress.js';
import { num } from './sheet-kit.js';
import { checkBadge } from './profile-notes.js';
import { starIcons } from './level-stats.js';

const STAR_AT = [50, 70, 85]; // starsFor's thresholds
const CROWN = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 19h18M4 16.5 3 7l5 4 4-6 4 6 5-4-1 9.5z"/></svg>';
const FLAG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 21V4M5 4h11l-2 4 2 4H5"/></svg>';
// (top rows, rows each side of yours, the foot, the medals: 2 full, 1 one line each, 0 none)
const TRIES = [[10, 2, true, 2], [10, 1, true, 2], [5, 2, true, 2], [5, 1, true, 2], [3, 1, true, 2],
  [5, 1, true, 1], [3, 1, true, 1], [5, 1, true, 0], [3, 1, true, 0], [1, 1, true, 1], [1, 1, true, 0], [0, 1, true, 0], [0, 0, true, 0], [0, 0, false, 0]];

export function setupStandings({ doc, $, onBoard, busy = () => false }) {
  const meds = $('select-meds'), card = $('select-standings');
  if (!meds || !card) return { medals() {}, board() {}, fit() {} }; // a page without them (the node tests' DOM)
  const head = $('select-standings-pos'), list = $('select-standings-rows'), foot = $('select-standings-foot'), info = $('select-info');
  $('select-standings-head').addEventListener('click', () => { if (!busy()) onBoard(); });
  let board = null;

  function medals(records) { // [{ score, quality } | null] per level, or null: none at all
    meds.hidden = !records;
    if (!records) return;
    meds.innerHTML = records.map((rec, l) => { // only numbers and fixed copy reach innerHTML
      const d = DIFFS[l].name, has = Number.isFinite(rec?.score), pct = has ? Math.round(rec.quality) : 0, n = has ? starsFor(rec.quality) : 0;
      const sub = has ? `${pct}% d’encerts` : `La 1a estrella, al ${STAR_AT[0]}%`;
      const label = has ? `${d}: ${num(rec.score)} punts, ${n} de 3 estrelles, ${sub}` : `${d}: encara sense rècord. ${sub}`;
      return `<div class="sel-med${has ? '' : ' none'}" role="note" aria-label="${label}"><span class="lvn" aria-hidden="true">${d}</span>${starIcons(n)}<b aria-hidden="true">${has ? num(rec.score) : '—'}</b><small aria-hidden="true">${sub}</small></div>`;
    }).join('');
  }
  const el = (tag, cls, text) => { const e = doc.createElement(tag); e.className = cls; if (text != null) e.textContent = text; return e; };
  function row(r) {
    const li = el('li', r.is_self ? 'me' : '');
    li.appendChild(el('span', 'n', num(Number(r.position))));
    const who = li.appendChild(el('span', 'who'));
    who.appendChild(el('span', 'alias', String(r.alias))); // aliases are text, never HTML
    if (r.verified === true) who.appendChild(checkBadge(doc));
    if (r.is_self) who.appendChild(el('span', 'me-tag', 'TU'));
    const d = Number(r.difficulty);
    li.appendChild(el('span', `lvl lvl${d}`, DIFFS[d]?.name ?? ''));
    li.appendChild(el('span', 'pc', `${Math.round(Number(r.quality))}%`));
    li.appendChild(el('span', 'pt', num(r.score)));
    return li;
  }
  function render(top, near, withFoot) {
    const rows = board?.rows ?? [], me = rows.find(r => r.is_self), at = p => rows.find(r => Number(r.position) === p);
    const pos = Number(me?.position) || 0, shown = [];
    for (let p = 1; p <= top; p++) if (at(p)) shown.push(at(p));
    if (pos) for (let p = pos - near; p <= pos + near; p++) if (p > top && at(p)) shown.push(at(p));
    list.replaceChildren(...shown.flatMap((r, i) => (i && Number(r.position) > Number(shown[i - 1].position) + 1 ? [el('li', 'dots', '···'), row(r)] : [row(r)])));
    list.hidden = !shown.length;
    const first = at(1), next = at(pos - 1), lines = [];
    if (me && first && pos > 1 && first.score > me.score) lines.push(`${CROWN}<span>A <b>${num(first.score - me.score)}</b> punts del primer</span>`);
    if (me && next && pos > 2 && next.score > me.score) lines.push(`${FLAG}<span>A <b>${num(next.score - me.score)}</b> punts del número ${num(pos - 1)}</span>`);
    foot.innerHTML = lines.join('<i></i>'); // numbers and fixed copy only
    foot.hidden = !withFoot || !lines.length;
  }
  function fit(least = false) { // what fits without scrolling the info block (only while laid out: desktops). least: none
    const scrolls = () => info.scrollHeight > info.clientHeight + 1; // of it, so step 2's level row is fitted first
    meds.toggleAttribute('data-gone', least);
    card.hidden = least || !board;
    if (least) return;
    for (const [top, near, withFoot, withMeds] of TRIES) {
      if (board) render(top, near, withFoot);
      meds.toggleAttribute('data-gone', !withMeds); meds.toggleAttribute('data-compact', withMeds === 1);
      if (!card.getClientRects().length && !meds.getClientRects().length) return; // not shown here: nothing to measure
      if (!scrolls()) return;
    }
    card.hidden = true;
  }
  return {
    medals(records) { medals(records); fit(); },
    board(s) { // { pos, total, rows } from the board, or null (no board, not the Mulassa)
      board = s;
      if (s) {
        head.textContent = s.pos ? `Ets el número ${num(s.pos)}${s.total ? ` de ${num(s.total)}` : ''}` : 'Classificació';
        $('select-standings-head').setAttribute('aria-label', `Classificacions${s.pos ? `: ets el número ${num(s.pos)}${s.total ? ` de ${num(s.total)}` : ''}` : ''}`);
      }
      fit();
    },
    fit,
  };
}
