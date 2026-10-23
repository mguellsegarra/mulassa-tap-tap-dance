// The count-in banner and the judgement and resume overlays.
import { tr } from '../i18n/messages.js';
import { G, clock, balloonShown, songTime } from '../game/state.js';
import { C } from './sprites.js';
import { H, W } from './canvas.js';
import { lane, BANNER } from './layout.js';
import { textWidth, text } from './primitives.js';
import { playFrom } from '../core/env.js';
import { DETAIL } from '../game/judge-words.js';
import { countInPhase, startCueAt, hasRecordedIntro } from '../game/figure-song.js';
import { bigWord, elastic } from './praise.js';

const GO_WORD = tr('hud.banner.go'), READY_WORD = tr('hud.banner.ready');
export function drawJudge() {
  if (G.practice && G.praise && !G.praise.big && clock - G.praise.t0 < G.praise.dur) return; // practice praise shares the compact slot
  if (!G.judge || clock - G.judge.t >= 0.5 || balloonShown(songTime())) return; // a GLOBUS hangs right there
  const k = (clock - G.judge.t) / 0.5, pop = 0.94 + 0.06 * Math.max(0, 1 - k * 5); // quick pop, then settle
  const col = { perfect: C.gold, good: C.cream, miss: C.blue }[G.judge.kind], str = G.judge.word;
  H.globalAlpha = k > 0.7 ? (1 - k) / 0.3 : 1;
  const { bottom, hx, sb: s } = lane(), x = Math.max(hx, textWidth(str, 10 * s * pop) / 2 + 6); // phones: the ring is near the edge, the word stays whole (even as it pops)
  const y = bottom + 16 * s; // fixed slot: it pops in place, never drifts into the headline
  text(str, x, y, 10 * s * pop, col);
  if (G.judge.detail && (G.practice || G.judge.detail === DETAIL.both || G.judge.detail === DETAIL.hold)) text(G.judge.detail, x, y + 14 * s, 8 * s, C.cream);
  H.globalAlpha = 1;
}
export function drawResume() { // 3, 2, 1 after a pause, on the same pulse as the start's count-in
  const phase = countInPhase(songTime(), G.resuming), i = Math.floor(phase);
  if (i < 0 || i > 2) return;
  const big = BANNER.big(), y = lane().bottom + 10 + big * 0.55;
  bigWord(String(3 - i), W / 2, y, big * elastic(Math.min(1, (phase - i) * 4)), BANNER.count, 0, W - 12, big);
}
export function drawBanner(t) {
  if (G.collapseT) return;
  // count-in locked to the timbal: each number appears exactly on its hit, BALLA! on the song's first beat
  // in the band under the lane (the headline slot and a bit more), above the mulassa's body
  const b0 = startCueAt(playFrom), phase = countInPhase(t, b0);
  const big = BANNER.big(), y = lane().bottom + 10 + big * 0.55;
  if (t < b0) {
    if (phase < 0) text(READY_WORD, W / 2, y, BANNER.ready(), C.cream);
    else {
      const i = Math.floor(phase), frac = phase - i; // frac 0 = right on the hit
      bigWord(String(3 - i), W / 2, y, big * elastic(Math.min(1, frac * 4)), BANNER.count, 0, W - 12, big);
    }
  }
  else if (t < b0 + 0.7 && (t < G.go || hasRecordedIntro(playFrom))) bigWord(GO_WORD, W / 2, y, BANNER.go() * elastic(Math.min(1, (t - b0) * 5)), BANNER.goCols, -0.05, W - 12, BANNER.go());
}
