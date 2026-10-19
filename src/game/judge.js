// Judging: hits, GUAPA pairs, holds, balloons and the collapse, plus the autoplay and advance ticks.
import { quality, eventAge } from './progress.js';
import { pick } from '../scene/models.js';
import { CELEBRATE } from './bubble-rules.js';
import { drain, warnings } from './energy.js';
import { G, clock, chip, afterActive, bigPending, JUDGE_WORDS, isDown, down, songTime, balloonAt, HANDOFF, setBigPending } from './state.js';
import { bubbles, talkState, bubble } from '../hud/bubbles.js';
import { updateControls } from '../ui/controls.js';
import { ringFx, ringSparks } from '../hud/lane.js';
import { C, DIRC, DIRLT } from '../hud/sprites.js';
import { themed } from '../game/figure-theme.js';
import { grooveHit, GROOVE, settleGroove, shoveRing } from '../scene/crowd.js';
import { M, act, trauma, stumble, setTrauma } from '../scene/mula-motion.js';
import { CALM, AUTOPLAY, WIN } from '../core/env.js';
import { PRAISE, headline } from '../hud/praise.js';
import { burst } from '../scene/confetti.js';
import { balloonFx } from '../hud/balloon.js';
import { syncPad } from '../ui/pad.js';
import { dracCrema, dracPump, dracEndTraca } from '../scene/drac-show.js';

export function collapse() {
  G.collapseT = clock;
  chip.stop();
  chip.sfx('crash');
  const fell = G.collapseT;
  afterActive(700, () => { if (G.collapseT === fell) chip.sfx('laugh'); }); // not once the run was left (toTitle, a new run)
  bubbles.length = 0;
  G.judge = null; G.praise = null; G.ring = null;
  G.hold = null; setBigPending(null);
  updateControls();
}
// One judgement, in the order things happen: the tally and what the lane shows, the phrase it belongs to, then what a miss
// or a hit does to the score, the mulassa, the crowd and the sound, then the ànim. (landed and missed hold the scoring;
// the rest is how the plaça reacts.)
export function judge(n, kind) {
  tally(n, kind);
  showJudgement(n, kind);
  trackPhrase(n, kind);
  talkState(); // recovery keeps the plaça quiet while the player struggles
  if (kind === 'miss') missed();
  else landed(n, kind);
  G.guapo = quality(G.counts);
  cheer(n, kind);
  if (kind === 'miss' && n.end && !n.balloon && !n.tail) { n.dropAt = n.t; endHold(n, 'miss', n.detail); } // head missed: the whole hold is lost, greyed out
}
function tally(n, kind) {
  n.hit = kind;
  G.counts[kind]++;
  if (kind !== 'perfect' && !n.balloon) G.errors[{ MOVIMENT: 'move', AVIAT: 'early', 'SENSE TOC': 'silent', 'ELS DOS ALHORA!': 'both', 'HAS DEIXAT ANAR': 'hold' }[n.detail] ?? 'late']++;
}
function showJudgement(n, kind) {
  G.judge = G.collapseT ? null : { kind, t: clock, detail: n.detail, word: JUDGE_WORDS[kind] };
  if (!G.collapseT) ringFx(kind, n.balloon ? C.gold : DIRC[n.input], kind === 'miss' || n.tailOf ? '' : themed({ L: 'GUA!', R: 'PA!', B: 'GUAPA!' }[n.input])); // GUA-PA!
}
function trackPhrase(n, kind) {
  if (G.activePhrase !== n.phrase) {
    if (G.activePhrase != null) {
      const value = quality(G.phraseCounts);
      if (value >= 85) grooveHit(GROOVE.phrase); // a phrase well played: the plaça nods a little more (no applause over the song: it hissed)
    }
    G.activePhrase = n.phrase;
    G.phraseCounts = { perfect: 0, good: 0, miss: 0 };
  }
  G.phraseCounts[kind]++;
}
function missed() {
  G.combo = 0;
  G.streak++;
  M.missT = clock;
  settleGroove(GROOVE.miss); // the crowd settles sooner, nothing more
  chip.sfx('miss');
  if (G.streak === 1 || (G.streak < 6 && Math.random() < 0.35)) M.peekT = clock;
  bubbles.length = 0;
  if (G.streak % 3 === 2) chip.sfx('ooh');
}
function landed(n, kind) {
  G.streak = 0;
  G.combo++;
  G.maxCombo = Math.max(G.maxCombo, G.combo);
  n.pts = ((kind === 'perfect' ? 300 : 100) + Math.min(G.combo, 100) * 2) * (G.doublePoints ? 2 : 1); // x2 in the finale, from 70%
  G.score += n.pts;
  G.flash = clock;
  M.biteT = clock;
  if ((n.big || n.input === 'B') && !CALM.matches) shoveRing();
  grooveHit((kind === 'perfect' ? GROOVE.hit : GROOVE.good) * (n.big || n.input === 'B' ? GROOVE.big : 1), n.input === 'L' ? 1 : n.input === 'R' ? -1 : 0);
  if (!G.watch) chip.sfx(kind); // the player's own tick: the dance demo has no player
  if (n.big || n.input === 'B') chip.sfx('eh'); // and the plaça yells «eeh!»
  if (PRAISE[G.combo]) { // big encouraging word, stronger the longer the combo
    const [word, tier] = PRAISE[G.combo];
    if (G.practice) headline(word, tier, 2, 1.4, Math.random(), true); // a celebration: big, even in the practice
    chip.sfx('fanfare' + tier);
    if (tier >= 2) burst(M.pos.x, M.pos.y, 'combo');
  }
  if (G.combo >= 20 && Math.random() < 0.25) bubble(pick(CELEBRATE), null, C.red, 'celebrate'); // on a roll: the plaça cheers if the chart leaves room
}
// L'ÀNIM DE LA PLAÇA (energy.js): every judgement moves it; empty, the mulassa falls apart, on every difficulty.
// The meter pulses as it sinks (once per dip). The practice never fails and autoplay never drains.
function cheer(n, kind) {
  if (G.practice || AUTOPLAY || G.watch || G.collapseT) return;
  const special = kind !== 'miss' && (n.big || (kind === 'perfect' && (n.balloon || n.tailOf))); // GUAPA pair, MANTINGUT, PAM!
  G.energy = drain(G.energy, G.diff, kind, special);
  if (special) G.energyT = clock; // the bar flashes
  if (warnings(G.energy, G.energyWarn).length) G.energyWarnT = clock; // same thresholds, a quiet meter pulse
  if (G.energy <= 0) collapse();
}
function pump(n) {
  n.count++;
  G.pumpT = clock;
  balloonFx?.pump(n.count % 2 ? 1 : -1);
  ringSparks(3, n.count % 2 ? C.gua : C.pa, 30); // a few sparks off the ring in the tapped side's colour
  act(n.count % 2 ? 'L' : 'R');
  grooveHit(n.count % n.need ? GROOVE.pump : GROOVE.big); // each pump a small nod, the pop a GUAPA's
  G.score += 50 * (G.doublePoints ? 2 : 1);
  const k = (n.count % n.need || n.need) / n.need, t0 = chip.ctx.currentTime, traca = dracPump(n); // the Drac: a traca's petard (and the TRO) instead
  if (!traca) chip.blip(t0, 300 + k * 700, 500 + k * 900, 0.06, 0.05, 'triangle'); // rising pitch as it fills
  if (!traca) chip.noiseHit(t0, 0.05, 0.12, 'bandpass', 900 + k * 1500, 2); // pff of air
  if (n.count % n.need) return;
  const pops = n.count / n.need;
  G.pop = { t0: clock, word: pops > 1 ? `PAM! x${pops}!` : 'PAM!' };
  if (!traca) balloonFx?.pop();
  G.popT = clock; G.holdDone = { t0: clock, dir: 'B' }; // the pop hits the lane too: a gold shockwave runs along it, the ring and the bar punch (below)
  setTrauma(Math.min(1, trauma + 0.22));
  if (G.practice) headline(G.pop.word, 3, 3, 0.9);
  G.score += 300 * n.need * (G.doublePoints ? 2 : 1);
  act('B'); // the pop: the bounded GUAPA lift
  if (!traca) {
    chip.noiseHit(t0, 0.08, 0.55, 'bandpass', 1800, 0.7); // the pop: a short bright burst of air
    chip.noiseHit(t0 + 0.02, 0.3, 0.2, 'lowpass', 900); // and its tail
    chip.blip(t0, 700, 180, 0.12, 0.07, 'sine'); // a soft drop, no buzz
  }
  burst(M.pos.x, M.pos.y);
  bubble(themed(pick(['PAM!', 'HA PETAT!', 'VISCA!'])), null, C.red);
  ringFx('pop', C.gold);
}
function endBalloon(n) { // time's up: any pop is perfect, half-inflated still good
  dracEndTraca(n);
  n.detail = n.count >= n.need ? `${n.count} TOCS` : n.count ? 'MÉS RÀPID!' : 'SENSE TOC';
  judge(n, n.count >= n.need ? 'perfect' : n.count * 2 >= n.need ? 'good' : 'miss');
  if (G.practice && n.count) headline(`${n.count} TOCS!`, n.count >= n.need * 2 ? 2 : n.count >= n.need ? 1 : 0, 3, 1.4, 0.5); // the tally wins over its own PAM!
}
// GUAPA (Taiko's big notes, GUA + PA): on every level it wants both buttons, the second within bothWin() of the
// first (Space is both): double points and the GUAPA! burst, timing judged on the first press. One button alone
// is an ERROR once the window closes. FÀCIL just gets a wider window. The partner press is always
// swallowed so it cannot eat the next note.
const bothWin = () => (G.diff === 0 ? 0.15 : 0.08);
function guapaHit(n) {
  n.gran = true;
  act('B');
  G.score += n.pts;
  chip.sfx('gran');
  dracCrema(); // the Drac: the CREMA (flames and smoke)
  ringFx('gran', C.gold, themed('GUAPA!'));
  setTrauma(Math.min(1, trauma + 0.15));
}
function settleBig(t) { // the pairing window closed with one button only
  const bp = bigPending;
  if (!bp || t - bp.t <= bothWin()) return;
  setBigPending(null);
  if (bp.done) return;
  bp.n.detail = 'ELS DOS ALHORA!';
  judge(bp.n, 'miss');
}
// MANTÉN (holds, NORMAL and DIFÍCIL): the head is a tap; then keep its button down until the end of the tail.
// While held the tail is eaten at the ring with a steady trickle of points; the tail is judged once, when you
// let go or it ends: 90%+ held PERFECTE, half BÉ, less ERROR. A hold is two judgements, head and tail.
const HOLD_GRACE = 0.12; // letting go this close to the end counts as holding to the end
function endHold(n, kind, detail = '') {
  n.tail = kind;
  if (G.hold?.n === n) G.hold = null;
  judge({ phrase: n.phrase, input: n.input, tailOf: n, detail }, kind);
}
export function settleHold(t) {
  const h = G.hold;
  if (!h) return;
  const n = h.n, len = n.end - n.t, held = h.auto || isDown(n.input);
  const upTo = Math.min(Math.max(t, n.t), n.end);
  if (held && upTo > h.got) { // steady trickle while held
    h.pts += (upTo - h.got) / len * 400 * (G.doublePoints ? 2 : 1);
    const whole = Math.floor(h.pts); G.score += whole; h.pts -= whole;
    h.got = upTo;
    if (clock - (h.sparkT ?? -9) > 0.05) { h.sparkT = clock; ringSparks(3, Math.random() < 0.4 ? C.gold : Math.random() < 0.5 ? DIRC[n.input] : DIRLT[n.input], 26); }
  }
  if (held && t < n.end) return;
  const frac = t >= n.end - HOLD_GRACE ? 1 : (h.got - n.t) / len; // let go early: judged on what was held
  if (frac < 1) n.dropAt = h.got; // the rest of the tail greys out
  endHold(n, frac >= 0.9 ? 'perfect' : frac >= 0.5 ? 'good' : 'miss', frac >= 0.9 ? '' : frac >= 0.5 ? 'MANTÉN MÉS' : 'HAS DEIXAT ANAR');
  if (frac >= 0.9) { ringFx('gran', DIRC[n.input]); G.holdDone = { t0: clock, dir: n.input }; if (G.practice) headline('MANTINGUT!', 0, 3, 0.9); } // held to the end: burst; the practice also names it
}
export function releaseAll() { down.keys.clear(); down.ptr.clear(); syncPad(); if (G.state === 'play' && !G.paused) settleHold(songTime()); }
// e: the input event. A tap is judged at its timeStamp on the de-stepped song clock: one that waited behind a long
// frame counts when it happened, not when its handler ran (eventAge, progress.js: capped at 0.5 s, foreign stamps = now).
export const eventAt = e => { const now = performance.now(); return now - eventAge(e?.timeStamp, now) * 1000; };
export function press(dir, e) {
  if (G.state !== 'play' || G.collapseT || G.paused || G.watch) return; // the dance demo plays itself
  const t = songTime(eventAt(e)), bl = balloonAt(t);
  G.tapT = clock;
  if (bl) { pump(bl); return; } // never a wrong move, never spills onto the next note
  settleBig(t);
  const bp = bigPending;
  if (bp && dir !== bp.dir && dir !== 'P' && (dir === 'L' || dir === 'R')) { // the partner press of a GUAPA pair
    setBigPending(null);
    if (!bp.done) { bp.n.detail = bp.detail; judge(bp.n, bp.kind); guapaHit(bp.n); }
    return;
  }
  for (let i = G.next; i < G.chart.length; i++) {
    const n = G.chart[i];
    if (n.t - t > WIN.miss) break;
    if (n.hit || n.balloon || n === bp?.n) continue;
    const dt = Math.abs(t - n.t);
    if (dt > WIN.miss) continue;
    const kind = dt <= WIN.perfect ? 'perfect' : dt <= WIN.good ? 'good' : 'miss', detail = dt <= WIN.perfect ? '' : t < n.t ? 'AVIAT' : 'TARD';
    if (n.big) {
      if (kind === 'miss' || dir === 'P') { // a timing miss or Space: judged right away
        n.detail = detail;
        judge(n, kind);
        if (kind !== 'miss') guapaHit(n);
        if (kind !== 'miss') setBigPending({ n, dir, t, done: true });
      } else setBigPending({ n, dir, t, kind, detail }); // waits for the other button
      return;
    }
    if (n.input !== dir) { // wrong move: the portadors trip over each other and the mulassa stumbles
      chip.sfx('bonk');
      stumble(dir);
      if (G.practice) headline('PATAPAM!', 'bonk', 2, 1);
      n.detail = 'MOVIMENT';
      judge(n, 'miss');
      return;
    }
    n.detail = detail;
    judge(n, kind);
    if (kind !== 'miss') act(n.input); // only a hit moves her: a late/early miss just weakens the dance
    if (n.end && kind !== 'miss') G.hold = { n, got: n.t, pts: 0 };
    return;
  }
  // free-style presses with no note nearby are not punished
}
// autoplay judges directly so a throttled tab (sparse frames) still plays clean
export function autoplay(t) {
  for (let i = G.next; i < G.chart.length && G.chart[i].t <= t; i++) {
    const n = G.chart[i];
    if (n.hit) continue;
    if (!n.balloon) { // both buttons on a GUAPA, and holds kept down to the end
      if (!n.big) act(n.input); // a GUAPA's accent comes from guapaHit
      judge(n, 'perfect');
      if (n.big) guapaHit(n);
      if (n.end) G.hold = { n, got: n.t, pts: 0, auto: true };
      continue;
    }
    while (n.count < (Math.min(t, n.end - HANDOFF) - n.t) * 12) pump(n); // mashes at a human 12 taps/s
  }
}
export function advance(t) { // time moves on: close GUAPA pairs and holds, judge what went by untouched
  settleBig(t);
  settleHold(t);
  while (G.next < G.chart.length) {
    const n = G.chart[G.next];
    if (n === bigPending?.n) break; // still waiting for its second button
    if (!n.hit && n.balloon && t >= n.end) endBalloon(n);
    else if (!n.hit && !n.balloon && t - n.t > WIN.miss) { n.detail = 'SENSE TOC'; judge(n, 'miss'); }
    if (n.hit) G.next++; else break;
  }
}
