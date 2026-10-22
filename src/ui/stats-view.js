// The statistics as the Perfil sheet (src/ui/account-ui.js, private) and the public card (src/ui/player-card.js) show them
// (docs/rankings-strategy.md §7, Marc's «Fitxa breu»). Both read buckets ('<figure>/<version>/<level>' → counters, as stats.js
// keeps them and my_stats / get_player_card answer them) through stats.js summary(); the card never shows days, streaks,
// errors per kind or dates (decision 18).
import { summary } from '../game/stats.js';
import { FIGURE_VERSIONS } from '../services/leaderboard.js';
import { MULASSA, DRAC } from '../game/figures.js';
import { num } from './sheet-kit.js';
import { tr } from '../i18n/messages.js';

const SHORT = { [MULASSA.id]: MULASSA.name, [DRAC.id]: DRAC.name };
export const FIGURE_NAMES = Object.freeze({ [MULASSA.id]: MULASSA.fullName, [DRAC.id]: DRAC.fullName }); // with the town: other towns' Mulasses and Dracs will come
const COUNTS = ['runs', 'completed', 'collapsed', 'seconds', 'perfect', 'good', 'miss', 'guapa', 'guapaTotal', 'balloons', 'holds', 'bestCombo', 'bestStars'];
// the judge's own words for each kind of error (judge.js, results.js)
const ERROR_NAMES = Object.fromEntries(['early', 'late', 'silent', 'move', 'both', 'hold'].map(k => [k, tr(`ui.stats.error.${k}`)]));
const STARS_MAX = Object.keys(FIGURE_VERSIONS).length * 3 * 3; // every level of every figure's current dance: 18

// «3 h 12 min», «45 min», «menys d’1 min»: the total only (decision 19), never when
export function playTime(seconds) {
  const m = Math.floor((Number(seconds) || 0) / 60), h = Math.floor(m / 60);
  return h ? tr('ui.stats.time.hm', { h: num(h), m: m % 60 }) : m ? tr('ui.stats.time.m', { m }) : tr('ui.stats.time.lt1');
}
// «Des del 5 de novembre de 2026», «Des de l’1 d’octubre de 2026» (1 and 11 take the apostrophe); spelled here, not by
// Intl, whose year varies between engines («del 2026»)
export function sinceText(ymd) {
  const [y, m, n] = String(ymd).split('-').map(Number);
  return y && m && n ? tr(n === 1 || n === 11 ? 'ui.stats.sinceElided' : 'ui.stats.since', { day: n, month: tr(`ui.stats.month.${m}`), year: y }) : '';
}

// Buckets (local counters, my_stats or a card's totals) → what the sheets show. A bucket may lack a counter (an older
// server, a card without errors): it counts as 0.
export function statsData(buckets = {}, days = []) {
  const counters = {}, byFigure = {}, errors = Object.fromEntries(Object.keys(ERROR_NAMES).map(k => [k, 0]));
  const current = new Set(Object.entries(FIGURE_VERSIONS).map(([f, v]) => `${f}/${v}/`));
  let stars = 0;
  for (const [key, c] of Object.entries(buckets)) {
    if (key === 'practice' || !c) continue;
    counters[key] = { ...Object.fromEntries(COUNTS.map(k => [k, Number(c[k]) || 0])), errors: {} };
    const figure = key.split('/')[0];
    byFigure[figure] = (byFigure[figure] || 0) + counters[key].runs;
    for (const k of Object.keys(errors)) errors[k] += Number(c.errors?.[k]) || 0;
    if ([...current].some(p => key.startsWith(p))) stars += counters[key].bestStars; // a dance replaced: its stars stay out of the 18
  }
  const s = summary({ since: null, owners: { x: { counters, days: [...days], practice: buckets.practice ?? { runs: 0, seconds: 0 } } } }, 'x');
  return { ...s, byFigure, errors, stars, starsMax: STARS_MAX };
}

// Drawn icons (24 px grid, stroked in currentColor; GUAPA keeps its two drums' colours)
const ICONS = {
  drum: '<ellipse cx="12" cy="9" rx="7.5" ry="2.8"/><path d="M4.5 9v6.2c0 1.6 3.4 2.8 7.5 2.8s7.5-1.2 7.5-2.8V9M8 12v5.6M16 12v5.6M7.5 2.5l3.2 4.6M16.5 2.5l-3.2 4.6"/>',
  clock: '<circle cx="12" cy="13.5" r="7.5"/><path d="M12 9.5v4l2.8 1.8M9.5 2.8h5M12 2.8V6M18.5 6.5l1.4-1.4"/>',
  flame: '<path d="M12 21.2c-3.9 0-6.6-2.7-6.6-6.3 0-3.7 2.8-5.4 3.6-9.4 2 1.3 3.2 3.2 3.1 5.6 1.1-.8 1.8-2.1 1.9-3.6 2.6 1.9 4.6 4.6 4.6 7.6 0 3.5-2.7 6.1-6.6 6.1z"/><path d="M12 21.2c-1.6 0-2.7-1.1-2.7-2.6 0-1.6 1.3-2.4 1.7-4 1.9 1 3.6 2.4 3.6 4.1 0 1.5-1.1 2.5-2.6 2.5z"/>',
  target: '<circle cx="12" cy="12" r="8.6"/><circle cx="12" cy="12" r="4.8"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/>',
  judge: '<rect x="3.5" y="3.5" width="17" height="17" rx="3"/><path d="M7.5 12.4l3 3 6-6.6"/>',
  guapa: '<path d="M12 3.4a8.6 8.6 0 0 0 0 17.2z" fill="#FF7A1A" stroke="none"/><path d="M12 3.4a8.6 8.6 0 0 1 0 17.2z" fill="#14B8A6" stroke="none"/><circle cx="12" cy="12" r="8.6"/>',
  balloon: '<path d="M12 2.8c3.6 0 6.2 2.8 6.2 6.4 0 3.9-3.1 7.2-6.2 7.2s-6.2-3.3-6.2-7.2c0-3.6 2.6-6.4 6.2-6.4z"/><path d="M10.6 16.3l-.9 1.5h4.6l-.9-1.5M12 17.8c0 1.4-1.6 1.9-.9 3.6"/><path d="M9.2 6.6c.6-.9 1.4-1.4 2.4-1.6"/>',
  hold: '<rect x="2.8" y="8.4" width="18.4" height="7.2" rx="3.6"/><circle cx="6.4" cy="12" r="1.5" fill="currentColor"/><circle cx="17.6" cy="12" r="1.5" fill="currentColor"/>',
  dizzy: '<path d="M12.4 12.6a1.4 1.4 0 1 1-1.2-1.9 3.2 3.2 0 1 1-3.3 3.6 5.2 5.2 0 1 1 6.1 4.6"/><path d="M18.5 4.2l.5 1.4 1.4.5-1.4.5-.5 1.4-.5-1.4-1.4-.5 1.4-.5zM5.2 3.6l.4 1 1 .4-1 .4-.4 1-.4-1-1-.4 1-.4z"/>',
  star: '<path d="M12 3.2l2.6 5.4 5.9.8-4.3 4.1 1.1 5.9L12 16.6l-5.3 2.8 1.1-5.9-4.3-4.1 5.9-.8z"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.2"/><path d="M3.5 10h17M8 2.8v4M16 2.8v4"/><path d="M8 14.2h2M14 14.2h2M8 17.2h2"/>',
  chev: '<path d="M6 9l6 6 6-6"/>',
  bars: '<path d="M5 20V12M10 20V7M15 20v-5M20 20V9" stroke-dasharray="2.4 2.4"/><path d="M3 20.5h18"/>',
};
export function icon(doc, key) {
  const s = doc.createElement('span'); s.className = 'stat-ico'; s.setAttribute('aria-hidden', 'true');
  s.innerHTML = `<svg viewBox="0 0 24 24">${ICONS[key]}</svg>`;
  return s;
}
const el = (doc, tag, cls, text = '') => { const e = doc.createElement(tag); e.className = cls; if (text) e.textContent = text; return e; };
const count = (key, n, extra) => tr(key, { count: n, n: num(n), ...extra });

// A podium as an achievement: the disc, «Podi a Estrena 2026 · Mulassa». p: { position, place («1r»), text («a … · …») }
function wins(doc, list) {
  const ul = el(doc, 'ul', 'stat-wins'); ul.setAttribute('aria-label', tr('ui.stats.podiums'));
  for (const p of list) {
    const li = el(doc, 'li', '');
    const pos = el(doc, 'span', `pos p${p.position}`, p.place), t = el(doc, 'span', '');
    t.append(el(doc, 'b', '', tr('ui.stats.podium')), ` ${p.text}`);
    li.append(pos, t); ul.appendChild(li);
  }
  return ul;
}
// One line of «Més estadístiques»: an icon, the fact, an optional quiet line under it
function line(doc, ul, key, text, sub = '') {
  const li = el(doc, 'li', ''), t = el(doc, 'span', '', text);
  if (sub) t.appendChild(el(doc, 'small', '', sub));
  li.append(icon(doc, key), t); ul.appendChild(li);
}
// Into `box` (replacing what was there): four headline facts, the podiums, and «Més estadístiques» unfolding the rest in
// place. Public (the card, third person) or own (Perfil, second person, unfolded): own adds the days and streaks, the
// errors per kind and, onSync, «Ajusta la sincronia» when early or late taps are most of the errors.
export function renderStats(doc, box, d, { own = false, onSync = null, podiums = [] } = {}) {
  box.replaceChildren();
  const facts = el(doc, 'div', 'stat-facts');
  const figures = Object.entries(d.byFigure).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]).map(([f, n]) => `${SHORT[f] ?? f}\u00a0${num(n)}`).join(' · '); // breaks at the dot, never «Drac / 11»; the short name: a half-width tile
  for (const [key, big, sub] of [['drum', count('ui.stats.runs', d.runs), figures], ['clock', playTime(d.seconds), tr('ui.stats.atPlaza')],
    ['flame', num(d.bestCombo), tr('ui.stats.bestStreak')], ['target', d.accuracy == null ? '—' : `${Math.round(d.accuracy)}%`, tr('ui.stats.avgAccuracy')]]) {
    const f = el(doc, 'div', 'stat-fact');
    f.append(icon(doc, key), el(doc, 'b', '', big), el(doc, 'span', '', sub));
    facts.appendChild(f);
  }
  box.appendChild(facts);
  if (podiums.length) box.appendChild(wins(doc, podiums));

  const panel = el(doc, 'div', 'stat-more'); panel.id = `${box.id}-more`;
  const ul = panel.appendChild(el(doc, 'ul', 'stat-lines'));
  if (own) line(doc, ul, 'calendar', count('ui.stats.daysPlayed', d.daysPlayed),
    d.streak > 0 ? count('ui.stats.streakNow', d.streak, { best: num(d.bestStreak) }) : count('ui.stats.streakBest', d.bestStreak));
  const who = own ? 'own' : 'public';
  line(doc, ul, 'judge', tr('ui.stats.judged', { perfect: num(d.perfect), good: num(d.good), miss: num(d.miss) }), tr(own ? 'ui.stats.judgedOwn' : 'ui.stats.judgedPublic'));
  line(doc, ul, 'guapa', tr('ui.stats.guapa', { n: num(d.guapa), total: num(d.guapaTotal) }), tr('ui.stats.guapaSub'));
  line(doc, ul, 'balloon', d.balloons ? count(`ui.stats.balloons.${who}`, d.balloons) : tr(`ui.stats.balloonsNone.${who}`), tr('ui.stats.balloonsSub'));
  line(doc, ul, 'hold', d.holds ? count('ui.stats.holds', d.holds) : tr('ui.stats.holdsNone'), tr('ui.stats.holdsSub'));
  line(doc, ul, 'dizzy', d.collapsed ? count(`ui.stats.falls.${who}`, d.collapsed) : tr(`ui.stats.fallsNone.${who}`),
    d.collapsed ? tr('ui.stats.fallsSub') : '');
  line(doc, ul, 'star', tr('ui.stats.stars', { n: num(d.stars), max: d.starsMax }), tr('ui.stats.starsSub'));
  if (own) errorKinds(doc, panel, d, onSync);

  const more = el(doc, 'button', 'btn btn-link stat-toggle'); more.type = 'button';
  more.setAttribute('aria-controls', panel.id);
  const label = el(doc, 'span', '');
  more.append(label, icon(doc, 'chev'));
  const set = open => { more.setAttribute('aria-expanded', String(open)); panel.hidden = !open; label.textContent = tr(open ? 'ui.stats.less' : 'ui.stats.more'); };
  more.addEventListener('click', () => set(panel.hidden));
  set(own);
  const row = el(doc, 'div', 'stat-toggle-row'); row.appendChild(more);
  box.append(row, panel);
}
// Perfil only: where the notes get away, and the sync tip when timing is most of it (a tip, not a trophy)
function errorKinds(doc, panel, d, onSync) {
  const kinds = Object.entries(d.errors).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]);
  if (!kinds.length) return;
  panel.appendChild(el(doc, 'p', 'stat-errors-k', tr('ui.stats.errorsTitle')));
  const list = el(doc, 'ul', 'stat-errors'); list.setAttribute('aria-label', tr('ui.stats.errorsByKind'));
  for (const [k, n] of kinds) { const li = el(doc, 'li', '', `${ERROR_NAMES[k]} `); li.appendChild(el(doc, 'b', '', num(n))); list.appendChild(li); }
  panel.appendChild(list);
  const timing = d.errors.early + d.errors.late, all = kinds.reduce((a, [, n]) => a + n, 0);
  if (onSync && timing >= 10 && timing * 2 > all) {
    const tip = el(doc, 'p', 'stat-tip', tr(d.errors.early > d.errors.late ? 'ui.stats.tipEarly' : 'ui.stats.tipLate'));
    const b = el(doc, 'button', 'btn btn-link btn-small', tr('ui.stats.adjustSync')); b.type = 'button';
    b.setAttribute('aria-haspopup', 'dialog'); b.addEventListener('click', onSync);
    tip.appendChild(b); panel.appendChild(tip);
  }
}
