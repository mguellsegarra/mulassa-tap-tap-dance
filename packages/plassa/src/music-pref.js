// Plassa's one music switch (packages/plassa/docs/inventari.md, decision 4): the same saved preference on the selector and in every
// game, so muting in one place mutes everywhere. Its key is mulassa.cat's own (game/state.js `menu-music`), so the main
// game already follows it before it moves onto Plassa.
import { store } from './storage.js';

const KEY = 'menu-music';
export const musicPref = {
  get: () => store.get(KEY) !== 'off',
  set: on => store.set(KEY, on ? 'on' : 'off'),
  // a game's own key from before: its choice carries over once when Plassa has none yet, then the old key goes
  adopt(old) {
    const v = store.get(old);
    if (v == null) return;
    if (store.get(KEY) == null) store.set(KEY, v);
    store.remove(old);
  },
};
