// Big words and praise (headline, bigWord) and the slot that dodges the balloon.
import { tr } from '../i18n/messages.js';
import { C, devScale, qSize, FONT, sprite } from './sprites.js';
import { W, H } from './canvas.js';
import { G, clock, BALLOON_DROP, balloonShown, songTime } from '../game/state.js';
import { lane, HEADLINE_SIZE, PRAISE_CENTRED, PRAISE_Y } from './layout.js';
import { textWidth } from './primitives.js';
const MASH_TAIL = tr('hud.lane.mash2'); // the second line of the GLOBUS «PICA RÀPID!» label, for dodgeBalloon's width

// combo -> [word, tier]: like Candy Crush's "Sweet! Tasty! Divine!", each step louder
export const PRAISE = Object.fromEntries([[10, 0], [20, 1], [30, 1], [40, 2], [50, 2], [60, 2], [75, 3], [100, 3]].map(([combo, tier]) => [combo, [tr('hud.praise.c' + combo), tier]]));
const PRAISE_COL = { 0: [C.gold, '#ff9f1c'], 1: ['#7ee0ff', '#3f6fe0'], 2: ['#ffb3d9', '#e0457b'], 3: ['#fff27a', '#ff5ea8'], bad: ['#b6ff3b', '#7a2fb8'], bonk: ['#ffd27a', '#e0452b'] }; // bad = poison green to purple; bonk (PATAPAM!) = bruise orange to red
// base: the size it settles at (a sprite is painted at it once; pops and count-ins scale that image). The word is
// blitted as one image, so fading it never lets the dark rim show through the letters.
export function bigWord(word, x, y, size, cols, rot = 0, maxW = W - 12, base = size) {
  const k = devScale(), bq = k && qSize(base * k) / k, font = `800 ${bq}px ${FONT}`, key = `${word}|${font}|${k}`;
  const dims = c => { c.font = font; const w = c.measureText(word).width + bq * 0.6; return { ww: w, w: w + bq, h: bq * 2.2 }; };
  // The outline (two wide round-joined strokes) is what costs: 15-30 ms of main thread for one big word on a desktop,
  // several times that on a phone. It is painted once per word and size (the rim sprite) and every colouring copies it
  // and adds only its fill: the rainbow chant's 18 hues a word were 18 outlines each.
  const sp = k && sprite(`${key}|${cols[0]}|${cols[1]}`, k, dims, (c, d) => {
    const rim = sprite(`${key}|rim`, k, dims, (r, e) => { r.font = font; paintWord(r, word, e.w / 2, e.h / 2, bq, cols, 0, 1, 'rim'); });
    c.font = font;
    if (rim) { c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.drawImage(rim.c, 0, 0); c.restore(); } // same pixel size: an exact copy
    paintWord(c, word, d.w / 2, d.h / 2, bq, cols, 0, 1, rim ? 'fill' : 'all');
  }, 'soft');
  if (!sp) { // no sprites (tests): paint it straight
    H.font = `800 ${size}px ${FONT}`;
    const w = H.measureText(word).width + size * 0.6, fit = Math.min(1, maxW / w);
    return paintWord(H, word, Math.max(w * fit / 2 + 4, Math.min(W - w * fit / 2 - 4, x)), y, size, cols, rot, fit);
  }
  const r = size / bq, fit = Math.min(1, maxW / (sp.ww * r)), sc = r * fit; // long phrases shrink to fit
  x = Math.max(sp.ww * sc / 2 + 4, Math.min(W - sp.ww * sc / 2 - 4, x)); // anchored off-centre (the ring on phones) but always on screen
  H.save(); H.translate(x, y); H.rotate(rot);
  H.drawImage(sp.c, -sp.w * sc / 2, -sp.h * sc / 2, sp.w * sc, sp.h * sc);
  H.restore();
}
function paintWord(c, word, x, y, size, cols, rot, fit, part = 'all') { // part: 'rim' (the outline), 'fill' or 'all'
  c.save();
  c.translate(x, y); c.rotate(rot);
  c.scale(fit, fit);
  c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round';
  if (part !== 'fill') {
    c.lineWidth = size / 3.2; c.strokeStyle = C.dark; c.strokeText(word, 0, size * 0.08);
    c.lineWidth = size / 7; c.strokeStyle = '#fff'; c.strokeText(word, 0, size * 0.08);
  }
  if (part !== 'rim') {
    const g = c.createLinearGradient(0, -size / 2, 0, size / 2);
    g.addColorStop(0, cols[0]); g.addColorStop(1, cols[1]);
    c.fillStyle = g; c.fillText(word, 0, size * 0.08);
  }
  c.restore();
}
export const elastic = k => (k >= 1 ? 1 : k * (1 + Math.sin(k * Math.PI * 2.5) * (1 - k) * 0.6));
// One practice/post-song word at a time: completion outranks specials, specials outrank combo praise.
// Lower priorities are dropped, never queued (they would arrive late and off the beat).
// big: a celebration (the post-song chant, the practice's combo praise and A BALLAR!); the practice's other words
// are compact, in the judge slot under the ring.
export function headline(word, tier, pri, dur = 1.4, seed = Math.random(), big = !G.practice) {
  const cur = G.praise;
  if (cur && clock - cur.t0 < cur.dur && cur.pri > pri) return false;
  G.praise = { word, tier, pri, dur, t0: clock, seed, big };
  return true;
}
// A GLOBUS hangs from the ring right through the slots under the lane (the compact one, and the big words' on
// landscape phones and desktops): the word steps beside it (right, else left) or, with no room there, under it.
// Centred big words (portrait, tablets) are already clear. Sticky for the word's life so it never jumps back.
function dodgeBalloon(p, lvl) {
  const big = p.big ?? !G.practice, { hx, bottom, s } = lane(), S = HEADLINE_SIZE(big) * (1 + lvl * 0.08) * 1.15; // its biggest size (elastic pop)
  if (PRAISE_CENTRED(big)) return;
  H.font = `800 ${S}px ${FONT}`;
  const hw = (H.measureText(p.word).width + S * 0.6) / 2, bw = 31 * s, room = hw + bw + 6, py = PRAISE_Y(big);
  if (py - S * 0.6 > bottom + BALLOON_DROP * s || Math.abs(p.dx || 0) >= room) return; // clear already
  // beside it are its labels (the counter, PICA RÀPID!), stacked lower when there's no room left of the ring
  const labels = bottom + (hx / s - 34 > textWidth(MASH_TAIL, 9) + 2 ? 31 : 46) * s, under = py - S * 0.6 >= labels;
  if (under && hx + room + hw <= W - 4) p.dx = room;
  else if (under && hx - room - hw >= 4) p.dx = -room;
  else p.dy = Math.max(p.dy || 0, bottom + BALLOON_DROP * s + S * 0.6 + 2 - py);
}
export function drawPraise() {
  const p = G.praise;
  if (!p) return;
  const age = clock - p.t0, k = age / p.dur;
  if (k > 1) { G.praise = null; return; }
  // elastic pop in, hold, then drift down (away from the lane) and fade
  const pin = Math.min(1, age / 0.25), el = 1 + Math.sin(pin * Math.PI * 2.5) * (1 - pin) * 0.6;
  const lvl = p.tier === 'rainbow' ? 3 : p.tier === 'bad' || p.tier === 'bonk' ? 1 : p.tier;
  const hue = Math.round(clock * 25) * 20; // rainbow in 20° steps: 18 cached sprites instead of a new one every frame
  const cols = p.tier === 'rainbow' ? [`hsl(${hue % 360},95%,65%)`, `hsl(${(hue + 150) % 360},95%,55%)`] : PRAISE_COL[p.tier] ?? PRAISE_COL[0];
  const sc = (age < 0.25 ? pin : 1) * el * (1 + lvl * 0.08), fade = k > 0.75 ? (1 - k) / 0.25 : 1;
  if (balloonShown(songTime())) dodgeBalloon(p, lvl);
  const big = p.big ?? !G.practice, x = (PRAISE_CENTRED(big) ? W / 2 : lane().hx) + (p.dx || 0);
  const y = PRAISE_Y(big) + (p.dy || 0) + (k > 0.75 ? (k - 0.75) * 16 : 0), size = HEADLINE_SIZE(big) * sc;
  // one centre for the word and its sparkles (the word is kept on screen); a long phrase on a wide screen is kept
  // off the edges and barely tilted, or it reads crooked
  H.font = `800 ${size}px ${FONT}`;
  const maxW = W < 600 ? W - 12 : W * 0.86, span = Math.min(maxW, H.measureText(p.word).width + size * 0.6);
  const cx = Math.max(span / 2 + 4, Math.min(W - span / 2 - 4, x)), tilt = (p.seed - 0.5) * 0.18 * Math.min(1, W * 0.3 / span);
  H.save();
  H.globalAlpha = fade;
  H.translate(cx, y); H.rotate(tilt);
  // sparkles around the word, flattened so they stay inside the slot
  for (let i = 0; i < 10 + lvl * 4; i++) {
    const a = i * 2.4 + p.seed * 6, r = size * (1.1 + 0.4 * k) + (i % 3) * 4, s2 = 2 + (i % 3);
    H.fillStyle = i % 2 ? '#fff' : cols[0];
    H.fillRect(Math.cos(a) * r * 1.8 - s2 / 2, Math.sin(a) * r * 0.45 - s2 / 2, s2, s2);
  }
  H.restore();
  H.globalAlpha = fade;
  bigWord(p.word, cx, y, size, cols, tilt, maxW, HEADLINE_SIZE(big) * (1 + lvl * 0.08));
  H.globalAlpha = 1;
}
