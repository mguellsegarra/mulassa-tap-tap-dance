// The Bou's dance on a timeline, as in a video editor (the owner's tool to retime it on the music): the 3D view, the
// lanes (timeline.js), an inspector for the selected keys and notes pinned to a moment. Every change applies at once
// (bou-dance.js setBouDanceEdits) and is saved to src/figures/bou/bou-dance-edits.json (plugin.mjs), which the game
// reads; the notes go to tools/dev/bou-timeline/notes.json for the agent.
import { createStage } from './stage.js';
import { createTimeline, CARRY_NAMES } from './timeline.js';
import { BOU_TIMING as T, BOU_PHASES, bouPose, newBouPose, bouDanceKeys, setBouDanceEdits, createBouDance } from '../../../src/figures/bou/bou-dance.js';
import { beatAtTime, timeAtBeat } from '../../../src/core/beat-grid.js';
import song from '../../../src/song-bou.json' with { type: 'json' };
import { audioClock } from '../../../src/platform/audio-clock.js';
import { store } from '../../../src/platform/storage.js';
import { Q } from '../../../src/core/flags.js';

const $ = s => document.querySelector(s), esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
// The music on the game's own clock (platform/audio.js Chip.now): a Web Audio buffer, the de-stepped audio clock minus
// the output latency = the song second being heard; while it plays the dance is drawn that minus this device's
// calibration (the game's «offset», game/state.js offsetMs), as main.js draws it. An <audio> element's currentTime
// knows nothing of the speakers' delay. Its speeds below 1× lower the pitch too (the same buffer, slower).
const ac = new AudioContext(), clk = audioClock(ac), gain = ac.createGain(); gain.connect(ac.destination); if (Q.has('mute')) gain.gain.value = 0;
const OFFSET = (+(Q.get('offset') ?? store.get('offset')) || 0) / 1000;
const audio = { buffer: null, src: null, at: 0, t0: 0, rate: 1, paused: true,
  get heard() { return this.at + (clk.at() - this.t0 - clk.latency()) * this.rate; },
  // the song second drawn: paused, where it was left (or sought)
  get currentTime() { return this.paused ? this.at : Math.min(T.duration, Math.max(0, this.heard - OFFSET)); },
  set currentTime(t) { const run = !this.paused; if (run) this.stop(); this.at = t; if (run) this.play(); },
  play() {
    if (!this.buffer || !this.paused) return; ac.resume();
    const s = this.src = ac.createBufferSource(); s.buffer = this.buffer; s.playbackRate.value = this.rate; s.connect(gain);
    s.onended = () => { if (this.src === s) this.pause(); };
    clk.run(); this.t0 = ac.currentTime; this.at = Math.max(0, this.at + OFFSET); s.start(this.t0, this.at); this.paused = false; onPlay();
  },
  stop() { this.at = this.currentTime; this.src.onended = null; this.src.stop(); this.src = null; this.paused = true; },
  pause() { if (!this.paused) { this.stop(); onPlay(); } },
  setRate(r) { const run = !this.paused; if (run) this.stop(); this.rate = r; if (run) this.play(); },
};
const onPlay = () => { $('#play').textContent = audio.paused ? '▶' : '❚❚'; };
const beatAt = t => beatAtTime(T.subdivisionTimes, t) / T.subdivision, timeAt = b => timeAtBeat(T.subdivisionTimes, b * T.subdivision);
const TOTAL = beatAt(T.duration);
const BARS = [{ beat: 0, n: 0, label: 'entrada' }, ...T.bars.map(b => ({ beat: b.beat, n: b.sourceBar, label: `c.${b.sourceBar}` }))];
const PHASES = BOU_PHASES.map(([t, name]) => ({ beat: beatAt(t), name }));
const round = (v, k = 3) => Math.round(v * 10 ** k) / 10 ** k;
// «c.20 · temps 2½»: a beat as the dance's code writes it (source bar, beats into it)
function barOf(b) {
  const bar = BARS.findLast(x => x.beat <= b + 1e-6) ?? BARS[0], k = round(b - bar.beat + 1, 2);
  return `${bar.n ? 'c.' + bar.n : 'entrada'} · temps ${k}`;
}
const clock = t => `${Math.floor(t / 60)}:${(t % 60).toFixed(2).padStart(5, '0')}`;

// ---- the edits: { keys: { id: { shift, ...values } } }, undo / redo, saved to the dev server
let edits = { keys: {} }, undo = [], redo = [], saveTimer = 0, keys = bouDanceKeys(), editErr = '';
const status = $('#status');
function apply() { setBouDanceEdits(edits); keys = bouDanceKeys(); }
const all = () => [...keys.path, ...keys.gestures, ...keys.comic, ...keys.skids, ...keys.carry];
const find = id => all().find(k => k.id === id);
const beatOf = id => { const k = find(id); return k?.beat ?? k?.start; };
const edited = () => new Set(Object.keys(edits.keys));
function setField(id, f, v) {
  const e = edits.keys[id] ??= {};
  if (v == null || (f === 'shift' && Math.abs(v) < 1e-6)) delete e[f]; else e[f] = v;
  if (!Object.keys(e).length) delete edits.keys[id];
}
function commit(before) { undo.push(before); redo = []; apply(); rebuild(); save(); }
const snap0 = () => JSON.stringify(edits);
function save() {
  clearTimeout(saveTimer); status.textContent = 'Desant…'; status.className = '';
  saveTimer = setTimeout(async () => {
    try { const r = await fetch('/__bou-timeline/edits', { method: 'POST', headers: { 'content-type': 'application/json', 'x-bou-timeline': '1' }, body: JSON.stringify(edits) });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error ?? r.status);
      status.textContent = `Desat ✓ · ${Object.keys(edits.keys).length} canvis`; status.className = 'ok';
    } catch (e) { status.textContent = `No s'ha desat: ${e.message}`; status.className = 'err'; }
  }, 350);
}
function history(from, to) { if (!from.length) return; to.push(snap0()); edits = JSON.parse(from.pop()); apply(); rebuild(); save(); inspect(); }

// ---- what the lanes show, recomputed after each change (the curves and the feet's plan are the whole dance's)
let curves = null, feetSpans = null, peaks = null, peakRate = 200;
function rebuild() {
  editErr = '';
  try { stage.rebuild(); } catch (e) { editErr = `Els peus no troben on trepitjar amb aquest canvi (${e.message}). Desfés-lo o mou-lo una mica.`; }
  const rate = 8, n = Math.ceil(TOTAL * rate) + 1, turn = new Float32Array(n), speed = new Float32Array(n), lift = new Float32Array(n), dip = new Float32Array(n);
  const p = newBouPose(), q = newBouPose(); let mt = 0, ms = 0, ml = 0, md = 0;
  for (let i = 0; i < n; i++) { // rad and m per second, between this eighth of a beat and the next
    const t0 = timeAt(i / rate), t1 = timeAt((i + 1) / rate), dt = Math.max(1e-3, t1 - t0); bouPose(t0, p); bouPose(t1, q);
    turn[i] = Math.abs(q.yaw - p.yaw) / dt; speed[i] = Math.hypot(q.x - p.x, q.z - p.z) / dt; lift[i] = Math.max(0, p.lift); dip[i] = Math.max(0, -p.lift);
    mt = Math.max(mt, turn[i]); ms = Math.max(ms, speed[i]); ml = Math.max(ml, lift[i]); md = Math.max(md, dip[i]);
  }
  for (const [a, m] of [[turn, mt], [speed, ms], [lift, ml], [dip, md]]) { for (let i = 0; i < n; i++) a[i] /= m || 1; a.rate = rate; }
  curves = { turn, speed, lift, dip };
  // each foot's time in the air, in beats
  const dance = (() => { try { return createBouDance(); } catch { return null; } })();
  if (dance) {
    feetSpans = [[], [], [], []]; const f = {}, up = [null, null, null, null];
    for (let t = 0; t <= T.duration; t += 1 / 120) for (let i = 0; i < 4; i++) {
      const air = !dance.foot(t, i, f).contact;
      if (air && up[i] == null) up[i] = beatAt(t); else if (!air && up[i] != null) { feetSpans[i].push([up[i], beatAt(t)]); up[i] = null; }
    }
  }
  tl?.draw(); inspect();
}
// the waveform's peaks (200 a second) and its loudest hits (beats), decoded once
async function loadWave() {
  const data = audio.buffer = await ac.decodeAudioData(await (await fetch('/' + song.audio)).arrayBuffer()); // (the game's file)
  const ch = data.getChannelData(0), per = Math.floor(data.sampleRate / peakRate), out = new Float32Array(Math.ceil(ch.length / per));
  for (let i = 0; i < out.length; i++) { let v = 0; for (let j = i * per, e = Math.min(ch.length, j + per); j < e; j++) v = Math.max(v, Math.abs(ch[j])); out[i] = v; }
  let m = 0; for (const v of out) m = Math.max(m, v); for (let i = 0; i < out.length; i++) out[i] /= m || 1;
  peaks = out; tl.draw();
}

// ---- selection, dragging, scaling
const selected = new Set();
let loop = null, loopOn = false;
const snapStep = () => +$('#snap').value;
const snap = b => { const s = snapStep(); return s ? Math.round(b / s) * s : round(b, 3); };
// a key's track, the neighbours a retime may not cross (path, comic and the lift's steps keep their order)
const TRACKS = () => ({ path: keys.path, comic: keys.comic, carry: keys.carry });
function limits(ids, ks) { // the shift every selected key can take without passing an unselected neighbour
  let lo = -Infinity, hi = Infinity;
  for (const [name, list] of Object.entries(ks)) {
    const gap = name === 'carry' ? 0 : .05, sorted = [...list].sort((a, b) => a.beat - b.beat);
    sorted.forEach((k, i) => { if (!ids.has(k.id)) return;
      let j = i - 1; while (j >= 0 && ids.has(sorted[j].id)) j--; if (j >= 0) lo = Math.max(lo, sorted[j].beat + gap - k.beat);
      j = i + 1; while (j < sorted.length && ids.has(sorted[j].id)) j++; if (j < sorted.length) hi = Math.min(hi, sorted[j].beat - gap - k.beat); });
  }
  return [lo, hi];
}
const api = {
  model: () => ({ total: TOTAL, bars: BARS, phases: PHASES, beat: beatAt(audio.currentTime), keys, selected, edited: edited(), curves, feet: feetSpans,
    peaks, peakRate, duration: T.duration, timeAt, loop: loopOn ? loop : null, notes, clock: clock(audio.currentTime) }),
  seek(b) { audio.currentTime = Math.min(T.duration, Math.max(0, timeAt(b))); },
  snap, beatOf,
  select(id, add) { if (!add) selected.clear(); if (id) { if (add && selected.has(id)) selected.delete(id); else selected.add(id); } inspect(); tl.draw(); },
  selectMany(ids, add) { if (!add) selected.clear(); ids.forEach(i => selected.add(i)); inspect(); tl.draw(); },
  dragStart(id) { // the keys as they were: the drag moves them all by the same beats
    const ks = TRACKS(), ids = new Set(selected); return { id, before: snap0(), shifts: Object.fromEntries([...ids].map(i => [i, edits.keys[i]?.shift ?? 0])),
      len: edits.keys[id]?.len ?? find(id)?.len, beat: beatOf(id), start: find(id)?.start, lim: limits(ids, ks) };
  },
  dragTo(s, d, free, part) {
    if (part === 'len') { const end = free ? s.start + s.len + d : snap(s.start + s.len + d); setField(s.id, 'len', round(Math.max(.25, end - s.start), 3)); }
    else {
      let delta = (free ? round(s.beat + d, 3) : snap(s.beat + d)) - s.beat; delta = Math.min(s.lim[1], Math.max(s.lim[0], delta));
      for (const [id, sh] of Object.entries(s.shifts)) setField(id, 'shift', round(sh + delta, 4));
      if (audio.paused) audio.currentTime = timeAt(s.beat + delta); // (skimming: the 3D view shows the key's moment)
    }
    apply(); dragging = s; inspect(); tl.draw();
  },
  dragEnd() { if (dragging) { const b = dragging.before; dragging = null; commit(b); } },
  setLoop(l) { loop = l; loopOn = !!l; $('#loop').classList.toggle('on', loopOn); tl.draw(); },
  openNote(id) { const n = notes.find(x => x.id === id); if (n) { audio.pause(); audio.currentTime = n.t; showNote(n); } },
};
let dragging = null;
function shiftSelection(delta) {
  const before = snap0(), [lo, hi] = limits(selected, TRACKS()), d = Math.min(hi, Math.max(lo, delta));
  for (const id of selected) if (!id.startsWith('lap')) setField(id, 'shift', round((edits.keys[id]?.shift ?? 0) + d, 4));
  commit(before);
}
// the selected keys' spacing ×f round the first: f < 1 makes that stretch faster
function scaleSelection(f) {
  const ks = [...selected].map(find).filter(Boolean); if (ks.length < 2) return;
  const before = snap0(), b = k => k.beat ?? k.start, a = Math.min(...ks.map(b));
  for (const k of ks) { setField(k.id, 'shift', round((edits.keys[k.id]?.shift ?? 0) + (a + (b(k) - a) * f) - b(k), 4)); if (k.len) setField(k.id, 'len', round(k.len * f, 3)); }
  apply(); // (an order broken by the scale: undone)
  const broken = Object.values(TRACKS()).some(list => [...list].sort((a, b) => a.base - b.base).some((k, i, l) => i && k.beat < l[i - 1].beat - 1e-9));
  if (broken) { edits = JSON.parse(before); apply(); flash('Així el tros passaria per sobre de la clau del costat. Selecciona-la també.'); return; }
  commit(before);
}
function resetSelection() { const before = snap0(); for (const id of selected) delete edits.keys[id]; commit(before); }
const flash = m => { $('#flash').textContent = m; clearTimeout(flash.t); flash.t = setTimeout(() => { $('#flash').textContent = ''; }, 4000); };

// ---- the inspector: the selected keys, their timing and values
const KIND = { path: 'Camí i gir', gest: 'Cama estirada', comic: 'Rebot còmic', skid: 'Derrapada', carry: 'Aixecament', lap: 'Volta (automàtica)' };
const FIELDS = { // [field, label, unit, from the key, to the edit]
  path: [['yaw', 'Cap on mira', '°', k => k.yaw * 180 / Math.PI, v => v * Math.PI / 180], ['x', 'Posició cap al S', 'm'], ['z', 'Posició cap al W', 'm']],
  gest: [['len', 'Durada', 'temps']],
  comic: [['dip', 'Flexió de genolls', ''], ['sway', 'Balanceig', ''], ['nod', 'Cop de cap', ''], ['saw', 'Gronxador', ''], ['warp', 'Pols (camina a cops)', '']],
  skid: [['side', 'Cua cap a (1 o -1)', '']],
};
function inspect() {
  const box = $('#inspector'), ks = [...selected].map(find).filter(Boolean);
  if (editErr) flash(editErr);
  if (!ks.length) { box.innerHTML = `<h2>Cap clau seleccionada</h2><p class="dim">Clica una clau a la línia de temps (o arrossega per seleccionar-ne unes quantes). Arrossega-la per moure-la en el temps.</p>${help}`; return; }
  const kind = id => id.split(':')[0];
  if (ks.length > 1) {
    const sh = ks.map(k => edits.keys[k.id]?.shift ?? 0), same = sh.every(v => v === sh[0]);
    box.innerHTML = `<h2>${ks.length} claus</h2><p class="dim">${[...new Set(ks.map(k => KIND[kind(k.id)]))].join(', ')} · de ${barOf(Math.min(...ks.map(k => k.beat ?? k.start)))} a ${barOf(Math.max(...ks.map(k => k.beat ?? k.start)))}</p>
      <div class="row"><button data-a="earlier">◀ ${stepName()}</button><button data-a="later">${stepName()} ▶</button></div>
      <p class="dim">Tot el tros alhora: més ràpid o més lent (l'espai entre claus).</p>
      <div class="row"><button data-a="faster">Més ràpid −10%</button><button data-a="slower">Més lent +10%</button></div>
      ${same && sh[0] ? `<p>Totes mogudes ${fmtShift(sh[0])}.</p>` : ''}<div class="row"><button data-a="reset">Torna a l'original</button></div>`;
    return;
  }
  const k = ks[0], id = k.id, kd = kind(id), e = edits.keys[id] ?? {}, b = k.beat ?? k.start;
  const name = kd === 'carry' ? CARRY_NAMES[k.name] : KIND[kd];
  box.innerHTML = `<h2>${esc(name)}</h2><p class="dim"><code>${esc(id)}</code></p>
    <p class="big">${barOf(b)}</p><p class="dim">${clock(timeAt(b))}${e.shift ? ` · original ${barOf(k.base)} · <b class="ed">${fmtShift(e.shift)}</b>` : ''}</p>
    ${k.lock ? '<p>Les claus de la volta es reparteixen soles: mou «Comença la volta» i «Acaba la volta» a la pista d\'Aixecament.</p>' : `
    <div class="row"><button data-a="earlier">◀ ${stepName()}</button><button data-a="later">${stepName()} ▶</button><button data-a="go">Ves-hi</button></div>
    ${(FIELDS[kd] ?? []).map(([f, label, unit, from = x => x[f]]) => `<label class="field${e[f] != null ? ' changed' : ''}"><span>${label}${unit ? ` <span class="dim">(${unit})</span>` : ''}</span>
      <input type="number" step="${f === 'yaw' ? 5 : f === 'len' ? .25 : .01}" data-f="${f}" value="${round(from(k), f === 'yaw' ? 1 : 3)}"></label>`).join('')}
    ${kd === 'gest' ? `<label class="field${e.leg ? ' changed' : ''}"><span>Cama</span><select data-f="leg"><option value="R"${k.leg === 'R' ? ' selected' : ''}>Dreta</option><option value="L"${k.leg === 'L' ? ' selected' : ''}>Esquerra</option></select></label>` : ''}
    <div class="row"><button data-a="reset"${Object.keys(e).length ? '' : ' disabled'}>Torna a l'original</button></div>`}`;
}
const stepName = () => { const s = snapStep() || .25; return s >= 1 ? `${s} temps` : `1/${Math.round(1 / s)} temps`; };
const fmtShift = s => `${s > 0 ? '+' : '−'}${round(Math.abs(s), 3)} temps ${s > 0 ? 'més tard' : 'abans'}`;
const help = `<details open><summary>Com funciona</summary><ul class="dim">
  <li><b>Espai</b> reprodueix o para. Clica la regla o arrossega-la per moure't.</li>
  <li>Arrossega una clau per moure-la en el temps: s'enganxa a la graella (tria-la a «Imant»). Amb <b>Alt</b>, lliure.</li>
  <li>Arrossega a un espai buit per seleccionar un tros sencer i fer-lo <b>més ràpid o lent</b>.</li>
  <li><b>← →</b> mouen la selecció un pas; <b>Maj</b>+fletxa, un temps sencer. <b>⌫</b> la torna a l'original.</li>
  <li><b>Maj</b> + arrossegar la regla marca un bucle; <b>L</b> l'activa.</li>
  <li><b>N</b> deixa una nota en aquest moment per a mi. <b>⌘Z</b> desfà.</li>
  <li>Tot es desa sol i el joc ja ho fa servir.</li></ul></details>`;
$('#inspector').addEventListener('click', e => {
  const a = e.target.closest('[data-a]')?.dataset.a, s = snapStep() || .25;
  if (a === 'earlier') shiftSelection(-s); else if (a === 'later') shiftSelection(s); else if (a === 'reset') resetSelection();
  else if (a === 'faster') scaleSelection(.9); else if (a === 'slower') scaleSelection(1.1);
  else if (a === 'go') { const b = beatOf([...selected][0]); api.seek(b); tl.centre(b); }
});
$('#inspector').addEventListener('change', e => {
  const f = e.target.dataset.f, id = [...selected][0]; if (!f || !id) return;
  const def = (FIELDS[id.split(':')[0]] ?? []).find(x => x[0] === f), before = snap0();
  if (f === 'leg') setField(id, 'leg', e.target.value); else { const v = +e.target.value; if (!Number.isFinite(v)) return; setField(id, f, round(def?.[4] ? def[4](v) : v, 4)); }
  commit(before);
});

// ---- notes for the agent, at a moment of the dance
let notes = [];
const notesBox = $('#notes');
async function notesCall(body) {
  const r = await fetch('/__bou-timeline/notes', body ? { method: 'POST', headers: { 'content-type': 'application/json', 'x-bou-timeline': '1' }, body: JSON.stringify(body) } : {});
  if (!r.ok) throw new Error(r.status); notes = (await r.json()).notes; renderNotes(); tl.draw();
}
function newNote() {
  audio.pause(); const t = audio.currentTime, b = beatAt(t);
  showNote({ id: Math.random().toString(36).slice(2, 12), t: round(t, 3), beat: round(b, 3), bar: barOf(b), phase: PHASES.findLast(p => p.beat <= b + 1e-6)?.name ?? '', keys: [...selected], view: $('#view').value, text: '' }, true);
}
function showNote(n, fresh = false) {
  $('#note-form').hidden = false;
  $('#note-form').innerHTML = `<h2>${fresh ? 'Nota nova' : 'Nota'} · ${esc(n.bar)}</h2><p class="dim">${clock(n.t)} · ${esc(n.phase)}${n.keys?.length ? ` · ${n.keys.length} claus seleccionades` : ''}</p>
    <textarea rows="4" placeholder="Què hi ha de canviar aquí? (p. ex. «el gir ha de començar mig temps abans»)">${esc(n.text)}</textarea>
    <div class="row"><button data-a="save" class="primary">Desa</button>${fresh ? '' : `<button data-a="done">${n.done ? 'Reobre' : 'Fet'}</button><button data-a="del">Esborra</button>`}<button data-a="cancel">Tanca</button></div>`;
  const ta = $('#note-form textarea'); setTimeout(() => ta.focus(), 0);
  $('#note-form').onclick = async e => {
    const a = e.target.closest('[data-a]')?.dataset.a; if (!a) return;
    try {
      if (a === 'save' && ta.value.trim()) await notesCall({ op: fresh ? 'add' : 'put', note: { ...n, text: ta.value } });
      else if (a === 'done') await notesCall({ op: 'put', note: { ...n, text: ta.value, done: !n.done } });
      else if (a === 'del') await notesCall({ op: 'del', id: n.id });
    } catch (err) { flash(`No s'ha desat la nota (${err.message}). Copia-la abans de tancar.`); return; }
    $('#note-form').hidden = true;
  };
}
function renderNotes() {
  notesBox.innerHTML = notes.length ? notes.map((n, i) => `<button class="note${n.done ? ' done' : ''}" data-id="${n.id}"><b>${i + 1}</b> <span>${esc(n.bar)}</span><span class="txt">${esc(n.text)}</span></button>`).join('')
    : '<p class="dim">Encara no hi ha notes. Para on vulguis i prem <b>N</b>.</p>';
}
notesBox.addEventListener('click', e => { const id = e.target.closest('[data-id]')?.dataset.id; if (id) { api.openNote(id); tl.centre(notes.find(n => n.id === id).beat); } });

// ---- transport, keys and the frame loop
let stage, tl;
try { stage = createStage($('#stage')); } catch (e) { $('#flash').textContent = 'No s\'ha pogut preparar la vista 3D: ' + e.message; throw e; }
tl = createTimeline($('#tl'), api);
const play = () => { if (audio.paused) { if (loopOn && loop && (beatAt(audio.currentTime) < loop[0] || beatAt(audio.currentTime) >= loop[1])) api.seek(loop[0]); audio.play(); } else audio.pause(); };
$('#play').onclick = play;
$('#start').onclick = () => { api.seek(loopOn && loop ? loop[0] : 0); tl.centre(beatAt(audio.currentTime)); };
$('#speed').onchange = e => audio.setRate(+e.target.value);
$('#view').onchange = e => stage.view(e.target.value);
$('#follow').onchange = e => stage.setFollow(e.target.checked);
$('#loop').onclick = () => { if (!loop) { const b = beatAt(audio.currentTime), bar = BARS.findLast(x => x.beat <= b) ?? BARS[0]; loop = [bar.beat, bar.beat + 8]; } loopOn = !loopOn; $('#loop').classList.toggle('on', loopOn); tl.draw(); };
$('#zoomin').onclick = () => tl.zoom(1.5); $('#zoomout').onclick = () => tl.zoom(1 / 1.5); $('#fit').onclick = () => tl.fit();
$('#undo').onclick = () => history(undo, redo); $('#redo').onclick = () => history(redo, undo);
$('#note').onclick = newNote; $('#snap').onchange = () => inspect();
$('#phase-pick').innerHTML = PHASES.map((p, i) => `<option value="${i}">${esc(p.name)}</option>`).join('');
$('#phase-pick').onchange = e => { const p = PHASES[+e.target.value]; api.seek(p.beat); tl.centre(p.beat + 8); };
addEventListener('keydown', e => {
  if (/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) { if (e.key === 'Escape') e.target.blur(); return; }
  const s = e.shiftKey ? 1 : snapStep() || .25;
  if (e.key === ' ') { e.preventDefault(); play(); }
  else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? history(redo, undo) : history(undo, redo); }
  else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); const d = e.key === 'ArrowLeft' ? -s : s;
    if (selected.size) shiftSelection(d); else { api.seek(snap(beatAt(audio.currentTime)) + d); tl.follow(beatAt(audio.currentTime)); } }
  else if (e.key === 'n' || e.key === 'N') { e.preventDefault(); newNote(); }
  else if (e.key === 'l' || e.key === 'L') $('#loop').click();
  else if (e.key === 'Backspace' || e.key === 'Delete') { if (selected.size) { e.preventDefault(); resetSelection(); } }
  else if (e.key === 'Escape') api.select(null);
  else if (e.key === '+' || e.key === '=') tl.zoom(1.5); else if (e.key === '-') tl.zoom(1 / 1.5);
  else if (e.key === 'Home') $('#start').click();
});
function frame() {
  const t = audio.currentTime, b = beatAt(t);
  if (!audio.paused && loopOn && loop && b >= loop[1]) api.seek(loop[0]);
  const pose = stage.draw(t, !audio.paused);
  const ph = Math.max(0, PHASES.findLastIndex(p => p.beat <= b + 1e-6));
  $('#hud').textContent = `${barOf(pose.beat)} · ${PHASES[ph].name}`;
  if (document.activeElement !== $('#phase-pick')) $('#phase-pick').value = ph;
  $('#time').textContent = clock(t);
  if (!audio.paused) tl.follow(b);
  tl.draw(); requestAnimationFrame(frame);
}

// start: the saved edits (the file the game reads), the notes, the waveform
(async () => {
  try { const r = await fetch('/__bou-timeline/edits'); if (r.ok) edits = await r.json(); status.textContent = `${Object.keys(edits.keys).length} canvis desats`; }
  catch { status.textContent = 'Sense servidor: els canvis no es desaran'; status.className = 'err'; }
  apply(); rebuild(); tl.fit(); frame();
  notesCall().catch(() => { notesBox.innerHTML = '<p class="err">Les notes necessiten el servidor de desenvolupament.</p>'; });
  loadWave().catch(e => flash(`No s'ha pogut carregar la música (${e.message}).`));
  window.__bouTimeline = { audio, api, edits: () => edits, keys: () => keys }; // (agent checks)
})();
