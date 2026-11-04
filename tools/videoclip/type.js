// Videoclip text styles (dev only, type.html): the styles for putting the song's spoken MULASSA and GUAPA full screen,
// each drawn on a canvas over the clip's own video and timed by the song's shouts and beats (clip.json), for the owner
// to pick one before it goes into the clip. Each proposal is draw(ctx, W, H, video, s) with s: the word, how many
// beats since its shout (b), its beat's fraction (f), the kick pulse.
import clip from './clip.json';
import { createGrid } from './grid.js';
import { STYLES, textAt } from './textfx.js';
import edit from './edit.json';
import { ARCHIVE } from './textfx-archive.js';

const g = createGrid(clip), $ = id => document.getElementById(id);
// footage: the clip's own second at the segment's start (default FOOTAGE: a bright drop; the intro shows its own picture)
const SEGS = { titol: { from: 0, to: 6, footage: 0 }, mulassa: { from: 39, to: 48.5 }, guapa: { from: clip.shouts[4] - 2.3, to: clip.shouts[6] + 4.5 } }; // (from the analysis: the song's cut moves them)
// the footage behind the words: a bright stretch of a drop (at the shouts themselves the clip is dark: the build's end)
const FOOTAGE = 158.7;

// every style tried today: the intro title (0), the clip's (textfx.js), then the ones set aside (textfx-archive.js), each
// with its key; all drawn on the word the clip shows at that moment (textfx.js textAt: same timing as the clip)
const PROPOSALS = [...Object.entries(STYLES), ...Object.entries(ARCHIVE)].map(([key, st], i) => ({ name: `${i}. ${st.name} · ${key}`, note: st.note,
  draw: (ctx, W, H, v, s) => (s && (key === 'titol') === (s.style === 'titol') ? st.draw(ctx, W, H, v, s) : cover(ctx, v, W, H)) }));
function cover(ctx, v, W, H) { if (v.readyState >= 2) ctx.drawImage(v, 0, 0, W, H); else { ctx.fillStyle = '#111'; ctx.fillRect(0, 0, W, H); } }

// the word on at t (the clip's own timing); the title only in its segment and only drawn by its style
const wordAt = (seg, t) => textAt(g, t, edit, () => undefined);

let seg = 'mulassa', ar = '916', playing = false, t = SEGS.mulassa.from;
const audio = $('audio'), grid = $('grid');
const panels = PROPOSALS.map(p => {
  const fig = document.createElement('figure'), c = document.createElement('canvas');
  const cap = document.createElement('figcaption'); cap.innerHTML = `<b>${p.name}</b><span>${p.note}</span>`;
  fig.append(c, cap); grid.append(fig); return { p, c, ctx: c.getContext('2d') };
});
// Codex's four still style frames (media/type-codex/, imagegen), after the animated ones
for (const [k, name] of [[1, 'Crit d\'or'], [2, 'Contorn nocturn'], [3, 'Finestra al ball'], [4, 'Mosaic àcid']]) {
  const fig = document.createElement('figure'), pics = document.createElement('div'); pics.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:6px';
  for (const w of ['mulassa', 'guapa']) { const img = new Image(); img.src = `media/type-codex/p${k}-${w}.png`; img.style.cssText = 'width:100%;border-radius:6px'; pics.append(img); }
  const cap = document.createElement('figcaption'); cap.innerHTML = `<b>C${k}. ${name} · Codex (imatge fixa)</b><span>media/type-codex/README.md</span>`;
  fig.append(pics, cap); grid.append(fig);
}
function size() { const [w, h] = ar === '916' ? [540, 960] : [960, 540]; for (const x of panels) { x.c.width = w; x.c.height = h; } }
const restart = () => { t = SEGS[seg].from; audio.currentTime = t; if (playing) audio.play(); };
for (const b of document.querySelectorAll('[data-seg]')) b.onclick = () => { seg = b.dataset.seg; document.querySelectorAll('[data-seg]').forEach(x => x.classList.toggle('on', x === b)); restart(); };
for (const b of document.querySelectorAll('[data-ar]')) b.onclick = () => { ar = b.dataset.ar; document.querySelectorAll('[data-ar]').forEach(x => x.classList.toggle('on', x === b)); size(); };
$('play').onclick = () => { playing = !playing; $('play').textContent = playing ? '❚❚ Pausa' : '▶︎ Reprodueix'; if (playing) { audio.currentTime = t; audio.play(); } else audio.pause(); };
size();

function frame() {
  const S = SEGS[seg], v = $(`v${ar}`);
  if (playing) { t = audio.currentTime; if (t >= S.to) { t = S.from; audio.currentTime = t; } }
  else if (!wordAt(S, t)) t = (S.footage === 0 ? edit.titles[0].t + 1.6 : clip.shouts.find(x => x >= S.from) + .05); // stopped: show the first word
  const vt = (S.footage ?? FOOTAGE) + (t - S.from); if (Math.abs(v.currentTime - vt) > (playing ? .2 : .02)) v.currentTime = vt; // the video follows the song's clock
  if (playing && v.paused) v.play().catch(() => {}); if (!playing && !v.paused) v.pause();
  const s = wordAt(S, t);
  for (const x of panels) x.p.draw(x.ctx, x.c.width, x.c.height, v, s);
  $('t').textContent = `${t.toFixed(2)} s${s ? ` · ${s.word} · beat ${s.b.toFixed(1)}` : ''}`;
  requestAnimationFrame(frame);
}
Promise.all([document.fonts.load("400 40px 'Jersey 10'"), document.fonts.load("40px 'VC Power'")]).finally(frame);
// (for a headless capture: draw every panel at song second t)
window.__type = { at: (name, sec) => { seg = name; t = sec; } };
