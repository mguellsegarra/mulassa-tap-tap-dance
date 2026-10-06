// Nickname rules for the public boards (pure, no DOM): normalise what the player typed and say, in Catalan, why a
// nickname can't be used. The server has the final word (supabase normalized_alias); these rules are a strict subset
// of what it accepts today, so a nickname passing here is never refused there for its shape.
// supabase/migrations/202609280009_alias_hardening.sql (+ 0010, 0012) mirrors this module in SQL (tests/alias-rules.mjs checks parity).
// No spaces (Marc, 2026-09-28; migration 0012): the ends are trimmed, any whitespace inside is refused, never removed.
const ALIAS_MIN = 3, ALIAS_MAX = 16;
// "_" and the Catalan middle dot (Col·la): accepted since the server rules (0009) went live.
export const SERVER_ACCEPTS_EXTRAS = true; // 202609280009_alias_hardening.sql is live (2026-09-28): _ and l·l accepted

// Every refusal says what to do next. blocked/reserved name the piece that matched (termMessage); these generic ones
// are the fallback (and the server's refusal when the lists drift: leaderboard.js 'blocked').
export const ALIAS_MESSAGES = Object.freeze({
  length: `Ha de tenir entre ${ALIAS_MIN} i ${ALIAS_MAX} caràcters. Escurça’l o allarga’l.`,
  spaces: 'No pot tenir espais. Ajunta les paraules, per exemple DracDeValls.',
  chars: 'Només lletres, números i guions. Treu els altres símbols.',
  letters: 'Ha de tenir alguna lletra. Afegeix-n’hi alguna.',
  repeat: 'Massa caràcters repetits seguits. Treu-ne alguns.',
  blocked: 'Aquest sobrenom no es pot fer servir. Tria’n un altre.',
  reserved: 'Aquest sobrenom està reservat. Tria’n un altre.',
});
// «Aquest sobrenom conté «puta», que no es pot fer servir. Tria’n un altre.» / ««admin» està reservat. Tria’n un altre.»
export const termMessage = (reason, piece) => !piece ? ALIAS_MESSAGES[reason]
  : reason === 'reserved' ? `«${piece}» està reservat. Tria’n un altre.`
  : `Aquest sobrenom conté «${piece}», que no es pot fer servir. Tria’n un altre.`;

// Blocklist, folded (lowercase, no accents) and matched on a "skeleton" (see skeletons()). Repeated letters in a term
// are minimums: "polla" needs two l's (so "Pola" is fine), "puuuta" still matches "puta".
//   severe: hate symbols, the worst slurs, sexual violence (Marc, 2026-09-28; migration 0013). Anywhere, even glued to
//     digits or other words ("Nazi88", "xHitlerx", "SiegHeil", "Pau1488"): matched on the leetspeak skeletons and also on
//     one that keeps the digits (so "1488" can be a term). A severe term found already blocks, so "88" right after one
//     needs no term of its own; "88" alone and "sieg" alone ("Siegfried", "sosiego") stay allowed on purpose.
//   sub: anywhere, even glued to other words ("ElPutaAmo"); allowlisted words that contain it are spared (severe too).
//   word: only as a whole word, the whole nickname, or spelled out letter by letter ("c u l").
const SEVERE = `nazi hitler heil kkk fuhrer fuehrer waffenss gestapo auschwitz holocaust whitepower whitepride 1488
  nigger nigga negrata faggot maricon marica bujarra tortillera travelo sudaca xarnego charnego
  pedofil pedophil paedophil pederast violador violacio rapist incest zoofil zoophil`;
const BLOCKED_SUB = `puta puto merda mierda cabron malpari collon capullo gilipo imbecil idiota subnormal retrasad
  retarded mongolo mongolic bollera panchito cataluf follar joder cojon polla pendejo fuck bitch cunt shit whore slut porn`;
const BLOCKED_WORD = `cul culo cony caca pedo verga pene penis zorra guarra mamon hdp fdp dick
  cock fag fck fuk cabro cabrons`;
// "mulassa" is not reserved (Marc, 2026-09-28): «Mulassa», «mulassafan», «LaMulassa» are fine (migration 0010).
const RESERVED_SUB = 'admin moderador moderator ajuntament ayuntamiento oficial official supabase organitzador';
const RESERVED_WORD = 'staff suport support soporte sistema system root null undefined';
// Scunthorpe guard: real words and names that contain a blocked piece. Second line (0013), for the severe terms:
// Nazim, Nazir(a), Ignazio, Ashkenazi; Sheila, Heilbronn; therapist, terapista, Trappist.
const ALLOW = `marc marta anna pere gemma montse gloria sergi bernat cugat cunit badminton pollastre pollancre pollenca
  disputa diputa computa reputa imputa amputa maricarmen maricruz yoshit hoshit scunthorpe
  nazim nazir ignazi ashkenazi sheila heilbronn therapist terapist trappist`;

const words = s => s.trim().split(/\s+/);
// [term, mode, reason, severe]
export const ALIAS_TERMS = Object.freeze([
  ...words(SEVERE).map(t => [t, 'sub', 'blocked', true]),
  ...words(BLOCKED_SUB).map(t => [t, 'sub', 'blocked', false]), ...words(BLOCKED_WORD).map(t => [t, 'word', 'blocked', false]),
  ...words(RESERVED_SUB).map(t => [t, 'sub', 'reserved', false]), ...words(RESERVED_WORD).map(t => [t, 'word', 'reserved', false]),
].map(Object.freeze));
export const ALIAS_ALLOW = Object.freeze(words(ALLOW));

// Explicit character sets (the SQL mirror uses the very same ones, not locale-dependent classes).
const WS = /[\t\n\v\f\r \u0085\u00A0\u1680\u2000-\u200A\u2028\u2029\u202F\u205F\u3000]+/gu;
// Invisible characters: controls, zero-width, bidi overrides/isolates, soft hyphen, BOM, variation selectors, tags.
const INVISIBLE = /[\u0000-\u001F\u007F-\u009F\u00AD\u061C\u180E\u200B-\u200F\u202A-\u202E\u2060-\u2064\u2066-\u206F\uFE00-\uFE0F\uFEFF\u{E0000}-\u{E007F}\u{E0100}-\u{E01EF}]/gu;
const LETTERS = 'A-Za-zÀ-ÖØ-öø-ÿŒœ'; // Latin only: no Cyrillic/Greek look-alikes, no fullwidth or styled letters
const SEP = '_\\-\'’'; // separators inside a nickname (no space)

// raw → { ok, alias (normalised, only when ok), reason, term, match, message }. For blocked/reserved: term = the list's
// word ("puta"), match = the piece of the (normalised) nickname that matched it, as typed ("p-u-t-a", "Put4").
export function checkAlias(raw, { extras = SERVER_ACCEPTS_EXTRAS } = {}) {
  const fail = (reason, term = null, match = null) =>
    ({ ok: false, alias: null, reason, term, match, message: termMessage(reason, match || term) });
  if (typeof raw !== 'string') return fail('length');
  let a = raw.normalize('NFC')
    .replace(WS, ' ').replace(INVISIBLE, '')
    .replace(/[ŀĿ]/gu, m => (m === 'ŀ' ? 'l\u00B7' : 'L\u00B7'))
    .replace(/[\u2010-\u2015\u2212]/gu, '-') // dashes typed by phones
    .replace(/[\u2018\u02BC\u00B4`]/gu, '’')
    .replace(/(?<=[lL])[.\u2022\u2027\u22C5\u00B7]+(?=[lL])/gu, '\u00B7') // l.l, l•l → l·l
    .replace(new RegExp(`^[ ${SEP}\u00B7]+|[ ${SEP}\u00B7]+$`, 'gu'), ''); // the ends: spaces and separators
  const allowed = extras ? `${LETTERS}0-9\\-'’_\u00B7` : `${LETTERS}0-9\\-'’`;
  if (!new RegExp(`^[ ${allowed}]*$`, 'u').test(a)) return fail('chars'); // symbols first, then the spaces
  if (a.includes(' ')) return fail('spaces'); // "Drac De Valls", "a - b": the player joins the words, we don't
  a = a.replace(new RegExp(`[${SEP}]+`, 'gu'), run => run[0]); // "a__b" → "a_b", "a-'b" → "a-b"
  if (a.replace(/(?<=[lL])\u00B7(?=[lL])/gu, '').includes('\u00B7')) return fail('chars'); // the dot only in l·l
  const n = [...a].length;
  if (n < ALIAS_MIN || n > ALIAS_MAX) return fail('length');
  if (!new RegExp(`[${LETTERS}]`, 'u').test(a)) return fail('letters');
  if (/(.)\1{3,}/u.test(fold(a))) return fail('repeat');
  const hit = aliasHit(a);
  return hit ? fail(hit.reason, hit.term, hit.match) : { ok: true, alias: a, reason: null, term: null, match: null, message: '' };
}

// Lowercase without accents (ç→c, ñ→n, l·l→ll); ASCII in, ASCII out for the Latin set above.
const FOLD_EXTRA = { ø: 'o', æ: 'ae', œ: 'oe', ß: 'ss', ð: 'd', þ: 'th' };
export function fold(s) {
  return s.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').replace(/[øæœßðþ]/gu, c => FOLD_EXTRA[c]).replace(/·/g, '');
}

// Leetspeak digits; "1" is read both as i and as l. Other digits are dropped (they only pad a word out).
const LEET = { 0: 'o', 3: 'e', 4: 'a', 5: 's', 7: 't', 8: 'b', '@': 'a', $: 's' };
// Built one character at a time (fold is per character for this charset), so every skeleton letter remembers the
// span of the alias it came from: at[k] = [start, end) in alias for compact[k]; tokens carry their first compact index.
function skeletons(alias) {
  return ['i', 'l', null].map(one => { // null: the digits kept, for the severe terms only ("1488")
    const tokens = [], at = [];
    let compact = '', cur = null, prev = '', o = 0;
    for (const c of alias) {
      const end = o + c.length, sep = /[ _\-'’]/u.test(c);
      // separators, and camelCase (GrallerDeValls → Graller De Valls), end a word
      if (sep || (/[a-zß-öø-ÿœ]/u.test(prev) && /[A-ZÀ-ÖØ-ÞŒ]/u.test(c))) cur = null;
      const out = sep ? '' : one === null ? fold(c) : fold(c).replace(/[0-9@$]/g, d => (d === '1' ? one : LEET[d] ?? ''));
      for (const ch of out) {
        if (!cur) tokens.push(cur = { text: '', start: compact.length });
        cur.text += ch; compact += ch; at.push([o, end]);
      }
      prev = c; o = end;
    }
    return { tokens: tokens.map(t => t.text), starts: tokens.map(t => t.start), compact, at, digits: one === null };
  });
}

// "polla" → /p{1,}o{1,}l{2,}a{1,}/: the term's doubled letters are minimums, any extra repeat still matches.
const termPattern = term => term.replace(/(.)\1*/g, run => `${run[0]}{${run.length},}`);
const spans = (re, s) => { // every (overlapping) leftmost-greedy match, like the SQL mirror's regexp_instr loop
  const out = [];
  for (let i = 0; i < s.length; i++) {
    re.lastIndex = i;
    const m = re.exec(s);
    if (!m) break;
    out.push([m.index, m.index + m[0].length]);
    i = m.index;
  }
  return out;
};
const TERMS = ALIAS_TERMS.map(([term, mode, reason, severe]) => ({ term, mode, reason, severe,
  sub: new RegExp(termPattern(term), 'g'), word: new RegExp(`^${termPattern(term)}$`),
  shortest: new RegExp(termPattern(term).replace(/,\}$/, ',}?'), 'y') })); // for the message: "ElPutaAmo" → "Puta", not "PutaA"
const ALLOW_RE = ALIAS_ALLOW.map(w => new RegExp(termPattern(w), 'g'));

// null or { reason: 'blocked' | 'reserved', term, match }. Expects an alias already shaped by checkAlias (its charset).
function aliasHit(alias) {
  for (const { tokens, starts, compact, at, digits } of skeletons(alias)) {
    // [a, b) in compact → the alias as typed: "p-u-t-a" keeps its dashes, "Put4" its digit
    const piece = (a, b) => alias.slice(at[a][0], at[b - 1][1]);
    const allowed = ALLOW_RE.flatMap(re => spans(re, compact));
    // whole words to test in 'word' mode, each with its span in compact
    const whole = tokens.map((w, i) => [w, starts[i], starts[i] + w.length]);
    whole.push([compact, 0, compact.length]);
    for (let i = 0; i < tokens.length; i++) { // runs of single letters, "p u t a" → "puta"
      let j = i;
      while (j < tokens.length && tokens[j].length === 1) j++;
      if (j - i > 1) whole.push([tokens.slice(i, j).join(''), starts[i], starts[j - 1] + 1]);
      i = Math.max(i, j);
    }
    for (const t of TERMS) {
      if (digits && !t.severe) continue; // the skeleton with digits is only for the severe terms
      let span;
      if (t.mode === 'word') span = whole.find(([w]) => t.word.test(w))?.slice(1);
      else if ((span = spans(t.sub, compact).find(([a, b]) => !allowed.some(([x, y]) => x <= a && b <= y)))) {
        t.shortest.lastIndex = span[0];
        span = [span[0], span[0] + t.shortest.exec(compact)[0].length];
      }
      if (span) return { reason: t.reason, term: t.term, match: piece(...span) };
    }
  }
  return null;
}
