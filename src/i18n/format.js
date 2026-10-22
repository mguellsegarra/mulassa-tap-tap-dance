// Numbers and dates in the active language's own convention (meta.json numberLocale / dates.locale); ca keeps thousands dots (12.340).
// Each language follows its CLDR default on purpose (Marc): es/it/pl-style locales do not group 4-digit numbers (1234), 5+ digits do.
import { localeMeta } from './locale.js';

export const fmtNum = (n, opts) => Number(n).toLocaleString(localeMeta().numberLocale, opts);
export const fmtDate = (d, opts) => new Intl.DateTimeFormat(localeMeta().dates.locale, opts).format(d);
export const fmtDateRange = (a, b, opts) => new Intl.DateTimeFormat(localeMeta().dates.locale, opts).formatRange(a, b);
