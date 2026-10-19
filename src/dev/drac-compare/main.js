// The Drac comparison (drac-compare.html?mute, dev only): the source video and the game's Drac rig at the same second.
// The video's own time is the only clock (clock.js); the model is posed at the frame the video presents. Starts muted,
// never plays by itself. window.__dracCompare is the calibration and validation surface.
import { PHRASES, SOURCE, phraseAt } from './phrases.js';
import { PLAN, KIND_LABEL, STATUS_LABEL, LEG_NAME } from '../../game/drac-steps.js';
import { ROOT_KEYS, YAW_KEYS } from '../../game/drac-path.js';
import { DEFAULT_TUNE } from './camera.js';
import { createVideoClock } from './clock.js';
import { createStage } from './stage.js';
import { HELPERS } from '../../game/drac-layout.js';
import { createOverhead } from './overhead.js';
import { createMusicSync } from './music.js';
import { dracTime } from '../../game/drac-time.js';

const $ = id => document.getElementById(id);
const MUTE = new URLSearchParams(location.search).has('mute');
const num = (x, d = 2) => x.toFixed(d).replace('.', ',');
const STATUS = { observed: 'observat', partial: 'parcial', orientation_verified: 'orientació verificada' };
const VIEW_LABEL = { referencia: 'Càmera de referència (aproximada)', fixa: 'Càmera fixa ampla', planta: 'Planta' };
// Plain directions for the opening cross, in the helpers' frame. The audit below retains its camera-relative words.
const OPENING_DIRECTIONS = ['Avança cap a S.', 'Recula cap a N, sense fer mitja volta.',
  'Torna cap al centre, en direcció S.', 'Avança cap a W.',
  'Recula cap a E, passant pel centre.', 'Torna cap al centre i es prepara per girar.'];

const video = $('video'), canvas = $('stage');
const clock = createVideoClock(video, { mute: MUTE });
const stage = createStage(canvas);
const overhead = createOverhead($('overhead'));
const music = createMusicSync(video, { mute: MUTE });
let videoOk = true, shown = -1, held = false, phraseShown = null, textAt = 0;

// what the model does in each audited phrase: its landings by status
function modelSummary(p) {
  const s = PLAN.filter(x => x.down >= p.start && x.down < p.end);
  if (!s.length) return 'Model: cap col·locació nova (els peus aguanten).';
  const by = {};
  for (const x of s) by[x.status] = (by[x.status] ?? 0) + 1;
  const kinds = [...new Set(s.map(x => KIND_LABEL[x.kind]))].join(', ');
  const legs = s.some(x => x.legInferred) ? ' Peu sense identificar al vídeo: triat per alternança.' : '';
  return `Model: ${s.length} col·locacions (${Object.entries(by).map(([k, n]) => `${n} ${STATUS_LABEL[k]}`).join(' · ')}); ${kinds}.${legs}`;
}

function show(t) {
  t = clock.guard(t);
  const p = phraseAt(t);
  if (p !== phraseShown) {
    phraseShown = p;
    stage.showPrints(p.start, p.end);
    $('phrase-title').textContent = `Frase ${p.i + 1}/33 · ${num(p.start, 1)}–${num(p.end, 1)} s · ${STATUS[p.status]}`;
    $('phrase-action').textContent = p.action;
    $('phrase-count').textContent = `Auditoria: ${p.count}`;
    $('phrase-model').textContent = modelSummary(p);
    $('overhead-action').textContent = `${p.i + 1}/33 · ${OPENING_DIRECTIONS[p.i] ?? p.action}`;
    const chips = $('phrases').children;
    for (let i = 0; i < chips.length; i++) chips[i].setAttribute('aria-current', String(i === p.i));
  }
  stage.render(t);
  overhead.render(t, stage.pose, stage.referenceCamera);
  shown = t;
}
function text(now) {
  if (now - textAt < 100) return;
  textAt = now;
  $('play').textContent = video.paused ? 'Reprodueix' : 'Pausa';
  if (document.activeElement !== $('seek')) $('seek').value = shown;
  const steps = [0, 1].map(i => {
    const f = stage.rig.feet[i];
    return `${LEG_NAME[i]} ${f.lift > 0.001 ? 'a l\'aire' : 'a terra'}`;
  }).join(' · ');
  const songS = dracTime.songAtRef(shown), beat = dracTime.beatAtRef(shown);
  $('readout').textContent = `${num(shown)} s · fotograma ${Math.round(shown * SOURCE.fps)} · cançó ${num(songS)} s, pols ${num(beat, 1)} · ${num(video.playbackRate, 2)}× · rumb ${Math.round(stage.pose.yaw * 180 / Math.PI)}° · ${steps}`;
}

// ---- the clock: the frame the video presents while it plays, its currentTime when paused or sought
if ('requestVideoFrameCallback' in video) {
  const onFrame = (_, md) => { if (!video.paused) { held = false; show(md.mediaTime); } video.requestVideoFrameCallback(onFrame); };
  video.requestVideoFrameCallback(onFrame);
}
function loop(now) {
  const rvfc = 'requestVideoFrameCallback' in video;
  if (videoOk && !held && (video.paused || !rvfc) && video.currentTime !== shown) show(video.currentTime);
  music.tick();
  text(now);
  requestAnimationFrame(loop);
}
for (const ev of ['seeked', 'pause', 'loadeddata']) video.addEventListener(ev, () => { held = false; show(video.currentTime); });
video.addEventListener('error', () => { videoOk = false; $('video-missing').hidden = false; $('play').hidden = true; });

// ---- controls
const press = (group, value) => { for (const b of document.querySelectorAll(`[data-group="${group}"] button`)) b.setAttribute('aria-pressed', String(b.dataset.value === String(value))); };
function seekTo(t) {
  if (!videoOk) { held = true; show(t); return; }
  clock.seek(t);
}
function setView(v) { press('view', stage.setView(v)); $('stage-caption').textContent = VIEW_LABEL[stage.view]; }
function setOverlay(on, opacity) {
  if (opacity !== undefined) document.documentElement.style.setProperty('--overlay', String(opacity));
  $('views').classList.toggle('overlay', !!on);
  canvas.classList.toggle('on-video', !!on);
  (on ? video.parentElement : $('views').children[1].firstElementChild).append(canvas);
  $('overlay').checked = !!on;
  stage.resize(); overhead.resize(); show(shown < 0 ? 0 : shown);
}
function setSound(on) {
  const s = clock.setSound(on);
  if (s) setMusic(false); // one source at a time
  $('sound').setAttribute('aria-pressed', String(s));
  return s;
}
function setMusic(on) {
  const m = music.set(on);
  if (m && clock.state.sound) setSound(false);
  $('music').setAttribute('aria-pressed', String(m));
  return m;
}
function buildTune() {
  const labels = { az: 'Azimut de l\'estació (°)', dist: 'Distància (m)', h: 'Alçada de l\'objectiu (m)', ty: 'Alçada de la mira (m)', fov: 'Camp vertical (°)', pan: 'Panoràmica extra (°)', tilt: 'Inclinació extra (°)', roll: 'Gir del quadre (°)', follow: 'Claus de panoràmica (0–1)' };
  const step = { az: 1, dist: 0.05, h: 0.05, ty: 0.05, fov: 0.5, pan: 0.5, tilt: 0.5, roll: 0.5, follow: 0.1 };
  $('tune').replaceChildren(...Object.keys(DEFAULT_TUNE).map(k => {
    const l = document.createElement('label'), i = document.createElement('input');
    Object.assign(i, { type: 'number', step: step[k], value: stage.cams.tune[k], inputMode: 'decimal' });
    i.dataset.key = k;
    i.onchange = () => setCamera({ [k]: Number(i.value.replace(',', '.')) });
    l.append(labels[k], i);
    return l;
  }));
}
function setCamera(p) {
  const tune = stage.cams.setTune(p);
  for (const i of $('tune').querySelectorAll('input')) i.value = tune[i.dataset.key];
  $('tune-json').textContent = JSON.stringify(tune);
  show(shown < 0 ? 0 : shown);
  return tune;
}
function setExpression(g) {
  const e = stage.setExpression(Number(g));
  $('expr').value = e; $('expr-out').textContent = `${Math.round(e * 100)}%`;
  press('expr', e === 0 ? 0 : e === 1 ? 1 : null);
  return e;
}
function wire() {
  $('play').onclick = () => clock.toggle();
  $('back').onclick = () => clock.step(-1);
  $('fwd').onclick = () => clock.step(1);
  $('seek').oninput = e => seekTo(+e.target.value);
  $('sound').onclick = () => setSound(!clock.state.sound);
  $('music').onclick = () => setMusic(!music.on);
  if (MUTE) { $('sound').hidden = true; $('music').hidden = true; $('sound-locked').hidden = false; }
  $('full').onchange = e => { clock.setFull(e.target.checked); $('seek').max = clock.limit(); };
  $('overlay').onchange = e => setOverlay(e.target.checked);
  $('opacity').oninput = e => document.documentElement.style.setProperty('--overlay', e.target.value);
  $('expr').oninput = e => setExpression(e.target.value);
  for (const box of document.querySelectorAll('[data-layer]')) box.onchange = () => stage.setLayers({ [box.dataset.layer]: box.checked });
  $('tune-reset').onclick = () => { stage.cams.reset(); setCamera({}); };
  for (const group of document.querySelectorAll('.seg[data-group]')) group.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    if (group.dataset.group === 'rate') press('rate', clock.setRate(Number(b.dataset.value)));
    else if (group.dataset.group === 'view') setView(b.dataset.value);
    else if (group.dataset.group === 'expr') setExpression(Number(b.dataset.value));
  });
  $('phrases').replaceChildren(...PHRASES.map(p => {
    const b = document.createElement('button');
    b.type = 'button';
    b.append(`${p.i + 1}. ${p.action}`, Object.assign(document.createElement('small'), { textContent: `${num(p.start, 1)}–${num(p.end, 1)} s · ${STATUS[p.status]}` }));
    b.onclick = () => seekTo(p.start + 0.001);
    return b;
  }));
  document.addEventListener('keydown', e => {
    if (/INPUT|BUTTON|SELECT|TEXTAREA|SUMMARY/.test(e.target.tagName)) return;
    if (e.code === 'Space') { e.preventDefault(); clock.toggle(); } else if (e.code === 'ArrowLeft') clock.step(-1); else if (e.code === 'ArrowRight') clock.step(1);
  });
  addEventListener('resize', () => { stage.resize(); overhead.resize(); show(shown < 0 ? 0 : shown); });
}

wire(); buildTune(); setCamera({}); setView('referencia'); press('rate', 1); setSound(false); setExpression(stage.expression);
for (const box of document.querySelectorAll('[data-layer]')) stage.setLayers({ [box.dataset.layer]: box.checked });
show(0);
requestAnimationFrame(loop);

const round = x => (typeof x === 'number' ? +x.toFixed(4) : x);
window.__dracCompare = {
  // moves the video (and so the model) to t; resolves once the frame is there, with the snapshot
  seek: t => new Promise(resolve => {
    if (!videoOk) { held = true; show(t); resolve(stage.snapshot()); return; }
    const done = () => { clearTimeout(timer); video.removeEventListener('seeked', done); held = false; show(video.currentTime); resolve(stage.snapshot()); };
    const timer = setTimeout(done, 3000);
    video.addEventListener('seeked', done);
    clock.seek(t);
  }),
  // poses and draws the model at t without moving the video (calibration); the next video change takes over again
  renderAt: t => { held = true; show(t); return stage.snapshot(); },
  snapshot: () => stage.snapshot(),
  state: () => ({ t: shown, song: dracTime.songAtRef(shown), beat: dracTime.beatAtRef(shown), music: music.on, video: video.currentTime, playing: !video.paused, rate: video.playbackRate, muted: video.muted, muteLocked: MUTE, sound: clock.state.sound,
    full: clock.state.full, end: clock.limit(), view: stage.view, expression: stage.expression, overlay: $('views').classList.contains('overlay'), phrase: phraseAt(shown), videoOk }),
  play: () => clock.play(), pause: () => clock.pause(), step: n => clock.step(n), setRate: r => clock.setRate(r), setSound, setMusic,
  setView, setOverlay, setLayers: l => stage.setLayers(l),
  // the comic layer: 0 = the base choreography, 1 = default; returns the value in use
  expression: () => stage.expression, setExpression,
  // the helpers' anchors (metres, facing the centre; game/drac-layout.js); their screen positions are in snapshot().helpers
  helpers: HELPERS,
  setCamera, getCamera: () => ({ ...stage.cams.tune }), resetCamera: () => { stage.cams.reset(); return setCamera({}); },
  // pan / tilt keys [[t, pan, tilt]...] (deg, + = right / up) and zoom keys [[t, zoom]...]
  setTrack: (keys, zoom) => { stage.cams.setTrack(keys, zoom); show(shown); }, cameraKeys: () => ({ panTilt: stage.cams.keys, zoom: stage.cams.zoomKeys }),
  phrases: PHRASES, rootKeys: ROOT_KEYS, yawKeys: YAW_KEYS,
  plan: PLAN.map(s => ({ leg: s.leg, up: s.up, down: s.down, kind: s.kind, status: s.status, legInferred: s.legInferred, anchor: Object.fromEntries(Object.entries(s.anchor).map(([k, v]) => [k, round(v)])) })),
};
