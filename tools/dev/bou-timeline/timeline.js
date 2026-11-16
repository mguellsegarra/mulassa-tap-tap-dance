// The Bou's timeline, drawn on one canvas in song beats (the music's grid: equal beats even where the tempo changes).
// Lanes: the music's waveform, the path's keys over its turn rate (orange) and travel speed (blue), the carriers' feet
// (when each one is in the air), the stretched legs (clips), the comic bounce, the skids, the colla's lift and the notes.
// Drag a key to retime it (snapped to the grid; Alt: free), drag a leg's right edge to change its length, drag an
// empty stretch of the lanes to select every key in it, click to seek; on the ruler drag to scrub, Shift-drag to set
// the loop. Wheel / trackpad scrolls; Ctrl/⌘ + wheel or pinch zooms round the pointer.
const GUTTER = 128;
export const LANES = [
  { id: 'ruler', h: 30 }, { id: 'music', h: 46, name: 'Música' }, { id: 'path', h: 66, name: 'Camí i gir', hint: 'taronja gir · blau camí' },
  { id: 'feet', h: 74, name: 'Peus enlaire' }, { id: 'gest', h: 30, name: 'Cames estirades' },
  { id: 'comic', h: 40, name: 'Rebot còmic', hint: 'flexió de genolls' }, { id: 'skid', h: 28, name: 'Derrapades' },
  { id: 'carry', h: 52, name: 'Aixecament', hint: 'alçada del Bou' }, { id: 'notes', h: 30, name: 'Notes' },
];
const FEET = [[2, 'Davant D'], [3, 'Davant E'], [0, 'Darrere D'], [1, 'Darrere E']]; // bou-feet.js: 0/2 right, 2/3 the front carrier
const C = { bg: '#16181d', lane: '#1c1f26', lane2: '#20232b', grid: '#2a2e38', bar: '#3d4352', text: '#c9ccd4', dim: '#7d8290',
  key: '#d9dce4', edited: '#ffc53d', sel: '#ffffff', lock: '#555b69', turn: '#ff8a3d', speed: '#4aa8ff', wave: '#5fbf8f',
  head: '#ff4d4f', loop: '#ffc53d22', foot: ['#ff8a3d', '#ffb37a', '#4aa8ff', '#8cc6ff'], left: '#9b7bff', right: '#3ccf91', note: '#ffc53d', done: '#5c6170' };
export const CARRY_NAMES = { come: 'La colla arriba', grip: "L'agafen", up: 'Amunt!', lap: 'Comença la volta', lapEnd: 'Acaba la volta', lower: 'Comencen a baixar', down: 'A terra', back: 'La colla torna' };

export function createTimeline(canvas, api) {
  const ctx = canvas.getContext('2d');
  const view = { b0: -1, ppb: 18 }; let W = 0, H = 0, hits = [], drag = null, marquee = null;
  const laneY = id => { let y = 0; for (const l of LANES) { if (l.id === id) return [y, l.h]; y += l.h; } };
  const x = b => GUTTER + (b - view.b0) * view.ppb, bAt = px => view.b0 + (px - GUTTER) / view.ppb;
  const height = LANES.reduce((a, l) => a + l.h, 0);
  function resize() { const r = canvas.getBoundingClientRect(), d = devicePixelRatio || 1; W = r.width; H = height; canvas.style.height = H + 'px';
    canvas.width = Math.round(W * d); canvas.height = Math.round(H * d); ctx.setTransform(d, 0, 0, d, 0, 0); draw(); }
  new ResizeObserver(resize).observe(canvas);

  function draw() {
    const m = api.model(); if (!W) return; hits = [];
    ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
    let y = 0; for (const [i, l] of LANES.entries()) { ctx.fillStyle = i % 2 ? C.lane : C.lane2; ctx.fillRect(GUTTER, y, W - GUTTER, l.h); y += l.h; }
    const first = Math.max(0, Math.floor(bAt(GUTTER))), last = Math.min(m.total, Math.ceil(bAt(W)));
    // the loop, then the beat grid and the bar lines (source bars, as the dance's code names them)
    if (m.loop) { ctx.fillStyle = C.loop; ctx.fillRect(Math.max(GUTTER, x(m.loop[0])), 0, x(m.loop[1]) - Math.max(GUTTER, x(m.loop[0])), H); }
    if (view.ppb >= 8) for (let b = first; b <= last; b++) { ctx.fillStyle = C.grid; ctx.fillRect(Math.round(x(b)), 30, 1, H - 30); }
    if (view.ppb >= 48) for (let b = first; b <= last; b += .25) if (b % 1) { ctx.fillStyle = '#23262e'; ctx.fillRect(Math.round(x(b)), 30, 1, H - 30); }
    const every = view.ppb * 4 < 26 ? 4 : view.ppb * 4 < 52 ? 2 : 1;
    ctx.font = '11px system-ui'; ctx.textBaseline = 'middle';
    for (const [k, bar] of m.bars.entries()) {
      const px = x(bar.beat); if (px < GUTTER - 40 || px > W) continue;
      ctx.fillStyle = C.bar; ctx.fillRect(Math.round(px), 14, 1, H - 14);
      if (k % every === 0 && px >= GUTTER) { ctx.fillStyle = C.text; ctx.fillText(bar.label, px + 3, 22); }
    }
    for (const [i, p] of m.phases.entries()) { // phases across the ruler's top
      const a = Math.max(GUTTER, x(p.beat)), z = Math.min(W, x(m.phases[i + 1]?.beat ?? m.total)); if (z <= a) continue;
      ctx.fillStyle = i % 2 ? '#3b3f6b' : '#4d3b6b'; ctx.fillRect(a, 0, z - a - 1, 12);
      ctx.save(); ctx.beginPath(); ctx.rect(a, 0, z - a - 2, 12); ctx.clip(); ctx.fillStyle = '#e8e4ff'; ctx.font = '10px system-ui'; ctx.fillText(p.name, a + 4, 6.5); ctx.restore();
    }
    waveform(m); curves(m); feet(m); keys(m); notes(m);
    // the play head and its drag handle on the ruler
    const ph = x(m.beat); if (ph >= GUTTER && ph <= W) { ctx.fillStyle = C.head; ctx.fillRect(ph - 1, 12, 2, H - 12); ctx.beginPath(); ctx.moveTo(ph - 6, 12); ctx.lineTo(ph + 6, 12); ctx.lineTo(ph, 20); ctx.fill(); }
    if (marquee) { ctx.strokeStyle = '#fff'; ctx.setLineDash([4, 3]); ctx.strokeRect(marquee.x0, marquee.y0, marquee.x1 - marquee.x0, marquee.y1 - marquee.y0); ctx.setLineDash([]); }
    // the lanes' names over the gutter
    y = 0; ctx.fillStyle = C.bg; ctx.fillRect(0, 0, GUTTER, H);
    for (const l of LANES) {
      ctx.fillStyle = '#2a2e38'; ctx.fillRect(0, y + l.h - 1, W, 1);
      if (l.name && l.id !== 'feet') { ctx.fillStyle = C.text; ctx.font = '600 12px system-ui'; ctx.fillText(l.name, 10, y + (l.hint ? l.h / 2 - 7 : l.h / 2)); }
      if (l.hint) { ctx.fillStyle = C.dim; ctx.font = '10px system-ui'; wrap(l.hint, 10, y + l.h / 2 + 7, GUTTER - 14); }
      if (l.id === 'feet') FEET.forEach(([, n], r) => { ctx.fillStyle = C.foot[r]; ctx.font = '10px system-ui'; ctx.fillText(n, 22, y + 3 + (r + .5) * (l.h - 6) / 4); });
      y += l.h;
    }
    ctx.fillStyle = C.text; ctx.font = '600 12px ui-monospace,monospace'; ctx.fillText(m.clock, 10, 15);
  }
  function wrap(t, px, py, w) { ctx.fillText(t.length * 5 > w ? t.slice(0, Math.floor(w / 5)) + '…' : t, px, py); }
  function waveform(m) {
    const [y, h] = laneY('music'); if (!m.peaks) { ctx.fillStyle = C.dim; ctx.fillText('carregant l\'ona…', GUTTER + 8, y + h / 2); return; }
    ctx.fillStyle = C.wave; const mid = y + h / 2;
    for (let px = GUTTER; px < W; px++) {
      const a = m.timeAt(bAt(px)), z = m.timeAt(bAt(px + 1)); if (z < 0 || a > m.duration) continue;
      let v = 0; for (let i = Math.max(0, Math.floor(a * m.peakRate)), e = Math.min(m.peaks.length, Math.ceil(z * m.peakRate) + 1); i < e; i++) v = Math.max(v, m.peaks[i]);
      const s = Math.max(.5, v * (h / 2 - 3)); ctx.fillRect(px, mid - s, 1, 2 * s);
    }
  }
  function area(values, y, h, color, fill) {
    ctx.beginPath(); let started = false;
    for (let px = GUTTER; px <= W; px += 2) {
      const i = Math.round(bAt(px) * values.rate); if (i < 0 || i >= values.length) continue;
      const py = y + h - 3 - values[i] * (h - 8); if (!started) { ctx.moveTo(px, fill ? y + h - 3 : py); if (fill) ctx.lineTo(px, py); started = true; } else ctx.lineTo(px, py);
    }
    if (fill) { ctx.lineTo(Math.min(W, x(m0.total)), y + h - 3); ctx.closePath(); ctx.fillStyle = color; ctx.fill(); } else { ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.stroke(); }
  }
  let m0 = null;
  function curves(m) {
    m0 = m; if (!m.curves) return;
    { const [y, h] = laneY('path'); area(m.curves.turn, y, h, '#ff8a3d55', true); area(m.curves.speed, y, h, C.speed, false); }
    { const [y, h] = laneY('carry'); area(m.curves.lift, y, h, '#3ccf9144', true); }
    { const [y, h] = laneY('comic'); area(m.curves.dip, y, h, '#9b7bff40', true); }
  }
  function feet(m) {
    if (!m.feet) return; const [y, h] = laneY('feet'), rh = (h - 6) / 4;
    FEET.forEach(([i], r) => { ctx.fillStyle = C.foot[r];
      for (const [a, z] of m.feet[i]) { const pa = x(a), pz = x(z); if (pz < GUTTER || pa > W) continue; ctx.fillRect(Math.max(GUTTER, pa), y + 3 + r * rh, Math.max(1.5, pz - Math.max(GUTTER, pa)), rh - 2); } });
  }
  function diamond(px, py, r, fill, stroke) { ctx.beginPath(); ctx.moveTo(px, py - r); ctx.lineTo(px + r, py); ctx.lineTo(px, py + r); ctx.lineTo(px - r, py); ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 2; ctx.stroke(); } }
  function keys(m) {
    const K = m.keys, sel = m.selected, ed = m.edited, on = px => px > GUTTER - 8 && px < W + 8;
    const ghost = (k, py) => { if (Math.abs(k.beat - k.base) > 1e-6 && on(x(k.base))) { ctx.strokeStyle = '#ffc53d66'; ctx.setLineDash([2, 2]); ctx.beginPath(); ctx.moveTo(x(k.base), py); ctx.lineTo(x(k.beat), py); ctx.stroke(); ctx.setLineDash([]); ctx.fillStyle = '#ffc53d55'; ctx.fillRect(x(k.base) - 1, py - 4, 2, 8); } };
    { const [y, h] = laneY('path'), py = y + 12;
      for (const k of K.path) { const px = x(k.beat); if (!on(px)) continue;
        if (k.lock) { diamond(px, py, 3, C.lock); continue; }
        ghost(k, py); diamond(px, py, 6, ed.has(k.id) ? C.edited : C.key, sel.has(k.id) ? C.sel : null); hits.push({ id: k.id, x: px - 8, y: py - 9, w: 16, h: 18 }); } }
    { const [y, h] = laneY('gest');
      for (const g of K.gestures) { const a = x(g.start), z = x(g.start + g.len); if (z < GUTTER || a > W) continue;
        ctx.fillStyle = g.side ? C.left : C.right; ctx.globalAlpha = ed.has(g.id) ? 1 : .8; ctx.fillRect(a, y + 4, z - a, h - 8); ctx.globalAlpha = 1;
        if (ed.has(g.id)) { ctx.fillStyle = C.edited; ctx.fillRect(a, y + 4, z - a, 2); }
        if (sel.has(g.id)) { ctx.strokeStyle = C.sel; ctx.lineWidth = 2; ctx.strokeRect(a, y + 4, z - a, h - 8); }
        ctx.fillStyle = '#10131a'; ctx.font = '600 10px system-ui'; if (z - a > 14) ctx.fillText(`${g.side ? 'E' : 'D'}${g.way === 'swing' ? ' ↺' : g.way < 0 ? ' ↙' : ''}`, a + 4, y + h / 2);
        hits.push({ id: g.id, x: a, y: y + 4, w: Math.max(6, z - a - 6), h: h - 8 }, { id: g.id, part: 'len', x: z - 6, y: y + 4, w: 10, h: h - 8 }); } }
    { const [y] = laneY('comic'), py = y + 10;
      for (const k of K.comic) { const px = x(k.beat); if (!on(px)) continue; ghost(k, py); diamond(px, py, 5, ed.has(k.id) ? C.edited : '#b9a4ff', sel.has(k.id) ? C.sel : null); hits.push({ id: k.id, x: px - 7, y: py - 8, w: 14, h: 16 }); } }
    { const [y, h] = laneY('skid'), py = y + h / 2;
      for (const k of K.skids) { const px = x(k.beat); if (!on(px)) continue; ghost(k, py);
        ctx.beginPath(); ctx.moveTo(px, py - 7); ctx.lineTo(px + 7, py + 6); ctx.lineTo(px - 7, py + 6); ctx.closePath(); ctx.fillStyle = ed.has(k.id) ? C.edited : '#ff7a7a'; ctx.fill();
        if (sel.has(k.id)) { ctx.strokeStyle = C.sel; ctx.lineWidth = 2; ctx.stroke(); } hits.push({ id: k.id, x: px - 8, y: py - 8, w: 16, h: 16 }); } }
    { const [y, h] = laneY('carry');
      for (const [j, k] of K.carry.entries()) { const px = x(k.beat); if (!on(px)) continue; const py = y + 9 + (j % 3) * 12; ghost(k, py);
        ctx.fillStyle = ed.has(k.id) ? C.edited : '#3ccf91'; ctx.fillRect(px - 1, y + 2, 2, h - 4); diamond(px, py, 5, ctx.fillStyle, sel.has(k.id) ? C.sel : null);
        if (view.ppb > 10) { ctx.font = '10px system-ui'; ctx.fillStyle = C.text; ctx.fillText(CARRY_NAMES[k.name], px + 8, py); }
        hits.push({ id: k.id, x: px - 7, y: py - 8, w: 14, h: 16 }); } }
  }
  function notes(m) {
    const [y, h] = laneY('notes');
    m.notes.forEach((n, i) => { const px = x(n.beat); if (px < GUTTER - 10 || px > W + 10) return;
      ctx.fillStyle = n.done ? C.done : C.note; ctx.beginPath(); ctx.arc(px, y + h / 2, 9, 0, 2 * Math.PI); ctx.fill();
      ctx.fillStyle = '#10131a'; ctx.font = '700 10px system-ui'; ctx.textAlign = 'center'; ctx.fillText(i + 1, px, y + h / 2 + .5); ctx.textAlign = 'left';
      hits.push({ note: n.id, x: px - 9, y: y + h / 2 - 9, w: 18, h: 18 }); });
  }

  // ---- pointer
  const pos = e => { const r = canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  const hitAt = (px, py) => { for (let i = hits.length - 1; i >= 0; i--) { const h = hits[i]; if (px >= h.x && px <= h.x + h.w && py >= h.y && py <= h.y + h.h) return h; } return null; };
  canvas.addEventListener('pointerdown', e => {
    const [px, py] = pos(e); if (px < GUTTER) return;
    canvas.setPointerCapture(e.pointerId);
    const h = hitAt(px, py);
    if (h?.note) { api.openNote(h.note); return; }
    if (h) { api.select(h.id, e.shiftKey || e.metaKey); drag = { kind: 'key', id: h.id, part: h.part, x0: px, start: api.dragStart(h.id) }; return; }
    if (py < 30) { drag = { kind: e.shiftKey ? 'loop' : 'scrub', b0: bAt(px) }; if (!e.shiftKey) api.seek(bAt(px)); return; }
    drag = { kind: 'lanes', x0: px, y0: py, add: e.shiftKey || e.metaKey };
  });
  canvas.addEventListener('pointermove', e => {
    const [px, py] = pos(e);
    if (!drag) { const h = px > GUTTER && hitAt(px, py); canvas.style.cursor = h ? (h.part ? 'ew-resize' : h.note ? 'pointer' : 'grab') : py < 30 ? 'text' : 'default'; return; }
    if (drag.kind === 'key') { const d = (px - drag.x0) / view.ppb; if (Math.abs(px - drag.x0) > 2) drag.moved = true; if (drag.moved) api.dragTo(drag.start, d, e.altKey, drag.part); }
    else if (drag.kind === 'scrub') api.seek(Math.max(0, bAt(px)));
    else if (drag.kind === 'loop') { const a = drag.b0, b = bAt(px); api.setLoop(Math.abs(b - a) > .25 ? [Math.min(a, b), Math.max(a, b)].map(api.snap) : null); }
    else if (drag.kind === 'lanes' && Math.hypot(px - drag.x0, py - drag.y0) > 4) { marquee = { x0: Math.min(drag.x0, px), x1: Math.max(drag.x0, px), y0: Math.min(drag.y0, py), y1: Math.max(drag.y0, py) }; draw(); }
  });
  canvas.addEventListener('pointerup', e => {
    const [px] = pos(e);
    if (drag?.kind === 'key') { if (drag.moved) api.dragEnd(); else if (e.detail === 2) api.seek(api.beatOf(drag.id)); }
    else if (drag?.kind === 'lanes') {
      if (marquee) { const ids = hits.filter(h => h.id && !h.part && h.x + h.w >= marquee.x0 && h.x <= marquee.x1 && h.y + h.h >= marquee.y0 && h.y <= marquee.y1).map(h => h.id); api.selectMany(ids, drag.add); }
      else { api.select(null); api.seek(Math.max(0, bAt(px))); }
    }
    drag = null; marquee = null; draw();
  });
  canvas.addEventListener('wheel', e => {
    e.preventDefault(); const [px] = pos(e);
    if (e.ctrlKey || e.metaKey) { const b = bAt(px), k = Math.exp(-e.deltaY * .01); view.ppb = Math.min(240, Math.max(2, view.ppb * k)); view.b0 = b - (px - GUTTER) / view.ppb; }
    else view.b0 += (Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY) / view.ppb;
    clampView(); draw();
  }, { passive: false });
  function clampView() { const m = api.model(), span = (W - GUTTER) / view.ppb; view.b0 = Math.max(-2, Math.min(m.total - span + 2, view.b0)); }
  return {
    draw,
    zoom(k) { const m = api.model(), c = m.beat; view.ppb = Math.min(240, Math.max(2, view.ppb * k)); view.b0 = c - (W - GUTTER) / 2 / view.ppb; clampView(); draw(); },
    fit() { const m = api.model(); view.ppb = (W - GUTTER - 10) / (m.total + 2); view.b0 = -1; draw(); },
    // keep the play head in sight while playing (a page turn), or centre a beat
    follow(b) { const span = (W - GUTTER) / view.ppb; if (b < view.b0 || b > view.b0 + span * .9) { view.b0 = b - span * .1; clampView(); } },
    centre(b) { view.b0 = b - (W - GUTTER) / 2 / view.ppb; clampView(); draw(); },
  };
}
