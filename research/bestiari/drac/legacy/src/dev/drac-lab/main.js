// The Drac lab (drac-lab.html?mute, dev only): the reference video, the current and the proposed dance on the real rig,
// one song clock (clock.js). Starts silent; ?mute keeps it silent. No game, service or network module beyond the
// static files. window.__dracLab is the validation surface.
import { buildProgrammes, OBSERVED, TRIAL_AUDIO_META, videoAt, videoRate, beatAtVideo } from './programmes.js';
import { createLabClock, videoSync } from './clock.js';
import { createLabStage } from './stage.js';
import { timeAtBeat } from '../../core/beat-grid.js';

const $ = id => document.getElementById(id);
const MUTE = new URLSearchParams(location.search).has('mute');
const VARIANTS = { joc: 'La del joc', festiu: 'Festiva (instruments del joc)', austera: 'Austera (melodia i percussió)', melodia: 'Melodia (síntesi del navegador)' };
const num = (x, d = 2) => x.toFixed(d).replace('.', ',');

const programmes = buildProgrammes();
const audioCtx = new AudioContext();
const buffers = new Map();
const fetchBuffer = url => {
  if (!buffers.has(url)) buffers.set(url, fetch(url).then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.arrayBuffer(); }).then(b => audioCtx.decodeAudioData(b)));
  const p = buffers.get(url);
  p.catch(() => buffers.delete(url));
  return p;
};
const lab = createLabClock({ audioCtx, programmes, fetchBuffer, muteLocked: MUTE });
const stage = createLabStage($('stage'));
const video = $('video');
let note = '', videoOk = true; // note: what the page says about the proposal's music when nothing else is going on

function setStatus(text, err = false) { $('status').textContent = text; $('status').classList.toggle('err', err); }
const button = (value, ...content) => { const b = document.createElement('button'); b.type = 'button'; b.dataset.value = value; b.append(...content); return b; };
const small = text => Object.assign(document.createElement('small'), { textContent: text });
function press(group, value) { for (const b of document.querySelectorAll(`[data-group="${group}"] button`)) b.setAttribute('aria-pressed', String(b.dataset.value === value)); }
function variantsFor(id) { return [...Object.keys(programmes[id].audio), 'melodia']; }

function renderVariants() {
  const box = $('variants'), id = lab.state.programme;
  box.replaceChildren(...variantsFor(id).map(v => button(v, VARIANTS[v])));
  press('variant', lab.state.variant);
}
function renderSections() {
  const p = lab.current();
  $('sections').replaceChildren(...p.sections.map(s => {
    const b = button(s.beat, s.label, small(`temps ${s.beat} · ${num(s.sec, 1)} s`));
    b.onclick = () => lab.seekBeat(s.beat);
    return b;
  }));
  $('observed').replaceChildren(...OBSERVED.map(([a, z, text]) => {
    const b = button(a, text, small(`vídeo ${a}-${z} s`));
    b.onclick = () => lab.seek(timeAtBeat(p.timeline.beats, beatAtVideo(p, a, lab.state.video, lab.state.offset)));
    return b;
  }));
  $('stage-caption').textContent = p.id === 'proposal' ? 'Proposta: un portador, la closca rígida' : 'Ball actual del joc';
}
async function choose(id, variant) {
  const v = variantsFor(id).includes(variant) ? variant : variantsFor(id)[0];
  if (programmes[id].audio[v]) setStatus('Carregant la música…');
  if (!(await lab.select(id, v))) return;
  press('programme', id); renderVariants(); renderSections();
  if (lab.state.error) setStatus(`No s’ha pogut carregar la música (${lab.state.error}). Sona la melodia del navegador.`, true);
  else setStatus(id === 'proposal' ? note : '', note.startsWith('La música generada'));
  $('seek').max = lab.state.duration;
}

// ---- the proposal's generated music, if tools/build_drac_trial.py has written it for this very form
async function loadTrialAudio() {
  try {
    const r = await fetch(TRIAL_AUDIO_META, { cache: 'no-store' });
    if (!r.ok) throw new Error('none');
    const meta = await r.json();
    if (meta.revision !== programmes.proposal.timeline.revision) { note = 'La música generada és d’una altra versió de la forma: torna a generar-la. Sona la melodia del navegador.'; return; }
    for (const [k, url] of Object.entries(meta.audio)) programmes.proposal.audio[k] = `/${url}`;
  } catch { note = 'Música de la proposta encara no generada: sona la melodia del navegador.'; }
}

// ---- controls
function wire() {
  $('play').onclick = () => (lab.playing() ? lab.pause() : lab.play()); // while loading: cancels or asks for the start
  $('seek').oninput = e => lab.seek(+e.target.value);
  document.addEventListener('keydown', e => {
    if (e.code !== 'Space' || /INPUT|BUTTON|SELECT|TEXTAREA/.test(e.target.tagName)) return;
    e.preventDefault(); $('play').click();
  });
  for (const group of document.querySelectorAll('.seg')) group.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    const v = b.dataset.value, g = group.dataset.group;
    if (g === 'programme') choose(v, v === 'proposal' ? 'austera' : 'joc');
    else if (g === 'variant') choose(lab.state.programme, v);
    else if (g === 'sound') setSound(v);
    else if (g === 'video') { lab.setVideo(v); press('video', v); }
    else if (g === 'view') press('view', stage.setView(v));
  });
  $('offset').onchange = e => lab.setVideo(lab.state.video, Number(e.target.value.replace(',', '.')) || 0);
  if (MUTE) for (const b of document.querySelectorAll('[data-group="sound"] button')) b.disabled = b.dataset.value !== 'off';
  video.addEventListener('error', () => { videoOk = false; $('video-missing').hidden = false; });
  addEventListener('resize', () => stage.resize());
}
function setSound(v) {
  press('sound', lab.setSound(v));
  video.muted = lab.state.sound !== 'video';
}

// ---- one frame: pose the rig at the transport's beat, point the video at the same moment
let shown = -1;
function frame(now) {
  const p = lab.current(), beat = lab.beat(), playing = lab.transport.playing;
  stage.render(p, beat);
  if (videoOk && video.readyState >= 1) {
    const target = videoAt(p, beat, lab.state.video, lab.state.offset), cmd = videoSync(video, target, playing, videoRate(p, beat, lab.state.video));
    if (cmd.seek !== null) video.currentTime = cmd.seek;
    if (video.playbackRate !== cmd.rate) video.playbackRate = cmd.rate;
    if (cmd.play && video.paused) video.play().catch(() => {});
    if (!cmd.play && !video.paused) video.pause();
  }
  if (now - shown > 100) { // the text a few times a second
    shown = now;
    const s = lab.snapshot();
    $('play').textContent = lab.playing() ? 'Pausa' : 'Reprodueix';
    if (document.activeElement !== $('seek')) $('seek').value = s.time;
    $('readout').textContent = `${num(s.time)} s · temps ${num(s.beat)} · ${s.label} · ${Math.round(s.bpm)} BPM · vídeo ${num(s.video)} s`;
    const chips = $('sections').children;
    let at = -1;
    for (let i = 0; i < chips.length; i++) if (+chips[i].dataset.value <= s.beat) at = i;
    for (let i = 0; i < chips.length; i++) chips[i].setAttribute('aria-current', String(i === at));
  }
  requestAnimationFrame(frame);
}

wire();
setSound('off');
press('video', 'offset'); press('view', 'frontal');
await loadTrialAudio();
await choose('proposal', 'austera');
requestAnimationFrame(frame);

window.__dracLab = {
  state: () => lab.snapshot(),
  play: () => lab.play(), pause: () => lab.pause(),
  seek: sec => lab.seek(sec), seekBeat: b => lab.seekBeat(b),
  select: (id, variant) => choose(id, variant),
  setSound, setView: v => press('view', stage.setView(v)), setVideo: (mode, offset) => lab.setVideo(mode, offset),
  pose: () => ({ ...stage.pose }),
  programmes: Object.fromEntries(Object.entries(programmes).map(([k, p]) => [k, { end: p.timeline.end, duration: p.duration, revision: p.timeline.revision ?? null, sections: p.sections, audio: p.audio }])),
};
