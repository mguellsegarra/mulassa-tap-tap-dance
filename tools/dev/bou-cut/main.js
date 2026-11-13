// bou-cut.html: drop bars or whole phrases of the Bou's song and hear the result, spliced from the game's MP3 (a short
// fade at each join; the reverb of a dropped bar goes with it). The cut list leaves as JSON, in the score's bar numbers,
// for the real cut in the generator.
import song from '/src/song-bou.json';
import timing from '../../../music/bou-tradicional/timing.json';
import playback from '../../../music/bou-tradicional/playback.json';

const $ = id => document.getElementById(id), SAVED = 'bou-cut';
const PRE = 0.02, FADE = 0.008; // a join sits 20 ms before the bar line (its attack stays whole), 8 ms out and in
const cutBeats = playback.cutBeats ?? 0;
const tune = timing.events.filter(e => e.voice === 0).map(e => ({ b: e.beat - cutBeats, d: e.beats, m: e.pitch }));
const LO = Math.min(...tune.map(n => n.m)), HI = Math.max(...tune.map(n => n.m));

// the bars as played: [score bar, beat, seconds]; the last one (the final do and its fade) always stays
const bars = song.dance.bars.map(([src, beat, t], i, all) => {
  const t1 = all[i + 1]?.[2] ?? song.duration, notes = tune.filter(n => n.b >= beat - 1e-6 && n.b < beat + 4 - 1e-6);
  return { i, src, beat, t0: t, t1, notes, last: i === all.length - 1, sign: notes.map(n => `${(n.b - beat).toFixed(2)}:${n.d.toFixed(2)}:${n.m}`).join(' ') };
});
// phrases: four bars from each section's start (song.sections), the final bar alone
const starts = new Set(song.sections.map(([t]) => bars.findIndex(b => b.t0 >= t - 1e-3)));
const phrases = [];
for (const b of bars) {
  const p = phrases.at(-1);
  if (!p || starts.has(b.i) || p.bars.length === 4 || b.last) phrases.push({ bars: [b] }); else p.bars.push(b);
}
const signs = new Map(), HUES = [45, 170, 20, 280, 110, 330, 200, 75, 0, 240, 140, 300];
phrases.forEach((p, i) => {
  const s = p.bars.map(b => b.sign).join('|'); if (!signs.has(s)) signs.set(s, signs.size);
  p.same = signs.get(s); p.sec = song.sections.findLast(([t]) => t <= p.bars[0].t0 + 1e-3)[1]; p.n = i + 1;
});

let cut = new Set();
try { cut = new Set(JSON.parse(localStorage.getItem(SAVED)) ?? []); } catch { /* a broken save starts whole */ }

// ------------------------------------------------------------------ the spliced audio
let ctx = null, whole = null, buf = null, src = null, at = 0, t0 = 0, playing = false, map = [];
const kept = () => bars.filter(b => !cut.has(b.src));
function segments() { // [from, to] in the MP3's seconds, joined where nothing is dropped between them
  const out = [[0, bars[0].t0 - PRE]];
  for (const b of kept()) {
    const a = b.t0 - PRE, z = b.last ? song.duration : b.t1 - PRE;
    if (Math.abs(out.at(-1)[1] - a) < 1e-6) out.at(-1)[1] = z; else out.push([a, z]);
  }
  return out;
}
function splice() {
  const sr = whole.sampleRate, segs = segments().map(([a, z]) => [Math.round(a * sr), Math.min(whole.length, Math.round(z * sr))]);
  const out = ctx.createBuffer(whole.numberOfChannels, segs.reduce((n, [a, z]) => n + z - a, 0), sr), f = Math.round(FADE * sr);
  for (let c = 0; c < whole.numberOfChannels; c++) {
    const from = whole.getChannelData(c), to = out.getChannelData(c); let o = 0;
    segs.forEach(([a, z], k) => {
      to.set(from.subarray(a, z), o);
      if (k) for (let i = 0; i < f; i++) to[o + i] *= i / f;
      if (k < segs.length - 1) for (let i = 0; i < f; i++) to[o + z - a - 1 - i] *= i / f;
      o += z - a;
    });
  }
  buf = out;
  let t = bars[0].t0; map = kept().map(b => { const m = { b, t }; t += b.t1 - b.t0; return m; }); // where each kept bar starts now
}
const now = () => (playing ? at + ctx.currentTime - t0 : at);
function stop() { if (playing) { at = now(); playing = false; try { src.stop(); } catch { /* ended */ } } $('go').textContent = 'Juga'; }
async function play(from = at) {
  ctx ??= new AudioContext(); await ctx.resume();
  whole ??= await fetch(`/${song.audio}`).then(r => r.arrayBuffer()).then(a => ctx.decodeAudioData(a));
  if (!buf) splice();
  stop(); at = from >= buf.duration - 0.05 ? 0 : Math.max(0, from);
  src = ctx.createBufferSource(); src.buffer = buf; src.connect(ctx.destination);
  const mine = src; src.onended = () => { if (src === mine && playing && now() >= buf.duration - 0.1) { stop(); at = 0; } };
  t0 = ctx.currentTime; playing = true; src.start(0, at); $('go').textContent = 'Pausa';
}
const toggle = () => (playing ? stop() : play());

// ------------------------------------------------------------------ the page
const mmss = s => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;
const roll = b => `<svg viewBox="0 0 48 34" preserveAspectRatio="none">${b.notes.map(n =>
  `<rect x="${((n.b - b.beat) * 12).toFixed(1)}" y="${(2 + (HI - n.m) / (HI - LO) * 27).toFixed(1)}" width="${Math.max(1.5, n.d * 12 - 1).toFixed(1)}" height="3"/>`).join('')}</svg>`;
function draw() {
  $('list').innerHTML = phrases.map(p => {
    const off = p.bars.every(b => cut.has(b.src)), s = p.bars.reduce((x, b) => x + b.t1 - b.t0, 0);
    return `<section class="phrase${off ? ' off' : ''}" data-p="${p.n - 1}">
      <div class="head"><span class="same" style="background: hsl(${HUES[p.same % HUES.length]} 80% 65%)">${String.fromCharCode(97 + p.same)}</span>
        <b>${p.n} · ${p.bars[0].last ? 'Final' : p.sec}</b><span>${s.toFixed(1).replace('.', ',')} s · ${Math.round(p.bars.length * 240 / s)} bpm</span><span class="grow"></span>
        <button class="btn small" data-act="play" aria-label="Sona des d’abans de la frase ${p.n}">▶</button>
        ${p.bars[0].last ? '' : `<button class="btn small" data-act="cut">${off ? 'Torna' : 'Treu'}</button>`}</div>
      <div class="bars">${p.bars.map(b => `<button class="cell${cut.has(b.src) ? ' cut' : ''}" data-bar="${b.i}"${b.last ? ' disabled' : ''}>${roll(b)}<span>c. ${b.src}</span></button>`).join('')}</div>
    </section>`;
  }).join('');
  const full = song.duration, gone = bars.filter(b => cut.has(b.src)).reduce((x, b) => x + b.t1 - b.t0, 0);
  $('time').innerHTML = gone ? `${mmss(full)} → <b>${mmss(full - gone)}</b> (−${Math.round(gone)} s, ${cut.size} compassos)` : `${mmss(full)} · sencera`;
}
function change() { // a new cut: stay on the bar that was sounding, or the next one kept
  const was = map.findLast(m => m.t <= now() + 1e-3)?.b.i ?? -1, on = playing;
  stop(); localStorage.setItem(SAVED, JSON.stringify([...cut])); draw();
  if (!whole) return;
  splice(); at = was < 0 ? Math.min(now(), bars[0].t0) : (map.find(m => m.b.i >= was) ?? map.at(-1)).t;
  if (on) play();
}
$('list').onclick = e => {
  const cell = e.target.closest('.cell'), act = e.target.closest('[data-act]')?.dataset.act, p = phrases[e.target.closest('.phrase')?.dataset.p];
  if (cell && !cell.disabled) { const s = bars[cell.dataset.bar].src; if (!cut.delete(s)) cut.add(s); change(); }
  else if (act === 'cut') { const off = p.bars.every(b => cut.has(b.src)); for (const b of p.bars) if (off) cut.delete(b.src); else cut.add(b.src); change(); }
  else if (act === 'play') { // one kept bar before the phrase, to hear the join into it
    const go = async () => { if (!buf) await play(0); const k = map.findIndex(m => m.b.i >= p.bars[0].i); play(map[Math.max(0, k - 1)]?.t ?? 0); };
    go();
  }
};
$('go').onclick = toggle; $('start').onclick = () => play(0);
addEventListener('keydown', e => { if (e.code === 'Space' && !e.target.closest('button')) { e.preventDefault(); toggle(); } });
$('reset').onclick = () => { if (cut.size && confirm('Torno a la cançó sencera?')) { cut.clear(); change(); } };
$('copy').onclick = async () => {
  const gone = bars.filter(b => cut.has(b.src));
  await navigator.clipboard.writeText(JSON.stringify({ format: 'bou-cut-v1', note: 'score bars dropped from the current mix (timing.json sourceBar)', audio: song.audio,
    drop: gone.map(b => b.src), keep: kept().map(b => b.src), seconds: +(song.duration - gone.reduce((x, b) => x + b.t1 - b.t0, 0)).toFixed(2) }));
  $('msg').textContent = 'Copiat!'; setTimeout(() => ($('msg').textContent = ''), 1600);
};
let lit = null;
(function tick() {
  const b = playing ? map.findLast(m => m.t <= now() + 1e-3)?.b.i ?? null : null;
  if (b !== lit) { document.querySelector('.cell.now')?.classList.remove('now'); if (b !== null) document.querySelector(`.cell[data-bar="${b}"]`)?.classList.add('now'); lit = b; }
  requestAnimationFrame(tick);
})();
draw();
