// The Bou's festa on the people (bou-parade.js), as the crowd reads it (scene/crowd-effects.js): how wild the plaça goes,
// the conga that runs behind the carried Bou, its bounce on every beat and its arms.
import { BOU_FESTA } from './bou-stage.js';
import { paradeTick, paradeSteer, PARADE_K } from './bou-parade.js';

export const BOU_CROWD = {
  festa: () => BOU_FESTA.k, // 0 but while the Bou is held up over the colla's heads
  tick: paradeTick,
  steer: (p, dt) => !!p.parade && paradeSteer(p, dt), // running behind the carried Bou, or walking back
  pace: p => (p.parade ? PARADE_K.run * 1.3 : 0), // the snake runs: its drawn bodies may catch up this fast (m/s)
  hop: (p, beat, festa) => (p.parade === 'run' ? festa * PARADE_K.hop * Math.abs(Math.sin(beat * Math.PI + p.ph * 0.2)) : 0), // the conga bounces on every beat
  // the conga's arms: the ones at its rump reach out to touch it, grabbing; the rest clap on the beat, hands up high
  // (A: the arm targets tx / tz, written in place). Returns how much the conga holds them (no counter-swing then).
  arms(p, beat, clock, festa, A) {
    const conga = p.parade === 'run' ? festa : 0, touch = p.paradeSlot < PARADE_K.tail;
    p.conga = conga; p.congaUp = touch || Math.floor(beat / 4 + p.ph) % 2 === 0; // (read by the stand-ins: representation.js)
    if (conga && touch) { A.tx += (-1.75 + Math.sin(clock * 11 + p.ph) * 0.3 - A.tx) * conga; A.tz += (0.1 + Math.sin(clock * 7 + p.ph) * 0.1 - A.tz) * conga; }
    else if (conga) { // euphoric: a bar clapping on the beat, a bar both arms up waving, each on their own bar
      const up = Math.floor(beat / 4 + p.ph) % 2 === 0;
      if (up) { A.tx += (-2.85 + Math.sin(beat * Math.PI + p.ph) * 0.2 - A.tx) * conga; A.tz += (0.3 + Math.sin(beat * Math.PI) * 0.15 - A.tz) * conga; }
      else { A.tx += (-1.9 - A.tx) * conga; A.tz += (0.08 + Math.abs(Math.sin(beat * Math.PI)) * 0.42 - A.tz) * conga; }
    }
    return conga;
  },
};
