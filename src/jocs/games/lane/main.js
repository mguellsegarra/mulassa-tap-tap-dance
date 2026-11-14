// Composition root of the Lane Rush POC: the scene, the run, the input and the page's covers.
// The rules are rules.js, the drum world.js, the figures figures.js, the sounds sound.js; the page's shell is Plassa's.
// The camera, the feel of a lane change and the hit follow playus's Lane Rush (see rules.js).
import * as THREE from 'three';
import { createWorld, onDrum } from './world.js';
import { BUILD, createMulassa } from './figures.js';
import { LANES, PLAYER_AT, newRun, step, midX } from './rules.js';
import { SFX, unlock } from './sound.js';
import { deviceBest } from '#plassa/best.js';
import { setupOrientation } from '#plassa/orientation.js';
import { onPageLeave } from '#plassa/page-leave.js';
import { onEveryGesture } from '#plassa/gesture.js';
import { guardGpu, rendererOrCard } from '#plassa/gpu-guard.js';
import { lostGpu, pixelRatio, LOW } from '#plassa/quality.js';
import { errors } from '#plassa/errors.js';
import { stopDoubleTapZoom } from '#plassa/double-tap.js';
import { bootLines } from '#plassa/boot-lines.js';
import { haptic } from '#plassa/haptics.js';
import { setupSheetKeys } from '#plassa/sheet-keys.js';
import '#plassa/focus.js';

const $ = id => document.getElementById(id);
window.__gameBootWords = { title: 'Alguna cosa ha fallat', text: 'Torna-ho a provar.', retry: 'Torna-hi' }; // provisional words
const lines = bootLines($('boot-line'));
const canvas = $('game');
const renderer = rendererOrCard(() => new THREE.WebGLRenderer({ canvas, antialias: !LOW, powerPreference: 'high-performance' }));
const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(66, 1, .1, 260);
const CAM = new THREE.Vector3(0, 5.2, 8.8), IDLE_SPEED = 8, CRASH_S = .95;
camera.position.copy(CAM);
camera.lookAt(0, 1.1, -10);
const world = createWorld(scene), mula = createMulassa();
const shadowGeo = new THREE.CircleGeometry(1, 18), shadowMat = new THREE.MeshBasicMaterial({ color: 0x332040, transparent: true, opacity: .17, depthWrite: false });
function shadow(w = .85, l = 1.2) {
  const s = new THREE.Mesh(shadowGeo, shadowMat);
  s.rotation.x = -Math.PI / 2;
  s.scale.set(w, l, 1);
  s.position.y = .03;
  return s;
}
const player = new THREE.Group();
player.add(mula.g, shadow(.6, 1.1));
onDrum(player, 0, PLAYER_AT);
scene.add(player);
const best = deviceBest('jocs.lane.best');
const views = new Map(); // a thing of the run → its figure in the scene

// menu: the road rolls by behind the home · run · crashed: the hit plays out · over: the end sheet · paused
let mode = 'menu', run = null, lane = 1, clock = 0, crashed = 0, crashSpeed = 0, last = 0, baseFov = 66, trot = 0;

function fit() {
  const w = innerWidth, h = innerHeight, aspect = w / h;
  renderer.setPixelRatio(pixelRatio(w, h));
  renderer.setSize(w, h, false);
  camera.aspect = aspect;
  baseFov = aspect < .62 ? 68 : aspect < .9 ? 60 : 52;
  if (mode !== 'run') camera.fov = baseFov;
  camera.updateProjectionMatrix();
}
addEventListener('resize', fit);
fit();

function drop(t) { scene.remove(views.get(t)?.g); views.delete(t); }
function show(t) {
  const v = BUILD[t.kind](), g = new THREE.Group(); // the figure keeps its own moves; the group stands on the drum
  g.add(v.g);
  g.add(shadow(t.wide ? 2.2 : .85, 1.1));
  v.g = g;
  v.phase = Math.random() * 9;
  scene.add(g);
  views.set(t, v);
}
function start() {
  for (const t of [...views.keys()]) drop(t);
  run = newRun();
  lane = 1; crashed = 0;
  player.position.x = 0;
  camera.position.copy(CAM);
  for (const id of ['menu', 'end-menu', 'pause-menu']) $(id).hidden = true;
  $('hud').hidden = false;
  hud();
  mode = 'run';
}
function hud() {
  $('dist-n').textContent = Math.floor(run.distance);
}
function crash() {
  mode = 'crashed';
  crashed = 0;
  crashSpeed = run.speed;
  SFX.crash();
  haptic('miss');
  $('flash').classList.add('on');
  setTimeout(() => $('flash').classList.remove('on'), 260);
}
function finish() {
  mode = 'over';
  camera.position.copy(CAM);
  const m = Math.floor(run.distance), raised = best.raiseBest(m);
  $('end-title').textContent = raised ? 'Rècord!' : 'Ai!';
  $('end-score').textContent = `${m} m`;
  $('end-sub').textContent = `Rècord ${best.best()} m`;
  $('end-menu').hidden = false;
  $('again').focus({ focusVisible: false });
}
function pause() {
  if (mode !== 'run') return;
  mode = 'paused';
  $('pause-menu').hidden = false;
}
function resume() { $('pause-menu').hidden = true; mode = 'run'; }
function toMenu() {
  mode = 'menu';
  for (const id of ['end-menu', 'pause-menu', 'hud']) $(id).hidden = true;
  $('menu').hidden = false;
  showBest();
}
function showBest() { const b = best.best(); $('menu-best').hidden = !b; $('menu-best').textContent = `Rècord: ${b} m`; }

function move(dir) {
  if (mode !== 'run') return;
  const to = Math.max(0, Math.min(2, lane + dir));
  if (to === lane) return;
  lane = to;
  mula.switched(dir);
  SFX.lane(dir);
  haptic('tap');
}
// a swipe moves her as soon as it is one (24 px, more across than down); a short tap moves her to its side of the screen
let pointer = null;
canvas.addEventListener('pointerdown', e => { if (mode === 'run') { pointer = { x: e.clientX, y: e.clientY, time: performance.now(), used: false }; canvas.setPointerCapture?.(e.pointerId); } });
canvas.addEventListener('pointermove', e => {
  if (!pointer || pointer.used) return;
  const dx = e.clientX - pointer.x, dy = e.clientY - pointer.y;
  if (Math.abs(dx) <= 24 || Math.abs(dx) <= Math.abs(dy)) return;
  pointer.used = true;
  move(dx > 0 ? 1 : -1);
});
canvas.addEventListener('pointerup', e => {
  const p = pointer;
  pointer = null;
  if (!p || p.used || performance.now() - p.time > 350) return;
  move(e.clientX < innerWidth / 2 ? -1 : 1);
});
canvas.addEventListener('pointercancel', () => { pointer = null; });
addEventListener('keydown', e => {
  if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') move(-1);
  else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') move(1);
  else if (e.key === 'Escape' && mode === 'paused') resume();
  else if (e.key === 'Escape') pause();
});
$('play').onclick = start;
$('again').onclick = start;
$('to-menu').onclick = toMenu;
$('quit').onclick = toMenu;
$('resume').onclick = resume;
onEveryGesture(unlock);
setupSheetKeys({ top: () => document.querySelector('.cover:not([hidden]):not(#boot)') });
onPageLeave(pause);
setupOrientation(pause);
stopDoubleTapZoom();
errors.context(() => ({ game: 'lane', state: mode }));
guardGpu([canvas], { lost: () => { lostGpu(); pause(); }, restored: () => {}, dead: () => { pause(); window.__gameFail?.('Sense gràfics', 'Torna a carregar la pàgina.', 'webgl-not-restored'); } });

function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(.15, Math.max(0, (now - last) / 1000 || 0));
  last = now;
  if (mode === 'paused') return;
  clock += dt;
  let speed = IDLE_SPEED;
  if (mode === 'run') {
    for (const e of step(run, dt, player.position.x)) {
      if (e.type === 'spawn') show(e.thing);
      else if (e.type === 'gone') drop(e.thing);
      else if (e.type === 'hit') crash();
    }
    speed = run.speed;
    hud();
    const fov = baseFov + Math.min(7, Math.max(0, .11 * (speed - 14))); // the lens opens as she speeds up
    if (Math.abs(camera.fov - fov) > .01) { camera.fov += (fov - camera.fov) * Math.min(1, 3 * dt); camera.updateProjectionMatrix(); }
  }
  if (mode === 'crashed') {
    crashed += dt;
    speed = crashSpeed * Math.max(0, 1 - crashed / .5); // the road runs out under her
    mula.crash(crashed, dt);
    const shake = .45 * Math.max(0, 1 - crashed / .45);
    camera.position.set(CAM.x + (Math.random() - .5) * shake, CAM.y + (Math.random() - .5) * shake, CAM.z);
    if (crashed >= CRASH_S) finish();
  } else if (mode !== 'over') {
    const target = mode === 'run' ? LANES[lane] : 0, x = player.position.x;
    player.position.x = x + (target - x) * Math.min(1, 14 * dt);
    const phase = mula.tick(clock, dt, speed, target - player.position.x);
    if (mode === 'run' && Math.sign(phase) !== Math.sign(trot)) SFX.clop(phase > 0);
    trot = phase;
  } else speed = 0;
  world.advance(speed * dt, dt);
  for (const [t, v] of views) {
    onDrum(v.g, midX(t), t.d);
    v.tick?.(clock + v.phase);
  }
  renderer.render(scene, camera);
}

showBest();
renderer.compile(scene, camera);
requestAnimationFrame(frame);
await document.fonts.ready;
await lines.finished();
requestAnimationFrame(() => {
  document.documentElement.classList.add('ready');
  errors.start();
  setTimeout(() => { $('boot').hidden = true; }, 400);
});
// dev: __lane.run to read the run from the console
if (import.meta.env.DEV) window.__lane = { get run() { return run; }, get mode() { return mode; }, get lane() { return lane; }, start, move };
