// A free-mode landing's «BUUUM» (Chip.sfx 'thud'): a sub-bass sine that falls in pitch (plus a partial an octave up so
// phone speakers carry it), low-passed noise for the cobbles and a longer, duller tail for the cardboard shell.
// Everything decays, nothing buzzes. At weight 1 (the Mulassa): [sub start Hz, sub end Hz, sub length s, cobbles' lowpass Hz,
// tail s]. Three to audition with ?thud=sec|cos|cavern; the figure's weight (figures.js) lowers and lengthens each.
const THUDS = { cos: [90, 40, 0.32, 320, 0.45], sec: [115, 55, 0.2, 520, 0.18], cavern: [75, 32, 0.5, 220, 0.8] };
const style = () => { try { return THUDS[new URLSearchParams(location.search).get('thud')] ?? THUDS.cos; } catch { return THUDS.cos; } };

// weight: 1 = the Mulassa, lower / longer / louder above it; speed: m/s at contact (a 4.8 m/s jump = ~0.95 of full level)
export function playThud(chip, when, speed, weight) {
  const ctx = chip.ctx, [f0, f1, len, lp, tail] = style(), w = weight, k = Math.min(1.2, Math.max(0.3, speed / 5)), amp = 0.5 * k * (0.8 + 0.2 * w);
  const hit = (src, dur, peak, cutoff) => {
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(peak, when + 0.008);
    g.gain.exponentialRampToValueAtTime(0.001, when + dur); // it rings out, it doesn't hold
    if (cutoff) { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = cutoff; src.connect(f).connect(g); } else src.connect(g);
    g.connect(chip.bus || chip.out);
    chip.voice(src).start(when, cutoff ? Math.random() : undefined); src.stop(when + dur + 0.02);
  };
  const sub = (mult, dur, peak, drop) => { // drop: how far the weight lowers it (the partial only half as much, so it stays audible)
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(f0 * mult / drop, when);
    o.frequency.exponentialRampToValueAtTime(f1 * mult / drop, when + dur);
    hit(o, dur, peak);
  };
  sub(1, len * w, amp, w);
  sub(2.1, len * w * 0.45, amp * 0.3 * w, Math.sqrt(w)); // the Drac's 154→69 Hz partial carries it on a phone
  for (const [dur, peak, cutoff] of [[0.14 * w, 0.45 * k, lp / Math.sqrt(w)], [tail * w, 0.16 * k, 150 / Math.sqrt(w)]]) {
    const n = ctx.createBufferSource();
    n.buffer = chip.noise;
    hit(n, dur, peak, cutoff);
  }
}
