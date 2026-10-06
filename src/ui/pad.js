// The touch pad: haptics and press feedback.
import { down } from '../game/state.js';
import { padEl } from '../hud/layout.js';

// Haptics: Android vibrates; iPhone (iOS 18+) gives a system tick when a native switch is toggled,
// so a hidden one is flicked from inside the tap. Only works during a real touch.
const hapticSwitch = (() => {
  const l = document.createElement('label'), i = document.createElement('input');
  i.type = 'checkbox'; i.setAttribute('switch', '');
  i.tabIndex = -1; i.setAttribute('aria-hidden', 'true');
  l.style.cssText = 'position:fixed;left:-100px;top:0;opacity:0;pointer-events:none';
  l.appendChild(i); document.body.appendChild(l);
  return l;
})();
export function haptic(kind) {
  if (navigator.vibrate) { navigator.vibrate({ tap: 8, hit: 15, miss: [45, 60, 45], big: [20, 40, 20, 40, 70] }[kind]); return; }
  hapticSwitch.click();
  if (kind === 'miss' || kind === 'big') setTimeout(() => hapticSwitch.click(), 100);
}
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
