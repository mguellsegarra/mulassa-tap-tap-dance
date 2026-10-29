// Mouse on the four canvases: select, drag, drop, seek, zoom. A drag edits from the history it started with, so
// it is one undo step however long it lasts.
import { S, edit, editFrom, pick } from './state.js';
import { insertItem, moveItem, moveKnot, addKnot, setBalloon, addBalloon, setHold, addHold, setEnding } from './edits.js';
import { GUTTER, beatOf, xOf, hitOriginal, hitSequence, hitTempo, hitEvents, dropSlot, itemBlocks, tempoGeometry } from './tracks.js';

const DRAG = 5; // px before a press becomes a drag
const snap = (b, q) => Math.round(b / q) * q;
const local = (canvas, e) => { const r = canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
const over = (canvas, e) => { const r = canvas.getBoundingClientRect(); return e.clientX >= r.left && e.clientX < r.right && e.clientY >= r.top && e.clientY < r.bottom; };

// press(e, x, y) returns { move(e, dx, x, y), up(e, moved) } or nothing
function onPress(canvas, press) {
  canvas.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    const [x, y] = local(canvas, e), h = press(e, x, y);
    if (!h) return;
    canvas.setPointerCapture(e.pointerId);
    let moved = false;
    const move = ev => { const [mx, my] = local(canvas, ev); if (Math.abs(mx - x) > DRAG) moved = true; if (moved) h.move?.(ev, mx - x, mx, my); };
    const up = ev => { canvas.removeEventListener('pointermove', move); canvas.removeEventListener('pointerup', up); canvas.removeEventListener('pointercancel', up); h.up?.(ev, moved); };
    canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', up);
  });
}

// wheel scrolls the beats, Ctrl/Cmd + wheel (or a pinch) zooms round the pointer
function onWheel(canvas, view, api) {
  canvas.addEventListener('wheel', e => {
    e.preventDefault();
    const v = view(), [x] = local(canvas, e);
    if (e.ctrlKey || e.metaKey) {
      const at = beatOf(v, x);
      v.ppb = Math.max(1, Math.min(160, v.ppb * Math.exp(-e.deltaY * 0.01)));
      v.x0 = at - (x - GUTTER) / v.ppb;
    } else v.x0 += (e.deltaX || e.deltaY) / v.ppb;
    v.x0 = Math.max(-4, v.x0);
    api.redraw();
  }, { passive: false });
}

export function setupPointer(c, api) {
  const select = sel => { S.sel = sel; api.refresh(); };

  // ---- original: ruler seeks, a bracket selects its phrase (drag it into the sequence), bars select a range
  onPress(c.orig, (e, x, y) => {
    const hit = hitOriginal(S, x, y);
    if (!hit) return;
    if (hit.kind === 'ruler') { api.seekOriginal(hit.beat); return { move: (ev, dx, mx) => api.seekOriginal(beatOf(S.view.o, mx)) }; }
    if (hit.kind === 'phrase') {
      if (e.metaKey || e.ctrlKey || e.shiftKey) { pick('phrase', hit.phrase.id, e, S.form.phrases.map(p => p.id)); api.refresh(); return; }
      select({ kind: 'phrase', id: hit.phrase.id });
      return {
        move(ev) { api.ghost(hit.phrase.name, ev); api.setDrop(over(c.seq, ev) ? dropSlot(S, beatOf(S.view.s, local(c.seq, ev)[0])).beat : null); },
        up(ev, moved) {
          api.ghost(null); api.setDrop(null);
          if (moved && over(c.seq, ev)) { const { index } = dropSlot(S, beatOf(S.view.s, local(c.seq, ev)[0])); edit(insertItem, hit.phrase.id, index); select({ kind: 'item', id: S.form.sequence[index].id }); }
        },
      };
    }
    const from = e.shiftKey && S.range ? S.range[0] : hit.index;
    S.range = [from, hit.index]; api.refresh();
    return { move: (ev, dx, mx, my) => { const h = hitOriginal(S, Math.max(GUTTER, mx), my); if (h?.index !== undefined) { S.range = [from, h.index]; api.refresh(); } } };
  });

  // ---- sequence: a block selects its item (drag to reorder), anywhere else seeks
  onPress(c.seq, (e, x, y) => {
    const hit = hitSequence(S, x, y);
    if (!hit) return;
    if (hit.kind === 'seek') { api.seekBeat(hit.beat); return { move: (ev, dx, mx) => api.seekBeat(beatOf(S.view.s, mx)) }; }
    if (e.metaKey || e.ctrlKey || e.shiftKey) { pick('item', hit.item.id, e, S.form.sequence.map(s => s.id)); api.refresh(); return; }
    select({ kind: 'item', id: hit.item.id });
    return {
      move: (ev, dx, mx) => api.setDrop(dropSlot(S, beatOf(S.view.s, mx)).beat),
      up(ev, moved, mx = local(c.seq, ev)[0]) {
        api.setDrop(null);
        if (!moved) return;
        const { index } = dropSlot(S, beatOf(S.view.s, mx));
        if (index !== hit.index && index !== hit.index + 1) edit(moveItem, hit.item.id, index > hit.index ? index - 1 : index);
      },
    };
  });
  // a phrase dragged from the list
  c.seq.addEventListener('dragover', e => {
    if (!e.dataTransfer.types.includes('text/x-phrase')) return;
    e.preventDefault(); api.setDrop(dropSlot(S, beatOf(S.view.s, local(c.seq, e)[0])).beat);
  });
  c.seq.addEventListener('dragleave', () => api.setDrop(null));
  c.seq.addEventListener('drop', e => {
    const id = e.dataTransfer.getData('text/x-phrase');
    api.setDrop(null);
    if (!id) return;
    e.preventDefault();
    const { index } = dropSlot(S, beatOf(S.view.s, local(c.seq, e)[0]));
    if (edit(insertItem, id, index)) select({ kind: 'item', id: S.form.sequence[index].id });
  });

  // ---- tempo: drag a knot (beat and bpm), double-click adds one, a click elsewhere seeks
  onPress(c.tempo, (e, x, y) => {
    const hit = hitTempo(S, x, y, c.tempo.clientHeight);
    if (!hit) return;
    if (hit.kind === 'empty') { api.seekBeat(hit.beat); return; }
    select({ kind: 'knot', i: hit.i });
    const base = S.h, tl = S.tl, t = tempoGeometry(S, c.tempo.clientHeight); // the scale it started with: no drift while the range follows the drag
    return {
      move(ev, dx, mx, my) {
        const b = Math.max(0, snap(beatOf(S.view.s, mx), 0.25));
        if (editFrom(base, moveKnot, hit.i, b, Math.max(20, t.bpmAt(my)), tl)) S.sel.i = S.form.tempo.knots.findIndex(k => k.at.beat === b); // sorting may have moved it
      },
    };
  });
  c.tempo.addEventListener('dblclick', e => {
    const [x, y] = local(c.tempo, e), hit = hitTempo(S, x, y, c.tempo.clientHeight);
    const b = Math.max(0, snap(hit?.beat ?? 0, 0.25));
    if (hit?.kind === 'empty' && edit(addKnot, b, hit.bpm, S.tl)) select({ kind: 'knot', i: S.form.tempo.knots.findIndex(k => k.at.beat === b) });
  });

  // ---- events: drag markers and ranges, double-click an empty row adds a GLOBUS / MANTÉN, a click seeks
  onPress(c.events, (e, x, y) => {
    const hit = hitEvents(S, x, y);
    if (!hit) return;
    if (hit.kind === 'empty') { api.seekBeat(hit.beat); return; }
    const sh = hit.shape, base = S.h, b0 = hit.beat;
    select(sh.kind === 'ending' ? { kind: 'ending', key: sh.key } : sh.kind === 'intro' ? { kind: 'intro' } : { kind: sh.kind, i: sh.i });
    if (sh.kind === 'intro') return;
    return {
      move(ev, dx, mx) {
        const b = beatOf(S.view.s, mx), d = b - b0;
        if (sh.kind === 'ending') {
          // the finale clings to an item's start when dropped near one
          const near = sh.key === 'finale' && itemBlocks(S).find(k => k.s != null && Math.abs(xOf(S.view.s, k.s) - mx) < 8);
          editFrom(base, setEnding, sh.key, near ? { item: near.item.id, edge: 'start' } : { beat: Math.max(0, Math.round(b)) });
        } else if (sh.kind === 'balloon') {
          const s = hit.part === 'end' ? sh.s : sh.s + d, en = hit.part === 'start' ? sh.e : sh.e + d;
          editFrom(base, setBalloon, sh.i, Math.max(0, s), en);
        } else {
          const s = hit.part === 'end' ? sh.s : snap(sh.s + d, 0.25), en = hit.part === 'start' ? sh.e : snap(sh.e + d, 0.25);
          if (en > s && s >= 0) editFrom(base, setHold, sh.i, { ...(hit.part !== 'end' && { start: { beat: s } }), ...(hit.part !== 'start' && { end: { beat: en } }) });
        }
      },
    };
  });
  c.events.addEventListener('dblclick', e => {
    const [x, y] = local(c.events, e), hit = hitEvents(S, x, y);
    if (hit?.kind !== 'empty') return;
    const b = Math.max(0, Math.round(hit.beat));
    if (hit.row === 1 && edit(addBalloon, b, b + 4)) select({ kind: 'balloon', i: S.form.events.balloons.length - 1 });
    if (hit.row === 2 && edit(addHold, b, b + 2, 'don')) select({ kind: 'hold', i: S.form.events.holds.length - 1 });
  });

  for (const k of ['orig', 'seq', 'tempo', 'events']) onWheel(c[k], () => S.view.s, api); // one scroll for all: the original's offset is constant
}
