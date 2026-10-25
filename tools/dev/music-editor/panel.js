// The side panel: the phrase list (drag a phrase into the sequence), the inspector of the selection, and the
// red list of anchors the compiler could not place. Rebuilt on every change; inputs commit on «change».
import { S, edit, pick, selIds } from './state.js';
import * as E from './edits.js';

const esc = s => String(s).replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
const opts = (list, cur) => list.map(([v, t]) => `<option value="${esc(v)}"${v === cur ? ' selected' : ''}>${esc(t)}</option>`).join('');
const SCALES = [[0.5, 'x2 (el doble de ràpid)'], [1, 'x1'], [2, 'x½ (la meitat de ràpid)']];
const anchorText = a => !a ? '—' : a.beat !== undefined && a.item === undefined ? `temps ${a.beat}`
  : `${a.item}${a.iteration ? `#${a.iteration}` : ''}${a.bar ? ` · ${a.bar}` : ''}${a.note !== undefined ? ` · nota ${a.note}` : ''}${a.edge ? ` · ${a.edge === 'end' ? 'final' : 'inici'}` : ''}${a.offset ? ` ${a.offset > 0 ? '+' : ''}${a.offset}` : ''}`;
const barName = id => { const u = S.form.source.unfolded.find(u => u.id === id); return u ? `c.${u.bar} (${u.section})` : id; };

// the original's selected range as unfolded ids
export const rangeBars = () => {
  if (!S.range) return [];
  const [a, b] = S.range[0] <= S.range[1] ? S.range : [S.range[1], S.range[0]];
  return S.orig.occurrences.slice(a, b + 1).map(o => o.unfolded);
};
export function newPhrase() {
  const bars = rangeBars();
  if (!bars.length) return false;
  if (!edit(E.addPhrase, bars)) return false;
  S.sel = { kind: 'phrase', id: S.form.phrases.at(-1).id };
  return true;
}

function phraseList() {
  const uses = id => S.form.sequence.filter(s => s.phrase === id).length;
  return `<h2>Frases</h2>
  <button class="tool" data-act="new-phrase"${rangeBars().length ? '' : ' disabled'} title="N">Nova frase${S.range ? ` (${rangeBars().length} c.)` : ''}</button>
  <ul class="phrases">${S.form.phrases.map(p => `<li draggable="true" data-phrase="${esc(p.id)}" class="${selIds('phrase').includes(p.id) ? 'on' : ''}">
    <span>${esc(p.name)}</span><small>${p.bars.length} c. · ${uses(p.id)}×</small></li>`).join('')}</ul>`;
}

function inspector() {
  const sel = S.sel, f = S.form;
  const many = sel?.ids?.length > 1 && sel.ids.length;
  if (many) return `<h2>${many} ${sel.kind === 'item' ? 'elements' : 'frases'} seleccionats</h2>
    <p class="hint">⌘C copia, Supr els treu${sel.kind === 'phrase' ? ' (les que no sonen a la seqüència)' : ''}. ⌘/⇧ + clic afegeix o treu de la selecció.</p>
    <div class="row"><button class="tool danger" data-act="del-many">Treu-los</button></div>`;
  if (!sel) return '<p class="hint">Selecciona compassos a l’original i fes «Nova frase», arrossega una frase a la seqüència, o clica un bloc o un esdeveniment.</p>';
  if (sel.kind === 'phrase') {
    const p = f.phrases.find(p => p.id === sel.id);
    if (!p) return '';
    return `<h2>Frase</h2>
    <label>Nom <input data-act="rename" value="${esc(p.name)}"></label>
    <p class="bars">${p.bars.map(barName).join(' · ')}</p>
    <div class="row"><button class="tool" data-act="append">Afegeix a la seqüència</button>
    <button class="tool" data-act="recut"${rangeBars().length ? '' : ' disabled'}>Talla amb la selecció</button>
    <button class="tool danger" data-act="del-phrase">Esborra</button></div>`;
  }
  if (sel.kind === 'item') {
    const item = f.sequence.find(s => s.id === sel.id);
    if (!item) return '';
    const bars = E.itemBars(f, item);
    return `<h2>Element ${esc(item.id)}</h2>
    <label>Frase <select data-act="item-phrase">${opts(f.phrases.map(p => [p.id, p.name]), item.phrase)}</select></label>
    <label>Etiqueta <select data-act="item-label">${opts(f.labels.map(l => [l, l]), item.label)}</select></label>
    <label>Repeticions <input type="number" min="1" step="1" data-act="item-repeat" value="${item.repeat}"></label>
    <label>Velocitat <select data-act="item-scale">${opts(SCALES.map(([v, t]) => [String(v), t]), String(item.beatScale))}</select></label>
    <div class="row"><button class="tool" data-act="dup" title="⌘D">Duplica</button><button class="tool danger" data-act="del-item" title="Supr">Treu</button>
    ${item.bars ? '<button class="tool" data-act="reset-bars">Compassos de la frase</button>' : ''}</div>
    <h3>Compassos${item.bars ? ' (propis)' : ''}</h3>
    <ol class="item-bars">${bars.map((b, i) => {
      const o = item.barOverrides?.[b] ?? {};
      return `<li data-bar="${esc(b)}" data-index="${i}"><div class="row"><b>${esc(barName(b))}</b>
        <button class="mini" data-act="bar-up" title="Amunt">↑</button><button class="mini" data-act="bar-down" title="Avall">↓</button>
        <button class="mini danger" data-act="bar-del" title="Treu"${bars.length > 1 ? '' : ' disabled'}>✕</button></div>
        <input data-act="bar-notes" placeholder="notes (p. ex. C5:1 R:1)" value="${esc(o.notes ?? '')}">
        <select data-act="bar-scale">${opts([['', 'velocitat de l’element'], ...SCALES.map(([v, t]) => [String(v), t])], o.beatScale === undefined ? '' : String(o.beatScale))}</select></li>`;
    }).join('')}</ol>`;
  }
  if (sel.kind === 'knot') {
    const k = f.tempo.knots[sel.i];
    if (!k) return '';
    return `<h2>Punt de tempo</h2><p>${esc(anchorText(k.at))}</p>
    <label>bpm <input type="number" step="0.1" data-act="knot-bpm" value="${k.bpm}"></label>
    <div class="row"><button class="tool danger" data-act="del-knot"${f.tempo.knots.length > 1 ? '' : ' disabled'}>Esborra</button></div>`;
  }
  if (sel.kind === 'balloon' || sel.kind === 'hold') {
    const list = sel.kind === 'balloon' ? f.events.balloons : f.events.holds, ev = list[sel.i];
    if (!ev) return '';
    return `<h2>${sel.kind === 'balloon' ? 'GLOBUS' : 'MANTÉN'} ${esc(ev.id)}</h2>
    <p>De ${esc(anchorText(ev.start))} a ${esc(anchorText(ev.end))}</p>
    ${sel.kind === 'hold' ? `<label>Costat <select data-act="hold-kind">${opts([['don', 'don (GUA)'], ['ka', 'ka (PA)']], ev.kind)}</select></label>` : ''}
    <div class="row"><button class="tool danger" data-act="del-event">Esborra</button></div>`;
  }
  if (sel.kind === 'ending') {
    return `<h2>${{ finale: 'FINAL ESBOJARRAT', roll: 'Redoble final', hit: 'Cop final' }[sel.key]}</h2>
    <p>${esc(anchorText(f.ending?.[sel.key]))}</p><p class="hint">Arrossega la marca; el final s’enganxa a l’inici d’un element.</p>`;
  }
  if (sel.kind === 'intro') {
    return `<h2>Introducció</h2>
    <label>Temps d’entrada <input type="number" min="0" step="1" data-act="intro-beats" value="${f.intro.beats}"></label>
    <p>Anacrusi: ${f.intro.pickup ? esc(barName(f.intro.pickup.bar)) : 'cap'}</p>`;
  }
  return '';
}

function unresolved() {
  const list = S.tl.unresolved ?? [];
  if (!list.length) return '';
  return `<h2 class="bad">Per arreglar (${list.length})</h2><ul class="unresolved">${list.map(u =>
    `<li data-path="${esc(u.path)}"><code>${esc(u.path)}</code> ${esc(u.message)}</li>`).join('')}</ul>`;
}

// a compiler path like events.holds[2] / sequence[3].bars → what to select
function selectPath(path) {
  const m = /^(sequence|phrases|tempo\.knots|events\.balloons|events\.holds|ending\.(\w+)|intro)(?:\[(\d+)\])?/.exec(path);
  if (!m) return null;
  const i = Number(m[3]);
  if (m[1] === 'sequence') return S.form.sequence[i] && { kind: 'item', id: S.form.sequence[i].id };
  if (m[1] === 'phrases') return S.form.phrases[i] && { kind: 'phrase', id: S.form.phrases[i].id };
  if (m[1] === 'tempo.knots') return { kind: 'knot', i };
  if (m[1] === 'events.balloons') return { kind: 'balloon', i };
  if (m[1] === 'events.holds') return { kind: 'hold', i };
  if (m[2]) return { kind: 'ending', key: m[2] };
  return { kind: 'intro' };
}

export function renderPanel(el) {
  el.querySelector('#phrases').innerHTML = phraseList();
  el.querySelector('#inspector').innerHTML = inspector();
  el.querySelector('#unresolved').innerHTML = unresolved();
}

export function setupPanel(el, api) {
  const item = () => S.form.sequence.find(s => s.id === S.sel?.id);
  const barOf = t => t.closest('[data-bar]');
  const ACT = {
    'new-phrase': () => newPhrase(),
    rename: t => edit(E.renamePhrase, S.sel.id, t.value),
    append: () => { if (edit(E.insertItem, S.sel.id)) S.sel = { kind: 'item', id: S.form.sequence.at(-1).id }; },
    recut: () => edit(E.recutPhrase, S.sel.id, rangeBars()),
    'del-phrase': () => { if (edit(E.removePhrase, S.sel.id)) S.sel = null; },
    'item-phrase': t => edit(E.setItem, S.sel.id, { phrase: t.value }),
    'item-label': t => edit(E.setItem, S.sel.id, { label: t.value }),
    'item-repeat': t => edit(E.setItem, S.sel.id, { repeat: Number(t.value) }),
    'item-scale': t => edit(E.setItem, S.sel.id, { beatScale: Number(t.value) }),
    dup: () => api.duplicate(),
    'del-item': () => api.remove(),
    'del-many': () => api.remove(),
    'reset-bars': () => edit(E.setItemBars, S.sel.id, null),
    'bar-up': t => edit(E.moveBar, S.sel.id, Number(barOf(t).dataset.index), -1),
    'bar-down': t => edit(E.moveBar, S.sel.id, Number(barOf(t).dataset.index), 1),
    'bar-del': t => edit(E.removeBar, S.sel.id, Number(barOf(t).dataset.index)),
    'bar-notes': t => edit(E.setBarOverride, S.sel.id, barOf(t).dataset.bar, { notes: t.value.trim() }),
    'bar-scale': t => edit(E.setBarOverride, S.sel.id, barOf(t).dataset.bar, { beatScale: t.value === '' ? null : Number(t.value) }),
    'knot-bpm': t => edit(E.setKnotBpm, S.sel.i, Number(t.value)),
    'del-knot': () => api.remove(),
    'hold-kind': t => edit(E.setHold, S.sel.i, { kind: t.value }),
    'del-event': () => api.remove(),
    'intro-beats': t => edit(E.setIntro, { beats: Math.max(0, Math.round(Number(t.value))) }),
  };
  const run = t => { const a = t.dataset.act; if (a && ACT[a]) { ACT[a](t, item()); api.refresh(); } };
  el.addEventListener('click', e => {
    const b = e.target.closest('button[data-act]');
    if (b) return run(b);
    const p = e.target.closest('[data-phrase]');
    if (p) { pick('phrase', p.dataset.phrase, e, S.form.phrases.map(x => x.id)); api.refresh(); }
    const u = e.target.closest('[data-path]');
    if (u) { S.sel = selectPath(u.dataset.path); api.refresh(); }
  });
  el.addEventListener('change', e => { if (e.target.matches('input[data-act], select[data-act]')) run(e.target); });
  el.addEventListener('dragstart', e => {
    const p = e.target.closest?.('[data-phrase]');
    if (!p) return;
    e.dataTransfer.setData('text/x-phrase', p.dataset.phrase);
    e.dataTransfer.effectAllowed = 'copy';
  });
}
