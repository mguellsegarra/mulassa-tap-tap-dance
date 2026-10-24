// Plays the Taiko arrangement (public/music/mulassa-taiko.mp3, tools/build_taiko.py) with a
// sample-accurate clock, its ambient loop on the menu, crowd ambience and chiptune sfx on top.
import { errors, errorName } from '../services/errors.js';
import { playThud } from './landing-sound.js';
import { Q } from '../core/flags.js';
const hz = m => 440 * 2 ** ((m - 69) / 12);
// What the browser says it takes a sample to reach the speakers. Chip.now() and the sync calibration's
// Clicker.heard() both subtract it, so the calibrated offset only holds the delay nobody reports.
export const latency = ctx => ctx.outputLatency || ctx.baseLatency || 0;
// ?rawclock (dev A/B): the old stepped clock, ctx.currentTime read directly, the latency re-read on every call.
const RAW = Q.has('rawclock');
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
const PHASES = ['fetch', 'http', 'read', 'decode'];
class AudioFailure extends Error {
  constructor(phase, e, status) {
    super(`Recording unavailable: ${status ?? phase}`);
    this.phase = phase; this.status = status; this.errName = errorName(e);
  }
}
export function audioFailureTags(e) {
  if (!(e instanceof AudioFailure)) return { name: errorName(e), phase: 'unknown' };
  const tags = { name: errorName({ name: e.errName }), phase: PHASES.includes(e.phase) ? e.phase : 'unknown' };
  if (Number.isInteger(e.status) && e.status >= 100 && e.status <= 599) tags.status = e.status;
  return tags;
}
const muted = () => Q.has('mute');

export class Chip {
  constructor(song = {}, { menuMusic = true, menuLoop = song } = {}) {
    this.menuUrls = menuLoop; // the menu loop is one tune for every figure: a figure's song never swaps it
    this.urls = song; // song.audio / song.ambient carry a ?v= content hash, so a regenerated song is never served stale
    const ctx = this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.out = ctx.createGain();
    this.out.gain.value = 0.8;
    const comp = ctx.createDynamicsCompressor();
    this.master = ctx.createGain(); // hush()/unhush(): fades everything before a suspend
    this.master.connect(ctx.destination);
    this.out.connect(comp).connect(this.master);
    this.music = ctx.createGain();
    this.music.connect(this.master); // the recording skips the sfx compressor
    if (muted()) this.out.gain.value = this.music.gain.value = 0; // ?mute: silent test runs, the clock still runs
    const sr = ctx.sampleRate;
    this.noise = ctx.createBuffer(1, sr * 2, sr);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    this.murmur = ctx.createBuffer(1, sr * 3, sr);
    const md = this.murmur.getChannelData(0);
    let b = 0;
    for (let i = 0; i < md.length; i++) { b = (b + 0.02 * (Math.random() * 2 - 1)) / 1.02; md[i] = b * 3.5; }
    this.applause = applause(ctx); // built a few people at a time when the page is idle (see applause())
    this.menuMusic = menuMusic; // the title's speaker button (main.js): off = all menu sounds are silent; the loop is neither fetched nor played
    this.preload();
  }

  // Download and decode right away, even before the tap (main.js creates the engine after the first frame): a
  // suspended context decodes fine, only playing needs the gesture. The song and the menu loop (632 KB) start together,
  // so the loop is ready by the first tap instead of waiting for the whole song (2.5 MB).
  // Keep the unlocked context and effects, invalidate every pending source from the old arrangement.
  setSong(song) {
    if (this.urls === song) return;
    this.stop(); this.endRun(); // the menu loop keeps playing: it is the same for every figure
    this.urls = song; this.buf = null; this.loaded = 0;
    this.ready = this.loadRecording();
  }

  preload() {
    this.ready = this.loadRecording();
    if (this.menuMusic === false) return; // switched off: menu() fetches it if it is switched back on
    const amb = this.ambient = this.loadAmbient();
    amb.catch(() => { if (this.ambient === amb) this.ambient = null; }); // menu() retries
  }

  loadAmbient() {
    return fetch((this.menuUrls ?? this.urls)?.ambient ?? 'music/mulassa-taiko-ambient.mp3').then(r => r.arrayBuffer()).then(a => this.ctx.decodeAudioData(a));
  }

  loadRecording() {
    const recording = this.recording = {};
    let phase = 'fetch', status;
    const got = new Promise(resolve => resolve(fetch(this.urls?.audio ?? 'music/mulassa-taiko.mp3'))).then(response => {
      if (!response.ok) { phase = 'http'; status = response.status; throw new Error(); }
      phase = 'read';
      return readAll(response, k => { if (this.recording === recording) this.loaded = k; });
    });
    const ready = got.then(data => { phase = 'decode'; return this.ctx.decodeAudioData(data); }).then(buffer => { if (this.recording === recording) this.buf = buffer; return buffer; })
      .catch(e => { throw new AudioFailure(phase, e, status); });
    ready.catch(() => { if (this.ready === ready) this.ready = null; });
    return ready;
  }

  // A bare ctx.suspend() mid-sound left the device's last buffer behind (a stray note on a phone's app/tab switch): fade first
  suspend() {
    const g = this.master.gain, t = this.ctx.currentTime;
    g.cancelScheduledValues(t); g.setTargetAtTime(0, t, 0.006);
    clearTimeout(this.hushT);
    this.hushT = setTimeout(() => this.ctx.suspend(), 40);
  }
  unhush() {
    clearTimeout(this.hushT);
    const g = this.master.gain, t = this.ctx.currentTime;
    g.cancelScheduledValues(t); g.setTargetAtTime(1, t, 0.01);
  }
  resume() {
    this.unhush();
    const failed = e => { errors.report('audio-resume-failed', audioFailureTags(e)); return false; };
    try { return Promise.resolve(this.ctx.resume?.()).then(() => this.running, failed); } catch (e) { return Promise.resolve(failed(e)); }
  } // a rejected wake stays paused; the next real gesture can resume the same transport

  // iOS: a silent menu is 'ambient' (sfx mix with Spotify or any other app's music, which keeps playing); the menu music,
  // the radio or a run take the 'playback' session (the other app pauses, and the ringer switch can't silence the song)
  session() {
    try { if (navigator.audioSession) navigator.audioSession.type = this.menuMusic === false && !this.bus ? 'ambient' : 'playback'; } catch { /* older iOS */ }
  }

  wake() { // iOS: resume + a silent sample inside a real gesture
    this.session();
    if (document.hidden || !document.hasFocus() || navigator.userActivation?.isActive === false) return; // a modifier key, Cmd+R…: no gesture, the browser would refuse (and warn)
    if (this.ctx.state !== 'running') this.resume(); else this.unhush(); // a hidden page's timer may never have suspended it
    if (!this.woke) {
      const b = this.ctx.createBufferSource();
      b.buffer = this.ctx.createBuffer(1, 1, this.ctx.sampleRate);
      b.connect(this.ctx.destination); b.start();
      this.woke = true;
    }
  }

  get running() { return this.ctx.state === 'running'; }

  unlock() {
    this.wake();
    if (this.amb) return;
    const n = this.ctx.createBufferSource(), f = this.ctx.createBiquadFilter();
    n.buffer = this.murmur; n.loop = true; f.type = 'bandpass'; f.frequency.value = 500; f.Q.value = 0.7;
    this.amb = this.ctx.createGain(); this.amb.gain.value = 0.035;
    n.connect(f).connect(this.amb).connect(this.out); n.start();
    this.murmurLevel();
  }
  // the plaça's murmur: silent on the menu while the speaker is off (a muted menu means quiet), back in any game and in the
  // free mode (setFree), where the plaça is the point and the music off only means no tune
  setFree(on) { this.free = on; this.murmurLevel(); }
  murmurLevel() {
    if (!this.amb) return;
    const quiet = this.menuToken && this.menuMusic === false && !this.free;
    this.amb.gain.setTargetAtTime(quiet ? 0 : 0.035 * (1 + 1.2 * (this.crowd ?? 0)), this.ctx.currentTime, this.crowd ? 0.7 : 0.05);
  }

  // play the recording from `from` after `delay` seconds, fading out at `end`
  async start(delay = 3, from = 0, end = Infinity) {
    this.unlock();
    this.menuToken = null; this.menuFade(); this.radio(null); // cancel ambient playback, the radio and pending decodes before a run
    this.stop();
    const token = (this.token = {});
    await (this.ready ||= this.loadRecording());
    if (this.token !== token) return false; // stopped while loading
    const src = (this.src = this.ctx.createBufferSource()), g = this.ctx.createGain();
    src.buffer = this.buf;
    src.connect(g).connect(this.music);
    const when = this.ctx.currentTime + delay;
    this.t0 = when - from;
    this.clock.run(); // a new run: a fresh anchor and latency
    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(1, when + 0.02);
    src.start(when, from);
    if (end < this.buf.duration) { // fade out where the music ends (the recording carries on with applause)
      g.gain.setValueAtTime(1, this.t0 + end - 0.25);
      g.gain.linearRampToValueAtTime(0, this.t0 + end + 0.1);
      src.stop(this.t0 + end + 0.2);
    }
    return true;
  }

  // a song clock with no recording (the practice): now() reads `from` after `delay` seconds and runs on
  startClock(delay, from) {
    this.unlock();
    this.stop();
    this.t0 = this.ctx.currentTime + delay - from;
    this.clock.run();
  }

  stop() {
    this.token = null;
    try { this.src?.stop(); } catch { /* not started */ }
    this.src = null;
    this.t0 = null;
  }

  // position in the recording, as it reaches the ears, at perfMs (performance.now() time; default: now)
  now(perfMs) {
    if (this.t0 == null) return -1;
    if (RAW) return this.ctx.currentTime - this.t0 - latency(this.ctx) - (perfMs == null ? 0 : (performance.now() - perfMs) / 1000);
    return this.clock.at(perfMs) - this.t0 - this.clock.latency();
  }
  get clock() { return (this._clock ||= audioClock(this.ctx)); }

  countIn(times) { // timbal hits before the recording starts (song-time seconds, negative)
    if (this.t0 == null) return; // stopped (the run was left) before the song's start resolved
    for (const at of times) this.timbal(this.t0 + at, at === times.at(-1) ? 0.5 : 0.35);
  }

  bigDon(when) { // Taiko's big DON: a deep drum hit with a body thump and a tiny bright tick, no buzz
    const o = this.ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(130, when);
    o.frequency.exponentialRampToValueAtTime(52, when + 0.22);
    o.connect(this.env(when, 0.32, 0.55));
    this.voice(o).start(when); o.stop(when + 0.34);
    this.noiseHit(when, 0.06, 0.25, 'lowpass', 400); // skin thump
    this.blip(when, 1760, 1600, 0.03, 0.02, 'sine'); // a small shine on top
  }

  timbal(when, amp) {
    const o = this.ctx.createOscillator();
    o.frequency.setValueAtTime(170, when);
    o.frequency.exponentialRampToValueAtTime(75, when + 0.14);
    o.connect(this.env(when, 0.16, amp));
    this.voice(o).start(when); o.stop(when + 0.18);
    this.noiseHit(when, 0.07, amp * 0.3, 'bandpass', 2200);
  }

  tick(at) { // debug metronome on chart notes (?clicks)
    this.blip(this.t0 + at, 2000, 2000, 0.03, 0.08);
  }

  // ---------------------------------------------------------------- menu music
  // The recording has a gentle percussion entrance; only the steady section repeats.
  // fadeIn is just the click guard; the musical entrance is already in the file.
  menu(on, fadeIn = 0.4) {
    const ctx = this.ctx;
    if (on && this.menuToken && (this.menuSrc || this.menuPending || this.menuMusic === false || this.radioSrc)) { this.unlock(); return; } // (the radio rests the loop)
    this.menuFade();
    if (!on) { this.menuToken = null; this.radio(null); this.murmurLevel(); this.beginRun(); return; } // also cancels a loop still loading: it must never start under a game
    this.unlock();
    this.endRun(); // back on the menu: whatever the run still had queued on the audio clock never sounds
    const token = (this.menuToken = {});
    this.murmurLevel();
    if (this.menuMusic === false) { this.clearMenuSfx(); return; } // remembered menu silence, including leftover effects
    const ambient = this.ambient ||= this.loadAmbient();
    // the tap's resume() takes a moment before the hardware really plays: starting the loop while the context is still
    // suspended ate its first beats (it began "cut"). Wait for `running`, then start a hair ahead of the clock.
    const running = ctx.state === 'running' || !ctx.addEventListener ? null : new Promise(done => {
      const f = () => { if (ctx.state === 'running') { ctx.removeEventListener('statechange', f); done(); } };
      ctx.addEventListener('statechange', f);
    });
    this.menuPending = token;
    ambient.then(async buf => {
      if (running) await running;
      if (this.menuToken !== token || this.menuPending !== token || this.menuSrc || this.menuMusic === false) return; // also invalidated when the radio takes over
      const src = ctx.createBufferSource(), g = ctx.createGain();
      src.buffer = buf; src.loop = true;
      src.loopStart = (this.menuUrls ?? this.urls)?.ambientLoop?.start ?? 0;
      src.loopEnd = (this.menuUrls ?? this.urls)?.ambientLoop?.end ?? buf.duration - 1; // the file carries 1 s past the loop point
      const at = ctx.currentTime + 0.12;
      g.gain.setValueAtTime(0, at);
      g.gain.linearRampToValueAtTime(0.9, at + fadeIn);
      src.connect(g).connect(this.out);
      src.start(at);
      this.menuSrc = { src, g, t0: at }; // t0: menuBeat()'s origin
    }).catch(e => { if (this.ambient === ambient) this.ambient = null; errors.report('menu-load-failed', audioFailureTags(e)); }).finally(() => { if (this.menuPending === token) this.menuPending = null; });
  }
  // The entrance and loop share a tempo; their combined file length is not the loop's period.
  // (the title logo's TAP TAP DANCE taps along)
  menuBeat() {
    const m = this.menuSrc, len = m && m.src.loopEnd - (m.src.loopStart ?? 0);
    if (!len) return null;
    const t = this.clock.at() - m.t0 - this.clock.latency();
    return t < 0 ? null : (t % len) / len * ((this.menuUrls ?? this.urls)?.ambientLoop?.beats ?? 64);
  }
  menuFade(tau = 0.05) { // short fade (~200 ms) so stopping the loop never clicks; the radio's crossfade is longer
    if (!this.menuSrc) return;
    const { src, g } = this.menuSrc, t = this.ctx.currentTime;
    g.gain.setTargetAtTime(0, t, tau);
    src.stop(t + tau * 6);
    this.menuSrc = null;
  }
  // Menu sound preference: loop, murmur and UI/demo effects. A run keeps its own sound.
  setMenuMusic(on) {
    this.menuMusic = on;
    this.session();
    this.murmurLevel();
    if (!on) this.radio(null); // «Silenci» on the radio is this same preference
    if (!this.menuToken) return; // not on the menu: the next menu(true) follows the setting
    if (on) { this.menuPending = null; this.menu(true, 0.2); } else { this.clearMenuSfx(); this.menuFade(); }
  }

  // ---------------------------------------------------------------- free mode's radio (ui/free-music.js picks the track)
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
  }
  // Seconds into the playing song as heard (the crowd claps on its beats), or null.
  radioTime() { return this.radioSrc ? this.clock.at() - this.radioSrc.t0 - this.clock.latency() : null; }
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
  }
  radioKeep(urls) { for (const url of this.radioBufs?.keys() ?? []) if (!urls.includes(url)) this.radioBufs.delete(url); }

  // ---------------------------------------------------------------- a run's sounds
  // Everything a run (a song or the practice) plays goes through its own bus, and every source it starts is kept, so
  // leaving it silences all of it: the count-in is queued up to 3 s ahead on the audio clock, the pause suspends that
  // clock, and «Torna al menú» resumed it on the title with the three drum hits still to come. menu(false) opens a
  // run's bus, menu(true) ends it (a short fade, then disconnected); on the menu sfx go straight to `out`.
  beginRun() {
    this.endRun();
    this.bus = this.ctx.createGain();
    this.bus.connect(this.out);
    this.session();
  }
  endRun() {
    const bus = this.bus, t = this.ctx.currentTime;
    this.bus = null;
    this.session();
    for (const n of this.voices ?? []) try { n.stop(t + 0.05); } catch { /* already over */ } // queued ones never start
    this.voices?.clear();
    if (!bus) return;
    bus.gain.setTargetAtTime(0, t, 0.01); // the ones sounding now fade instead of clicking...
    setTimeout(() => bus.disconnect(), 100); // ...and the bus is gone, whatever the audio clock does next
  }
  clearMenuSfx(kind) { // transient effects must not survive a suspended menu clock
    if (!this.menuVoices) return;
    for (const n of this.menuVoices) if (!kind || n.effectKind === kind) {
      try { n.stop(); } catch { /* already ended */ }
      this.menuVoices.delete(n);
    }
  }
  voice(n) { // songs and the ambient loop never pass through here
    if (!this.bus && !(this instanceof Chip)) return n; // Clicker owns its separate context
    const voices = this.bus ? (this.voices ??= new Set()) : (this.menuVoices ??= new Set());
    n.effectKind = this.effectKind;
    voices.add(n);
    n.onended = () => voices.delete(n);
    return n;
  }

  // ---------------------------------------------------------------- sfx
  env(when, dur, peak, dest = this.bus || this.out) {
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(peak, when + 0.01);
    g.gain.setValueAtTime(peak * 0.85, when + Math.max(0.012, dur * 0.8));
    g.gain.linearRampToValueAtTime(0, when + dur);
    g.connect(dest);
    return g;
  }

  noiseHit(when, dur, amp, type, freq, q = 0.8, dest) {
    const n = this.ctx.createBufferSource(), f = this.ctx.createBiquadFilter();
    n.buffer = this.noise; f.type = type; f.frequency.value = freq; f.Q.value = q;
    n.connect(f).connect(this.env(when, dur, amp, dest));
    this.voice(n).start(when, Math.random()); n.stop(when + dur + 0.02);
    return f;
  }

  blip(when, f0, f1, dur, amp, type = 'triangle') { // soft by default: square waves buzz on phone speakers
    const o = this.ctx.createOscillator();
    o.type = type;
    const v = 1 + (Math.random() - 0.5) * 0.1; // ±5% pitch so repeated hits don't machine-gun
    o.frequency.setValueAtTime(f0 * v, when);
    o.frequency.exponentialRampToValueAtTime(f1 * v, when + dur);
    o.connect(this.env(when, dur, amp));
    this.voice(o).start(when); o.stop(when + dur + 0.02);
    return o;
  }

  clap(amp = 0.5, len = 3) { // real-sounding applause: thousands of individual claps
    const s = this.ctx.createBufferSource(), g = this.ctx.createGain(), t = this.ctx.currentTime;
    s.buffer = this.applause.finish(); s.playbackRate.value = 0.95 + Math.random() * 0.1;
    g.gain.setValueAtTime(amp, t);
    g.gain.setValueAtTime(amp, t + len - 0.8);
    g.gain.linearRampToValueAtTime(0, t + len);
    s.connect(g).connect(this.bus || this.out);
    this.voice(s).start(t, Math.random() * 0.3); s.stop(t + len + 0.1);
  }

  // The plaça's murmur under the song follows the streak (level 0..1: up to 2.2x louder); `amb`'s own eased gain.
  setCrowd(level) {
    if (Math.abs(level - (this.crowd ?? 0)) < 0.02 && (level > 0) === ((this.crowd ?? 0) > 0)) return;
    this.crowd = level; this.murmurLevel();
  }
  // A few hands on one beat: a short slice from the middle of the applause, with its own fade in and out.
  clapBurst(amp = 0.06) {
    const s = this.ctx.createBufferSource(), g = this.ctx.createGain(), t = this.ctx.currentTime;
    s.buffer = this.applause.finish(); s.playbackRate.value = 0.95 + Math.random() * 0.1;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(amp, t + 0.015); g.gain.linearRampToValueAtTime(0, t + 0.26);
    s.connect(g).connect(this.bus || this.out);
    this.voice(s).start(t, 0.5 + Math.random() * 3.5); s.stop(t + 0.3);
  }

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
  }
}

// A response's bytes, reporting how much has arrived (0..1) when the size is known: a game waiting on a slow line
// shows it (main.js, «Preparant la música… 40%»).
async function readAll(response, progress) {
  const total = +response.headers?.get?.('content-length') || 0, reader = total ? response.body?.getReader?.() : null;
  if (!reader) return response.arrayBuffer();
  const parts = [];
  let n = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    parts.push(value); n += value.length;
    progress(Math.min(1, n / total));
  }
  const out = new Uint8Array(n);
  n = 0;
  for (const p of parts) { out.set(p, n); n += p.length; }
  return out.buffer;
}

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
for (const k of ['env', 'noiseHit', 'blip', 'timbal', 'voice']) Clicker.prototype[k] = Chip.prototype[k]; // no bus: voice() keeps nothing

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
