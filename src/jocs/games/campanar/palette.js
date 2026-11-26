// The slabs' colours in play, before they turn to stone: the Plaça del Blat's warm palette, a step each floor.
import { Color } from 'three';

// terracotta, apricot, butter, leaf, teal, rose and round again: 8 floors from one to the next
const STOPS = ['#ef7f4c', '#f4a95a', '#f5d36e', '#a8d277', '#62c2b1', '#ee8f86'].map(c => new Color(c));
const EACH = 8;
export function colorOf(n) {
  const t = n / EACH, i = Math.floor(t) % STOPS.length;
  return STOPS[i].clone().lerp(STOPS[(i + 1) % STOPS.length], t - Math.floor(t));
}
