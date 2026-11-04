// The owner's notes on the clip (the tool's ✎ Nota): stop, tap a point of a format's frame (or none: the whole shot),
// write what to change. Each note keeps where it is (second, bar, section, shot, format, point), shows as a tick on the
// timeline and a numbered pin on its frame while its shot is on, and is saved on the dev server (notes-plugin.mjs:
// media/notes.json, where the agent reads it; pasted in the chat, long lists lost their middle), with this device's
// copy (localStorage) for when the server is away. «Copia les notes» still puts them on the clipboard as text.
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const fmtT = s => `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, '0')}`;

// ui: { bar, panel, timeline, frames } elements; ctx(): { t, bar, label, shot, cut, formats: { key: { el, name } } };
// pause(), seek(t)
export function createNotes(key, ui, ctx, { pause, seek }) {
  const notes = JSON.parse(localStorage.getItem(key) || '[]');
  for (const n of notes) n.id ??= Math.random().toString(36).slice(2, 12);
  const save = () => localStorage.setItem(key, JSON.stringify(notes));
  const server = body => fetch('/__videoclip/notes', { method: 'POST', headers: { 'content-type': 'application/json', 'x-videoclip': '1' }, body: JSON.stringify(body) })
    .then(r => (r.ok ? r.json() : Promise.reject(new Error(r.status)))).then(merge).catch(() => { state.textContent = 'notes només en aquest dispositiu (servidor no disponible)'; });
  // the server's list wins; a note only here (made while it was away) goes up
  function merge({ notes: list, deleted }) {
    const ids = new Set([...list.map(n => n.id), ...deleted]), mine = notes.filter(n => !ids.has(n.id)); // (a note deleted anywhere stays deleted)
    notes.splice(0, notes.length, ...list); save(); render(); state.textContent = `${list.length} notes desades al servidor`;
    for (const n of mine) server({ op: 'add', note: n });
  }
  let picking = false, draft = null, pinsKey = '';

  const btn = document.createElement('button'); btn.textContent = '✎ Nota'; btn.title = 'Nota en aquest moment (N)';
  const copy = document.createElement('button'); copy.textContent = 'Copia les notes';
  ui.bar.append(btn, copy);
  const list = document.createElement('div'); list.className = 'notes'; ui.panel.after(list);
  const state = document.createElement('span'); state.className = 'notes-state'; ui.bar.append(state);

  function start() { // stop and wait for a tap on a frame (or «Sense punt»)
    pause(); picking = true; document.body.classList.add('picking');
    const c = ctx(); draft = { id: Math.random().toString(36).slice(2, 12), t: +c.t.toFixed(2), mix: c.mix, bar: c.bar, label: c.label, shot: c.shot, cut: c.cut, fmt: null, x: null, y: null, text: '' };
    form();
  }
  function form() {
    ui.panel.innerHTML = `<b>Nota a ${fmtT(draft.t)}</b> · compàs ${draft.bar} · ${esc(draft.label)} · pla ${esc(draft.shot)}
      · ${draft.fmt ? `punt a ${esc(ctx().formats[draft.fmt]?.name ?? draft.fmt)}` : '<i>toca un punt del vídeo, o deixa-la per a tot el pla</i>'}
      <div class="note-form"><textarea rows="2" placeholder="Què hi canviaries?"></textarea><button data-a="save">Desa</button><button data-a="cancel">Cancel·la</button></div>`;
    const ta = ui.panel.querySelector('textarea'); ta.value = draft.text; ta.oninput = () => { draft.text = ta.value; };
    ui.panel.querySelector('[data-a=save]').onclick = () => { if (draft.text.trim()) { notes.push(draft); notes.sort((a, b) => a.t - b.t); save(); server({ op: 'add', note: draft }); } stop(); };
    ui.panel.querySelector('[data-a=cancel]').onclick = stop;
    setTimeout(() => ta.focus(), 0);
  }
  function stop() { picking = false; draft = null; document.body.classList.remove('picking'); ui.panel.textContent = ''; render(); }
  // a tap on a frame while picking: the point, in % of that frame
  ui.frames.addEventListener('pointerdown', e => {
    if (!picking) return;
    const el = e.target.closest('.frame'); if (!el) return;
    const fmt = Object.entries(ctx().formats).find(([, f]) => f.el === el)?.[0]; if (!fmt) return;
    const r = el.getBoundingClientRect();
    Object.assign(draft, { fmt, x: Math.round((e.clientX - r.left) / r.width * 100), y: Math.round((e.clientY - r.top) / r.height * 100) });
    form(); pinsKey = '';
  });
  btn.onclick = start;
  addEventListener('keydown', e => { if (e.key === 'n' && !/TEXTAREA|INPUT|SELECT/.test(e.target.tagName)) start(); });

  const asText = () => notes.map((n, i) => `${i + 1}. ${n.mix ? `[${n.mix}] ` : ''}${fmtT(n.t)} (compàs ${n.bar}, ${n.label}, pla ${n.shot}${n.fmt ? `, ${n.fmt} a x ${n.x}% y ${n.y}%` : ', tot el pla'}): ${n.text}`).join('\n');
  copy.onclick = async () => {
    const text = `Notes del videoclip (${notes.length}):\n${asText()}\n\n${JSON.stringify(notes)}`;
    try { await navigator.clipboard.writeText(text); copy.textContent = 'Copiades ✓'; }
    catch { prompt('Copia aquest text:', text); } // (a phone over http has no clipboard API)
    setTimeout(() => { copy.textContent = 'Copia les notes'; }, 1500);
  };

  // the list under the timeline, and the ticks on it
  function render() {
    list.innerHTML = notes.map((n, i) => `<div class="note"><button data-go="${i}">${i + 1} · ${fmtT(n.t)}</button>
      <span>${n.mix ? `[${esc(n.mix)}] ` : ''}${esc(n.label)} · ${esc(n.shot)}${n.fmt ? ` · ${esc(n.fmt)}` : ''}</span> <span class="txt">${esc(n.text)}</span> <button data-del="${i}" title="Esborra">✕</button></div>`).join('');
    list.querySelectorAll('[data-go]').forEach(b => { b.onclick = () => { pause(); seek(notes[+b.dataset.go].t, notes[+b.dataset.go].mix); }; });
    list.querySelectorAll('[data-del]').forEach(b => { b.onclick = () => { const [n] = notes.splice(+b.dataset.del, 1); save(); render(); server({ op: 'del', id: n.id }); }; });
    ui.timeline.querySelectorAll('.tick').forEach(e => e.remove());
    for (const [i, n] of notes.entries()) {
      if ((n.mix ?? null) !== ctx().mix) continue; // (each montage shows its own notes on its timeline)
      const k = document.createElement('div'); k.className = 'tick'; k.style.left = `${n.t / ctx().duration * 100}%`; k.title = `${i + 1}: ${n.text}`; ui.timeline.append(k);
    }
    pinsKey = '';
  }
  // each frame: the pins of the notes whose shot is on (same cut), numbered as in the list
  function tick() {
    const c = ctx(), on = notes.map((n, i) => [n, i]).filter(([n]) => n.fmt && n.cut === c.cut && (n.mix ?? null) === c.mix);
    if (draft?.fmt) on.push([draft, -1]);
    const k = `${c.layout}|${c.cut}|${on.map(([n, i]) => `${i}${n.fmt}${n.x}${n.y}`).join()}|${Object.keys(c.formats)}`;
    if (k === pinsKey) return; pinsKey = k;
    for (const [fmt, f] of Object.entries(c.formats)) {
      f.el.querySelectorAll('.pin').forEach(p => p.remove());
      for (const [n, i] of on) if (n.fmt === fmt) f.el.insertAdjacentHTML('beforeend', `<div class="pin" style="left:${n.x}%;top:${n.y}%">${i < 0 ? '•' : i + 1}</div>`);
    }
  }
  render();
  fetch('/__videoclip/notes').then(r => r.json()).then(merge).catch(() => { state.textContent = 'notes només en aquest dispositiu (servidor no disponible)'; });
  return { refresh: render, tick, picking: () => picking };
}
