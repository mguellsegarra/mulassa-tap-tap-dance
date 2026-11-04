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
import { createMontageEditor } from './montage-edit.js';
import { listMontages, createMontageAudio, proposalLength, sourceAt, overlayAt, drawOverlays } from './montage.js';
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
// (?card= tries another; endcardAt: the card starts over the video's end instead of after it)
const CARD = CARDS[q.get('card') ?? edit.endcard], CARD_AT = q.get('card') === 'minim' ? clip.duration : edit.endcardAt ?? clip.duration;
const END = CARD ? Math.max(clip.duration, CARD_AT + CARD.dur) : clip.duration;
g.tailEnd = g.beatAt(END); // (the last shot runs on to the very end: shots.js)

// how clear of a shout's full-screen letters video second t is (0..1, eased over 0.4 s each side): the call to play hides for them
const shoutFree = t => (textAt(g, t, edit, labelOf) ? 0 : [-.4, -.3, -.2, -.1, 0, .1, .2, .3, .4].filter(d => !textAt(g, t + d, edit, labelOf)).length / 9); // (gone while the letters are on)
// ---- export mode: one format, the whole window, frame by frame
if (RENDER) {
  document.body.classList.add('render');
  const F = FORMATS[RENDER], k = +q.get('scale') || 1, w = Math.round(F.w * k), h = Math.round(F.h * k); // ?scale=.5: a quick review render
  renderer.setSize(w, h, false); renderer.domElement.style.cssText = `width:${w}px;height:${h}px;position:fixed;left:0;top:0`;
  // the picture goes out through a 2D layer: the words on the shouts are drawn from it (textfx.js)
  const out = document.createElement('canvas'); out.width = w; out.height = h; out.style.cssText = renderer.domElement.style.cssText; document.body.append(out);
  const octx = out.getContext('2d', { willReadFrequently: true });
  const frameOut = t => { const s = textAt(g, t, edit, labelOf); if (s) STYLES[s.style].draw(octx, w, h, renderer.domElement, s); else octx.drawImage(renderer.domElement, 0, 0); };
  // ?m=<id>: a montage proposal, frame(u) at its own second u (its pieces' source time, its overlays over the picture)
  const P = q.get('m') ? (await listMontages(clip)).find(m => m.p.id === q.get('m'))?.p : null;
  let lastShot = '';
  window.__clip = { duration: P ? proposalLength(P) : clip.duration, size: [w, h], pose: t => ({ ...dance.pose({}, t) }), shot: t => shotAt(g, t, labelOf), cam: () => [...cameras[RENDER].position.toArray(), cameras[RENDER].fov], camera: cameras[RENDER], rig, THREE, shotKey: () => lastShot, herBox: () => { const b = new THREE.Box3().setFromObject(rig.body), v = new THREE.Vector3(); let y0 = 1, y1 = -1; for (const x of [b.min.x, b.max.x]) for (const y of [b.min.y, b.max.y]) for (const z of [b.min.z, b.max.z]) { v.set(x, y, z).project(cameras[RENDER]); if (v.z < 1) { y0 = Math.min(y0, v.y); y1 = Math.max(y1, v.y); } } return [(1 - y1) / 2, (1 - y0) / 2]; }, crowd: crowd.people, feetBox: () => [Math.min(...feet.map(f => f.x)), Math.max(...feet.map(f => f.x)), Math.min(...feet.map(f => f.z)), Math.max(...feet.map(f => f.z))], scene, frame(u) { const t = P ? sourceAt(P, u).t : u, lit = poseWorld(t), sh = draw(RENDER, t, 0, 0, w, h, lit); lastShot = `${sh.name}@${sh.cut.toFixed(2)}`; frameOut(t); if (P && overlayAt(P, u)) drawOverlays(octx, w, h, P, u, renderer.domElement, shoutFree(t)); } };
} else startTool();

async function startTool() {
  const audio = $('audio'), frames = $('frames'), shown = new Set(['yt', 'reel', 'post']), boxes = {};
  let t = +q.get('t') || 0, playing = false, last = performance.now(), range = null, selected = -1;
  // ---- montages (proposals/*.json): M is the one playing (null: the whole video); t is then its own second
  const MONTAGES = await listMontages(clip); let M = null, mAudio = null;
  const D = () => (M ? proposalLength(M) : END), srcT = u => (M ? sourceAt(M, u).t : u);
  const sel = document.createElement('select'); sel.id = 'montage';
  sel.innerHTML = `<option value="">Vídeo sencer (${(END / 60 | 0)}:${String(Math.round(END % 60)).padStart(2, '0')})</option>` + MONTAGES.map(m =>
    `<option value="${m.p.id}" ${m.errors.length ? 'disabled' : ''}>${m.p.loop ? '∞ ' : ''}${m.p.group} · ${m.p.title ?? m.p.id} · ${m.length?.toFixed(0) ?? '?'} s${m.errors.length ? ' (no vàlida)' : ''}</option>`).join('');
  $('top').prepend(sel);
  function pickMontage(id) {
    if (playing) toggle(); M = MONTAGES.find(m => m.p.id === id && !m.errors.length)?.p ?? null; sel.value = M?.id ?? ''; t = 0; range = null;
    shown.clear(); (M ? [M.format] : ['yt', 'reel', 'post']).forEach(f => shown.add(f)); fmtButtons.forEach(b => b.classList.toggle('on', shown.has(b.dataset.f)));
    $('why').textContent = M ? `${M.author} · ${M.why ?? ''}` : ''; layout(); drawTimeline(); notes?.refresh(); editor?.reset();
  }
  sel.onchange = () => pickMontage(sel.value);
  const fmtButtons = [...document.querySelectorAll('[data-f]')];
  for (const b of fmtButtons) b.onclick = () => { shown.has(b.dataset.f) ? shown.delete(b.dataset.f) : shown.add(b.dataset.f); b.classList.toggle('on'); layout(); };
  $('safes').onchange = () => frames.classList.toggle('safes', $('safes').checked); frames.classList.add('safes');

  // the frames side by side at one height, as tall as fits (narrow screens: one under the other, scrolled by the tabs)
  function layout() {
    frames.textContent = ''; frames.dataset.v = +(frames.dataset.v ?? 0) + 1; // (notes.js redraws its pins on new frames)
    const list = Object.keys(FORMATS).filter(k => shown.has(k)), r = frames.getBoundingClientRect(), gap = 12, label = 22;
    const aspects = list.map(k => FORMATS[k].w / FORMATS[k].h), sum = aspects.reduce((a, b) => a + b, 0);
    const room = $('bottom').getBoundingClientRect().top - r.top - 12; // (the space down to the panel: the grid row alone grew past it)
    const h = Math.max(60, Math.min(Math.min(r.height, room) - label, (r.width - gap * (list.length - 1)) / sum));
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
    if (M) { // the montage's pieces, each coloured by the section it comes from, labelled with its place in the video
      wave.getContext('2d').clearRect(0, 0, wave.width, wave.height); let at = 0;
      for (const [i, sg] of M.segments.entries()) {
        const len = sg.to - sg.from, lab = labelOf(g.phraseAt(sg.from).index) ?? g.phraseAt(sg.from).label, e = document.createElement('div'); e.className = 'ph';
        e.style.cssText = `left:${at / D() * 100}%;width:${len / D() * 100}%;background:${COLORS[lab] ?? '#888'}aa;border-right:2px solid #fff`;
        e.textContent = `${i + 1} · ${sg.from.toFixed(1)}–${sg.to.toFixed(1)}`; tl.prepend(e); at += len;
      }
      return;
    }
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
  const tAtX = x => Math.max(0, Math.min(D(), (x - tl.getBoundingClientRect().left) / tl.clientWidth * D()));
  let dragging = false;
  const seekTo = s => { t = s; if (playing) { if (M) mAudio.play(M, s); else audio.currentTime = s; } };
  tl.onpointerdown = e => { dragging = true; tl.setPointerCapture(e.pointerId); const s = tAtX(e.clientX); seekTo(s); if (!M) { selected = g.phraseAt(s).index; drawTimeline(); drawEditor(); } };
  tl.onpointermove = e => { if (dragging) seekTo(tAtX(e.clientX)); };
  tl.onpointerup = () => { dragging = false; };

  const toggle = () => {
    playing = !playing; $('play').textContent = playing ? '❚❚' : '▶︎';
    if (playing) { if (range && (t < range[0] || t >= range[1])) t = range[0]; if (M) { mAudio ??= createMontageAudio('media/mix.wav'); mAudio.play(M, t); } else { audio.currentTime = t; audio.play(); } }
    else { audio.pause(); mAudio?.stop(); }
  };
  $('play').onclick = toggle;
  // the cut snaps to bars: a clip for Reels starts and ends on the music's own phrasing
  const bar = s => g.timeAt(Math.round(g.beatAt(s) / 4) * 4);
  $('mark-in').onclick = () => { range = [M ? t : bar(t), range?.[1] ?? D()]; };
  $('mark-out').onclick = () => { range = [range?.[0] ?? 0, M ? t : bar(t)]; };
  $('clear-range').onclick = () => { range = null; };
  addEventListener('keydown', e => {
    if (/SELECT|TEXTAREA|INPUT/.test(e.target.tagName)) return;
    if (e.code === 'Space') { e.preventDefault(); toggle(); }
    if (e.key === 'ArrowRight') seekTo(Math.min(D(), t + (e.shiftKey ? g.P * 16 : g.P * 4)));
    if (e.key === 'ArrowLeft') seekTo(Math.max(0, t - (e.shiftKey ? g.P * 16 : g.P * 4)));
    if (e.key === 'i') $('mark-in').click();
    if (e.key === 'o') $('mark-out').click();
  });
  addEventListener('resize', () => { layout(); drawTimeline(); });
  new ResizeObserver(() => layout()).observe($('bottom')); // (the notes arrive from the server after the first layout and grow the panel)
  layout(); drawTimeline(); drawEditor();
  const notes = createNotes(`videoclip-notes:${clip.source}`, { bar: $('bar'), panel: $('edit'), timeline: tl, frames }, () => {
    const ts = srcT(t), s = shotAt(g, ts, labelOf);
    return { t, mix: M?.id ?? null, bar: Math.floor(g.beatAt(ts) / 4) + 1, label: s.label, shot: s.name, cut: +s.cut.toFixed(2), duration: D(), layout: frames.dataset.v,
      formats: Object.fromEntries(Object.entries(boxes).map(([k, el]) => [k, { el, name: FORMATS[k].name }])) };
  }, { pause: () => { if (playing) toggle(); }, seek: (s, mix) => { if ((mix ?? null) !== (M?.id ?? null)) pickMontage(mix ?? ''); seekTo(s); } });
  // the montage editor under the timeline (montage-edit.js): its edits change M in place
  const editor = createMontageEditor({ host: tl, clip, getM: () => M, getT: () => t, onSeek: seekTo,
    colorOf: from => `${COLORS[labelOf(g.phraseAt(from).index) ?? g.phraseAt(from).label] ?? '#888'}cc`,
    onChange: () => { t = Math.min(t, D()); drawTimeline(); notes.refresh(); if (playing) mAudio.play(M, t); } });
  if (q.get('m')) pickMontage(q.get('m'));

  const region = document.createElement('canvas'); // a frame's own picture, for the words
  function frame() {
    const now = performance.now(), dt = Math.min(.1, (now - last) / 1000); last = now;
    if (playing) {
      t = M ? mAudio.now() ?? t : audio.paused ? t + dt : audio.currentTime;
      if (M?.loop) t %= D(); // (the loop's sound runs on by itself: only the picture's clock wraps)
      else if (M && t >= D()) { t = 0; mAudio.play(M, 0); }
      audio.volume = Math.min(1, Math.max(0, (clip.duration - t) / (edit.musicFade ?? 1))) ** 2; // the song fades out before the end card, as in the export
      if (range && t >= range[1]) { t = range[0]; audio.currentTime = t; }
      if (t >= END) { t = 0; audio.currentTime = 0; }
    }
    const W = innerWidth, H = innerHeight;
    if (renderer.domElement.width !== Math.round(W * renderer.getPixelRatio()) || renderer.domElement.height !== Math.round(H * renderer.getPixelRatio())) renderer.setSize(W, H, false);
    renderer.setScissor(0, 0, W, H); renderer.setClearColor('#0b0c14'); renderer.clear();
    const ts = srcT(t), lit = poseWorld(ts); let s; // (the scene keeps moving under the end card: frozen, its blur read as a still)
    for (const [k, el] of Object.entries(boxes)) { const r = el.getBoundingClientRect(); s = draw(k, ts, r.left, r.top, r.width, r.height, lit); }
    // the words on a shout, over each frame: drawn from that frame's region of the WebGL canvas, in this same task
    const card = !M && CARD && t >= CARD_AT, shout = card ? null : textAt(g, ts, edit, labelOf), over = overlayAt(M, t), word = card || shout || over, dpr = renderer.getPixelRatio();
    for (const el of Object.values(boxes)) {
      const c = el.querySelector('.words'); c.style.display = word ? 'block' : 'none'; if (!word) continue;
      const r = el.getBoundingClientRect(), cw = Math.round(r.width * dpr), ch = Math.round(r.height * dpr);
      if (c.width !== cw || c.height !== ch) { c.width = cw; c.height = ch; }
      region.width = cw; region.height = ch; region.getContext('2d').drawImage(renderer.domElement, r.left * dpr, r.top * dpr, cw, ch, 0, 0, cw, ch);
      const cx = c.getContext('2d', { willReadFrequently: true });
      if (card) CARD.draw(cx, cw, ch, t - CARD_AT, region); // (region: the picture just copied above)
      else if (shout) STYLES[shout.style].draw(cx, cw, ch, region, shout);
      else cx.drawImage(region, 0, 0);
      if (over) drawOverlays(cx, cw, ch, M, t, region, shoutFree(ts));
    }
    head.style.left = `${t / D() * 100}%`;
    if (range) { rangeEl.style.display = 'block'; rangeEl.style.left = `${range[0] / D() * 100}%`; rangeEl.style.width = `${(range[1] - range[0]) / D() * 100}%`; } else rangeEl.style.display = 'none';
    const fmt = s => `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, '0')}`;
    $('time').textContent = `${fmt(t)} / ${fmt(D())}${M ? ` · tros ${sourceAt(M, t).i + 1}/${M.segments.length} · vídeo ${fmt(ts)}` : ''} · ${!M && t >= CARD_AT ? 'targeta final' : `compàs ${Math.floor(g.beatAt(ts) / 4) + 1} · ${lit.label}`}${s ? ` · pla ${s.name}` : ''}${range ? ` · tall ${fmt(range[0])}–${fmt(range[1])} (${(range[1] - range[0]).toFixed(1)} s)` : ''}`;
    $('info').textContent = `~${Math.round(clip.bpm)} BPM`;
    notes.tick(); editor.tick(t);
    requestAnimationFrame(frame);
  }
  frame();
}
