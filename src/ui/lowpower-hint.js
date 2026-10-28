// Before a song: a steady ~30 Hz suggests battery saving, but can also be thermal throttling.
import { Q } from '../core/flags.js';

export function setupLowPowerHint({ focusIn, lowPower, restore, doc = document, params = Q }) {
  const $ = id => doc.getElementById(`lowpower-hint-${id}`), menu = $('menu');
  let pending = null;
  $('ok').addEventListener('click', () => {
    if (!pending) return;
    const start = pending; pending = null;
    menu.close(); start(); // keep audio startup inside the button's user gesture
  });
  for (const id of ['back', 'close']) $(id).addEventListener('click', () => menu.close());
  menu.addEventListener('close', () => {
    if (menu.open || !pending) return;
    pending = null; restore(); // Back, × and Escape leave the difficulty untouched
  });
  return {
    get isOpen() { return menu.open; },
    ask(start) {
      if (menu.open) return true;
      if (!(params.get('lowpower') === '1' || lowPower())) return false; // ?lowpower=1: dev-host preview only
      pending = start;
      menu.showModal(); focusIn(menu, 'lowpower-hint-ok');
      return true;
    },
  };
}
