// The two buttons' words and colours per figure: the Mulassa's GUA | PA | GUAPA!, the Drac's CRE | MA | CREMA!
// (flame yellow, light | purple, dark: apart in hue and lightness for every common colour blindness). Pure; the canvas (hud/sprites.js) and the DOM
// (ui/figure-theme-dom.js) subscribe with onTheme(). Switched only outside play, by figure-song's setFigureSong.
const MULASSA_COLORS = { gua: '#ff7a1a', guaLt: '#ffb56b', guaDk: '#b34d00', pa: '#14b8a6', paLt: '#6ee7d8', paDk: '#0a6e63' };
const DRAC_COLORS = { gua: '#ffc21f', guaLt: '#ffe38a', guaDk: '#a66f00', pa: '#b0188c', paLt: '#e46cc6', paDk: '#66084f' };
export const figThemes = {
  mulassa: { drac: false, colors: MULASSA_COLORS, chant: [['GUAPA,', 0], ['GUAPA…', 0.8], ['I GUAPA!', 1.8]] },
  drac: { drac: true, colors: DRAC_COLORS, chant: [['QUE', 0], ['CREMI', 0.8], ['LA PLAÇA!', 1.8]] },
};
export let figTheme = figThemes.mulassa;
const themeHooks = [], themeMemo = new Map();
export const onTheme = fn => themeHooks.push(fn);
export function setFigureTheme(drac) {
  const next = drac ? figThemes.drac : figThemes.mulassa;
  if (next === figTheme) return;
  figTheme = next; themeMemo.clear();
  themeHooks.forEach(fn => fn(next));
}
// Every Mulassa word the Drac says differently; ELS DOS ALHORA! (an error key) stays for both.
const THEME_SWAP = { GUAPA: 'CREMA', GLOBUS: 'CARRETILLES', 'PER PETAR': 'PEL TRO FINAL', GUA: 'CRE', PA: 'MA', 'LA MULASSA': 'EL DRAC', 'la Mulassa cau!': 'el Drac s’apaga!', 'la Mulassa': 'el Drac', 'S’HA DESMUNTAT': 'S’HA APAGAT',
  'Els portadors demanen un cafè': 'Cal tornar a encendre la metxa', 'HA PETAT!': 'TRO!' };
const THEME_RE = /\b(?:GUAPA|GLOBUS|GUA|PA)\b|PER PETAR|LA MULASSA|la Mulassa cau!|la Mulassa|S’HA DESMUNTAT|Els portadors demanen un cafè|HA PETAT!/g;
export function themed(s) { // the text as the selected figure says it (cached: the HUD asks every frame)
  if (!figTheme.drac || !s) return s; // a drumroll's input has no word: undefined stays undefined
  let r = themeMemo.get(s);
  if (r === undefined) themeMemo.set(s, r = s.replace(THEME_RE, m => THEME_SWAP[m]));
  return r;
}
