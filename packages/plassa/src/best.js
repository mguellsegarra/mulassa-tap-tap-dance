// A game's best score on this device, under the game's own storage key.
import { store } from './storage.js';

export function deviceBest(key) {
  const best = () => +store.get(key) || 0;
  // → whether it rose
  const raiseBest = score => {
    if (!(score > best())) return false;
    store.set(key, score);
    return true;
  };
  return { best, raiseBest };
}
