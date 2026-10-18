// Per-figure buttons: the Mulassa's GUA | PA | GUAPA! and the Drac's CRE | MA | CREMA! (words, colours, DOM labels).
import assert from 'node:assert/strict';

// A minimal page: the elements the theme touches, as index.html marks them.
const el = (text, extra = {}) => ({ textContent: text, dataset: {}, attrs: { ...extra }, getAttribute(k) { return this.attrs[k]; }, setAttribute(k, v) { this.attrs[k] = v; } });
const word = el('GUA'), aria = el('', { 'aria-label': 'GUA, esquerra' }), legend = el('GUAPA!'), anim = el('Si es buida, la Mulassa cau!'), padWord = el('PA'), face = { dataset: {}, innerHTML: '<path fill="#c0283c"/>' };
padWord.dataset.w = 'PA';
const props = new Map(), classes = new Set();
globalThis.document = {
  body: { classList: { toggle: (c, on) => (on ? classes.add(c) : classes.delete(c)) }, style: { setProperty: (k, v) => props.set(k, v), removeProperty: k => props.delete(k) } },
  querySelectorAll: sel => ({ '[data-fig]': [word, legend, anim, padWord], '[data-fig-aria]': [aria], '#howto-portrait': [face] }[sel]),
};
const { setFigureSong } = await import('../src/game/figure-song.js');
const T = await import('../src/game/figure-theme.js'), { themed } = T;
await import('../src/ui/figure-theme-dom.js');
const { MULASSA, DRAC } = await import('../src/game/figures.js');
const { STEPS } = await import('../src/game/practice.js');

const chip = ['GUA!', 'PA!', 'GUAPA!', 'ELS DOS ALHORA!', 'PAM!', 'PATAPAM!', 'GUAPÍSSIMA!'];
const mulassa = () => {
  assert.equal(T.figTheme.drac, false);
  assert.deepEqual(chip.map(themed), chip, 'the Mulassa says everything as before');
  assert.equal(themed('LA MULASSA'), 'LA MULASSA');
  assert.deepEqual(T.figTheme.chant, [['GUAPA,', 0], ['GUAPA…', 0.8], ['I GUAPA!', 1.8]]);
  assert.equal(T.figTheme.colors.gua, '#ff7a1a'); assert.equal(T.figTheme.colors.pa, '#14b8a6');
  assert(!classes.has('fig-drac') && props.size === 0, 'no overrides on the page');
};
mulassa();

assert(setFigureSong(DRAC));
assert.deepEqual(['GUA!', 'PA!', 'GUAPA!', 'ELS DOS ALHORA!', 'PAM!', 'HA PETAT!'].map(themed), ['CRE!', 'MA!', 'CREMA!', 'ELS DOS ALHORA!', 'PAM!', 'TRO!']);
assert.equal(themed(undefined), undefined, 'a drumroll has no word'); assert.equal(themed('GLOBUS'), 'TRACA'); assert.equal(themed('PATAPAM!'), 'PATAPAM!'); assert.equal(themed('GUAPÍSSIMA!'), 'GUAPÍSSIMA!', 'only whole words');
assert.deepEqual(T.figTheme.chant, [['QUE', 0], ['CREMI', 0.8], ['LA PLAÇA!', 1.8]]);
assert.equal(themed('LA MULASSA'), 'EL DRAC'); assert.equal(themed('S’HA DESMUNTAT!'), 'S’HA APAGAT!');
assert.equal(themed('LA MULASSA S’HA DESMUNTAT!'), 'EL DRAC S’HA APAGAT!');
assert.equal(themed('Els portadors demanen un cafè'), 'Cal tornar a encendre la metxa');
assert.equal(themed('GUAPA: toca els dos botons alhora'), 'CREMA: toca els dos botons alhora');
assert.equal(themed('MIRA, LA MULASSA!'), 'MIRA, EL DRAC!');
assert.deepEqual(STEPS.slice(0, 3).map(s => themed(s.word)), ['CRE', 'MA', 'CREMA']);
assert.equal(themed(STEPS[2].touch), 'Toca CRE i MA alhora!');
assert.equal(themed(STEPS[0].keys), STEPS[0].keys, 'key hints name arrows, not buttons');
assert.equal(word.textContent, 'CRE'); assert.equal(padWord.textContent, 'MA'); assert.equal(padWord.dataset.w, 'MA');
assert.equal(legend.textContent, 'CREMA!'); assert.equal(aria.attrs['aria-label'], 'CRE, esquerra');
assert.equal(anim.textContent, 'Si es buida, el Drac s’apaga!');
assert(face.innerHTML.includes('#4a8a4c') && !face.innerHTML.includes('#c0283c'), 'the help shows the Drac’s portrait');
assert(classes.has('fig-drac')); assert.equal(props.get('--gua'), '#ffc21f'); assert.equal(props.get('--pa'), '#b0188c');
const lum = hex => { const [r, g, b] = hex.match(/\w\w/g).map(n => { const c = parseInt(n, 16) / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
assert(lum(T.figTheme.colors.gua) > 2.5 * lum(T.figTheme.colors.pa), 'CRE and MA differ in lightness, not only hue');

assert(setFigureSong(MULASSA));
mulassa();
assert.equal(face.innerHTML, '<path fill="#c0283c"/>', 'and back to the Mulassa’s');
assert.equal(word.textContent, 'GUA'); assert.equal(padWord.dataset.w, 'PA'); assert.equal(legend.textContent, 'GUAPA!');
assert.equal(aria.attrs['aria-label'], 'GUA, esquerra'); assert.equal(anim.textContent, 'Si es buida, la Mulassa cau!');
console.log('figure-theme ok');
