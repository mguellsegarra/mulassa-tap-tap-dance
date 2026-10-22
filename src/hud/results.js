// The results screen.
import { drawStars } from './stars.js';
import { qualityText } from '../game/progress.js';
import { comparableScore } from '../game/score-scale.js';
import { SITE_LABEL } from '../services/share.js';
import { sheets } from '../ui/sheets.js';
import { G, clock } from '../game/state.js';
import { H, W, HH, SAFE, K } from './canvas.js';
import { panel, text, textWidth } from './primitives.js';
import { C } from './sprites.js';
import { trf } from '../game/figure-theme.js';
import { elastic } from './praise.js';
import { sparkle, tipChip } from './title.js';
import { COARSE } from '../core/env.js';
import { tr } from '../i18n/messages.js';
import { fmtNum } from '../i18n/format.js';
// Resolved once: drawResults runs every frame.
const RES = {
  clearTitle: tr('hud.results.clearTitle'), clearSub: tr('hud.results.clearSub'), failTitle: tr('hud.results.failTitle'), failSub: tr('hud.results.failSub'),
  good: tr('hud.results.good'), miss: tr('hud.results.miss'), streak: tr('hud.results.streak'), points: tr('hud.results.points'),
  hits: tr('hud.results.hits'), record: tr('hud.results.record'), best: tr('hud.results.best'), congrats: tr('hud.results.congrats'), advice: tr('hud.results.advice'),
  back: [tr('hud.results.backTouch'), tr('hud.results.backKeys')],
  hintCollapse: tr('hud.results.hintCollapse'), hintHold: tr('hud.results.hintHold'),
  hintSilent: tr('hud.results.hintSilent'), hintMove: tr('hud.results.hintMove'), hintEarly: tr('hud.results.hintEarly'), hintLate: tr('hud.results.hintLate'), hintClean: tr('hud.results.hintClean'),
};

// Results, three blocks with room between them, centred as a group inside the safe area: the card (title,
// rank + stats, quality, record badge), the tip under it (its own pill, labelled CONSELL) and a real
// "TOCA PER TORNAR" button at the bottom.
// Keep CSS pixels free for the DOM actions: measured height includes desktop UI scaling and wrapped labels.
// Before measurement, estimate compact 48 px rows, 12 px apart; publish and retry each own a row on narrow screens.
const NARROW = matchMedia('(max-width: 639px)');
const ROW_GAP = 20, BELOW_EXTRA = 8, resultsRow = document.getElementById('results-actions');
let rowSeen = 0; // the row's real height once laid out (a wrap the estimate below missed must never sit on the tip)
try { new ResizeObserver(() => { rowSeen = resultsRow.offsetHeight; }).observe(resultsRow); } catch { /* old browser / tests: the estimate alone */ }
const resultsReserve = () => { // rows of 48, 12 apart. Publish and retry each wrap onto their own row on a narrow phone.
  const rows = 1 + (sheets.board.publishable && NARROW.matches ? 1 : 0) + (NARROW.matches ? 1 : 0);
  return Math.max(rows * 48 + (rows - 1) * 12, rowSeen);
};
// The row sits right under the card (ROW_GAP css px), TOCA PER TORNAR and the tip under it: drawResults() places it by
// writing its `top` (only when it changes: no layout reads per frame)
let resultsTop = '';
function placeResultsRow(yCss) {
  const v = `${Math.round(yCss)}px`;
  if (v !== resultsTop) { resultsTop = v; resultsRow.style.top = v; resultsRow.style.bottom = 'auto'; }
}
export function drawResults() {
  H.fillStyle = 'rgba(42,26,16,0.4)'; H.fillRect(0, 0, W, HH);
  const lost = G.reason === 'collapse'; // a collapse is a defeat: no stars, no quality % (they would read as a pass)
  const row = 17, STAR_H = lost ? 0 : 76, rec = lost ? 0 : G.newRecord ? 34 : G.previous ? 22 : 8, chl = G.challenge ? 20 : 0, url = 14; // chl: a friend's challenge; url: the address
  const pw = Math.min(340, W - 20), ph = (lost ? 154 : 184) + STAR_H + rec + chl + url, x0 = W / 2 - pw / 2;
  // Top to bottom: the card, the measured DOM row, the tip, TOCA PER TORNAR.
  const top = (SAFE.t + 8) / K, bottom = HH - (SAFE.b + 10) / K, rowH = resultsReserve() / K, rowGap = ROW_GAP / K, extra = BELOW_EXTRA / K;
  const tipH = 26, btnH = 30, room = bottom - top - ph - tipH - btnH - 14 - rowGap - rowH - extra; // 14: the CONSELL label
  const gap = Math.max(8, Math.min(26, room / 3)); // generous on tall phones, tight on an SE or landscape
  const canvasH = ph + extra + gap + 14 + tipH + gap * 1.4 + btnH; // everything drawn here (the row's slot apart)
  const fit = Math.min(1, (bottom - top - rowGap - rowH) / canvasH); // too short for it all (landscape phones): the canvas parts scale down
  const y0 = Math.max(top, top + (bottom - top - canvasH * fit - rowGap - rowH) * 0.45);
  const rowTop = y0 + ph * fit + rowGap, rowBottom = rowTop + rowH;
  placeResultsRow(rowTop * K);
  H.save(); // the card scales about its own top
  if (fit < 1) { H.translate(W / 2, y0); H.scale(fit, fit); H.translate(-W / 2, -y0); }
  panel(x0, y0, pw, ph);
  const [title, sub, col] = {
    clear: [RES.clearTitle, RES.clearSub, C.gold],
    fail: [RES.failTitle, RES.failSub, C.blue],
    collapse: [trf('results.collapseTitle'), trf('results.collapseSub'), C.red],
  }[G.reason];
  text(title, W / 2, y0 + 17, Math.min(16, (pw - 20) / 16), col);
  text(sub, W / 2, y0 + 34, Math.min(9, (pw - 20) / textWidth(sub, 1)), C.cream);
  const rule = y => { H.fillStyle = 'rgba(245,197,24,0.35)'; H.fillRect(x0 + 12, y, pw - 24, 1); };
  rule(y0 + 46);
  // the stars are the hero: centred under the title, then the stats in full-width rows (like a mobile game's win card)
  if (!lost) { drawStars(H, G.stars, W / 2, y0 + 46 + STAR_H / 2, 84, clock - G.resT); /* the earned ones drop in one by one */ rule(y0 + 46 + STAR_H); }
  const by = y0 + 54 + STAR_H, bh = row * 5, sx = x0 + 26, ex = x0 + pw - 26;
  [[trf('hit.both'), G.counts.perfect, C.gold], [RES.good, G.counts.good, C.cream], [RES.miss, G.counts.miss, C.blue], [RES.streak, G.maxCombo, C.pink], [RES.points, comparableScore(G.score, G.diff, G.figureVersion), C.score]]
    .forEach(([s, v, c], i) => {
      const y = by + row * (i + 0.5);
      if (i) { H.fillStyle = 'rgba(255,243,214,0.08)'; H.fillRect(sx, y - row / 2, ex - sx, 1); }
      text(s, sx, y, 9, c, 'left');
      text(fmtNum(v), ex, y, 9, c, 'right'); // 182.972: thousands separated, as on the board
    });
  rule(by + bh + 8);
  // quality: the headline number of the card
  const qy = by + bh + 30, q = qualityText(G.counts), lw = textWidth(RES.hits, 9), vw = textWidth(q, 18), qx = W / 2 - (lw + 8 + vw) / 2;
  if (!lost) { text(RES.hits, qx, qy + 1, 9, C.cream, 'left'); text(q, qx + lw + 8, qy, 18, C.gold, 'left'); }
  if (G.newRecord) { // a gold ribbon of its own that pops in after the medallion
    const s = RES.record, size = Math.min(9.5, (pw - 70) / 12), pop = elastic(Math.min(1, Math.max(0, clock - G.resT - 0.4) * 2.5));
    const bw = (textWidth(s, size) + 34) * pop, ry = qy + 26;
    if (pop > 0.05) {
      H.beginPath(); H.roundRect(W / 2 - bw / 2, ry - 10, bw, 20, 10); H.fillStyle = C.gold; H.fill();
      H.strokeStyle = C.dark; H.lineWidth = 1.5; H.stroke();
      H.save(); H.beginPath(); H.roundRect(W / 2 - bw / 2, ry - 10, bw, 20, 10); H.clip(); // a shine sweeps across
      const sh = W / 2 - bw / 2 + ((clock * 70) % (bw + 60)) - 30;
      H.fillStyle = 'rgba(255,255,255,0.35)'; H.beginPath(); H.moveTo(sh, ry - 10); H.lineTo(sh + 12, ry - 10); H.lineTo(sh + 2, ry + 10); H.lineTo(sh - 10, ry + 10); H.fill();
      H.restore();
      if (pop > 0.9) { text(s, W / 2, ry, size, C.dark, 'center', C.gold); /* dark on gold: no dark outline, it blotted the letters */ sparkle(W / 2 - bw / 2 + 10, ry, 4 + Math.sin(clock * 6), C.dark); sparkle(W / 2 + bw / 2 - 10, ry, 4 + Math.sin(clock * 6 + 2), C.dark); }
    }
  } else if (G.previous && !lost) { // the record to beat, laid out like ENCERTS: cream label, points in their own colour
    const best = tr('hud.results.bestPoints', { score: fmtNum(G.previous.score) }), bl = textWidth(RES.best, 9), bv = textWidth(best, 11), bx = W / 2 - (bl + 6 + bv) / 2;
    text(RES.best, bx, qy + 23, 9, C.cream, 'left'); text(best, bx + bl + 6, qy + 22, 11, C.score, 'left');
  }
  if (G.challenge) text(G.challenge.line, W / 2, y0 + ph - url - chl + 8, G.challenge.beaten ? 11 : 9.5, G.challenge.beaten ? C.gold : '#5fd4c8'); // a friend's ?repte (same level)
  text(SITE_LABEL, W / 2, y0 + ph - 9, 7, '#e8d8b8'); // small, inside the card: a screenshot still says where to play
  // the tip, outside the card
  const e = G.errors, others = e.silent + e.early + e.late + e.move;
  const hint = G.reason === 'collapse' ? RES.hintCollapse : e.both > others ? trf(COARSE.matches ? 'results.hintBothTouch' : 'results.hintBothKeys') : e.hold > others ? RES.hintHold : G.errors.silent > G.errors.early + G.errors.late + G.errors.move ? RES.hintSilent : G.errors.move > G.errors.early + G.errors.late ? RES.hintMove : G.errors.early > G.errors.late ? RES.hintEarly : G.errors.late ? RES.hintLate : RES.hintClean;
  H.restore(); H.save(); // the tip and the button: under the row, scaled about the row's bottom
  if (fit < 1) { H.translate(W / 2, rowBottom); H.scale(fit, fit); H.translate(-W / 2, -rowBottom); }
  const win = G.reason !== 'collapse' && !others && !e.both && !e.hold, ty = rowBottom + extra + gap;
  text(win ? RES.congrats : RES.advice, W / 2, ty + 5, 7.5, win ? C.gold : '#5fd4c8');
  tipChip(hint, W / 2, ty + 14 + tipH / 2, pw - 8, win, tipH);
  // continue: a real button, fading in after a second
  const since = clock - G.resT;
  if (since > 1) {
    const b = Math.sin(clock * 3), s = RES.back[COARSE.matches ? 0 : 1];
    const bw = textWidth(s, 10.5) + 40, cy = ty + 14 + tipH + gap * 1.4 + btnH / 2;
    H.globalAlpha = Math.min(1, (since - 1) * 4);
    H.beginPath(); H.roundRect(W / 2 - bw / 2, cy - btnH / 2, bw, btnH, btnH / 2);
    H.fillStyle = 'rgba(42,26,16,0.92)'; H.fill();
    H.strokeStyle = C.gold; H.lineWidth = 2 + 0.6 * (b + 1); H.stroke();
    text(s, W / 2, cy + 1, 10.5, C.gold);
    H.globalAlpha = 1;
  }
  H.restore();
}
