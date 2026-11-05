// The player's best score, kept on this device. The board's (ranking-ui.js) raises it: a best made on another device or
// browser under the same name is this player's too, so a run here is measured against it.
import { store } from '../../../platform/storage.js';

const BEST = 'pica-best'; // the game's first name: kept, so a best score survives the rename
export const best = () => +store.get(BEST) || 0;
// → whether it rose
export function raiseBest(score) {
  if (!(score > best())) return false;
  store.set(BEST, score);
  return true;
}
