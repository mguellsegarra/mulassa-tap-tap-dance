// How a player's name is shown, and what a guest profile is told (docs/rankings/strategy.md §6). A confirmed address earns
// the check (it means only that) and a clean name; a guest («Convidat», no confirmed address) keeps the name it chose plus
// four digits («Timbaler#3821»), drawn quieter and without the check. Guests don't expire: they live in this browser.
import { tr } from '../i18n/messages.js';
export const VERIFIED = tr('ui.profile.verified');
export const GUEST = tr('ui.profile.guest');
export const GUEST_TEXT = tr('ui.profile.guestText');
export const GUEST_ROW = tr('ui.profile.guestRow'); // under a guest's own row on the board

// a scalloped seal, the shape people read as «verified»
const CHECK_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path class="seal" d="M12 2.7Q17.1-.2 18.6 5.4Q24.2 6.9 21.3 12Q24.2 17.1 18.6 18.6Q17.1 24.2 12 21.3Q6.9 24.2 5.4 18.6Q-.2 17.1 2.7 12Q-.2 6.9 5.4 5.4Q6.9-.2 12 2.7z"/><path d="m7.8 12.2 2.9 2.9 5.6-5.9"/></svg>';
// A plain mark (no tip, no help cursor; it sits inside the name's button, a tap opens the card);
// screen readers still hear «Correu confirmat»
export function checkBadge(doc) {
  const b = doc.createElement('span');
  b.className = 'verified-check'; b.setAttribute('role', 'img'); b.setAttribute('aria-label', VERIFIED);
  b.innerHTML = CHECK_SVG;
  return b;
}
// A player's name into `into` (a .who row): the name, its «#1234» for a guest (index.html .guest: quieter), the check for a
// confirmed address. `p`: { alias (never with the tag), tag (null: a clean name), verified }. With `onOpen` the name is a
// button that opens the public card (src/ui/player-card.js); the check stays its own button beside it.
export function appendName(doc, into, p, onOpen = null) {
  const guest = Number.isInteger(p.tag);
  const name = doc.createElement(onOpen ? 'button' : 'span');
  name.className = `player-name${guest ? ' guest' : ''}`;
  const alias = doc.createElement('span'); alias.className = 'alias'; alias.textContent = String(p.alias ?? ''); // text, never HTML
  name.appendChild(alias);
  if (guest) { const t = doc.createElement('span'); t.className = 'tag'; t.textContent = `#${String(p.tag).padStart(4, '0')}`; name.appendChild(t); }
  if (onOpen) {
    name.type = 'button';
    name.setAttribute('aria-haspopup', 'dialog');
    name.addEventListener('click', e => { e.stopPropagation?.(); onOpen(p); });
  }
  into.appendChild(name);
  if (p.verified === true) into.appendChild(checkBadge(doc));
  return name;
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
// Safari clears a site's storage after some days without a visit (its own rule, not the game's)
export const DEVICE_NOTES = Object.freeze({
  ios: tr('ui.profile.device.ios'),
  safari: tr('ui.profile.device.safari'),
  inapp: tr('ui.profile.device.inapp'),
  private: tr('ui.profile.device.private'),
});
export const browserEnv = () => {
  const nav = globalThis.navigator ?? {};
  let standalone = nav.standalone === true;
  try { standalone ||= Boolean(globalThis.matchMedia?.('(display-mode: standalone)').matches); } catch { /* no media queries */ }
  return { ua: String(nav.userAgent || ''), standalone, touch: Number(nav.maxTouchPoints) || 0 };
};
