// The frame pacer and the smoothed clock the lane is drawn on.
import { framePacer, smoothClock } from '../platform/render-quality.js';
import { Q } from './env.js';

export const pace = framePacer(); // 120 Hz screens: the full rate while it keeps up, else an even 60 (render-quality.js)
export const RAWCLOCK = Q.has('rawclock'); // ?rawclock: the old stepped audio clock (audio.js), read when the frame runs, to compare
// The lane is drawn on the de-stepped audio clock through smoothClock (render-quality.js): equal to it while the audio
// runs evenly, but when the audio device itself jumps a few ms (an output glitch; measured: +4.3 ms at the same spot
// of every run on a Mac, a 4 px pop of every note) the notes ease onto it over ~0.25 s instead. Seeks and restarts
// (> 100 ms) still snap. Judging keeps the audio clock itself (t, press()).
export const viewClock = RAWCLOCK ? a => a : smoothClock();
