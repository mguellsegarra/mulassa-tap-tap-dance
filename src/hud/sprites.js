// The HUD palette, fonts and the text sprite cache (each string is painted once and blitted after).
import { H } from './canvas.js';
import { onTheme } from '../game/figure-theme.js';

// Readable rounded bold font for everything (Taiko style); the pixel font only for the logo and big numbers
export const FONT = "'Baloo 2', system-ui, sans-serif", PIXEL = "'Jersey 10', monospace";
export const C = {
  cream: '#fff3d6', gold: '#f5c518', red: '#c0283c', dark: '#2a1a10', blue: '#6fa8ff', pink: '#ff8fb1', green: '#7ee081',
  gua: '#ff7a1a', guaLt: '#ffb56b', guaDk: '#b34d00', // GUA (left, don): orange
  pa: '#14b8a6', paLt: '#6ee7d8', paDk: '#0a6e63', // PA (right, ka): turquoise
};
export const DIRC = { L: C.gua, D: '#3aa35a', U: '#e8b423', R: C.pa, B: C.gold }; // B: GUAPA, both
export const DIRLT = { L: C.guaLt, R: C.paLt, B: '#fff27a' }, DIRDK = { L: C.guaDk, R: C.paDk, B: '#b38a00' }; // highlight / shade of each note colour
// The note colours follow the figure (in place: everyone holds these objects); text sprites are keyed by their colour
onTheme(t => { Object.assign(C, t.colors); DIRC.L = C.gua; DIRC.R = C.pa; DIRLT.L = C.guaLt; DIRLT.R = C.paLt; DIRDK.L = C.guaDk; DIRDK.R = C.paDk; });
// Sprites: outlined text is by far the HUD's biggest cost (every stroked glyph is a path, and pulsing sizes miss the
// glyph cache), and shadowBlur glows are a Gaussian blur per draw. So each string + style + size is painted once
// into a small canvas and blitted from then on (LRU, capped by pixels). No offscreen canvas (tests): drawn directly.
const sprites = new Map(), spare = [], SPRITE_PX = 6_000_000;
let spritePx = 0, spriteOk = true;
// Web fonts arrived: drop every cached sprite (painted with the fallback font) and re-measure the title.
export let titleL = null, titleKey = ''; // the title layout cache (titleLayoutNow): declared up here, the font loads below reset it
export const setTitleL = v => (titleL = v);
export const setTitleKey = v => (titleKey = v);
const fontsArrived = () => { sprites.forEach(s => spare.push(s.c)); sprites.clear(); spritePx = 0; titleKey = ''; };
try { document.fonts.addEventListener('loadingdone', fontsArrived); } catch { /* no font loading API */ } // Safari does not always fire it: the loads below repaint too
// canvas-only fonts are never fetched by themselves (no DOM text uses the pixel logo font), so ask for them explicitly;
// the page cover waits for them (at most 3 s), so the logo never shows in a fallback font
export let fontsReady = Promise.resolve();
try {
  fontsReady = Promise.race([
    Promise.all(["64px 'Jersey 10'", "800 64px 'Baloo 2'", "600 64px 'Baloo 2'"].map(f => document.fonts.load(f, 'MULASSA àç·').then(fontsArrived))),
    new Promise(r => setTimeout(r, 3000)),
  ]).catch(() => {});
} catch { /* no font API (tests) */ }
// A frame paints at most SPRITES_NEW new text sprites (budget = true); past that, text is drawn straight onto the HUD for
// that frame and gets its sprite a frame or two later (big words, budget = 'soft', are painted anyway: drawn straight
// at a changing size they would cost more). A new canvas painted with big stroked glyphs is costly on a phone's
// GPU, and screens that show many new words at once (the results: 16 in its first frame, 67 ms at 4x CPU on a desktop)
// were hitches. Spare frames paint the queued `warmups` (drawHud) ahead of when they're needed.
export const SPRITES_NEW = 3, warmups = [];
export let spriteBudget = SPRITES_NEW, warmT = -9;
export const setSpriteBudget = v => (spriteBudget = v);
export const setWarmT = v => (warmT = v);
// size() -> { w, h, ...kept }: w × h HUD units at u device px per unit (only asked on a miss); paint(ctx, s) draws in units
export function sprite(key, u, size, paint, budget = false) {
  let s = sprites.get(key);
  if (s) { sprites.delete(key); sprites.set(key, s); return s; } // most recently used goes last
  if (budget === true && spriteBudget <= 0) return null; // this frame has painted enough: the caller draws it directly
  if (budget) spriteBudget--;
  const c = spare.pop() ?? (spriteOk ? document.createElement('canvas') : null), x = c?.getContext?.('2d');
  if (!x) { spriteOk = false; return null; }
  s = size(x);
  c.width = Math.max(1, Math.ceil(s.w * u)); c.height = Math.max(1, Math.ceil(s.h * u)); // also resets the context
  x.setTransform(u, 0, 0, u, 0, 0);
  paint(x, s);
  Object.assign(s, { c, w: c.width / u, h: c.height / u, px: c.width * c.height });
  sprites.set(key, s);
  for (spritePx += s.px; spritePx > SPRITE_PX && sprites.size > 1;) { // evict the least recently used
    const [k, old] = sprites.entries().next().value;
    sprites.delete(k); spritePx -= old.px; spare.length < 8 && spare.push(old.c);
  }
  return s;
}
export const devScale = () => { const m = spriteOk && H.getTransform?.(); return m ? Math.hypot(m.a, m.b) : 0; }; // device px per unit here
export const qSize = dev => 2 ** (Math.round(Math.log2(dev) * 24) / 24); // 1/24-octave steps: a pulse or pop reuses a few sprites
