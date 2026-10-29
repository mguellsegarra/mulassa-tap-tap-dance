// The dev music editor (editor.html?song=…): the owner's phrases on the original, the sequence in use, tempo and events,
// a 3D preview, «Desa» and «Genera» through tools/music/music-editor/vite-plugin.mjs. Dev only: no game module imports this.
import { SONGS } from '../../../src/music-form/songs.js';
import { createTransport } from './preview/transport.js';
import { createStage } from './preview/stage.js';
import { S, hooks, load, dirty, edit, setHistory, selIds } from './state.js';
import { undo, redo, removeItem, removePhrase, duplicateItem, moveItem, removeKnot, removeEvent, insertItem } from './edits.js';
import { GUTTER, drawOriginal, drawSequence, drawTempo, drawEvents, secOfBeat, beatOfSec, itemBlocks } from './tracks.js';
import { setupPointer } from './pointer.js';
import { setupPanel, renderPanel, newPhrase } from './panel.js';

const $ = id => document.getElementById(id);
const params = new URLSearchParams(location.search);
const song = Object.hasOwn(SONGS, params.get('song')) ? params.get('song') : Object.keys(SONGS)[0];
const canvases = { orig: $('orig'), seq: $('seq'), tempo: $('tempo'), events: $('events') };
const panel = $('panel');

// ---- audio: one context; ?mute routes everything into a silent gain (the clock still runs)
const ctx = new AudioContext();
const out = params.has('mute') ? (() => { const g = ctx.createGain(); g.gain.value = 0; g.connect(ctx.destination); return g; })() : null;
const audioCtx = out ? new Proxy(ctx, { get: (t, k) => k === 'destination' ? out : typeof t[k] === 'function' ? t[k].bind(t) : t[k] }) : ctx;
const transport = createTransport(audioCtx);
const stage = createStage($('stage'), song);

// ---- status line
let statusTimer = 0;
hooks.status = (text, kind = '') => {
  const el = $('status');
  el.textContent = text; el.className = kind;
  clearTimeout(statusTimer);
  if (kind !== 'err') statusTimer = setTimeout(() => { el.textContent = ''; }, 4000);
};

// ---- the timeline changed: transport, stage, panel, canvases
let drop = null;
const playing = () => (S.track === 'orig' ? S.orig : S.tl); // the timeline the transport and the stage follow
function reloadTransport() {
  const t = transport.time(), was = transport.playing;
  const generated = S.track === 'seq' && S.source === 'audio' && fresh();
  try { transport.load(playing(), generated ? S.gen.buffer : null); } catch { return; } // a tempo that does not compile: the red list says why
  transport.seek(Math.max(0, t));
  applyLoop();
  if (was) transport.play();
}
hooks.changed = () => { stage.setTimeline(playing()); reloadTransport(); refresh(); };
// switch what plays; `beat` = where to start on the new track (else the same moment of the music, mapped)
function useTrack(track, beat) {
  if (S.track === track) return;
  const was = transport.playing, b = beatNow();
  const at = beat ?? (track === 'orig' ? originalBeat(b) : sequenceBeat(b));
  transport.pause(); S.track = track; S.loop = false;
  stage.setTimeline(playing()); reloadTransport();
  transport.seek(Math.max(0, secOfBeat(playing(), Math.max(0, at ?? 0))));
  if (was) transport.play();
  refresh();
}

// the generated mp3 matches only the form it was made from: any edit falls back to the synth until «Genera»
const fresh = () => S.gen && !dirty() && S.gen.revision === S.revision;
const beatNow = () => (S.tl ? beatOfSec(playing(), transport.time()) : 0);
// the original's beat that is sounding: the same unfolded bar, at the same fraction of it
function originalBeat(b) {
  if (b < (S.tl.occurrences[0]?.start ?? 0)) return b - S.off; // the game's intro: the shifted original's empty lead
  const o = S.tl.occurrences.find(o => o.start <= b && b < o.start + o.dur);
  const src = o && S.orig.occurrences.find(x => x.unfolded === o.unfolded);
  return src ? src.start + (b - o.start) * src.dur / o.dur : null;
}
// and back: the first time the sequence plays that original bar
function sequenceBeat(ob) {
  const src = S.orig.occurrences.find(o => o.start <= ob && ob < o.start + o.dur);
  const o = src && S.tl.occurrences.find(x => x.unfolded === src.unfolded);
  return o ? o.start + (ob - src.start) * o.dur / src.dur : null;
}
function redraw() {
  if (!S.tl) return;
  const b = beatNow(), orig = S.track === 'orig';
  const sb = orig ? sequenceBeat(b) : b;
  drawOriginal(canvases.orig, S, orig ? b : originalBeat(b));
  drawSequence(canvases.seq, S, sb, drop);
  drawTempo(canvases.tempo, S, sb);
  drawEvents(canvases.events, S, sb);
  const label = orig ? S.orig.occurrences.findLast(o => o.start <= b)?.label ?? '' : S.tl.arrangement.findLast(([at]) => at <= b)?.[1] ?? '';
  const t = transport.time();
  $('play').textContent = transport.playing ? '⏸' : '⏵';
  $('readout').textContent = `${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, '0')} · temps ${b.toFixed(1)} · ${label}`;
}
function refresh() {
  renderPanel(panel);
  redraw();
  $('dirty').hidden = !dirty();
  $('undo').disabled = !S.h.past.length;
  $('redo').disabled = !S.h.future.length;
  $('loop').setAttribute('aria-pressed', S.loop);
  $('track-seq').setAttribute('aria-pressed', !S.track || S.track === 'seq');
  $('track-orig').setAttribute('aria-pressed', S.track === 'orig');
  $('source').textContent = S.track === 'orig' ? 'so: síntesi (original)' : S.source !== 'audio' ? 'so: síntesi' : fresh() ? 'so: àudio del joc' : 'so: síntesi (canvis sense generar)';
  $('source').disabled = !S.gen;
  $('generate').disabled = S.generating;
  $('generate').textContent = S.generating ? 'Generant…' : 'Genera';
  document.title = `${dirty() ? '● ' : ''}Editor musical · ${song}`;
}

// ---- transport
const seekBeat = b => { if (S.track !== 'seq') return useTrack('seq', b); transport.seek(Math.max(0, secOfBeat(S.tl, Math.max(0, b)))); redraw(); };
// the original's ruler plays the original itself from there
function seekOriginal(ob) {
  if (S.track !== 'orig') return useTrack('orig', ob);
  transport.seek(Math.max(0, secOfBeat(S.orig, Math.max(0, ob)))); redraw();
}
function selectionSpan() {
  if (S.track === 'orig') { // the selected bars or phrase on the original
    const o = S.orig.occurrences, r = S.range ? [Math.min(...S.range), Math.max(...S.range)]
      : S.sel?.kind === 'phrase' ? (ids => [o.findIndex(x => ids.includes(x.unfolded)), o.findLastIndex(x => ids.includes(x.unfolded))])(S.form.phrases.find(p => p.id === S.sel.id)?.bars ?? []) : null;
    return r && r[0] >= 0 ? [o[r[0]].start, o[r[1]].start + o[r[1]].dur] : null;
  }
  if (S.sel?.kind !== 'item') return null;
  const b = itemBlocks(S).find(b => b.item.id === S.sel.id);
  return b?.s != null ? [b.s, b.e] : null;
}
function applyLoop() {
  const span = S.loop && selectionSpan();
  try { transport.setLoop(span ? secOfBeat(playing(), span[0]) : 0, span ? secOfBeat(playing(), span[1]) : null); } catch { /* no timeline loaded */ }
}
async function playPause() {
  if (transport.playing) transport.pause(); else await transport.play();
  refresh();
}
function stop() { transport.pause(); transport.seek(0); refresh(); }
function toggleLoop() {
  if (!S.loop && !selectionSpan()) return hooks.status(S.track === 'orig' ? 'Selecciona compassos o una frase de l’original per repetir-los' : 'Selecciona un element de la seqüència per repetir-lo');
  S.loop = !S.loop; applyLoop(); refresh();
}
function toggleSource() {
  if (S.track === 'orig') return hooks.status('L’original només sona amb la síntesi');
  if (!S.gen) return hooks.status('Encara no hi ha àudio generat: fes «Genera»');
  S.source = S.source === 'audio' ? 'synth' : 'audio'; reloadTransport(); refresh();
}

// ---- selection actions shared by keys and the panel
function remove() {
  const sel = S.sel;
  if (!sel) return;
  if (sel.kind === 'phrase') { // only the phrases nothing plays: one undo step for all of them
    const ids = selIds('phrase'), free = ids.filter(id => !S.form.sequence.some(s => s.phrase === id));
    if (!free.length) return hooks.status('Aquestes frases sonen a la seqüència: treu-les’n primer');
    if (edit(form => free.reduce(removePhrase, form))) { S.sel = null; hooks.status(`${free.length} frases esborrades${free.length < ids.length ? `, ${ids.length - free.length} sonen i es queden` : ''}`); refresh(); }
    return;
  }
  const ok = sel.kind === 'item' ? edit(form => selIds('item').reduce(removeItem, form))
    : sel.kind === 'knot' ? edit(removeKnot, sel.i)
      : sel.kind === 'balloon' ? edit(removeEvent, 'balloons', sel.i)
        : sel.kind === 'hold' ? edit(removeEvent, 'holds', sel.i) : false;
  if (ok) { S.sel = null; refresh(); }
}
function duplicate() {
  if (S.sel?.kind !== 'item') return;
  const i = S.form.sequence.findIndex(s => s.id === S.sel.id);
  if (edit(duplicateItem, S.sel.id)) { S.sel = { kind: 'item', id: S.form.sequence[i + 1].id }; refresh(); }
}
function nudge(d) {
  if (S.sel?.kind !== 'item') return;
  const i = S.form.sequence.findIndex(s => s.id === S.sel.id);
  if (i + d >= 0 && i + d < S.form.sequence.length) edit(moveItem, S.sel.id, i + d);
}
// copy / paste: a phrase (or the original's selected bars, made a phrase) or a sequence element, pasted after the
// selected element (or at the end)
let clip = null; // [item copies or { phrase }], in sequence / list order
function copy() {
  const items = selIds('item'), phrases = selIds('phrase');
  if (items.length) clip = S.form.sequence.filter(s => items.includes(s.id)).map(s => structuredClone(s));
  else if (phrases.length) clip = S.form.phrases.filter(p => phrases.includes(p.id)).map(p => ({ phrase: p.id }));
  else if (S.range && newPhrase()) { clip = [{ phrase: S.sel.id }]; refresh(); }
  else return hooks.status('Selecciona una frase, uns compassos o un element per copiar-lo');
  hooks.status(clip.length > 1 ? `Copiats ${clip.length}` : `Copiat: ${S.form.phrases.find(p => p.id === clip[0].phrase)?.name ?? clip[0].phrase}`);
}
function paste() {
  if (!clip) return hooks.status('No hi ha res copiat');
  const items = selIds('item'), last = Math.max(-1, ...items.map(id => S.form.sequence.findIndex(s => s.id === id)));
  const at = last >= 0 ? last + 1 : S.form.sequence.length;
  const ok = edit(form => clip.reduce((f, c, k) => {
    const i = at + k, label = c.label ?? f.sequence.find(s => s.phrase === c.phrase)?.label;
    const g = insertItem(f, c.phrase, i, label);
    if (c.id) g.sequence[i] = { ...structuredClone(c), id: g.sequence[i].id };
    return g;
  }, form));
  if (ok) { const ids = S.form.sequence.slice(at, at + clip.length).map(s => s.id); S.sel = { kind: 'item', id: ids[0], ids }; refresh(); }
}
// ⌘A: every phrase when phrases are selected, else every element of the sequence
function selectAll() {
  const kind = S.sel?.kind === 'phrase' ? 'phrase' : 'item', list = kind === 'phrase' ? S.form.phrases : S.form.sequence;
  if (list.length) { S.sel = { kind, id: list[0].id, ids: list.map(x => x.id) }; refresh(); }
}
const doUndo = () => { if (S.h.past.length) setHistory(undo(S.h)); };
const doRedo = () => { if (S.h.future.length) setHistory(redo(S.h)); };

// ---- backend
const api = (method, path, body) => fetch(`/__music/${path}?song=${encodeURIComponent(song)}`, {
  method, headers: body ? { 'Content-Type': 'application/json' } : {}, body: body && JSON.stringify(body),
}).then(async r => ({ status: r.status, data: await r.json().catch(() => ({})) }));

async function fetchForm() {
  const { status, data } = await api('GET', 'form');
  if (status !== 200) throw new Error(data.error ?? `HTTP ${status}`);
  return data;
}
async function save(force = false) {
  if (!dirty() && !force) return true;
  let base = S.revision;
  if (force) base = (await fetchForm()).revision; // «Desa igualment»: write over what changed on disk
  const form = S.form;
  const { status, data } = await api('PUT', 'form', { form, baseRevision: base });
  if (status === 409) { $('conflict').hidden = false; hooks.status(data.error === 'el fitxer ha canviat' ? 'El fitxer ha canviat al disc' : data.error, 'err'); return false; }
  if (status !== 200) { hooks.status(`No s’ha pogut desar: ${data.error ?? status}`, 'err'); return false; }
  Object.assign(S, { saved: form, revision: data.revision });
  $('conflict').hidden = true;
  hooks.status('Desat'); refresh();
  return true;
}
async function generate() {
  if (S.generating) return;
  if (S.tl.unresolved?.length) return hooks.status('Arregla la llista vermella abans de generar', 'err');
  if (!(await save())) return;
  S.generating = true; $('log').textContent = 'Generant…'; refresh();
  try {
    const { status, data } = await api('POST', 'generate');
    $('log').textContent = data.log ?? data.error ?? '';
    $('errors').innerHTML = '';
    for (const e of data.errors ?? (data.error ? [data.error] : [])) $('errors').append(Object.assign(document.createElement('li'), { textContent: e }));
    if (status !== 200) return hooks.status(`No s’ha pogut generar: ${data.error ?? status}`, 'err');
    // a slow answer for a form that has changed since is not this one's audio
    if (data.revision !== S.revision || dirty()) return hooks.status('Generació d’una versió anterior: no en carrego l’àudio', 'err');
    if (!data.audioUrl) return hooks.status('La generació ha fallat', 'err');
    const buffer = await ctx.decodeAudioData(await (await fetch(data.audioUrl)).arrayBuffer());
    if (data.revision !== S.revision || dirty()) return;
    S.gen = { buffer, revision: data.revision }; S.source = 'audio';
    reloadTransport();
    hooks.status(data.ok ? 'Generat: sona l’àudio nou' : 'Generat, però hi ha comprovacions que fallen', data.ok ? '' : 'err');
  } catch (e) {
    hooks.status(`No s’ha pogut generar: ${e.message}`, 'err');
  } finally {
    S.generating = false; refresh();
  }
}

// ---- keyboard
const typing = e => e.target.closest?.('input, select, textarea');
addEventListener('keydown', e => {
  const mod = e.metaKey || e.ctrlKey, k = e.key.toLowerCase();
  if (mod && k === 'z') { e.preventDefault(); if (e.shiftKey) doRedo(); else doUndo(); return; }
  if (mod && k === 'y') { e.preventDefault(); doRedo(); return; }
  if (mod && k === 's') { e.preventDefault(); save(); return; }
  if (mod && e.key === 'Enter') { e.preventDefault(); generate(); return; }
  if (typing(e)) return;
  if (mod && k === 'd') { e.preventDefault(); duplicate(); return; }
  if (mod && k === 'c') { e.preventDefault(); copy(); return; }
  if (mod && k === 'a') { e.preventDefault(); selectAll(); return; }
  if (mod && k === 'v') { e.preventDefault(); paste(); return; }
  if (mod) return;
  if (e.key === ' ') { e.preventDefault(); playPause(); }
  else if (e.key === 'Home') stop();
  else if (k === 'l') toggleLoop();
  else if (k === 'm') toggleSource();
  else if (k === 'o') useTrack(S.track === 'orig' ? 'seq' : 'orig');
  else if (k === 'n') { if (newPhrase()) refresh(); }
  else if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); remove(); }
  else if (e.altKey && e.key === 'ArrowLeft') nudge(-1);
  else if (e.altKey && e.key === 'ArrowRight') nudge(1);
  else if (e.key === 'Escape') { S.sel = null; S.range = null; refresh(); }
  else if (e.key === '+' || e.key === '=') zoom(1.25);
  else if (e.key === '-') zoom(0.8);
});
function zoom(f) { S.view.s.ppb = Math.max(1, Math.min(160, S.view.s.ppb * f)); redraw(); }
function fitViews() {
  const w = canvases.seq.clientWidth - GUTTER - 12;
  const end = Math.max(S.tl.end ?? 0, S.orig.end + S.off, 1); // both lanes fit: the longer one decides
  S.view.s = { x0: 0, ppb: Math.max(1, w / end) };
}

// ---- wiring
const ghost = $('ghost');
setupPointer(canvases, {
  refresh, redraw, seekBeat, seekOriginal,
  setDrop: b => { drop = b; redraw(); },
  ghost: (text, e) => { ghost.hidden = !text; if (text) { ghost.textContent = text; ghost.style.transform = `translate(${e.clientX + 12}px, ${e.clientY + 8}px)`; } },
});
setupPanel(panel, { refresh, remove, duplicate });
$('undo').onclick = doUndo;
$('redo').onclick = doRedo;
$('save').onclick = () => save();
$('force').onclick = () => save(true);
$('reload').onclick = async () => { const d = await fetchForm(); load(d.form, d.score, d.revision); $('conflict').hidden = true; loadGameAudio(); };
$('generate').onclick = generate;
$('play').onclick = playPause;
$('stop').onclick = stop;
$('track-seq').onclick = () => useTrack('seq');
$('track-orig').onclick = () => useTrack('orig');
$('loop').onclick = toggleLoop;
$('source').onclick = toggleSource;
$('fit').onclick = () => { fitViews(); redraw(); };
const switcher = $('song');
switcher.innerHTML = Object.keys(SONGS).map(id => `<option${id === song ? ' selected' : ''}>${id}</option>`).join('');
switcher.onchange = () => {
  if (dirty() && !confirm('Hi ha canvis sense desar. Canvio de cançó igualment?')) { switcher.value = song; return; }
  params.set('song', switcher.value); location.search = params;
};
addEventListener('beforeunload', e => { if (S.h && dirty()) e.preventDefault(); });
addEventListener('resize', () => { stage.resize(); redraw(); });

// the mp3 the game plays now (src/song*.json), made from the form on disk: what the owner hears until they edit it
async function loadGameAudio() {
  const rev = S.revision;
  try {
    const game = await (await fetch(`/src/${SONGS[song].game}`)).json();
    const buffer = await ctx.decodeAudioData(await (await fetch(`/${game.audio}`)).arrayBuffer());
    if (S.revision !== rev || S.gen) return;
    S.gen = { buffer, revision: rev }; S.source = 'audio';
    reloadTransport(); refresh();
  } catch (e) {
    hooks.status(`No he pogut carregar l’àudio del joc (${e.message}): sona la síntesi`);
  }
}

let wasPlaying = false;
function frame() {
  if (S.tl) {
    stage.render(beatNow());
    if (transport.playing || wasPlaying) redraw();
    wasPlaying = transport.playing;
  }
  requestAnimationFrame(frame);
}

try {
  const d = await fetchForm();
  load(d.form, d.score, d.revision);
  fitViews(); stage.resize(); refresh();
  requestAnimationFrame(frame);
  loadGameAudio();
} catch (e) {
  hooks.status(`No s’ha pogut carregar ${song}: ${e.message}`, 'err');
}
