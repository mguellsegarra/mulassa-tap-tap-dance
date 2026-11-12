// Pop and Mulassa Games install as their own apps (their own manifest, icons and start page, never mulassa.cat's), with the
// install button by the sound one, kept off Pop's splash; and a game's t() picks plural forms by count, as the main game's tr().
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

const root = new URL('../../', import.meta.url).pathname;
const read = p => readFileSync(join(root, p), 'utf8');
const pngSize = p => { const b = readFileSync(join(root, 'public', p)); return `${b.readUInt32BE(16)}x${b.readUInt32BE(20)}`; };

const apps = [
  { page: 'pop/index.html', manifest: 'pop.webmanifest', start: '/pop/', button: 'menu-install' },
  { page: 'jocs/index.html', manifest: 'jocs.webmanifest', start: '/jocs/', button: 'games-install' },
];
const ids = new Set([JSON.parse(read('public/manifest.webmanifest')).id ?? '/']);
for (const { page, manifest, start, button } of apps) {
  const html = read(page);
  const m = JSON.parse(read(`public/${manifest}`));
  assert(html.includes(`<link rel="manifest" href="/${manifest}">`), `${page}: links its own manifest`);
  assert.equal(m.start_url, start, `${manifest}: opens on its page`);
  assert(!ids.has(m.id), `${manifest}: an id of its own (${m.id}), or it installs as mulassa.cat`);
  ids.add(m.id);
  for (const icon of m.icons) {
    assert(existsSync(join(root, 'public', icon.src)), `${manifest}: ${icon.src} exists`);
    assert.equal(pngSize(icon.src), icon.sizes, `${manifest}: ${icon.src} is the size it says`);
  }
  const touch = html.match(/<link rel="apple-touch-icon" href="\/([^"]+)">/)?.[1];
  assert(touch && m.icons.some(i => i.src === `/${touch}`), `${page}: the iPhone icon is the manifest's`);
  assert(html.includes('id="install-early"'), `${page}: Chrome's prompt is caught before the module loads`);
  assert(new RegExp(`<button id="${button}"[^>]*\\bhidden\\b`).test(html), `${page}: #${button} starts hidden (shown only where it can install)`);
  assert(/<!-- mulassa-sheets:[^>]*\binstall-steps-menu\b/.test(html), `${page}: puts in mulassa.cat's install steps`);
}

// the splash shows only the title, the figures and «Toca per jugar»: the install button comes in with the home
const popCss = read('src/jocs/games/pop/style.css');
for (const state of ['sp-home', 'sp-in']) assert(popCss.includes(`.${state} #menu-install`), `Pop's .${state} covers #menu-install`);

// plural forms: a child process per language, as the language is chosen once per page
const words = lang => JSON.parse(execFileSync(process.execPath, ['--input-type=module', '-e', `
  globalThis.location = { search: '?lang=${lang}', hostname: '' };
  const { gameWords } = await import(${JSON.stringify(join(root, 'packages/plassa/src/words.js'))});
  const ca = { n: { one: '{n} participant', other: '{n} participants' }, plain: 'hola {x}' };
  const ru = { n: { one: '{n} участник', few: '{n} участника', many: '{n} участников', other: '{n} участника' } };
  const { t } = await gameWords(ca, { './locales/ru.json': async () => ({ default: ru }) });
  console.log(JSON.stringify([1, 3, 10, 21].map(count => t('n', { count, n: count })).concat(t('plain', { x: 'a' }), t('missing'))));
`], { encoding: 'utf8' }));
assert.deepEqual(words('ca'), ['1 participant', '3 participants', '10 participants', '21 participants', 'hola a', 'missing']);
assert.deepEqual(words('ru'), ['1 участник', '3 участника', '10 участников', '21 участник', 'hola a', 'missing']);

console.log('game-install: ok');
