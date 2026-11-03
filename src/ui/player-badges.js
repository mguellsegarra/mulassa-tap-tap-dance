// The badges a confirmed player can show instead of the blue check (set_profile_badge, 202611010001): the ids are the server's
// closed list, the art is here. An id this list does not know draws the check (a newer server, an older cached client).
import { badgeArtOf } from './badge-svg.js';
import { tr } from '../i18n/messages.js';
import { TOWNS } from '../game/figures.js';

const drawnBadge = (id, name) => ({ id, name, art: () => badgeArtOf(id) }); // the art: badge-svg.js
export const ASSOCIATION_BADGES = [drawnBadge('uaf', 'UAF'), drawnBadge('pessigolla', 'La Pessigolla')]; // i18n-ok: entity names are proper names
export const VALLS_BADGES = [drawnBadge('colla-vella', 'Colla Vella'), drawnBadge('colla-joves', 'Colla Joves'), drawnBadge('campanar-valls', tr('ui.badge.name.campanar'))]; // i18n-ok: the colles' names are proper names
export const FLAG_BADGES = [drawnBadge('senyera', tr('ui.badge.name.senyera')), drawnBadge('estelada-groga', tr('ui.badge.name.esteladaGroga')),
  drawnBadge('estelada-blava', tr('ui.badge.name.esteladaBlava')), drawnBadge('occitana', tr('ui.badge.name.occitana')),
  ...[['andorra', 'Andorra'], ['balears', 'Illes Balears'], ['mallorca', 'Mallorca'], ['menorca', 'Menorca'], ['eivissa', 'Eivissa'], // i18n-ok: proper names, as the towns
    ['formentera', 'Formentera'], ['alguer', 'L’Alguer']].map(([id, name]) => drawnBadge(id, name))]; // i18n-ok: proper names
export const TOWN_BADGES = TOWNS.map(t => drawnBadge(`town:${t.id}`, t.name));
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
