// The page follows the selected figure's buttons (game/figure-theme.js): colours as custom properties on <body>
// (--gua… with the Mulassa's own as the CSS fallbacks), `fig-drac` for the few Drac-only rules, and the labels of the
// semantic DOM roles; only the portrait keeps its original markup.
import { onTheme, trf, figTheme } from '../game/figure-theme.js';
import { DRAC, portraitArt, portraitPalette } from '../game/figures.js';

const VARS = { gua: '--gua', guaLt: '--gua-lt', guaDk: '--gua-dk', pa: '--pa', paLt: '--pa-lt', paDk: '--pa-dk' };
// Bind semantic roles explicitly; no message is identified by its rendered words.
const figureDomText = [
  ['#pad .gua [data-fig], #controls-legend .note.gua + span [data-fig], #sync-menu .touch b:first-of-type, #sync-pad .gua', 'input.left'],
  ['#pad .pa [data-fig], #controls-legend .note.pa + span [data-fig], #sync-menu .touch b:last-of-type, #sync-pad .pa', 'input.right'],
  ['#controls-legend .note.guapa', 'input.both'],
  ['#controls-legend .note.guapa + span [data-fig]', 'hit.both'],
  ['#controls-legend small[data-fig]', 'help.energy'],
];
const figureDomAria = [['#pad .gua', 'input.leftAria'], ['#pad .pa', 'input.rightAria']];
// the default (Mulassa) theme never fires a switch, so it is applied once here: index.html's Catalan fallback text would otherwise stay in every language
const apply = t => {
  const b = document.body;
  b.classList.toggle('fig-drac', t.drac); b.classList.toggle('fig-bou', t.id === 'bou');
  for (const [k, v] of Object.entries(VARS)) t.id !== 'mulassa' ? b.style.setProperty(v, t.colors[k]) : b.style.removeProperty(v);
  for (const [selector, key] of figureDomText) document.querySelectorAll(selector).forEach(el => { el.textContent = trf(key); if (el.dataset.w) el.dataset.w = el.textContent; });
  document.querySelectorAll('#howto-portrait').forEach(face => { // «Com es juga»'s ÀNIM row: the HUD's portrait of who dances
    face.dataset.base ??= face.innerHTML; face.innerHTML = t.drac ? portraitSvg(DRAC) : face.dataset.base;
  });
  for (const [selector, key] of figureDomAria) document.querySelectorAll(selector).forEach(el => el.setAttribute('aria-label', trf(key)));
};
apply(figTheme);
onTheme(apply);

// the same pixels as hud/top.js paintMule(): a dark 1.8-unit square under every pixel, then the palette
function portraitSvg(figure) {
  const art = portraitArt(figure), pal = portraitPalette(figure), px = [];
  art.forEach((row, y) => [...row].forEach((k, x) => k !== '.' && px.push([x, y, k])));
  const by = {};
  for (const [x, y, k] of px) (by[pal[k]] ??= []).push(`M${x} ${y}h1v1h-1z`);
  return `<path fill="#2a1a10" d="${px.map(([x, y]) => `M${x - 0.4} ${y - 0.4}h1.8v1.8h-1.8z`).join('')}"/>` + Object.entries(by).map(([c, d]) => `<path fill="${c}" d="${d.join('')}"/>`).join('');
}
