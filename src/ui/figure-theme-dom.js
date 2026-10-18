// The page follows the selected figure's buttons (game/figure-theme.js): colours as custom properties on <body>
// (--gua… with the Mulassa's own as the CSS fallbacks), `fig-drac` for the few Drac-only rules, and the labels of the
// elements marked data-fig / data-fig-aria (their markup holds the Mulassa's wording, kept in data-base).
import { onTheme, themed } from '../game/figure-theme.js';
import { DRAC, portraitArt, portraitPalette } from '../game/figures.js';

const VARS = { gua: '--gua', guaLt: '--gua-lt', guaDk: '--gua-dk', pa: '--pa', paLt: '--pa-lt', paDk: '--pa-dk' };
onTheme(t => {
  const b = document.body;
  b.classList.toggle('fig-drac', t.drac);
  for (const [k, v] of Object.entries(VARS)) t.drac ? b.style.setProperty(v, t.colors[k]) : b.style.removeProperty(v);
  document.querySelectorAll('[data-fig]').forEach(el => { el.dataset.base ??= el.textContent; el.textContent = themed(el.dataset.base); if (el.dataset.w) el.dataset.w = el.textContent; });
  document.querySelectorAll('#howto-portrait').forEach(face => { // «Com es juga»'s ÀNIM row: the HUD's portrait of who dances
    face.dataset.base ??= face.innerHTML; face.innerHTML = t.drac ? portraitSvg(DRAC) : face.dataset.base;
  });
  document.querySelectorAll('[data-fig-aria]').forEach(el => { el.dataset.base ??= el.getAttribute('aria-label'); el.setAttribute('aria-label', themed(el.dataset.base)); });
});

// the same pixels as hud/top.js paintMule(): a dark 1.8-unit square under every pixel, then the palette
function portraitSvg(figure) {
  const art = portraitArt(figure), pal = portraitPalette(figure), px = [];
  art.forEach((row, y) => [...row].forEach((k, x) => k !== '.' && px.push([x, y, k])));
  const by = {};
  for (const [x, y, k] of px) (by[pal[k]] ??= []).push(`M${x} ${y}h1v1h-1z`);
  return `<path fill="#2a1a10" d="${px.map(([x, y]) => `M${x - 0.4} ${y - 0.4}h1.8v1.8h-1.8z`).join('')}"/>` + Object.entries(by).map(([c, d]) => `<path fill="${c}" d="${d.join('')}"/>`).join('');
}
