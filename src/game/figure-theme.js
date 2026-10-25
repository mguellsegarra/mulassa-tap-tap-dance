import { tr } from '../i18n/messages.js';
import themeMessages from '../i18n/locales/ca/figures.json' with { type: 'json' };
import { FIGURE_TRAITS } from '../figures/index.js';
// The two buttons' words and colours per figure: the Mulassa's GUA | PA | GUAPA!, the Drac's CRE | MA | CREMA!, the Bou's BRA | MA | BRAMA!
// (flame yellow, light | purple, dark; the Bou's sand | plum alike: apart in hue and lightness for every common colour blindness). Pure; the canvas (hud/sprites.js) and the DOM
// (ui/figure-theme-dom.js) subscribe with onTheme(). Switched only outside play, by figure-song's setFigureSong.
const MULASSA_COLORS = { gua: '#ff7a1a', guaLt: '#ffb56b', guaDk: '#b34d00', pa: '#14b8a6', paLt: '#6ee7d8', paDk: '#0a6e63' };
const DRAC_COLORS = { gua: '#ffc21f', guaLt: '#ffe38a', guaDk: '#a66f00', pa: '#b0188c', paLt: '#e46cc6', paDk: '#66084f' };
// the Bou's sand | plum (its carriers' tunics, darker and bluer than the Drac's magenta): light | dark again, apart for every colour blindness and in grey
const BOU_COLORS = { gua: '#f0d58a', guaLt: '#fff1c2', guaDk: '#a3832f', pa: '#6e2a62', paLt: '#b06aa6', paDk: '#3e0f36' };
export const figThemes = {
  mulassa: { drac: false, colors: MULASSA_COLORS, chant: [[tr('figures.chant.first.mulassa'), 0, 0.8], [tr('figures.chant.second.mulassa'), 0.8, 0.8], [tr('figures.chant.last.mulassa'), 1.8, 1.6]] },
  drac: { drac: true, colors: DRAC_COLORS, chant: [[tr('figures.chant.first.drac'), 0, 0.8], [tr('figures.chant.second.drac'), 0.8, 0.8], [tr('figures.chant.last.drac'), 1.8, 1.6]] },
  // the Bou's own words, BRA | MA | BRAMA!; its chant (BOU! / QUE TOT… / HO MOU!) rises to the rhyme,
  // like the others: «BRAMA, BOU!» first then a long fall read as a letdown wherever it was placed
  bou: { drac: false, colors: BOU_COLORS, chant: [[tr('figures.chant.first.bou'), 0, 0.8], [tr('figures.chant.second.bou'), 0.8, 0.8], [tr('figures.chant.last.bou'), 1.8, 1.6]] },
};
for (const k in figThemes) figThemes[k].id = k;
export let figTheme = figThemes.mulassa;
const themeHooks = [];
export const onTheme = fn => themeHooks.push(fn);
export function setFigureTheme(variant) { // 'mulassa' | 'drac' | 'bou' (true / false: the Drac / the Mulassa)
  const next = figThemes[variant === true ? 'drac' : variant === false ? 'mulassa' : variant] ?? figThemes.mulassa;
  if (next === figTheme) return;
  figTheme = next;
  themeHooks.forEach(fn => fn(next));
}
// Resolve semantic variants once; the HUD only reads cached strings.
const figureTextCache = { mulassa: {}, drac: {}, bou: {} };
for (const key of Object.keys(themeMessages)) {
  const variant = key.slice(key.lastIndexOf('.') + 1);
  const name = key.slice(8, key.lastIndexOf('.'));
  if (variant === 'all') for (const v in figureTextCache) figureTextCache[v][name] ??= tr(key); // one text for every figure; a variant key overrides it
  else if (Object.hasOwn(figureTextCache, variant)) figureTextCache[variant][name] = tr(key);
}
export function trf(key, figureId = figTheme.id) {
  if (key === undefined) return undefined; // drumroll input has no label
  const variant = FIGURE_TRAITS[figureId]?.key ?? figureId; // an id or already a variant
  const value = figureTextCache[variant]?.[key];
  if (value === undefined) throw new Error('i18n: missing figure variant ' + key + '.' + variant);
  return value;
}
const practiceMessageKeys = ['gua', 'pa', 'guapa', 'hold', 'balloon'].map(id => Object.fromEntries(['word', 'touch', 'keys'].map(device => [device, 'practice.' + id + (id === 'balloon' && device !== 'word' ? '.mash.' : '.') + device])));
export const practiceText = (index, device) => trf(practiceMessageKeys[index][device]);
export const FIGURE_CHATTER_KEYS = ["chatter.heat","chatter.giant","chatter.calcot","chatter.valls","chatter.amunt","chatter.rhythm","chatter.mula","chatter.coca","chatter.castells","chatter.party","chatter.vinga"];
