// A badge's art by its id, and the confirmed address's check: no names and no catalogue, so a mini-game's page can draw them
// (src/jocs/games/pop: its board) without the main game's i18n. player-badges.js names them; profile-notes.js places them.
import { escutSvg } from './escuts.js';
import { PESSIGOLLA_MARK } from './pessigolla-logo.js';
import { UAF_FLAME } from './uaf-logo.js';
import { BADGE_ART, campanarArt } from './badge-art.js';

// a scalloped seal, the shape people read as «verified»
export const CHECK_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path class="seal" d="M12 2.7Q17.1-.2 18.6 5.4Q24.2 6.9 21.3 12Q24.2 17.1 18.6 18.6Q17.1 24.2 12 21.3Q6.9 24.2 5.4 18.6Q-.2 17.1 2.7 12Q-.2 6.9 5.4 5.4Q6.9-.2 12 2.7z"/><path d="m7.8 12.2 2.9 2.9 5.6-5.9"/></svg>';
const UAF_BADGE_ART = UAF_FLAME.replace('<svg ', '<svg class="badge-flame" fill="#e73449" ');
// null: an id this page does not know (a newer server): the caller draws the check instead
export function badgeArtOf(id) {
  if (id === 'uaf') return UAF_BADGE_ART;
  if (id === 'pessigolla') return PESSIGOLLA_MARK;
  if (id === 'campanar-valls') return campanarArt();
  if (typeof id === 'string' && id.startsWith('town:')) return escutSvg(id.slice(5)) || null;
  return BADGE_ART[id] ?? null;
}
