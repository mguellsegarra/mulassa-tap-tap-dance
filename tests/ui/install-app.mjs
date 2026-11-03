// «Instal·la l’app» (src/ui/install-app.js): Chromium's install prompt where it exists, else the browser's own steps,
// and nothing where neither applies.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stepsFor, setupInstall } from '../../src/ui/install-app.js';

const UA = {
  iphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
  mac: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15',
  firefox: 'Mozilla/5.0 (Android 14; Mobile; rv:132.0) Gecko/132.0 Firefox/132.0',
  chrome: 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36',
  webview: 'Mozilla/5.0 (Linux; Android 14; Pixel 8; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/130.0 Mobile Safari/537.36',
  instagram: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 350.0',
  deskFirefox: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14.0; rv:132.0) Gecko/20100101 Firefox/132.0',
};

// which steps, per browser
assert.equal(stepsFor({ ua: UA.iphone }), 'iphone');
assert.equal(stepsFor({ ua: UA.mac, touch: 5 }), 'ipad', 'iPadOS says «Macintosh»: its touch points tell');
assert.equal(stepsFor({ ua: UA.mac, touch: 0 }), null, 'desktop Safari cannot add to a home screen');
assert.equal(stepsFor({ ua: UA.firefox }), 'firefox');
assert.equal(stepsFor({ ua: UA.chrome }), null, 'Chrome has its own prompt');
assert.equal(stepsFor({ ua: UA.webview }), 'inapp', 'any Android WebView');
assert.equal(stepsFor({ ua: UA.instagram }), 'inapp');
assert.equal(stepsFor({ ua: UA.deskFirefox }), null);
for (const app of ['CriOS/130.0', 'FxiOS/131.0', 'EdgiOS/130.0'])
  assert.equal(stepsFor({ ua: UA.iphone.replace('Version/18.0', app) }), null, `${app}: Safari's steps would point at menus it does not have`);
assert.equal(stepsFor({ ua: `${UA.iphone} Ddg/18.0 DuckDuckGo/7` }), null, 'DuckDuckGo sends Safari\'s token too');
assert.equal(stepsFor({ ua: UA.iphone, standalone: true }), null, 'the installed app');

// every case has its list in the sheet
const html = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
const sheet = html.slice(html.indexOf('<dialog id="install-steps-menu"'), html.indexOf('</dialog>', html.indexOf('<dialog id="install-steps-menu"')));
for (const k of ['iphone', 'ipad', 'firefox', 'inapp']) assert.match(sheet, new RegExp(`<ol class="ios-steps" data-for="${k}"`), k);

const el = (o = {}) => ({ hidden: false, attrs: {}, setAttribute(k, v) { this.attrs[k] = v; }, removeAttribute(k) { delete this.attrs[k]; }, addEventListener(k, f) { this.h = f; }, ...o });
function make(o = {}) {
  const on = {}, fire = (k, e) => on[k]?.forEach(f => f(e));
  const settings = { open: true, close() { this.open = false; } };
  const btn = el({ closest: () => settings });
  const lists = ['iphone', 'ipad', 'firefox', 'inapp'].map(k => ({ hidden: true, dataset: { for: k } }));
  const sheet = el({ open: false, querySelectorAll: () => lists, showModal() { this.open = true; }, close() { this.open = false; this.h(); } });
  const ok = el(), x = el(), els = { 'settings-install': btn, 'install-steps-menu': sheet, 'install-steps-ok': ok, 'install-steps-close': x };
  let backs = 0, focused = null;
  const api = setupInstall({ focusIn: (m, id) => (focused = id), back: () => backs++, ua: UA.chrome, touch: 0, standalone: false,
    doc: { getElementById: id => els[id] }, listen: (k, f) => (on[k] ||= []).push(f), ...o });
  const shown = () => lists.filter(l => !l.hidden).map(l => l.dataset.for);
  return { api, btn, sheet, ok, x, settings, fire, shown, get backs() { return backs; }, get focused() { return focused; } };
}

// Chrome: hidden until the browser offers its prompt; one click uses it once
{ const t = make(); assert.equal(t.btn.hidden, true, 'no prompt yet');
  let asked = 0; t.fire('beforeinstallprompt', { prompt: async () => { asked++; } });
  assert.equal(t.btn.hidden, false); assert.equal(t.btn.attrs['aria-haspopup'], undefined, 'the browser\'s own dialog, not ours');
  t.btn.h(); assert.deepEqual([asked, t.btn.hidden, t.sheet.open], [1, true, false], 'used once, then hidden');
  t.fire('beforeinstallprompt', { prompt() {} }); assert.equal(t.btn.hidden, false, 'a fresh prompt after a dismissal');
  t.fire('appinstalled'); assert.equal(t.btn.hidden, true, 'installed: nothing to offer'); }
// a prompt kept before the module ran (index.html's #install-early)
{ globalThis.__installPrompt = { prompt() {} }; const t = make(); delete globalThis.__installPrompt;
  assert.equal(t.btn.hidden, false, 'the early prompt is not lost'); }
// the installed app never shows it, even if a prompt arrives
{ const t = make({ ua: UA.iphone, standalone: true }); t.fire('beforeinstallprompt', { prompt() {} }); assert.equal(t.btn.hidden, true); }
// no prompt API: the steps of that browser only, over Configuració, and back to it
for (const [ua, touch, want] of [[UA.iphone, 0, 'iphone'], [UA.mac, 5, 'ipad'], [UA.firefox, 0, 'firefox'], [UA.instagram, 0, 'inapp']]) {
  const t = make({ ua, touch });
  assert.deepEqual([t.btn.hidden, t.btn.attrs['aria-haspopup'], t.shown()], [false, 'dialog', [want]], want);
  t.btn.h(); assert.deepEqual([t.settings.open, t.sheet.open, t.focused, t.api.isOpen], [false, true, 'install-steps-ok', true], want);
  t.ok.h(); assert.deepEqual([t.sheet.open, t.backs], [false, 1], `${want}: back to Configuració`); }
{ const t = make({ ua: UA.firefox }); t.btn.h(); t.x.h(); assert.equal(t.backs, 1, 'the × goes back too'); }
// nowhere to install from: no button
assert.equal(make({ ua: UA.deskFirefox }).btn.hidden, true);
console.log('install-app ok');
