// drawHud: which HUD screen is drawn this frame.
import { STEPS } from '../game/practice.js';
import { G, clock, chip } from '../game/state.js';
import { HUD_CY, PRACTICE_Y } from './layout.js';
import { W, H, HH } from './canvas.js';
import { text, textWidth, panel } from './primitives.js';
import { C, spriteBudget, SPRITES_NEW, warmups, warmT, setSpriteBudget, setWarmT } from './sprites.js';
import { COARSE, offsetMs } from '../core/env.js';
import { themed } from '../game/figure-theme.js';
import { drawSplash, drawTitle } from './title.js';
import { drawBubbles } from './bubbles.js';
import { drawJudge, drawBanner, drawResume } from './banner.js';
import { drawPraise } from './praise.js';
import { drawTop } from './top.js';
import { drawLane } from './lane.js';
import { drawResults } from './results.js';
import { loader } from '../ui/handles.js';

// Practice: progress at the top and the step's instruction above the pad.
function drawPractice() {
  const P = G.practice, i = Math.min(Math.max(0, P.step | 0), STEPS.length - 1), step = STEPS[i];
  const y = HUD_CY(), n = STEPS.length, gap = 12, x0 = W / 2 - (n - 1) * gap / 2;
  text('PRÀCTICA', W / 2, y - 9, 8, C.gold);
  for (let k = 0; k < n; k++) {
    H.beginPath(); H.arc(x0 + k * gap, y + 6, k === i && !P.doneT ? 4 : 3, 0, 7);
    H.fillStyle = k < P.step ? C.gold : k === i && !P.doneT ? C.cream : 'rgba(255,243,214,0.25)'; H.fill();
    H.strokeStyle = C.dark; H.lineWidth = 1; H.stroke();
  }
  if (P.doneT) return;
  const s = themed(COARSE.matches ? step.touch : step.keys), ww = textWidth(themed(step.word), 10) + 8, room = W - 20 - ww - 24;
  const size = Math.min(10, 10 * room / textWidth(s, 10)), w = ww + textWidth(s, size) + 24, x = W / 2 - w / 2, cy = PRACTICE_Y();
  H.beginPath(); H.roundRect(x, cy - 11, w, 22, 3); // an instruction, not a button: flat, a gold strip, no outline
  H.fillStyle = 'rgba(42,26,16,0.9)'; H.fill(); H.fillStyle = C.gold; H.fillRect(x, cy - 11, 3, 22);
  text(themed(step.word), x + 12, cy, 10, { GUA: C.guaLt, PA: C.paLt }[step.word] ?? C.gold, 'left');
  text(s, x + 12 + ww, cy, size, C.cream, 'left');
}
function drawCollapse() {
  if (clock - G.collapseT < 0.7 - 1e-9) return;
  // the moment itself: big, in the middle of the screen (two lines, so it stays big on a phone), with a short pop-in
  const size = Math.min(34, W / 11) * Math.min(1, 0.6 + 0.4 * Math.min(1, (clock - G.collapseT - 0.7) / 0.18)), y = HH * 0.42;
  text(themed('LA MULASSA'), W / 2, y - size * 0.62, size, C.red, 'center', C.cream);
  text(themed('S’HA DESMUNTAT!'), W / 2, y + size * 0.62, size, C.red, 'center', C.cream);
}
export function drawHud(t) {
  setSpriteBudget(SPRITES_NEW);
  if (G.state === 'splash') drawSplash();
  if (G.state === 'title') drawTitle();
  if (G.state === 'play') {
    if (G.collapseT) { drawCollapse(); return; }
    drawBubbles();
    drawJudge();
    drawPraise();
    if (G.practice) drawPractice(); else drawTop(t);
    drawLane(t);
    if (!G.practice) drawBanner(t);
    if (G.resuming != null) drawResume();
    if (!chip.running && !G.paused) { // audio blocked (iOS): the song clock can't move, so say how to fix it instead of hanging
      panel(W / 2 - 130, HH * 0.55, 260, 44);
      text('TOCA LA PANTALLA', W / 2, HH * 0.55 + 15, 14, C.gold);
      text('per activar el so i començar', W / 2, HH * 0.55 + 32, 10, C.cream);
    }
  }
  if (G.state === 'results') { drawBubbles(); drawResults(); }
  if (clock - (G.offsetT ?? -9) < 1.5) {
    panel(W / 2 - 110, HH / 2 - 20, 220, 40);
    text(`Sincronia de l’àudio: ${offsetMs > 0 ? '+' : ''}${offsetMs} ms`, W / 2, HH / 2 - 5, 11, C.cream);
    text('[ avança · ] endarrereix', W / 2, HH / 2 + 11, 8, C.gold);
  }
  if (warmups.length && spriteBudget === SPRITES_NEW && (loader.covering || clock - warmT > 0.25)) { // nothing new this frame: paint one queued
    setWarmT(clock); H.save(); H.globalAlpha = 0; warmups.shift()(); H.restore(); // word ahead, unseen (spaced: never a run of heavy frames; under the page cover one a frame)
  }
}
