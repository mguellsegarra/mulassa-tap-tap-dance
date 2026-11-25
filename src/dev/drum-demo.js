// ?drumdemo (dev hosts only): the lane's drum notes without a drum, a drum chart or the drum rules. Any run's chart is
// swapped, once it starts, for a fixed pattern of GUA (L), PA (R), GUAPA (B, big), a roll and a balloon, in the contract's note
// shape (docs/agents/drum-mode.md). With ?autoplay the notes are hit; a roll's `count` is made up here (12 a second),
// which is the rules' job in a real run. Only for looking at the drawing: the roll is born judged, so today's judge
// (which would play it as a hold) leaves it alone.
import { G, songTime } from '../game/state.js';
import { BEATS, beatAt, songTimeAtBeat } from '../game/figure-song.js';

// [beat in the 16-beat pattern, kind, length in beats]
const DRUM_DEMO = [[0, 'd'], [1, 'k'], [2, 'd'], [2.5, 'd'], [3, 'k'], [4, 'D'], [6, 'D'], [8, 'r', 3], [12, 'd'], [12.5, 'k'], [13, 'k'], [14, 'b', 2]];
export function setupDrumDemo() {
  let demo = null;
  const tick = () => {
    requestAnimationFrame(tick);
    if (G.state !== 'play' || G.practice || !G.chart?.length) return;
    if (G.chart !== demo) { // in place: the run's own start checks the array it was given
      const b0 = Math.ceil(beatAt(G.go)), notes = [];
      for (let b = b0; b + 16 < BEATS.length; b += 16) for (const [at, kind, len] of DRUM_DEMO) {
        const t = songTimeAtBeat(b + at), end = len ? songTimeAtBeat(b + at + len) : 0, base = { t, end, phrase: Math.floor((b + at) / 8), hit: null, count: 0 };
        notes.push(kind === 'r' ? { ...base, roll: true, input: 'P', hit: 'perfect' } : kind === 'b' ? { ...base, balloon: true, need: 12, input: 'P' }
          : { ...base, input: { d: 'L', k: 'R', D: 'B' }[kind], big: kind === 'D' });
      }
      G.chart.length = 0; G.chart.push(...notes);
      G.balloons = notes.filter(n => n.balloon); G.next = 0; G.drum = true;
      demo = G.chart;
    }
    const t = songTime();
    for (const n of G.chart) if (n.roll && t > n.t) n.count = Math.floor((Math.min(t, n.end) - n.t) * 12);
  };
  tick();
}
