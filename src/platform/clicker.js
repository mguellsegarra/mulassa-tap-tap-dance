import { Chip, muted } from './audio.js';
import { latency, RAW, audioClock } from './audio-clock.js';
import { VOICES } from './audio-voices.js';

// The sync calibration's metronome. Its own small context, because the game's one is suspended while paused
// mid-song; the same timbal/blip voices, and heard() uses the same latency maths as Chip.now().
export class Clicker {
  constructor() {
    const ctx = this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.out = ctx.createGain();
    this.out.gain.value = muted() ? 0 : 0.8;
    this.out.connect(ctx.destination);
    const sr = ctx.sampleRate;
    this.noise = ctx.createBuffer(1, sr * 2, sr);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    Promise.resolve(ctx.resume?.()).catch(() => {});
  }
  heard(perfMs) { // audio-clock time of what reaches the ears at perfMs (default: now), on the game's own clock maths
    if (RAW) return this.ctx.currentTime - latency(this.ctx) - (perfMs == null ? 0 : (performance.now() - perfMs) / 1000);
    const c = (this._clock ||= audioClock(this.ctx));
    return c.at(perfMs) - c.latency();
  }
  click(when, accent) { this.timbal(when, accent ? 0.5 : 0.35); this.blip(when, 1760, 1760, 0.025, accent ? 0.08 : 0.05); } // a sharp attack to tap on
  close() { try { this.ctx.close().catch(() => {}); } catch { /* already closed */ } }
}
for (const k of ['env', 'noiseHit', 'blip', 'timbal']) Clicker.prototype[k] = VOICES[k];
Clicker.prototype.voice = Chip.prototype.voice; // no bus: voice() keeps nothing
