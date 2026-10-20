import choreography from '../../../research/bestiari/mulassa/choreography.json';
import reconstruction from '../../game/mula-reconstruction.json';
import song from '../../song.json';
import { makeMulaMotion } from '../../game/mula-path.js';
import { planSupports } from '../../game/mula-supports.js';
import { mulaDance, newMulaPose } from '../../game/mula-dance.js';
import { MULA_HELPERS } from '../../game/mula-layout.js';
import { beatAtTime } from '../../core/beat-grid.js';
import { makeDirections } from './directions.js';
import { createStage } from './stage.js';
import { createOverhead } from './overhead.js';

// Two clocks, never mixed. «Reconstrucció»: the decoded video frame drives the reconstruction (reference seconds).
// «Joc nou»: the game's new song drives the game's dance (song seconds) and the video FOLLOWS through the one time map
// (game/mula-time.js): seeked when paused, its playback rate set to the map's rate while playing, re-seeked on drift.
const el = id => document.getElementById(id), video = el('reference'), Q = new URLSearchParams(location.search);
const motion = makeMulaMotion(reconstruction), plan = planSupports(motion.pose), T = mulaDance.time;
const directions = makeDirections(motion.pose(0));
const stage = createStage(el('model'), directions), overhead = createOverhead(el('overhead'), directions);
const audio = new Audio('/' + song.audio); audio.preload = 'auto'; audio.muted = true;
const pose = {}, gamePose = newMulaPose(), feet = Array.from({ length: 8 }, () => ({})), { phases, end, fps } = choreography;
const refPath = Array.from({ length: 334 }, (_, i) => { const p = motion.pose(Math.min(end, i / 2)); return { x: p.x, z: p.z }; });
const songEnd = song.tail, gamePath = Array.from({ length: Math.ceil(songEnd * 4) + 1 }, (_, i) => { const p = mulaDance.pose(newMulaPose(), i / 4); return { x: p.x, z: p.z }; });
let active = -1, frameId = 0;
const game = () => el('mode').value === 'game';
const format = (n, d = 2) => n.toFixed(d).replace('.', ',');
const sectionAt = b => (song.arrangement.filter(([s]) => s <= b).pop() ?? song.arrangement[0])[1];
const buttons = phases.map(phase => {
  const button = document.createElement('button'); button.className = 'btn btn-secondary';
  const time = document.createElement('small'); time.textContent = `${format(phase.start)}–${format(phase.end)} s`;
  button.append(time, `${phase.i + 1}. ${phase.title}`);
  button.onclick = () => seek(game() ? T.songAtRef(phase.start + 1e-3) : phase.start); el('phases').append(button); return button;
});
function labelPhase(r) {
  const phase = phases.find(p => r >= p.start && r < p.end) || phases.at(-1);
  if (active !== phase.i) {
    active = phase.i; el('phase-title').textContent = `${phase.i + 1}. ${phase.title}`;
    el('action').textContent = phase.action; el('evidence').textContent = phase.evidence;
    buttons.forEach((b, i) => b.setAttribute('aria-current', String(i === active)));
  }
  return phase;
}
function show() {
  if (game()) {
    const s = Math.min(songEnd, Math.max(0, audio.currentTime)), r = T.refAt(s), b = beatAtTime(song.beats, s);
    follow(s, r);
    mulaDance.pose(gamePose, s);
    for (let i = 0; i < 8; i++) mulaDance.foot(s, i, feet[i]);
    stage.render(r, gamePose, feet, false);
    const phase = labelPhase(r);
    overhead(gamePose, gamePath, [Math.floor(T.songAtRef(phase.start) * 4), Math.ceil(T.songAtRef(phase.end) * 4)], MULA_HELPERS);
    el('direction').textContent = `Mira cap a ${directions.heading(gamePose.yaw)} · ${sectionAt(b)} · ritme del vídeo ×${format(T.rateAt(s))}`;
    el('time').textContent = `cançó ${format(s)} s · temps ${format(b, 1)} · vídeo ${format(r)} s (mostra ${format(video.currentTime)})`;
    el('seek').value = s;
    return;
  }
  const t = Math.min(end, Math.max(0, video.currentTime));
  motion.pose(t, pose);
  for (let i = 0; i < 8; i++) plan.foot(t, i, feet[i]);
  stage.render(t, pose, feet);
  const phase = labelPhase(t);
  overhead(pose, refPath, [Math.floor(phase.start * 2), Math.ceil(phase.end * 2)]);
  el('direction').textContent = `Mira cap a ${directions.heading(pose.yaw)} · marques fixes de guió`;
  el('time').textContent = `${format(t)} s · ${Math.round(t * fps)} f`;
  el('seek').value = t;
}
// the video under the song: where the map says, at the map's pace
function follow(s, r) {
  const rate = T.rateAt(s) * audio.playbackRate;
  if (audio.paused || rate < 0.07 || r >= end) {
    if (!video.paused) video.pause();
    if (Math.abs(video.currentTime - r) > 0.02 && !video.seeking) video.currentTime = r;
    return;
  }
  video.playbackRate = Math.min(4, Math.max(0.0625, rate));
  if (video.paused) video.play().catch(() => {});
  if (Math.abs(video.currentTime - r) > 0.25 && !video.seeking) video.currentTime = r;
}
function seek(t) {
  if (game()) { audio.currentTime = Math.max(0, Math.min(songEnd, t)); show(); return; }
  video.pause(); video.currentTime = Math.max(0, Math.min(end, t));
}
el('play').onclick = async () => {
  const media = game() ? audio : video, last = game() ? songEnd : end;
  if (!media.paused) { media.pause(); if (game()) video.pause(); return; }
  if (media.currentTime >= last) media.currentTime = 0;
  try { await media.play(); } catch (error) { fail(`No s'ha pogut reproduir: ${error.message}`); }
};
el('back').onclick = () => seek((game() ? audio : video).currentTime - 1 / (game() ? 60 : fps));
el('next').onclick = () => seek((game() ? audio : video).currentTime + 1 / (game() ? 60 : fps));
el('seek').oninput = e => seek(Number(e.target.value));
el('speed').onchange = e => { (game() ? audio : video).playbackRate = Number(e.target.value); };
el('mode').onchange = () => {
  audio.pause(); video.pause(); video.playbackRate = 1; audio.playbackRate = video.playbackRate = Number(el('speed').value);
  const g = game();
  el('seek').max = g ? songEnd : end; el('seek').step = g ? 0.01 : 0.02;
  el('model-label').textContent = g ? 'Joc nou · el ball per figures del joc sobre la cançó nova, amb els ajudants al mapa'
    : 'Model del joc · nova reconstrucció del ball';
  if (g) seek(T.songAtRef(video.currentTime)); else { video.currentTime = T.refAt(audio.currentTime); }
  syncSound(); show();
};
let sound = false;
function syncSound() { video.muted = !sound || game(); audio.muted = !sound || !game(); }
el('sound').onclick = () => {
  sound = !sound; syncSound(); el('sound').textContent = sound ? 'Silencia' : 'Activa el so';
  el('sound').setAttribute('aria-pressed', String(sound));
};
const playing = () => { el('play').textContent = (game() ? !audio.paused : !video.paused) ? 'Pausa' : 'Reprodueix'; };
for (const m of [video, audio]) { m.onplay = playing; m.onpause = playing; }
video.onseeked = () => { if (!game()) show(); };
video.onloadeddata = () => show();
function fail(message) { el('error').hidden = false; el('error').textContent = message; }
video.onerror = () => fail('No es pot carregar el vídeo. Comprova la ruta de Mulassa a .bestiari-media.json i reinicia Vite.');
audio.onerror = () => fail('No es pot carregar la música nova del joc.');
// Reconstrucció: the decoded video frame is the clock (requestVideoFrameCallback). Joc nou: the song's, every animation frame.
let videoFrame = 0;
function onVideoFrame() {
  if (!game()) { show(); if (video.currentTime >= end) video.pause(); }
  videoFrame = video.requestVideoFrameCallback ? video.requestVideoFrameCallback(onVideoFrame) : requestAnimationFrame(onVideoFrame);
}
function onFrame() {
  if (game()) { show(); if (audio.currentTime >= songEnd) audio.pause(); }
  frameId = requestAnimationFrame(onFrame);
}
if (Q.get('modo') === 'joc') { el('mode').value = 'game'; el('mode').onchange(); }
if (Q.has('t')) seek(Number(Q.get('t')));
onVideoFrame(); onFrame();
show();
window.addEventListener('pagehide', event => {
  video.pause(); audio.pause();
  if (event.persisted) return;
  cancelAnimationFrame(frameId);
  if (video.cancelVideoFrameCallback) video.cancelVideoFrameCallback(videoFrame); else cancelAnimationFrame(videoFrame);
  stage.dispose();
});
