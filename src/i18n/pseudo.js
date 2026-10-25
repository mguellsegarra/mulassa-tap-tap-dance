// ?lang=pseudo (dev hosts): the Catalan catalogue bracketed, accented and ~40% longer, to spot clipped boxes and missed strings.
// Kept: {markers}, tags and entities, and the words that are never translated (GUA, PA, GUAPA!, CRE, MA, CREMA).
const KEEP = /\{\w+\}|<[^>]+>|&#?\w+;|(?<!\p{L})(?:GUAPA!?|GUA|PA|CREMA|CRE|MA)(?!\p{L})/gu;
const ACCENT = { a: 'á', e: 'é', i: 'í', o: 'ó', u: 'ú', c: 'ç', n: 'ñ', A: 'Á', E: 'É', I: 'Í', O: 'Ó', U: 'Ú', C: 'Ç', N: 'Ñ' };
const accent = s => s.replace(/[aeioucnAEIOUCN]/g, c => ACCENT[c]);

export function pseudoText(text) {
  if (!/\p{L}/u.test(text.replace(KEEP, ''))) return text; // only markers or kept words: nothing to translate
  let out = '', at = 0;
  for (const m of text.matchAll(KEEP)) { out += accent(text.slice(at, m.index)) + m[0]; at = m.index + m[0].length; }
  // the padding is its own words of <= 5 marks: glued to the last word it made one 20-letter word no language has, so it measured that, not length
  const pad = '~'.repeat(Math.ceil(text.length * 0.4)).match(/~{1,5}/g).join(' ');
  return `[${out}${accent(text.slice(at))} ${pad}]`;
}

export const pseudoCatalog = catalog => Object.fromEntries(Object.entries(catalog).map(([key, msg]) =>
  [key, typeof msg === 'string' ? pseudoText(msg) : Object.fromEntries(Object.entries(msg).map(([form, text]) => [form, pseudoText(text)]))]));
