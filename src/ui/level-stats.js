// Step 2's level row (#select-level-stats, the song row's shape): the chosen level's record on this device (points, stars, %).
// Each line stays one line: when it doesn't fit, or would make the info block scroll, the panel's gaps give first (desktops'
// 18 px rhythm to 12), then the points, then the row.
// Never a placeholder: no record says so without a subtitle. Without the row (step 1, or it gave way) the same 12 px rhythm
// still applies whenever the info block would scroll (a two-line name in a 360 px column, 900×700).
import { DIFFS } from '../game/chart.js';
import { starsFor } from '../game/progress.js';
import { num } from './sheet-kit.js';

export const starIcons = n => `<span class="stars">${[0, 1, 2].map(i => `<svg viewBox="0 0 24 24"${i < n ? ' class="on"' : ''} aria-hidden="true"><path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z"/></svg>`).join('')}</span>`;

// record: { score, quality } on this device (or null)
export function showLevelStats($, { on, level, record }) {
  const row = $('select-level-stats'), title = $('select-level-title'), sub = $('select-level-sub'), info = $('select-info'), panel = row.parentElement;
  const tighten = () => panel?.toggleAttribute('data-tight', info.scrollHeight > info.clientHeight + 1);
  row.hidden = !on; panel?.toggleAttribute('data-tight', false);
  if (!on) return tighten();
  const d = DIFFS[level].name, has = Number.isFinite(record?.score), pct = has && Math.round(record.quality), n = has && starsFor(record.quality);
  const lead = has ? `${pct}% d’encerts` : '';
  sub.hidden = !has;
  const full = has ? `${num(record.score)} punts a ${d}` : `${d}: encara sense rècord`;
  const tries = [[full, false], [full, true], ...(has ? [[`El teu rècord a ${d}`, true]] : [])];
  const fits = () => ![title, sub].some(el => el.scrollWidth > el.clientWidth + 1) && !(info.scrollHeight > info.clientHeight + 1);
  row.hidden = !tries.some(([head, tight]) => { // only numbers and fixed copy reach innerHTML (no nickname)
    panel?.toggleAttribute('data-tight', tight);
    title.textContent = head;
    sub.innerHTML = (has ? starIcons(n) : '') + lead;
    row.setAttribute('aria-label', [head, has && `${n} de 3 estrelles`, lead].filter(Boolean).join(', '));
    return fits();
  });
  if (row.hidden) { panel?.toggleAttribute('data-tight', false); tighten(); }
}
