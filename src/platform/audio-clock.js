// The de-stepped audio clock every song-time read goes through (Chip.now, the menu loop's beat, the sync calibration).
import { Q } from '../core/flags.js';
// What the browser says it takes a sample to reach the speakers. Chip.now() and the sync calibration's
// Clicker.heard() both subtract it, so the calibrated offset only holds the delay nobody reports.
export const latency = ctx => ctx.outputLatency || ctx.baseLatency || 0;
// ?rawclock (dev A/B): the old stepped clock, ctx.currentTime read directly, the latency re-read on every call.
export const RAW = Q.has('rawclock');
// The audio clock without its steps. ctx.currentTime only moves when the audio thread renders a buffer (5.3 ms on a
// Mac, 10–40 ms on Linux and phones), so a direct read is 0..1 buffer late, differently every time: the lane stuttered
// and every judgement carried that noise. Against performance.now() the two clocks keep a steady offset: each read
// (currentTime − perf) is at most that offset, and a read that finds the clock moved since the previous one bounds it
// from above (the buffer came after that read). o, the upper envelope of the reads (sinking 0.2 ms/s, so an audio clock
// a little slower than the system's is followed), is the offset; halfway to the upper bound when the two are within
// 2 ms (reads denser than the buffers, e.g. 2048 samples at 60 Hz). at(perfMs) is then the audio clock at any moment
// (a frame's rAF time, an input event's timeStamp), smooth, monotonic, within ~1 ms. Re-anchored on a new run, while
// the context is suspended (the audio clock stops, performance.now doesn't: at() reads the held clock) and on a jump
// > 50 ms, each time waiting for the clock to move again (a resumed device takes a moment, a stall must end). A
// shorter stall shows as a whole window of reads under the envelope: it sinks to them at 20 ms/s, still monotonic.
// latency(): the output latency latched per run, the median of its first 0.5 s (re-read per call it was noise too).
export function audioClock(ctx, { drift = 0.0002, jump = 0.05, window = 2000, slack = 0.005, narrow = 0.002, perf = () => performance.now() } = {}) {
  let o = NaN, u = NaN, held = NaN, last = 0, pa = NaN, best = -Infinity, winT = 0, sink = NaN, latT = NaN, latP = -1e9;
  const lats = [];
  const running = () => !ctx.state || ctx.state === 'running';
  return {
    reset() { o = NaN; held = ctx.currentTime; }, // a new anchor once the clock moves
    run() { this.reset(); lats.length = 0; latT = NaN; }, // a new run: the latency is latched again too
    at(perfMs) {
      const a = ctx.currentTime, p = perf();
      perfMs ??= p;
      if (!running()) { o = NaN; held = a; return a; } // suspended: the audio clock stands still
      if (a === held) return a; // re-anchoring: until the clock moves on
      held = NaN;
      const s = a - p / 1000, dt = Math.max(0, p - last) / 1000;
      if (o === o) { o -= (o > sink ? 0.02 : drift) * dt; u += drift * dt; }
      if (o === o && !(Math.abs(s - o) <= jump)) { o = NaN; held = a; return a; } // a seek-sized jump or a stall
      if (o !== o) { o = best = s; u = Infinity; winT = p; sink = NaN; }
      else if (a > pa) u = Math.min(u, a - last / 1000); // it moved since the last read: the tick came after it
      o = Math.max(o, s); best = Math.max(best, s); pa = a; last = p;
      if (p - winT >= window) { sink = o - best > slack ? best : NaN; best = -Infinity; winT = p; }
      const w = u - o; // the offset is in [o, u]: halfway when that is narrow (reads denser than the buffers), else o
      return perfMs / 1000 + o + (w > 0 ? Math.max(0, Math.min(w, 2 * narrow - w)) / 2 : 0);
    },
    latency() {
      const l = latency(ctx), p = perf();
      if (!running()) return lats.length ? lats[lats.length >> 1] : l;
      if (latT !== latT) latT = p;
      if (p - latT <= 500 && p - latP >= 8 && lats.length < 64) { // sorted as it goes: the median is the middle one
        let i = lats.length;
        while (i && lats[i - 1] > l) i--;
        lats.splice(i, 0, l); latP = p;
      }
      return lats[lats.length >> 1] ?? l;
    },
  };
}
