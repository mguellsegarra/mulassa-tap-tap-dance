// The chart editor under notes-propostes.html's lane: a note per half beat, one row per level (a note sits in the row
// of the easiest level that has it and echoes, paler, in the harder ones). Notes are [beat, 'don'|'ka', level, big,
// holdEndBeat], the shape handed back as JSON (the game's song.json keeps seconds; the page converts).
const COL = { don: '#ff7a1a', ka: '#14b8a6', gold: '#f5c518', cream: '#fff3d6', err: '#ff8a7a' };
const PX = 36, B0 = 11, RULER = 36, ROW = 46, LEVELS = ['FÀCIL', 'NORMAL', 'DIFÍCIL'];
const x = b => (b - B0) * PX + 10;

/** el: { canvas, scroll, head, tools, warn, undo }; opts: { end, parts, balloons, onChange(notes) (edits only), onSeek(beat),
 * onScroll(beat at the view's left edge) }. */
export function createEditor(el, { end, parts, balloons, onChange, onSeek, onScroll }) {
  let notes = [], tool = 'don', pendingHold = null, level = 1, quiet = false; // quiet: our own scroll, not the user's
  const undo = [], H = RULER + ROW * 3 + 6, W = (end + 2 - B0) * PX + 20;
  const inBalloon = b => balloons.some(([a, z]) => b > a - 1e-3 && b < z - 1e-3);
  const at = b => notes.find(n => n[0] === b);
  const show = () => { notes.sort((a, b) => a[0] - b[0]); draw(); warn(); };
  const commit = () => { show(); onChange(notes); };
  const save = () => { undo.push(JSON.stringify(notes)); if (undo.length > 200) undo.shift(); };

  function warn() {
    const out = [];
    for (let L = 0; L < 3; L++) {
      const n = notes.filter(v => v[2] <= L);
      n.forEach((v, i) => {
        const next = n[i + 1];
        if (next && next[0] - v[0] < 0.5) out.push(`${LEVELS[L]}: massa juntes al temps ${v[0]}`);
        if (L && v[4] && next && next[0] < v[4] + 1) out.push(`${LEVELS[L]}: la llarga del temps ${v[0]} ha d’acabar un temps abans de la següent`);
      });
    }
    for (const v of notes) if (inBalloon(v[0])) out.push(`Temps ${v[0]}: cau dins d’un globus i el joc no la mostrarà`);
    if (!notes.some(v => v[0] === end && v[3])) out.push(`Falta el GUAPA final (temps ${end})`);
    el.warn.textContent = [...new Set(out)].slice(0, 8).join(' · ') || 'Cap avís: compleix les regles del joc.';
    el.warn.dataset.ok = String(!out.length);
  }

  function draw() {
    const dpr = Math.min(devicePixelRatio || 1, 16000 / W), cv = el.canvas, g = cv.getContext('2d');
    cv.style.width = `${W}px`; cv.style.height = `${H}px`; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
    for (const [name, a, z] of parts) {
      g.fillStyle = '#fff3d60a'; g.fillRect(x(a), RULER, (z - a) * PX, ROW * 3);
      g.fillStyle = COL.gold; g.font = "800 13px 'Baloo 2', system-ui"; g.fillText(name, x(a) + 4, 14);
    }
    for (const [a, z] of balloons) { g.fillStyle = '#ff8fb133'; g.fillRect(x(a), RULER, (z - a) * PX, ROW * 3); }
    for (let h = B0 * 2; h <= end * 2 + 2; h++) {
      const b = h / 2; g.fillStyle = b % 4 === 0 ? '#fff3d640' : b % 1 === 0 ? '#fff3d61c' : '#fff3d60a';
      g.fillRect(x(b), RULER, 1, ROW * 3);
      if (b % 4 === 0) { g.fillStyle = '#fff3d699'; g.font = "600 11px 'Baloo 2', system-ui"; g.fillText(String(b), x(b) + 3, RULER - 4); }
    }
    for (let L = 1; L < 3; L++) { g.fillStyle = '#fff3d61a'; g.fillRect(0, RULER + ROW * L, W, 1); }
    g.fillStyle = '#f5c51814'; g.fillRect(0, RULER + ROW * level, W, ROW); // the level being played
    for (const v of notes) for (let L = v[2]; L < 3; L++) {
      const y = RULER + ROW * L + ROW / 2, cx = x(v[0]), echo = L > v[2], r = v[3] ? 13 : 10;
      g.globalAlpha = echo ? 0.3 : 1;
      if (v[4] && L > 0) { g.fillStyle = COL[v[1]] + 'aa'; g.fillRect(cx, y - 6, (v[4] - v[0]) * PX, 12); g.beginPath(); g.arc(x(v[4]), y, 6, 0, 7); g.fill(); }
      if (v[3]) {
        g.fillStyle = COL.don; g.beginPath(); g.arc(cx, y, r, Math.PI / 2, Math.PI * 1.5); g.fill();
        g.fillStyle = COL.ka; g.beginPath(); g.arc(cx, y, r, -Math.PI / 2, Math.PI / 2); g.fill();
      } else { g.fillStyle = COL[v[1]]; g.beginPath(); g.arc(cx, y, r, 0, 7); g.fill(); }
      g.strokeStyle = COL.cream; g.lineWidth = 1.5; g.beginPath(); g.arc(cx, y, r, 0, 7); g.stroke();
      if (pendingHold === v && !echo) { g.strokeStyle = COL.gold; g.lineWidth = 3; g.beginPath(); g.arc(cx, y, r + 4, 0, 7); g.stroke(); }
    }
    g.globalAlpha = 1;
  }

  function click(e) {
    const r = el.canvas.getBoundingClientRect(), px = e.clientX - r.left, py = e.clientY - r.top;
    const b = Math.round(((px - 10) / PX + B0) * 2) / 2;
    if (py < RULER) { onSeek(b); return; }
    const L = Math.max(0, Math.min(2, Math.floor((py - RULER) / ROW))), n = at(b);
    if (b < 12 || b > end) return;
    if (pendingHold) { // second click of «Allarga»: where it ends
      if (b >= pendingHold[0] + 2) { save(); pendingHold[4] = b; pendingHold[3] = 0; }
      pendingHold = null; commit(); return;
    }
    save();
    if (tool === 'del') { if (n) notes.splice(notes.indexOf(n), 1); else undo.pop(); }
    else if (tool === 'hold') {
      if (!n) { undo.pop(); return; }
      if (n[4]) n[4] = 0; else { pendingHold = n; undo.pop(); }
    } else if (n) { // GUA / PA / GUAPA on a note: its side or GUAPA, and from this row's level
      if (tool === 'big') n[3] = n[3] ? 0 : 1, n[4] = 0; else { n[1] = tool; n[3] = 0; }
      n[2] = L;
    } else notes.push([b, tool === 'big' ? 'don' : tool, L, tool === 'big' ? 1 : 0, 0]);
    commit();
  }
  el.canvas.addEventListener('click', click);
  el.tools.addEventListener('click', e => {
    const t = e.target.closest('[data-tool]'); if (!t) return;
    tool = t.dataset.tool; pendingHold = null; sync(); draw();
  });
  const sync = () => el.tools.querySelectorAll('[data-tool]').forEach(t => t.setAttribute('aria-pressed', String(t.dataset.tool === tool)));
  const back = () => { if (undo.length) { notes = JSON.parse(undo.pop()); pendingHold = null; commit(); } };
  el.undo.addEventListener('click', back);
  addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && e.code === 'KeyZ') { e.preventDefault(); back(); return; }
    if (e.target.closest?.('input, textarea')) return;
    const k = { Digit1: 'don', Digit2: 'ka', Digit3: 'big', Digit4: 'hold', Digit5: 'del' }[e.code];
    if (k) { tool = k; pendingHold = null; sync(); draw(); }
  });
  el.scroll.addEventListener('scroll', () => { if (quiet) quiet = false; else onScroll((el.scroll.scrollLeft - 10) / PX + B0); }, { passive: true });
  const scrollTo = px => { px = Math.max(0, Math.min(Math.round(px), el.scroll.scrollWidth - el.scroll.clientWidth)); if (px !== el.scroll.scrollLeft) { quiet = true; el.scroll.scrollLeft = px; } };
  sync();

  return {
    /** Show a chart (no onChange): the version picked above, or a loaded file (keepUndo: «Desfés» brings back the old one). */
    set(list, keepUndo = false) { if (keepUndo) save(); notes = list.map(v => [...v]); pendingHold = null; show(); },
    level(L) { level = L; draw(); },
    view(b) { scrollTo(x(b)); }, // b at the left edge (onScroll's beat)
    get: () => notes.map(v => [...v]),
    playhead(b) { // a DOM line over the canvas: the long canvas is drawn only on edits
      el.head.hidden = b === null;
      if (b === null) return;
      const s = el.scroll, px = x(b);
      el.head.style.transform = `translateX(${px}px)`;
      if (px < s.scrollLeft + 40 || px > s.scrollLeft + s.clientWidth - 80) scrollTo(px - 80);
    },
  };
}
