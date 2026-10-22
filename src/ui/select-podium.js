// Step 2's podium (Marc, 2026-10-21: «A2 Llista»): the chosen level's best three in place of the ranking line, on tablets
// and desktops, when the info column has room for them; else (phones: it covered the figure) the line stays as it is.
// Its header does the ranking line's job (it opens Classificació); the names open the players' cards. The rows come from
// get_level_podium (one level's own ranking: the joint board keeps each player's best level only), asked once a minute
// per figure, level and owner.
import { DIFFS } from '../game/chart.js';
import { tr } from '../i18n/messages.js';
import { num } from './sheet-kit.js';
import { appendName } from './profile-notes.js';
import { calendarSeason } from './seasons-ui.js';

const PODIUM_TTL = 60e3;
const PODIUM_ROOM = '(min-width: 600px) and (min-height: 600px)'; // tablets and desktops; phones (either way up) keep the line
// a solid medal (Marc: simpler and solid, not outlined): the disc in its metal, a dark number, the ribbon a shade of it
const podiumMedal = n => `<svg class="pod-medal m${n}" viewBox="0 0 24 28" aria-hidden="true"><path d="M5.5 1h5l2.5 8h-5zM18.5 1h-5L11 9h5z" fill="currentColor" opacity=".55"/><circle cx="12" cy="17.5" r="9.5" fill="currentColor"/><text x="12" y="22" text-anchor="middle" fill="#2a1a10" font-family="'Baloo 2', sans-serif" font-weight="800" font-size="13">${n}</text></svg>`;

export function setupPodium({ doc, win, $, onBoard, onCard, load, refit, now = () => Date.now() }) {
  const box = $('select-podium');
  if (!box || !load) return { fit() {} };
  const panel = box.parentElement, info = $('select-info'), title = $('select-podium-t'), count = $('select-podium-n'), list = $('select-podium-list');
  const cache = new Map(); // figure:level:owner → { at, rows } (memory only); a pending ask has no rows yet
  $('select-podium-head').addEventListener('click', () => onBoard());
  const el = (tag, cls, text) => { const e = doc.createElement(tag); e.className = cls; if (text != null) e.textContent = text; return e; };
  function place(r, level) {
    const li = el('li', r.is_self ? 'me' : ''), at = Number(r.position);
    li.insertAdjacentHTML('beforeend', podiumMedal(at)); // a fixed drawing and a number, never data
    const who = li.appendChild(el('span', 'who')), p = { alias: r.alias, tag: r.tag ?? null, verified: r.verified === true };
    appendName(doc, who, p, q => onCard({ ...q, from: { season: calendarSeason().name, position: at, score: r.score, difficulty: level } })); // aliases are text, never HTML
    if (r.is_self) who.appendChild(el('span', 'me-tag', tr('ui.board.me')));
    li.appendChild(el('span', 'pts', num(r.score))); // lilac = points, as on the standings card
    return li;
  }
  function rowsFor(key, figure, level) { // the cached rows, or null while asking (the answer refits)
    const hit = cache.get(key);
    if (hit && now() - hit.at < PODIUM_TTL) return hit.rows;
    if (!hit?.asking) {
      const ask = { at: hit?.at ?? 0, rows: hit?.rows ?? null, asking: true };
      cache.set(key, ask);
      load(figure, level).then(rows => { cache.set(key, { at: now(), rows }); refit(); }, () => cache.delete(key));
    }
    return hit?.rows ?? null; // the last answer meanwhile, if any
  }
  // on: step 2, a playable figure and a board; s: the joint board's answer ({ pos, total }) for the header. No room: the panel's
  // gaps, then the song's credit give way (level-stats.js's own steps), else the line stays as level-stats.js left it
  function fit({ on, figure, level, owner, s }) {
    box.hidden = true; panel.removeAttribute('data-podium');
    if (!on || !s?.total || !win.matchMedia?.(PODIUM_ROOM).matches) return;
    const top = rowsFor(`${figure}:${level}:${owner}`, figure, level);
    if (!top?.length) return;
    const d = DIFFS[level].name, size = s.pos ? tr('ui.podium.position', { pos: num(s.pos), total: num(s.total) }) : tr('ui.podium.count', { count: s.total, n: num(s.total) });
    title.innerHTML = tr('ui.podium.title', { level: d }).replace(d, `<span class="lvt${level}">${d}</span>`); // fixed copy and level names only
    count.textContent = size;
    $('select-podium-head').setAttribute('aria-label', tr('ui.podium.aria', { level: d, size }));
    list.replaceChildren(...top.map(r => place(r, level)));
    const was = [panel.hasAttribute('data-tight'), panel.getAttribute('data-snug')];
    box.hidden = false; panel.setAttribute('data-podium', ''); // select.css: the line and the standings card give way
    const scrolls = () => info.scrollHeight > info.clientHeight + 1;
    for (const [tight, snug] of [[was[0], was[1]], [true, was[1]], [true, was[1] ?? 'credit']]) {
      panel.toggleAttribute('data-tight', tight); if (snug) panel.setAttribute('data-snug', snug);
      if (!scrolls()) return;
    }
    box.hidden = true; panel.removeAttribute('data-podium');
    panel.toggleAttribute('data-tight', was[0]); if (was[1]) panel.setAttribute('data-snug', was[1]); else panel.removeAttribute('data-snug');
  }
  return { fit };
}
