// The statistics as the Perfil sheet (src/ui/account-ui.js, private) and the public card (src/ui/player-card.js) show them
// (docs/rankings/strategy.md §7, the owner's «Fitxa breu»). Both read buckets ('<figure>/<version>/<level>' → counters, as stats.js
// keeps them and my_stats / get_player_card answer them) through stats.js summary(); the card never shows days, streaks,
// errors per kind or dates (decision 18).
import { summary } from '../game/stats.js';
import { FIGURE_VERSIONS } from '../services/leaderboard.js';
import { MULASSA, DRAC, BOU } from '../game/figures.js';
import { num, posDisc } from './sheet-kit.js';
import { tr } from '../i18n/messages.js';

const SHORT = { [MULASSA.id]: MULASSA.name, [DRAC.id]: DRAC.name, [BOU.id]: BOU.name };
export const FIGURE_NAMES = Object.freeze({ [MULASSA.id]: MULASSA.fullName, [DRAC.id]: DRAC.fullName, [BOU.id]: BOU.fullName }); // with the town: other towns' Mulasses and Dracs will come
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

// Drawn icons: coloured flat vectors on a 28 px grid (the outline ones read badly); only the two LINE ones
// (chevron, empty bars) are stroked in currentColor. GUAPA keeps its two drums' colours.
const ICONS = {
  drum: '<path d="M5 11v9c0 2.2 4 4 9 4s9-1.8 9-4v-9z" fill="#e8b26a"/><path d="M5 15c0 2.2 4 4 9 4s9-1.8 9-4" fill="none" stroke="#8a5a2a" stroke-width="1.6"/><ellipse cx="14" cy="11" rx="9" ry="4" fill="#fff3d6"/><path d="M8 3l6 7M20 3l-6 7" stroke="#8a5a2a" stroke-width="2.2" stroke-linecap="round"/>',
  clock: '<rect x="11" y="1.5" width="6" height="3" rx="1.5" fill="#3d6aa8"/><circle cx="14" cy="16" r="10.5" fill="#7fb2f0"/><circle cx="14" cy="16" r="7.5" fill="#fff3d6"/><path d="M14 16V11.5M14 16l3 2" stroke="#3d6aa8" stroke-width="2.2" stroke-linecap="round"/>',
  flame: '<path d="M14 2c1 5 8 8 8 15a8 8 0 0 1-16 0c0-4 2-6 4-8 0 3 1 4 2 4 0-4 0-8 2-11z" fill="#ff9f6e"/><path d="M14 13c3 3 5 5 5 8a5 5 0 0 1-10 0c0-3 3-5 5-8z" fill="#ffd76e"/><path d="M14 18c1.5 1.5 2.5 2.5 2.5 4a2.5 2.5 0 0 1-5 0c0-1.5 1-2.5 2.5-4z" fill="#fff3d6"/>',
  target: '<circle cx="14" cy="14" r="12" fill="#7ee081"/><circle cx="14" cy="14" r="8" fill="#fff3d6"/><circle cx="14" cy="14" r="4.5" fill="#3f9a4a"/><circle cx="14" cy="14" r="1.6" fill="#fff3d6"/>',
  judge: '<rect x="2.5" y="2.5" width="23" height="23" rx="6" fill="#d79be8"/><path d="M8 14.5l4 4 8-9" fill="none" stroke="#fff3d6" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>',
  guapa: '<path d="M14 2a12 12 0 0 0 0 24z" fill="#FF7A1A"/><path d="M14 2a12 12 0 0 1 0 24z" fill="#14B8A6"/><circle cx="14" cy="14" r="12" fill="none" stroke="#fff3d6" stroke-width="2"/>',
  tap: '<circle cx="15" cy="17" r="9.5" fill="#f08fb8" opacity=".45"/><circle cx="15" cy="17" r="5.5" fill="#f08fb8"/><circle cx="15" cy="17" r="2.2" fill="#fff3d6"/><path d="M3 6l3.5 3M9 2.5l1 4.5M2.5 12.5l4.2-.5" stroke="#f08fb8" stroke-width="2.4" stroke-linecap="round"/>', // a ripple and its taps: GLOBUS and CARRETILLES alike
  hold: '<rect x="2" y="9" width="24" height="10" rx="5" fill="#7fd4f0"/><rect x="7" y="12" width="14" height="4" rx="2" fill="#fff3d6" opacity=".7"/><circle cx="7" cy="14" r="4" fill="#fff3d6"/><circle cx="21" cy="14" r="4" fill="#fff3d6"/><circle cx="7" cy="14" r="1.8" fill="#2f8aa8"/><circle cx="21" cy="14" r="1.8" fill="#2f8aa8"/>',
  dizzy: '<path d="M14 25S3 18.5 3 10.5A5.8 5.8 0 0 1 14 7.6a5.8 5.8 0 0 1 11 2.9C25 18.5 14 25 14 25z" fill="#c8e07a"/><path d="M8.5 9.5a2.5 2.5 0 0 1 3-1" stroke="#fff3d6" stroke-width="2" stroke-linecap="round" fill="none"/><path d="M14 11l1.3 3h3.2l-2.6 2 1 3.2L14 17.4l-2.9 1.8 1-3.2-2.6-2h3.2z" fill="#5f7a1f"/>', // the plaza's spirit, a heart
  star: '<path d="M14 2.5l3.4 7.1 7.8 1-5.7 5.4 1.4 7.7L14 20l-6.9 3.7 1.4-7.7L2.8 10.6l7.8-1z" fill="#f5c518" stroke="#f5c518" stroke-width="1.5" stroke-linejoin="round"/><path d="M14 2.5l3.4 7.1 7.8 1-5.7 5.4L14 20z" fill="#c99a00"/>',
  calendar: '<rect x="3" y="5" width="22" height="20" rx="4" fill="#fff3d6"/><path d="M3 9a4 4 0 0 1 4-4h14a4 4 0 0 1 4 4v3H3z" fill="#b9a3f0"/><path d="M9 2.5v5M19 2.5v5" stroke="#6b55a8" stroke-width="2.4" stroke-linecap="round"/><g fill="#b9a3f0"><rect x="7" y="15" width="4" height="3" rx="1"/><rect x="12" y="15" width="4" height="3" rx="1"/><rect x="17" y="15" width="4" height="3" rx="1"/><rect x="7" y="19.5" width="4" height="3" rx="1"/><rect x="12" y="19.5" width="4" height="3" rx="1" fill="#6b55a8"/></g>',
  chev: '<path d="M6 9l6 6 6-6"/>',
  bars: '<path d="M5 20V12M10 20V7M15 20v-5M20 20V9" stroke-dasharray="2.4 2.4"/><path d="M3 20.5h18"/>',
};
const LINE = new Set(['chev', 'bars']);
export function icon(doc, key) {
  const s = doc.createElement('span'); s.className = LINE.has(key) ? 'stat-ico line' : 'stat-ico'; s.setAttribute('aria-hidden', 'true');
  s.innerHTML = `<svg viewBox="0 0 ${LINE.has(key) ? 24 : 28} ${LINE.has(key) ? 24 : 28}">${ICONS[key]}</svg>`;
  return s;
}
const el = (doc, tag, cls, text = '') => { const e = doc.createElement(tag); e.className = cls; if (text) e.textContent = text; return e; };
const count = (key, n, extra) => tr(key, { count: n, n: num(n), ...extra });

// A podium as an achievement: the disc, «Podi a Estrena 2026 · Mulassa». p: { position, place («1r»), text («a … · …») }
function wins(doc, list) {
  const ul = el(doc, 'ul', 'stat-wins'); ul.setAttribute('aria-label', tr('ui.stats.podiums'));
  for (const p of list) {
    const li = el(doc, 'li', '');
    const pos = posDisc(doc, p.position, p.place), t = el(doc, 'span', '');
    t.append(el(doc, 'b', '', tr('ui.stats.podium')), ` ${p.text}`);
    li.append(pos, t); ul.appendChild(li);
  }
  return ul;
}
// One tile of «Més estadístiques»: an icon, the fact, an optional quiet line under it; wide = the whole row
function line(doc, ul, key, text, sub = '', wide = false) {
  const li = el(doc, 'li', `stat-l-${key}${wide ? ' w' : ''}`), t = el(doc, 'span', '');
  for (const [i, part] of text.split(/(\d[\d.,\u00a0\u202f]*\d|\d)/).entries()) if (part) t.append(i % 2 ? el(doc, 'b', '', part) : part); // numbers stand out in the row's colour
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
    const f = el(doc, 'div', `stat-fact stat-k-${key}`);
    f.append(icon(doc, key), el(doc, 'b', '', big), el(doc, 'span', '', sub));
    facts.appendChild(f);
  }
  box.appendChild(facts);
  if (podiums.length) box.appendChild(wins(doc, podiums));

  const panel = el(doc, 'div', 'stat-more'); panel.id = `${box.id}-more`;
  const ul = panel.appendChild(el(doc, 'ul', 'stat-lines'));
  // two half tiles side by side, the three long ones (days, the judge's counts, the ànim sentence) on the whole row
  if (own) line(doc, ul, 'calendar', count('ui.stats.daysPlayed', d.daysPlayed),
    d.streak > 0 ? count('ui.stats.streakNow', d.streak, { best: num(d.bestStreak) }) : count('ui.stats.streakBest', d.bestStreak), true);
  // no sublines on the doubles, taps and held notes: they named figure-specific moves (GUAPA, CREMA, GLOBUS, MANTÉN) and would not scale to fifty figures
  line(doc, ul, 'guapa', tr('ui.stats.guapa', { n: num(d.guapa), total: num(d.guapaTotal) }));
  line(doc, ul, 'tap', d.balloons ? count('ui.stats.balloons', d.balloons) : tr('ui.stats.balloonsNone'));
  line(doc, ul, 'judge', tr('ui.stats.judged', { perfect: num(d.perfect), good: num(d.good), miss: num(d.miss) }), tr(own ? 'ui.stats.judgedOwn' : 'ui.stats.judgedPublic'), true);
  line(doc, ul, 'hold', d.holds ? count('ui.stats.holds', d.holds) : tr('ui.stats.holdsNone'));
  line(doc, ul, 'star', tr('ui.stats.stars', { n: num(d.stars), max: d.starsMax }), tr('ui.stats.starsSub'));
  line(doc, ul, 'dizzy', d.collapsed ? count('ui.stats.falls', d.collapsed) : tr('ui.stats.fallsNone'), d.collapsed ? tr('ui.stats.fallsSub') : '', true);
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
  for (const [k, n] of kinds) { const li = el(doc, 'li', `e-${k}`, `${ERROR_NAMES[k]} `); li.appendChild(el(doc, 'b', '', num(n))); list.appendChild(li); }
  panel.appendChild(list);
  const timing = d.errors.early + d.errors.late, all = kinds.reduce((a, [, n]) => a + n, 0);
  if (onSync && timing >= 10 && timing * 2 > all) {
    const tip = el(doc, 'p', 'stat-tip', tr(d.errors.early > d.errors.late ? 'ui.stats.tipEarly' : 'ui.stats.tipLate'));
    const b = el(doc, 'button', 'btn btn-link btn-small', tr('ui.stats.adjustSync')); b.type = 'button';
    b.setAttribute('aria-haspopup', 'dialog'); b.addEventListener('click', onSync);
    tip.appendChild(b); panel.appendChild(tip);
  }
}
