// A browser lets a page sound only after a tap or a key on it: fn runs on every one, so the first the browser counts unlocks
// the audio. iOS counts a touch's end as the tap, not its start.
export function onEveryGesture(fn) {
  for (const type of ['pointerdown', 'keydown', 'touchend']) addEventListener(type, fn, true);
}
