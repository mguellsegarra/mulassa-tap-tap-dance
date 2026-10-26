// Per-figure buttons: the Mulassa's GUA | PA | GUAPA! and the Drac's CRE | MA | CREMA! (words, colours, DOM labels).
import assert from 'node:assert/strict';
// Literal oracle extracted with git show HEAD:src/game/figure-theme.js before migration.
const oldTheme = (() => {
  const figTheme = { drac: false }, themeMemo = new Map();
const THEME_SWAP = { GUAPA: 'CREMA', GLOBUS: 'CARRETILLES', 'PER PETAR': 'PEL TRO FINAL', GUA: 'CRE', PA: 'MA', 'LA MULASSA': 'EL DRAC', 'la Mulassa cau!': 'el Drac s’apaga!', 'la Mulassa': 'el Drac', 'S’HA DESMUNTAT': 'S’HA APAGAT',
  'Els portadors demanen un cafè': 'Cal tornar a encendre la metxa', 'HA PETAT!': 'TRO!' };
const THEME_RE = /\b(?:GUAPA|GLOBUS|GUA|PA)\b|PER PETAR|LA MULASSA|la Mulassa cau!|la Mulassa|S’HA DESMUNTAT|Els portadors demanen un cafè|HA PETAT!/g;
function themed(s) { // the text as the selected figure says it (cached: the HUD asks every frame)
  if (!figTheme.drac || !s) return s; // a drumroll's input has no word: undefined stays undefined
  let r = themeMemo.get(s);
  if (r === undefined) themeMemo.set(s, r = s.replace(THEME_RE, m => THEME_SWAP[m]));
  return r;
}
  return { themed, setFigureTheme: drac => { figTheme.drac = drac; themeMemo.clear(); } };
})();

// A minimal page: the elements the theme touches, as index.html marks them.
const el = (text, extra = {}) => ({ textContent: text, dataset: {}, attrs: { ...extra }, getAttribute(k) { return this.attrs[k]; }, setAttribute(k, v) { this.attrs[k] = v; } });
const word = el('GUA'), aria = el('', { 'aria-label': 'GUA, esquerra' }), legend = el('GUAPA!'), anim = el('index.html fallback text'), padWord = el('PA'), face = { dataset: {}, innerHTML: '<path fill="#c0283c"/>' };
padWord.dataset.w = 'PA';
const props = new Map(), classes = new Set();
globalThis.document = {
  body: { classList: { toggle: (c, on) => (on ? classes.add(c) : classes.delete(c)) }, style: { setProperty: (k, v) => props.set(k, v), removeProperty: k => props.delete(k) } },
  querySelectorAll: sel => sel.startsWith('#pad .gua [') ? [word] : sel.startsWith('#pad .pa [') ? [padWord] : sel === '#controls-legend .note.guapa + span [data-fig]' ? [legend] : sel === '#controls-legend small[data-fig]' ? [anim] : sel === '#pad .gua' ? [aria] : sel === '#howto-portrait' ? [face] : [],
};
const { setFigureSong } = await import('../../../src/game/figure-song.js');
const T = await import('../../../src/game/figure-theme.js'), { trf, practiceText } = T;
await import('../../../src/ui/figure-theme-dom.js');
assert.equal(anim.textContent, trf('help.energy'), 'the default theme is applied at load: the page\'s fallback text must not stay in another language');
const { MULASSA, DRAC, BOU } = await import('../../../src/game/figures.js');

// Captured complete Mulassa inputs before migration; the HEAD oracle produces the Drac outputs.
const originalMessages = {
  "practice.gua.touch": "Toca GUA quan la nota arribi a l’anella",
  "practice.gua.keys": "Prem ← o D quan la nota arribi a l’anella",
  "practice.pa.touch": "Toca PA quan la nota arribi a l’anella",
  "practice.pa.keys": "Prem → o K quan la nota arribi a l’anella",
  "practice.guapa.touch": "Toca GUA i PA alhora!",
  "practice.guapa.keys": "Prem ← i → alhora (o ESPAI)",
  "practice.hold.word": "MANTÉN",
  "practice.hold.touch": "Mantén premut fins al final de la barra",
  "practice.hold.keys": "Mantén la tecla fins al final de la barra",
  "practice.balloon.word": "GLOBUS",
  "practice.balloon.mash.touch": "Pica molt ràpid, amb qualsevol botó!",
  "practice.balloon.mash.keys": "Pica molt ràpid, amb qualsevol tecla!",
  "pop.pam": "PAM!",
  "pop.burst": "HA PETAT!",
  "pop.visca": "VISCA!",
  "chatter.heat": "QUINA CALOR!",
  "chatter.giant": "ON ÉS EL GEGANT?",
  "chatter.calcot": "UN CALÇOT, SISPLAU!",
  "chatter.valls": "VISCA VALLS!",
  "chatter.amunt": "AMUNT!",
  "chatter.rhythm": "QUIN RITME!",
  "chatter.mula": "MIRA, LA MULASSA!",
  "chatter.coca": "QUI VOL COCA?",
  "chatter.castells": "ENS VEIEM ALS CASTELLS!",
  "chatter.party": "QUINA FESTA!",
  "chatter.vinga": "VINGA, VINGA!",
  "results.collapseTitle": "LA MULASSA S’HA DESMUNTAT!",
  "results.collapseSub": "Els portadors demanen un cafè",
  "results.hintBothTouch": "GUAPA: toca els dos botons alhora",
  "results.hintBothKeys": "GUAPA: prem ← i → alhora",
  "collapse.line1": "LA MULASSA",
  "collapse.line2": "S’HA DESMUNTAT!",
  "input.left": "GUA",
  "input.right": "PA",
  "input.both": "GUAPA",
  "hit.left": "GUA!",
  "hit.right": "PA!",
  "hit.both": "GUAPA!",
  "input.leftAria": "GUA, esquerra",
  "input.rightAria": "PA, dreta",
  "help.energy": "Cada error desanima la plaça: si es buida, la Mulassa cau!",
  "practice.gua.word": "GUA",
  "practice.pa.word": "PA",
  "practice.guapa.word": "GUAPA"
};

// Every complete themed message is byte-identical to the old transform, for both figures.
for (const figure of ['mulassa', 'drac']) {
  oldTheme.setFigureTheme(figure === 'drac');
  for (const [semantic, original] of Object.entries(originalMessages)) {
    assert.equal(trf(semantic, figure), oldTheme.themed(original), figure + ': ' + semantic);
  }
}
assert.throws(() => trf('unknown'), /missing figure variant/);
assert.equal(trf(undefined), undefined);
const mulassa = () => {
  assert.equal(T.figTheme.drac, false);
  assert.deepEqual(T.figTheme.chant, [['GUAPA,', 0, 0.8], ['GUAPA…', 0.8, 0.8], ['I GUAPA!', 1.8, 1.6]]);
  assert.equal(T.figTheme.colors.gua, '#ff7a1a'); assert.equal(T.figTheme.colors.pa, '#14b8a6');
  assert(!classes.has('fig-drac') && props.size === 0, 'no overrides on the page');
};
mulassa();

assert(setFigureSong(DRAC));
for (const [i, id] of ['gua', 'pa', 'guapa', 'hold', 'balloon'].entries()) for (const device of ['word', 'touch', 'keys']) {
  const original = originalMessages['practice.' + id + (id === 'balloon' && device !== 'word' ? '.mash.' : '.') + device];
  assert.equal(practiceText(i, device), oldTheme.themed(original));
}
assert.deepEqual(T.figTheme.chant, [['QUE', 0, 0.8], ['CREMI', 0.8, 0.8], ['LA PLAÇA!', 1.8, 1.6]]);
assert.equal(word.textContent, 'CRE'); assert.equal(padWord.textContent, 'MA'); assert.equal(padWord.dataset.w, 'MA');
assert.equal(legend.textContent, 'CREMA!'); assert.equal(aria.attrs['aria-label'], 'CRE, esquerra');
assert.equal(anim.textContent, 'Cada error desanima la plaça: si es buida, el Drac s’apaga!');
assert(face.innerHTML.includes('#4a8a4c') && !face.innerHTML.includes('#c0283c'), 'the help shows the Drac’s portrait');
assert(classes.has('fig-drac')); assert.equal(props.get('--gua'), '#ffc21f'); assert.equal(props.get('--pa'), '#b0188c');
const lum = hex => { const [r, g, b] = hex.match(/\w\w/g).map(n => { const c = parseInt(n, 16) / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
assert(lum(T.figTheme.colors.gua) > 2.5 * lum(T.figTheme.colors.pa), 'CRE and MA differ in lightness, not only hue');

assert(setFigureSong(BOU));
assert(face.innerHTML.includes('#8f4124') && !face.innerHTML.includes('#c0283c'), 'the help shows the Bou’s portrait, not the Mulassa’s');
assert(/^<g transform="scale\(0\.66/.test(face.innerHTML), 'its 18×13 pixels shrink into the 12×10 box, as the HUD draws it');
assert(setFigureSong(MULASSA));
mulassa();
assert.equal(face.innerHTML, '<path fill="#c0283c"/>', 'and back to the Mulassa’s');
assert.equal(word.textContent, 'GUA'); assert.equal(padWord.dataset.w, 'PA'); assert.equal(legend.textContent, 'GUAPA!');
assert.equal(aria.attrs['aria-label'], 'GUA, esquerra'); assert.equal(anim.textContent, 'Cada error desanima la plaça: si es buida, la Mulassa cau!');
// the Bou: BRA | MA | BRAMA!, and a chant on the others' rhythm, rising to its rhyme
assert.deepEqual(T.figThemes.bou.chant, [['BOU!', 0, 0.8], ['QUE TOT…', 0.8, 0.8], ['HO MOU!', 1.8, 1.6]]);
assert.deepEqual(['input.left', 'input.right', 'hit.both'].map(k => trf(k, 'bou')), ['BRA', 'MA', 'BRAMA!']);
assert(lum(T.figThemes.bou.colors.gua) > 2.5 * lum(T.figThemes.bou.colors.pa), 'BRA and MA differ in lightness, not only hue');
console.log('figure-theme ok');
