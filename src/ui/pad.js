// The touch pad: press feedback (its haptics are platform/haptics.js).
import { down } from '../game/state.js';
import { padEl } from '../hud/layout.js';
import './figure-theme-dom.js';

export const padButtons = [...document.querySelectorAll('#pad button')];
// Pad look: pressed while a finger holds it, a ripple from the touch point, both together = GUAPA flash
// Cheap presses: no nodes created, no layout forced; every change is a class or `translate` that the compositor animates.
const padHeld = new Set();
export function syncPad() {
  padHeld.clear(); for (const d of down.ptr.values()) padHeld.add(d);
  for (const b of padButtons) b.classList.toggle('down', padHeld.has(b.dataset.d));
  return padHeld;
}
const ripples = new Map(padButtons.map(b => [b, { k: 0, els: [0, 1, 2].map(() => b.appendChild(Object.assign(document.createElement('span'), { className: 'ripple' }))) }]));
let flashB = false;
export function padFeedback(b, e) {
  const x = e.offsetX, y = e.offsetY; // read before any class change (offsets want a clean layout), and no getBoundingClientRect
  const pad = syncPad(), pool = ripples.get(b), r = pool.els[pool.k = (pool.k + 1) % pool.els.length]; // three ripples per button, reused in turn
  r.style.translate = `${x}px ${y}px`;
  r.className = r.className === 'ripple ra' ? 'ripple rb' : 'ripple ra'; // a new animation name restarts it
  if (pad.has('L') && pad.has('R')) { flashB = !flashB; padEl.classList.remove(flashB ? 'both-a' : 'both-b'); padEl.classList.add(flashB ? 'both-b' : 'both-a'); } // restart the flash: no reflow
}
