// Sharing a result (pure, no DOM): the challenge link (?repte=<pct>-<diff>), the text that goes with the image,
// and which way the platform can share. Everything is made on the device; the link
// carries only the % and the level (no ids, no tracking parameters).
import { DIFFS } from '../game/chart.js';
import { tr } from '../i18n/messages.js';
import { fmtNum } from '../i18n/format.js';
import { lang, DEFAULT_LANG } from '../i18n/locale.js';

export const SITE = 'https://mulassa.cat/';
export const SITE_LABEL = 'mulassa.cat'; // the line printed on the results card and the image
export const HASHTAGS = '#MulassaTapTap #Valls';
export const CARD_FILE = 'mulassa-tap-tap-dance.jpg';

export const challengeEligible = run => !run?.figureId || run.figureId === 'mulassa-valls';
const diffName = d => DIFFS[d]?.name ?? DIFFS[0].name;

// --- the challenge: «supera el 94% a DIFÍCIL»
export function encodeChallenge(pct, diff) {
  if (!Number.isFinite(pct) || !Number.isInteger(diff) || diff < 0 || diff > 2) return null;
  return `${Math.max(0, Math.min(100, Math.round(pct)))}-${diff}`;
}
export const challengeUrl = (pct, diff, base = SITE, figureId = 'mulassa-valls') => {
  if (!challengeEligible({ figureId })) return base;
  const code = encodeChallenge(pct, diff);
  if (!code) return base;
  if (lang() === DEFAULT_LANG) return `${base}?repte=${code}`; // Catalan links stay byte-identical
  const u = new URL(base);
  u.searchParams.set('repte', code);
  u.searchParams.set('lang', lang());
  return u.href;
};
// Junk is ignored (null): only "<0-100>-<0|1|2>"; a percentage over 100 is clamped, never trusted as more.
export function parseChallenge(search) {
  let raw;
  try { raw = (typeof search === 'string' ? new URLSearchParams(search) : search)?.get('repte'); } catch { return null; }
  const m = typeof raw === 'string' && /^\s*(\d{1,3})-([0-2])\s*$/.exec(raw);
  return m ? { pct: Math.min(100, +m[1]), diff: +m[2] } : null;
}
export function stripChallenge(href) { // the address without ?repte (other params, `lang` included, stay), for history.replaceState
  const u = new URL(href);
  u.searchParams.delete('repte');
  return u.pathname + (u.search.length > 1 ? u.search : '') + u.hash;
}
export const challengeTip = ch => tr('services.share.challengeTip', { pct: ch.pct, diff: diffName(ch.diff) });
// null when the run wasn't the challenge's level (or it was the practice)
export function challengeResult(ch, run) {
  if (!ch || !run || !challengeEligible(run) || run.practice || run.diff !== ch.diff) return null;
  const beaten = run.pct > ch.pct || (ch.pct === 100 && run.pct === 100);
  const missing = beaten ? 0 : ch.pct - run.pct + 1;
  return { beaten, missing, line: beaten ? tr('services.share.challengeBeaten') : tr(missing <= 10 ? 'services.share.challengeAlmost' : 'services.share.challengeMissing', { missing }) };
}

// --- outcome, text and the funny line
// run: { pct, score (comparable points), diff, reason ('clear'|'fail'), stars (0-3), newRecord, practice } — a collapse is never shared (share-ui.js)
export function outcomeOf(run, challenge = null) {
  if (challengeResult(challenge, run)?.beaten) return 'challenge';
  if (run.newRecord) return 'record';
  return run.reason === 'clear' ? 'clear' : 'fail';
}
// Emojis: 🫏 (the donkey: the nearest to a mulassa; iOS 16.4+ / recent Android) opens every text, a festive one per
// outcome closes it. Short on purpose: X counts an emoji as 2 and the link as 23 (tests/share.mjs keeps it under 280).
export const MULA = '🫏';
export function shareText(run, challenge = null) { // the caption (the link goes apart: share()'s url, the intents' url=)
  const d = diffName(run.diff), p = `${run.pct}%`;
  if (run.figureId === 'drac-valls') return tr('services.share.drac', { pct: p, diff: d });
  const line = {
    challenge: tr('services.share.challenge', { mula: MULA, pct: p, diff: d }),
    record: tr('services.share.record', { mula: MULA, score: fmtNum(run.score), diff: d, pct: p }),
    clear: tr('services.share.clear', { mula: MULA, pct: p, diff: d }),
    fail: tr('services.share.fail', { mula: MULA, pct: p, diff: d }),
  }[outcomeOf(run, challenge)];
  return `${line} ${HASHTAGS}`;
}
// «Presumeix-ne!»: a gentle nudge only when there's something to show off; never in the practice
export const bragWorthy = (run, challenge = null) => !run.practice && run.reason !== 'collapse'
  && (Boolean(run.newRecord) || run.stars === 3 || Boolean(challengeResult(challenge, run)?.beaten));

// --- how this platform shares: the system sheet with the image alone, else save it (WhatsApp / X / Més… send the text + link)
export function shareMode(nav, file) {
  try { if (file && typeof nav?.share === 'function' && nav.canShare?.({ files: [file] })) return 'share'; } catch { /* no files */ }
  return 'download';
}
// the link only (Més…): the system sheet with the caption + link where there is one, else copy the link
export function linkMode(nav, data) {
  try { if (typeof nav?.share === 'function' && (nav.canShare ? nav.canShare(data) : true)) return 'share'; } catch { /* no sheet */ }
  return 'copy';
}
export const shareLinks = (text, url) => ({
  x: `https://x.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
  whatsapp: `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`,
});
export const isCancel = err => err?.name === 'AbortError'; // the person closed the share sheet: say nothing
