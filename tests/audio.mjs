import assert from 'node:assert/strict';
import './pad-input.mjs';
import './free-music.mjs';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { Chip, applause, audioFailureTags } from '../src/platform/audio.js';

let resolveReady;
let starts = 0;
const chip = Object.create(Chip.prototype);
chip.ctx = {
  currentTime: 10,
  createBufferSource: () => ({ connect(target) { return target; }, start() { starts++; }, stop() {} }),
  createGain: () => ({ connect(target) { return target; }, gain: { setValueAtTime() {}, linearRampToValueAtTime() {} } }),
};
chip.unlock = () => {};
chip.buf = { duration: 200 };
chip.ready = new Promise(resolve => { resolveReady = resolve; });
const cancelled = chip.start();
chip.stop();
resolveReady();
assert.equal(await cancelled, false, 'leaving while loading cancels playback');
assert.equal(starts, 0);
assert.equal(await chip.start(), true, 'a later game starts normally');
assert.equal(starts, 1);
assert.equal(chip.t0, 13);

let resolveReload;
chip.ready = new Promise(resolve => { resolveReload = resolve; });
const stale = chip.start();
const current = chip.start();
resolveReload();
assert.equal(await stale, false, 'restarting while loading cancels the old source');
assert.equal(await current, true);
assert.equal(starts, 2, 'only one source is scheduled after restarting');
console.log('audio loading and cancellation contracts ok');

// A failed preload is handled even before Play, and the next attempt can retry.
const previousFetch = globalThis.fetch;
try {
  let fetches = 0;
  globalThis.fetch = async () => {
    fetches++;
    return fetches === 1
      ? { ok: false, status: 503 }
      : { ok: true, arrayBuffer: async () => new ArrayBuffer(0) };
  };
  chip.ctx.decodeAudioData = async () => ({ duration: 200 });
  chip.ready = chip.loadRecording();
  await assert.rejects(chip.ready, /503/);
  assert.equal(chip.ready, null, 'failed preloads allow another request');
  assert.equal(await chip.start(), true);
  assert.equal(fetches, 2, 'retry fetches the recording again');
} finally {
  globalThis.fetch = previousFetch;
}
console.log('audio fetch failure and retry contract ok');

const previousDocument = globalThis.document;
try {
  globalThis.document = { hidden: true, hasFocus: () => true };
  let resumes = 0;
  const idleChip = Object.create(Chip.prototype);
  idleChip.woke = true;
  idleChip.ctx = { state: 'suspended', resume() { resumes++; } };
  idleChip.wake();
  assert.equal(resumes, 0, 'loading or gestures cannot wake hidden audio');
  document.hidden = false;
  document.hasFocus = () => false;
  idleChip.wake();
  assert.equal(resumes, 0, 'visible windows without focus cannot wake audio');
  document.hasFocus = () => true;
  idleChip.wake();
  assert.equal(resumes, 1, 'focused visible pages can wake audio');
} finally {
  if (previousDocument === undefined) delete globalThis.document;
  else globalThis.document = previousDocument;
}
console.log('audio wake respects page activity');

{
  const c = Object.create(Chip.prototype);
  c.ctx = { state: 'suspended', resume: () => Promise.reject(Object.assign(new Error('blocked'), { name: 'NotAllowedError' })) };
  assert.equal(await c.resume(), false, 'a browser policy rejection is a failed resume, not playing audio');
  assert.equal(c.ctx.state, 'suspended');
  c.ctx.resume = () => { c.ctx.state = 'running'; return Promise.resolve(); };
  assert.equal(await c.resume(), true, 'a later gesture can resume the same context');
  c.ctx.resume = () => { throw Object.assign(new Error('closed'), { name: 'InvalidStateError' }); };
  assert.equal(await c.resume(), false, 'synchronous resume failures are handled too');
}

// Download order: both start at once, on any connection; only the speaker's own setting silences the menu loop.
{
  const previousFetch = globalThis.fetch;
  try {
    const log = [];
    let finishSong;
    globalThis.fetch = async url => {
      log.push(url);
      if (url === 'song') await new Promise(r => { finishSong = r; });
      return { ok: true, arrayBuffer: async () => new ArrayBuffer(0) };
    };
    const menuStarts = [];
    const make = () => {
      const c = Object.create(Chip.prototype);
      c.urls = { audio: 'song', ambient: 'menu' };
      c.unlock = () => {};
      c.ctx = { currentTime: 0, decodeAudioData: async () => ({ duration: 30 }),
        createBufferSource: () => ({ connect: t => t, start() { menuStarts.push(c); }, stop() {} }),
        createGain: () => ({ connect: t => t, disconnect() {}, gain: { setValueAtTime() {}, linearRampToValueAtTime() {}, setTargetAtTime() {} } }) };
      c.out = {};
      return c;
    };
    const normal = make();
    normal.preload();
    normal.menu(true); // the title opens while the song still downloads: a normal connection fetches both at once
    await normal.ambient;
    await new Promise(r => setTimeout(r, 5));
    assert.deepEqual(log, ['song', 'menu'], 'the menu loop does not wait for the song (music on the first tap)');
    assert.deepEqual(menuStarts, [normal], 'the title\'s loop starts as soon as it is there, the song still downloading');
    finishSong();
    await normal.ready;
    log.length = 0;
    // a slow / Save-Data connection changes nothing: the loop is requested and started like on any other
    const navDesc = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
    Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { connection: { effectiveType: '3g', saveData: true } } });
    const slow = make();
    slow.preload();
    finishSong();
    await slow.ready;
    slow.menu(true);
    await new Promise(r => setTimeout(r, 5));
    assert.deepEqual(log, ['song', 'menu'], 'a 3G / Save-Data connection still downloads the menu loop');
    assert.deepEqual(menuStarts, [normal, slow], 'and starts it');
    slow.menu(false);
    if (navDesc) Object.defineProperty(globalThis, 'navigator', navDesc); else delete globalThis.navigator;
    // the title's speaker button off (main.js, localStorage 'menu-music'): never fetched, never started; back on = a quick
    // fade in right there; off again = a quick fade out, the menu itself still on
    log.length = 0; menuStarts.length = 0;
    const quiet = make();
    quiet.menuMusic = false;
    quiet.preload();
    finishSong();
    await quiet.ready;
    quiet.menu(true);
    await new Promise(r => setTimeout(r, 5));
    assert.deepEqual(log, ['song'], 'menu music off: the loop is never downloaded');
    assert.equal(menuStarts.length, 0, 'nor started');
    const ramps = [];
    quiet.ctx.createGain = () => ({ connect: t => t, disconnect() {}, gain: { setValueAtTime() {}, linearRampToValueAtTime: (v, t) => ramps.push(t), setTargetAtTime(v) { ramps.push(`to ${v}`); } } });
    quiet.ctx.createBufferSource = () => ({ connect: t => t, start() { menuStarts.push(quiet); }, stop() { ramps.push('stop'); } });
    quiet.setMenuMusic(true);
    await new Promise(r => setTimeout(r, 5));
    assert.deepEqual(log, ['song', 'menu'], 'switched on: fetched now');
    assert(menuStarts.at(-1) === quiet && Math.abs(ramps[0] - 0.32) < 1e-9, 'and faded in within 0.2 s (after the 0.12 s lead)');
    quiet.setMenuMusic(false);
    assert.deepEqual(ramps.slice(1), ['to 0', 'stop'], 'off: a short fade out');
    assert(quiet.menuToken, 'the menu itself carries on (switching back on starts it again)');
    quiet.menu(false); quiet.setMenuMusic(true);
    await new Promise(r => setTimeout(r, 5));
    assert.equal(menuStarts.filter(c => c === quiet).length, 1, 'off the menu, switching on starts nothing');
    // the plaça's murmur: quiet on the menu while the speaker is off, back as soon as a game starts
    const murmur = [];
    quiet.amb = { gain: { setTargetAtTime: v => murmur.push(v) } };
    quiet.setMenuMusic(false); quiet.menu(true);
    assert.equal(murmur.at(-1), 0, 'speaker off on the menu: no murmur either');
    quiet.setFree(true);
    assert.equal(murmur.at(-1), 0.035, 'free mode: the plaça’s murmur sounds with the menu music off');
    quiet.setFree(false);
    assert.equal(murmur.at(-1), 0, 'leaving free mode: silent again');
    quiet.menu(false);
    assert.equal(murmur.at(-1), 0.035, 'a game: the murmur is back');
    quiet.menu(true); quiet.setMenuMusic(true);
    assert.equal(murmur.at(-1), 0.035, 'speaker on: the murmur too');
    const pending = make();
    let finishMenu;
    pending.ambient = new Promise(resolve => { finishMenu = resolve; });
    pending.menu(true); pending.menu(true);
    pending.setMenuMusic(false);
    finishMenu({ duration: 30 });
    await pending.ambient;
    assert.equal(menuStarts.filter(c => c === pending).length, 0, 'muted while loading: the downloaded loop never starts');
    assert(!pending.menuSrc, 'muted while loading: no active menu source');
    pending.setMenuMusic(true);
    await pending.ambient;
    assert.equal(menuStarts.filter(c => c === pending).length, 1, 're-enabling after the download starts the loop once');
    pending.menu(false);
    const entering = make();
    let decoded;
    entering.ambient = new Promise(resolve => { decoded = resolve; });
    entering.menu(true); const request = entering.menuToken;
    entering.menu(true); entering.menu(true);
    assert.equal(entering.menuToken, request, 'entry shares an in-flight menu request');
    decoded({ duration: 30 }); await entering.ambient;
    await new Promise(r => setTimeout(r, 0));
    assert.equal(menuStarts.filter(c => c === entering).length, 1, 'late decode after repeated entry starts exactly one loop');
    entering.menu(false);
    const suspendedMenu = make(); let running;
    suspendedMenu.ctx.state = 'suspended';
    suspendedMenu.ctx.addEventListener = (_, f) => { running = f; };
    suspendedMenu.ctx.removeEventListener = () => {};
    suspendedMenu.ambient = Promise.resolve({ duration: 30 });
    suspendedMenu.menu(true); suspendedMenu.menu(true);
    await suspendedMenu.ambient;
    assert(!suspendedMenu.menuSrc, 'decoded menu waits for the real audio unlock');
    suspendedMenu.menu(false); // a run starts before Safari finishes its resume
    suspendedMenu.ctx.state = 'running'; running();
    await new Promise(r => setTimeout(r, 0));
    assert(!suspendedMenu.menuSrc, 'late unlock cannot play a cancelled menu under a run');
  } finally {
    globalThis.fetch = previousFetch;
  }
}
console.log('audio download order ok');

// A real entrance plays once; the steady groove repeats without slowing the title's beat.
{
  const song = JSON.parse(readFileSync(new URL('../src/song.json', import.meta.url)));
  const { start, end, beats } = song.ambientLoop;
  const period = end - start, beat = period / beats;
  assert(start > 4 && start < 8, 'a short musical entrance before the loop');
  assert(Math.abs(beat - 60 / song.bpm) < 1 / 44100, 'menu and song use the same tempo');
  assert(Math.abs(start / beat - 16) < 0.001, 'the entrance is four measures');
  const hash = createHash('sha1').update(readFileSync(new URL('../public/music/mulassa-taiko-ambient.mp3', import.meta.url))).digest('hex').slice(0, 10);
  assert(song.ambient.endsWith(`?v=${hash}`), 'the new entrance cannot use a cached old recording');
  const starts = [], fades = [];
  const src = { connect: t => t, start: (...args) => starts.push(args), stop: t => fades.push(t) };
  const c = Object.assign(Object.create(Chip.prototype), {
    urls: song, out: {}, unlock() {}, ambient: Promise.resolve({ duration: end + 1 }),
    ctx: { currentTime: 10, createBufferSource: () => src,
      createGain: () => ({ connect: t => t, gain: { setValueAtTime() {}, linearRampToValueAtTime() {}, setTargetAtTime() {} } }) },
  });
  let now = 10;
  Object.defineProperty(c, 'clock', { value: { at: () => now, latency: () => 0.08 } });
  c.menu(true);
  await c.ambient;
  assert(src.loop && src.loopStart === start && src.loopEnd === end, 'repeat only the generated steady section');
  assert.deepEqual(starts, [[10.12]], 'start from file zero so the entrance is actually heard');
  assert.equal(c.menuBeat(), null, 'no beat before sound reaches the ears');
  for (const n of [1, 8, 16, 17.25, 63.5, 64, 80.5, 145.5]) {
    now = c.menuSrc.t0 + 0.08 + n * beat;
    const delta = (c.menuBeat() - n % beats + beats) % beats;
    assert(Math.min(delta, beats - delta) < 1e-8, `beat ${n} stays on tempo through the entrance and repeated loops`);
  }
  const transport = c.menuSrc, origin = transport.t0, phase = c.menuBeat();
  c.ctx.currentTime = now;
  c.menu(true); c.menu(true); // HUD off on splash, then ENTRA, then another menu caller
  await c.ambient;
  assert.equal(c.menuSrc, transport, 'repeated menu entry keeps the same source');
  assert.equal(c.menuSrc.t0, origin, 'entry never resets the transport origin');
  assert.equal(c.menuBeat(), phase, 'entry keeps the current musical phase');
  assert.equal(starts.length, 1, 'one loop start across splash/photo/entry');
  assert.equal(fades.length, 0, 'entry never fades a running menu loop');
  c.menu(false);
  assert.equal(c.menuBeat(), null, 'leaving the menu stops its beat');
  assert.equal(fades.length, 1, 'the entrance stops with the rest of the menu audio');
}
console.log('menu entrance, loop points, version and tempo ok');

// Leaving a run silences everything it queued on the audio clock. The count-in is scheduled up to 3 s ahead; the pause
// suspends the clock with it still queued, and «Torna al menú» resumed it: three drum hits on the title. A fake audio
// graph: every source knows when it starts and stops and which gain chain it reaches `out` through.
{
  const graph = () => {
    const ctx = { currentTime: 50, sources: [], sampleRate: 48000 };
    const param = () => ({ value: 1, events: [], setValueAtTime(v, t) { this.events.push([v, t]); }, linearRampToValueAtTime(v, t) { this.events.push([v, t]); },
      exponentialRampToValueAtTime(v, t) { this.events.push([v, t]); }, setTargetAtTime(v, t) { this.events.push([v, t]); } });
    const node = extra => ({ outs: [], connect(t) { this.outs.push(t); return t; }, disconnect() { this.outs.length = 0; }, ...extra });
    const source = () => { const s = node({ frequency: param(), playbackRate: param(), start(at = 0) { this.at = at; }, stop(at = 0) { this.end = Math.min(this.end ?? Infinity, at); } }); ctx.sources.push(s); return s; };
    Object.assign(ctx, { createOscillator: source, createBufferSource: source, createGain: () => node({ gain: param() }),
      createBiquadFilter: () => node({ frequency: param(), Q: param() }), createBuffer: () => ({ duration: 200, getChannelData: () => new Float32Array(1) }) });
    const c = Object.assign(Object.create(Chip.prototype), { ctx, noise: {}, applause: { finish: () => ({}) }, buf: { duration: 200 }, ready: Promise.resolve() });
    c.out = ctx.createGain(); c.music = ctx.createGain(); c.unlock = () => {};
    // reaches the speakers: still connected, through whatever gains, to `out` or `music`
    c.audible = s => { const walk = n => n === c.out || n === c.music || n.outs.some(walk); return walk(s); };
    // sounds at some point after `t`: started, not stopped before it starts, and still wired to the speakers
    c.plays = (s, t) => s.at != null && (s.end ?? Infinity) > Math.max(s.at, t) && c.audible(s);
    return c;
  };
  // Menu demo effects are immediate events, never a queue waiting for focus / audio unlock.
  const menu = graph();
  menu.ctx.state = 'suspended';
  for (let i = 0; i < 20; i++) menu.sfx('flama');
  assert.equal(menu.ctx.sources.length, 0, 'suspended demo cannot accumulate flame sources');
  menu.ctx.state = 'running'; menu.sfx('flama');
  const flame = menu.ctx.sources.at(-1);
  assert(menu.plays(flame, menu.ctx.currentTime), 'a live flame still schedules its original sound');
  menu.sfx('menu'); const click = menu.ctx.sources.at(-1);
  menu.clearMenuSfx('flama');
  assert(!menu.plays(flame, menu.ctx.currentTime), 'hiding the Drac cancels its already scheduled flame');
  assert(menu.plays(click, menu.ctx.currentTime), 'hiding the Drac preserves the selector click');
  menu.clearMenuSfx();
  assert(!menu.plays(click, menu.ctx.currentTime), 'background cancels transient menu voices');
  const doc = globalThis.document;
  try {
    globalThis.document = { hidden: false, hasFocus: () => false };
    const n = menu.ctx.sources.length; menu.sfx('flama');
    assert.equal(menu.ctx.sources.length, n, 'blur before suspend resolves cannot schedule a flame');
    document.hidden = true; document.hasFocus = () => true; menu.sfx('flama'); menu.sfx('flama', 0, true);
    assert.equal(menu.ctx.sources.length, n, 'hidden events cannot schedule a flame');
  } finally { if (doc === undefined) delete globalThis.document; else globalThis.document = doc; }
  const menuSound = graph();
  menuSound.menuMusic = true; menuSound.menuToken = {};
  menuSound.sfx('flama'); const oldFlame = menuSound.ctx.sources.at(-1);
  menuSound.setMenuMusic(false);
  assert(!menuSound.plays(oldFlame, menuSound.ctx.currentTime), 'silencing the menu stops a flame already sounding');
  const quietSources = menuSound.ctx.sources.length;
  for (const kind of ['menu', 'flama', 'perfect', 'crack']) menuSound.sfx(kind);
  assert.equal(menuSound.ctx.sources.length, quietSources, 'muted menu buttons and demo effects schedule nothing');
  menuSound.sfx('flama', 0, true);
  assert(menuSound.ctx.sources.length > quietSources, 'manual free-mode fire sounds with the music off');
  menuSound.clearMenuSfx();
  menuSound.menu(false); // A BALLAR: same saved preference, full game sound
  menuSound.sfx('start'); menuSound.sfx('flama');
  assert(menuSound.ctx.sources.length > quietSources && menuSound.menuMusic === false, 'game effects return without changing the saved menu preference');
  menuSound.menu(true);
  const returnedSources = menuSound.ctx.sources.length;
  menuSound.sfx('menu'); menuSound.sfx('flama');
  assert.equal(menuSound.ctx.sources.length, returnedSources, 'returning to the menu restores silence');
  menuSound.ambient = Promise.resolve({ duration: 30 });
  menuSound.setMenuMusic(true); await menuSound.ambient;
  const enabledSources = menuSound.ctx.sources.length;
  menuSound.sfx('menu');
  assert(menuSound.ctx.sources.length > enabledSources, 'enabling menu sound restores fresh button effects');
  // A free-mode landing's «BUUUM»: the sub-bass (the first source) falls in pitch; the figure's weight lowers, lengthens and
  // loads it, the contact speed scales its level, a bounce within 150 ms stays silent, and with the menu music off it still sounds (an explicit action).
  const landing = (speed, weight, tweak) => {
    const g = graph(); tweak?.(g);
    g.sfx('thud', speed, true, weight);
    const sub = g.ctx.sources[0];
    return { g, n: g.ctx.sources.length, from: sub?.frequency.events[0][0], to: sub?.frequency.events[1][0], len: sub && sub.end - sub.at - 0.02, peak: sub?.outs[0].gain.events[1][0] };
  };
  const light = landing(4.8, 1), heavy = landing(4.8, 1.5), soft = landing(2.4, 1);
  assert(light.n === 6 && light.from > light.to && light.len > 0.25, 'a landing is a falling sub-bass, a partial, a thump, the cobbles, a tail and a slap');
  assert(heavy.from < light.from && heavy.to < light.to && heavy.len > light.len && heavy.peak > light.peak, 'the heavier figure lands lower, longer and louder');
  assert(soft.peak < light.peak * 0.6 && soft.from === light.from, 'a gentler contact is quieter, not different in pitch');
  assert(light.g.ctx.sources.every(s => light.g.audible(s)), 'it reaches the speakers through the usual bus');
  light.g.sfx('thud', 4.8, true, 1);
  assert.equal(light.g.ctx.sources.length, light.n, 'a bounce reporting the same landing again is silent');
  light.g.ctx.currentTime += 0.2; light.g.sfx('thud', 4.8, true, 1);
  assert(light.g.ctx.sources.length > light.n, 'the next landing sounds');
  assert.equal(landing(4.8, 1, g => { g.menuToken = {}; g.menuMusic = false; }).n, 6, 'a free-mode landing still sounds with the menu music off, like the fire');
  assert.equal(landing(4.8, 1, g => { g.ctx.state = 'suspended'; }).n, 0, 'no landing before the audio is unlocked');
  const runBus = landing(4.8, 1, g => g.menu(false));
  assert(runBus.n === 6 && runBus.g.voices.size === 6, 'a landing’s voices belong to the bus, so leaving ends them');
  // A phone speaker drops everything under ~300 Hz, and the sub alone is 96% of the energy below 150 Hz (measured with an
  // OfflineAudioContext: through a 350 Hz high-pass its peak fell to ~0.05 of 0.48). The landing must also carry a body in the
  // 150–800 Hz band at a real fraction of the sub's level, for both figures, and stay warm (nothing above ~1 kHz).
  for (const weight of [1, 1.5]) {
    const { g } = landing(4.8, weight), sources = g.ctx.sources;
    const level = s => Math.max(...(s.outs[0].gain ?? s.outs[0].outs[0].gain).events.map(e => e[0])); // (a filtered voice goes source → filter → gain)
    const freqs = s => s.frequency.events.map(e => e[0]);
    const sub = sources[0], thump = sources.find(s => s.type === 'triangle');
    const slap = sources.find(s => s.outs[0]?.type === 'bandpass');
    assert(thump && Math.min(...freqs(thump)) >= 100 && Math.max(...freqs(thump)) >= 250 && level(thump) >= level(sub) * 0.6, `weight ${weight}: a thump at the phone speaker's pitch, not far under the sub`);
    assert(slap && slap.outs[0].frequency.value >= 400 && slap.outs[0].frequency.value <= 800 && level(slap) >= 0.2, `weight ${weight}: a mid-band slap`);
    assert(sources.every(s => (s.type !== 'sine' && s.type !== 'triangle') || Math.max(...freqs(s)) <= 1000), `weight ${weight}: warm, no oscillator above 1 kHz`);
    assert(sources.every(s => !s.outs[0]?.frequency || s.outs[0].frequency.value <= 1000), `weight ${weight}: warm, no filter opens above 1 kHz`);
  }
  globalThis.location = { search: '?thud=cavern' };
  try { assert(landing(4.8, 1).len > light.len, '?thud picks another variant'); } finally { delete globalThis.location; }
  const c = graph(), ctx = c.ctx;
  c.menu(false); // beginRun (main.js): a run's bus
  assert.equal(await c.start(3, 0, 100), true);
  c.countIn([-2.6, -1.8, -1]); // the 3, 2, 1 before the song, 0.4–2 s ahead on the audio clock (main.js: on its beats)
  c.sfx('perfect'); c.sfx('miss'); c.sfx('ovation'); c.sfx('flama'); c.sfx('tro');
  assert(ctx.sources.some(s => s.effectKind === 'flama') && ctx.sources.some(s => s.effectKind === 'tro' && s.at > ctx.currentTime), 'real figure sounds play on the run bus, including delayed TRO crackles');
  const run = ctx.sources.slice();
  assert(run.filter(s => s.at > ctx.currentTime).length >= 6, 'the count-in is queued ahead on the audio clock');
  ctx.currentTime += 0.4; // paused a moment into the count-in (the clock frozen there), then «Torna al menú»: toTitle
  c.stop(); c.menu(true);
  const left = ctx.currentTime;
  await new Promise(r => setTimeout(r, 120));
  for (const s of run) assert(!c.plays(s, left + 0.05), 'no source the run scheduled survives toTitle');
  assert.equal(c.voices.size, 0);
  // the crowd under the song: a few hands on a beat and a «eeh!» live on the run's bus and end with it; the murmur follows the streak
  const e = graph(); e.menu(false);
  e.clapBurst(0.06); e.sfx('eh');
  assert(e.voices.size >= 3, 'the claps and the yell are the run’s voices');
  const gains = [];
  e.amb = { gain: { setTargetAtTime: v => gains.push(+v.toFixed(4)) } };
  e.setCrowd(1); e.setCrowd(1); e.setCrowd(0);
  assert.deepEqual(gains, [0.077, 0.035], 'the murmur is 2.2x louder on a streak (once, not on every call) and back to normal');
  const before = e.ctx.currentTime; e.stop(); e.menu(true);
  await new Promise(r => setTimeout(r, 120));
  for (const s of e.ctx.sources) assert(!e.plays(s, before + 0.05), 'the crowd’s claps and yell end with the run');
  c.sfx('menu'); // the title's own sfx still play, straight to `out`
  assert(c.plays(ctx.sources.at(-1), ctx.currentTime), 'the title’s sfx are unaffected');

  // A start() still loading when the run is left: it resolves later and plays nothing (no song, no count-in).
  const d = graph(); let loaded;
  d.ready = new Promise(r => { loaded = r; });
  d.menu(false);
  const late = d.start(3, 0, 100);
  d.stop(); d.menu(true); // left while loading
  loaded();
  assert.equal(await late, false, 'a start() resolving after stop() does not start');
  d.countIn([-3, -2, -1]); // main.js's .then would only do this on `true`; even so, nothing is scheduled
  assert.equal(d.ctx.sources.length, 0, 'nothing at all was scheduled for the left run');
}
console.log('leaving a run silences everything it queued ok');

// The applause (Chip's 'ovation'): built in small idle slices from the first frame on, so each slice must stay cheap
// (a phone paid ~10 ms of every frame for it after TOCA LA PANTALLA), and it must still sound like a crowd.
{
  const bufCtx = { sampleRate: 48000, createBuffer: (n, len) => { const ch = Array.from({ length: n }, () => new Float32Array(len)); return { ch, getChannelData: i => ch[i] }; } };
  const slices = [], job = applause(bufCtx, f => slices.push(f));
  let n = 0, worst = 0;
  while (slices.length) { const t = performance.now(); slices.shift()(); worst = Math.max(worst, performance.now() - t); n++; }
  assert(job.done && n >= 30, `built over many slices (${n})`);
  // Guard the synthesis cost without charging time spent waiting for CPU on a busy host.
  const cpuStart = process.cpuUsage(), t = performance.now(), whole = applause(bufCtx, () => {}).finish(), ms = performance.now() - t;
  const cpu = process.cpuUsage(cpuStart), cpuMs = (cpu.user + cpu.system) / 1000;
  assert(cpuMs < 110, `the whole applause stays cheap (${cpuMs.toFixed(0)} ms CPU, ${ms.toFixed(0)} ms elapsed)`);
  for (const d of whole.ch) {
    let peak = 0, sum = 0, bad = 0;
    for (const v of d) { if (!Number.isFinite(v)) bad++; peak = Math.max(peak, Math.abs(v)); sum += v * v; }
    const rms = Math.sqrt(sum / d.length);
    assert(!bad && peak < 0.6 && rms > 0.025 && rms < 0.08, `a crowd's level on both channels (peak ${peak.toFixed(2)}, rms ${rms.toFixed(3)})`);
  }
  console.log(`applause: ${n} slices, worst ${worst.toFixed(1)} ms elapsed, whole ${cpuMs.toFixed(0)} ms CPU / ${ms.toFixed(0)} ms elapsed ok`);
}

{ // a device that won't start rejects ctx.resume(): swallowed, not an unhandled rejection
  const c = Object.create(Chip.prototype);
  c.ctx = { resume: () => Promise.reject(new DOMException('Failed to start the audio device', 'InvalidStateError')) };
  const seen = []; process.on('unhandledRejection', e => seen.push(e));
  c.resume(); await new Promise(r => setTimeout(r, 10));
  assert.equal(seen.length, 0, 'resume() rejection is swallowed');
  c.ctx.resume = () => { throw new DOMException('Context closed', 'InvalidStateError'); };
  assert.doesNotThrow(() => c.resume(), 'synchronous unlock failure cannot block entry');
}

{
  const saved = globalThis.fetch;
  const dom = name => Object.assign(new Error('secret message https://x.test/a.mp3'), { name });
  const ok = (extra = {}) => ({ ok: true, status: 200, arrayBuffer: async () => new ArrayBuffer(4), ...extra });
  const tags = async (fetchImpl, decode = async () => ({ duration: 1 })) => {
    globalThis.fetch = fetchImpl;
    const c = Object.create(Chip.prototype);
    c.ctx = { decodeAudioData: decode };
    c.urls = { audio: 'song' };
    c.ready = c.loadRecording();
    const e = await c.ready.then(() => null, e => e);
    assert(e, 'it failed');
    assert.equal(c.ready, null, 'a failed preload allows another request');
    assert.equal(e.cause, undefined, 'no cause chain');
    assert(!/secret|x\.test/.test(e.message), 'no browser text');
    return audioFailureTags(e);
  };
  try {
    assert.deepEqual(await tags(async () => { throw dom('TypeError'); }), { name: 'TypeError', phase: 'fetch' });
    assert.deepEqual(await tags(() => { throw dom('NetworkError'); }), { name: 'NetworkError', phase: 'fetch' }, 'a synchronous throw too');
    assert.deepEqual(await tags(async () => ({ ok: false, status: 503 })), { name: 'Error', phase: 'http', status: 503 });
    assert.deepEqual(await tags(async () => ok({ arrayBuffer: async () => { throw dom('AbortError'); } })), { name: 'AbortError', phase: 'read' });
    const stream = { read: async () => { throw dom('NetworkError'); } };
    assert.deepEqual(await tags(async () => ok({ headers: { get: () => '10' }, body: { getReader: () => stream } })), { name: 'NetworkError', phase: 'read' }, 'a body stream that breaks');
    assert.deepEqual(await tags(async () => ok(), () => { throw dom('EncodingError'); }), { name: 'EncodingError', phase: 'decode' }, 'decode throws synchronously');
    assert.deepEqual(await tags(async () => ok(), async () => { throw dom('EncodingError'); }), { name: 'EncodingError', phase: 'decode' });
    const forged = Object.assign(new Error('x'), { phase: 'https://x.test', status: 'abc', name: 'secret@mail' });
    assert.deepEqual(audioFailureTags(forged), { name: 'Other', phase: 'unknown' });
    assert.deepEqual(audioFailureTags({ phase: 'decode', status: 503, errName: 'EncodingError', name: 'EncodingError' }), { name: 'EncodingError', phase: 'unknown' }, 'not ours: unknown');
    assert.deepEqual(audioFailureTags(null), { name: 'Other', phase: 'unknown' });
    const real = await tags(async () => ({ ok: false, status: 503 }));
    assert.equal(real.status, 503);
    let n = 0;
    globalThis.fetch = async () => (++n === 1 ? { ok: false, status: 500 } : ok());
    const c = Object.create(Chip.prototype);
    c.ctx = { decodeAudioData: async () => ({ duration: 2 }), currentTime: 0, createBufferSource: () => ({ connect: t => t, start() {}, stop() {} }), createGain: () => ({ connect: t => t, gain: { setValueAtTime() {}, linearRampToValueAtTime() {} } }) };
    c.unlock = () => {};
    Object.defineProperty(c, 'clock', { value: { run() {} } });
    c.ready = c.loadRecording();
    await assert.rejects(c.ready);
    assert.equal(await c.start(), true, 'start retries after a failure');
    assert.equal(n, 2);
  } finally {
    globalThis.fetch = saved;
  }
  console.log('audio failure phases and privacy ok');
}

{ // Free mode's radio (ui/free-music.js): its own source, never the run's; the menu loop rests under it and comes back after
  const sources = [];
  const fake = () => {
    const c = Object.create(Chip.prototype);
    c.ctx = { currentTime: 5, state: 'running',
      createGain: () => ({ connect: t => t, disconnect() {}, gain: { events: [], setValueAtTime(v, t) { this.events.push(['set', v, t]); }, linearRampToValueAtTime(v, t) { this.events.push(['ramp', v, t]); }, setTargetAtTime(v, t) { this.events.push(['target', v, t]); } } }),
      createBufferSource: () => { const s = { connect: t => t, started: false, stopped: false, start() { assert(!this.started, 'buffer sources are single use'); this.started = true; }, stop() { this.stopped = true; } }; sources.push(s); return s; } };
    c.out = c.music = {}; c.unlock = () => {}; c.menuMusic = true; c.ambient = Promise.resolve({ duration: 40 });
    return c;
  };
  const tick = () => new Promise(r => setTimeout(r, 5));
  const c = fake();
  c.menu(true); await tick();
  const loop = c.menuSrc;
  assert(loop?.src.started, 'the menu loop plays');
  c.radio({ duration: 90 }, { end: 88 });
  assert(c.radioSrc && loop.src.stopped && !c.menuSrc, 'a song rests the menu loop');
  c.menu(true); await tick();
  assert(!c.menuSrc, 'menu(true) (a state change on the menu) never starts the loop under the song');
  const playing = c.radioSrc;
  c.loadRecording = () => Promise.resolve(); c.setSong({ audio: 'other.mp3' });
  assert(playing && c.radioSrc === playing, 'a figure change on the selector does not cut it (setSong empties buf, not the radio)');
  assert.equal(c.t0, null, 'nor does the radio set the run clock');
  const song = c.radioSrc.src;
  c.radio(null); await tick();
  assert(song.stopped && c.menuSrc?.src.started, 'leaving it fades back to the menu loop');
  c.radio({ duration: 90 });
  const ended = []; c.radio({ duration: 90 }, { onEnd: () => { ended.push(1); c.radio(null); } });
  c.radioSrc.src.onended(); await tick();
  assert.deepEqual(ended, [1], 'onEnd when the song plays out');
  assert(c.menuSrc?.src.started, 'natural completion starts a fresh menu source after radioSrc was cleared');
  const returned = c.menuSrc;
  assert.notEqual(returned.src, loop.src, 'return creates a fresh source instead of reusing the stopped loop');
  assert.equal(returned.g.gain.events.at(-1)[1], 0.9, 'the returned menu fades up to its audible gain');
  c.radio(null); c.menu(true); await tick();
  assert.equal(c.menuSrc, returned, 'repeated menu requests keep the sounding loop');
  const waiting = fake();
  let decode;
  waiting.ambient = new Promise(resolve => { decode = resolve; });
  waiting.menu(true);
  waiting.radio({ duration: 90 });
  decode({ duration: 40 }); await tick();
  assert(waiting.radioSrc && !waiting.menuSrc, 'a late menu decode never starts a second transport under the radio');
  waiting.radio(null); await tick();
  assert(waiting.menuSrc?.src.started, 'returning after the cancelled decode still starts the menu');
  c.radio({ duration: 90 });
  const obsolete = c.radioSrc.src.onended;
  c.radio({ duration: 80 });
  const replacement = c.radioSrc;
  obsolete(); await tick();
  assert.equal(c.radioSrc, replacement, 'a queued ended callback cannot replace a newer song');
  const mutedEnd = c.radioSrc.src.onended;
  c.setMenuMusic(false);
  mutedEnd(); await tick();
  assert(!c.radioSrc && !c.menuSrc, '«Silenci» (the speaker preference) stops the radio and keeps the loop off');
  c.setMenuMusic(true); await tick();
  c.radio({ duration: 90 });
  c.menu(false);
  assert(!c.radioSrc && !c.menuSrc, 'a run (menu(false)) stops the radio');
  await tick();
  assert(!c.menuSrc, 'and the loop does not come back under the run');
  c.menuToken = null;
  c.radio({ duration: 90 });
  assert(!c.radioSrc, 'a song that finishes loading after a run started never plays');
  console.log('free mode radio contracts ok');
}
