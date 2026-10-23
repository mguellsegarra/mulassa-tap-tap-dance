// The figure dropdown of Classificació and the Saló de la fama: a button (the figure's pixel portrait, its name, a chevron)
// that opens «Tria figura» (big options: the selector's vector illustration; pixel art only where it is small) in place of the sheet's main view (index.html `.board-figure`, `.board-picker`; CSS in base.css).
// The shown figure is cream; picking one, Escape or × (the sheet's own handler asks `open`) come back.
import { FIGURES, hasBoard, portraitArt, portraitPalette } from '../game/figures.js';
import { pixelSvg } from './select-strip.js';
import { SELECTOR_PORTRAITS } from './selector-portraits.js';

export const PICKER_FIGURES = FIGURES.filter(hasBoard); // one board each
export const figurePortrait = f => pixelSvg(portraitArt(f), portraitPalette(f), '#2a1a10');
// «Drac» big, «de Valls» small under it (Marc: other towns' Dracs will come): one designed second line, never a wrap
function nameInto(doc, into, f) {
  const rest = f.fullName?.startsWith(f.name) ? f.fullName.slice(f.name.length).trim() : '';
  const t = doc.createElement('span'); t.className = 'fig-t'; t.textContent = rest;
  into.replaceChildren(f.name, ...(rest ? [' ', t] : []));
}

// ids: { button, pic, name, picker, list, main } of the sheet `menu`; prefix: the options' ids (`${prefix}${figure.id}`)
export function setupFigurePicker({ doc, menu, ids, prefix, focusIn, onPick }) {
  const get = id => doc.getElementById(id), button = get(ids.button), picker = get(ids.picker), main = get(ids.main);
  let current = null;
  const options = PICKER_FIGURES.map(f => {
    const b = doc.createElement('button');
    b.className = 'btn btn-secondary board-option'; b.type = 'button'; b.id = `${prefix}${f.id}`; b.dataset.figure = f.id;
    const pic = doc.createElement('span'); pic.className = 'board-pic'; pic.innerHTML = SELECTOR_PORTRAITS[f.id] ?? figurePortrait(f);
    const name = doc.createElement('span'); name.className = 'board-option-name'; nameInto(doc, name, f);
    b.append(pic, name);
    b.addEventListener('click', () => { show(false); onPick(f.id); });
    get(ids.list).appendChild(b);
    return b;
  });
  function show(on) {
    if (on === !picker.hidden) return;
    picker.hidden = !on; main.hidden = on;
    button.setAttribute('aria-expanded', String(on));
    if (menu.open) focusIn(menu, on ? `${prefix}${current}` : ids.button);
  }
  button.addEventListener('click', () => show(picker.hidden));
  menu.addEventListener('cancel', e => { if (!picker.hidden) { e.preventDefault(); show(false); } });
  return {
    show,
    get open() { return !picker.hidden; },
    // the button and the cream option say this figure
    paint(id) {
      const f = PICKER_FIGURES.find(x => x.id === id) ?? PICKER_FIGURES[0];
      current = f.id;
      for (const b of options) b.setAttribute('aria-pressed', String(b.dataset.figure === f.id));
      get(ids.pic).innerHTML = figurePortrait(f); nameInto(doc, get(ids.name), f);
    },
  };
}
