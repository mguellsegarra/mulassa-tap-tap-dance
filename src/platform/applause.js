// 5 s of applause: ~3000 claps from ~150 people, each a short noise burst with its own
// colour and decay; the density swells in and settles, like a real crowd. ~160 ms of maths on a laptop (4x that on
// a phone) was the freeze after TOCA LA PANTALLA; sliced into idle moments it still ate ~10 ms of every phone frame
// for a second or two (Safari has no requestIdleCallback: the slices are plain timers), right when a slow first load
// lifts the page cover. The per-sample Math.exp and Math.random were most of it: the decay is now a running product
// and the noise an xorshift (the same sound), ~4x cheaper, a few people per slice; finish() completes it at once if
// the applause is wanted before (never in practice: the first clap is at the end of a run).
export function applause(ctx, idle = globalThis.requestIdleCallback ?? (f => setTimeout(f, 16))) {
  const sr = ctx.sampleRate, len = sr * 5, buf = ctx.createBuffer(2, len, sr);
  let p = 0, s = (Math.random() * 2 ** 31) | 1; // people clapping so far, over both channels; the noise's state (never 0)
  const person = () => {
    const d = buf.getChannelData(p++ < 150 ? 0 : 1);
    const rate = 3.2 + Math.random() * 2.5, bright = 0.2 + Math.random() * 0.7, amp = 0.04 + Math.random() * 0.08;
    for (let t = Math.random() / rate; t < 5; t += (1 / rate) * (0.85 + Math.random() * 0.3)) {
      const start = Math.floor(t * sr), dec = sr * (0.004 + Math.random() * 0.006), k = Math.exp(-1 / dec);
      const n = Math.min(Math.ceil(dec * 5), len - start);
      let lp = 0, e = amp; // e = amp · exp(-i / dec), one multiply a sample
      for (let i = 0; i < n; i++) {
        s ^= s << 13; s ^= s >>> 17; s ^= s << 5; // xorshift32: white noise in [-1, 1)
        lp += bright * (s / 2147483648 - lp); // one-pole colour per clap
        d[start + i] += lp * e; e *= k;
      }
    }
  };
  const job = { get done() { return p >= 300; }, finish() { while (p < 300) person(); return buf; } };
  const slice = () => { for (let k = 0; k < 6 && p < 300; k++) person(); if (p < 300) idle(slice); };
  idle(slice);
  return job;
}
