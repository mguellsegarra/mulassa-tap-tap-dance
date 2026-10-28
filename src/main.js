// Mulassa Tap Tap Dance: the composition root. Each system lives in its own module (core, scene, game, hud, ui, dev);
// this file imports them in the order they must start, wires the input and the sheets' buttons together, and runs the frame loop.
import './platform/polyfills.js';
import { PHOTO } from './game/photo-control.js';
import { errors } from './services/errors.js';
import './services/update.js';
import { song, selectedFigure, beatAt, BEAT } from './game/figure-song.js';
import { adaptiveQuality } from './platform/adaptive-quality.js';
import { waitForWarmup, linkPrograms } from './platform/boot.js';
import { markLeaderboardDebugUse } from './services/leaderboard-result.js';
import { Q, pageActive, CALM, STARS } from './core/env.js';
import { FINAL } from './dev/final-test.js';
import { pace, RAWCLOCK, viewClock } from './core/timing.js';
import { qualityLevel, renderProfile, softwareGl, stepPeople, freePlayPeople, GPU, renderer, camera, plaza, scene, setQualityLevel, renderScreen } from './scene/stage.js';
import { initFigureObjects, hideFigures } from './figures/objects.js';
import { G, chip, clock, songTime, drawT, audioEngine, setClock, setDrawT, offsetMs } from './game/state.js';
import { audioFailureTags } from './platform/audio-load.js';
import { animConfetti } from './scene/confetti.js';
import { applyRenderQuality, activeCrowd } from './scene/quality.js';
import { resize, hud, HH, K, sizedW, sizedDpr, appHeight, W, H, SAFE } from './hud/canvas.js';
import { loader } from './ui/handles.js';
import { sheets } from './ui/sheets.js';
import { fontsReady, warmups } from './hud/sprites.js';
import './hud/primitives.js';
import { balloonView, balloonFx, setBalloonView } from './hud/balloon.js';
import { M, act } from './scene/figure-springs.js';
import { animStage, resetMotionImpact } from './scene/stage-motion.js';
import { padEl } from './hud/layout.js';
import { bubbles, bubble, at } from './hud/bubbles.js';
import { animCrowd } from './scene/crowd.js';
import { animFireworks, animFinaleLights } from './scene/fx.js';
import { dracFrame } from './figures/drac/drac-show.js';
import { bouFrame } from './figures/bou/bou-show.js';
import './hud/lane.js';
import './hud/top.js';
import './hud/warm.js';
import './hud/banner.js';
import './hud/results.js';
import { clearCameraImpact } from './scene/cameras.js';
import { BOU_FINALE } from './figures/bou/bou-bills.js';
import { PERF, perfSample, perfReset, qualitySample, showPerfLine } from './dev/perf.js';
import { renderHero } from './scene/share-capture.js';
import { precompile } from './scene/precompile.js';
import { autoplay, collapse, judge, press } from './game/judge.js';
import { finish, songWait, musicLine, startFinal, previewResults, startPractice, endPractice, choose } from './game/flow.js';
import './ui/pad.js';
import './ui/focus.js';
import './ui/fullscreen.js';
import { updateControls, viewMode, viewT, hudBlank, setHudBlank, steers, setView, freeDance } from './ui/controls.js';
import { debugAction } from './dev/debug.js';
import { drawHud } from './hud/draw.js';
import { watchAudio } from './ui/pause-actions.js';
import { tickReel, REEL, setReelIdle } from './game/showreel.js';
import { reelIdle } from './ui/reel-idle.js';
import { reelDissolve, reelFadeLive } from './ui/reel-fade.js';
import './ui/backdrop.js';
import './ui/input.js';
import './ui/sheets-setup.js';
import { frameCamera, propsFor } from './ui/frame-camera.js';
import { tickGame } from './game/tick.js';

window.__mulassaBootPhase = 'init';
initFigureObjects(); // both rigs exist before shader warmup and the first frame

const monitorFrames = adaptiveQuality({ ceiling: qualityLevel, level: () => qualityLevel, report: qualitySample,
  change: (level, reason) => { setQualityLevel(level); stepPeople(level, G.state === 'splash', reason === 'scope-end'); applyRenderQuality({ transition: !loader.covering }); resize(); precompile(); },
});
let glName; // crash reports' context, read only when one is sent
errors.context(() => ({ state: G.state, diff: G.diff, practice: !!G.practice, paused: G.paused, quality: renderProfile.name, softwareGl,
  gl: glName ??= GPU.renderer ? GPU.renderer.slice(0, 120) : (() => { try { const gl = renderer.getContext(), x = gl.getExtension('WEBGL_debug_renderer_info');
    return String(gl.getParameter(x ? x.UNMASKED_RENDERER_WEBGL : gl.RENDERER)).slice(0, 120); } catch { return 'unknown'; } })() }));

// ------------------------------------------------------------------ loop
let last = performance.now(), qualityCost = NaN;
const renderReelFade = cam => { propsFor(cam); renderer.render(scene, cam); propsFor(camera); }; // (ui/reel-fade.js: the dissolve's outgoing shot, with its own props hidden)
const resetFrameTime = () => { last = null; qualityCost = NaN; pace.reset(); monitorFrames.reset('activity'); perfReset(); clearCameraImpact(); resetMotionImpact(); };
for (const event of ['blur', 'focus', 'pagehide', 'pageshow', 'resize', 'orientationchange']) addEventListener(event, resetFrameTime);
document.addEventListener('visibilitychange', resetFrameTime);
// a menu's own work after a tap or key (layout, sheets, scrolls) is no GPU overload: its slow frames dropped an old laptop's quality
for (const event of ['pointerdown', 'keydown', 'wheel']) addEventListener(event, () => { if (G.state !== 'play' && !PHOTO.on) monitorFrames.reset('ui'); }, { passive: true });

if (Q.has('sizes')) import('./dev/sizes-edit.js').then(m => m.setupSizesEdit()); // ?sizes: each selector figure's height beside the gegants, set by eye (src/dev/sizes-edit.js)
if (Q.has('vp')) import('./dev/vp-label.js').then(m => m.setupVpLabel()); // ?vp: viewport, dpr, selector zoom and pointer in a corner label (src/dev/vp-label.js)
if (Q.has('escala')) import('./dev/escala.js').then(m => m.setupEscala(Q.get('escala'))); // ?escala=0.85: the selector's zoom set by hand (src/dev/escala.js)
function frame(now) {
  if (window.__mulassaBootFailure) return; // an explicit retry owns recovery; no hidden game burning battery
  requestAnimationFrame(frame);
  if (innerWidth !== sizedW || devicePixelRatio !== sizedDpr || Math.abs(HH * K - appHeight()) > 1) { resize(); resetFrameTime(); }
  // Safari may leave hasFocus() false until a touch, even with the entrance fully visible.
  // Its demo needs visibility, not keyboard focus; audio still waits for the entrance tap.
  // Other screens retain their focus protection, and every hidden page rests.
  if (document.hidden || (!coverUp && G.state !== 'splash' && !pageActive())) { last = null; return; }
  if (!drawn && renderer.getContext().isContextLost()) { last = null; return; } // a no-op render cannot certify readiness
  if (last === null) last = now; // no elapsed background time enters the demo or effect emitters
  watchAudio(now); // a run whose audio clock stands still pauses, so the Continua tap restarts it
  if (!pace(now, G.state === 'play')) return; // 120 Hz screens that can't keep up: every other refresh (framePacer); never back up to 120 mid-song
  const f0 = performance.now();
  clearCameraImpact();
  // The previous draw's cost belongs to this interval. Apply profile/DPR changes before drawing: resize clears both canvases.
  monitorFrames.scope(PHOTO.on); freePlayPeople(PHOTO.on); // free play's drops are its own: leaving it restores the level (a trial) and its people
  // the song's over during its closing chant (eeeh): nothing left to protect, and a step down there (a resize, every HUD
  // sprite repainted) cost a Galaxy S10 a 100 ms hitch on top of the chant's own new sprites
  monitorFrames(now - last, qualityCost, pace, G.state === 'play',
    drawn && !coverUp && !loader.covering && !renderer.getContext().isContextLost() && !(G.state === 'play' && G.eeeh), G.state === 'play' && !G.paused);
  const frameS = (now - last) / 1000, dt = G.paused ? 0 : Math.min(0.05, frameS); // frameS: real seconds since the last drawn frame
  const heard = chip?.t0 != null ? chip.now(RAWCLOCK ? undefined : now) : -1; // the song at this frame's time (de-stepped: smooth notes)
  last = now;
  setClock(clock + (dt));
  let beat = heard > 0 ? beatAt(heard) : clock / BEAT, t = 0, vt = 0, live = 1;

  if (G.resuming != null && (G.state !== 'play' || songTime() >= G.resuming)) { G.resuming = null; G.paused = false; }
  if (G.state === 'play') { t = songTime(); vt = setDrawT(chip?.t0 != null ? viewClock(heard - offsetMs / 1000, G.paused ? 0 : frameS) : t); live = Math.min(1, Math.max(0, (vt - G.go) / 0.12 + 1)); } // t: the song now (misses, autoplay); vt: at the frame's rAF time, what is drawn. Same clock, eased over the audio device's own jumps (viewClock). Still until the first note
  if (G.resuming != null) t = vt = setDrawT(G.resuming); // the 3, 2, 1 after a pause: the scene holds still at the pause point (the song clock is running back up to it)
  const pendingSel = sheets.select?.pending ?? sheets.select?.figure?.status === 'aviat';
  tickReel(G.state === 'select' && !viewMode && !PHOTO.on && !pendingSel && !Q.has('still'), selectedFigure.id, chip?.menuBeat?.(), dt, CALM.matches, G.state === 'play' && G.watch ? (heard > 0 ? beat : 0) : null); // the selector's showreel: her song dance on the menu loop's beat, filmed as a dance film; «Mira el ball» on the song's beat
  if (REEL.cut && !REEL.fresh && PERF?.mode !== 'no3d') { renderScreen(); reelDissolve(renderer.domElement, W * K, HH * K, camera); } // a cut dissolves: the outgoing shot once more, still in its camera, copied to fade out over the new one; a figure change cuts (its old shot already shows the new figure: two changes)
  const reelWide = reelIdle(now); setReelIdle(reelWide); // left untouched, its UI fades
  beat = tickGame(t, vt, beat, dt);
  if (PHOTO.on && !steers()) setView(false);
  animStage(dt, beat, live);
  // a pending selection hides both models; photo mode shows the existing pair without changing selection
  if (G.state === 'select' && !viewMode && pendingSel) { hideFigures(); } // (the collas with them)
  const c0 = PERF && performance.now();
  const menuHeard = G.state === 'play' ? null : sheets.music?.beat() ?? chip?.menuBeat?.(); // on the menus what sounds: the radio's song or the menu loop
  animCrowd(dt, menuHeard ?? beat, vt, live); // the plaça claps on it
  freeDance(menuHeard);
  if (PERF) PERF.crowd += performance.now() - c0; // ?perf: the crowd's own share of the js
  animConfetti(dt);
  animFireworks(dt);
  dracFrame(dt, vt); // the Drac's fire, red smoke and traca; nothing for the Mulassa
  bouFrame(dt, vt); // the Bou's disco night, carretilles and banknotes
  animFinaleLights(beat);

  frameCamera(dt, now, reelWide);
  const p0 = PERF && performance.now();
  if (PERF?.mode !== 'no3d') { reelFadeLive(renderReelFade, renderer.domElement); renderScreen(); } // (a dissolve: the outgoing shot first, live)
  if (PERF?.mode === 'sync') renderer.getContext().readPixels(0, 0, 1, 1, 6408, 5121, PERF.px ??= new Uint8Array(4)); // RGBA, UNSIGNED_BYTE
  const p1 = PERF && performance.now();
  if (PERF) { const ri = renderer.info.render; PERF.calls = ri.calls; PERF.tris = ri.triangles; } // the plaza pass only: the balloon overlay's render() resets renderer.info

  updateControls();
  const padVis = G.state === 'play' && !G.paused && !G.collapseT && !G.watch && BOU_FINALE.endT < 0 ? 'visible' : 'hidden'; // (the Bou's close-up: a tap anywhere)
  if (padEl.style.visibility !== padVis) padEl.style.visibility = padVis;
  const hudOff = viewMode && now - viewT >= (CALM.matches ? 0 : 200); // «mode foto», faded out: cleared once, then no HUD work at all
  setBalloonView(null);
  if (!hudOff || !hudBlank) H.clearRect(0, 0, W, HH);
  setHudBlank(hudOff);
  if (!hudOff && !Q.has('view') && PERF?.mode !== 'nohud') try { drawHud(vt); } catch (err) { // a drawing bug must never leave the HUD clipped or transformed: log it, reset the canvas state
    if (err.message !== hudError) { hudError = err.message; console.error(err); errors.capture(err, { where: 'hud' }); }
    resize();
  }
  const o0 = PERF && performance.now();
  if (balloonFx && balloonFx.update(dt, balloonView, W, HH, clock) && PERF?.mode !== 'no3d') try { balloonFx.render(renderer, K); } catch (err) { console.error(err); } // over the plaza, under the HUD canvas
  if (PERF) PERF.ovNow = performance.now() - o0; // (perfSample adds it up)
  if (songWait) loader.status(musicLine());
  if (!drawn) { // the first frame is on screen: lift the page cover, then start on the audio (outside the first paint)
    drawn = true;
    window.__mulassaBootPhase = 'ready';
    window.__mulassaBooted = true; // index.html's boot watchdog stands down
    fontsReady.then(() => { fontsIn = true; });
    loadMark('first frame');
    errors.start(); // crash reports: the SDK loads when the browser is idle (nothing at all without a DSN)
    if (FINAL?.board === 'me') sheets.board.openBoard();
    else if (FINAL) startFinal();
  }
  // The page cover lifts once the web fonts are in and the queued words are painted (warmups: a big outlined count-in
  // word is ~20 ms on a desktop, several times that on a phone), at most COVER_WARM ms after the fonts: on a slow first
  // load they were painted on the splash, right under the tap. (loader.ready() still waits for its minimum time.)
  if (coverUp && fontsIn && (!warmups.length || now - (coverAt ??= now) > COVER_WARM)) { coverUp = false; loader.ready(); if (STARS >= 0) previewResults(STARS); } // ?stars: only once the page cover is gone, or the animation plays unseen
  qualityCost = performance.now() - f0;
  if (PERF) perfSample(f0, p0, p1, now);
  if (PERF?.line) showPerfLine(); // on screen too: a tablet has no console
}
let hudError = '', drawn = false, fontsIn = false, coverUp = true, coverAt = null, COVER_WARM = 1500;
// ?perf also logs the load: [load] <stage> <ms since navigation>.
function loadMark(stage) { if (PERF) console.log('[load]', stage, Math.round(performance.now())); }
loadMark('module');
loader.jokes(); // funny lines under the calçot until the plaça is ready
requestAnimationFrame(() => setTimeout(() => { // one paint first: that line shows while a compile holds the thread
  if (window.__mulassaBootFailure) return;
  startAudio(); // the song downloads and decodes (off the main thread) while the shaders compile, all under the cover
  window.__mulassaBootPhase = 'shaders';
  waitForWarmup(() => localPeopleReady.then(() => precompile(true)).then(() => linkPrograms(renderer.info.programs))).then(result => {
    if (window.__mulassaBootFailure) return;
    window.__mulassaBootPhase = 'frame';
    loadMark(result === 'ready' ? 'shaders' : 'shaders fallback');
    requestAnimationFrame(frame);
  });
}));
// The audio engine, suspended (the splash's tap resumes it): the song, the menu loop and the applause are made behind
// the page cover. Made at the first frame they finished on the splash on a slow first load, right under the tap.
function startAudio() {
  try { audioEngine().ready?.then(() => loadMark('song decoded'), e => errors.breadcrumb('audio-load-failed', audioFailureTags(e))); } catch { /* no Web Audio: made at the tap */ } // the run's start loads it again (a failure there is audio-start-failed)
}
window.__dbg = { get G() { markLeaderboardDebugUse(); return G; }, get M() { markLeaderboardDebugUse(); return M; },
  act: debugAction(act), finish: debugAction(finish), collapse: debugAction(collapse), judge: debugAction(judge), press: debugAction(press),
  startPractice: debugAction(startPractice), endPractice: debugAction(endPractice), choose: debugAction(choose),
  get bubbles() { markLeaderboardDebugUse(); return bubbles; }, bubble: debugAction(bubble), at: debugAction(at),
  get crowd() { return activeCrowd; }, get band() { return plaza.band; }, get chip() { return chip; }, get camera() { return camera; }, get clock() { return clock; }, songTime: () => songTime(), get drawTime() { return drawT; }, get offset() { return offsetMs; }, hero: (w, h, id) => renderHero(w, h, id) }; // debug runs never publish; hero: the share photos (public/share/, public/og.jpg)
window.__mulassaBooted ||= 'module'; // ran to the end: index.html's boot watchdog now only waits for the first frame
// The representation cast on every host; ?representation=off retains the original cast for comparisons.
const localPeopleReady = Q.get('representation') !== 'off'
  ? import('./scene/representation.js').then(m => m.setupRepresentation()) : Promise.resolve();
