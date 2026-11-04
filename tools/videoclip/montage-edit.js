// The montage editor (the tool, under the timeline when a proposal is open), as in an NLE: a video track of the
// proposal's pieces and an overlay track. Pieces: drag an edge to trim (ripple: the rest follows), drag the body to
// reorder, S splits at the play head, Delete removes; edges snap to the song's bar lines (Alt: free). Overlays: drag
// to move, drag an edge to change their length, double-click a title to edit its text, size and look. ⌘Z / ⇧⌘Z undo
// and redo; «Desa» checks the proposal and writes it over its file (notes-plugin.mjs).
import { proposalLength, sourceAt, MAX_T } from './proposal.js';
import { shoutLen } from './montage.js';

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const css = `
#mtracks{display:grid;gap:4px;position:relative;user-select:none}
#mtracks .track{position:relative;height:34px;background:#0b0c14;border-radius:6px;overflow:hidden}
#mtracks .blk{position:absolute;top:2px;bottom:2px;border-radius:5px;font:11px system-ui;color:#000d;padding:3px 8px;overflow:hidden;white-space:nowrap;cursor:grab;box-sizing:border-box}
#mtracks .blk.sel{outline:2px solid #fff;z-index:2}
#mtracks .h{position:absolute;top:0;bottom:0;width:8px;cursor:ew-resize;background:#ffffff33}#mtracks .h.l{left:0}#mtracks .h.r{right:0}
#mtracks .ov{background:#ffd21e;color:#2a1a10}#mtracks .ov.watermark{background:#f5c518aa}#mtracks .ov.endcard{background:#fff}#mtracks .ov.shout{background:#ff6200;color:#fff}
#mtracks .ph{position:absolute;top:0;bottom:0;width:2px;background:#fff;pointer-events:none;z-index:3}
#mtools{display:flex;flex-wrap:wrap;gap:6px;align-items:center;font-size:12px;color:var(--dim)}
#mtools button,#mtools input,#mtools select{font:13px system-ui;background:var(--bg);color:var(--ink);border:1px solid var(--line);border-radius:8px;padding:4px 8px}
#mtools input[type=text]{width:min(40vw,320px)}#mtools .ok{color:#7ee787}#mtools .err{color:#ff7b72}`;

export function createMontageEditor({ host, clip, colorOf, getM, getT, onChange, onSeek }) {
  document.head.insertAdjacentHTML('beforeend', `<style>${css}</style>`);
  const tools = document.createElement('div'), tracks = document.createElement('div'); tools.id = 'mtools'; tracks.id = 'mtracks';
  tracks.innerHTML = '<div class="track" data-k="v"></div><div class="track" data-k="o"></div><div class="ph"></div>';
  host.after(tools); tools.after(tracks);
  const V = tracks.children[0], O = tracks.children[1], head = tracks.children[2];
  const B = clip.beatTimes, BARS = B.filter((_, i) => i % 4 === clip.downbeat % 4), snapBar = t => BARS.reduce((a, b) => (Math.abs(b - t) < Math.abs(a - t) ? b : a));
  let sel = null, undo = [], redo = [], dirty = false, msg = '';
  const snapshot = () => JSON.stringify({ segments: getM().segments, overlays: getM().overlays ?? [] });
  const restore = s => { Object.assign(getM(), JSON.parse(s)); };
  const commit = before => { undo.push(before); redo = []; dirty = true; msg = ''; onChange(); render(); };
  const pxToS = (dx, len) => dx / V.clientWidth * len;

  // overlay [start, end] in proposal seconds, and setters
  const span = o => { const a = o.at ?? o.from; return [a, o.type === 'endcard' ? a + 5.5 : o.type === 'shout' ? a + shoutLen(o.index) : o.to ?? a + (o.dur ?? 0)]; };
  const setSpan = (o, a, z) => { if (o.type === 'watermark' || o.type === 'cta') { o.from = a; o.to = z; } else if (o.type === 'title') { o.at = a; o.dur = z - a; } else o.at = a; };
  const round = x => Math.round(x * 100) / 100;
  // ripple: overlays starting at or after `from` (proposal s, as they were in `orig`) move by `delta` with the pieces
  const ripple = (orig, from, delta) => (getM().overlays ?? []).forEach((o, j) => { const [a, z] = span(orig.overlays[j]); if (a >= from - .01) setSpan(o, round(a + delta), round(z + delta)); });
  const startOf = (segs, i) => segs.slice(0, i).reduce((a, s) => a + s.to - s.from, 0);

  function render() {
    const M = getM(); tracks.style.display = tools.style.display = M ? '' : 'none'; if (!M) return;
    const len = proposalLength(M); V.textContent = ''; O.textContent = ''; let at = 0;
    for (const [i, s] of M.segments.entries()) {
      const w = s.to - s.from, b = document.createElement('div'); b.className = `blk${sel?.k === 'v' && sel.i === i ? ' sel' : ''}`;
      b.style.cssText = `left:${at / len * 100}%;width:${w / len * 100}%;background:${colorOf(s.from)}`;
      b.innerHTML = `<i class="h l"></i>${i + 1} · ${s.from.toFixed(1)}–${s.to.toFixed(1)} (${w.toFixed(1)} s)<i class="h r"></i>`; b.dataset.i = i; V.append(b); at += w;
    }
    for (const [i, o] of (M.overlays ?? []).entries()) {
      const [a, z] = span(o), b = document.createElement('div'); b.className = `blk ov ${o.type}${sel?.k === 'o' && sel.i === i ? ' sel' : ''}`;
      b.style.cssText = `left:${a / len * 100}%;width:${Math.max(.4, (z - a) / len * 100)}%`;
      b.innerHTML = `${o.type === 'endcard' || o.type === 'shout' ? '' : '<i class="h l"></i>'}${o.type === 'title' ? `«${esc(o.text)}»` : o.type === 'watermark' ? 'mulassa.cat' : o.type === 'shout' ? `crit ${o.index}` : o.type === 'cta' ? (o.question === false ? 'mulassa.cat (píndola)' : 'pregunta + mulassa.cat') : 'targeta final'}${o.type === 'endcard' || o.type === 'shout' ? '' : '<i class="h r"></i>'}`;
      b.dataset.i = i; O.append(b);
    }
    renderTools();
  }
  function renderTools() {
    const M = getM(), o = sel?.k === 'o' ? M.overlays[sel.i] : null;
    tools.innerHTML = `<button data-a="title">+ Títol</button><button data-a="watermark">+ Marca</button><button data-a="cta">+ Pregunta</button><button data-a="endcard">+ Targeta</button>
      <button data-a="split" title="Talla al capçal (S)">Talla</button><button data-a="del" title="Esborra (Supr)">Esborra</button>
      <button data-a="undo" title="⌘Z">Desfés</button><button data-a="redo" title="⇧⌘Z">Refés</button><button data-a="save">${dirty ? 'Desa *' : 'Desa'}</button>
      ${o?.type === 'title' ? `<input type="text" data-f="text" value="${esc(o.text)}"> mida <input type="range" data-f="size" min=".4" max="2.5" step=".05" value="${o.size ?? 1}" style="width:110px">
        <select data-f="look"><option value="over"${o.look !== 'black' ? ' selected' : ''}>sobre la imatge</option><option value="black"${o.look === 'black' ? ' selected' : ''}>sobre negre</option><option value="clean"${o.look === 'clean' ? ' selected' : ''}>net (sense enfosquir)</option></select> alçada <input type="range" data-f="y" min=".1" max=".9" step=".01" value="${o.y ?? .5}" style="width:90px">` : ''}
      ${o?.type === 'cta' ? `<label><input type="checkbox" data-f="question" ${o.question !== false ? 'checked' : ''}> amb la pregunta</label>${o.question !== false ? ` <label><input type="checkbox" data-f="apart" ${o.pillY != null ? 'checked' : ''}> píndola a part</label>${o.pillY != null ? ` píndola <input type="range" data-f="pillY" min=".1" max=".9" step=".01" value="${o.pillY}" style="width:110px">` : ''}` : ''} alçada <input type="range" data-f="y" min=".1" max=".9" step=".01" value="${o.y ?? .6}" style="width:110px"> mida <input type="range" data-f="size" min=".5" max="2" step=".05" value="${o.size ?? 1}" style="width:90px">` : ''}
      <span class="${msg.startsWith('✓') ? 'ok' : 'err'}">${esc(msg)}</span>`;
  }
  // ---- dragging (pointer): which block, which part, and the proposal as it was
  let drag = null;
  tracks.addEventListener('pointerdown', e => {
    const b = e.target.closest('.blk'); if (!b) { const r = V.getBoundingClientRect(); onSeek((e.clientX - r.left) / r.width * proposalLength(getM())); return; }
    const k = b.parentElement.dataset.k, i = +b.dataset.i; sel = { k, i };
    drag = { k, i, part: e.target.classList.contains('l') ? 'l' : e.target.classList.contains('r') ? 'r' : 'body', x: e.clientX, len: proposalLength(getM()), before: snapshot(), orig: JSON.parse(snapshot()), moved: false };
    tracks.setPointerCapture(e.pointerId); render();
  });
  tracks.addEventListener('pointermove', e => {
    if (!drag) return; const M = getM(), dt = pxToS(e.clientX - drag.x, drag.len), free = e.altKey; if (Math.abs(e.clientX - drag.x) > 2) drag.moved = true; if (!drag.moved) return;
    if (drag.k === 'v') {
      const o = drag.orig.segments[drag.i], s = M.segments[drag.i];
      if (drag.part === 'l') { let f = o.from + dt; if (!free) f = snapBar(f); s.from = Math.max(0, Math.min(s.to - .5, f)); }
      else if (drag.part === 'r') { let z = o.to + dt; if (!free) z = snapBar(z); s.to = Math.min(MAX_T, Math.max(s.from + .5, z)); }
      if (drag.part !== 'body') ripple(drag.orig, startOf(drag.orig.segments, drag.i) + (o.to - o.from) - .001, (s.to - s.from) - (o.to - o.from)); // (what follows the trimmed piece)
      else { // reorder: where the pointer is among the other pieces' middles
        const segs = drag.orig.segments.slice(), [moving] = segs.splice(drag.i, 1), u = (e.clientX - V.getBoundingClientRect().left) / V.clientWidth * drag.len;
        let at = 0, to = segs.length; for (const [j, g] of segs.entries()) { if (u < at + (g.to - g.from) / 2) { to = j; break; } at += g.to - g.from; }
        segs.splice(to, 0, moving); M.segments = segs; sel.i = to;
      }
    } else {
      const ov = M.overlays[drag.i], [a0, z0] = span(drag.orig.overlays[drag.i]), len = proposalLength(M);
      const joins = [0, len, ...M.segments.slice(0, -1).reduce((a, s) => [...a, (a.at(-1) ?? 0) + s.to - s.from], [])];
      const snap = x => { if (free) return x; const j = joins.find(j => Math.abs(j - x) < len * .006); return j ?? Math.round(x * 20) / 20; };
      if (drag.part === 'l') setSpan(ov, round(Math.max(0, Math.min(z0 - .2, snap(a0 + dt)))), z0);
      else if (drag.part === 'r') setSpan(ov, a0, round(Math.min(len, Math.max(a0 + .2, snap(z0 + dt)))));
      else { const w = z0 - a0, a = round(Math.max(0, Math.min(len - w, snap(a0 + dt)))); setSpan(ov, a, a + w); }
    }
    onChange(); render();
  });
  tracks.addEventListener('pointerup', () => {
    if (drag?.moved && drag.k === 'o' && getM().overlays[drag.i]?.type === 'endcard') fitToCard(getM().overlays[drag.i]);
    if (drag?.moved) commit(drag.before); drag = null;
  });
  // the montage ends with its end card: what ran past it is cut from the last pieces (they would show after the black)
  function fitToCard(card) {
    const M = getM(); let over = proposalLength(M) - (card.at + 5.5);
    while (over > .01 && M.segments.length) { const s = M.segments.at(-1), w = s.to - s.from; if (w - over > .5) { s.to = round(s.to - over); over = 0; } else { over -= w; M.segments.pop(); } }
  }
  tracks.addEventListener('dblclick', e => { const b = e.target.closest('.blk.ov.title, .blk.ov.cta'); if (b) { sel = { k: 'o', i: +b.dataset.i }; render(); tools.querySelector('[data-f=text]')?.focus(); } });

  // ---- buttons, fields and keys
  function act(a) {
    const M = getM(), before = snapshot(), t = getT(); M.overlays ??= [];
    if (a === 'undo' && undo.length) { redo.push(before); restore(undo.pop()); dirty = true; onChange(); render(); return; }
    if (a === 'redo' && redo.length) { undo.push(before); restore(redo.pop()); dirty = true; onChange(); render(); return; }
    if (a === 'title') { M.overlays.push({ type: 'title', at: round(t), dur: 1.5, text: 'Text', look: 'over', size: 1 }); sel = { k: 'o', i: M.overlays.length - 1 }; }
    else if (a === 'cta') M.overlays.push({ type: 'cta', from: 0, to: round(proposalLength(M)) });
    else if (a === 'watermark') M.overlays.push({ type: 'watermark', from: round(t), to: round(Math.min(proposalLength(M), t + 10)) });
    else if (a === 'endcard') M.overlays.push({ type: 'endcard', at: round(Math.max(0, proposalLength(M) - 5.5)) });
    else if (a === 'split') { // at the play head, on the nearest bar of the piece under it
      const { i, t: src } = sourceAt(M, t), s = M.segments[i], cut = snapBar(src);
      if (cut - s.from < .5 || s.to - cut < .5) { msg = 'Massa a prop d\'un extrem per tallar'; renderTools(); return; }
      M.segments.splice(i, 1, { from: s.from, to: cut }, { from: cut, to: s.to }); sel = { k: 'v', i: i + 1 };
    } else if (a === 'del' && sel) {
      if (sel.k === 'v' && M.segments.length > 1) { const o = JSON.parse(before), s = M.segments[sel.i]; M.segments.splice(sel.i, 1); ripple(o, startOf(o.segments, sel.i) + s.to - s.from - .001, -(s.to - s.from)); } else if (sel.k === 'o') M.overlays.splice(sel.i, 1); else return; sel = null;
    } else if (a === 'save') { save(); return; } else return;
    commit(before);
  }
  async function save() {
    const M = getM(), r = await fetch('/__videoclip/proposals', { method: 'POST', headers: { 'content-type': 'application/json', 'x-videoclip': '1' }, body: JSON.stringify(M) });
    const j = await r.json().catch(() => ({}));
    if (r.ok) { dirty = false; msg = '✓ desat'; } else msg = `No s'ha desat: ${(j.errors ?? ['error']).join('; ')}`;
    renderTools();
  }
  tools.addEventListener('click', e => { const a = e.target.closest('[data-a]')?.dataset.a; if (a) act(a); });
  tools.addEventListener('focusin', e => { if (e.target.dataset.f) e.target.dataset.before = snapshot(); });
  tools.addEventListener('input', e => {
    const f = e.target.dataset.f, o = sel?.k === 'o' && getM().overlays[sel.i]; if (!f || !o) return;
    if (f === 'apart') { if (e.target.checked) o.pillY = .74; else delete o.pillY; } else o[f] = f === 'question' ? e.target.checked : f === 'size' || f === 'y' || f === 'pillY' ? +e.target.value : e.target.value; dirty = true; onChange(); if (f === 'apart' || f === 'question') renderTools();
    for (const b of O.children) if (+b.dataset.i === sel.i && o.type === 'title') b.childNodes[1].textContent = `«${o.text}»`;
  });
  tools.addEventListener('change', e => { if (e.target.dataset.f && e.target.dataset.before) { undo.push(e.target.dataset.before); redo = []; renderTools(); } });
  addEventListener('keydown', e => {
    if (!getM() || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); act(e.shiftKey ? 'redo' : 'undo'); }
    else if (e.key === 's' && !e.metaKey && !e.ctrlKey) act('split');
    else if ((e.key === 'Delete' || e.key === 'Backspace') && sel) { e.preventDefault(); act('del'); }
  });
  return { render, tick: t => { const M = getM(); if (M) head.style.left = `${t / proposalLength(M) * 100}%`; }, reset: () => { sel = null; undo = []; redo = []; dirty = false; msg = ''; render(); } };
}
