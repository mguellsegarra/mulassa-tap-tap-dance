// The level the player picked on the home (rules.js: 0 Fàcil, 1 Normal, 2 Difícil), kept on this device for the next visit.
import { store } from '../../../platform/storage.js';

const KEY = 'pop-level';
export const level = () => { const l = +store.get(KEY); return l === 1 || l === 2 ? l : 0; };
export const setLevel = l => store.set(KEY, String(l));
