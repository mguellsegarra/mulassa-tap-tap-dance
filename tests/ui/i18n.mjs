// i18n: catalogue parity, messages/locale units, and a report-only scan for Catalan text still outside the catalogue.
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { mergeCatalog, setCatalog, tr } from '../../src/i18n/messages.js';
import { CA_PARTS } from '../../src/i18n/catalog.js';
import { lang, pickLang, localeMeta, LANGS, ALL_LANGS, setLang, initLang, resolveTag, applyDocumentLang, bootAliases } from '../../src/i18n/locale.js';
import { ACTIVE_CATALOG } from '../../src/i18n/catalog.js';
import { pseudoText, pseudoCatalog } from '../../src/i18n/pseudo.js';
import { renderBoot } from '../../tools/deploy/gen-boot.mjs';
import { TURNSTILE_LANG } from '../../src/services/captcha.js';
import vm from 'node:vm';
import { fmtNum } from '../../src/i18n/format.js';
import { loadLocale, localeState, assertParity } from '../../src/i18n/load-locale.js';
import { applyI18n, renderRich, richHtml, richTags } from '../../src/i18n/apply-dom.js';
import { JOKE_IDS } from '../../src/i18n/boot-jokes.js';

const root = new URL('../../src/', import.meta.url).pathname;
const NS = ['hud', 'game', 'ui', 'services', 'html', 'boot', 'figures'];
const read = p => JSON.parse(readFileSync(p, 'utf8'));
const ca = mergeCatalog(CA_PARTS);
// the SET of markers (a plural may have more or fewer forms than ca, each form is checked below)
const marks = s => [...new Set((typeof s === 'string' ? s : Object.values(s).join('|')).match(/\{\w+\}/g) ?? [])].sort().join();

// (a) every other locale mirrors ca: keys, {markers}, required plural forms
for (const code of readdirSync(join(root, 'i18n/locales')).filter(c => c !== 'ca')) {
  const other = mergeCatalog(NS.map(n => read(join(root, `i18n/locales/${code}/${n}.json`))));
  assert.deepEqual(Object.keys(other).sort(), Object.keys(ca).sort(), `${code}: keys differ from ca`);
  for (const [k, v] of Object.entries(other)) {
    assert.equal(marks(v), marks(ca[k]), `${code}.${k}: placeholders differ`);
    if (typeof v === 'string') assert.deepEqual(richTags(v), richTags(ca[k]), `${code}.${k}: inline tags (or their links) differ from ca`);
    if (typeof v === 'object') assert.ok('other' in v, `${code}.${k}: plural without other`);
  }
}

// (b) a key in two namespaces is an error; each key carries its file's prefix
assert.throws(() => mergeCatalog([{ 'a.x': '1' }, { 'a.x': '2' }]), /duplicate/);
NS.forEach((n, i) => { for (const k of Object.keys(CA_PARTS[i])) assert.ok(k.startsWith(n + '.'), `${k} not in ${n}.json`); });

// (c) messages.js and locale.js
setCatalog({ 'a.hi': 'Hola {name}!', 'a.n': { one: '{count} punt', other: '{count} punts' }, 'a.o': { other: 'x' } });
assert.equal(tr('a.hi', { name: 'Jan' }), 'Hola Jan!');
assert.equal(tr('a.n', { count: 1 }), '1 punt');
assert.equal(tr('a.n', { count: 2 }), '2 punts');
assert.throws(() => tr('a.nope'), /missing key/);
assert.throws(() => tr('a.hi'), /missing \{name\}/);
assert.throws(() => tr('a.n'), /count/);
setCatalog(ca);
assert.equal(lang(), 'ca');
assert.deepEqual(LANGS, ALL_LANGS, 'every edition is released');
assert(LANGS.length === 16 && LANGS[0] === 'ca');
assert.equal(localeMeta().dir, 'ltr');
assert.equal(pickLang(), 'ca');
assert.equal(pickLang({ url: 'xx', saved: 'ca' }), 'ca');
assert.equal(pickLang({ url: 'xx', saved: 'ca' }), 'ca', 'not in the allowlist');
assert.equal(pickLang({ url: 'es', saved: 'en', allowed: ['ca', 'es', 'en'] }), 'es');
assert.equal(pickLang({ saved: 'en', allowed: ['ca', 'en'] }), 'en');
assert.equal(fmtNum(12340), '12.340');
await loadLocale('ca');
assert.equal(localeState().status, 'ready');
await assert.rejects(loadLocale('xx'), /unknown language/);

// (e) index.html's static DOM: every data-i18n / data-i18n-attr text is the catalogue's text, and the catalogue holds nothing unused
{
  const html = readFileSync(new URL('../../index.html', import.meta.url), 'utf8').replace(/<script[\s\S]*?<\/script>/g, m => ' '.repeat(m.length));
  const ent = s => s.replace(/&#x([0-9a-f]+);/gi, (_, x) => String.fromCodePoint(parseInt(x, 16))).replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d))
    .replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&');
  const VOID = /^(meta|link|br|hr|img|input|source|path|circle|rect|ellipse|line|polyline|polygon|use)$/i;
  const TAG = /<!--[\s\S]*?-->|<(\/?)([a-z][\w-]*)((?:"[^"]*"|'[^']*'|[^>"'])*?)(\/?)>/gi;
  // the element's own text: the first non-blank text node among its direct children
  const ownText = at => {
    TAG.lastIndex = at; let depth = 0, from = at, m;
    while ((m = TAG.exec(html))) {
      if (depth === 0) { const t = html.slice(from, m.index); if (t.trim()) return ent(t.trim()); }
      if (!m[2]) { from = TAG.lastIndex; continue; }
      if (m[1]) { if (depth === 0) return ''; depth--; } else if (!m[4] && !VOID.test(m[2])) depth++;
      from = TAG.lastIndex;
    }
    return '';
  };
  // the element's inner markup, up to its own closing tag
  const innerOf = at => {
    TAG.lastIndex = at; let depth = 0, m;
    while ((m = TAG.exec(html))) {
      if (!m[2]) continue;
      if (m[1]) { if (depth === 0) return html.slice(at, m.index); depth--; } else if (!m[4] && !VOID.test(m[2])) depth++;
    }
    return '';
  };
  const fakeDoc = { createElement: name => ({ name, attrs: [], kids: [], setAttribute(k, v) { this.attrs.push([k, v]); }, append(...x) { this.kids.push(...x); } }) };
  const ser = n => (typeof n === 'string' ? n : n.name === 'br' ? '<br>'
    : `<${n.name}${n.attrs.map(([k, v]) => (v === '' ? ` ${k}` : ` ${k}="${v}"`)).join('')}>${n.kids.map(ser).join('')}</${n.name}>`);
  const used = new Set();
  let nodes = 0, attrs = 0, riches = 0;
  for (const m of html.matchAll(/<([a-z][\w-]*)((?:"[^"]*"|'[^']*'|[^>"'])*?)>/gi)) {
    const [, tag, a] = m, at = m.index + m[0].length;
    const key = a.match(/\sdata-i18n="([^"]+)"/)?.[1], pairs = a.match(/\sdata-i18n-attr="([^"]+)"/)?.[1], rich = a.match(/\sdata-i18n-rich="([^"]+)"/)?.[1];
    if (rich) { // the catalogue's inline markup is the page's, and the safe renderer rebuilds exactly it: Catalan renders identical with or without applyI18n
      assert.ok(rich in ca, `index.html <${tag}>: missing ${rich}`); used.add(rich); riches++;
      const inner = innerOf(at);
      assert.equal(inner, ca[rich], `index.html ${rich}: inline markup differs from the catalogue`);
      assert.equal(richHtml(ca[rich]), ca[rich], `${rich}: a tag, attribute or link outside the allowlist`);
      assert.equal(renderRich(fakeDoc, ca[rich]).map(ser).join(''), inner, `${rich}: rendered tree differs from the inline one`);
    }
    if (key) {
      assert.ok(key in ca, `index.html <${tag}>: missing ${key}`); used.add(key); nodes++;
      assert.equal(ownText(at), ca[key], `index.html ${key}: inline text differs from the catalogue`);
    }
    for (const pair of pairs?.split(';') ?? []) {
      const [attr, k] = [pair.slice(0, pair.indexOf(':')), pair.slice(pair.indexOf(':') + 1)];
      assert.ok(k in ca, `index.html <${tag}>: missing ${k}`); used.add(k); attrs++;
      const v = a.match(new RegExp(`\\s${attr}="([^"]*)"`))?.[1];
      assert.equal(v === undefined ? v : ent(v), ca[k], `index.html ${k}: ${attr} differs from the catalogue`);
    }
  }
  const unused = Object.keys(ca).filter(k => k.startsWith('html.') && !used.has(k));
  assert.deepEqual(unused, [], 'html.* keys no element uses');
  assert.ok(nodes > 100 && attrs > 30 && riches > 20, 'the page is marked up');
  // boot.*: the joke ids and the failure card are the generated block's source (tests/ui/loader.mjs checks index.html against them)
  const jokeKeys = Object.keys(ca).filter(k => k.startsWith('boot.joke.')).map(k => k.slice(10));
  assert.deepEqual([...jokeKeys].sort(), [...JOKE_IDS].sort(), 'boot.joke.* keys are exactly JOKE_IDS');
  assert.ok(JOKE_IDS.length >= 3 && ['title', 'text', 'retry'].every(k => typeof ca[`boot.fail.${k}`] === 'string'), 'jokes and failure strings exist');
  // applyI18n on a minimal DOM: text of a leaf, the text node beside an icon, an attribute; the siblings are untouched
  const mk = (children, attrs = {}) => ({ children: children.filter(c => c.nodeType !== 3), childNodes: children, attrs, getAttribute(n) { return this.attrs[n] ?? null; }, setAttribute(n, v) { this.attrs[n] = v; },
    get textContent() { return this.children.length ? '' : this.text; }, set textContent(v) { this.text = v; }, text: '' });
  const text = v => ({ nodeType: 3, nodeValue: v });
  const evil = '<script>x</script><b onclick="y" data-fig>z</b><a href="javascript:q" target="_blank" rel="noopener">l</a><a href="mailto:a@b.c">m</a><br></i>&<';
  setCatalog({ 'a.t': 'Hola', 'a.u': 'Adeu', 'a.l': 'Etiqueta', 'a.r': evil });
  const leaf = mk([]); leaf.attrs['data-i18n'] = 'a.t';
  const icon = { nodeType: 1 }, beside = mk([icon, text('  Vell  '), { nodeType: 1 }]); beside.attrs['data-i18n'] = 'a.u';
  const lab = mk([], { 'data-i18n-attr': 'aria-label:a.l;title:a.t' });
  const rich = { attrs: { 'data-i18n-rich': 'a.r' }, ownerDocument: fakeDoc, getAttribute(n) { return this.attrs[n]; }, replaceChildren(...x) { this.out = x; } };
  const lists = { '[data-i18n]': [leaf, beside], '[data-i18n-attr]': [lab], '[data-i18n-rich]': [rich] };
  applyI18n({ querySelectorAll: sel => lists[sel] ?? [] });
  // hostile catalogue text: unknown tags stay text, stray attributes and unsafe links are dropped, nothing is parsed twice
  assert.equal(rich.out.map(ser).join(''), '<script>x</script><b data-fig>z</b><a target="_blank" rel="noopener">l</a><a href="mailto:a@b.c">m</a><br></i>&<');
  assert.deepEqual(richTags('<b>x</b> <a href="https://e.cat">y</a><br>'), ['</a>', '</b>', '<a href="https://e.cat">', '<b>', '<br>']);
  assert.equal(leaf.text, 'Hola');
  assert.equal(beside.childNodes[1].nodeValue, '  Adeu  ', 'the icon stays and the whitespace around the text is kept');
  assert.deepEqual([lab.attrs['aria-label'], lab.attrs.title], ['Etiqueta', 'Hola']);
  setCatalog(ca);
}


// (f) the language resolver: ?lang= > saved > ca; aliases; nothing arbitrary; pseudo only on dev hosts; browser languages never
{
  const all = ['ca', 'es', 'en', 'pt', 'zh-Hans', 'oc'];
  const pick = (url, saved, extra = {}) => pickLang({ url, saved, allowed: all, ...extra });
  assert.equal(pick('es', 'en'), 'es', 'the URL beats the saved choice');
  assert.equal(pick(null, 'en'), 'en');
  assert.equal(pick('xx', 'en'), 'en', 'an invalid URL tag falls through to the saved choice');
  assert.equal(pick('xx', 'yy'), 'ca');
  for (const [tag, code] of [['es-MX', 'es'], ['es-ES', 'es'], ['EN_gb', 'en'], ['en-US', 'en'], ['pt', 'pt'], ['pt-PT', 'pt'], ['pt-br', 'pt'], ['zh', 'zh-Hans'], ['zh-CN', 'zh-Hans'], ['oc-ES', 'oc'], [' es ', 'es']]) assert.equal(pick(tag), code, tag);
  for (const tag of ['uk', 'fr', 'es-', 'es;', '../../es', '__proto__', 'constructor', 'toString', 'x'.repeat(40), '', 7, {}, ['es']]) assert.equal(resolveTag(tag, all), null, `invalid tag ${String(tag)}`);
  assert.equal(pickLang({ url: 'es-MX', saved: 'en', allowed: ['ca', 'en'] }), 'en', 'an alias is only as good as its target being released');
  assert.equal(pick('pseudo', null), 'ca', 'pseudo is ignored outside dev hosts');
  assert.equal(pick('pseudo', 'en', { dev: true }), 'pseudo');
  assert.equal(pick(null, 'pseudo', { dev: true }), 'ca', 'pseudo is never a saved choice');
  assert.deepEqual(Object.keys(bootAliases()).filter(t => !LANGS.includes(bootAliases()[t])), [], 'the boot aliases only reach released languages');
  assert.equal(bootAliases()['es-mx'], 'es');

  // initLang reads the URL and the saved choice and never writes; blocked storage and a navigator.languages that says otherwise change nothing
  const keep = Object.getOwnPropertyDescriptors(globalThis);
  const writes = [], saved = { 'ui-language-v1': 'en' };
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: k => saved[k] ?? null, setItem: (...a) => writes.push(a), removeItem: (...a) => writes.push(a) } });
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { languages: ['fr-FR', 'de'], language: 'fr-FR' } });
  assert.equal(initLang({ search: '?lang=es', hostname: 'mulassa.cat' }), 'es');
  assert.equal(initLang({ search: '', hostname: 'mulassa.cat' }), 'en', 'the saved choice');
  assert.equal(initLang({ search: '?lang=pseudo', hostname: 'mulassa.cat' }), 'en', 'pseudo off dev hosts');
  assert.equal(initLang({ search: '?lang=pseudo', hostname: 'localhost' }), 'pseudo');
  assert.equal(initLang({ search: '?lang=pseudo', hostname: '192.168.1.5' }), 'pseudo');
  assert.deepEqual(writes, [], '?lang= is never saved');
  delete saved['ui-language-v1'];
  assert.equal(initLang({ search: '', hostname: 'mulassa.cat' }), 'ca', 'no URL, nothing saved: Catalan, whatever the browser speaks');
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw new Error('blocked'); } });
  assert.equal(initLang({ search: '?lang=en', hostname: 'mulassa.cat' }), 'en', 'blocked storage still honours the URL');
  assert.equal(initLang({ search: '', hostname: 'mulassa.cat' }), 'ca', 'blocked storage: Catalan');
  for (const k of ['localStorage', 'navigator']) { if (keep[k]) Object.defineProperty(globalThis, k, keep[k]); else delete globalThis[k]; }
  setLang('ca');

  // <html lang> and dir
  const doc = { documentElement: {} };
  setLang('en'); applyDocumentLang(doc); assert.deepEqual([doc.documentElement.lang, doc.documentElement.dir], ['en', 'ltr']);
  setLang('pseudo'); applyDocumentLang(doc); assert.equal(doc.documentElement.lang, 'ca-x-pseudo'); assert.equal(localeMeta().intl, 'ca');
  setLang('ca'); applyDocumentLang({});
}

// (g) pseudo-localisation: bracketed, accented, ~40% longer; {markers}, tags and the untranslatable words survive
{
  const p = pseudoText('Has fet {n} punts a GUAPA! amb GUA i PA <b>ara</b> &amp; CREMA');
  assert.ok(p.startsWith('[') && p.endsWith(']'));
  for (const keep of ['{n}', 'GUAPA!', ' GUA ', ' PA ', '<b>', '</b>', '&amp;', 'CREMA']) assert.ok(p.includes(keep), `${keep} kept in ${p}`);
  assert.ok(p.includes('íí') === false && p.includes('fét'), p);
  assert.ok(p.length >= 'Has fet {n} punts a GUAPA! amb GUA i PA <b>ara</b> &amp; CREMA'.length * 1.4);
  assert.ok(!/~{6}|\p{L}~/u.test(p), `padding is separate short words: ${p}`);
  assert.equal(pseudoText('{n}'), '{n}');
  assert.equal(pseudoText('GUA'), 'GUA');
  const pc = pseudoCatalog(ca);
  assert.deepEqual(Object.keys(pc), Object.keys(ca));
  for (const [k, v] of Object.entries(pc)) assert.equal(marks(v), marks(ca[k]), `pseudo ${k}: placeholders`);
  assert.ok(Object.values(pseudoCatalog({ 'a.n': { one: 'un punt', other: 'punts' } })['a.n']).every(t => t.startsWith('[')));
}

// (h) loading: a missing chunk, a broken catalogue or a bad tag leaves Catalan and says why; ca is never async
{
  assert.throws(() => assertParity([{ 'ui.x': 'only one key' }]), /keys missing/);
  assertParity(CA_PARTS);
  const restore = () => { setLang('ca'); ACTIVE_CATALOG.parts = CA_PARTS; ACTIVE_CATALOG.intl = 'ca'; };
  const fresh = async (search, hostname) => { // a new instance of load-locale (its own state and once-only promise)
    const m = await import(`../../src/i18n/load-locale.js?case=${encodeURIComponent(search + hostname)}`);
    return { m, code: await m.ensureLocale({ search, hostname, read: () => null }) };
  };
  let r = await fresh('?lang=es', 'mulassa.cat'); // a shipped chunk loads, with full parity
  assert.equal(r.code, 'es'); assert.equal(lang(), 'es');
  assert.equal(r.m.localeState().status, 'ready'); assert.equal(r.m.localeState().error, null);
  assert.notEqual(mergeCatalog(ACTIVE_CATALOG.parts)['boot.fail.title'], ca['boot.fail.title']);
  restore();
  r = await fresh('?lang=xx', 'mulassa.cat'); // not an edition: Catalan, nothing to load
  assert.equal(r.code, 'ca'); assert.equal(r.m.localeState().status, 'ready');
  assert.equal(ACTIVE_CATALOG.parts, CA_PARTS);
  restore();
  r = await fresh('?lang=pseudo', 'localhost');
  assert.equal(r.code, 'pseudo'); assert.equal(lang(), 'pseudo'); assert.equal(r.m.localeState().status, 'ready');
  assert.ok(mergeCatalog(ACTIVE_CATALOG.parts)['boot.fail.title'].startsWith('['));
  restore();
  r = await fresh('?lang=pseudo', 'mulassa.cat');
  assert.equal(r.code, 'ca'); assert.equal(r.m.localeState().status, 'ready'); assert.equal(ACTIVE_CATALOG.parts, CA_PARTS);
  restore();
  // plurals: oc has no Intl.PluralRules data, French's rules stand in (0 and 1 are `one`)
  setCatalog({ 'a.n': { one: 'un', other: 'molts' } }, 'oc');
  assert.deepEqual([0, 1, 2].map(count => tr('a.n', { count })), ['un', 'un', 'molts']);
  setCatalog({ 'a.n': { one: 'un', other: 'molts' } }, 'ca');
  assert.deepEqual([0, 1, 2].map(count => tr('a.n', { count })), ['molts', 'un', 'molts']);
  setCatalog(ca);
}

// (i) the generated boot block (index.html) and its inline language picker, run against a made-up second language
{
  const others = { es: { jokes: ['a…', 'b…', 'c…'], title: 'T', text: 'X', retry: 'R' } };
  const html = renderBoot(readFileSync(new URL('../../index.html', import.meta.url), 'utf8'), ca, others);
  const script = html.match(/<script id="boot-lang">([\s\S]*?)<\/script>/)[1];
  const run = (search, saved, blocked) => {
    const el = {}, win = {};
    vm.runInNewContext(script, { document: { documentElement: el }, window: win, location: { search }, URLSearchParams, Object,
      get localStorage() { if (blocked) throw new Error('blocked'); return { getItem: () => saved ?? null }; } });
    return JSON.parse(JSON.stringify([el.lang, win.__mulassaBoot])); // plain objects: the vm has its own realm
  };
  assert.deepEqual(run('?lang=es', null), ['es', others.es]);
  assert.deepEqual(run('?lang=es-MX', 'en'), ['es', others.es], 'URL over saved, aliases included');
  assert.deepEqual(run('', 'es'), ['es', others.es], 'the saved choice');
  assert.deepEqual(run('?lang=en', null), ['en', null], 'a released language without boot strings keeps the Catalan ones');
  assert.deepEqual(run('?lang=xx', null), ['ca', null]);
  assert.deepEqual(run('?lang=constructor', '__proto__'), ['ca', null], 'no prototype lookups');
  assert.deepEqual(run('?lang=es', null, true), ['es', others.es], 'blocked storage');
  assert.deepEqual(run('', null, true), ['ca', null]);
  assert.deepEqual(run('?lang=pseudo', null), ['ca', null], 'pseudo is applied by the bundle, on dev hosts');
  assert.ok(renderBoot(html, ca, others) === html, 'rendering is idempotent');
  assert.ok(/i18n:boot:others \*\/\{\}\/\* i18n:boot:end/.test(renderBoot(html, ca, {})), 'with no other boot catalogue the table is empty');
}

// (j) Turnstile's language per UI language: every released one has an accepted code (docs/i18n/research.md §1)
{
  const accepted = ['es', 'en', 'fr', 'it', 'ro', 'pt-br', 'de', 'zh-cn', 'ja', 'uk', 'ru', 'ko'];
  for (const code of ALL_LANGS.filter(c => c !== 'ca')) assert.ok(accepted.includes(TURNSTILE_LANG[code]), `${code}: Turnstile language`);
  assert.deepEqual([TURNSTILE_LANG.ca, TURNSTILE_LANG.eu, TURNSTILE_LANG.gl, TURNSTILE_LANG.oc], ['ca', 'es', 'es', 'fr']);
}

// (d) Catalan literals outside the catalogue fail the test (mark a deliberate one with `// i18n-ok: why`, on its line or the line above)
// code inside `${}` is not text; `·` only counts inside a word (l·l): as a separator or a mask it is no language
const CAT = /[àèéíòóúçï“”’]|\p{L}·\p{L}|\b(el|la|els|les|per|amb|això|ets|has|ara|prem|toca|encara|sense|tens)\b/iu;
const LIT = /(['"`])((?:\\.|(?!\1).)*)\1/g;
const counts = [], found = [];
const walk = dir => { for (const e of readdirSync(dir, { withFileTypes: true })) {
  const p = join(dir, e.name);
  if (e.isDirectory()) { if (!['i18n', 'dev'].includes(e.name)) walk(p); continue; }
  if (!p.endsWith('.js')) continue;
  let n = 0;
  const lines = readFileSync(p, 'utf8').split('\n');
  for (const [i, line] of lines.entries()) {
    if (/^\s*(\/\/|\*)/.test(line) || line.includes('i18n-ok') || lines[i - 1]?.includes('i18n-ok') || /^import /.test(line)) continue;
    for (const [, , raw] of line.replace(/\s\/\/\s.*$/, '').matchAll(LIT)) { const body = raw.replace(/\$\{[^}]*\}/g, ''); if (body.length > 2 && /\s|[àèéíòóúç]/.test(body) && CAT.test(body)) { n++; found.push(`${relative(root, p)}:${i + 1}: ${line.trim().slice(0, 110)}`); } }
  }
  if (n) counts.push([relative(root, p), n]);
} };
walk(root);
if (found.length) console.error(found.join('\n'));
assert.equal(found.length, 0, `${found.length} Catalan literal(s) outside the catalogue: extract to tr() or mark the line \`// i18n-ok: why\``);
console.log('i18n ok');

// (k) the HUD has fixed room: a short hud./game. string may not grow past 1.3x (or +6 columns) in any edition (CJK counts 2 columns a character)
{
  const cols = s => [...s].reduce((n, ch) => n + (/[　-鿿가-힯＀-￯]/.test(ch) ? 2 : 1), 0);
  const forms = v => (typeof v === 'string' ? [v] : Object.values(v));
  const widest = v => Math.max(...forms(v).map(cols));
  for (const code of readdirSync(join(root, 'i18n/locales')).filter(c => c !== 'ca')) {
    const other = mergeCatalog(NS.map(n => read(join(root, `i18n/locales/${code}/${n}.json`))));
    for (const [k, v] of Object.entries(ca)) {
      if (!/^(hud|game)\./.test(k) || k === 'hud.share.fontSample') continue;
      const a = widest(v), b = widest(other[k]);
      if (a <= 30) assert.ok(b <= Math.max(a * 1.3, a + 6), `${code}.${k}: ${b} columns for ${a} in ca`);
    }
  }
}

// (l) words written in a stylesheet (`content: '…'`) never reach the catalogue: the rotate cover said «Gira el mòbil…» in every language
{
  const css = readdirSync(join(root, 'styles')).map(f => readFileSync(join(root, 'styles', f), 'utf8')).join('\n');
  const words = [...css.matchAll(/content:\s*(['"])([^'"]*\p{L}{4}[^'"]*)\1/gu)].map(m => m[2]);
  assert.deepEqual(words, [], `text in CSS content (use a data-i18n element): ${words.join(' | ')}`);
}
