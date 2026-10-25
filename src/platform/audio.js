// Plays the Taiko arrangement (public/music/mulassa-taiko.mp3, tools/music/build_taiko.py) with a
// sample-accurate clock, its ambient loop on the menu, crowd ambience and chiptune sfx on top.
import { errors } from '../services/errors.js';
import { Q } from '../core/flags.js';
import { latency, RAW, audioClock } from './audio-clock.js';
import { AudioFailure, audioFailureTags, readAll } from './audio-load.js';
import { applause } from './applause.js';
import { VOICES } from './audio-voices.js';
import { RADIO } from './audio-radio.js';
export const muted = () => Q.has('mute');

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

}
Object.assign(Chip.prototype, VOICES, RADIO);
