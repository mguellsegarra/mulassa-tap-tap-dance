// The showreel's cuts as dissolves (the hard cuts read as abrupt): at a cut the
// outgoing shot is copied onto #reel-fade (over the plaça, under the HUD) and fades out over the new shot. It stays live: each
// frame of the fade renders the dance again from the outgoing camera (a frozen frame over a figure still
// turning read as two of her, one stopped). One extra render every other frame for REEL_FADE_MS, at every cut (about every two bars):
// every frame, a Galaxy S10 at medium dropped ~10% of a fade's frames (3% between them); every other, about a third fewer (a
// frozen copy: ~4%, but read as two of her). The fade's opacity runs on the compositor.
const reelFadeEl = document.getElementById('reel-fade'), reelFadeCtx = reelFadeEl.getContext('2d');
export const REEL_FADE_MS = 500; // (0.9 s felt slow)
let reelFadeAnim = null, reelFadeCam = null, reelFadeEnd = 0, reelFadeN = 0;

// src: the WebGL canvas, read in the same task as its render (no preserveDrawingBuffer); w, h: css px; cam: the outgoing
// shot's camera (kept as it is, still: the shots are nearly held)
export function reelDissolve(src, w, h, cam) {
  w = Math.round(w); h = Math.round(h);
  if (reelFadeEl.width !== w || reelFadeEl.height !== h) { reelFadeEl.width = w; reelFadeEl.height = h; }
  reelFadeCtx.drawImage(src, 0, 0, w, h);
  reelFadeCam = (reelFadeCam ??= cam.clone()).copy(cam); reelFadeEnd = performance.now() + REEL_FADE_MS; reelFadeN = 0;
  reelFadeAnim?.cancel();
  reelFadeAnim = reelFadeEl.animate?.([{ opacity: 1 }, { opacity: 0 }], { duration: REEL_FADE_MS, easing: 'ease-in-out', fill: 'forwards' });
}
// Every frame, before the plaça's own render: while a dissolve runs, `render(cam)` draws the outgoing shot live every other frame
// (not on the cut's own frame: reelDissolve copied it then) and it is copied over
export function reelFadeLive(render, src) {
  if (!reelFadeCam || performance.now() > reelFadeEnd) return;
  if (reelFadeN++ % 2 === 0) return;
  render(reelFadeCam);
  reelFadeCtx.drawImage(src, 0, 0, reelFadeEl.width, reelFadeEl.height);
}
