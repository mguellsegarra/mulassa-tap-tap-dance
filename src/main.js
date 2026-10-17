// Mulassa Tap Tap Dance: the composition root. Each system lives in its own module (core, scene, game, hud, ui, dev);
// this file imports them in the order they must start, wires the input and the sheets' buttons together, and runs the frame loop.
import './platform/polyfills.js';
import { errors } from './services/errors.js';
import * as THREE from 'three';
import song from './song.json';
import { frameMonitor } from './platform/render-quality.js';
import { sectionAt } from './game/chart.js';
import { judgedCount } from './game/progress.js';
import { markLeaderboardDebugUse } from './services/leaderboard-result.js';
import { blocks, smoothDamp } from './scene/framing.js';
import { CHIP } from './hud/title-layout.js';
import { ORBIT, orbitCancel, orbitStep, roomAlong } from './scene/orbit.js';
import { rnd } from './scene/models.js';
import { setupCamEdit } from './dev/cam-edit.js';
import { Q, COARSE, pageActive, beatAt, BEAT, offsetMs, playFrom, FINALE_T, AUTOPLAY, CALM, FINAL, STARS } from './core/env.js';
import { pace, RAWCLOCK, viewClock } from './core/timing.js';
import { qualityLevel, saveQuality, renderProfile, softwareGl, GPU, renderer, camera, CAM_AZ, FRONT, plaza, cameraTarget, camFocus, camFocusTarget, camShift, camXYZ, focusXYZ, scene, setQualityLevel, setCamShift, renderScreen } from './scene/stage.js';
import { G, chip, clock, songTime, drawT, bigPending, audioEngine, setClock, setDrawT } from './game/state.js';
import { audioFailureTags } from './platform/audio.js';
import { TAU } from './core/anim.js';
import { spawnConfetti, burst, animConfetti, setConfettiSettled } from './scene/confetti.js';
import { applyRenderQuality, activeCrowd } from './scene/quality.js';
import { resize, hud, HH, K, sizedW, sizedDpr, appHeight, baseFov, W, H, SAFE } from './hud/canvas.js';
import { loader } from './ui/handles.js';
import { titleL, fontsReady, warmups } from './hud/sprites.js';
import './hud/primitives.js';
import { balloonView, balloonFx, setBalloonView } from './hud/balloon.js';
import { M, trauma, act, animMula, setTrauma } from './scene/mula-motion.js';
import { lane, playBottom, padEl } from './hud/layout.js';
import { bubbles, bubble, at } from './hud/bubbles.js';
import { animCrowd } from './scene/crowd.js';
import { firework, animFireworks, animFinaleLights } from './scene/fx.js';
import './hud/lane.js';
import './hud/top.js';
import { headline } from './hud/praise.js';
import { splashS } from './hud/title.js';
import './hud/warm.js';
import './hud/banner.js';
import './hud/results.js';
import { titleC, titleS, TITLE_FOLLOW, orbitHome, TITLE_SWAY, DRIFT, orbit, pnow, insidePlaza, framePlayCamera, CAMS } from './scene/cameras.js';
import { PERF, perfSample } from './dev/perf.js';
import { heroCam, heroQuadMake, renderHero } from './scene/share-capture.js';
import { autoplay, advance, collapse, judge, press } from './game/judge.js';
import { practiceTick, finish, songWait, musicLine, startFinal, previewResults, startPractice, endPractice, choose } from './game/flow.js';
import './ui/pad.js';
import './ui/focus.js';
import { pauseGame } from './ui/pause.js';
import './ui/fullscreen.js';
import { updateControls, viewMode, viewT, hudBlank, setHudBlank } from './ui/controls.js';
import { fpsTick } from './dev/fps.js';
import { aligaTick, aligaFrameCamera } from './dev/aliga-preview.js';
import { debugAction } from './dev/debug.js';
import { drawHud } from './hud/draw.js';
import './ui/pause-actions.js';
import './ui/backdrop.js';
import './ui/input.js';
import './ui/sheets-setup.js';

const monitorFrames = frameMonitor((steps = 1) => { // steps: 2 when frames are far too slow
  if (qualityLevel > -1) { setQualityLevel(Math.max(-1, qualityLevel - steps)); applyRenderQuality(); resize(); saveQuality(); precompile(); } // now, not at the first GLOBUS pop or firework
});
let glName; // crash reports' context, read only when one is sent
errors.context(() => ({ state: G.state, diff: G.diff, practice: !!G.practice, paused: G.paused, quality: renderProfile.name, softwareGl,
  gl: glName ??= GPU.renderer ? GPU.renderer.slice(0, 120) : (() => { try { const gl = renderer.getContext(), x = gl.getExtension('WEBGL_debug_renderer_info');
    return String(gl.getParameter(x ? x.UNMASKED_RENDERER_WEBGL : gl.RENDERER)).slice(0, 120); } catch { return 'unknown'; } })() }));

// ------------------------------------------------------------------ loop
let last = performance.now();

let audioStallT = null;
// ?cam: the camera editor over the game (src/dev/cam-edit.js): choose a view by eye, copy its numbers, the per-device camera is fitted from them
const CAMED = Q.has('cam') ? setupCamEdit({ hud, camera, active: () => G.state === 'play' && !G.paused, info: () => ({
  cw: innerWidth, ch: HH * K, dpr: devicePixelRatio, K, practice: !!G.practice, touch: COARSE.matches, laneBottom: lane().bottom * K, padTop: playBottom() * K }) }) : null;
function frame(now) {
  requestAnimationFrame(frame);
  if (innerWidth !== sizedW || devicePixelRatio !== sizedDpr || Math.abs(HH * K - appHeight()) > 1) resize();
  if (document.hidden) { last = now; return; }
  // iOS can leave the audio context stopped after an app switch (resume() only works inside a tap): the song clock would stand still
  // with no menu up. Stalled for a second mid-run: pause, so the Reprèn tap is the gesture that restarts it.
  if (G.state === 'play' && !G.paused && chip?.t0 != null && chip.ctx.state !== 'running' && pageActive()) { audioStallT ??= now; if (now - audioStallT > 1000) { audioStallT = null; pauseGame(); } } else audioStallT = null;
  if (!pace(now, G.state === 'play')) return; // 120 Hz screens that can't keep up: every other refresh (framePacer); never back up to 120 mid-song
  const f0 = PERF && performance.now();
  monitorFrames(now - last, G.state === 'play' && !G.paused); // against 60 fps, whatever the pacer aims for (a 120 Hz miss halves the rate first); hitches count only in play
  fpsTick(now);
  const frameS = (now - last) / 1000, dt = G.paused ? 0 : Math.min(0.05, frameS); // frameS: real seconds since the last drawn frame
  const heard = chip?.t0 != null ? chip.now(RAWCLOCK ? undefined : now) : -1; // the song at this frame's time (de-stepped: smooth notes)
  last = now;
  setClock(clock + (dt));
  let beat = heard > 0 ? beatAt(heard) : clock / BEAT, t = 0, vt = 0, live = 1;

  if (G.resuming != null && (G.state !== 'play' || songTime() >= G.resuming)) { G.resuming = null; G.paused = false; }
  if (G.state === 'play') { t = songTime(); vt = setDrawT(chip?.t0 != null ? viewClock(heard - offsetMs / 1000, G.paused ? 0 : frameS) : t); live = Math.min(1, Math.max(0, (vt - G.go) / 0.12 + 1)); } // t: the song now (misses, autoplay); vt: at the frame's rAF time, what is drawn. Same clock, eased over the audio device's own jumps (viewClock). Still until the first note
  if (G.resuming != null) t = vt = setDrawT(G.resuming); // the 3, 2, 1 after a pause: the scene holds still at the pause point (the song clock is running back up to it)
  if (G.state === 'play' && !G.paused) {
    beat = beatAt(Math.max(0, vt));
    const sec = t < playFrom ? G.sec : sectionAt(song, t);
    G.sec = sec; // solemn (A) or playful (B): drives the dancers' mood
    if (Math.floor(beat) !== G.clapBeat) { // section B: a few hands on beats 2 and 4, louder on a streak (audio.js clapBurst)
      G.clapBeat = Math.floor(beat);
      if (sec === 'B' && (G.clapBeat & 1) && G.combo >= 5 && !G.paused && !G.collapseT) chip.clapBurst?.(0.04 + 0.05 * Math.min(1, G.combo / 30));
    }
    // FINAL ESBOJARRAT: the coda until the last hit and the crowd's "eeeeh!" (Taiko's go-go time)
    // The festa (fireworks, lights, crowd, chant) is for everyone; only the double points need >= 70%.
    const fin = t >= FINALE_T && t < song.tail + 0.6 && !G.collapseT, dbl = fin && G.guapo >= 70;
    if (fin && !G.finale) { G.finaleT = clock; chip.sfx('fanfare3'); firework(); firework(); }
    if (dbl && !G.doublePoints) G.doubleT = clock; // the x2 tag pops when the bonus starts (maybe mid-finale)
    G.finale = fin; G.doublePoints = dbl;
    if (fin && Math.floor(beat) !== G.finBeat) { // every beat: a firework, a puff of confetti, a thump
      G.finBeat = Math.floor(beat);
      firework();
      setConfettiSettled(false);
      spawnConfetti(50, c => { c.p.set(M.pos.x + rnd(-3, 3), rnd(5, 7), M.pos.y + rnd(-3, 3)); c.v.set(rnd(-2, 2), rnd(0, 2), rnd(-2, 2)); });
      setTrauma(Math.min(1, trauma + 0.12));
    }
    if (t >= song.end && G.next >= G.chart.length && !G.hold && !bigPending && !G.eeeh && !G.collapseT) { // the "eeeeh!": grand finale volley, for everyone
      G.eeeh = true;
      for (let i = 0; i < 6; i++) setTimeout(() => firework(rnd(-10, 10), rnd(10, 15), rnd(-10, 3), 90), i * 180);
      burst(M.pos.x, M.pos.y);
      // the crowd's chant, in its own rhythm: "guapa, guapa... i guapa!"
      [['GUAPA,', 0], ['GUAPA…', 0.8], ['I GUAPA!', 1.8]].forEach(([w, at]) => setTimeout(() => { if (G.state === 'play') headline(w, 'rainbow', 4, at > 1 ? 1.6 : 0.8, 0.5); }, at * 1000));
      setTrauma(1);
    }
    if (judgedCount(G.counts) > 1) G.shown += (G.guapo - G.shown) * Math.min(1, dt * 4); // the meter eases, it never jumps
    else G.shown = G.guapo; // ...except onto the first judged note: it starts from the real value, not 0
    G.shownE += (G.energy - G.shownE) * Math.min(1, dt * 8); // so does the ànim, a bit quicker
    if (AUTOPLAY && !G.collapseT) autoplay(t);
    if (!G.collapseT) {
      advance(t);
      if (G.practice) practiceTick(t);
      else if (t > song.tail + 1) finish('end');
    } else if (clock - G.collapseT > 3.5) finish('collapse');
  } else if (G.state === 'title' && Math.floor(beat) !== G.lastBeat) { // demo dance on the menu
    G.lastBeat = Math.floor(beat);
    if (G.lastBeat % 2 === 0 && !Q.has('still')) act('LDRU'[(G.lastBeat / 2) % 4]);
  }
  animMula(dt, beat, live);
  aligaTick(clock); // ?aliga only
  const c0 = PERF && performance.now();
  // The Àliga rehearsal keeps spectators at their initial places, clear of the performance ring.
  // Their normal steering follows the hidden Mulassa and would otherwise walk through the aligons.
  if (!Q.has('aliga') || !drawn) animCrowd(Q.has('aliga') ? 0 : dt, beat, vt, live);
  if (PERF) PERF.crowd += performance.now() - c0; // ?perf: the crowd's own share of the js
  animConfetti(dt);
  animFireworks(dt);
  animFinaleLights(beat);

  // camera: during play the mulassa sits near the lane, in the free stage above the pad or
  // the bottom edge, with the crowd around her. A lens shift (view offset) puts her there without tilting the view.
  const mx = G.state === 'play' ? M.pos.x : M.pivot.x * 0.5 + M.pos.x * 0.5, mz = G.state === 'play' ? M.pos.y : M.pivot.y * 0.5 + M.pos.y * 0.5, far = camera.aspect < 1 ? 1.4 : 1; // play follows the body; the menu follows her pivot
  const VIEW = { side: [9, 2.2, 0], front: [0, 2.5, 8], back: [-3, 3, -8], top: [4, 9, 6] }[Q.get('view')];
  let shift = 0; // where her centre should sit, in css px below the middle of the screen
  if (VIEW) {
    camera.position.set(mx + VIEW[0], VIEW[1], mz + VIEW[2]);
    camera.lookAt(mx, 1.4, mz);
  } else if (G.state === 'title' || G.state === 'splash') {
    // orbits her, not the middle: wandering about she'd otherwise pass right in front of the lens, huge. The player
    // may steer it (src/scene/orbit.js: its limits keep it inside the square and above the crowd); left alone it orbits.
    const homeH = 4.2 * far, homeD = 11; // plaza level, in among the crowd (the old high wide shot showed mostly bare floor)
    // her sway and steps never shake the shot: it drifts after her on a critically damped spring (like the play camera; a first-order
    // filter changes velocity the instant she does, which read as a jerk on every hop)
    if (!titleC.on) { titleS.x[0] = mx; titleS.x[1] = mz; titleS.v.fill(0); }
    titleC.x = smoothDamp(titleS, 0, mx, TITLE_FOLLOW, dt); titleC.z = smoothDamp(titleS, 1, mz, TITLE_FOLLOW, dt); titleC.on = true;
    const cx = titleC.x, cz = titleC.z;
    orbitHome.pitch = Math.atan2(homeH - ORBIT.focusY, homeD); orbitHome.dist = Math.hypot(homeD, homeH - ORBIT.focusY);
    // The idle azimuth is the play camera's own (CAM_AZ: no swoop across the plaça when a game starts), swaying slowly and turning
    // a little with her, like the play camera; the player's drag/flick still steers, and after a few idle seconds it eases back.
    { const br = CALM.matches ? 0 : 1, T = clock * TAU;
      orbitHome.yaw = CAM_AZ + br * TITLE_SWAY * (0.65 * Math.sin(T / DRIFT.tAz) + 0.35 * Math.sin(T / DRIFT.tAz2 + 1.3)) + DRIFT.follow * Math.sin(M.yaw - FRONT); }
    if (orbit.fresh) orbit.yaw = orbitHome.yaw; // (the very first frame starts at home)
    const o = orbitStep(orbit, dt, pnow(), orbitHome, roomAlong(cx, cz, Math.sin(orbit.yaw), Math.cos(orbit.yaw), plaza.inner - 1.5));
    const hd = o.x[1] * Math.cos(o.x[0]);
    camera.position.copy(insidePlaza(cameraTarget.set(cx + Math.sin(o.yaw) * hd, ORBIT.focusY + o.x[1] * Math.sin(o.x[0]), cz + Math.cos(o.yaw) * hd), cx, 1.2, cz));
    camera.lookAt(camFocus.lerp(camFocusTarget.set(cx, 1.2, cz), Math.min(1, dt * 2)));
    if (G.state === 'splash') { // her centre between the splash's logo and its prompt; the title's own shift below eases in from it on the tap
      const mid = (HH * 0.2 + splashS() * 1.4 + HH * 0.82 - 14) / 2;
      shift = Math.max(-0.25 * HH * K, Math.min(0.25 * HH * K, (mid - HH / 2) * K));
    }
    if (G.state === 'title' && titleL) { // (the cached layout: measuring here would touch the HUD canvas) a lens shift puts her in the free band between the logo and the choice (not behind either)
      const L = titleL, mid = (L.logo.y + L.logo.h + L.headingY - (L.chipY != null ? CHIP + 6 : 0)) / 2;
      shift = Math.max(-0.25 * HH * L.K, Math.min(0.25 * HH * L.K, (mid - HH / 2) * L.K));
    }
  } else if (G.state === 'play') {
    CAMED?.restoreFov();
    shift = framePlayCamera(dt, mx, mz);
    if (CAMED) shift = CAMED.apply(shift, mx, mz, now);
  } else {
    camera.position.lerp(insidePlaza(cameraTarget.set(mx * 0.6 + 1.5, 9.5 * far, mz * 0.6 + 11 * far), mx * 0.8, 0.6, mz * 0.8 + 1.1), Math.min(1, dt * 2));
    camera.lookAt(camFocus.lerp(camFocusTarget.set(mx * 0.8, 0.6, mz * 0.8 + 1.1), Math.min(1, dt * 2)));
  }
  if (G.state !== 'play') CAMED?.idle();
  if (G.state !== 'title' && orbit.ptrs.size) orbitCancel(orbit); // a game started mid-drag: let go
  if ((G.state !== 'play' || VIEW) && CAMS.live) { // the next game's camera starts from wherever this one is
    CAMS.live = false;
    if (camera.fov !== baseFov()) { camera.fov = baseFov(); camera.updateProjectionMatrix(); }
  }
  setCamShift(G.state === 'play' && !VIEW ? shift : camShift + (shift - camShift) * Math.min(1, dt * 3)); // play: already smoothed
  if (Math.abs(camShift) > 0.5) camera.setViewOffset(W * K, HH * K, 0, -camShift, W * K, HH * K);
  else if (camera.view?.enabled) camera.clearViewOffset();
  aligaFrameCamera(camera); // ?aliga: include all three aligons, including on portrait screens
  camXYZ[0] = camera.position.x; camXYZ[1] = camera.position.y; camXYZ[2] = camera.position.z;
  focusXYZ[0] = mx; focusXYZ[1] = G.state === 'play' ? 1.4 : 1; focusXYZ[2] = mz;
  for (const p of plaza.props) p.mesh.visible = !blocks(p, camXYZ, focusXYZ); // a tree or lamp in the way: gone
  if (trauma > 0) { // shake decays; quadratic so small bumps barely move it. During play only a small accent
    setTrauma(Math.max(0, trauma - dt * 1.6)); // (GUAPA, the finale), added on top: it never feeds the camera's springs
    const k = trauma * trauma * (G.state === 'play' ? 0.35 : 1);
    camera.position.x += Math.sin(clock * 47) * 0.25 * k; camera.position.y += Math.sin(clock * 61) * 0.2 * k;
  }
  const p0 = PERF && performance.now();
  if (PERF?.mode !== 'no3d') renderScreen();
  if (PERF?.mode === 'sync') renderer.getContext().readPixels(0, 0, 1, 1, 6408, 5121, PERF.px ??= new Uint8Array(4)); // RGBA, UNSIGNED_BYTE
  const p1 = PERF && performance.now();
  if (PERF) { const ri = renderer.info.render; PERF.calls = ri.calls; PERF.tris = ri.triangles; } // the plaza pass only: the balloon overlay's render() resets renderer.info

  updateControls();
  const padVis = G.state === 'play' && !G.paused && !G.collapseT ? 'visible' : 'hidden';
  if (padEl.style.visibility !== padVis) padEl.style.visibility = padVis;
  const hudOff = viewMode && now - viewT >= (CALM.matches ? 0 : 200); // «mode foto», faded out: cleared once, then no HUD work at all
  setBalloonView(null);
  if (!hudOff || !hudBlank) H.clearRect(0, 0, W, HH);
  setHudBlank(hudOff);
  if (!hudOff && !Q.has('view') && !Q.has('aliga') && PERF?.mode !== 'nohud') try { drawHud(vt); } catch (err) { // a drawing bug must never leave the HUD clipped or transformed: log it, reset the canvas state
    if (err.message !== hudError) { hudError = err.message; console.error(err); errors.capture(err, { where: 'hud' }); }
    resize();
  }
  const o0 = PERF && performance.now();
  if (balloonFx && balloonFx.update(dt, balloonView, W, HH, clock) && PERF?.mode !== 'no3d') try { balloonFx.render(renderer, K); } catch (err) { console.error(err); } // over the plaza, under the HUD canvas
  if (PERF) PERF.ovNow = performance.now() - o0; // (perfSample adds it up)
  if (songWait) loader.status(musicLine());
  if (!drawn) { // the first frame is on screen: lift the page cover, then start on the audio (outside the first paint)
    drawn = true;
    window.__mulassaBooted = true; // index.html's boot watchdog stands down
    fontsReady.then(() => { fontsIn = true; });
    loadMark('first frame');
    errors.start(); // crash reports: the SDK loads when the browser is idle (nothing at all without a DSN)
    if (FINAL) startFinal();
  }
  // The page cover lifts once the web fonts are in and the queued words are painted (warmups: a big outlined count-in
  // word is ~20 ms on a desktop, several times that on a phone), at most COVER_WARM ms after the fonts: on a slow first
  // load they were painted on the splash, right under the tap. (loader.ready() still waits for its minimum time.)
  if (coverUp && fontsIn && (!warmups.length || now - (coverAt ??= now) > COVER_WARM)) { coverUp = false; loader.ready(); if (STARS >= 0) previewResults(STARS); } // ?stars: only once the page cover is gone, or the animation plays unseen
  if (PERF) perfSample(f0, p0, p1, now);
  if (PERF?.line) { // on screen too: a tablet has no console
    H.font = '600 6px ui-monospace, monospace'; H.textAlign = 'left'; H.textBaseline = 'top';
    H.fillStyle = 'rgba(0,0,0,0.6)'; H.fillRect(0, SAFE.t / K, W, 8); H.fillStyle = '#fff'; H.fillText(PERF.line, 2, SAFE.t / K + 1);
  }
}
let hudError = '', drawn = false, fontsIn = false, coverUp = true, coverAt = null;
const COVER_WARM = 1500;
// ?perf also logs the load: [load] <stage> <ms since navigation>.
function loadMark(stage) { if (PERF) console.log('[load]', stage, Math.round(performance.now())); }
loadMark('module');
loader.jokes(); // funny lines under the calçot until the plaça is ready
requestAnimationFrame(() => setTimeout(() => { // one paint first: that line shows while a compile holds the thread
  startAudio(); // the song downloads and decodes (off the main thread) while the shaders compile, all under the cover
  precompile(true).then(() => { loadMark('shaders'); requestAnimationFrame(frame); });
}));
// The audio engine, suspended (the splash's tap resumes it): the song, the menu loop and the applause are made behind
// the page cover. Made at the first frame they finished on the splash on a slow first load, right under the tap.
function startAudio() {
  try { audioEngine().ready?.then(() => loadMark('song decoded'), e => errors.report('audio-load-failed', audioFailureTags(e))); } catch { /* no Web Audio: made at the tap */ }
}
// Every program up front, for the screen and (hero) for the share photo's render target: that renders with linear
// output, i.e. other programs, which cost ~0.45 s on the first Comparteix (desktop at 4x CPU; more on a phone). Run again
// after a quality step (screen only: the step's own frame is long enough): the shadow map on/off changes every program,
// and the hidden ones (confetti, fireworks) would otherwise compile on their first appearance mid-song (a GLOBUS pop,
// the finale). Never throws; resolves when ready.
function precompile(hero = false) {
  const jobs = [], prev = renderer.getRenderTarget?.() ?? null;
  let rt = null;
  try {
    jobs.push(renderer.compileAsync(scene, camera));
    if (balloonFx) jobs.push(balloonFx.warm(renderer));
    if (hero) {
      renderer.setRenderTarget(rt = new THREE.WebGLRenderTarget(1, 1));
      jobs.push(renderer.compileAsync(scene, heroCam), renderer.compileAsync(heroQuadMake().scene, heroQuadMake().cam));
    }
  } catch { /* compiled by the first render that needs them instead */ } finally {
    if (rt) renderer.setRenderTarget(prev);
  }
  return Promise.all(jobs.map(j => Promise.resolve(j).catch(() => {}))).then(() => { rt?.dispose(); });
}
window.__dbg = { get G() { markLeaderboardDebugUse(); return G; }, get M() { markLeaderboardDebugUse(); return M; },
  act: debugAction(act), finish: debugAction(finish), collapse: debugAction(collapse), judge: debugAction(judge), press: debugAction(press),
  startPractice: debugAction(startPractice), endPractice: debugAction(endPractice), choose: debugAction(choose),
  get bubbles() { markLeaderboardDebugUse(); return bubbles; }, bubble: debugAction(bubble), at: debugAction(at),
  get crowd() { return activeCrowd; }, get band() { return plaza.band; }, get title() { return titleL; }, get chip() { return chip; }, get camera() { return camera; }, get clock() { return clock; }, songTime: () => songTime(), get drawTime() { return drawT; }, get offset() { return offsetMs; }, hero: (w, h) => renderHero(w, h) }; // debug runs never publish; hero: the share photo (public/og.jpg)
window.__mulassaBooted ||= 'module'; // ran to the end: index.html's boot watchdog now only waits for the first frame
