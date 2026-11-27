// Composition root of Mulassa Tower (id campanar): an endless tower-stack game, a stone bell tower that rises until a slab misses.
// The rules are rules.js, the 3D scene.js, the sound audio.js; the page's life is Plassa's (packages/plassa/src/).
// shortcut: the words are provisional Catalan in the page, no locales/ nor Sentry/update watch yet; add them when it leaves POC.
import { createScene } from './scene.js';
import { paintSky, tuneSky, climbSky } from './sky.js';
import { SIZE, FLOOR, RANGE as GAME_RANGE, drop, speedAt, metresOf } from './rules.js';
import { STACK_TRY, STACK_REACH, STACK_PERFECT } from './stack.js';
const RANGE = STACK_TRY ? SIZE * STACK_REACH : GAME_RANGE; // ?stack: the slab comes from farther (stack.js)
import { SFX, unlock, uiBlip, audioPage, watchAudio, hushAudio, resumeAudio } from './audio.js';
import { createBands } from './bands.js';
import { createPieces, TOTAL } from './pieces.js';
import { VITRINA, vitrinaDrop, vitrinaFound } from './vitrina.js';
import { RITME, ritmeStart, ritmeStop, ritmeHold, ritmeTick, ritmeAt, ritmeSpeed, ritmeDrop, ritmeLog, ritmeAudio } from './ritme.js';
import { deviceBest } from '#plassa/best.js';
import { haptic } from '#plassa/haptics.js';
import { setupOrientation } from '#plassa/orientation.js';
import { guardGpu } from '#plassa/gpu-guard.js';
import { stopDoubleTapZoom } from '#plassa/double-tap.js';
import { onEveryGesture } from '#plassa/gesture.js';
import { setUiSound, soundOnPress } from '#plassa/ui-sound.js';
import { setupSheetKeys } from '#plassa/sheet-keys.js';
import { closeOnBackdrop } from '#plassa/backdrop.js';
import { bootLines } from '#plassa/boot-lines.js';
import { onPageLeave } from '#plassa/page-leave.js';
import { onNativeBack, onAppInactive, exitGame } from '#plassa/native.js';
import '#plassa/focus.js';

const $ = id => document.getElementById(id);
const lines = bootLines($('boot-line'));
const pieces = createPieces({ remember: !VITRINA }); // the special pieces' collection (pieces.js); ?vitrina: from none each run
const bands = createBands($('marks'), $('finds'), pieces); // the side bands (bands.js)
const scene = createScene($('game'), { found: (ids, y) => { bands.found(ids, y); if (VITRINA) vitrinaFound(ids); } });
const record = deviceBest('campanar-best');

let ready = false; // the run's first slab is out
let mode = 'menu', n = 1, top, y, axis, pos, dir, score, streak, lastTap = 0;

function show(id) { for (const c of ['menu', 'pause-menu', 'end-menu']) $(c).hidden = c !== id; }
function hud() {
  $('score').textContent = `${metresOf(score)} m`; // the same metres as the end sheet
  bands.height(metresOf(score));
}

// the rhythm: the slab is where the audio clock says, at page time ms (now when left out)
function ritmeSlide(ms) { const s = ritmeAt(ms); pos = top[axis] + s.at * RANGE; dir = s.dir; }

function spawn() {
  axis = n % 2 ? 'x' : 'z';
  dir = 1;
  pos = top[axis] - RANGE;
  scene.moving(n, { ...top, [axis]: pos }, y);
}

function start() {
  scene.reset();
  scene.home(false); // the tower rises out of the haze, then the first slab
  n = 1; y = 0; score = 0; streak = 0;
  looking = 0;
  $('end-banner').hidden = $('end-tap').hidden = true;
  top = { x: 0, z: 0, w: SIZE, d: SIZE };
  mode = 'play';
  show(null);
  $('hud').hidden = false;
  pieces.reset();
  bands.reset();
  bands.show(true);
  hud();
  ready = false; // the first slab once the tower has risen into place
  if (RITME) ritmeStart();
}

function end() {
  mode = 'over';
  ritmeStop();
  $('hud').hidden = true; // nothing over the campanar as it comes whole
  bands.over(); // nor the bands, nor a toast: the end's finds wait in the collection (pieces.js)
  scene.pullOut();
  scene.turnAll(SFX.turn, SFX.bell); // the top becomes the campanar's, a bubble each course, a bell for the crown
  const rose = record.raiseBest(score);
  // the run's height in metres (provisional words: Codex writes the final copy)
  const m = metresOf(score);
  $('end-title').textContent = 'El teu campanar fa'; // i18n-ok: POC, provisional words until Codex writes the catalogue
  $('end-score').textContent = `${m} m`;
  $('end-best').textContent = rose ? 'Nou rècord!' : `Rècord: ${metresOf(record.best())} m`; // i18n-ok: POC, provisional words until Codex writes the catalogue
  $('end-best').classList.toggle('record', rose);
  // first the whole campanar, crown and all, its metres on top; a tap then brings the sheet, the tower framed above it
  $('banner-m').textContent = `${m} m`;
  $('banner-best').hidden = true;
  $('end-banner').hidden = false;
  scene.lift(($('end-banner').getBoundingClientRect().bottom + 12) / innerHeight, 0); // the words on top kept clear
  looking = performance.now() + 2200;
  setTimeout(() => { if (mode === 'over' && looking) $('end-tap').hidden = false; }, 2200);
}
let looking = 0; // the end's look at the tower: from when a tap may move on to the sheet (0: not looking)
function toSheet() {
  if (!looking || performance.now() < looking) return;
  looking = 0;
  $('end-tap').hidden = true;
  $('banner-best').textContent = $('end-best').textContent; // the record joins the metres on top
  $('banner-best').hidden = false;
  piecesCount(); // the end's finds have settled by now (the crown grows within ~2 s)
  show('end-menu'); // only its buttons (style.css): no card over the tower
  liftEnd($('end-menu').querySelector('.sheet-actions'));
}
// the end's tower framed between the banner and el (the buttons, the collection sheet)
const liftEnd = el => scene.lift(($('end-banner').getBoundingClientRect().bottom + 12) / innerHeight, Math.min(0.62, (el.offsetHeight + 40) / innerHeight));

// the collection sheet (pieces.js), from the home or the end; at the end a tap on one of this run's pieces closes it and
// takes the camera there
const piecesCount = () => { for (const b of document.querySelectorAll('.pieces-btn .count')) b.textContent = `${pieces.count}/${TOTAL}`; };
function openPieces() {
  const end = mode === 'over';
  pieces.fill($('pieces-count'), $('pieces-run'), $('pieces-grid'), end, end ? id => { closePieces(); scene.focus(pieces.at(id)); } : null);
  $('pieces').classList.toggle('over-tower', end); // the end's tower stays in sight over it
  $('pieces').hidden = false;
  if (end) liftEnd($('pieces').querySelector('.sheet')); // the tower over the sheet
}
function closePieces() {
  $('pieces').hidden = true;
  piecesCount();
  if (mode === 'over') liftEnd($('end-menu').querySelector('.sheet-actions'));
  $(mode === 'over' ? 'pieces-open' : 'home-pieces').focus({ preventScroll: true });
}

// ms: the event's own time (the rhythm judges the tap where the finger fell, not when the page got to it); set: the
// slab's place was set by hand (the dev helpers below), not read off the music
function tap(ms, set) {
  if (mode !== 'play' || !ready || performance.now() - lastTap < 150) return; // a double tap is one drop
  lastTap = performance.now();
  if (RITME && !set) ritmeSlide(ms);
  const r = drop(top, pos, axis, STACK_TRY ? SIZE * STACK_PERFECT : undefined);
  if (RITME) ritmeDrop(ms, r.miss ? -1 : r.perfect ? streak + 1 : 0); // the rhythm: it sings the perfect's note itself, on its beat
  if (r.miss) {
    scene.missMoving(axis, Math.sign(pos - top[axis]) || 1);
    SFX.miss();
    haptic('miss');
    return end();
  }
  if (r.cut) scene.fall(n, r.cut, y, axis, Math.sign(pos - top[axis]));
  top = r.placed;
  scene.place(top, axis, dir * (RITME ? ritmeSpeed(RANGE) : speedAt(n)), r.landed); // its speed: a perfect's snap settles from it
  y += FLOOR;
  if (r.perfect) { streak++; RITME || SFX.perfect(streak); haptic('hit'); scene.ripple(n, top, y, streak); }
  else { streak = 0; RITME || SFX.place(); haptic('tap'); } // the rhythm's cut plays its own pluck (ritmeDrop)
  score++;
  n++;
  hud();
  ready = false; // the first slab once the tower has come to the middle (the wide home had it aside)
}

function pause() {
  if (mode !== 'play') return;
  mode = 'paused';
  ritmeHold(true);
  show('pause-menu');
}
function resume() {
  if (mode !== 'paused') return;
  mode = 'play';
  resumeAudio(); // after a stall or a page left, the context runs again on this tap (iOS: only inside one)
  ritmeHold(false);
  show(null);
}
function toMenu() {
  mode = 'menu';
  ritmeStop();
  $('hud').hidden = true;
  bands.over();
  piecesCount();
  scene.reset();
  looking = 0;
  $('end-banner').hidden = $('end-tap').hidden = true;
  show('menu');
  homeAside();
}
const homeAside = () => scene.home(mode === 'menu'); // the home is the sky and the logo; the tower rises on Juga

// the end: one finger turns the campanar round (scene.look) or, zoomed in, moves along it (scene.along), whichever its
// first 8 px went; two pinch the zoom (scene.zoom); a tap without moving goes on to the sheet, never after a pinch
const endFingers = new Map(); // pointerId → { x, y, t }: the end's fingers down
let endGesture = null; // since the first finger: { sx, sy, moved, axis, pinched }
$('game').addEventListener('pointerdown', e => {
  if (e.button) return;
  if (mode !== 'over') return tap(e.timeStamp);
  $('game').setPointerCapture(e.pointerId);
  if (!endFingers.size) endGesture = { sx: e.clientX, sy: e.clientY, moved: 0, axis: null, pinched: false };
  endFingers.set(e.pointerId, { x: e.clientX, y: e.clientY, t: e.timeStamp });
  if (endFingers.size > 1) { endGesture.pinched = true; scene.letGo(false); }
});
const endSpread = () => { const [a, b] = endFingers.values(); return [Math.hypot(a.x - b.x, a.y - b.y), (a.y + b.y) / 2]; };
$('game').addEventListener('pointermove', m => {
  const f = endFingers.get(m.pointerId), g = endGesture;
  if (!f || mode !== 'over') return;
  const dx = m.clientX - f.x, dy = m.clientY - f.y, dt = (m.timeStamp - f.t) / 1000;
  if (endFingers.size > 1) { // the pinch: its spread zooms round its middle, its middle moving drags the tower along
    const [d0, y0] = endSpread();
    Object.assign(f, { x: m.clientX, y: m.clientY, t: m.timeStamp });
    const [d1, y1] = endSpread();
    scene.along(y1 - y0);
    if (d0 > 0) scene.zoom(d1 / d0, y1);
    return;
  }
  Object.assign(f, { x: m.clientX, y: m.clientY, t: m.timeStamp });
  g.moved += Math.abs(dx) + Math.abs(dy);
  if (!g.axis && g.moved >= 8) g.axis = Math.abs(m.clientX - g.sx) >= Math.abs(m.clientY - g.sy) ? 'x' : 'y';
  if (g.axis === 'x') scene.look(dx, 0, dt);
  else if (g.axis === 'y') scene.along(dy);
});
const endUp = u => {
  if (!endFingers.delete(u.pointerId) || endFingers.size) return; // a pinch's first finger up: the other carries on
  const g = endGesture, done = u.type === 'pointerup';
  scene.letGo(!matchMedia('(prefers-reduced-motion: reduce)').matches && done && g.axis === 'x' && !g.pinched);
  if (g.moved < 8 && !g.pinched && done) toSheet();
};
$('game').addEventListener('pointerup', endUp);
$('game').addEventListener('pointercancel', endUp);
// the wheel, a trackpad's two fingers or its pinch (ctrlKey, finer steps) zoom round the cursor
$('game').addEventListener('wheel', w => {
  if (mode !== 'over') return;
  w.preventDefault();
  scene.zoom(Math.exp(-w.deltaY * (w.deltaMode ? 16 : 1) * (w.ctrlKey ? 0.01 : 0.002)), w.clientY);
}, { passive: false });
addEventListener('keydown', e => {
  if ((e.key === ' ' || e.key === 'Enter') && (mode === 'play' || looking)) { e.preventDefault(); if (looking) toSheet(); else tap(e.timeStamp); }
  if (e.key === 'Escape') back();
});
$('play').addEventListener('click', start);
$('again').addEventListener('click', start);
$('to-menu').addEventListener('click', toMenu);
$('pause').addEventListener('click', pause);
for (const id of ['home-pieces', 'pieces-open']) $(id).addEventListener('click', openPieces);
$('pieces-close').addEventListener('click', closePieces);
$('resume').addEventListener('click', resume);
$('quit').addEventListener('click', toMenu);
$('back').addEventListener('click', e => {
  if (e.button || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
  e.preventDefault();
  exitGame($('back').href); // as Pop: no history piling up between the games; the app's launcher when there is one
});
const back = () => (!$('pieces').hidden ? closePieces() : mode === 'play' ? pause() : mode === 'paused' ? resume() : null);
closeOnBackdrop(back);
// i18n-ok: POC, provisional words until Codex writes the catalogue
const gpuDead = () => { pause(); window.__gameFail?.('No es pot dibuixar', 'Torna a carregar la pàgina.', 'webgl-not-restored'); };
guardGpu([$('game')], { lost: pause, restored: () => {}, dead: gpuDead });
stopDoubleTapZoom();
onEveryGesture(unlock);
setUiSound(uiBlip);
soundOnPress();
setupSheetKeys({ top: () => [...document.querySelectorAll('.cover:not([hidden]):not(#boot)')].pop() ?? (mode === 'menu' ? $('menu') : null) });
onPageLeave(pause);
onAppInactive(pause); // the app covered without being left (plassa/native.js)
// a run to the music whose audio clock stands still for 1 s (iOS 'interrupted', a frozen device) pauses, as the main game
// does: the hush stops the context, and Continua's tap starts it again (page-audio.js). ?ritme=0 just waits for the next tap
audioPage({ hearing: () => mode !== 'paused', stall: () => RITME && mode === 'play' && (pause(), hushAudio(), true) });
// Android's back button in the app: as Escape; from the end to the home, from the home to the games menu
onNativeBack(() => (!$('pieces').hidden ? closePieces() : mode === 'over' ? toMenu() : mode === 'menu' ? exitGame('/jocs/index.html') : back()));
setupOrientation(pause);
addEventListener('resize', () => { scene.resize(); homeAside(); });

const sky = $('sky');
paintSky(sky); // its mountains per kind of device (sky.js)
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
  last = now;
  watchAudio(now);
  // the rhythm: the music runs ahead of the clock, and the slab comes out on its downbeat (ritme.js)
  const out = mode === 'play' && (!RITME || ritmeTick(!ready && scene.settled));
  if (mode === 'play' && !ready && scene.settled && out) { ready = true; spawn(); }
  if (VITRINA && mode === 'play' && ready && now - lastTap > 320) { pos = top[axis] + vitrinaDrop(n, top) * SIZE; tap(); } // it plays itself
  if (mode === 'play' && ready) {
    if (RITME) ritmeSlide();
    else {
      pos += dir * speedAt(n) * dt;
      if (Math.abs(pos - top[axis]) > RANGE) { pos = top[axis] + Math.sign(pos - top[axis]) * RANGE; dir = -dir; }
    }
    scene.slide(axis, pos);
  }
  if (mode !== 'paused') scene.frame(dt);
  climbSky(scene.climb, scene.pan); // the sky slides, the clouds rise past, the stars come out; the end's turn pans it (sky.js)
  requestAnimationFrame(frame);
}

toMenu();
scene.frame(0);
requestAnimationFrame(frame);
if (import.meta.env.DEV) window.__campanar = { get mode() { return mode; }, get n() { return n; }, tap, start, ritmeLog, ritmeAudio,
  tuneSky: (o, svgUrl) => tuneSky(sky, o, svgUrl), // dev: the carena tuner's settings (tools/jocs/campanar-carena/)
  get off() { return ready ? (pos - top[axis]) / SIZE : null; }, // dev: the slab's offset now, in sides (real taps timed on it)
  perfect() { pos = top[axis]; lastTap = 0; tap(undefined, true); }, // dev: a perfect drop, to see the whole tower quickly
  miss() { pos = top[axis] + SIZE * 2; lastTap = 0; tap(undefined, true); },
  offset(f) { pos = top[axis] + f * SIZE; lastTap = 0; tap(undefined, true); } }; // dev: a drop f sides off centre (a cut), to build irregular towers
await document.fonts.ready;
await lines.finished();
requestAnimationFrame(() => {
  document.documentElement.classList.add('ready');
  setTimeout(() => { $('boot').hidden = true; }, 400);
});
