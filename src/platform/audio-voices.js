// The synthesized voices (drums, blips, noise hits, claps and every sfx kind), mixed into Chip and the calibration's
// Clicker: `this` is the engine (ctx, out, bus, noise, applause, voice()).
import { playThud } from './landing-sound.js';

const hz = m => 440 * 2 ** ((m - 69) / 12);

export const VOICES = {
  bigDon(when) { // Taiko's big DON: a deep drum hit with a body thump and a tiny bright tick, no buzz
    const o = this.ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(130, when);
    o.frequency.exponentialRampToValueAtTime(52, when + 0.22);
    o.connect(this.env(when, 0.32, 0.55));
    this.voice(o).start(when); o.stop(when + 0.34);
    this.noiseHit(when, 0.06, 0.25, 'lowpass', 400); // skin thump
    this.blip(when, 1760, 1600, 0.03, 0.02, 'sine'); // a small shine on top
  },

  timbal(when, amp) {
    const o = this.ctx.createOscillator();
    o.frequency.setValueAtTime(170, when);
    o.frequency.exponentialRampToValueAtTime(75, when + 0.14);
    o.connect(this.env(when, 0.16, amp));
    this.voice(o).start(when); o.stop(when + 0.18);
    this.noiseHit(when, 0.07, amp * 0.3, 'bandpass', 2200);
  },

  env(when, dur, peak, dest = this.bus || this.out) {
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(peak, when + 0.01);
    g.gain.setValueAtTime(peak * 0.85, when + Math.max(0.012, dur * 0.8));
    g.gain.linearRampToValueAtTime(0, when + dur);
    g.connect(dest);
    return g;
  },

  noiseHit(when, dur, amp, type, freq, q = 0.8, dest) {
    const n = this.ctx.createBufferSource(), f = this.ctx.createBiquadFilter();
    n.buffer = this.noise; f.type = type; f.frequency.value = freq; f.Q.value = q;
    n.connect(f).connect(this.env(when, dur, amp, dest));
    this.voice(n).start(when, Math.random()); n.stop(when + dur + 0.02);
    return f;
  },

  blip(when, f0, f1, dur, amp, type = 'triangle') { // soft by default: square waves buzz on phone speakers
    const o = this.ctx.createOscillator();
    o.type = type;
    const v = 1 + (Math.random() - 0.5) * 0.1; // ±5% pitch so repeated hits don't machine-gun
    o.frequency.setValueAtTime(f0 * v, when);
    o.frequency.exponentialRampToValueAtTime(f1 * v, when + dur);
    o.connect(this.env(when, dur, amp));
    this.voice(o).start(when); o.stop(when + dur + 0.02);
    return o;
  },

  clap(amp = 0.5, len = 3) { // real-sounding applause: thousands of individual claps
    const s = this.ctx.createBufferSource(), g = this.ctx.createGain(), t = this.ctx.currentTime;
    s.buffer = this.applause.finish(); s.playbackRate.value = 0.95 + Math.random() * 0.1;
    g.gain.setValueAtTime(amp, t);
    g.gain.setValueAtTime(amp, t + len - 0.8);
    g.gain.linearRampToValueAtTime(0, t + len);
    s.connect(g).connect(this.bus || this.out);
    this.voice(s).start(t, Math.random() * 0.3); s.stop(t + len + 0.1);
  },

  // The plaça's murmur under the song follows the streak (level 0..1: up to 2.2x louder); `amb`'s own eased gain.
  setCrowd(level) {
    if (Math.abs(level - (this.crowd ?? 0)) < 0.02 && (level > 0) === ((this.crowd ?? 0) > 0)) return;
    this.crowd = level; this.murmurLevel();
  },
  // A few hands on one beat: a short slice from the middle of the applause, with its own fade in and out.
  clapBurst(amp = 0.06) {
    const s = this.ctx.createBufferSource(), g = this.ctx.createGain(), t = this.ctx.currentTime;
    s.buffer = this.applause.finish(); s.playbackRate.value = 0.95 + Math.random() * 0.1;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(amp, t + 0.015); g.gain.linearRampToValueAtTime(0, t + 0.26);
    s.connect(g).connect(this.bus || this.out);
    this.voice(s).start(t, 0.5 + Math.random() * 3.5); s.stop(t + 0.3);
  },

  sfx(kind, i = 0, manual = false, weight = 1) { // manual: explicit free-mode action, independent of the music choice; i: a petard's index, a landing's speed
    if (this.menuToken && this.menuMusic === false && !manual) return; // discard muted demo/UI events; never replay on enable / play
    if (this.ctx.state && this.ctx.state !== 'running') return; // an immediate effect cannot be queued for a future wake
    if (typeof document !== 'undefined' && (document.hidden || !document.hasFocus())) return;
    const t = this.ctx.currentTime;
    this.effectKind = kind;
    switch (kind) {
      case 'crack': { // a petard of the Drac's traca: a short bright bang and a click; at most 3 in any 80 ms (a fast mash)
        const at = this.crackAt ??= new Float64Array(3).fill(-9), k = ((this.crackN ?? 0) + 1) % 3; // k: the oldest of the last 3
        if (t - at[k] < 0.08) break;
        at[k] = t; this.crackN = k;
        this.noiseHit(t, 0.04, 0.3, 'bandpass', 2400 + (i % 5) * 380, 1.3);
        this.blip(t, 1900 + (i % 3) * 260, 700, 0.025, 0.05, 'triangle');
        break;
      }
      case 'tro': // the TRO that ends the traca: a deep boom, then a crackle dying away
        this.blip(t, 95, 30, 0.7, 0.5, 'sine');
        this.noiseHit(t, 0.55, 0.45, 'lowpass', 320, 0.7);
        this.noiseHit(t, 0.08, 0.3, 'bandpass', 1500, 0.8);
        for (let k = 0; k < 6; k++) this.noiseHit(t + 0.14 + k * 0.07, 0.03, 0.13 - k * 0.018, 'bandpass', 3000 - k * 260, 2);
        break;
      case 'thud': // a free-mode landing: one per landing, a bounce reporting again within 150 ms stays silent
        if (t - (this.thudAt ?? -9) < 0.15) break;
        this.thudAt = t; playThud(this, t, i, weight);
        break;
      case 'flama': { // the CREMA's whoosh, quiet under the GUAPA's DON
        const f = this.noiseHit(t, 0.45, 0.07, 'bandpass', 450, 0.9);
        f.frequency.exponentialRampToValueAtTime(1500, t + 0.35);
        break;
      }
      case 'perfect': this.blip(t, 1320, 1180, 0.05, 0.035, 'sine'); this.noiseHit(t, 0.02, 0.05, 'bandpass', 3200, 1.5); break; // a light wooden tick
      case 'good': this.blip(t, 990, 900, 0.04, 0.025, 'sine'); break;
      case 'gran': this.bigDon(t); break; // both buttons on a GUAPA: a big taiko DON
      case 'miss': { // cartoon boing
        const o = this.blip(t, 520, 140, 0.35, 0.12, 'triangle');
        const l = this.ctx.createOscillator(), g = this.ctx.createGain();
        l.frequency.value = 18; g.gain.value = 40; l.connect(g).connect(o.frequency); this.voice(l).start(t); l.stop(t + 0.4);
        break;
      }
      case 'menu': this.blip(t, 880, 880, 0.04, 0.06); break;
      case 'start': [523, 659, 784, 1047].forEach((f, i) => this.blip(t + i * 0.07, f, f, 0.09, 0.07)); break;
      case 'cheer': this.clap(0.45, 2.2); break;
      case 'fanfare0': case 'fanfare1': case 'fanfare2': case 'fanfare3': { // rising chiptune arpeggio, longer per tier
        const tier = +kind.at(-1), notes = [72, 76, 79, 84, 88, 91].slice(0, 3 + tier);
        notes.forEach((m, i) => this.blip(t + i * 0.06, hz(m), hz(m), 0.12, 0.06));
        this.blip(t + notes.length * 0.06, hz(notes.at(-1)), hz(notes.at(-1) + 12), 0.25, 0.05, 'triangle');
        break;
      }
      case 'ovation': this.clap(0.6, 4.5); break;
      case 'eh': for (const [d, a] of [[0, 0.14], [0.05, 0.1]]) { // a couple of voices yelling «eeh!» over a GUAPA: a rising formant
        const f = this.noiseHit(t + d, 0.38, a, 'bandpass', 480 + d * 2000, 6);
        f.frequency.exponentialRampToValueAtTime(900 + d * 3000, t + d + 0.3);
        break;
      }
      case 'ooh': { // crowd disappointment, a falling formant
        const f = this.noiseHit(t, 0.8, 0.25, 'bandpass', 700, 6);
        f.frequency.exponentialRampToValueAtTime(300, t + 0.8);
        break;
      }
      case 'laugh': for (let i = 0; i < 5; i++) this.noiseHit(t + i * 0.13, 0.09, 0.2, 'bandpass', 1100 - i * 60, 5); break;
      case 'bonk': this.blip(t, 700, 160, 0.1, 0.14, 'triangle'); this.noiseHit(t, 0.08, 0.2, 'lowpass', 1200); break;
      case 'crash':
        this.noiseHit(t, 1.2, 0.4, 'lowpass', 900, 0.5);
        this.blip(t, 400, 50, 1.0, 0.18, 'triangle'); // the fall: a low swoop, no buzz
        break;
    }
  },
};
