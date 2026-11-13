// bou-notes.html: the Bou's chart, one row per level under the score's tune, on its MP3. Edits stay in this browser
// and leave as JSON, ported by hand to tools/music/build_bou_chart.mjs.
import song from '/src/song-bou.json';
import timing from '../../../music/bou-tradicional/timing.json';
import playback from '../../../music/bou-tradicional/playback.json';
import { createEditor } from '../notes-propostes/notes-editor.js';

// the exact 1/12-beat grid (it keeps the ritardandos), both ways
const SUB = song.dance.subdivision, ST = song.dance.subdivisionTimes;
const sec = b => { const x = b * SUB, i = Math.min(Math.floor(x), ST.length - 2); return ST[i] + (x - i) * (ST[i + 1] - ST[i]); };
const beat = t => { let lo = 0, hi = ST.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (ST[m] <= t) lo = m; else hi = m; } return (lo + (t - ST[lo]) / (ST[hi] - ST[lo])) / SUB; };
const half = t => Math.round(beat(t) * 12) / 12, // (twelfths: the tan-ta's short note sits on a third of a beat)
   r4 = x => Math.round(x * 1e4) / 1e4;
const LEVELS = ['FÀCIL', 'NORMAL', 'DIFÍCIL'];
const $ = id => document.getElementById(id);

const ends = (e, f) => (Array.isArray(e) ? e.map(x => (x ? f(x) : 0)) : e ? f(e) : 0); // a hold's end, or one per level
const game = song.notes.map(([t, k, L, big, e]) => [half(t), k, L, big, ends(e, half)]);
// edits are kept per game chart: a regenerated song-bou.json shows itself, not the edits made on the old one
let sum = 0; for (const c of JSON.stringify(song.notes)) sum = (sum * 31 + c.charCodeAt(0)) >>> 0;
const SAVED = `bou-notes-${sum.toString(36)}`;
const first = game[0][0], end = half(song.end), fin = half(song.finale);
const marks = song.sections.map(([t, name], i) => [`${name}${Math.floor(i / 2) + 1}`, Math.max(first, half(t))]).filter(([, b]) => b < fin);
const parts = [...marks.map(([n, a], i) => [n, a, marks[i + 1]?.[1] ?? fin]), ['Final', fin, end]];
const cut = playback.cutBeats ?? 0, melody = timing.events.filter(e => e.voice === 0).map(e => [e.beat - cut, e.beats, e.pitch]);

let level = 1, notes;
try { notes = JSON.parse(localStorage.getItem(SAVED)); } catch { /* a broken save starts from the game's */ }
if (!Array.isArray(notes)) notes = game.map(n => [...n]);

// ------------------------------------------------------------------ sound: the MP3 and a click per note of the level
const audio = new Audio(`/${song.audio}`); audio.preload = 'auto';
let ctx = null, last = 0;
function click(kind) {
  if (!$('hits').checked || !ctx) return;
  const t = ctx.currentTime, o = ctx.createOscillator(), v = ctx.createGain();
  if (kind === 'don') { o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(60, t + 0.12); v.gain.setValueAtTime(0.5, t); v.gain.exponentialRampToValueAtTime(0.001, t + 0.18); }
  else { o.type = 'triangle'; o.frequency.setValueAtTime(1300, t); v.gain.setValueAtTime(0.18, t); v.gain.exponentialRampToValueAtTime(0.001, t + 0.05); }
  o.connect(v).connect(ctx.destination); o.start(t); o.stop(t + 0.2);
}
function play(b = null) {
  ctx ??= new AudioContext(); ctx.resume();
  if (b !== null) audio.currentTime = Math.max(0, sec(b) - 1);
  last = beat(audio.currentTime); audio.play();
}
const toggle = () => (audio.paused ? play() : audio.pause());
audio.onplay = audio.onpause = () => ($('go').textContent = audio.paused ? 'Juga' : 'Pausa');
function tick() {
  if (!audio.paused) {
    const b = beat(audio.currentTime);
    for (const n of notes) if (n[2] <= level && n[0] > last && n[0] <= b) click(n[3] ? 'don' : n[1]);
    last = b; editor.playhead(b);
  }
  requestAnimationFrame(tick);
}

// ------------------------------------------------------------------ the editor and its numbers
function stats() {
  $('stats').textContent = LEVELS.map((name, L) => {
    const n = notes.filter(v => v[2] <= L).map(v => sec(v[0]));
    return `${name} ${n.length} (${(n.length / (n.at(-1) - n[0]) * 7).toFixed(1).replace('.', ',')} per 7 s)`;
  }).join(' · ');
}
const save = () => { localStorage.setItem(SAVED, JSON.stringify(notes)); stats(); };
const editor = createEditor({ canvas: $('editor'), scroll: $('ed-scroll'), head: $('ed-head'), tools: $('tools'), warn: $('warn'), undo: $('undo') }, {
  first, end, parts, balloons: song.balloons, melody, both: 'BRAMA', easyHolds: !!song.easyHolds,
  onChange(list) { notes = list; save(); },
  onSeek: b => play(b),
  onScroll() {},
});
const levels = $('levels');
levels.innerHTML = LEVELS.map((l, i) => `<button class="btn" data-l="${i}">${l}</button>`).join('');
const syncLevel = () => levels.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(Number(b.dataset.l) === level)));
levels.onclick = e => { const b = e.target.closest('button'); if (b) { level = Number(b.dataset.l); syncLevel(); editor.level(level); } };
$('go').onclick = toggle;
addEventListener('keydown', e => { if (e.code === 'Space' && !e.target.closest?.('input')) { e.preventDefault(); toggle(); } });
$('copy').onclick = async () => {
  const json = { format: 'bou-notes-v1', comments, note: '[beat, don=BRA|ka=MA, level 0 FÀCIL 1 NORMAL 2 DIFÍCIL, BRAMA 0|1, end beat of a hold or 0]', notes,
    seconds: notes.map(([b, k, L, big, e]) => [r4(sec(b)), k, L, big, ends(e, x => r4(sec(x)))]) };
  await navigator.clipboard.writeText(JSON.stringify(json)); $('msg').textContent = 'Copiat!'; setTimeout(() => ($('msg').textContent = ''), 1600);
};
// ------------------------------------------------------------------ the owner's comments, at the playhead
const NOTES_KEY = 'bou-notes-comments';
let comments = []; try { comments = JSON.parse(localStorage.getItem(NOTES_KEY)) ?? []; } catch { /* none */ }
const barAt = b => song.dance.bars.findLast(r => r[1] <= b + 1e-6)?.[0] ?? song.dance.bars[0][0];
const line = c => `[${LEVELS[c.level]} · compàs ${c.bar}] ${c.text}`;
function showComments() {
  localStorage.setItem(NOTES_KEY, JSON.stringify(comments));
  $('comments').replaceChildren(...comments.map((c, i) => {
    const li = document.createElement('li'), go = document.createElement('button'), del = document.createElement('button');
    go.className = del.className = 'link'; go.textContent = line(c); del.textContent = 'Treu'; del.setAttribute('aria-label', `Treu el comentari del compàs ${c.bar}`);
    go.onclick = () => play(c.beat);
    del.onclick = () => { comments.splice(i, 1); showComments(); };
    li.append(go, del); return li;
  }));
}
$('comment').onsubmit = e => {
  e.preventDefault();
  const text = $('comment-text').value.trim(); if (!text) return;
  const b = audio.paused ? last : beat(audio.currentTime);
  comments.push({ level, bar: barAt(b), beat: Math.round(b * 2) / 2, text }); comments.sort((x, y) => x.beat - y.beat);
  $('comment-text').value = ''; showComments();
};
$('copy-comments').onclick = async () => { await navigator.clipboard.writeText(comments.map(line).join('\n')); $('msg').textContent = 'Copiat!'; setTimeout(() => ($('msg').textContent = ''), 1600); };
showComments();
$('reset').onclick = () => { if (confirm('Esborro els teus canvis i torno al chart del joc?')) { notes = game.map(v => [...v]); editor.set(notes, true); save(); } };

syncLevel(); editor.level(level); editor.set(notes); stats(); requestAnimationFrame(tick);
