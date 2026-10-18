// Title layout (src/hud/title-layout.js): at every screen size and input, the logo, the JUGA button, the key hint,
// the DOM "Com es juga?" pill, the iPhone hint, the ⚙, the Classificacions podium, the «Bústia de la plaça» bubble and the menu music's speaker never overlap (each other included)
// and stay inside the safe area. DOM geometry mirrors index.html (#settings / #leaders / #feedback / #music / #howto corners and sizes). Browser matrix: see AGENTS.md.
import assert from 'node:assert/strict';
import { readPage } from './page.mjs';
import { titleLayout, nudgePlace, glintAt, popsAt, GLINT, POP, LOGO_H, LOGO_TOP } from '../src/hud/title-layout.js';

const inter = (a, b) => a.x < b.x + b.w - 0.5 && b.x < a.x + a.w - 0.5 && a.y < b.y + b.h - 0.5 && b.y < a.y + a.h - 0.5;
const SIZES = [[360, 640], [375, 667], [375, 812], [393, 852], [430, 932], [510, 670], [630, 670], [768, 1024], [1024, 768], [1280, 600],
  [1280, 720], [1440, 900], [1920, 1080], [2560, 1440], [667, 375], [852, 393], [568, 320], [1366, 1024], [320, 480], [900, 420]];
const DEVICES = [[375, 667], [393, 852], [430, 932], [360, 760], [1180, 820], [1133, 744], [1280, 800], [1920, 1080]]; // SE, 15, Pro Max, S10, iPads, desktops
SIZES.push(...DEVICES.filter(([a, b]) => !SIZES.some(([c, d]) => a === c && b === d)));
const NOTCH = { t: 59, r: 0, b: 34, l: 0 }, LAND = { t: 0, r: 59, b: 21, l: 59 }, NONE = { t: 0, r: 0, b: 0, l: 0 }; // LAND: a notched phone on its side
let cases = 0;
for (const [cw, ch] of SIZES) for (const keys of [true, false]) for (const hint of [false, true]) for (const safe of [NONE, NOTCH, LAND]) {
  const K = Math.min(cw, ch) < 520 ? 1.5 : 2, big = cw >= 520 && ch >= 520, corner = ch <= 500;
  const tablet = Math.min(cw, ch) >= 600, wrongWay = tablet ? ch > cw : cw > ch; // touch: phones play portrait, tablets landscape (#rotate)
  if ((hint && keys) || (!keys && wrongWay) || (safe === NOTCH && (tablet || ch < 800)) || (safe === LAND && (!corner || cw < 800))) continue; // notched phones on their side: 812+ wide // the iPhone hint means touch; notches: portrait phones, all 812+ tall
  const pill = { w: big ? 230 : 170, h: big ? 56 : 44 }, g = big ? 56 : 44, gm = corner ? 12 : big ? 16 : 10;
  const gear = corner ? { x: safe.l + 12, y: safe.t + 12, w: g, h: g } : { x: cw - safe.r - gm - g, y: safe.t + gm, w: g, h: g };
  const leaders = corner ? { x: safe.l + 12 + 44 + 10, y: safe.t + 12, w: g, h: g } : { x: safe.l + gm, y: safe.t + gm, w: g, h: g }; // ⚙'s mirror / right after it
  // [bubble][speaker][⚙] top-right; landscape phones [⚙][podium][speaker][bubble]; none when that row is too narrow
  const step = g + (big ? 12 : 10), row = !(corner && cw < 420);
  const music = !row ? null : corner ? { x: safe.l + 12 + 2 * (44 + 10), y: safe.t + 12, w: g, h: g } : { x: gear.x - step, y: safe.t + gm, w: g, h: g };
  const talk = !row ? null : corner ? { x: safe.l + 12 + 3 * (44 + 10), y: safe.t + 12, w: g, h: g } : { x: music.x - step, y: safe.t + gm, w: g, h: g };
  const cornerPill = { x: cw - safe.r - 12 - pill.w, y: safe.t + 12, w: pill.w, h: pill.h };
  const iosHint = hint ? { w: Math.min(360, cw - 32), h: 48 } : null;
  const edge = r => ({ left: r.x, top: r.y, right: r.x + r.w, bottom: r.y + r.h });
  const L = titleLayout({ W: cw / K, HH: ch / K, K, safe, keys, note: '', logoRatio: 4.85, subW: 104, nameW: 42, pill, hint: iosHint, corner,
    obstacles: [edge(gear), edge(leaders), ...(row ? [edge(talk), edge(music)] : []), ...(corner ? [edge(cornerPill)] : [])] });
  const css = r => ({ x: r.x * K, y: r.y * K, w: r.w * K, h: r.h * K }), name = `${cw}x${ch} keys=${keys} hint=${hint} safe=${safe.t || safe.l}`;
  const dom = [['gear', gear], ['leaders', leaders], ...(row ? [['feedback', talk], ['music', music]] : []), ['pill', corner ? cornerPill : { x: cw / 2 - pill.w / 2, y: L.pillTopCss, w: pill.w, h: pill.h }]];
  if (hint) dom.push(['ios hint', { x: cw / 2 - iosHint.w / 2, y: L.iosTopCss, w: iosHint.w, h: iosHint.h }]);
  // «mode foto» (#viewmode, 44 px): bottom-right, centred on the pill's height and under the ⚙; landscape phones: under the ⚙ (none where the row is too narrow)
  if (row || !corner) dom.push(['view mode', corner ? { x: safe.l + 12, y: safe.t + 12 + 44 + 10, w: 44, h: 44 } : { x: cw - safe.r - (big ? 22 : 10) - 44, y: ch - safe.b - (big ? 22 : 16) - 44, w: 44, h: 44 }]);
  const canvas = [['logo', css(L.logo)], ...L.buttons.map(b => ['button ' + b.i, css(b)])];
  if (L.hintY != null) canvas.push(['key hint', { x: cw / 2 - 100 * K, y: (L.hintY - 7) * K, w: 200 * K, h: 14 * K }]);
  assert(L.fits, `${name}: fits`);
  assert(L.buttons.every(b => b.h * K >= 44), `${name}: 44 px touch targets`);
  assert(keys || L.hintY == null, `${name}: no key hint on touch`);
  // the logo breathes under the icon row (portrait and desktop: the row runs along the top), never glued to it
  if (!corner) { const row = Math.max(...[gear, leaders, talk, music].filter(Boolean).map(r => r.y + r.h)); assert(L.logo.y * K >= row + 12, `${name}: logo ${L.logo.y * K - row} px under the icons`); }
  // the logo's motion stays inside its box: TAP TAP DANCE's biggest pop (size 0.38 s, at logoY + 0.82 s) and MULASSA's
  // beat lift (0.06 s up) never reach past it
  assert(L.logoY + L.s * (0.82 + 0.38 * 1.15 * (1 + POP.max) * 0.5) <= L.logo.y + L.logo.h + 0.5 && L.logoY - L.s * (LOGO_TOP - 0.06) >= L.logo.y - 0.5, `${name}: the logo's motion stays in its box`);
  // the nudge after a game (#feedback-nudge): a spot clear of all of it without moving anything, on the sizes that matter
  if (row) {
    const n = nudgePlace({ button: talk, avoid: [...canvas, ...dom].filter(([k]) => k !== 'feedback').map(([, r]) => r), W: cw, H: ch, safe, corner });
    if ([[375, 667], [393, 852], [852, 393], [1280, 800], [768, 1024], [1440, 900]].some(([a, b]) => a === cw && b === ch)) assert(n, `${name}: the nudge finds a spot`);
    if (n) dom.push(['nudge', n]);
  }
  const all = [...canvas, ...dom];
  for (let i = 0; i < all.length; i++) {
    const [a, A] = all[i];
    assert(A.x >= -0.5 && A.x + A.w <= cw + 0.5 && A.y >= safe.t - 0.5 && A.y + A.h <= ch - safe.b + 0.5, `${name}: ${a} inside the safe area`);
    for (let j = i + 1; j < all.length; j++) assert(!inter(A, all[j][1]), `${name}: ${a} clear of ${all[j][0]}`);
  }
  cases++;
}
// Every viewport has one JUGA button; difficulty lives on the character selector.
const at = (cw, ch, K) => titleLayout({ W: cw / K, HH: ch / K, K, safe: NONE, keys: true, note: '', logoRatio: 4.85, subW: 104, nameW: 42, pill: { w: 170, h: 44 }, hint: null, corner: ch <= 500, obstacles: [] });
for (const [w, h, k] of [[375, 667, 1.5], [1280, 600, 2], [667, 375, 1.5]]) assert.equal(at(w, h, k).buttons.length, 1);
assert(at(510, 320, 1.5).s < at(510, 852, 1.5).s, 'a short window shrinks the logo once its free band is spent');
assert(at(430, 932, 1.5).s * 1.5 >= 84, 'the biggest phones get a logo as wide as the screen allows');
// the logo's motion: the glint crosses MULASSA once every GLINT.every s, after a pause; TAP, TAP, DANCE pop on three
// beats out of four, one at a time, small, and settle before the next
const g = [...Array(1000)].map((_, i) => glintAt(i * GLINT.every / 1000));
assert(g[0] === null && g.at(-1) > 0.95 && g.filter(x => x != null).length / 1000 < 0.2, 'the glint: a short sweep, then a pause');
assert(g.every((x, i) => x == null || g[i - 1] == null || x >= g[i - 1]), 'the glint only moves forwards');
const out = [0, 0, 0], peak = [0, 0, 0, 0];
for (let b = 0; b < 8; b += 0.01) { popsAt(b, out); assert(out.filter(Boolean).length <= 1, `one word at a time (${b})`); out.forEach((x, i) => { peak[i] = Math.max(peak[i], x); }); if (Math.floor(b) % 4 === 3) assert(out.every(x => x === 0), 'a rest on the fourth beat'); }
assert(peak.slice(0, 3).every(x => x > 0.03 && x <= POP.max) && popsAt(0.9, out)[0] < 0.02, 'small pops that settle within the beat');
assert(popsAt(NaN, out).every(x => x === 0), 'no beat (reduced motion): still');
// «Mostra els FPS» (#fps, bottom-left): its widest state («30 FPS» + «mode d’estalvi?») stays left of the «Com es juga?»
// pill on portrait phones from 360 px (the hint wraps under max-width: the box is at most 8 + max-width + 16 wide)
{
  const { readFileSync } = await import('node:fs');
  const html = readPage();
  const font = Number(html.match(/#fps \{[^}]*font: 700 (\d+)px/)?.[1]), maxEm = Number(html.match(/max-width: 519px\) \{ #fps \{ max-width: ([\d.]+)em/)?.[1]);
  assert(font && maxEm, '#fps font size and phone max-width');
  const right = 8 + maxEm * font + 7 + 6 + 3; // left + text + padding + border
  for (const cw of [360, 375, 393, 412, 430]) assert(right + 4 <= cw / 2 - 170 / 2, `${cw} px: the FPS box (to ${right} px) clears the pill`);
}
console.log(`title layout ok (${cases} cases)`);
