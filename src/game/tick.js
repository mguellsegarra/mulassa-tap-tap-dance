// One frame of the game's rules: the play clock's section and claps, the finale's triggers (fireworks, confetti, the chant),
// the meters' easing, autoplay, judging and the end of the run; on the selector, the demo dance on the menu loop's beat.
// An orchestrator like flow.js: it fires the scene's and the HUD's effects, so it may reach them (tests/build/modules.mjs).
import { song, beatAt, FINALE_T } from './figure-song.js';
import { sectionAt } from './chart.js';
import { judgedCount } from './progress.js';
import { Q, playFrom, AUTOPLAY } from '../core/env.js';
import { traitsOf } from '../figures/index.js';
import { PHOTO } from './photo-control.js';
import { afterActive, G, chip, clock, bigPending } from './state.js';
import { REEL } from './showreel.js';
import { figTheme } from './figure-theme.js';
import { autoplay, advance } from './judge.js';
import { practiceTick, finish } from './flow.js';
import { BOU_FINALE, bouHolds } from '../figures/bou/bou-bills.js';
import { spawnConfetti, burst, setConfettiSettled } from '../scene/confetti.js';
import { firework } from '../scene/fx.js';
import { rnd } from '../scene/models.js';
import { M, act } from '../scene/figure-springs.js';
import { trauma, setTrauma } from '../scene/manual-jump.js';
import { headline } from '../hud/praise.js';

// t: the song now; vt: what is drawn; beat: the menu loop's (or the song's before play); returns the beat the scene draws
export function tickGame(t, vt, beat, dt) {
  if (G.state === 'play' && !G.paused) {
    beat = beatAt(Math.max(0, vt));
    const sec = t < playFrom ? G.sec : sectionAt(song, t);
    G.sec = sec; // solemn (A) or playful (B): drives the dancers' mood
    if (Math.floor(beat) !== G.clapBeat) { // section B: a few hands on beats 2 and 4, louder on a streak (audio.js clapBurst)
      G.clapBeat = Math.floor(beat);
      if (sec === 'B' && (G.clapBeat & 1) && G.combo >= 5 && !G.collapseT) chip.clapBurst?.(0.04 + 0.05 * Math.min(1, G.combo / 30));
    }
    // FINAL ESBOJARRAT: the coda until the last hit and the crowd's "eeeeh!" (Taiko's go-go time)
    // The festa (fireworks, lights, crowd, chant) is for everyone; only the double points need >= 70%.
    const fin = t >= FINALE_T && t < song.tail + 0.6 && !G.collapseT, dbl = fin && G.guapo >= 70;
    if (fin && !G.finale) { G.finaleT = clock; chip.sfx('fanfare3'); firework(); firework(); }
    if (dbl && !G.doublePoints) G.doubleT = clock; // the x2 tag pops when the bonus starts (maybe mid-finale)
    G.finale = fin; G.doublePoints = dbl;
    if (fin && Math.floor(beat) !== G.finBeat) { // every beat: a firework, a puff of confetti, a thump
      G.finBeat = Math.floor(beat);
      firework();
      setConfettiSettled(false);
      spawnConfetti(50, c => { c.p.set(M.pos.x + rnd(-3, 3), rnd(5, 7), M.pos.y + rnd(-3, 3)); c.v.set(rnd(-2, 2), rnd(0, 2), rnd(-2, 2)); });
      setTrauma(Math.min(1, trauma + 0.12));
    }
    if (t >= song.end && G.next >= G.chart.length && !G.hold && !bigPending && !G.eeeh && !G.collapseT) { // the "eeeeh!": grand finale volley, for everyone
      G.eeeh = true;
      for (let i = 0; i < 6; i++) afterActive(i * 180, () => { if (G.state === 'play') firework(rnd(-10, 10), rnd(10, 15), rnd(-10, 3), 90); });
      burst(M.pos.x, M.pos.y, 'end'); // (the Bou: its banknotes, bou-show.js)
      // the crowd's chant, in its own rhythm: "guapa, guapa... i guapa!"
      figTheme.chant.forEach(([w, at, dur]) => afterActive(at * 1000, () => { if (G.state === 'play') headline(w, 'rainbow', 4, dur, 0.5); }));
      setTrauma(1);
    }
    if (judgedCount(G.counts) > 1) G.shown += (G.guapo - G.shown) * Math.min(1, dt * 4); // the meter eases, it never jumps
    else G.shown = G.guapo; // ...except onto the first judged note: it starts from the real value, not 0
    G.shownE += (G.energy - G.shownE) * Math.min(1, dt * 8); // so does the ànim, a bit quicker
    if ((AUTOPLAY || G.watch) && !G.collapseT) autoplay(t);
    if (!G.collapseT) {
      advance(t);
      if (G.practice) practiceTick(t);
      else if (BOU_FINALE.go || t > song.tail + 1 && !bouHolds()) finish('end'); // (the Bou: its banknotes' close-up waits for a tap, and a tap goes on at once)
    } else if (clock - G.collapseT > 3.5) finish('collapse');
  } else if (G.state === 'select' && !REEL.on && Math.floor(beat) !== G.lastBeat) { // demo dance on the menu
    G.lastBeat = Math.floor(beat);
    if (G.lastBeat % 2 === 0 && !Q.has('still') && !(PHOTO.on && traitsOf(PHOTO.id).springs)) act('LDRU'[(G.lastBeat / 2) % 4]);
  }
  return beat;
}
