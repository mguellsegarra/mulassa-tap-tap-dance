// The sky behind Tower and the end's camera, set per kind of device (carena.json, tuned with
// tools/jocs/campanar-carena/): a portrait phone, a landscape tablet, a desktop window, each over the settings «tots».
// Each has its own mountains (public/jocs/campanar/carena-<device>.svg, baked from Valls's real skyline), their place
// and size, and how low and through how long a lens the end's camera looks at the whole campanar. #sky holds the dusk
// sky and the hills; the clouds and the stars are three.js (clouds-astra.js, stars-fable.js). Only translate moves.
import CARENA_BY_DEVICE from './carena.json';

export const SKY_DEVICES = { mobil: '(orientation: portrait)', tauleta: '(orientation: landscape) and (max-width: 1199px)', escriptori: 'all' };
export const skyDevice = () => Object.keys(SKY_DEVICES).find(k => matchMedia(SKY_DEVICES[k]).matches);
const settingsOf = d => ({ ...CARENA_BY_DEVICE.tots, ...CARENA_BY_DEVICE[d] }); // a device's own values over the common ones
let tuned = null; // dev: the tuner's settings for this device, over carena.json
export const skySettings = () => tuned ?? settingsOf(skyDevice());

// the hills' layer for settings o (svgUrl: its mountains): the mountains at o.raise over the bottom, the ground's colour
// under them (the sky's slide shows that strip; on top, 2 px into the SVG, so its soft bottom edge shows no seam)
export const skyBackground = (o, svgUrl) => `linear-gradient(${o.groundColor}, ${o.groundColor}) bottom / 100% calc(${o.raise}dvh + 2px) no-repeat, ` +
  `url(${svgUrl}) center bottom ${o.raise}dvh / max(100%, ${o.width}vw) auto no-repeat`;

let layers = null; // { el, hills } once built
let shown = -1; // the slide the last frame set: no style write when nothing changed
function build(el, o, hillsUrl) {
  el.replaceChildren();
  const hills = document.createElement('div');
  hills.className = 'sky-hills';
  hills.style.filter = 'brightness(0.62) saturate(0.85)'; // a night's hills under the stars (stars-fable.js); static: painted once
  hills.style.background = skyBackground(o, hillsUrl);
  el.append(hills);
  layers = { el, hills };
  shown = -1;
}

// build #sky for this device, and again whenever the device kind changes (a window resized past a breakpoint)
export function paintSky(el) {
  const paint = () => { const d = skyDevice(); build(el, settingsOf(d), `/jocs/campanar/carena-${d}.svg`); };
  for (const q of Object.values(SKY_DEVICES)) matchMedia(q).addEventListener('change', paint);
  paint();
}
// dev only (the tuner): this page's settings and mountains, live
export function tuneSky(el, o, hillsUrl) { tuned = o; build(el, o, hillsUrl); }

// each frame, the tower's climb (world units): the whole sky slides a little (the ridge stays under a tall campanar)
export function climbSky(climb) {
  if (!layers) return;
  const slide = Math.round(Math.min(climb * 9, innerHeight * 0.08));
  if (slide !== shown) { layers.el.style.translate = `0 ${slide}px`; shown = slide; }
}
