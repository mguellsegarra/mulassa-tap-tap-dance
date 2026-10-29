// The free mode's radio (ui/free-music.js picks the track), mixed into Chip.
import { AudioFailure } from './audio-load.js';

export const RADIO = {
  // A whole song to listen to on the menu, on its own source: never this.src / t0 / buf (a run's clock, and setSong
  // empties buf on a figure change). While it sounds the menu loop rests; radio(null) fades it and, still on the menu,
  // brings the loop back from its entrance. onEnd: it played to `end` (the song's tail; the file carries on with applause).
  radio(buf, { end = Infinity, onEnd } = {}) {
    const ctx = this.ctx, t = ctx.currentTime, old = this.radioSrc;
    this.radioSrc = null;
    if (old) { old.src.onended = null; old.g.gain.setTargetAtTime(0, t, 0.1); try { old.src.stop(t + 0.6); } catch { /* already over */ } }
    if (!buf) { if (this.menuToken) this.menu(true, 0.6); return; } // natural ended already cleared radioSrc; the menu guard preserves a live loop
    if (!this.menuToken) return; // a run started while it loaded
    this.unlock();
    this.menuPending = null; this.menuFade(0.1);
    const src = ctx.createBufferSource(), g = ctx.createGain(), stop = Math.min(end, buf.duration);
    src.buffer = buf; src.connect(g).connect(this.music);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(1, t + 0.4);
    g.gain.setValueAtTime(1, t + Math.max(0.4, stop - 0.25)); g.gain.linearRampToValueAtTime(0, t + stop + 0.1);
    src.onended = () => { if (this.radioSrc?.src === src) { this.radioSrc = null; onEnd?.(); } };
    src.start(t); src.stop(t + stop + 0.2);
    this.radioSrc = { src, g, t0: t };
  },
  // Seconds into the playing song as heard (the crowd claps on its beats), or null.
  radioTime() { return this.radioSrc ? this.clock.at() - this.radioSrc.t0 - this.clock.latency() : null; },
  // The selected figure's song is usually decoded already; any other is fetched once. keep(urls): forget the rest.
  radioLoad(url) {
    if (url === this.urls?.audio && this.buf) return Promise.resolve(this.buf);
    let p = (this.radioBufs ??= new Map()).get(url);
    if (p) return p;
    let phase = 'fetch', status;
    p = Promise.resolve().then(() => fetch(url)).then(r => { if (!r.ok) { phase = 'http'; status = r.status; throw new Error(); } phase = 'read'; return r.arrayBuffer(); })
      .then(a => { phase = 'decode'; return this.ctx.decodeAudioData(a); })
      .catch(e => { if (this.radioBufs.get(url) === p) this.radioBufs.delete(url); throw new AudioFailure(phase, e, status); });
    this.radioBufs.set(url, p);
    return p;
  },
  radioKeep(urls) { for (const url of this.radioBufs?.keys() ?? []) if (!urls.includes(url)) this.radioBufs.delete(url); },
};
