// The HUD canvas: its size and scale (K), the safe areas, resize, and the title buttons' hit rects.
import { hudBudget, hudScale, renderDpr } from '../platform/render-quality.js';
import * as THREE from 'three';
import { qualityLevel, renderer, renderProfile, camera } from '../scene/stage.js';
import { COARSE } from '../core/env.js';

// ------------------------------------------------------------------ HUD
// All HUD drawing happens in "logical" units: 1 unit = K css px (2 on desktop, 1.5 on phones).
export const hud = document.getElementById('hud');
export const H = hud.getContext('2d');
export let W = 0, HH = 0, K = 2, PXU = 2; // PXU: device pixels per HUD unit (K * the HUD's pixel ratio), for snapping crisp edges
export let sizedW = 0, sizedH = 0, sizedDpr = 0, padTop = null; // what the canvases were sized for; the pad's top (css px), measured lazily
export const setPadTop = v => (padTop = v);
const HUD_BUDGET = () => hudBudget(qualityLevel, COARSE.matches); // HUD backing-store pixels (hudScale; less at low/minimal)
export const SAFE = { t: 0, r: 0, l: 0, b: 0 }; // safe-area insets in css px (notch), read from the --sa* vars in index.html
// The HUD's scale K. Phones 1.5. Tablets: in proportion to the screen, from a 1024x768 iPad (2) up to a 12.9" iPad Pro (~2.7), capped at 2.9: their css
// pixels follow the glass. Desktops: css pixels do NOT follow the glass (a bigger monitor just shows more of them), so it barely grows: 2 up to 800 px of
// height, +1 per 600 px, never past 2.9 (2.5 read as too small on a 27" display at 1440p, unbounded proportion as giant).
function uiScale(m, coarse) {
  if (m < 520) return 1.5;
  return coarse ? Math.max(2, Math.min(2.9, 2 * m / 768)) : Math.max(2, Math.min(2.9, 2 + (m - 800) / 600));
}
export function resize() {
  try {
    const st = getComputedStyle(document.documentElement);
    SAFE.t = parseFloat(st.getPropertyValue('--sat')) || 0; SAFE.r = parseFloat(st.getPropertyValue('--sar')) || 0; SAFE.l = parseFloat(st.getPropertyValue('--sal')) || 0; SAFE.b = parseFloat(st.getPropertyValue('--sab')) || 0;
  } catch { /* no CSS (tests): no insets */ }
  const cw = innerWidth, ch = appHeight();
  try { // canvases and pad follow the real screen height (see appHeight)
    document.documentElement.style.setProperty('--app-h', `${ch}px`);
    document.documentElement.style.setProperty('--app-gap', `${innerHeight - ch}px`);
  } catch { /* no DOM styles (tests) */ }
  const small = Math.min(cw, ch) < 520;
  const DPR = hudScale(cw, ch, devicePixelRatio, HUD_BUDGET()); // crisp text, within a pixel budget (render-quality.js)
  sizedW = cw; sizedH = ch; sizedDpr = devicePixelRatio; padTop = null;
  K = uiScale(Math.min(cw, ch), COARSE.matches); // the HUD's scale (css px per HUD unit)
  try { document.documentElement.style.setProperty('--ui', K / 2); } catch { /* no DOM styles (tests) */ } // the pad follows (index.html)
  renderer.setPixelRatio(renderDpr(renderProfile, cw, ch, devicePixelRatio));
  renderer.setSize(cw, ch, false);
  camera.aspect = cw / ch;
  hud.width = Math.ceil(cw * DPR);
  hud.height = Math.ceil(ch * DPR);
  H.setTransform(K * DPR, 0, 0, K * DPR, 0, 0);
  PXU = K * DPR;
  W = cw / K; HH = ch / K;
  camera.fov = baseFov(); camera.updateProjectionMatrix(); // (after HH: the lens depends on it; framePlayCamera sets its own each frame)
}
// iOS home-screen app with a translucent status bar (icons added before the bar went opaque): innerHeight (and 100vh/dvh) can come
// out one status bar short, leaving an empty band at the bottom. There is no browser chrome there, so the screen height is exact.
// With the opaque bar the page starts below it (no top inset) and innerHeight already is the visible height: never taller.
const IOS = /iPhone|iPod|iPad/.test(navigator.userAgent ?? '') || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const STANDALONE = navigator.standalone === true;
export function appHeight() {
  if (!(IOS && STANDALONE) || !screen?.height || !SAFE.t) return innerHeight;
  const portrait = innerHeight >= innerWidth, long = Math.max(screen.width, screen.height), short = Math.min(screen.width, screen.height);
  return Math.max(innerHeight, portrait ? long : short);
}
addEventListener('resize', resize);
// Safari (iPad especially) can come back from the share sheet / another tab with the page scrolled under its bars or the bars re-laid out
// without a resize event: drop any scroll and re-measure when the size really changed.
const settle = () => { if (globalThis.scrollX || globalThis.scrollY) scrollTo(0, 0); if (innerWidth !== sizedW || appHeight() !== sizedH) resize(); };
addEventListener('scroll', settle);
addEventListener('focus', settle);
document.addEventListener('visibilitychange', () => { if (!document.hidden) settle(); });
addEventListener('orientationchange', resize);
addEventListener('pageshow', () => requestAnimationFrame(resize)); // standalone launch: sizes can settle a frame late
try { visualViewport.addEventListener('resize', resize); visualViewport.addEventListener('scroll', settle); } catch { /* none */ }
resize();
requestAnimationFrame(() => requestAnimationFrame(resize));
const proj = new THREE.Vector3();
export function toScreen(v) { // world -> HUD units, null when behind the camera
  proj.copy(v).project(camera);
  if (proj.z > 1) return null;
  return [(proj.x * 0.5 + 0.5) * W, (-proj.y * 0.5 + 0.5) * HH];
}
export let buttons = []; // title hit rects, in HUD units
export const setButtons = v => (buttons = v);
export const buttonAt = e => buttons.find(b => e.clientX / K >= b.x && e.clientX / K <= b.x + b.w && e.clientY / K >= b.y && e.clientY / K <= b.y + b.h);
export function baseFov() { return camera.aspect < 1 || HH < 280 ? 50 : 38; } // the title's lens (short windows need room without lifting the camera over the roofs)
