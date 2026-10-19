import choreography from '../../../research/bestiari/mulassa/choreography.json';
import reconstruction from '../../../research/bestiari/mulassa/reconstruction.json';
import { makeMotion } from './motion.js';
import { makeDirections } from './directions.js';
import { createStage } from './stage.js';
import { createOverhead } from './overhead.js';
import { dancePose, newPose } from '../../game/dance.js';
import song from '../../song.json';

const el = id => document.getElementById(id), video = el('reference');
const motion = makeMotion(reconstruction), directions = makeDirections(motion.pose(0));
const stage = createStage(el('model'), motion, directions), overhead = createOverhead(el('overhead'), motion, directions);
const pose = {}, { phases, end, fps } = choreography;
const baseline = { pose: newPose(), beat: 0 };
let frameId = 0, active = -1;
const format = n => n.toFixed(2).replace('.', ',');
const buttons = phases.map(phase => {
  const button = document.createElement('button'); button.className = 'btn btn-secondary';
  const time = document.createElement('small'); time.textContent = `${format(phase.start)}–${format(phase.end)} s`;
  button.append(time, `${phase.i + 1}. ${phase.title}`);
  button.onclick = () => seek(phase.start); el('phases').append(button); return button;
});
function show(t) {
  t = Math.min(end, Math.max(0, t));
  const phase = phases.find(p => t >= p.start && t < p.end) || phases.at(-1);
  const current = el('mode').value === 'current';
  motion.pose(t, pose);
  if (current) {
    let i = 0;
    while (i < song.beats.length - 2 && song.beats[i + 1] < t) i++;
    baseline.beat = Math.min(song.beats.length - 1, i + Math.max(0, (t - song.beats[i]) / (song.beats[i + 1] - song.beats[i])));
    dancePose(baseline.pose, baseline.beat);
    pose.yaw = baseline.pose.yaw - 65 * Math.PI / 180;
    const c = Math.cos(pose.yaw), s = Math.sin(pose.yaw);
    pose.x = baseline.pose.x * c + baseline.pose.z * s; pose.z = -baseline.pose.x * s + baseline.pose.z * c;
    pose.lift = baseline.pose.lift;
  }
  stage.render(t, pose, current ? baseline : null); overhead(t, pose, phase, !current);
  el('direction').textContent = `Mira cap a ${directions.heading(pose.yaw)} · marques fixes de guió`;
  el('time').textContent = `${format(t)} s · ${Math.round(t * fps)} f`;
  el('seek').value = t;
  if (active !== phase.i) {
    active = phase.i; el('phase-title').textContent = `${phase.i + 1}. ${phase.title}`;
    el('action').textContent = phase.action; el('evidence').textContent = phase.evidence;
    buttons.forEach((b, i) => b.setAttribute('aria-current', String(i === active)));
  }
}
function seek(t) { video.pause(); video.currentTime = Math.max(0, Math.min(end, t)); }
el('play').onclick = async () => {
  if (!video.paused) return video.pause();
  if (video.currentTime >= end) video.currentTime = 0;
  try { await video.play(); } catch (error) { fail(`No s'ha pogut reproduir: ${error.message}`); }
};
el('back').onclick = () => seek(video.currentTime - 1 / fps);
el('next').onclick = () => seek(video.currentTime + 1 / fps);
el('seek').oninput = e => seek(Number(e.target.value));
el('speed').onchange = e => { video.playbackRate = Number(e.target.value); };
el('mode').onchange = () => {
  el('model-label').textContent = el('mode').value === 'current'
    ? `Ball actual · temps original, sense alinear frases (acaba als ${format(song.end)} s)`
    : 'Model del joc · nova reconstrucció del ball';
  show(video.currentTime);
};
el('sound').onclick = () => {
  video.muted = !video.muted; el('sound').textContent = video.muted ? 'Activa el so' : 'Silencia';
  el('sound').setAttribute('aria-pressed', String(!video.muted));
};
video.onplay = () => { el('play').textContent = 'Pausa'; };
video.onpause = () => { el('play').textContent = 'Reprodueix'; };
video.onseeked = () => show(video.currentTime);
video.onloadeddata = () => show(video.currentTime);
function fail(message) { el('error').hidden = false; el('error').textContent = message; }
video.onerror = () => fail('No es pot carregar el vídeo. Comprova la ruta de Mulassa a .bestiari-media.json i reinicia Vite.');
// The decoded video frame is the only clock. Pausing, seeking and slow motion move all three views together.
function frame(_now, meta) {
  const t = meta?.mediaTime ?? video.currentTime; show(t);
  if (t >= end) video.pause();
  frameId = video.requestVideoFrameCallback ? video.requestVideoFrameCallback(frame) : requestAnimationFrame(frame);
}
frameId = video.requestVideoFrameCallback ? video.requestVideoFrameCallback(frame) : requestAnimationFrame(frame);
show(0);
window.addEventListener('pagehide', event => {
  video.pause();
  if (event.persisted) return;
  if (video.cancelVideoFrameCallback) video.cancelVideoFrameCallback(frameId); else cancelAnimationFrame(frameId);
  stage.dispose();
});
