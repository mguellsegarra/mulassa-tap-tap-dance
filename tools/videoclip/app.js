// Videoclip tool (dev only, /tools/videoclip/): the Mulassa's techno clip seen in every social format at once. One WebGL
// canvas behind the page draws one camera per format into its frame's rectangle; the timeline shows the song's phrases
// (clip.json, analyze.py), lets the owner relabel them (kept on this device) and mark a cut's in and out.
// ?t=N starts at second N; ?render=reel|yt|post|square (export, render.mjs): one format filling the window, no UI,
// driven by window.__clip.frame(t).
import * as THREE from 'three';
import { buildMulassa } from '/src/figures/mulassa/mulassa.js';
import { createCarriers } from '/src/figures/mulassa/mula-carriers.js';
import { poseMulassa } from '/src/figures/mulassa/mula-pose-rig.js';
import { newMulaPose } from '/src/figures/mulassa/mula-dance.js';
import clip from './clip.json';
import { createGrid } from './grid.js';
import { createClipDance } from './dance.js';
import { createStage } from './stage.js';
import { createCrowd } from './crowd.js';
import { placeCamera, shotAt } from './shots.js';
import { createFx } from './fx.js';
import { createFigureGlow } from './figure-glow.js';
import { createNotes } from './notes.js';
import { STYLES, textAt } from './textfx.js';
import { CARDS } from './endcard.js';
import edit from './edit.json';

export const FORMATS = { // safe: the bands the app's own buttons and captions cover (share of height top/bottom, of width right)
  yt: { name: 'YouTube 16:9 · 1920×1080', w: 1920, h: 1080 },
  reel: { name: 'Reels / Story / Shorts 9:16 · 1080×1920', w: 1080, h: 1920, safe: { top: .14, bottom: .22, right: .11 } },
  post: { name: 'Post 4:5 · 1080×1350', w: 1080, h: 1350, grid: 3 / 4 }, // the profile grid shows a 3:4 crop of it
  square: { name: 'Quadrat 1:1 · 1080×1080', w: 1080, h: 1080 },
};
const q = new URLSearchParams(location.search), $ = id => document.getElementById(id), RENDER = q.get('render');
const LABELS = ['intro', 'build', 'drop', 'hard', 'break', 'vocal', 'outro'];
const COLORS = { intro: '#5865f2', build: '#1ee3ff', drop: '#ff2bd6', hard: '#ff3b30', break: '#7a5cff', vocal: '#ffb02b', outro: '#3d4a8a' };

// the owner's section labels, over analyze.py's guesses (localStorage, per song)
const KEY = `videoclip-labels:${clip.source}`;
const overrides = JSON.parse(localStorage.getItem(KEY) || '{}');
const labelOf = i => overrides[i];

const g = createGrid(clip);
const renderer = new THREE.WebGLRenderer({ canvas: $('gl'), antialias: true, preserveDrawingBuffer: !!RENDER });
renderer.setPixelRatio(RENDER ? 1 : Math.min(2, devicePixelRatio)); renderer.setScissorTest(true);
renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene();
const stage = createStage(scene, g, labelOf), crowd = createCrowd(scene, g, labelOf), dance = createClipDance(g, labelOf), fx = createFx(scene, g, labelOf);
const rig = buildMulassa(), carriers = createCarriers();
rig.root.add(carriers.group); scene.add(rig.root);
rig.root.updateMatrixWorld(true);
const { x: BODY_X, z: BODY_Z } = new THREE.Box3().setFromObject(rig.body).getCenter(new THREE.Vector3());
const HEAD = rig.head.getWorldPosition(new THREE.Vector3()); // her head at rest, in her own frame (the rig stands at the origin, facing +z)
// What the cameras aim at: where she is on average over 1.2 s round t, so they follow her path, never her bounce, sway or
// steps (aiming at her live body, head or shoes shook every shot: the owner); her body's middle, her head and her
// shoes as fixed points of her frame there. Once a frame, shared by every format.
const AIM = newMulaPose(), CENTRE = new THREE.Vector3(), FEET = new THREE.Vector3(), HEADP = new THREE.Vector3();
let aimT = NaN;
function aimAt(t) {
  if (t !== aimT) {
    aimT = t; let x = 0, z = 0, yaw = 0; const N = 9;
    for (let k = 0; k < N; k++) { dance.pose(AIM, t + (k - (N - 1) / 2) * .15); x += AIM.x / N; z += AIM.z / N; yaw += AIM.yaw / N; }
    const c = Math.cos(yaw), sn = Math.sin(yaw), at = (ox, oz, v, y = 0) => v.set(x + sn * oz + c * ox, y, z + c * oz - sn * ox);
    at(BODY_X, BODY_Z, CENTRE); at(0, 0, FEET); at(HEAD.x, HEAD.z, HEADP, HEAD.y);
  }
  return { centre: CENTRE, feet: FEET, head: HEADP, yawAt: t => dance.pose(YAW, t).yaw };
}
const glow = createFigureGlow(rig.root, o => carriers.group === o.parent, labelOf); // (not the carriers' shoes)
const YAW = newMulaPose(), pose = newMulaPose(), feet = Array.from({ length: 8 }, () => ({}));
const cameras = Object.fromEntries(Object.keys(FORMATS).map(k => [k, new THREE.PerspectiveCamera(40, 1, .05, 120)]));

// the world at t: her pose and shoes, the crowd, the floor and lights
function poseWorld(t) {
  dance.pose(pose, t);
  poseMulassa(rig, pose, pose.beat, pose.x, pose.z, pose.yaw); rig.root.updateMatrixWorld(true);
  for (let i = 0; i < 8; i++) dance.foot(t, i, feet[i]);
  carriers.pose(rig, feet);
  const lit = stage.update(t, pose); crowd.update(t, pose); fx.update(t, lit.label, lit.ph, lit.tint); glow.update(g, t, lit.label, lit.ph);
  return lit;
}
// one format's camera into a rectangle of the canvas (CSS px, from the top left)
function draw(fmt, t, x, y, w, h, lit) {
  const cam = cameras[fmt], s = placeCamera(cam, g, t, pose, w / h, labelOf, aimAt(t));
  const H = renderer.domElement.clientHeight;
  renderer.setViewport(x, H - y - h, w, h); renderer.setScissor(x, H - y - h, w, h);
  fx.view(h * renderer.getPixelRatio(), cam.fov); fx.dip(s.dip ?? 0); renderer.render(scene, cam); fx.overlayDraw(renderer, w / h);
  return s;
}

// the end card after the song (edit.json endcard): the tool's timeline runs on through it, silent
const CARD = edit.endcard && CARDS[edit.endcard], END = clip.duration + (CARD?.dur ?? 0);

// ---- export mode: one format, the whole window, frame by frame
if (RENDER) {
  document.body.classList.add('render');
  const F = FORMATS[RENDER], k = +q.get('scale') || 1, w = Math.round(F.w * k), h = Math.round(F.h * k); // ?scale=.5: a quick review render
  renderer.setSize(w, h, false); renderer.domElement.style.cssText = `width:${w}px;height:${h}px;position:fixed;left:0;top:0`;
  // the picture goes out through a 2D layer: the words on the shouts are drawn from it (textfx.js)
  const out = document.createElement('canvas'); out.width = w; out.height = h; out.style.cssText = renderer.domElement.style.cssText; document.body.append(out);
  const octx = out.getContext('2d', { willReadFrequently: true });
  const frameOut = t => { const s = textAt(g, t, edit, labelOf); if (s) STYLES[s.style].draw(octx, w, h, renderer.domElement, s); else octx.drawImage(renderer.domElement, 0, 0); };
  window.__clip = { duration: clip.duration, size: [w, h], pose: t => ({ ...dance.pose({}, t) }), shot: t => shotAt(g, t, labelOf), cam: () => [...cameras[RENDER].position.toArray(), cameras[RENDER].fov], camera: cameras[RENDER], rig, THREE, crowd: crowd.people, feetBox: () => [Math.min(...feet.map(f => f.x)), Math.max(...feet.map(f => f.x)), Math.min(...feet.map(f => f.z)), Math.max(...feet.map(f => f.z))], scene, frame(t) { const lit = poseWorld(t); draw(RENDER, t, 0, 0, w, h, lit); frameOut(t); } };
} else startTool();

function startTool() {
  const audio = $('audio'), frames = $('frames'), shown = new Set(['yt', 'reel', 'post']), boxes = {};
  let t = +q.get('t') || 0, playing = false, last = performance.now(), range = null, selected = -1;
  const fmtButtons = [...document.querySelectorAll('[data-f]')];
  for (const b of fmtButtons) b.onclick = () => { shown.has(b.dataset.f) ? shown.delete(b.dataset.f) : shown.add(b.dataset.f); b.classList.toggle('on'); layout(); };
  $('safes').onchange = () => frames.classList.toggle('safes', $('safes').checked); frames.classList.add('safes');

  // the frames side by side at one height, as tall as fits (narrow screens: one under the other, scrolled by the tabs)
  function layout() {
    frames.textContent = ''; frames.dataset.v = +(frames.dataset.v ?? 0) + 1; // (notes.js redraws its pins on new frames)
    const list = Object.keys(FORMATS).filter(k => shown.has(k)), r = frames.getBoundingClientRect(), gap = 12, label = 22;
    const aspects = list.map(k => FORMATS[k].w / FORMATS[k].h), sum = aspects.reduce((a, b) => a + b, 0);
    const h = Math.max(60, Math.min(r.height - label, (r.width - gap * (list.length - 1)) / sum));
    for (const [n, k] of list.entries()) {
      const F = FORMATS[k], el = document.createElement('div'); el.className = 'frame';
      el.style.cssText = `width:${Math.floor(h * aspects[n])}px;height:${Math.floor(h)}px;margin-top:${label}px`;
      el.innerHTML = `<span class="name">${F.name}</span>`;
      if (F.safe) el.insertAdjacentHTML('beforeend', `<div class="safe"><i style="top:0;height:${F.safe.top * 100}%"></i><i style="bottom:0;height:${F.safe.bottom * 100}%"></i><i style="top:0;bottom:0;left:auto;right:0;width:${F.safe.right * 100}%"></i></div>`);
      if (F.grid) { const crop = (1 - F.grid * F.h / F.w) / 2 * 100; el.insertAdjacentHTML('beforeend', `<div class="safe"><i style="top:0;height:${crop}%"></i><i style="bottom:0;height:${crop}%"></i></div>`); }
      const words = document.createElement('canvas'); words.className = 'words'; el.prepend(words); // (under the safe-zone marks)
      frames.append(el); boxes[k] = el;
    }
    for (const k of Object.keys(boxes)) if (!list.includes(k)) delete boxes[k];
  }

  // ---- timeline: phrases coloured by label, the waveform of the drums and bass, the play head and the cut
  const tl = $('tl'), wave = $('wave'), head = tl.querySelector('.head'), rangeEl = tl.querySelector('.range');
  function drawTimeline() {
    tl.querySelectorAll('.ph').forEach(e => e.remove());
    for (const [i, p] of g.phrases.entries()) {
      const lab = labelOf(i) ?? p.label, e = document.createElement('div'); e.className = 'ph';
      const a = g.timeAt(p.beat) / END, b = g.timeAt(p.end) / END;
      e.style.cssText = `left:${a * 100}%;width:${(b - a) * 100}%;background:${COLORS[lab]}${i === selected ? '' : 'aa'}`;
      e.textContent = lab; tl.prepend(e);
    }
    const c = wave.getContext('2d'), W = (wave.width = tl.clientWidth * 2), H = (wave.height = 92);
    c.fillStyle = '#0009';
    const kk = clip.kickLevel, bs = clip.levels.bass ?? kk;
    for (let i = 0; i < kk.length; i++) { const x = i / kk.length * W, v = Math.max(kk[i], bs[i]) * H * .45; c.fillRect(x, H / 2 - v, Math.max(1, W / kk.length - .5), v * 2); }
  }
  function drawEditor() {
    const ed = $('edit');
    if (selected < 0) { ed.textContent = 'Toca una secció per canviar-ne el tipus (el ball, les llums i els plans la segueixen).'; return; }
    const p = g.phrases[selected], lab = labelOf(selected) ?? p.label;
    ed.innerHTML = `Secció ${selected + 1} · ${g.timeAt(p.beat).toFixed(1)} s, compàs ${p.beat / 4 + 1} · <select>${LABELS.map(l => `<option ${l === lab ? 'selected' : ''}>${l}</option>`).join('')}</select> <button>Copia les etiquetes (JSON)</button>`;
    ed.querySelector('select').onchange = e => { overrides[selected] = e.target.value; localStorage.setItem(KEY, JSON.stringify(overrides)); dance.replan(); drawTimeline(); };
    ed.querySelector('button').onclick = () => navigator.clipboard?.writeText(JSON.stringify(g.phrases.map((p, i) => labelOf(i) ?? p.label)));
  }
  const tAtX = x => Math.max(0, Math.min(END, (x - tl.getBoundingClientRect().left) / tl.clientWidth * END));
  let dragging = false;
  const seekTo = s => { t = s; if (playing) audio.currentTime = s; };
  tl.onpointerdown = e => { dragging = true; tl.setPointerCapture(e.pointerId); const s = tAtX(e.clientX); seekTo(s); selected = g.phraseAt(s).index; drawTimeline(); drawEditor(); };
  tl.onpointermove = e => { if (dragging) seekTo(tAtX(e.clientX)); };
  tl.onpointerup = () => { dragging = false; };

  const toggle = () => {
    playing = !playing; $('play').textContent = playing ? '❚❚' : '▶︎';
    if (playing) { if (range && (t < range[0] || t >= range[1])) t = range[0]; audio.currentTime = t; audio.play(); } else audio.pause();
  };
  $('play').onclick = toggle;
  // the cut snaps to bars: a clip for Reels starts and ends on the music's own phrasing
  const bar = s => g.timeAt(Math.round(g.beatAt(s) / 4) * 4);
  $('mark-in').onclick = () => { range = [bar(t), range?.[1] ?? END]; };
  $('mark-out').onclick = () => { range = [range?.[0] ?? 0, bar(t)]; };
  $('clear-range').onclick = () => { range = null; };
  addEventListener('keydown', e => {
    if (/SELECT|TEXTAREA|INPUT/.test(e.target.tagName)) return;
    if (e.code === 'Space') { e.preventDefault(); toggle(); }
    if (e.key === 'ArrowRight') seekTo(Math.min(END, t + (e.shiftKey ? g.P * 16 : g.P * 4)));
    if (e.key === 'ArrowLeft') seekTo(Math.max(0, t - (e.shiftKey ? g.P * 16 : g.P * 4)));
    if (e.key === 'i') $('mark-in').click();
    if (e.key === 'o') $('mark-out').click();
  });
  addEventListener('resize', () => { layout(); drawTimeline(); });
  layout(); drawTimeline(); drawEditor();
  const notes = createNotes(`videoclip-notes:${clip.source}`, { bar: $('bar'), panel: $('edit'), timeline: tl, frames }, () => {
    const s = shotAt(g, t, labelOf);
    return { t, bar: Math.floor(g.beatAt(t) / 4) + 1, label: s.label, shot: s.name, cut: +s.cut.toFixed(2), duration: END, layout: frames.dataset.v,
      formats: Object.fromEntries(Object.entries(boxes).map(([k, el]) => [k, { el, name: FORMATS[k].name }])) };
  }, { pause: () => { if (playing) toggle(); }, seek: seekTo });

  const region = document.createElement('canvas'); // a frame's own picture, for the words
  function frame() {
    const now = performance.now(), dt = Math.min(.1, (now - last) / 1000); last = now;
    if (playing) {
      t = audio.paused ? t + dt : audio.currentTime;
      audio.volume = Math.min(1, Math.max(0, (clip.duration - t) / (edit.musicFade ?? 1))) ** 2; // the song fades out before the end card, as in the export
      if (range && t >= range[1]) { t = range[0]; audio.currentTime = t; }
      if (t >= END) { t = 0; audio.currentTime = 0; }
    }
    const W = innerWidth, H = innerHeight;
    if (renderer.domElement.width !== Math.round(W * renderer.getPixelRatio()) || renderer.domElement.height !== Math.round(H * renderer.getPixelRatio())) renderer.setSize(W, H, false);
    renderer.setScissor(0, 0, W, H); renderer.setClearColor('#0b0c14'); renderer.clear();
    const ts = Math.min(t, clip.duration - .01), lit = poseWorld(ts); let s; // (on the end card the scene holds its last frame, under the card)
    for (const [k, el] of Object.entries(boxes)) { const r = el.getBoundingClientRect(); s = draw(k, ts, r.left, r.top, r.width, r.height, lit); }
    // the words on a shout, over each frame: drawn from that frame's region of the WebGL canvas, in this same task
    const card = CARD && t >= clip.duration, word = card ? { card: true } : textAt(g, t, edit, labelOf), dpr = renderer.getPixelRatio();
    for (const el of Object.values(boxes)) {
      const c = el.querySelector('.words'); c.style.display = word ? 'block' : 'none'; if (!word) continue;
      const r = el.getBoundingClientRect(), cw = Math.round(r.width * dpr), ch = Math.round(r.height * dpr);
      if (c.width !== cw || c.height !== ch) { c.width = cw; c.height = ch; }
      region.width = cw; region.height = ch; region.getContext('2d').drawImage(renderer.domElement, r.left * dpr, r.top * dpr, cw, ch, 0, 0, cw, ch);
      if (card) { CARD.draw(c.getContext('2d'), cw, ch, t - clip.duration); continue; }
      STYLES[word.style].draw(c.getContext('2d', { willReadFrequently: true }), cw, ch, region, word);
    }
    head.style.left = `${t / END * 100}%`;
    if (range) { rangeEl.style.display = 'block'; rangeEl.style.left = `${range[0] / END * 100}%`; rangeEl.style.width = `${(range[1] - range[0]) / END * 100}%`; } else rangeEl.style.display = 'none';
    const fmt = s => `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, '0')}`;
    $('time').textContent = `${fmt(t)} / ${fmt(END)} · ${t >= clip.duration ? 'targeta final' : `compàs ${Math.floor(g.beatAt(t) / 4) + 1} · ${lit.label}`}${s ? ` · pla ${s.name}` : ''}${range ? ` · tall ${fmt(range[0])}–${fmt(range[1])} (${(range[1] - range[0]).toFixed(1)} s)` : ''}`;
    $('info').textContent = `~${Math.round(clip.bpm)} BPM`;
    notes.tick();
    requestAnimationFrame(frame);
  }
  frame();
}
