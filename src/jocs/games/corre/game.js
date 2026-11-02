import * as THREE from 'three';
import { NAME, T } from './copy.js';
import { MAT } from '../../../scene/models/voxel.js';
import { applyGroundTexture } from './ground-texture.js';
import { loadWorld, ROTATION } from './realworld.js';
import { LEVELS, newRun, tick, castellFor } from './rules.js';
import { buildStreet, STREET_LENGTH, X_SPAN, halfAt, NARROW, bend, heading } from './street.js';
import { createCrew, createMulassa, createConfetti, castellSlots, castellHeight, castellTime, enxanetaY } from './crew.js';
import { createCourse } from './course.js';
import { createAudio } from './music.js';

THREE.ColorManagement.enabled = false; // as in the viewer: every colour here is a display colour
const CAM_Y = 9, CAM_BACK = 15, CAM_AHEAD = 13, VIEW_DIST = 13;
const BEST_KEY = 'minijocs.corre.best'; // most people who ever reached the plaça
const REVEAL = .2; // seconds per floor
const RESERVE = 224; // height kept free for the result panel
const WIDE = 46 * Math.PI / 180; // how much street a phone in portrait must see, across
// All of it straight ahead on the Cort's axis: the camera never has to round the street's corners, and the square opens in front of it.
const MOUTH_Z = -STREET_LENGTH, CASTELL = { x: 0, z: MOUTH_Z - 13 }, RIVALS = { x: 0, z: MOUTH_Z - 16 }, MINE_AT = { x: 0, z: MOUTH_Z + 1 }, MULA_AT = { x: -4.5, z: MOUTH_Z - 18 };
const CAM_DIR = { x: 0, z: 1 };
const BPM = [168, 180, 190, 198, 206];
const PARTY = ['#d8342f', '#f2c21d', '#2c6fc4', '#2f9a4e', '#ffffff'];
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const CSS = `
.corre-hud { position: absolute; top: max(8px, env(safe-area-inset-top)); left: 60px; right: 60px; height: 44px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; pointer-events: none; }
.corre-hud b { font: 400 24px/1 'Jersey 10', monospace; color: #fff2d5; text-shadow: 0 2px 0 #17131a, 2px 0 0 #17131a, -2px 0 0 #17131a, 0 -2px 0 #17131a; white-space: nowrap; }
.corre-bar { width: min(100%, 180px); height: 8px; border-radius: 4px; background: rgba(23,19,26,.7); overflow: hidden; }
.corre-bar i { display: block; height: 100%; width: 100%; background: var(--gold); transform-origin: left; transform: scaleX(0); }
.corre-sound { position: absolute; top: max(8px, env(safe-area-inset-top)); right: 8px; width: 44px; height: 44px; border-radius: 12px; background: rgba(44, 34, 51, .85); font-size: 20px; line-height: 1; }
.corre-badge { position: absolute; left: 0; top: 0; min-width: 44px; padding: 2px 12px; border-radius: 16px; background: rgba(23,19,26,.85); color: var(--gold); font: 400 30px/1.1 'Jersey 10', monospace; text-align: center; pointer-events: none; will-change: transform; }
.corre-flash { position: absolute; left: 0; right: 0; top: 17%; text-align: center; font: 400 clamp(40px, 13vw, 60px)/1 'Jersey 10', monospace; pointer-events: none; opacity: 0; text-shadow: 0 3px 0 #17131a, 3px 0 0 #17131a, -3px 0 0 #17131a, 0 -3px 0 #17131a; }
.corre-flash.go { animation: corre-pop .9s ease-out; }
@keyframes corre-pop { 0% { opacity: 0; transform: scale(.6); } 12% { opacity: 1; transform: scale(1.12); } 22% { transform: scale(1); } 80% { opacity: 1; } 100% { opacity: 0; } }
@media (prefers-reduced-motion: reduce) { .corre-flash.go { animation-name: corre-still; } @keyframes corre-still { 0%, 80% { opacity: 1; } 100% { opacity: 0; } } }
`;

export function start(root, leave) {
  root.innerHTML = `<div class="stage"><style>${CSS}</style><canvas></canvas><div class="corre-hud"><b></b><div class="corre-bar"><i></i></div></div>
    <div class="corre-badge"></div><div class="corre-badge"></div><div class="corre-flash"></div>
    <button class="back" aria-label="${T.menu}">‹</button><button class="corre-sound"></button><div class="overlay"></div></div>`;
  const stage = root.firstElementChild, canvas = stage.querySelector('canvas'), overlay = stage.querySelector('.overlay');
  const [myBadge, rivalBadge] = stage.querySelectorAll('.corre-badge'), flashEl = stage.querySelector('.corre-flash');
  const hudText = stage.querySelector('.corre-hud b'), hud = stage.querySelector('.corre-hud'), bar = stage.querySelector('.corre-bar i'), soundBtn = stage.querySelector('.corre-sound');
  const back = stage.querySelector('.back');
  back.onclick = leave;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
  const scene = new THREE.Scene();
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace; // as in the viewer: the bytes are sRGB already, light them as they are
  scene.background = new THREE.Color(0x4fa8ee);
  scene.fog = new THREE.Fog(0x4fa8ee, 110, 210);
  scene.add(new THREE.HemisphereLight(0xb8b6b2, 0xf5e8d2, 1.05 * Math.PI));
  const sun = new THREE.DirectionalLight(0xffeccc, .45 * Math.PI);
  sun.position.set(.28 * Math.cos(ROTATION) + .5 * Math.sin(ROTATION), .82, -.28 * Math.sin(ROTATION) + .5 * Math.cos(ROTATION)); // the world's sun, turned with the world
  scene.add(sun);
  const worldMat = new THREE.MeshLambertMaterial({ vertexColors: true }), farMat = new THREE.MeshLambertMaterial({ vertexColors: true, polygonOffset: true, polygonOffsetFactor: 2, polygonOffsetUnits: 2 });
  const groundTex = applyGroundTexture(renderer.capabilities.getMaxAnisotropy() > 2 ? 4 : 1, worldMat, farMat);
  const camera = new THREE.PerspectiveCamera(70, 1, 1, 800); // a near plane of 1 m keeps far façades from flickering
  const lookAt = new THREE.Vector3(), lookNow = new THREE.Vector3(), camNow = new THREE.Vector3(), at = new THREE.Vector3();

  const stretches = buildStreet(scene, worldMat), plazaWorld = new THREE.Group();
  scene.add(plazaWorld);
  const ground = { at: () => 0, bend, heading }; // the real square's levels, once its world has loaded
  const mine = createCrew(scene, '#f28fb0', Math.PI, ground), rivals = createCrew(scene, '#d62f3f', 0, ground);
  const mula = createMulassa(scene), confetti = createConfetti(scene);
  const audio = createAudio();
  const aleta = new THREE.Mesh(new THREE.BoxGeometry(.1, .55, .1).translate(0, .27, 0), new THREE.MeshLambertMaterial({ color: '#f0bd8e' }));
  scene.add(aleta);

  let W = 0, H = 0, raf = 0, last = 0, run = null, level = 0, course = null, kick = 0, shake = 0, target = 0, keys = 0, plaza = null, armTimer = 0, panelTimer = 0, offset = 0, baseFov = 70, stopped = false, arena = false, snap = false;
  const worldZ = z => -(offset + z);

  function size() {
    W = stage.clientWidth;
    H = stage.clientHeight;
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    camera.fov = baseFov = Math.max(58, 2 * Math.atan(Math.tan(WIDE / 2) / camera.aspect) * 180 / Math.PI);
    camera.updateProjectionMatrix();
  }
  const showSound = () => { soundBtn.textContent = '♪'; soundBtn.style.opacity = audio.muted ? .45 : 1; soundBtn.setAttribute('aria-label', audio.muted ? T.soundOn : T.soundOff); };
  soundBtn.onclick = () => { audio.toggleMute(); showSound(); };

  function panel(title, text, buttons, atBottom) {
    overlay.style.display = '';
    overlay.style.pointerEvents = 'none'; // a player still dragging must not hit a button that has just appeared
    overlay.style.alignItems = atBottom ? 'flex-end' : '';
    overlay.style.background = atBottom ? 'none' : '';
    clearTimeout(armTimer);
    armTimer = setTimeout(() => { overlay.style.pointerEvents = ''; }, 500);
    overlay.innerHTML = `<div class="panel"><h2>${title}</h2><p>${text}</p><div style="display:grid;grid-auto-flow:column;grid-auto-columns:1fr;gap:12px"></div></div>`;
    for (const [name, fn, alt] of buttons) {
      const b = document.createElement('button');
      b.className = alt ? 'btn alt' : 'btn';
      b.textContent = name;
      b.onclick = fn;
      overlay.querySelector('.panel > div').append(b);
    }
  }

  function flash(text, gain) {
    if (!text) return;
    flashEl.textContent = text;
    flashEl.style.color = gain ? '#f5c518' : '#ff9d9d';
    flashEl.classList.remove('go');
    void flashEl.offsetWidth; // restart the animation
    flashEl.classList.add('go');
  }

  const crewZ = () => worldZ(run.z);
  const toSquare = () => { arena = true; };
  const events = (ev, d) => {
    if (ev === 'gate') {
      course.pass(d.i, d.side);
      flash(d.text, d.gain);
      if (d.gain) {
        audio.gain();
        kick = 1;
        confetti.burst(run.x * X_SPAN + bend(crewZ() - 3), 2.5, crewZ() - 3, 26, PARTY);
      } else {
        audio.lose();
        shake = reduced ? 0 : .5;
      }
      audio.tempo(BPM[level] + run.next * 3);
    }
    if (ev === 'hazard') {
      course.blow(d.i);
      flash(d.text, false);
      audio.boom();
      shake = reduced ? 0 : 1;
      confetti.burst(run.x * X_SPAN + bend(crewZ() - 2), 1.2, crewZ() - 2, 30, ['#ffd24a', '#ff8a2a', '#3a3230']);
    }
    if (ev === 'hit') {
      audio.hit();
      shake = reduced ? 0 : Math.max(shake, .45);
      confetti.burst(RIVALS.x * .6, 1.4 + ground.at(RIVALS.x, RIVALS.z), (crewZ() + RIVALS.z) / 2, 3, ['#f28fb0', '#d62f3f']);
    }
    if (ev === 'lost') {
      audio.silence();
      audio.fail();
      const inPlaza = run.z >= run.end;
      panelTimer = setTimeout(() => panel(inPlaza ? T.beaten : T.empty, inPlaza ? (run.rival ? T.beatenText(run.rival) : T.tie) : T.emptyText, [[T.retry, () => play(level)]]), 900);
    }
    if (ev === 'clash') toSquare();
    if (ev === 'castell') { toSquare(); raise(); }
  };

  function dress(l) {
    clearTimeout(panelTimer);
    course?.dispose();
    level = l;
    plaza = null;
    target = 0;
    kick = shake = 0;
    arena = snap = false;
    run = newRun(l, { on: events });
    offset = STREET_LENGTH - run.end;
    course = createCourse(scene, run, worldZ, MAT);
    camera.clearViewOffset();
    aleta.visible = false;
    confetti.clear();
    flashEl.classList.remove('go');
    mine.clear();
    rivals.clear();
    mine.count(run.n, 0, crewZ());
    rivals.count(run.rival, RIVALS.x, RIVALS.z);
    mine.people.forEach(p => { p.s = 1; p.x = (Math.random() - .5) * 2; });
    rivals.people.forEach(p => { p.s = 1; });
    mula.group.position.set(bend(crewZ() - 2.6), 0, crewZ() - 2.6);
    mula.group.rotation.y = 0;
    hudText.textContent = T.street(l + 1, LEVELS.length);
    hud.style.display = '';
    camNow.set(bend(crewZ() + CAM_BACK), CAM_Y, crewZ() + CAM_BACK);
    lookNow.set(bend(crewZ() - CAM_AHEAD), .8, crewZ() - CAM_AHEAD);
  }

  function play(l) {
    dress(l);
    overlay.style.display = 'none';
    audio.music(BPM[l]);
  }

  function home() {
    dress(0);
    run.state = 'home';
    const best = Number(localStorage.getItem(BEST_KEY) ?? 0);
    panel(NAME, T.how + (best ? `<br>${T.best(T.label(castellFor(best)))}` : ''), [[T.start, () => play(0)]]);
  }

  function raise() {
    audio.silence();
    const c = castellFor(run.n);
    plaza = { c, age: 0, shown: 0, slots: castellSlots(c, mine.people.length, REVEAL), people: run.n, topped: false, end: castellTime(c, REVEAL) };
    if (run.n > Number(localStorage.getItem(BEST_KEY) ?? 0)) localStorage.setItem(BEST_KEY, run.n);
    hud.style.display = 'none';
    camera.fov = baseFov;
    camera.updateProjectionMatrix();
    const lastLevel = level === LEVELS.length - 1;
    panelTimer = setTimeout(() => {
      panel(T.loaded, T.result(T.label(c), plaza.people), [
        [lastLevel ? T.again : T.next, () => play(lastLevel ? 0 : level + 1)],
        [T.retry, () => play(level), true],
      ], true);
    }, (plaza.end + .8) * 1000);
  }

  function badge(el, n, x, y, z) {
    el.style.display = n ? '' : 'none';
    if (!n) return;
    at.set(x, y, z).project(camera);
    const text = String(n);
    if (el.textContent !== text) el.textContent = text;
    const w = el.offsetWidth, h = el.offsetHeight;
    const left = Math.max(8, Math.min(W - w - 8, (at.x + 1) / 2 * W - w / 2)), top = Math.max(56, Math.min(H - h - 8, (1 - at.y) / 2 * H - h));
    el.style.transform = `translate(${Math.round(left)}px, ${Math.round(top)}px)`;
  }

  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(.05, (now - last) / 1000 || 0), time = now / 1000;
    last = now;
    if (keys) target = Math.max(-.72, Math.min(.72, target + keys * dt * 2.8));
    if (run.state === 'run') run.x += (target - run.x) * Math.min(1, dt * 16);
    else if (run.state === 'clash') run.x += -run.x * Math.min(1, dt * 4); // both collas meet in the middle
    tick(run, dt);

    const moving = run.state === 'run', fighting = run.state === 'clash', crewAt = worldZ(run.z), x = run.x * X_SPAN;
    if (plaza) {
      plaza.age += dt;
      const { c, slots } = plaza;
      mine.build(dt, CASTELL.x, CASTELL.z, slots, plaza.age);
      const shown = Math.min(c.floors.length, Math.max(0, Math.floor((plaza.age - plaza.end + c.floors.length * REVEAL) / REVEAL)));
      if (shown > plaza.shown) { plaza.shown = shown; audio.floor(shown); }
      if (!plaza.topped && plaza.age > plaza.end + .3) {
        plaza.topped = true;
        audio.fanfare();
        confetti.burst(CASTELL.x, castellHeight(c) + ground.at(CASTELL.x, CASTELL.z), CASTELL.z, 120, PARTY, 1.3);
      }
      aleta.visible = plaza.topped; // the enxaneta's raised hand
      if (aleta.visible) {
        aleta.position.set(CASTELL.x + .16, enxanetaY(c) + ground.at(CASTELL.x, CASTELL.z), CASTELL.z);
        aleta.rotation.z = reduced ? -.3 : Math.sin(time * 11) * .5;
      }
      at.set(MULA_AT.x, ground.at(MULA_AT.x, MULA_AT.z), MULA_AT.z);
      const d = mula.group.position.distanceTo(at);
      mula.group.position.lerp(at, Math.min(1, d ? 20 * dt / d : 1));
      mula.group.rotation.y += ((d > .3 ? 0 : Math.atan2(-CAM_DIR.x, -CAM_DIR.z)) - mula.group.rotation.y) * Math.min(1, dt * 5);
    } else {
      const half = arena ? 3.8 : halfAt(crewAt), mx = arena ? MINE_AT.x : Math.max(-half + .8, Math.min(half - .8, x)), mz = arena ? MINE_AT.z : crewAt + 1.4;
      mine.count(run.n, mx, mz - .9);
      mine.run(dt, mx, mz, time, moving || fighting, half - .3);
      if (arena) { // out of the crush, to where she will watch the castell from
        at.set(MULA_AT.x, 0, MULA_AT.z);
        mula.group.position.lerp(at, Math.min(1, dt * 2));
      } else {
        mula.group.position.z = mz - 4;
        mula.group.position.x += (mx + bend(mula.group.position.z) - mula.group.position.x) * Math.min(1, dt * 12);
        mula.group.rotation.y = heading(mula.group.position.z);
      }
      mula.group.position.y = ground.at(mula.group.position.x, mula.group.position.z);
    }
    mula.pose(time, moving || fighting || (plaza && plaza.age < 1));
    mula.group.visible = !!run.n;
    rivals.count(run.rival, RIVALS.x, RIVALS.z);
    const rx = RIVALS.x, rz = fighting ? RIVALS.z + 3 : RIVALS.z;
    rivals.run(dt, rx, rz, time, fighting, 4.2);
    mine.draw(dt);
    rivals.draw(dt);
    confetti.update(dt, moving ? -run.speed * .55 : 0);
    course.update(time, camera.position.z);
    bar.style.transform = `scaleX(${Math.min(1, run.z / run.end)})`;

    // the camera: behind the crew while running, then back and up to frame the whole castell
    kick = Math.max(0, kick - dt * 2.5);
    shake = Math.max(0, shake - dt * 2.6);
    if (arena && !plaza) { // the clash, seen from where the castell will be
      const by = ground.at(CASTELL.x, CASTELL.z);
      lookAt.set(0, by + 1.2, (MINE_AT.z + RIVALS.z) / 2);
      at.set(0, CAM_Y, MOUTH_Z + 13);
      if (snap) camNow.copy(at);
      camNow.lerp(at, Math.min(1, dt * 3));
    } else if (plaza) {
      const h = castellHeight(plaza.c), v = camera.fov * Math.PI / 360, spread = 2 * (1.35 + Math.sqrt(plaza.c.pinya) * .34) + 4;
      const free = (H - RESERVE - 112) / H; // the panel and the count take the rest
      const dist = VIEW_DIST; // inside the square whatever the phone: a small screen widens the lens instead of backing into the Cort
      camera.fov += (Math.max(baseFov, Math.min(110, 2 * Math.atan((h + 1) / (2 * dist * free)) * 180 / Math.PI)) - camera.fov) * Math.min(1, dt * 4);
      camera.updateProjectionMatrix();
      const ease = Math.min(1, plaza.age / 1.6), by = ground.at(CASTELL.x, CASTELL.z); // the camera stays high while they walk in, and the frame makes room for the panel without a jump
      camera.setViewOffset(W, H, 0, RESERVE / 2 * ease, W, H);
      lookAt.set(CASTELL.x, by + .8 + (h * .5 - .8) * ease, CASTELL.z);
      camNow.lerp(at.set(CASTELL.x + CAM_DIR.x * dist, by + CAM_Y + (h * .42 + 1.6 - CAM_Y) * ease, CASTELL.z + CAM_DIR.z * dist), Math.min(1, dt * 1.8));
      if (snap) camNow.copy(at);
    } else {
      camera.fov = baseFov + (reduced || !moving ? 0 : kick * 5);
      camera.updateProjectionMatrix();
      const room = Math.max(0, halfAt(crewAt + CAM_BACK * .5) - 1.8), cx = Math.max(-room, Math.min(room, x * .55));
      lookAt.set(cx * .6 + bend(crewAt - CAM_AHEAD), .8, crewAt - CAM_AHEAD);
      at.set(cx + bend(crewAt + CAM_BACK), CAM_Y, crewAt + CAM_BACK);
      camNow.x += (at.x - camNow.x) * Math.min(1, dt * 9);
      camNow.y = at.y;
      camNow.z = at.z; // locked to the run: a lag here reads as the world stuttering
    }
    lookNow.x += (lookAt.x - lookNow.x) * Math.min(1, dt * 7);
    lookNow.y += (lookAt.y - lookNow.y) * Math.min(1, dt * 7);
    lookNow.z = arena ? lookNow.z + (lookAt.z - lookNow.z) * Math.min(1, dt * 7) : lookAt.z;
    if (snap) { lookNow.copy(lookAt); snap = false; }
    camera.position.copy(camNow);
    for (const m of stretches) m.visible = m.userData.top < camNow.z + 70 && m.userData.top > camNow.z - 270 + 60; // only what the curves let through
    plazaWorld.visible = camNow.z < -STREET_LENGTH + 215;
    if (shake) { camera.position.x += Math.sin(time * 70) * shake * .35; camera.position.y += Math.cos(time * 57) * shake * .22; }
    camera.lookAt(lookNow);
    camera.updateMatrixWorld();

    if (plaza) { // in the free row between the buttons: over the castell it would hide the enxaneta on small phones
      badge(myBadge, run.n, CASTELL.x, 0, CASTELL.z);
      myBadge.style.transform = `translate(${Math.round((W - myBadge.offsetWidth) / 2)}px, ${back.offsetTop + Math.round((44 - myBadge.offsetHeight) / 2)}px)`;
    }
    else badge(myBadge, run.n, Math.max(-NARROW, Math.min(NARROW, x)) + bend(crewAt + 2.6), 0, crewAt + 2.6 + Math.min(4.6, Math.sqrt(run.n) * .6)); // behind the blob, so the Mulassa stays clear
    badge(rivalBadge, plaza || run.z < run.end - 60 ? 0 : run.rival, RIVALS.x, 3.5 + ground.at(RIVALS.x, RIVALS.z), RIVALS.z);
    renderer.render(scene, camera);
  }

  const onPointer = e => { target = Math.max(-.72, Math.min(.72, (e.clientX - W / 2) / (W * .36))); };
  const onKey = e => {
    const d = { ArrowLeft: -1, ArrowRight: 1 }[e.code];
    if (d) keys = e.type === 'keydown' ? d : keys === d ? 0 : keys;
  };

  showSound();
  size();
  // the door numbers are drawn into textures: the pixel font has to be there first
  overlay.innerHTML = `<div class="panel"><h2>${NAME}</h2><p>${T.loading}</p></div>`;
  Promise.all([document.fonts.load("400 150px 'Jersey 10'").catch(() => {}), loadWorld(plazaWorld, worldMat, farMat)]).then(([, at]) => {
    ground.at = at;
    if (!stopped) { home(); raf = requestAnimationFrame(frame); }
  }).catch(() => { if (!stopped) overlay.innerHTML = `<div class="panel"><h2>${NAME}</h2><p>${T.loadFailed}</p></div>`; });
  if (import.meta.env.DEV) window.__corre = () => ({ run, plaza, renderer });
  addEventListener('resize', size);
  addEventListener('keydown', onKey);
  addEventListener('keyup', onKey);
  canvas.addEventListener('pointerdown', onPointer);
  canvas.addEventListener('pointermove', onPointer);
  return () => {
    stopped = true;
    cancelAnimationFrame(raf);
    clearTimeout(armTimer);
    clearTimeout(panelTimer);
    removeEventListener('resize', size);
    removeEventListener('keydown', onKey);
    removeEventListener('keyup', onKey);
    audio.close();
    course?.dispose();
    scene.traverse(o => o.geometry?.dispose());
    groundTex.dispose();
    renderer.dispose();
  };
}
