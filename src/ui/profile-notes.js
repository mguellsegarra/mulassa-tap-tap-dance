// How a player's name is shown, and what a guest profile is told (docs/rankings/strategy.md §6). A confirmed address earns
// the check (it means only that); a guest («Convidat», no confirmed address) shows the same plain name, quieter and without it.
// A guest idle for 30 days can lose the name to somebody else: its rows are then fainter still («released»), results kept.
import { tr } from '../i18n/messages.js';
import { badgeOf } from './player-badges.js';
import { CHECK_SVG } from './badge-svg.js';
export const VERIFIED = tr('ui.profile.verified');
export const GUEST = tr('ui.profile.guest');
export const GUEST_TEXT = tr('ui.profile.guestText');

// a scalloped seal, the shape people read as «verified»
export { CHECK_SVG } from './badge-svg.js';
// A plain mark (no tip, no help cursor; it sits inside the name's button, a tap opens the card);
// screen readers still hear «Correu confirmat»
export function checkBadge(doc, badgeId = null) {
  const b = doc.createElement('span'), badge = badgeOf(badgeId); // a chosen badge takes the check's place and keeps its meaning
  b.className = badge ? 'player-badge' : 'verified-check'; b.setAttribute('role', 'img');
  b.setAttribute('aria-label', badge ? tr('ui.badge.label', { status: VERIFIED, name: badge.name }) : VERIFIED);
  if (badge) b.title = badge.name; // what it is, on a hover
  b.innerHTML = badge ? badge.art() : CHECK_SVG;
  return b;
}
// A board, podium or hall item as the name helpers take it: public_id (the card's key) as publicId, released as a flag
export const playerOf = r => ({ alias: String(r.alias ?? ''), verified: r.verified === true, released: r.released === true, publicId: r.publicId ?? r.public_id ?? null, badgeId: r.badgeId ?? r.badge_id ?? null });
// A player's name into `into` (a .who row): the name, quieter for a guest and fainter when its profile was released (its name is somebody else's now), the
// check for a confirmed address. `p`: { alias, verified, released, publicId }. With `onOpen` the name is a button that opens the
// public card (src/ui/player-card.js); the check stays its own button beside it.
export function appendName(doc, into, p, onOpen = null) {
  const name = doc.createElement(onOpen ? 'button' : 'span');
  name.className = `player-name${p.verified === true ? '' : ' guest'}${p.released === true ? ' released' : ''}`;
  const alias = doc.createElement('span'); alias.className = 'alias'; alias.textContent = String(p.alias ?? ''); // text, never HTML
  name.appendChild(alias);
  if (onOpen) {
    name.type = 'button';
    name.setAttribute('aria-haspopup', 'dialog');
    name.addEventListener('click', e => { e.stopPropagation?.(); onOpen(p); });
  }
  into.appendChild(name);
  if (p.verified === true) into.appendChild(checkBadge(doc, p.badgeId));
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
