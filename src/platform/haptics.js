// Haptics, shared by the game's pad and the mini-games. Android vibrates; iPhone (iOS 18+) gives a system tick when a
// native switch is toggled, so a hidden one is flicked from inside the tap. Only works during a real touch.
const HAPTICS = { tap: 8, hit: 15, miss: [45, 60, 45], big: [20, 40, 20, 40, 70], boom: [90, 40, 60, 40, 50, 40, 160] };
const IOS_TICKS = { miss: 2, big: 2, boom: 4 }; // the switch has one strength: a pattern is a few ticks, 100 ms apart
const hapticSwitch = (() => {
  const l = document.createElement('label'), i = document.createElement('input');
  i.type = 'checkbox'; i.setAttribute('switch', '');
  i.tabIndex = -1; i.setAttribute('aria-hidden', 'true');
  l.style.cssText = 'position:fixed;left:-100px;top:0;opacity:0;pointer-events:none';
  l.appendChild(i); document.body.appendChild(l);
  return l;
})();
export function haptic(kind) {
  if (navigator.vibrate) { navigator.vibrate(HAPTICS[kind]); return; }
  hapticSwitch.click();
  for (let k = 1; k < (IOS_TICKS[kind] || 1); k++) setTimeout(() => hapticSwitch.click(), k * 100);
}
