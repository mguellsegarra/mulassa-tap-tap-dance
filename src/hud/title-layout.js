// Title screen layout (pure): one vertical budget for the logo, the difficulty choice, the keyboard hint and the
// DOM "Com es juga?" pill (+ iPhone hint) under it. main.js draws the canvas part and places the pill from the
// same result, so they can never overlap. Everything is in HUD units (1 unit = K css px) unless named *Css.
//
// Too little height: the mulassa's free band shrinks first (a big logo may cover her a little), then the logo, then the
// gaps (the one under the icon row too), then the logo further,
// then the keyboard hint goes, and only then the buttons get shorter (never under a 44 px touch target).
// Three buttons side by side whenever they fit across and the screen is wide or short; else a column.

export const LOGO_TOP = 0.62, LOGO_H = 1.7; // MULASSA + TAP TAP DANCE, around logo(y): top at y - 0.62 s, 1.7 s tall
const ICON_GAP_CSS = 22, ICON_GAP_MIN_CSS = 12; // portrait: the logo starts this far under the corner icons' row (breathing room, never glued to it)
const HEAD = 16, HEAD_GAP = 10, HINT = 21; // "TRIA LA DIFICULTAT" slot, its gap to the buttons, the key hint slot
export const CHIP = 22, CHIP_GAP = 6; // a friend's challenge (?repte): a tip chip over the heading, and its gap to it
const MARGIN_CSS = 16, HINT_GAP_CSS = 10; // pill above the bottom edge; iPhone hint above the pill

// o: { W, HH, K, safe: {t,r,b,l} css, keys, note (audio error shown in the hint slot), logoRatio (logo width / s),
//      subW (widest subtitle at size 7), nameW (widest name at 12), pill: {w,h} css, hint: {w,h} css | null,
//      corner (the pill sits top-right, index.html max-height: 500px), obstacles: [{left,top,right,bottom}] css,
//      chip (true: room for the challenge chip, never dropped: it says which level to beat) }
export function titleLayout(o) {
  const rowOK = (inner(o) - 24 - 2 * 8) / 3 >= rowMin(o); // side by side, even with the tightest gaps
  let L = place(o, false);
  if (rowOK && (o.W >= 420 || L.squeezed)) L = place(o, true); // wide, or a column would squeeze more than logo + band
  return L;
}

const inner = o => o.W - (o.safe.l + o.safe.r) / o.K; // width inside the side insets
const rowMin = o => Math.max(o.subW * 0.8, o.nameW) + 14; // a row button's least width (subtitle down to 80 %)

function place(o, row, pass2 = null) {
  const { W, HH, K, safe } = o, u = 1 / K;
  const icons = o.corner ? [] : o.obstacles; // portrait/desktop: the icon row is along the top, the logo goes under it
  const row0 = !pass2?.top && icons.length ? Math.max(...icons.map(r => r.bottom * u)) : null; // the icon row's bottom
  const topAt = gI => row0 == null ? pass2?.top ?? safe.t * u + 8 : Math.max(safe.t * u + 8, row0 + gI);
  const sMax = Math.max(28, Math.min(W / 4.6, 96, (W - 12) / o.logoRatio, pass2?.s ?? Infinity));
  const bhMin = Math.max(32, 44 * u), bhPref = row ? 50 : 44;
  const hintDroppable = o.keys && !o.note, hintOn = o.keys || Boolean(o.note);
  const pillH = o.corner ? 0 : o.pill.h * u, ios = o.hint ? o.hint.h * u + HINT_GAP_CSS * u : 0;
  const bottom = HH - (safe.b + MARGIN_CSS) * u;
  const v = { s: sMax, gI: row0 == null ? 0 : ICON_GAP_CSS * u, mid: HH * 0.3, gA: 20, gB: 12, bg: row ? Math.max(8, Math.min(14, (inner(o) - 24 - 3 * rowMin(o)) / 2)) : 10, hint: hintOn ? HINT : 0, bh: bhPref };
  const chip = o.chip ? CHIP + CHIP_GAP : 0;
  const need = () => topAt(v.gI) + LOGO_H * v.s + v.gA + v.mid + chip + HEAD + HEAD_GAP + (row ? v.bh : 3 * v.bh + 2 * v.bg) + v.hint + v.gB + ios + pillH + (HH - bottom);
  let excess = need() - HH;
  const take = (key, min, per = 1) => { // shrink v[key] towards min by what's left of the excess (per: budget units per unit)
    if (excess <= 0) return;
    const d = Math.min(excess / per, Math.max(0, v[key] - min));
    v[key] -= d; excess -= d * per;
  };
  take('mid', HH * 0.06); // a big logo first: it may cover the mulassa a little
  take('s', Math.min(v.s, 44), LOGO_H);
  const squeezed = excess > 0;
  take('gA', 8); take('gB', 6); take('gI', ICON_GAP_MIN_CSS * u); if (!row) take('bg', 6, 2);
  take('s', 28, LOGO_H);
  if (excess > 0 && hintDroppable) { excess -= v.hint; v.hint = 0; }
  take('bh', bhMin, row ? 1 : 3);
  // spare height (big screens): the logo may come down a little, to about 15 % of the height, never below it
  const top0 = topAt(v.gI), spare = Math.max(0, -excess), logoTop = top0 + Math.min(spare / 2, Math.max(0, HH * 0.15 - LOGO_TOP * v.s - top0));
  const s = v.s, logoHalf = o.logoRatio * s / 2 + 4;
  // landscape phones / short windows: a corner control (⚙, the pill) where the logo reaches: start the whole thing
  // under it, or keep the logo narrow enough to fit between the corners, whichever leaves the bigger logo
  if (!pass2 && o.corner) {
    const hit = o.obstacles.filter(r => r.bottom * u > logoTop && r.left * u < W / 2 + logoHalf && r.right * u > W / 2 - logoHalf);
    if (hit.length) {
      const under = place(o, row, { top: Math.max(...hit.map(r => r.bottom * u)) + 4 });
      const room = Math.min(...hit.map(r => r.left * u > W / 2 ? r.left * u - W / 2 : r.right * u < W / 2 ? W / 2 - r.right * u : 0));
      const between = (room - 4) * 2 / o.logoRatio >= 28 ? place(o, row, { s: (room - 4) * 2 / o.logoRatio - 0.01 }) : null;
      return between && (between.fits && !under.fits || between.fits === under.fits && between.s >= under.s) ? between : under;
    }
  }
  // the choice sits on the bottom, right above the pill (and the iPhone hint)
  const pillTop = bottom - pillH, blockBottom = pillTop - ios - v.gB;
  const bw = row ? Math.min(160, (inner(o) - 24 - 2 * v.bg) / 3) : Math.min(220, W * 0.82);
  const blockH = HEAD + HEAD_GAP + (row ? v.bh : 3 * v.bh + 2 * v.bg) + v.hint, y0 = blockBottom - blockH + HEAD + HEAD_GAP;
  const buttons = [0, 1, 2].map(i => ({
    x: row ? W / 2 + (i - 1) * (bw + v.bg) - bw / 2 : W / 2 - bw / 2, y: row ? y0 : y0 + i * (v.bh + v.bg), w: bw, h: v.bh, i,
  }));
  const last = buttons[2], logoY = logoTop + LOGO_TOP * s;
  return {
    K, row, squeezed, fits: excess <= 0.5, s, logoY,
    logo: { x: W / 2 - logoHalf, y: logoTop, w: 2 * logoHalf, h: LOGO_H * s },
    headingY: y0 - HEAD_GAP - HEAD / 2, buttons,
    chipY: chip ? y0 - HEAD_GAP - HEAD - CHIP_GAP - CHIP / 2 : null, // (above the heading, inside the block's budget)
    subSize: Math.min(7, 7 * (bw - 12) / o.subW),
    hintY: v.hint ? last.y + last.h + HINT - 5 : null,
    pillTopCss: o.corner ? null : pillTop * K, // the pill's top edge (css px), centred on W / 2 by index.html
    iosTopCss: o.hint ? (pillTop - ios) * K : null,
  };
}

// The feedback nudge (index.html #feedback-nudge, src/ui/feedback-ui.js): where a speech bubble for the corner button
// `button` fits, clear of everything in `avoid` (the logo, the choice, the other controls; css px {x,y,w,h}), without
// moving any of them. First beside the button in its row, towards the middle (portrait: to its left; the landscape
// phones' row runs from the left: to its right), else under it with the tail pointing up; null when neither fits.
export function nudgePlace({ button, avoid, W, H, safe, corner }) {
  const big = button.w >= 50, h = button.h, gap = big ? 12 : 10, minW = big ? 150 : 120, maxW = big ? 240 : 200;
  const inside = r => r.x >= safe.l + 4 && r.x + r.w <= W - safe.r - 4 && r.y + r.h <= H - safe.b - 4;
  const clear = r => inside(r) && !avoid.some(a => r.x < a.x + a.w + 4 && a.x < r.x + r.w + 4 && r.y < a.y + a.h + 4 && a.y < r.y + r.h + 4);
  const toLeft = !corner, mid = button.x + button.w / 2;
  for (let w = maxW; w >= minW; w -= 10) {
    const r = { x: toLeft ? button.x - gap - w : button.x + button.w + gap, y: button.y, w, h, tail: toLeft ? 'right' : 'left' };
    if (clear(r)) return r;
  }
  const y = button.y + button.h + gap; // under: the tail stays within 18 px of either end, over the button's middle
  for (let w = maxW; w >= minW; w -= 10) {
    for (let x = mid - 18; x >= mid - w + 18; x -= 4) { // towards the corner first, away from the middle
      const xx = toLeft ? x : mid * 2 - x - w; // mirrored for the left-hand row
      const r = { x: xx, y, w, h, tail: 'up', tailX: mid - xx };
      if (clear(r)) return r;
    }
  }
  return null;
}


// The logo's motion (pure: main.js draws it, and skips it all with reduced motion). MULASSA: a glint of light sweeps
// across its letters, GLINT.dur s out of every GLINT.every s. TAP TAP DANCE: one word pops per beat of the menu loop
// (TAP, TAP, DANCE, a rest), like drum hits: a quick attack and a short decay, a few percent of its size.
export const GLINT = { every: 5, dur: 0.8 }, POP = { tap: 0.05, dance: 0.06, max: 0.06, lift: 0.6 }; // lift: a hop (× the pop × the size), more than a swell: the words keep their gaps
export function glintAt(t) { // null, or how far the sweep has gone (0..1, eased), at t seconds
  const f = ((t % GLINT.every) + GLINT.every) % GLINT.every - (GLINT.every - GLINT.dur); // (the cycle's end: a pause first)
  if (f < 0) return null;
  const x = f / GLINT.dur;
  return x * x * (3 - 2 * x);
}
export function popsAt(beat, out) { // out[0..2]: TAP, TAP, DANCE's extra scale at a fractional beat (reused array)
  out[0] = out[1] = out[2] = 0;
  if (!Number.isFinite(beat)) return out;
  const n = Math.floor(beat), i = ((n % 4) + 4) % 4, f = beat - n;
  if (i < 3) out[i] = (i === 2 ? POP.dance : POP.tap) * (f < 0.05 ? f / 0.05 : Math.exp(-(f - 0.05) * 7));
  return out;
}
