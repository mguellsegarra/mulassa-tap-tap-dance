// The Crush's music, played live. It starts on the first tap, as iOS requires.
import { audioOut } from './sound.js';
import { createSequencer } from './sequencer.js';
import { BALL_DE_LA_MULASSA } from './melody.js';

const MUSIC_GAIN = .42; // under the pops
// `score` is the share of the level's goal collected: voices come in as the player closes on it.
const bpmFor = p => 126 + 14 * p;
const layersFor = p => ({ bass: 1, kick: p >= .25 ? 1 : 0, shaker: p >= .5 ? 1 : 0, octave: p >= .8 ? 1 : 0 });

let ctx = null, seq = null, timer = 0;
const pump = () => seq.schedule(ctx.currentTime + .3); // well ahead of the timer: a late tick must not leave a gap
const onVisibility = () => { if (document.hidden) ctx?.suspend(); else ctx?.resume(); };

export function startAudio() {
  const out = audioOut();
  ctx = out.ctx;
  if (!seq) seq = createSequencer(ctx, out.out, BALL_DE_LA_MULASSA, bpmFor, layersFor);
  seq.start(0);
  seq.gain(MUSIC_GAIN);
  clearInterval(timer);
  timer = setInterval(pump, 80);
  pump();
  document.addEventListener('visibilitychange', onVisibility);
}

export function setProgress(share) { seq?.setLevel(Math.min(1, share)); }

export function stopAudio() {
  clearInterval(timer);
  seq?.gain(0); // what is queued fades out instead of cutting
  document.removeEventListener('visibilitychange', onVisibility);
}
