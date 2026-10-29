// notes-propostes.html: the three chart proposals (chart-proposals.js) against the game's, side by side and
// playable on the game's MP3. Dev only: a lane, two pads and the game's judge windows; no 3D, no scores stored.
import song from '/src/song-mulassa.json';
import EV from './chart-events.json';
import { buildProposal, PROPOSALS } from './chart-proposals.js';
import { makeDanceChart } from '/src/game/chart.js';
import { WINDOWS } from '/src/game/progress.js';
import { beatAtTime } from '/src/core/beat-grid.js';
import { createEditor } from './notes-editor.js';

const COL = { L: '#ff7a1a', R: '#14b8a6', Llt: '#ffb56b', Rlt: '#6ee7d8', Ldk: '#b34d00', Rdk: '#0a6e63', gold: '#f5c518', cream: '#fff3d6', dark: '#2a1a10', add: '#7ee081', err: '#ff8a7a' };
const LEVELS = ['FÀCIL', 'NORMAL', 'DIFÍCIL'], GUAPA_WIN = [0.15, 0.08, 0.08];
const VERSIONS = [{ id: 'actual', name: 'Actual', text: 'La del joc ara: la tonada a la part A, i a partir de la B corxeres de la tonada triades per posició.' },
  ...PROPOSALS, { id: 'meva', name: 'La meva', text: 'La teva versió, la de l’editor de sota.' }];
const beat = t => beatAtTime(song.beats, t), half = t => Math.round(beat(t) * 2) / 2;
const timeAt = b => { const k = Math.min(Math.floor(b), song.beats.length - 2); return song.beats[k] + (b - k) * (song.beats[k + 1] - song.beats[k]); };
const r4 = t => Math.round(t * 1e4) / 1e4;
const songNotesOf = id => id === 'actual' ? song.notes : buildProposal(id, song.beats);
// the editor's notes are in beats: [beat, kind, level, big, holdEndBeat]
const toBeats = list => list.map(([t, k, L, big, e]) => [half(t), k, L, big, e ? half(e) : 0]);
const toSong = list => list.map(([b, k, L, big, e]) => [r4(timeAt(b)), k, L, big, e ? r4(timeAt(e)) : 0]);
const chartsOf = notes => [0, 1, 2].map(d => makeDanceChart({ ...song, notes }, d));
const charts = Object.fromEntries(VERSIONS.filter(v => v.id !== 'meva').map(v => [v.id, chartsOf(songNotesOf(v.id))]));
const SAVED = 'notes-propostes-meva';
const PARTS = [['A1', 16, 80], ['A2', 80, 144], ['B', 144, 176], ['C', 176, 208], ['Final', 208, 228]];
const START = [['Inici', 0], ['A2', 80], ['B', 144], ['C', 176], ['Final', 208]];
const near = (list, b) => list.some(([x]) => Math.abs(x - b) < 1e-3);

const state = { level: 1, version: 'tambors', cursor: 12 }; // cursor: the beat at the editor's left edge, where «Juga» starts
const $ = id => document.getElementById(id);

// ------------------------------------------------------------------ comparison table
function stats(id, d) {
  const n = charts[id][d].filter(x => !x.balloon), per7 = (k, len) => k / (len * 60 / 152) * 7; // (the song is a steady 152)
  if (n.length < 2) return { count: n.length, mean: 0, pk: n.length, pa: 0, taiko: 0, tune: 0, parts: PARTS.map(() => 0) };
  let pk = 0, j = 0; for (let i = 0; i < n.length; i++) { while (n[i].t - n[j].t > 7) j++; pk = Math.max(pk, i - j + 1); }
  const span = n.at(-1).t - n[0].t, side = x => x.input === 'R' ? 'ka' : 'don';
  const taiko = n.filter(x => !x.big && near(EV.hits[side(x)], half(x.t))).length, plain = n.filter(x => !x.big).length;
  return {
    count: n.length, mean: n.length / span * 7, pk,
    pa: n.filter(x => x.input === 'R').length / n.filter(x => x.input !== 'B').length,
    taiko: taiko / plain, tune: n.filter(x => near(EV.melody, half(x.t))).length / n.length,
    parts: PARTS.map(([, a, z]) => per7(n.filter(x => beat(x.t) >= a - 1e-3 && beat(x.t) < z - 1e-3).length, z - a)),
  };
}
const pct = x => `${Math.round(x * 100)}%`, one = x => x.toFixed(1).replace('.', ',');
function drawTable() {
  const d = state.level, m = stats('actual', d);
  $('table').innerHTML = VERSIONS.map(v => {
    const s = stats(v.id, d), delta = s.count - m.count;
    const cls = delta > 0 ? 'plus' : delta < 0 ? 'minus' : 'same';
    const bars = s.parts.map((p, i) => `<span title="${PARTS[i][0]}: ${one(p)} per 7 s" style="height:${Math.min(34, p)}px"><i style="bottom:${Math.min(34, m.parts[i]) - 1}px"></i></span>`).join('');
    return `<tr data-v="${v.id}" class="${v.id === state.version ? 'on' : ''}"><td>${v.name}</td><td>${s.count}</td>
      <td class="${cls}">${v.id === 'actual' ? '—' : (delta > 0 ? '+' : delta < 0 ? '−' : '±') + Math.abs(delta) + `<span class="hide-sm"> (${delta >= 0 ? '+' : '−'}${Math.round(Math.abs(delta) / m.count * 100)}%)</span>`}</td>
      <td>${one(s.mean)}</td><td>${s.pk}</td><td class="hide-sm">${pct(s.pa)}</td><td class="hide-sm">${pct(s.taiko)}</td><td class="hide-sm">${pct(s.tune)}</td>
      <td class="hide-sm"><span class="bars">${bars}</span></td></tr>`;
  }).join('');
  $('about').textContent = VERSIONS.find(v => v.id === state.version).text + ' La línia discontínua de cada barra és l’actual.';
}

// ------------------------------------------------------------------ timeline (the selected version against the game's)
const PX = 26, B0 = 11; // px per beat; nothing plays before the pickup (beat 12)
function drawTimeline() {
  const cv = $('timeline'), dpr = devicePixelRatio || 1, W = (232 - B0) * PX + 110, H = 150;
  cv.style.width = `${W}px`; cv.width = W * dpr; cv.height = H * dpr;
  const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
  const x = b => 96 + (b - B0) * PX, rowY = [52, 112], d = state.level;
  for (const [name, a, z] of PARTS) {
    g.fillStyle = '#fff3d60d'; g.fillRect(x(a), 30, (z - a) * PX, 112);
    g.fillStyle = COL.gold; g.font = "800 13px 'Baloo 2', system-ui"; g.fillText(name, x(a) + 4, 22);
  }
  for (let b = 12; b <= 228; b += 4) { g.fillStyle = b % 16 ? '#fff3d614' : '#fff3d630'; g.fillRect(x(b), 30, 1, 112); }
  g.font = "600 12px 'Baloo 2', system-ui"; g.fillStyle = COL.cream;
  g.textBaseline = 'middle'; g.fillText('Actual', 8, rowY[0]); g.fillText(VERSIONS.find(v => v.id === state.version).name, 8, rowY[1]); g.textBaseline = 'alphabetic';
  const m = charts.actual[d], v = charts[state.version][d];
  const mBy = new Map(m.filter(n => !n.balloon).map(n => [half(n.t), n])), vBy = new Map(v.filter(n => !n.balloon).map(n => [half(n.t), n]));
  const disc = (b, y, n, r) => {
    if (n.end) { g.fillStyle = COL[n.input] + '88'; g.fillRect(x(b), y - r * 0.6, (beat(n.end) - b) * PX, r * 1.2); }
    if (n.input === 'B') { g.fillStyle = COL.L; g.beginPath(); g.arc(x(b), y, r, Math.PI / 2, Math.PI * 1.5); g.fill(); g.fillStyle = COL.R; g.beginPath(); g.arc(x(b), y, r, -Math.PI / 2, Math.PI / 2); g.fill(); }
    else { g.fillStyle = COL[n.input]; g.beginPath(); g.arc(x(b), y, r, 0, 7); g.fill(); }
  };
  for (const n of [...m, ...v].filter(n => n.balloon)) for (const y of rowY) { g.fillStyle = '#ff8fb155'; g.fillRect(x(beat(n.t)), y - 9, (beat(n.end) - beat(n.t)) * PX, 18); }
  for (const [b, n] of mBy) disc(b, rowY[0], n, n.big ? 9 : 7);
  for (const [b, n] of vBy) {
    disc(b, rowY[1], n, n.big ? 9 : 7);
    const was = mBy.get(b), ring = !was ? COL.add : was.input !== n.input ? COL.gold : null;
    if (ring) { g.strokeStyle = ring; g.lineWidth = 3; g.beginPath(); g.arc(x(b), rowY[1], 10.5, 0, 7); g.stroke(); }
  }
  for (const [b] of mBy) if (!vBy.has(b)) { g.strokeStyle = COL.err; g.lineWidth = 2; g.beginPath(); g.arc(x(b), rowY[1], 6, 0, 7); g.stroke(); }
  cv.onclick = e => { const b = Math.max(0, (e.offsetX - 96) / PX + B0 - 4); seek(Math.floor(b / 4) * 4); resume(); };
}

// ------------------------------------------------------------------ the playable lane
let ctx = null, buf = null, src = null, run = null;
async function audio() {
  ctx ??= new AudioContext();
  if (ctx.state === 'suspended') await ctx.resume();
  buf ??= await fetch(`/${song.audio}`).then(r => r.arrayBuffer()).then(a => ctx.decodeAudioData(a));
}
const latency = () => ctx.outputLatency || ctx.baseLatency || 0;
const songNow = () => !run ? 0 : run.paused ? run.t : ctx.currentTime - run.c0 + run.from - latency();
function hitSound(side) {
  if (!$('hits').checked || !ctx) return;
  const t = ctx.currentTime, o = ctx.createOscillator(), v = ctx.createGain();
  if (side === 'L') { o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(60, t + 0.12); v.gain.setValueAtTime(0.5, t); v.gain.exponentialRampToValueAtTime(0.001, t + 0.18); }
  else { o.type = 'triangle'; o.frequency.setValueAtTime(1300, t); v.gain.setValueAtTime(0.18, t); v.gain.exponentialRampToValueAtTime(0.001, t + 0.05); }
  o.connect(v).connect(ctx.destination); o.start(t); o.stop(t + 0.2);
}

// One run at a time, paused or playing; its score and judged notes survive a pause, a seek or an edit.
const fresh = after => charts[state.version][state.level].filter(n => n.t >= after).map(n => ({ ...n, done: false, popped: 0 }));
const startAt = b => b <= 12 ? 0 : Math.max(0, timeAt(b) - 1.6); // a seek lands 1.6 s early, to see the notes coming
const newRun = t => ({ auto: false, paused: true, t, c0: 0, from: t, notes: fresh(t + 0.05), held: { L: false, R: false }, first: null, judge: null, combo: 0, best: 0, count: { p: 0, g: 0, m: 0 }, over: false });
function sound(t) {
  try { src?.stop(); } catch { /* already stopped */ }
  src = ctx.createBufferSource(); src.buffer = buf; src.connect(ctx.destination);
  run.c0 = ctx.currentTime + 0.05; run.from = t + latency(); run.paused = false; src.start(run.c0, run.from);
}
async function resume() {
  await audio();
  if (!run || run.over) run = newRun(startAt(state.cursor));
  sound(run.t); syncGo();
}
function pause() {
  if (!run || run.paused) return;
  run.t = songNow(); run.paused = true;
  try { src?.stop(); } catch { /* already stopped */ }
  src = null; state.cursor = Math.max(12, beat(run.t)); editor.view(state.cursor - 1); syncGo();
}
const toggle = () => (run && !run.paused && !run.over ? pause() : resume());
function seek(b) { // keeps playing or paused as it was, and the score
  const t = startAt(b);
  if (!run || run.over) run = newRun(t); else { run.notes = fresh(t + 0.05); run.first = null; run.t = t; if (!run.paused) sound(t); }
  state.cursor = Math.max(12, b); editor.view(state.cursor - 1);
}
function rechart() { // another version or level: the same moment, its notes, a fresh score
  if (!run) return;
  const t = songNow(), keep = { paused: run.paused, c0: run.c0, from: run.from, auto: run.auto };
  run = Object.assign(newRun(t), keep);
}
function reset() { pause(); run = null; editor.playhead(null); syncGo(); }
function syncGo() {
  $('go').textContent = run && !run.paused && !run.over ? 'Pausa' : run && !run.over && run.t > 0.5 ? 'Continua' : 'Juga';
  $('watch').setAttribute('aria-pressed', String(!!run?.auto));
}

function say(word, col) { run.judge = { word, col, at: performance.now() }; }
function judge(n, dt) {
  const w = WINDOWS[state.level], a = Math.abs(dt);
  n.done = true;
  if (a <= w.perfect) { run.count.p++; run.combo++; say('PERFECTE', COL.gold); }
  else if (a <= w.good) { run.count.g++; run.combo++; say('BÉ', COL.cream); }
  else { miss(n); return; }
  run.best = Math.max(run.best, run.combo);
  if (n.end) n.holding = true;
}
function miss(n, word = 'ERROR') { n.done = true; n.holding = false; run.count.m++; run.combo = 0; say(word, COL.err); }

function press(side, stamp) {
  if (!run || run.over || run.paused) return;
  pad(side, true); hitSound(side);
  const t = songNow() - Math.max(0, (performance.now() - stamp) / 1000), w = WINDOWS[state.level];
  const bal = run.notes.find(n => n.balloon && !n.done && t >= n.t && t < n.end);
  if (bal) { if (++bal.popped >= bal.need) { bal.done = true; run.count.p++; say('GLOBUS!', '#ff8fb1'); } return; }
  const n = run.notes.find(n => !n.done && !n.balloon && Math.abs(n.t - t) <= w.miss);
  if (!n) return;
  if (n.input === 'B') {
    if (run.first && run.first.n === n && run.first.side !== side && t - run.first.t <= GUAPA_WIN[state.level]) { run.first = null; judge(n, run.firstDt); say(run.judge.word === 'ERROR' ? 'ERROR' : 'GUAPA!', COL.gold); return; }
    run.first = { n, side, t }; run.firstDt = t - n.t; return;
  }
  if (n.input === side) judge(n, t - n.t);
}
function release(side) {
  pad(side, false);
  if (!run) return;
  const t = songNow();
  for (const n of run.notes) if (n.holding && n.input === side) { n.holding = false; if (t < n.end - WINDOWS[state.level].good) miss(n, 'AGUANTA!'); }
}
function pad(side, down) { if (run) run.held[side] = down; document.querySelector(`.pad[data-side="${side}"]`).classList.toggle('down', down); }

function tick() {
  if (run) {
    const t = songNow(), w = WINDOWS[state.level];
    for (const n of run.notes) {
      if (n.done && !n.holding) continue;
      if (run.auto && !n.done && !n.balloon && t >= n.t) { judge(n, 0); hitSound(n.input === 'R' ? 'R' : 'L'); if (n.input === 'B') say('GUAPA!', COL.gold); }
      if (run.auto && n.balloon && t >= n.t && !n.done) { n.done = true; run.count.p++; say('GLOBUS!', '#ff8fb1'); }
      if (n.holding && t >= n.end) n.holding = false;
      if (!n.done && !n.balloon && t > n.t + w.miss) { if (run.first?.n === n) { run.first = null; miss(n, 'ELS DOS ALHORA!'); } else miss(n); }
      if (!n.done && n.balloon && t >= n.end) miss(n, 'ERROR');
    }
    if (!run.over && t > song.end + 1.5) { run.over = true; syncGo(); }
    editor.playhead(run.over ? null : beat(Math.max(t, song.beats[0])));
  }
  draw(); requestAnimationFrame(tick);
}

function draw() {
  const cv = $('lane'), dpr = devicePixelRatio || 1, W = cv.clientWidth, H = cv.clientHeight;
  if (cv.width !== Math.round(W * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
  const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
  const laneY = H * 0.42, band = Math.min(96, H * 0.34), ringX = Math.max(70, W * 0.16), look = W < 500 ? 1 : 1.55, pxs = (W - ringX) / look;
  const r = Math.min(band * 0.3, pxs * (60 / 152 / 2) * 0.42); // two eighths apart keep a gap, as the game's NOTE_GAP
  g.fillStyle = '#00000088'; g.fillRect(0, laneY - band / 2, W, band);
  g.fillStyle = COL.gold; g.fillRect(0, laneY - band / 2 - 2, W, 2); g.fillRect(0, laneY + band / 2, W, 2);
  g.strokeStyle = COL.cream; g.lineWidth = 3; g.beginPath(); g.arc(ringX, laneY, r * 1.15, 0, 7); g.stroke();
  g.strokeStyle = '#fff3d655'; g.lineWidth = 2; g.beginPath(); g.arc(ringX, laneY, r * 0.75, 0, 7); g.stroke();
  const t = run ? songNow() : timeAt(state.cursor), list = run ? run.notes : charts[state.version][state.level]; // stopped: the editor's view
  for (let i = list.length - 1; i >= 0; i--) {
    const n = list[i], x = ringX + (n.t - t) * pxs;
    if (x < ringX - r * 2 && !n.end && !n.balloon) continue;
    if (x > W + r * 3 || (n.done && !n.holding && !n.balloon) || (n.balloon && n.done)) continue;
    if (n.balloon) {
      const x1 = ringX + (n.end - t) * pxs, bx = Math.max(ringX, x);
      if (x1 < ringX) continue;
      g.fillStyle = '#ff8fb1'; g.beginPath(); g.arc(bx, laneY, r * 1.2, 0, 7); g.fill();
      g.fillStyle = COL.dark; g.font = `800 ${Math.round(r * 0.8)}px 'Baloo 2', system-ui`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(String(Math.max(0, n.need - (n.popped ?? 0))), bx, laneY + 1); continue;
    }
    if (n.end) {
      const x1 = ringX + (n.end - t) * pxs, x0 = n.holding ? ringX : x;
      g.fillStyle = COL[n.input === 'R' ? 'R' : 'L'] + (n.holding ? 'ff' : 'aa'); g.fillRect(x0, laneY - r * 0.55, Math.max(0, x1 - x0), r * 1.1);
      g.beginPath(); g.arc(x1, laneY, r * 0.55, 0, 7); g.fill();
      if (n.holding) continue;
    }
    const rr = n.big ? r * 1.25 : r;
    g.fillStyle = '#1a0f08'; g.beginPath(); g.arc(x, laneY, rr + 3, 0, 7); g.fill();
    if (n.input === 'B') {
      g.fillStyle = COL.L; g.beginPath(); g.arc(x, laneY, rr, Math.PI / 2, Math.PI * 1.5); g.fill();
      g.fillStyle = COL.R; g.beginPath(); g.arc(x, laneY, rr, -Math.PI / 2, Math.PI / 2); g.fill();
    } else {
      g.fillStyle = COL[n.input]; g.beginPath(); g.arc(x, laneY, rr, 0, 7); g.fill();
      g.fillStyle = COL[n.input + 'lt']; g.beginPath(); g.arc(x - rr * 0.25, laneY - rr * 0.3, rr * 0.35, 0, 7); g.fill();
    }
    g.strokeStyle = COL.cream; g.lineWidth = 2; g.beginPath(); g.arc(x, laneY, rr, 0, 7); g.stroke();
  }
  g.textAlign = 'center'; g.textBaseline = 'middle';
  if (run?.judge && performance.now() - run.judge.at < 600) {
    const k = 1 - (performance.now() - run.judge.at) / 600;
    g.globalAlpha = Math.min(1, k * 2); g.fillStyle = run.judge.col; g.font = `800 ${Math.round(band * 0.34)}px 'Baloo 2', system-ui`;
    g.fillText(run.judge.word, ringX + band * 0.4, laneY + band / 2 + band * 0.4); g.globalAlpha = 1;
  }
  g.font = `800 ${W < 420 ? 13 : 18}px 'Baloo 2', system-ui`; g.textAlign = 'left';
  const c = run?.count, judged = c ? c.p + c.g + c.m : 0;
  g.fillStyle = COL.cream;
  g.fillText(`${VERSIONS.find(v => v.id === state.version).name} · ${LEVELS[state.level]}`, 14, 22);
  g.textAlign = 'right';
  g.fillText(`ENCERTS ${judged ? Math.round((c.p + c.g * 0.8) / judged * 100) + '%' : '—'}`, W - 14, 22);
  if (run?.combo >= 5) { g.fillStyle = COL.gold; g.fillText(`RATXA ${run.combo}`, W - 14, 46); }
  if (run?.over || !run) {
    g.textAlign = 'center'; g.fillStyle = COL.cream; g.font = `800 ${W < 500 ? 15 : 20}px 'Baloo 2', system-ui`;
    g.fillText(run ? `${c.p} PERFECTE · ${c.g} BÉ · ${c.m} ERROR · ratxa ${run.best}` : 'Prem «Juga» o toca la línia de temps', W / 2, H * 0.82);
  }
}

// ------------------------------------------------------------------ controls
function seg(el, items, get, set) {
  el.innerHTML = items.map(([label, val]) => `<button class="btn" data-val="${val}">${label}</button>`).join('');
  const sync = () => el.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.val === String(get()))));
  el.onclick = e => { const b = e.target.closest('button'); if (b) { set(b.dataset.val); sync(); } };
  sync(); return sync;
}
// One version and one level for the table, the timeline, the lane and the editor.
function setVersion(id) { state.version = id; rechart(); syncVersions(); editor.set(id === 'meva' ? mine : toBeats(songNotesOf(id))); refresh(); }
function setLevel(L) { state.level = L; rechart(); syncLevels.forEach(f => f()); editor.level(L); refresh(); }
const syncVersions = seg($('versions'), VERSIONS.map(v => [v.name, v.id]), () => state.version, setVersion);
const syncLevels = ['levels', 'levels2'].map(id => seg($(id), LEVELS.map((l, i) => [l, i]), () => state.level, v => setLevel(Number(v))));
const syncFrom = seg($('from'), START.map(([l, b]) => [l, b]), () => START.findLast(([, b]) => b <= state.cursor + 0.5)?.[1] ?? 0, v => seek(Number(v) || 12));
$('table').onclick = e => { const tr = e.target.closest('tr'); if (tr) setVersion(tr.dataset.v); };
$('go').onclick = toggle;
$('watch').onclick = async () => { const on = !run?.auto; if (!run || run.over || run.paused) await resume(); run.auto = on; syncGo(); };
$('stop').onclick = reset;
function refresh() { drawTable(); drawTimeline(); }

const KEY = { KeyD: 'L', KeyF: 'L', ArrowLeft: 'L', KeyJ: 'R', KeyK: 'R', ArrowRight: 'R' };
addEventListener('keydown', e => {
  if (e.code === 'Space' && !e.target.closest?.('input[type=file], textarea')) { e.preventDefault(); if (!e.repeat) toggle(); return; }
  const s = KEY[e.code]; if (!s) return; e.preventDefault(); if (!e.repeat) press(s, e.timeStamp); });
addEventListener('keyup', e => { const s = KEY[e.code]; if (s) release(s); });
for (const p of document.querySelectorAll('.pad')) {
  p.addEventListener('pointerdown', e => { e.preventDefault(); p.setPointerCapture(e.pointerId); press(p.dataset.side, e.timeStamp); });
  const up = () => release(p.dataset.side);
  p.addEventListener('pointerup', up); p.addEventListener('pointercancel', up);
}

// ------------------------------------------------------------------ the editor: the shown version; an edit lands in 'La meva'
let base = localStorage.getItem(`${SAVED}-base`) ?? 'tambors', mine = null;
const setMine = list => { mine = list; charts.meva = chartsOf(toSong(list)); localStorage.setItem(SAVED, JSON.stringify(list)); localStorage.setItem(`${SAVED}-base`, base); };
const editor = createEditor({ canvas: $('editor'), scroll: $('ed-scroll'), head: $('ed-head'), tools: $('tools'), warn: $('warn'), undo: $('undo') }, {
  end: EV.end, parts: PARTS, balloons: EV.balloons,
  onChange(list) {
    if (state.version !== 'meva') { // editing the game's chart or a proposal starts 'La meva' from it
      const was = JSON.stringify(mine), from = JSON.stringify(toBeats(songNotesOf(base)));
      if (was !== from && !confirm(`«La meva» ja té canvis sobre ${VERSIONS.find(v => v.id === base).name}. La substitueixo per ${VERSIONS.find(v => v.id === state.version).name} amb aquest canvi?`)) { editor.set(toBeats(songNotesOf(state.version))); return; }
      base = state.version; state.version = 'meva'; syncVersions();
    }
    setMine(list.map(v => [...v]));
    if (run) { // live: the notes still to come follow the edit, the judged ones stay
      const now = songNow() + 0.05; run.notes = run.notes.filter(n => n.t <= now).concat(fresh(now));
    }
    refresh();
  },
  onSeek(b) { seek(b); resume(); },
  onScroll(b) { // stopped or paused, the editor's view is where play goes on (the lane shows it)
    if (run && !run.paused) return;
    state.cursor = Math.max(12, b + 1); syncFrom();
    if (run && !run.over) { run.t = timeAt(state.cursor); run.notes = fresh(run.t + 0.05); run.first = null; }
  },
});
const json = () => JSON.stringify({ format: 'mulassa-notes-v1', base, note: '[beat, don|ka, level 0 FÀCIL 1 NORMAL 2 DIFÍCIL, GUAPA 0|1, end beat of a hold or 0]', notes: mine });
$('copy').onclick = async () => { await navigator.clipboard.writeText(json()); $('copied').textContent = 'Copiat!'; setTimeout(() => ($('copied').textContent = ''), 1600); };
$('download').onclick = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([json()], { type: 'application/json' })); a.download = 'mulassa-notes.json'; a.click(); URL.revokeObjectURL(a.href); };
$('load').onchange = async e => {
  const f = e.target.files[0]; if (!f) return;
  try { const d = JSON.parse(await f.text()); if (!Array.isArray(d.notes)) throw new Error('no notes'); base = d.base ?? base; setMine(d.notes); setVersion('meva'); }
  catch { $('copied').textContent = 'Aquest fitxer no és un JSON de notes.'; }
  e.target.value = '';
};
let saved = null; try { saved = JSON.parse(localStorage.getItem(SAVED)); } catch { /* a broken save starts afresh */ }
setMine(Array.isArray(saved) ? saved : toBeats(songNotesOf(base)));
editor.level(state.level); editor.set(toBeats(songNotesOf(state.version)));
refresh(); requestAnimationFrame(tick);
