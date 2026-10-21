// Step 2's level row (#select-level-stats, the song row's shape): the chosen level's record on this device (points, stars, %).
// Each line stays one line: when it doesn't fit, or would make the info block scroll, the panel's gaps give first (desktops'
// 18 px rhythm to 12), then the points (no record: the subtitle, then the shorter title), then the song's credit, then the
// board's foot goals (`goals(false)`), then the whole song row above it (Marc, 2026-10-21: data-snug, 900×700 / 1280×600;
// the ranking line always stays), then the row.
// Never a placeholder: no record says so without a subtitle. Without the row (step 1, or it gave way) the same 12 px rhythm
// still applies whenever the info block would scroll (a two-line name in a 360 px column, 900×700).
import { DIFFS } from '../game/chart.js';
import { starsFor } from '../game/progress.js';
import { num } from './sheet-kit.js';

export const starIcons = n => `<span class="stars">${[0, 1, 2].map(i => `<svg viewBox="0 0 24 24"${i < n ? ' class="on"' : ''} aria-hidden="true"><path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z"/></svg>`).join('')}</span>`;

// record: { score, quality } on this device (or null)
export function showLevelStats($, { on, level, record, goals = () => {} }) { // goals(on): the board card's foot (select-standings.js)
  const row = $('select-level-stats'), title = $('select-level-title'), sub = $('select-level-sub'), info = $('select-info'), panel = row.parentElement;
  const tighten = () => panel?.toggleAttribute('data-tight', info.scrollHeight > info.clientHeight + 1);
  row.hidden = !on; panel?.toggleAttribute('data-tight', false); panel?.removeAttribute('data-snug');
  if (!on) return tighten();
  const d = DIFFS[level].name, has = Number.isFinite(record?.score), pct = has && Math.round(record.quality), n = has && starsFor(record.quality);
  // no record yet: whose and why (Marc: «encara sense rècord» read as anyone's), and what makes one
  const lead = has ? `${pct}% d’encerts` : 'El primer ball que acabis serà el teu rècord';
  // it says what it is (Marc: the points alone read as anything): «El teu rècord a FÀCIL: 48.920 punts», shorter as room runs out
  const full = has ? `El teu rècord a ${d}: ${num(record.score)} punts` : `Encara no tens rècord a ${d}`, short = has && `Rècord a ${d}: ${num(record.score)} punts`;
  const heads = [full, ...(has ? [short, `El teu rècord a ${d}`] : [`Sense rècord a ${d}`])];
  // [title, tight, snug, subtitle]: no record, the subtitle goes before the song does (a 308–324 px column can't hold it)
  const bare = snug => (has ? [] : heads.map(h => [h, true, snug, false]));
  const snugged = (snug, withGoals) => [...heads.map(h => [h, true, snug, true, withGoals]), ...bare(snug).map(t => [...t, withGoals])];
  const tries = [[full, false], [full, true], ...(has ? [[short, false], [short, true], [heads[2], true]] : [[heads[1], true]]), ...bare(false),
    ...snugged('credit', true), ...snugged('credit', false), ...snugged('song', false)];
  const fits = () => ![title, sub].some(el => el.scrollWidth > el.clientWidth + 1) && !(info.scrollHeight > info.clientHeight + 1);
  row.hidden = !tries.some(([head, tight, snug = false, withSub = true, withGoals = true]) => { // only numbers and fixed copy reach innerHTML (no nickname)
    goals(withGoals); panel?.toggleAttribute('data-tight', tight); if (snug) panel?.setAttribute('data-snug', snug); else panel?.removeAttribute('data-snug');
    title.innerHTML = head.replace(d, `<span class="lvt${level}">${d}</span>`); sub.hidden = !withSub; // the level word in its colour
    sub.innerHTML = (has ? starIcons(n) : '') + lead;
    row.setAttribute('aria-label', [head, has && `${n} de 3 estrelles`, lead].filter(Boolean).join(', '));
    return fits();
  });
  if (row.hidden) { panel?.toggleAttribute('data-tight', false); panel?.removeAttribute('data-snug'); tighten(); }
}
