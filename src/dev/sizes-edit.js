// ?sizes: set each selector figure's height beside the others (STAND, src/game/figures.js: the gegants = 1) by eye.
// Pick a card as usual (tap, arrows, town pills); the panel resizes it live. Edits stay on this device until «reinicia»;
// «copia» puts one JSON object with every figure's value on the clipboard, to paste over STAND.
// (The clipboard API needs https; on a LAN http page it falls back to a selectable box.)
import { FIGURES, INVITE, STAND, portraitStand } from '../game/figures.js';
import { store } from '../platform/storage.js';

const SIZES_KEY = 'dev-sizes', SIZES_STEP = 0.05, SIZES_MIN = 0.2, SIZES_MAX = 1.2;
export const clampStand = v => Math.round(Math.min(SIZES_MAX, Math.max(SIZES_MIN, v)) * 100) / 100;

export function setupSizesEdit({ doc = document } = {}) {
  let edits = {};
  try { edits = JSON.parse(store.get(SIZES_KEY)) || {}; } catch { /* a broken entry starts afresh */ }
  const all = [...FIGURES, INVITE], value = f => edits[f.id] ?? portraitStand(f);
  const strip = doc.getElementById('select-strip');
  const cardOf = f => strip?.querySelector(`.sel-card[data-id="${f.id}"]`);
  const selected = () => all.find(f => f.id === strip?.querySelector('.sel-card[aria-selected="true"]')?.dataset.id) ?? null;
  const apply = () => { for (const f of all) cardOf(f)?.style.setProperty('--s', value(f)); };
  const report = () => Object.fromEntries(all.map(f => [f.id, value(f)]));

  // --- overlay (the camera editor's look: a dev tool, not game UI)
  const box = doc.createElement('div');
  box.style.cssText = 'position:fixed;z-index:60;left:calc(env(safe-area-inset-left,0px) + 6px);bottom:calc(env(safe-area-inset-bottom,0px) + 6px);width:min(260px,calc(100vw - 12px));padding:6px 8px;border-radius:8px;background:#000d;color:#cfc;font:11px/1.35 ui-monospace,monospace';
  const title = doc.createElement('div'), row = doc.createElement('div'), area = doc.createElement('textarea');
  row.style.cssText = 'display:flex;gap:4px;flex-wrap:wrap;align-items:center;margin-top:5px';
  area.readOnly = true; area.style.cssText = 'display:none;width:100%;height:70px;margin-top:5px;font:10px ui-monospace,monospace;user-select:text;-webkit-user-select:text';
  const button = (label, fn) => {
    const b = doc.createElement('button');
    b.type = 'button'; b.textContent = label; b.addEventListener('click', fn);
    b.style.cssText = 'font:700 11px system-ui;min-width:32px;min-height:32px;padding:4px 8px;border:1px solid #8c8;border-radius:5px;background:#132;color:#cfc';
    row.append(b); return b;
  };
  const input = doc.createElement('input');
  input.type = 'number'; input.step = String(SIZES_STEP); input.min = String(SIZES_MIN); input.max = String(SIZES_MAX);
  input.style.cssText = 'width:58px;min-height:30px;font:12px ui-monospace,monospace';
  input.addEventListener('keydown', e => e.stopPropagation()); // the selector's arrow keys stay out of the field
  input.addEventListener('change', () => set(Number(input.value)));
  function set(v) {
    const f = selected();
    if (!f || !Number.isFinite(v)) return;
    edits[f.id] = clampStand(v);
    if (edits[f.id] === STAND[f.id]) delete edits[f.id]; // back at the code's value: no edit to keep
    store.set(SIZES_KEY, JSON.stringify(edits));
    apply(); render();
  }
  button('−', () => set(value(selected() ?? INVITE) - SIZES_STEP));
  row.append(input);
  button('+', () => set(value(selected() ?? INVITE) + SIZES_STEP));
  button('copia', () => {
    const text = JSON.stringify(report());
    area.value = text; area.style.display = 'block'; area.select();
    navigator.clipboard?.writeText(text).catch(() => { /* the selectable box stays */ });
  });
  button('reinicia', () => { edits = {}; store.remove(SIZES_KEY); area.style.display = 'none'; apply(); render(); });
  box.append(title, row, area);
  doc.body.append(box);

  function render() {
    const f = selected(), n = Object.keys(edits).length;
    title.textContent = f ? `${f.name} · ${f.id} · gegants = 1${n ? ` · ${n} canvis` : ''}` : 'Tria una figura';
    if (f && doc.activeElement !== input) input.value = String(value(f));
  }
  // the strip is built before this runs; selection changes are attribute flips on its cards
  if (strip) new MutationObserver(render).observe(strip, { subtree: true, attributes: true, attributeFilter: ['aria-selected'] });
  apply(); render();
  return { report, set };
}
