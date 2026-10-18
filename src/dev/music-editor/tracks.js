// The editor's four canvases: the ORIGINAL and the SEQUENCE as piano rolls, the tempo lane and the events lane.
// Drawing and hit testing only; what a click does is pointer.js. Beats run left to right, `view.x0` at the gutter.
import { resolveAnchor } from './edits.js';
import { selIds } from './state.js';

export const GUTTER = 92;
export const RULER = 18;
export const ORIG = { brackets: [RULER, RULER + 60], roll: RULER + 64, row: 20 }; // phrase blocks: 3 rows of 20 px
export const SEQ = { blocks: [RULER, RULER + 28], roll: RULER + 32 };
export const EV = { rows: [['Final', 0], ['GLOBUS', 26], ['MANTÉN', 52]], row: 24 };
const INK = '#fff3d6', DIM = '#e8d8b880', GOLD = '#f5c518', RED = '#ff5a4f', GUA = '#ff7a1a', PA = '#14b8a6';

export const xOf = (view, beat) => GUTTER + (beat - view.x0) * view.ppb;
export const beatOf = (view, x) => view.x0 + (x - GUTTER) / view.ppb;

// a stable colour per name (labels, sections)
const hues = new Map();
export const colour = (name, a = 1) => {
  if (!hues.has(name)) { let h = 0; for (const c of String(name)) h = (h * 31 + c.charCodeAt(0)) % 360; hues.set(name, h); }
  return `hsla(${hues.get(name)}, 62%, 58%, ${a})`;
};

// song seconds <-> arranged beats through the timeline's whole-beat grid
// (no grid when the tempo does not compile: a plain 120 bpm keeps the editor usable)
export function secOfBeat(tl, b) {
  if (tl.beats.length < 2) return b / 2;
  const g = tl.beats, k = Math.max(0, Math.min(g.length - 2, Math.floor(b)));
  return g[k] + (b - k) * (g[k + 1] - g[k]);
}
export function beatOfSec(tl, s) {
  if (tl.beats.length < 2) return s * 2;
  const g = tl.beats; let lo = 0, hi = g.length - 2;
  while (lo < hi) { const m = (lo + hi + 1) >> 1; if (g[m] <= s) lo = m; else hi = m - 1; }
  return lo + (s - g[lo]) / (g[lo + 1] - g[lo]);
}

// sizes a canvas to its box (device pixels) and returns its 2d context in css px
export function fit(canvas) {
  const dpr = devicePixelRatio || 1, w = canvas.clientWidth, h = canvas.clientHeight;
  if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) { canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); }
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  ctx.font = '600 11px "Baloo 2", system-ui, sans-serif';
  ctx.textBaseline = 'middle';
  return { ctx, w, h };
}
// a timeline's numbers for its gutter: tempo, bars, length (the same for the original and the sequence)
export function stats(tl) {
  const g = tl.beats, end = Math.min(tl.end ?? g.length - 1, g.length - 1);
  let lo = Infinity, hi = 0;
  for (let k = 0; k < end; k++) { const v = 60 / (g[k + 1] - g[k]); lo = Math.min(lo, v); hi = Math.max(hi, v); }
  const secs = g.length > 1 ? g[end] - g[0] : 0;
  const bpm = !Number.isFinite(lo) ? `${tl.bpm} bpm` : Math.round(lo) === Math.round(hi) ? `${Math.round(lo)} bpm` : `${Math.round(lo)}–${Math.round(hi)} bpm`;
  return [bpm, `${tl.occurrences.length} compassos`, `${mmss(secs)} min · ${end} temps`];
}
export const mmss = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
// seconds along the bottom of a lane: a tick and m:ss every 1-60 s, as dense as fits
function seconds(ctx, view, w, h, tl) {
  const g = tl.beats;
  if (g.length < 2) return;
  const pps = view.ppb / ((g.at(-1) - g[0]) / (g.length - 1)), step = [1, 2, 5, 10, 15, 30, 60].find(s => s * pps >= 48) ?? 120;
  ctx.fillStyle = '#00000080'; ctx.fillRect(GUTTER, h - 13, w - GUTTER, 13);
  for (let t = 0; t <= g.at(-1); t += step) {
    const x = xOf(view, beatOfSec(tl, g[0] + t));
    if (x < GUTTER - 30 || x > w) continue;
    ctx.fillStyle = DIM; ctx.fillRect(Math.round(x), h - 13, 1, 13);
    ctx.fillText(mmss(t), x + 3, h - 6);
  }
}
const clipLane = (ctx, w, h) => { ctx.save(); ctx.beginPath(); ctx.rect(GUTTER, 0, w - GUTTER, h); ctx.clip(); };
function gutter(ctx, h, title, sub) {
  ctx.fillStyle = '#1d120b'; ctx.fillRect(0, 0, GUTTER, h);
  ctx.fillStyle = INK; ctx.font = '800 12px "Baloo 2", system-ui, sans-serif'; ctx.fillText(title, 8, 12);
  ctx.font = '600 11px "Baloo 2", system-ui, sans-serif'; ctx.fillStyle = DIM;
  sub.forEach((s, i) => ctx.fillText(s, 8, 28 + i * 14));
}
function playhead(ctx, view, beat, h) {
  if (beat == null) return;
  const x = xOf(view, beat);
  ctx.fillStyle = INK; ctx.fillRect(Math.round(x) - 1, 0, 2, h);
}
// bar lines + ruler with each occurrence's score bar number, and the notes, inside [top, h]
function roll(ctx, view, w, h, top, occs, band) {
  let lo = 127, hi = 0;
  for (const o of occs) for (const n of o.notes) { lo = Math.min(lo, n[2]); hi = Math.max(hi, n[2]); }
  if (lo > hi) { lo = 60; hi = 72; }
  const rowH = (h - top - 4) / (hi - lo + 1), y = m => top + (hi - m) * rowH;
  const step = view.ppb < 4 ? 4 : view.ppb < 8 ? 2 : 1; // bar numbers thin out when zoomed out
  occs.forEach((o, i) => {
    const x = xOf(view, o.start), x1 = xOf(view, o.start + o.dur);
    if (x1 < GUTTER || x > w) return;
    ctx.fillStyle = colour(band(o, i), i % 2 ? 0.14 : 0.2); ctx.fillRect(x, top, x1 - x, h - top);
    ctx.fillStyle = '#ffffff22'; ctx.fillRect(x, 0, 1, h);
    if (i % step === 0) { ctx.fillStyle = DIM; ctx.fillText(String(o.bar), x + 3, RULER / 2); }
    ctx.fillStyle = colour(band(o, i));
    for (const [s, d, m] of o.notes) ctx.fillRect(xOf(view, s) + 0.5, y(m) + 0.5, Math.max(1.5, d * view.ppb - 1), Math.max(2, rowH - 1));
  });
}

function greyBlock(ctx, x, x1, y, h, text) {
  ctx.fillStyle = '#ffffff30'; ctx.fillRect(x, y, x1 - x, h);
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, x1 - x, h); ctx.clip();
  ctx.fillStyle = INK; ctx.fillText(text, x + 4, y + h / 2); ctx.restore();
}

// ---- ORIGINAL: sections, phrase brackets, the bar range being selected
export function bracketRows(form, orig) {
  const index = new Map(orig.occurrences.map((o, i) => [o.unfolded, i]));
  const rows = [], out = [];
  for (const p of form.phrases) {
    const at = p.bars.map(b => index.get(b)).filter(i => i !== undefined);
    if (!at.length) continue;
    const a = Math.min(...at), b = Math.max(...at);
    let r = rows.findIndex(end => end < a); if (r < 0) { r = rows.length; rows.push(-1); }
    rows[r] = b; out.push({ phrase: p, a, b, row: Math.min(r, 2), label: phraseLabel(form, p) });
  }
  return out;
}
// a phrase wears the label it has in the sequence (so it is the same colour above and below), else its first bar's section
function phraseLabel(form, p) {
  return form.sequence.find(s => s.phrase === p.id)?.label ?? form.source.unfolded.find(u => u.id === p.bars[0])?.section ?? p.id;
}
export function drawOriginal(canvas, S, beat) {
  const { ctx, w, h } = fit(canvas), view = S.view.o, occs = S.orig.occurrences;
  clipLane(ctx, w, h);
  if (S.off > 0) { // the game's intro, before the original starts: room, so both pickups line up
    const x = xOf(view, -S.off), x1 = xOf(view, 0);
    ctx.fillStyle = '#ffffff0a'; ctx.fillRect(x, RULER, x1 - x, h - RULER);
    greyBlock(ctx, x + 1, x1 - 1, ORIG.brackets[0] + 2, ORIG.row - 3, 'intro (només al joc)');
  }
  const rows = bracketRows(S.form, S.orig), bandOf = new Map();
  for (const r of rows) for (let i = r.a; i <= r.b; i++) if (!bandOf.has(i)) bandOf.set(i, r.label);
  roll(ctx, view, w, h, ORIG.roll, occs, (o, i) => bandOf.get(i) ?? o.label);
  if (S.range) {
    const [a, b] = S.range[0] <= S.range[1] ? S.range : [S.range[1], S.range[0]];
    const x = xOf(view, occs[a].start), x1 = xOf(view, occs[b].start + occs[b].dur);
    ctx.fillStyle = '#f5c51833'; ctx.fillRect(x, RULER, x1 - x, h - RULER);
    ctx.strokeStyle = GOLD; ctx.lineWidth = 2; ctx.strokeRect(x + 1, RULER + 1, x1 - x - 2, h - RULER - 2);
  }
  // the pickup bar the sequence starts from (intro.pickup), grey as in the sequence: it belongs to no phrase
  const pick = occs.findIndex(o => o.unfolded === S.form.intro?.pickup?.bar);
  if (pick >= 0) greyBlock(ctx, xOf(view, occs[pick].start) + 1, xOf(view, occs[pick].start + occs[pick].dur) - 1, ORIG.brackets[0] + 2, ORIG.row - 3, 'anacrusi');
  for (const { phrase, a, b, row, label } of rows) {
    const x = xOf(view, occs[a].start) + 1, x1 = xOf(view, occs[b].start + occs[b].dur) - 1, y = ORIG.brackets[0] + 2 + row * ORIG.row;
    const on = selIds('phrase').includes(phrase.id), used = S.form.sequence.some(s => s.phrase === phrase.id);
    ctx.fillStyle = colour(label, on ? 1 : used ? 0.75 : 0.35); ctx.fillRect(x, y, x1 - x, ORIG.row - 3);
    if (on) { ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.strokeRect(x + 1, y + 1, x1 - x - 2, ORIG.row - 5); }
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, x1 - x, ORIG.row); ctx.clip();
    ctx.fillStyle = '#2a1a10'; ctx.font = '800 11px "Baloo 2", system-ui, sans-serif';
    ctx.fillText(phrase.name, x + 5, y + (ORIG.row - 3) / 2); ctx.restore();
  }
  seconds(ctx, view, w, h, S.orig);
  playhead(ctx, view, beat, h);
  ctx.restore();
  gutter(ctx, h, S.track === 'orig' ? '▶ ORIGINAL' : 'ORIGINAL', stats(S.orig));
}
// what is under (x, y) on the original: { kind: 'ruler' | 'phrase' | 'bar', beat, index?, phrase? }
export function hitOriginal(S, x, y) {
  const beat = beatOf(S.view.o, x), occs = S.orig.occurrences;
  if (x < GUTTER) return null;
  if (y < RULER) return { kind: 'ruler', beat };
  const index = Math.max(0, Math.min(occs.length - 1, occs.findLastIndex(o => o.start <= beat)));
  if (y < ORIG.brackets[1]) {
    const row = Math.floor((y - ORIG.brackets[0] - 2) / ORIG.row);
    const hit = bracketRows(S.form, S.orig).find(r => r.row === row && r.a <= index && index <= r.b);
    if (hit) return { kind: 'phrase', beat, phrase: hit.phrase };
  }
  return { kind: 'bar', beat, index };
}

// ---- SEQUENCE: one block per item (all its repeats), the pickup in grey
export function itemBlocks(S) {
  const by = new Map();
  for (const [item, , s, e] of S.tl.itemSpans) { const b = by.get(item); if (b) { b.s = Math.min(b.s, s); b.e = Math.max(b.e, e); } else by.set(item, { s, e }); }
  return S.form.sequence.map((item, i) => ({ item, i, ...(by.get(item.id) ?? { s: null, e: null }) }));
}
export function drawSequence(canvas, S, beat, drop) {
  const { ctx, w, h } = fit(canvas), view = S.view.s, tl = S.tl;
  clipLane(ctx, w, h);
  roll(ctx, view, w, h, SEQ.roll, tl.occurrences, o => o.label);
  const phrases = new Map(S.form.phrases.map(p => [p.id, p]));
  const [y0, y1] = SEQ.blocks;
  for (const { item, s, e } of itemBlocks(S)) {
    if (s == null) continue;
    const x = xOf(view, s) + 1, x1 = xOf(view, e) - 1, on = selIds('item').includes(item.id);
    ctx.fillStyle = colour(item.label, on ? 1 : 0.75); ctx.fillRect(x, y0 + 2, x1 - x, y1 - y0 - 4);
    if (on) { ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.strokeRect(x + 1, y0 + 3, x1 - x - 2, y1 - y0 - 6); }
    ctx.save(); ctx.beginPath(); ctx.rect(x, y0, x1 - x, y1 - y0); ctx.clip();
    const scale = item.beatScale === 2 ? ' x½' : item.beatScale === 0.5 ? ' x2' : '';
    ctx.fillStyle = '#2a1a10'; ctx.font = '800 11px "Baloo 2", system-ui, sans-serif';
    ctx.fillText(`${phrases.get(item.phrase)?.name ?? item.phrase} · ${item.label}${item.repeat > 1 ? ` ×${item.repeat}` : ''}${scale}${item.bars ? ' ✎' : ''}`, x + 5, (y0 + y1) / 2);
    ctx.restore();
  }
  const intro = tl.occurrences.filter(o => !S.form.sequence.some(s => s.id === o.item));
  for (const o of intro) greyBlock(ctx, xOf(view, o.start) + 1, xOf(view, o.start + o.dur) - 1, y0 + 2, y1 - y0 - 4, 'anacrusi');
  if (drop != null) { const x = xOf(view, drop); ctx.fillStyle = GOLD; ctx.fillRect(x - 2, 0, 4, h); }
  seconds(ctx, view, w, h, tl);
  playhead(ctx, view, beat, h);
  ctx.restore();
  gutter(ctx, h, S.track === 'orig' ? 'SEQÜÈNCIA' : '▶ SEQÜÈNCIA', [...stats(tl), `${S.form.sequence.length} elements`]);
}
export function hitSequence(S, x, y) {
  if (x < GUTTER) return null;
  const beat = beatOf(S.view.s, x);
  if (y >= SEQ.blocks[0] && y < SEQ.blocks[1]) {
    const b = itemBlocks(S).find(b => b.s != null && b.s <= beat && beat < b.e);
    if (b) return { kind: 'item', beat, item: b.item, index: b.i };
  }
  return { kind: 'seek', beat };
}
// where a dropped / dragged item lands: index in the sequence and the beat of the gap
export function dropSlot(S, beat) {
  const blocks = itemBlocks(S).filter(b => b.s != null);
  for (const b of blocks) if (beat < (b.s + b.e) / 2) return { index: b.i, beat: b.s };
  return { index: S.form.sequence.length, beat: blocks.at(-1)?.e ?? 0 };
}

// ---- TEMPO: the bpm of every beat (from the compiled grid) and the form's knots
export function tempoGeometry(S, h) {
  const g = S.tl.beats, bpm = [];
  for (let k = 0; k + 1 < g.length; k++) bpm.push(60 / (g[k + 1] - g[k]));
  const knots = S.form.tempo.knots.map((k, i) => ({ i, beat: resolveAnchor(k.at, S.tl), bpm: k.bpm }));
  const all = [...bpm, ...knots.map(k => k.bpm)].filter(Number.isFinite);
  if (!all.length) all.push(120);
  const lo = Math.floor(Math.min(...all) - 4), hi = Math.ceil(Math.max(...all) + 4);
  const y = v => 6 + (hi - v) / (hi - lo) * (h - 12), bpmAt = py => hi - (py - 6) / (h - 12) * (hi - lo);
  return { bpm, knots, y, bpmAt, lo, hi };
}
export function drawTempo(canvas, S, beat) {
  const { ctx, w, h } = fit(canvas), view = S.view.s, t = tempoGeometry(S, h);
  clipLane(ctx, w, h);
  ctx.strokeStyle = GOLD; ctx.lineWidth = 1.5; ctx.beginPath();
  t.bpm.forEach((v, k) => { ctx.lineTo(xOf(view, k), t.y(v)); ctx.lineTo(xOf(view, k + 1), t.y(v)); });
  ctx.stroke();
  for (const k of t.knots) {
    if (k.beat == null) continue;
    const on = S.sel?.kind === 'knot' && S.sel.i === k.i;
    ctx.fillStyle = on ? INK : GOLD; ctx.beginPath(); ctx.arc(xOf(view, k.beat), t.y(k.bpm), on ? 6 : 4.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = DIM; ctx.fillText(String(k.bpm), xOf(view, k.beat) + 8, t.y(k.bpm) - 8);
  }
  playhead(ctx, view, beat, h);
  ctx.restore();
  gutter(ctx, h, 'TEMPO', [`${t.lo}–${t.hi} bpm`, S.form.tempo.clock]);
}
export function hitTempo(S, x, y, h) {
  if (x < GUTTER) return null;
  const t = tempoGeometry(S, h), view = S.view.s;
  const k = t.knots.find(k => k.beat != null && Math.hypot(xOf(view, k.beat) - x, t.y(k.bpm) - y) < 8);
  return k ? { kind: 'knot', i: k.i } : { kind: 'empty', beat: beatOf(view, x), bpm: t.bpmAt(y) };
}

// ---- EVENTS: intro and ending markers, GLOBUS and MANTÉN ranges
export function eventShapes(S) {
  const tl = S.tl, f = S.form, out = [];
  const first = itemBlocks(S).find(b => b.s != null)?.s;
  if (first != null) out.push({ kind: 'intro', row: 0, s: 0, e: first });
  for (const key of ['finale', 'roll', 'hit']) {
    const b = resolveAnchor(f.ending?.[key], tl);
    if (b != null) out.push({ kind: 'ending', key, row: 0, s: b, e: b });
  }
  f.events.balloons.forEach((g, i) => { const s = resolveAnchor(g.start, tl), e = resolveAnchor(g.end, tl); if (s != null && e != null) out.push({ kind: 'balloon', i, row: 1, s, e }); });
  f.events.holds.forEach((g, i) => { const s = resolveAnchor(g.start, tl), e = resolveAnchor(g.end, tl); if (s != null && e != null) out.push({ kind: 'hold', i, row: 2, s, e, tone: g.kind }); });
  return out;
}
const ENDING = { finale: ['FINAL', GOLD], roll: ['roll', INK], hit: ['cop', RED] };
export function drawEvents(canvas, S, beat) {
  const { ctx, w, h } = fit(canvas), view = S.view.s;
  clipLane(ctx, w, h);
  for (const [, y] of EV.rows) { ctx.fillStyle = '#ffffff0c'; ctx.fillRect(GUTTER, y + 1, w, EV.row); }
  for (const e of eventShapes(S)) {
    const x = xOf(view, e.s), x1 = xOf(view, e.e), y = EV.rows[e.row][1] + 1;
    const on = S.sel?.kind === e.kind && (e.kind === 'ending' ? S.sel.key === e.key : e.kind === 'intro' || S.sel.i === e.i);
    if (e.kind === 'ending') {
      const [name, c] = ENDING[e.key];
      ctx.fillStyle = c; ctx.fillRect(x - 1, 0, on ? 3 : 2, h);
      ctx.fillRect(x, y, ctx.measureText(name).width + 8, EV.row - 6); ctx.fillStyle = '#2a1a10'; ctx.fillText(name, x + 4, y + EV.row / 2 - 3);
      continue;
    }
    ctx.fillStyle = e.kind === 'intro' ? '#ffffff30' : e.kind === 'balloon' ? '#ff8fb1' : e.tone === 'ka' ? PA : GUA;
    ctx.fillRect(x, y + 2, Math.max(3, x1 - x), EV.row - 4);
    if (on) { ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.strokeRect(x + 1, y + 3, Math.max(3, x1 - x) - 2, EV.row - 6); }
    ctx.fillStyle = '#2a1a10';
    ctx.fillText(e.kind === 'intro' ? `intro ${S.form.intro.beats}` : e.kind === 'balloon' ? 'GLOBUS' : e.tone, x + 4, y + EV.row / 2);
  }
  playhead(ctx, view, beat, h);
  ctx.restore();
  gutter(ctx, h, '', []);
  EV.rows.forEach(([name, y]) => { ctx.fillStyle = DIM; ctx.fillText(name, 8, y + EV.row / 2 + 1); });
}
// { shape, part: 'body' | 'start' | 'end' } or { kind: 'empty', row, beat }
export function hitEvents(S, x, y) {
  if (x < GUTTER) return null;
  const view = S.view.s, row = EV.rows.findIndex(([, ry]) => y >= ry && y < ry + EV.row + 2), beat = beatOf(view, x);
  const shapes = eventShapes(S);
  // ending markers win anywhere on their line (they are thin)
  const mark = shapes.find(e => e.kind === 'ending' && Math.abs(xOf(view, e.s) - x) < 5);
  if (mark) return { shape: mark, part: 'body', beat };
  for (const e of shapes) {
    if (e.row !== row || e.kind === 'ending') continue;
    const x0 = xOf(view, e.s), x1 = xOf(view, e.e);
    if (x < x0 - 4 || x > x1 + 4) continue;
    const part = e.kind === 'intro' ? 'body' : Math.abs(x - x0) < 5 ? 'start' : Math.abs(x - x1) < 5 ? 'end' : 'body';
    return { shape: e, part, beat };
  }
  return { kind: 'empty', row, beat };
}
