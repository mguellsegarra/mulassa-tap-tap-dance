// The app's launcher hands each game what it already does (plassa/native.js, GameHost tellShell, GameSession shellScript):
// the rows and buttons it covers hide, its switches hold, the account goes to its sheet. The website gets none of it.
import test from 'node:test';
import assert from 'node:assert/strict';

const saved = new Map(), styles = [];
globalThis.localStorage = { getItem: k => saved.get(k) ?? null, setItem: (k, v) => saved.set(k, v), removeItem: k => saved.delete(k) };
globalThis.document = { head: { append: el => styles.push(el.textContent) }, createElement: () => ({}), documentElement: { dataset: {} } };
const web = await import('../../packages/plassa/src/native.js?web');

const asked = [];
globalThis.Capacitor = { isNativePlatform: () => true, Plugins: { Mulassa: { openAccount: async o => { asked.push(o); } } } };
globalThis.__mulassaShell = { covers: ['language', 'music', 'account', 'x"]{}*{'], sound: false, vibration: true };
const app = await import('../../packages/plassa/src/native.js?app');

test('the website: nothing covered, nothing hidden, its own account sheets', async () => {
  assert.equal(web.IN_LAUNCHER, false);
  assert.equal(web.appCovers('music'), false);
  assert.equal(web.appOff('sound'), false);
  let opened = 0;
  await web.askAccount('create', () => assert.fail('back is the web sheet\'s'), () => { opened++; });
  assert.equal(opened, 1);
});

test('the app hides exactly what its launcher covers, and nothing a bad name could inject', () => {
  assert.equal(app.IN_LAUNCHER, true);
  assert.ok(app.appCovers('language', 'music'));
  assert.equal(app.appCovers('music', 'feedback'), false, 'one not covered keeps the row');
  assert.deepEqual(styles, ['[data-app="language"],[data-app="music"],[data-app="account"]{display:none!important}']);
  assert.equal(document.documentElement.dataset.covers, 'language music account', 'a page closes the gaps by it');
});

test('the launcher\'s switches: only an explicit off holds', () => {
  assert.equal(app.appOff('sound'), true);
  assert.equal(app.appOff('vibration'), false);
  assert.equal(app.appOff('anything'), false, 'a switch the snapshot does not carry stays on');
});

test('the account goes to the launcher\'s sheet, then back as a closed web sheet', async () => {
  let back = 0;
  await app.askAccount('create', () => { back++; }, () => assert.fail('no web sheet in the app'));
  assert.deepEqual(asked, [{ what: 'create' }]);
  assert.equal(back, 1);
});

test('an app whose bridge refuses the account sheet still gets the web one', async () => {
  globalThis.Capacitor.Plugins.Mulassa.openAccount = async () => { throw new Error('not implemented'); };
  let web = 0, back = 0;
  await app.askAccount('create', () => { back++; }, () => { web++; });
  assert.deepEqual([web, back], [1, 0]);
});

test('a cancelled launcher sheet does not call back; a finished one passes its answer on', async () => {
  const answers = [];
  globalThis.Capacitor.Plugins.Mulassa.openAccount = async () => ({ completed: false });
  await app.askAccount('prompt', r => answers.push(r), () => assert.fail('no web sheet'));
  globalThis.Capacitor.Plugins.Mulassa.openAccount = async () => ({ completed: true, never: true });
  await app.askAccount('prompt', r => answers.push(r), () => assert.fail('no web sheet'));
  assert.deepEqual(answers, [{ completed: true, never: true }]);
});

test('an Android WebView without document-start scripts asks the bridge; a changed language or music loads the page again, once', async () => {
  delete globalThis.__mulassaShell;
  const session = new Map(); let reloads = 0;
  globalThis.sessionStorage = { getItem: k => session.get(k) ?? null, setItem: (k, v) => session.set(k, v) };
  globalThis.location = { reload: () => { reloads++; } };
  globalThis.Capacitor.Plugins.Mulassa.bootstrap = async () => ({ language: 'es', music: false, covers: ['music'], sound: true, vibration: false });
  saved.set('ui-language-v1', 'ca'); saved.set('menu-music', 'on'); // what this page booted with: stale
  await import('../../packages/plassa/src/native.js?bootstrap-stale');
  await new Promise(r => setTimeout(r));
  assert.equal(reloads, 1, 'read at boot: the page starts again with the launcher\'s');
  assert.deepEqual([saved.get('ui-language-v1'), saved.get('menu-music')], ['es', 'off']);
  styles.length = 0;
  const again = await import('../../packages/plassa/src/native.js?bootstrap-fresh'); // the reloaded page: storage agrees now
  await new Promise(r => setTimeout(r));
  assert.equal(reloads, 1, 'never a second time');
  assert.ok(again.appCovers('music'));
  assert.equal(again.appOff('vibration'), true);
  assert.deepEqual(styles, ['[data-app="music"]{display:none!important}']);
});

test('an app whose bridge has no account method at all still gets the web sheet', async () => {
  delete globalThis.Capacitor.Plugins.Mulassa.openAccount;
  let web = 0;
  await app.askAccount('create', () => assert.fail('no back without a sheet'), () => { web++; });
  assert.equal(web, 1);
});

test('a fresh install whose launcher keeps the defaults (Catalan, music on) does not load the page again', async () => {
  saved.delete('ui-language-v1'); saved.delete('menu-music');
  const session = new Map(); let reloads = 0;
  globalThis.sessionStorage = { getItem: k => session.get(k) ?? null, setItem: (k, v) => session.set(k, v), removeItem: k => session.delete(k) };
  globalThis.location = { reload: () => { reloads++; } };
  globalThis.Capacitor.Plugins.Mulassa.bootstrap = async () => ({ language: 'ca', music: true, covers: ['music'] });
  await import('../../packages/plassa/src/native.js?bootstrap-defaults');
  await new Promise(r => setTimeout(r));
  assert.equal(reloads, 0);
});

test('a second account ask while the launcher sheet is up joins it: one sheet, never the web one under it', async () => {
  let opened = 0, release;
  globalThis.Capacitor.Plugins.Mulassa.openAccount = () => { opened++; return new Promise(r => { release = r; }); };
  const web = () => assert.fail('no web sheet under the native one');
  const a = app.askAccount('create', () => {}, web), b = app.askAccount('prompt', () => {}, web);
  await new Promise(r => setTimeout(r));
  release({ completed: true }); await Promise.all([a, b]);
  assert.equal(opened, 1);
});
