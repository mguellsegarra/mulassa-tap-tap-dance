// What a guest profile is told about how long it lasts: the 7-day rule for profiles without a confirmed e-mail
// (supabase/migrations/202610180001_temporary_profiles.sql), the browsers likely to lose its storage, and the check a
// confirmed address earns on the board and the ⚙ «Perfil» block (it means only that).
export const KEEP_NOTICE = 'Sense confirmar el correu, el teu nom i els resultats publicats es conservaran durant 7 dies.';
export const VERIFIED = 'Correu confirmat';
export const NOTICE_FIRST = 'Abans de publicar, llegeix l’avís sobre els 7 dies i torna a prémer Publica.'; // as leaderboard.js 'notice'
const DAY = new Intl.DateTimeFormat('ca', { day: 'numeric', month: 'long' });
const TIME = new Intl.DateTimeFormat('ca', { hour: '2-digit', minute: '2-digit' });
// «el 25 d’octubre a les 18:42», «l’1 de novembre a les 09:05» (1 and 11 take the apostrophe)
export function onDate(ms) {
  const d = new Date(ms), n = d.getDate();
  return `${n === 1 || n === 11 ? 'l’' : 'el '}${DAY.format(d)} a les ${TIME.format(d)}`;
}
// «fins al 25 d’octubre», «fins a l’1 de novembre»: the Publicat! offer's short line (board-ui.js)
export function keptUntil(ms) {
  const d = new Date(ms), n = d.getDate();
  return `El nom es guarda fins ${n === 1 || n === 11 ? 'a l’' : 'al '}${DAY.format(d)}.`;
}
export const untilText = ms => `Sense confirmar el correu, el perfil caduca ${onDate(ms)}.`;
// a nickname made with «Crea» and no result yet: no deadline (202610180001 has no rule for it); said, not promised
export const RESERVED_TEXT = 'Encara no has publicat cap resultat: els 7 dies comencen amb el primer.';
export const EXPIRED_TEXT = 'Ha caducat: el nom i els resultats publicats ja no hi són. Els rècords d’aquest dispositiu es mantenen.';

// a scalloped seal, the shape people read as «verified» (Marc, 2026-10-20: «estil Twitter»)
const CHECK_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path class="seal" d="M12 2.7Q17.1-.2 18.6 5.4Q24.2 6.9 21.3 12Q24.2 17.1 18.6 18.6Q17.1 24.2 12 21.3Q6.9 24.2 5.4 18.6Q-.2 17.1 2.7 12Q-.2 6.9 5.4 5.4Q6.9-.2 12 2.7z"/><path d="m7.8 12.2 2.9 2.9 5.6-5.9"/></svg>';
// A button, so a tap or the keyboard shows what it means (index.html .verified-check: the tip on .tip / :focus-visible)
export function checkBadge(doc) {
  const b = doc.createElement('button');
  b.type = 'button'; b.className = 'verified-check';
  b.setAttribute('aria-label', VERIFIED); b.dataset.tip = VERIFIED; b.title = VERIFIED;
  b.innerHTML = CHECK_SVG;
  b.addEventListener('click', e => { e.stopPropagation?.(); b.classList.toggle('tip'); });
  b.addEventListener('blur', () => b.classList.toggle('tip', false));
  return b;
}

// A guest profile lives in this browser's storage only: where that storage is likely to go, a short note — only for
// someone who has published (a remembered alias or a session), never before. Standalone (home screen) apps and ordinary
// browsers get none. `persistent`: identity()'s storage probe (false = storage blocked, e.g. some private modes).
const IN_APP = /\b(Instagram|FBAN|FBAV|FB_IAB|FBIOS|Messenger|WhatsApp|TikTok|musical_ly|BytedanceWebview|Snapchat|Line\/|LinkedInApp|Pinterest|Twitter)\b/i;
export function deviceRisk({ ua = '', standalone = false, touch = 0, persistent = true } = {}) {
  if (standalone) return null;
  if (!persistent) return 'private';
  if (IN_APP.test(ua)) return 'inapp';
  if (/Safari\//.test(ua) && /Version\//.test(ua) && !/Chrome|Chromium|CriOS|FxiOS|EdgiOS|EdgA?\/|OPR|OPiOS|Android/.test(ua))
    return /iPhone|iPad|iPod/.test(ua) || touch > 1 ? 'ios' : 'safari'; // iPadOS says «Macintosh»: its touch points tell
  return null;
}
const ONLY_HERE = 'Aquest perfil només viu en aquest navegador.';
export const DEVICE_NOTES = Object.freeze({
  ios: `${ONLY_HERE} Safari l’esborra si passes 7 dies sense jugar: afegeix el joc a la pantalla d’inici.`,
  safari: `${ONLY_HERE} Safari l’esborra si passes 7 dies sense jugar.`,
  inapp: `${ONLY_HERE} Dins d’una app es perd fàcilment: juga des del navegador.`,
  private: `${ONLY_HERE} Com que no desa dades, es perdrà en tancar la pàgina.`,
});
export const browserEnv = () => {
  const nav = globalThis.navigator ?? {};
  let standalone = nav.standalone === true;
  try { standalone ||= Boolean(globalThis.matchMedia?.('(display-mode: standalone)').matches); } catch { /* no media queries */ }
  return { ua: String(nav.userAgent || ''), standalone, touch: Number(nav.maxTouchPoints) || 0 };
};
