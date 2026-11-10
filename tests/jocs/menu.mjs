// Mulassa Games (jocs/index.html): its own page, every card with its picture and its game's page; nothing of it left in the
// main game, whose gamepad and old links lead there.
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';

const html = readFileSync('jocs/index.html', 'utf8'), main = readFileSync('index.html', 'utf8');
const ids = [...html.matchAll(/data-game="([\w-]+)"/g)].map(m => m[1]);
assert(ids.includes('tap') && ids.includes('pop'), 'the live games have their cards');
assert(!ids.includes('lliure'), 'free play is not a card: its door is the help sheet\'s #howto-walk');
assert(main.includes('id="howto-walk"'), 'free play keeps a way in');
for (const id of ids) {
  readFileSync(`public/jocs/menu/cards/${id}.jpg`);
  for (const attr of ['data-hero', 'data-video', 'data-video-tall']) {
    const file = html.match(new RegExp(`data-game="${id}"[^>]*${attr}="([^"]+)"`))?.[1];
    if (file) readFileSync(`public${file}`);
    if (file?.endsWith('.mp4')) readFileSync(`public${file.replace(/\.mp4$/, '.jpg')}`); // the clip's first frame, the hero's still while it loads (hero-video.js)
  }
  if (id !== 'tap' && !id.startsWith('aviat-')) readFileSync(id === 'pop' ? 'pop/index.html' : `jocs/${id}/index.html`);
}
// one «Juga» for the whole page, in the hero, before the name it stands over
assert.equal((html.match(/class="game-play"/g) ?? []).length, 1, 'one play button, in the hero');
assert(html.indexOf('id="games-hero-play"') < html.indexOf('id="games-hero-name"'), '«Juga» comes before the game\'s name');
assert(html.includes('id="games-music"'), 'the page has its speaker');

// the page stands on Plassa and loads nothing of the main game
const links = [...html.matchAll(/<link rel="stylesheet" href="([^"]+)">/g)].map(m => m[1]);
assert.deepEqual(links, ['/packages/plassa/src/base.css', '/packages/plassa/src/game.css', '/src/jocs/menu/style.css']);
assert.deepEqual([...html.matchAll(/<script[^>]*src="([^"]+)"/g)].map(m => m[1]), ['/src/jocs/menu/main.js']);
// its words in every language the games speak
const langs = f => f.replace('.json', '');
const ca = JSON.parse(readFileSync('src/jocs/menu/locales/ca.json', 'utf8'));
assert.deepEqual(readdirSync('src/jocs/menu/locales').map(langs).sort(), readdirSync('src/jocs/games/pop/locales').map(langs).sort(), 'the selector speaks Pop\'s languages');
for (const f of readdirSync('src/jocs/menu/locales')) assert.deepEqual(Object.keys(JSON.parse(readFileSync(`src/jocs/menu/locales/${f}`, 'utf8'))), Object.keys(ca), `${f} has the Catalan keys`);
for (const key of html.matchAll(/data-t(?:-aria)?="([\w.]+)"/g)) assert(key[1] in ca, `words for ${key[1]}`);
// its music: the file and its loop points (tools/music/build_games_menu.py)
const loop = JSON.parse(readFileSync('src/jocs/menu/music.json', 'utf8'));
assert(existsSync('src/jocs/menu/music.mp3') && loop.start === 0 && loop.end > 30, 'the music and its loop');

// the main game: no sheet left, an old /#jocs link sent on, the gamepad and a game's way back to the page
assert(!main.includes('games-menu') && !main.includes('games-sheet.css'), 'no games sheet in the main game');
assert(main.includes("if (location.hash === '#jocs') location.replace('/jocs/')"), 'an old /#jocs link goes to the page');
assert(readFileSync('src/ui/controls.js', 'utf8').includes("location.replace('/jocs/')"), 'the gamepad goes to the page');
assert(readFileSync('pop/index.html', 'utf8').includes('<a id="back" class="exit corner-l" href="/jocs/">'), 'Pop\'s way back is the page');
assert(!existsSync('public/jocs/index.html'), 'no redirect stub over the built page');
console.log(`Mulassa Games: ${ids.length} cards with their pictures and pages, on Plassa, the main game leads there ok`);
