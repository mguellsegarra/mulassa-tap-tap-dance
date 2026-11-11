// The badges a confirmed player can show instead of the blue check (set_profile_badge, 202611010001): the ids are the server's
// closed list, the art is here. An id this list does not know draws the check (a newer server, an older cached client).
import { badgeArtOf } from './badge-svg.js';
import { tr } from '../i18n/messages.js';
import { TOWNS } from '../game/figures.js';
import { badgeName } from './badge-names.js';

const drawnBadge = id => ({ id, name: badgeName(id, k => tr(`ui.badge.name.${k}`)), art: () => badgeArtOf(id) }); // the art: badge-svg.js
export const ASSOCIATION_BADGES = ['uaf', 'pessigolla'].map(drawnBadge);
export const VALLS_BADGES = ['colla-vella', 'colla-joves', 'campanar-valls'].map(drawnBadge);
export const FLAG_BADGES = ['senyera', 'estelada-groga', 'estelada-blava', 'occitana', 'andorra', 'balears', 'mallorca', 'menorca', 'eivissa', 'formentera', 'alguer'].map(drawnBadge);
export const TOWN_BADGES = TOWNS.map(t => drawnBadge(`town:${t.id}`));
const BADGE_BY_ID = new Map([...ASSOCIATION_BADGES, ...VALLS_BADGES, ...FLAG_BADGES, ...TOWN_BADGES].map(b => [b.id, b]));
export const badgeOf = id => BADGE_BY_ID.get(id) ?? null;

// The share card draws on a canvas: the art as a decoded image, ahead of the (synchronous) drawing. As an image the SVG sees no
// page CSS, so it says its own size and the jester's colour. null: no such badge, or it did not decode (the card draws the check).
const badgeImages = new Map();
export function badgeImage(id, ink = '#2a1a10') {
  const b = badgeOf(id);
  if (!b) return Promise.resolve(null);
  if (!badgeImages.has(id)) {
    const svg = b.art().replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" ').replace(/var\(--jester[^)]*\)/g, ink);
    const img = new globalThis.Image();
    img.src = `data:image/svg+xml,${encodeURIComponent(svg)}`;
    badgeImages.set(id, img.decode().then(() => img, () => { badgeImages.delete(id); return null; }));
  }
  return badgeImages.get(id);
}
