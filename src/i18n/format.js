// Numbers and dates in the active language's own convention (meta.json numberLocale / dates.locale); ca keeps thousands dots (12.340).
// Each language follows its CLDR default on purpose: es/it/pl-style locales do not group 4-digit numbers (1234), 5+ digits do.
import { lang, localeMeta } from './locale.js';
import { tr } from './messages.js';

export const fmtNum = (n, opts) => Number(n).toLocaleString(localeMeta().numberLocale, opts);
// ICU has no Aranese calendar names. Use Catalan's date structure with the catalogue's
// Aranese months, including in ranges; keep full names instead of foreign abbreviations.
const dateMonthFormatter = new Intl.DateTimeFormat('ca', { month: 'long', timeZone: 'UTC' });
const dateMonthNames = Array.from({ length: 12 }, (_, m) => dateMonthFormatter.format(Date.UTC(2026, m, 15)));
const dateFormatter = opts => new Intl.DateTimeFormat(localeMeta().dates.locale,
  lang() === 'oc' && opts?.month === 'short' ? { ...opts, month: 'long' } : opts);
const dateText = parts => parts.map(({ type, value }) => {
  if (lang() !== 'oc') return value;
  const month = type === 'month' ? dateMonthNames.indexOf(value.replace(/^(de |d[’'])/, '')) : -1;
  if (month >= 0) {
    const name = tr(`ui.stats.month.${month + 1}`);
    return /^(de |d[’'])/.test(value) ? name : name.replace(/^(de |d[’'])/, '');
  }
  return type === 'literal' ? value.replace(/ del /g, ' de ') : value;
}).join('');
export const fmtDate = (d, opts) => dateText(dateFormatter(opts).formatToParts(d));
export const fmtDateRange = (a, b, opts) => dateText(dateFormatter(opts).formatRangeToParts(a, b));
