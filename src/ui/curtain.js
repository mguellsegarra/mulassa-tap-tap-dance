// A short dark curtain over free play's way in and out. The switch (styles, layout, the first paint of its controls)
// and a fullscreen change (the OS animation, the canvases' new size) stall the page for a few frames: under the curtain
// they are not seen. It lifts once frames run smooth again, so the plaza fades back in already moving at its pace.
const curtainEl = document.createElement('div');
curtainEl.id = 'curtain';
curtainEl.setAttribute('aria-hidden', 'true');
document.body.append(curtainEl);
const CURTAIN_IN_MS = 90, CURTAIN_MIN_MS = 150, CURTAIN_MAX_MS = 1500, SMOOTH_MS = 25, SMOOTH_FRAMES = 3;
const calm = matchMedia('(prefers-reduced-motion: reduce)');
let curtainToken = 0;

// Lower it, then run the switch once it covers (inside the click's activation window: fullscreen may still be asked).
export function curtain(swap) {
  curtainEl.classList.remove('now'); curtainEl.classList.add('down');
  setTimeout(() => { swap(); liftWhenSmooth(); }, calm.matches ? 0 : CURTAIN_IN_MS);
}
// A change nobody asked for here (Escape out of fullscreen, a back gesture): cover at once, lift when it settles.
export function curtainCover() {
  curtainEl.classList.add('down', 'now');
  liftWhenSmooth();
}
function liftWhenSmooth() {
  const t = ++curtainToken, start = performance.now();
  let prev = start, smooth = 0;
  const step = now => {
    if (t !== curtainToken) return; // a later switch owns the curtain
    smooth = now - prev < SMOOTH_MS ? smooth + 1 : 0; prev = now;
    if ((now - start > CURTAIN_MIN_MS && smooth >= SMOOTH_FRAMES) || now - start > CURTAIN_MAX_MS) curtainEl.classList.remove('down', 'now');
    else requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
