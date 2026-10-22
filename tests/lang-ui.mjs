// The language picker's pure rules (src/ui/lang-rules.js) and its hidden state while only Catalan is released.
import assert from 'node:assert/strict';
import { reloadUrl, suggestion, reloadWaits, SUGGEST } from '../src/ui/lang-rules.js';
import { setupLang, langNotice } from '../src/ui/lang-ui.js';
import { LANGS } from '../src/i18n/locale.js';

// reload URL: only `lang` changes; challenge, other params and hash stay; Catalan clears it
assert.equal(reloadUrl('https://x.test/?repte=94-2&mute', 'es'), 'https://x.test/?repte=94-2&mute=', 'saved: no lang in the address');
assert.equal(reloadUrl('https://x.test/?repte=94-2&mute', 'es', { persisted: false }), 'https://x.test/?repte=94-2&mute=&lang=es', 'blocked storage: the URL carries it');
assert.equal(reloadUrl('https://x.test/?lang=en&repte=94-2#a', 'es'), 'https://x.test/?repte=94-2#a', 'a stale lang is dropped');
assert.equal(reloadUrl('https://x.test/?lang=en&repte=94-2#a', 'es', { persisted: false }), 'https://x.test/?lang=es&repte=94-2#a');
assert.equal(reloadUrl('https://x.test/?lang=en&repte=94-2', 'ca'), 'https://x.test/?repte=94-2');

// suggestion: first visit, first browser language released and not Catalan, no `ca` anywhere
const rel = ['ca', 'es', 'en'], ask = o => suggestion({ released: rel, ...o });
assert.equal(ask({ languages: ['es-ES', 'en'] }), 'es');
assert.equal(ask({ languages: ['en-GB'] }), 'en');
assert.equal(ask({ languages: ['es-ES', 'ca'] }), null, 'ca in the list: never');
assert.equal(ask({ languages: ['ca-ES'] }), null);
assert.equal(ask({ languages: ['fr-FR', 'es'] }), null, 'only the first language counts');
assert.equal(ask({ languages: ['es'], saved: 'ca' }), null);
assert.equal(ask({ languages: ['es'], url: 'en' }), null);
assert.equal(ask({ languages: ['es'], seen: '1' }), null);
assert.equal(ask({ languages: [] }), null);
assert.equal(suggestion({ released: ['ca'], languages: ['es'] }), null, 'nothing to suggest with one language');
assert.equal(suggestion({ released: ['ca', 'fr'], languages: ['fr'] }), null, 'no words for it yet');
assert(SUGGEST.es.text && SUGGEST.es.yes && SUGGEST.es.no);

// deferral: only the menus with the feedback sheet closed reload at once
for (const state of ['splash', 'title', 'select']) assert.equal(reloadWaits({ state, feedbackOpen: false }), false, state);
for (const state of ['play', 'results', 'final', 'practice']) assert.equal(reloadWaits({ state, feedbackOpen: false }), true, state);
assert.equal(reloadWaits({ state: 'select', feedbackOpen: true }), true);

// failed language: one status note on the splash; nothing when the language loaded (no notice)
{
  const mkDoc = () => { const body = []; return { body: { append: (...n) => body.push(...n) }, createElement: () => ({ setAttribute(k, v) { this[k] = v; }, remove() { body.splice(body.indexOf(this), 1); } }), nodes: body }; };
  const failed = mkDoc(); langNotice({ state: () => 'splash', doc: failed, notice: 'No s’ha pogut carregar l’idioma.', ms: 5 });
  assert(failed.nodes.some(n => n.id === 'lang-notice' && n.role === 'status' && n.textContent.includes('idioma')), 'visible with a failed language');
  const ready = mkDoc(); langNotice({ state: () => 'splash', doc: ready, notice: null });
  assert.equal(ready.nodes.length, 0, 'no note when the language loaded');
}

// one released language: the picker never builds
if (LANGS.length < 2) assert.equal(setupLang({}).hidden, true);
console.log('lang-ui ok');
