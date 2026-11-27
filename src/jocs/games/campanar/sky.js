// The sky behind Tower and the end's camera, set per kind of device (carena.json, tuned with
// tools/jocs/campanar-carena/): a portrait phone, a landscape tablet, a desktop window, each over the settings «tots».
// Each has its own mountains (public/jocs/campanar/carena-<device>.svg, baked from Valls's real skyline), their place
// and size, and how low and through how long a lens the end's camera looks at the whole campanar. #sky holds the dusk
// sky and the hills; the clouds and the stars are three.js (clouds-astra.js, stars-fable.js). The climb only translates
// it; the mountains go the whole round, and turning the end's camera pans them (a repaint of the hills while it turns).
import CARENA_BY_DEVICE from './carena.json';

export const SKY_DEVICES = { mobil: '(orientation: portrait)', tauleta: '(orientation: landscape) and (max-width: 1199px)', escriptori: 'all' };
export const skyDevice = () => Object.keys(SKY_DEVICES).find(k => matchMedia(SKY_DEVICES[k]).matches);
const settingsOf = d => ({ ...CARENA_BY_DEVICE.tots, ...CARENA_BY_DEVICE[d] }); // a device's own values over the common ones
let current = null; // this device's settings (or, dev, the tuner's): read every frame, so kept, not rebuilt
export const skySettings = () => (current ??= settingsOf(skyDevice()));

// the hills' layer for settings o (svgUrl: its mountains, the whole round from the tuned view's left edge): the mountains
// at o.raise over the bottom, the tuned span across max(100vw, o.width vw) and centred (in vw: a background's % would
// be of the room left beside the image), the rest of the round on either side, shifted by --pan (the end's turn,
// skyPan); the ground's colour under them (the sky's slide shows that strip; on top, 2 px into the SVG, so its soft
// bottom edge shows no seam); the SVG's empty pad under its foot sunk below raise, under that strip
export const skyBackground = (o, svgUrl) => `linear-gradient(${o.groundColor}, ${o.groundColor}) bottom / 100% calc(${o.raise}dvh + 2px) no-repeat, ` +
  `url(${svgUrl}) left calc(50vw - max(50vw, ${o.width / 2}vw) + var(--pan, 0px)) bottom calc(${o.raise}dvh - max(100vw, ${o.width}vw) * ${(o.pad ?? 0) / o.span}) / calc(max(100%, ${o.width}vw) * ${360 / o.span}) auto repeat-x`;
// px the round moves for the camera turned by spin (rad): as far as the mountains it shows turn (left turn, they go right)
export function skyPan(spin) {
  const o = skySettings();
  return spin * 180 / Math.PI * Math.max(innerWidth, innerWidth * o.width / 100) / o.span;
}

let layers = null; // { el, hills } once built
let shown = -1, panned = 0; // the slide and the pan the last frame set: no style write when nothing changed
function build(el, o, hillsUrl) {
  el.replaceChildren();
  const hills = document.createElement('div');
  hills.className = 'sky-hills';
  hills.style.filter = 'brightness(0.62) saturate(0.85)'; // a night's hills under the stars (stars-fable.js); static: painted once
  hills.style.background = skyBackground(o, hillsUrl);
  el.append(hills);
  layers = { el, hills };
  shown = -1; panned = 0;
}

// build #sky for this device, and again whenever the device kind changes (a window resized past a breakpoint)
export function paintSky(el) {
  const paint = () => { const d = skyDevice(); build(el, current = settingsOf(d), `/jocs/campanar/carena-${d}.svg`); };
  for (const q of Object.values(SKY_DEVICES)) matchMedia(q).addEventListener('change', paint);
  paint();
}
// dev only (the tuner): this page's settings and mountains, live
export function tuneSky(el, o, hillsUrl) { current = o; build(el, o, hillsUrl); }

// each frame, the tower's climb (world units): the whole sky slides a little (the ridge stays under a tall campanar);
// pan: the round's shift for the end's turn (skyPan), in px
export function climbSky(climb, pan = 0) {
  if (!layers) return;
  const slide = Math.round(Math.min(climb * 9, innerHeight * 0.08));
  if (slide !== shown) { layers.el.style.translate = `0 ${slide}px`; shown = slide; }
  const p = Math.round(pan * 2) / 2;
  if (p !== panned) { layers.hills.style.setProperty('--pan', `${p}px`); panned = p; }
}
