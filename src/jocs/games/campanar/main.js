// Composition root of Mulassa Tower (id campanar): an endless tower-stack game, a stone bell tower that rises until a slab misses.
// The rules are rules.js, the 3D scene.js, the sound audio.js; the page's life is Plassa's (packages/plassa/src/).
// shortcut: the words are provisional Catalan in the page, no locales/ nor Sentry/update watch yet; add them when it leaves POC.
import { createScene } from './scene.js';
import { paintSky, tuneSky, climbSky } from './sky.js';
import { SIZE, FLOOR, RANGE, REAL, drop, speedAt, metresOf } from './rules.js';
import { SFX, unlock, uiBlip } from './audio.js';
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
const scene = createScene($('game'));
const record = deviceBest('campanar-best');

let ready = false; // the run's first slab is out
let mode = 'menu', n = 1, top, y, axis, pos, dir, score, streak, lastTap = 0;

function show(id) { for (const c of ['menu', 'pause-menu', 'end-menu']) $(c).hidden = c !== id; }
function hud() {
  $('score').textContent = `${metresOf(score)} m`; // the same metres as the end sheet
}

function spawn() {
  axis = n % 2 ? 'x' : 'z';
  dir = 1;
  pos = top[axis] - RANGE;
  scene.moving(n, { ...top, [axis]: pos }, y);
}

function start() {
  scene.reset();
  scene.aside(0);
  n = 1; y = 0; score = 0; streak = 0;
  looking = 0;
  $('end-banner').hidden = $('end-tap').hidden = true;
  top = { x: 0, z: 0, w: SIZE, d: SIZE };
  mode = 'play';
  show(null);
  $('hud').hidden = false;
  hud();
  ready = false; // the first slab once the tower has come to the middle (the wide home had it aside)
}

function end() {
  mode = 'over';
  $('hud').hidden = true; // nothing over the campanar as it comes whole
  scene.pullOut();
  scene.turnAll(SFX.turn, SFX.bell); // the top becomes the campanar's, a bubble each course, a bell for the crown
  const rose = record.raiseBest(score);
  // the run's height in metres, against the real campanar's (provisional words: Codex writes the final copy)
  const m = metresOf(score);
  $('end-title').textContent = 'El teu campanar fa'; // i18n-ok: POC, provisional words until Codex writes the catalogue
  $('end-score').textContent = `${m} m`;
  $('end-real').textContent = m >= REAL ? `Més alt que el de Valls (${REAL} m)!` : `El de Valls en fa ${REAL}`; // i18n-ok: POC, provisional words until Codex writes the catalogue
  $('end-best').textContent = rose ? 'Nou rècord!' : `Rècord: ${metresOf(record.best())} m`; // i18n-ok: POC, provisional words until Codex writes the catalogue
  $('end-best').classList.toggle('record', rose);
  // first the whole campanar, crown and all, its metres on top; a tap then brings the sheet, the tower framed above it
  $('banner-m').textContent = `${m} m`;
  $('banner-best').hidden = true;
  $('banner-real').textContent = $('end-real').textContent;
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
  show('end-menu'); // only its buttons (style.css): no card over the tower
  scene.lift(($('end-banner').getBoundingClientRect().bottom + 12) / innerHeight, Math.min(0.4, ($('end-menu').querySelector('.sheet-actions').offsetHeight + 40) / innerHeight));
}

function tap() {
  if (mode !== 'play' || !ready || performance.now() - lastTap < 150) return; // a double tap is one drop
  lastTap = performance.now();
  const r = drop(top, pos, axis);
  if (r.miss) {
    scene.missMoving(axis, Math.sign(pos - top[axis]) || 1);
    SFX.miss();
    haptic('miss');
    return end();
  }
  if (r.cut) scene.fall(n, r.cut, y, axis, Math.sign(pos - top[axis]));
  top = r.placed;
  scene.place(top);
  y += FLOOR;
  if (r.perfect) { streak++; SFX.perfect(streak); haptic('hit'); scene.ripple(n, top, y, streak); } else { streak = 0; SFX.place(); haptic('tap'); }
  score++;
  n++;
  hud();
  ready = false; // the first slab once the tower has come to the middle (the wide home had it aside)
}

function pause() {
  if (mode !== 'play') return;
  mode = 'paused';
  show('pause-menu');
}
function resume() {
  if (mode !== 'paused') return;
  mode = 'play';
  show(null);
}
function toMenu() {
  mode = 'menu';
  $('hud').hidden = true;
  scene.reset();
  looking = 0;
  $('end-banner').hidden = $('end-tap').hidden = true;
  $('menu-best').textContent = record.best() ? `Rècord: ${metresOf(record.best())} m` : ''; // i18n-ok: POC, provisional words until Codex writes the catalogue
  show('menu');
  homeAside();
}
const homeAside = () => scene.aside(mode === 'menu' && matchMedia('(orientation: landscape)').matches ? 0.25 : 0); // wide: the tower beside the home's column

$('game').addEventListener('pointerdown', e => {
  if (e.button) return;
  if (mode !== 'over') return tap();
  // the end: a drag turns the campanar round (scene.look), a tap without moving goes on to the sheet
  const c = $('game'), from = { x: e.clientX, y: e.clientY, t: e.timeStamp, moved: 0 };
  c.setPointerCapture(e.pointerId);
  const move = m => {
    const dx = m.clientX - from.x, dy = m.clientY - from.y;
    from.moved += Math.abs(dx) + Math.abs(dy);
    scene.look(dx, dy, (m.timeStamp - from.t) / 1000);
    Object.assign(from, { x: m.clientX, y: m.clientY, t: m.timeStamp });
  };
  const up = u => {
    c.removeEventListener('pointermove', move);
    c.removeEventListener('pointerup', up);
    c.removeEventListener('pointercancel', up);
    scene.letGo(!matchMedia('(prefers-reduced-motion: reduce)').matches && u.type === 'pointerup');
    if (from.moved < 8 && u.type === 'pointerup') toSheet();
  };
  c.addEventListener('pointermove', move);
  c.addEventListener('pointerup', up);
  c.addEventListener('pointercancel', up);
});
addEventListener('keydown', e => {
  if ((e.key === ' ' || e.key === 'Enter') && (mode === 'play' || looking)) { e.preventDefault(); if (looking) toSheet(); else tap(); }
  if (e.key === 'Escape') back();
});
$('play').addEventListener('click', start);
$('again').addEventListener('click', start);
$('to-menu').addEventListener('click', toMenu);
$('pause').addEventListener('click', pause);
$('resume').addEventListener('click', resume);
$('quit').addEventListener('click', toMenu);
$('back').addEventListener('click', e => {
  if (e.button || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
  e.preventDefault();
  exitGame($('back').href); // as Pop: no history piling up between the games; the app's launcher when there is one
});
const back = () => (mode === 'play' ? pause() : mode === 'paused' ? resume() : null);
closeOnBackdrop(back);
guardGpu([$('game')], { lost: pause, restored: () => {}, dead: () => { pause(); window.__gameFail?.('No es pot dibuixar', 'Torna a carregar la pàgina.', 'webgl-not-restored'); } }); // i18n-ok: POC, provisional words until Codex writes the catalogue
stopDoubleTapZoom();
onEveryGesture(unlock);
setUiSound(uiBlip);
soundOnPress();
setupSheetKeys({ top: () => [...document.querySelectorAll('.cover:not([hidden]):not(#boot)')].pop() ?? (mode === 'menu' ? $('menu') : null) });
onPageLeave(pause);
onAppInactive(pause); // the app covered without being left (plassa/native.js)
// Android's back button in the app: as Escape; from the end to the home, from the home to the games menu
onNativeBack(() => (mode === 'over' ? toMenu() : mode === 'menu' ? exitGame('/jocs/index.html') : back()));
setupOrientation(pause);
addEventListener('resize', () => { scene.resize(); homeAside(); });

const sky = $('sky');
paintSky(sky); // its mountains per kind of device (sky.js)
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
  last = now;
  if (mode === 'play' && !ready && scene.settled) { ready = true; spawn(); }
  if (mode === 'play' && ready) {
    pos += dir * speedAt(n) * dt;
    if (Math.abs(pos - top[axis]) > RANGE) { pos = top[axis] + Math.sign(pos - top[axis]) * RANGE; dir = -dir; }
    scene.slide(axis, pos);
  }
  if (mode !== 'paused') scene.frame(dt);
  climbSky(scene.climb); // the sky slides, the clouds rise past, the stars come out (sky.js)
  requestAnimationFrame(frame);
}

toMenu();
scene.frame(0);
requestAnimationFrame(frame);
if (import.meta.env.DEV) window.__campanar = { get mode() { return mode; }, get n() { return n; }, tap, start,
  tuneSky: (o, svgUrl) => tuneSky(sky, o, svgUrl), // dev: the carena tuner's settings (tools/jocs/campanar-carena/)
  perfect() { pos = top[axis]; lastTap = 0; tap(); }, // dev: a perfect drop, to see the whole tower quickly
  miss() { pos = top[axis] + SIZE * 2; lastTap = 0; tap(); },
  offset(f) { pos = top[axis] + f * SIZE; lastTap = 0; tap(); } }; // dev: a drop f sides off centre (a cut), to build irregular towers
await document.fonts.ready;
await lines.finished();
requestAnimationFrame(() => {
  document.documentElement.classList.add('ready');
  setTimeout(() => { $('boot').hidden = true; }, 400);
});
