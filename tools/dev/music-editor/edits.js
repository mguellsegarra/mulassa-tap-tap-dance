// Pure edits of a music form (src/music-form/CONTRACT.md) and the undo stack over them. Every edit returns a NEW form
// (the old one stays in the history untouched); an edit that makes no sense throws, with the message the editor shows.

const clone = form => structuredClone(form);
// the first `${prefix}${n}` not used by any id in `list`
export const nextId = (prefix, list) => { const used = new Set(list.map(x => x.id)); let n = 1; while (used.has(prefix + n)) n++; return prefix + n; };
const itemIndex = (form, id) => { const i = form.sequence.findIndex(s => s.id === id); if (i < 0) throw new Error(`No hi ha l’element ${id}`); return i; };
const phraseOf = (form, id) => { const p = form.phrases.find(p => p.id === id); if (!p) throw new Error(`No hi ha la frase ${id}`); return p; };
const checkBars = (form, bars) => {
  if (!bars.length) throw new Error('Una frase necessita com a mínim un compàs');
  const known = new Set(form.source.unfolded.map(u => u.id));
  for (const b of bars) if (!known.has(b)) throw new Error(`El compàs ${b} no és a l’original`);
};
const move = (list, from, to) => { const [x] = list.splice(from, 1); list.splice(Math.max(0, Math.min(list.length, to)), 0, x); };

// ---- phrases (on the original)
export function addPhrase(form, bars, name) {
  checkBars(form, bars);
  const f = clone(form), id = nextId('p', f.phrases);
  f.phrases.push({ id, name: name || `Frase ${f.phrases.length + 1}`, bars: [...bars] });
  return f;
}
export function renamePhrase(form, id, name) {
  const f = clone(form); phraseOf(f, id).name = name.trim() || phraseOf(form, id).name; return f;
}
export function recutPhrase(form, id, bars) {
  checkBars(form, bars);
  const f = clone(form); phraseOf(f, id).bars = [...bars]; return f;
}
export function removePhrase(form, id) {
  phraseOf(form, id);
  if (form.sequence.some(s => s.phrase === id)) throw new Error('Aquesta frase sona a la seqüència: treu-la’n primer');
  const f = clone(form); f.phrases = f.phrases.filter(p => p.id !== id); return f;
}

// ---- the sequence
export function insertItem(form, phrase, at = form.sequence.length, label) {
  phraseOf(form, phrase);
  const f = clone(form), id = nextId('s', f.sequence);
  f.sequence.splice(Math.max(0, Math.min(f.sequence.length, at)), 0,
    { id, phrase, label: label ?? f.sequence[at - 1]?.label ?? f.labels[0], repeat: 1, beatScale: 1, bars: null, barOverrides: {} });
  return f;
}
export function moveItem(form, id, to) { const f = clone(form); move(f.sequence, itemIndex(f, id), to); return f; }
export function removeItem(form, id) { const f = clone(form); f.sequence.splice(itemIndex(f, id), 1); return f; }
export function duplicateItem(form, id) {
  const f = clone(form), i = itemIndex(f, id);
  f.sequence.splice(i + 1, 0, { ...structuredClone(f.sequence[i]), id: nextId('s', f.sequence) });
  return f;
}
// patch: label / repeat / beatScale / phrase
export function setItem(form, id, patch) {
  if (patch.repeat !== undefined && !(Number.isInteger(patch.repeat) && patch.repeat >= 1)) throw new Error('Les repeticions han de ser 1 o més');
  if (patch.beatScale !== undefined && ![0.5, 1, 2].includes(patch.beatScale)) throw new Error('Escala no vàlida');
  if (patch.label !== undefined && !form.labels.includes(patch.label)) throw new Error(`Etiqueta desconeguda: ${patch.label}`);
  if (patch.phrase !== undefined) phraseOf(form, patch.phrase);
  const f = clone(form); Object.assign(f.sequence[itemIndex(f, id)], patch); return f;
}
// the bars an item plays: its own list, else its phrase's
export const itemBars = (form, item) => item.bars ?? phraseOf(form, item.phrase).bars;
export function setItemBars(form, id, bars) {
  const f = clone(form), item = f.sequence[itemIndex(f, id)];
  if (bars) checkBars(form, bars);
  // back to the phrase's own list = no override
  item.bars = !bars || bars.join() === phraseOf(f, item.phrase).bars.join() ? null : [...bars];
  for (const b of Object.keys(item.barOverrides ?? {})) if (!itemBars(f, item).includes(b)) delete item.barOverrides[b];
  return f;
}
export function moveBar(form, id, index, delta) {
  const bars = [...itemBars(form, form.sequence[itemIndex(form, id)])];
  if (index + delta < 0 || index + delta >= bars.length) return form;
  move(bars, index, index + delta);
  return setItemBars(form, id, bars);
}
export function removeBar(form, id, index) {
  const bars = itemBars(form, form.sequence[itemIndex(form, id)]).filter((_, i) => i !== index);
  return setItemBars(form, id, bars);
}
// patch { notes?, beatScale? }; an empty string / null clears that field, an empty override goes away
export function setBarOverride(form, id, bar, patch) {
  const f = clone(form), item = f.sequence[itemIndex(f, id)];
  const o = { ...item.barOverrides?.[bar], ...patch };
  for (const k of Object.keys(o)) if (o[k] === '' || o[k] == null) delete o[k];
  item.barOverrides = { ...item.barOverrides };
  if (Object.keys(o).length) item.barOverrides[bar] = o; else delete item.barOverrides[bar];
  return f;
}

// ---- song-wide
export function setIntro(form, patch) { const f = clone(form); f.intro = { ...f.intro, ...patch }; return f; }

// ---- tempo knots. The compiler wants them in ascending beats: a placed knot goes in before the first knot that
// resolves later (tl = the current timeline, for the knots anchored to items)
function placeKnot(f, knot, tl) {
  const at = k => resolveAnchor(k.at, tl ?? { itemSpans: [], occurrences: [] }) ?? Infinity;
  const i = f.tempo.knots.findIndex(k => at(k) > knot.at.beat);
  f.tempo.knots.splice(i < 0 ? f.tempo.knots.length : i, 0, knot);
  return f;
}
export function addKnot(form, beat, bpm, tl) {
  return placeKnot(clone(form), { at: { beat }, bpm: Math.round(bpm * 10) / 10 }, tl);
}
// moving a knot pins it to an absolute beat
export function moveKnot(form, i, beat, bpm, tl) {
  const f = clone(form), [k] = f.tempo.knots.splice(i, 1);
  return placeKnot(f, { ...k, at: { beat }, bpm: Math.round(bpm * 10) / 10 }, tl);
}
export function setKnotBpm(form, i, bpm) {
  if (!(bpm > 0)) throw new Error('El tempo ha de ser positiu');
  const f = clone(form); f.tempo.knots[i].bpm = Math.round(bpm * 10) / 10; return f;
}
export function removeKnot(form, i) {
  if (form.tempo.knots.length <= 1) throw new Error('El tempo necessita com a mínim un punt');
  const f = clone(form); f.tempo.knots.splice(i, 1); return f;
}

// ---- events: balloons (whole beats) and holds
const wholeRange = (s, e) => { s = Math.round(s); e = Math.round(e); if (e <= s) e = s + 1; return [s, e]; };
export function addBalloon(form, start, end) {
  const f = clone(form); [start, end] = wholeRange(start, end);
  f.events.balloons.push({ id: nextId('g', f.events.balloons), start: { beat: start }, end: { beat: end } });
  return f;
}
export function setBalloon(form, i, start, end) {
  const f = clone(form); [start, end] = wholeRange(start, end);
  Object.assign(f.events.balloons[i], { start: { beat: start }, end: { beat: end } });
  return f;
}
export function addHold(form, start, end, kind = 'don') {
  if (end <= start) throw new Error('Un MANTÉN ha d’acabar després de començar');
  const f = clone(form); f.events.holds.push({ id: nextId('h', f.events.holds), start: { beat: start }, end: { beat: end }, kind }); return f;
}
// patch: { start?, end? } as anchors, kind?
export function setHold(form, i, patch) {
  if (patch.kind && !['don', 'ka'].includes(patch.kind)) throw new Error('Un MANTÉN és don o ka');
  const f = clone(form); Object.assign(f.events.holds[i], patch); return f;
}
export function removeEvent(form, kind, i) { const f = clone(form); f.events[kind].splice(i, 1); return f; }
// key: finale | roll | hit
export function setEnding(form, key, anchor) { const f = clone(form); f.ending = { ...f.ending, [key]: anchor }; return f; }

// ---- anchors → arranged beats, from a compiled timeline (the editor draws form events where the compiler puts them)
export function resolveAnchor(a, tl) {
  if (!a) return null;
  if (a.beat !== undefined && a.item === undefined) return a.beat;
  const off = a.offset ?? 0;
  if (a.bar === undefined) {
    const spans = tl.itemSpans.filter(s => s[0] === a.item);
    if (!spans.length) return null;
    return (a.edge === 'end' ? Math.max(...spans.map(s => s[3])) : Math.min(...spans.map(s => s[2]))) + off;
  }
  const occ = tl.occurrences.find(o => o.item === a.item && o.iteration === (a.iteration ?? 0) && o.unfolded === a.bar);
  if (!occ) return null;
  if (a.note === undefined) return occ.start + off;
  const note = occ.notes.at(a.note);
  return note ? note[0] + off : null;
}

// ---- undo / redo: a list of forms and a cursor
export const history = form => ({ past: [], now: form, future: [] });
export const commit = (h, form) => form === h.now ? h : { past: [...h.past, h.now].slice(-200), now: form, future: [] };
export const undo = h => h.past.length ? { past: h.past.slice(0, -1), now: h.past.at(-1), future: [h.now, ...h.future] } : h;
export const redo = h => h.future.length ? { past: [...h.past, h.now], now: h.future[0], future: h.future.slice(1) } : h;
