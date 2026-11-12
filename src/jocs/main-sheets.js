// mulassa.cat's own sheets on a game page: the ones the page names in <!-- mulassa-sheets: id … --> (vite.config.js puts them
// in a <template>), in the player's language, with the dim behind an open one and a tap on that dim as Escape. css: mulassa.cat's
// rules for them, kept inside them (they also name ids a game uses for its own: #music, #settings, #board-menu).
import { applyI18n } from '../i18n/apply-dom.js';
import { sheetFades } from '../ui/sheet-fade.js';
import { adoptWithin } from '#plassa/scoped-css.js';
import '../ui/backdrop.js'; // a tap on a sheet's dim backdrop = Escape (a game's closeOnBackdrop only knows its covers)

export function mountMainSheets(css = []) {
  if (css.length) adoptWithin(css.join('\n'), 'dialog.sheet');
  const template = document.getElementById('mulassa-sheets');
  // no copy: the page was built without vite.config.js's jocs-page step (a dev server started before it): say so, never fail silently
  if (!template) throw new Error('this page has no #mulassa-sheets: restart Vite so vite.config.js puts in mulassa.cat\'s sheets'); // i18n-ok: a developer's error, never shown
  const sheets = template.content;
  applyI18n(sheets); // the player's language (the page holds the Catalan)
  document.body.append(sheets);
  sheetFades(document);
  // the dim behind any open sheet (sheets.css .sheet-dim: an element, so a boot's warm() paints it too)
  const dim = Object.assign(document.createElement('div'), { className: 'sheet-dim', hidden: true });
  document.body.append(dim);
  new MutationObserver(() => { dim.hidden = !document.querySelector('dialog.sheet[open]'); }).observe(document.body, { subtree: true, attributeFilter: ['open'] });
}
