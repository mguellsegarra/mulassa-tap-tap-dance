// The editor's one state object and the edit entry point every control goes through.
import { compileForm, compileOriginal } from '../../../src/music-form/compile.js';
import { commit, history } from './edits.js';

export const S = {
  song: null, score: null, h: null, saved: null, revision: null, // saved = the form on disk (dirty = h.now !== saved)
  get form() { return this.h.now; },
  tl: null, orig: null,
  sel: null,     // { kind: 'item'|'phrase'|'knot'|'balloon'|'hold'|'ending'|'intro', id?, i?, key? }
  range: null,   // [from, to] occurrence indices on the original
  // one zoom and scroll for every lane; the original is shifted by `off` beats so its pickup sits over the sequence's
  // (the game's intro has no counterpart in the original)
  off: 0,
  view: { s: { x0: -1, ppb: 8 }, get o() { return { x0: this.s.x0 - S.off, ppb: this.s.ppb }; } },
  track: 'seq',  // what the transport plays: 'seq' (the sequence) or 'orig' (the original, synth only)
  loop: false, source: 'synth', gen: null, // gen = { buffer, revision } of the last generated mp3
  generating: false,
};
export const hooks = { changed() {}, status() {} };

export function load(form, score, revision) {
  Object.assign(S, { score, h: history(form), saved: form, revision, sel: null, range: null, gen: null, source: 'synth' });
  S.orig = compileOriginal(form, score);
  recompile();
}
export function recompile() {
  S.tl = compileForm(S.form, S.score);
  const p = S.tl.occurrences[0], src = p && S.orig?.occurrences.find(o => o.unfolded === p.unfolded);
  S.off = src ? p.start - src.start : 0;
  try { hooks.changed(); } catch (e) { hooks.status(e.message, 'err'); } // a view that can't follow never undoes the edit
}
export const dirty = () => S.h.now !== S.saved;

// fn(form, ...args) -> new form; a throw is shown, never applied. `base` = a history to replace from (a drag in
// progress commits once: every move restarts from the history it began with)
export function edit(fn, ...args) { return editFrom(S.h, fn, ...args); }
export function editFrom(base, fn, ...args) {
  let next;
  try { next = fn(base.now, ...args); } catch (e) { hooks.status(e.message, 'err'); return false; }
  S.h = commit(base, next);
  recompile(); // the original (S.orig) never changes: no edit touches source.unfolded
  return true;
}
export function setHistory(h) { S.h = h; recompile(); }

// several items / phrases: S.sel = { kind, id, ids } — `id` is the anchor (what the inspector shows, where shift
// extends from), `ids` everything selected. Plain click: one; Cmd/Ctrl: toggle; Shift: the run from the anchor.
export const selIds = kind => (S.sel?.kind === kind ? S.sel.ids ?? [S.sel.id] : []);
export function pick(kind, id, e, order) {
  const ids = selIds(kind);
  if ((e.metaKey || e.ctrlKey) && ids.length) {
    const next = ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id];
    S.sel = next.length ? { kind, id: next.includes(S.sel.id) ? S.sel.id : next.at(-1), ids: next } : null;
  } else if (e.shiftKey && ids.length) {
    const a = order.indexOf(S.sel.id), b = order.indexOf(id);
    S.sel = { kind, id: S.sel.id, ids: order.slice(Math.min(a, b), Math.max(a, b) + 1) };
  } else S.sel = { kind, id, ids: [id] };
}
