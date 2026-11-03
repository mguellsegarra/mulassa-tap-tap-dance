// «Jocs»: a mini-game replaces the page; Tap Tap Dance is this page; a surprise card opens nothing.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { setupGamesMenu } from '../../src/ui/games-menu.js';

function make() {
  let grid, went = null, focused = null;
  const menu = { open: false, showModal() { this.open = true; }, close() { this.open = false; } };
  const doc = { getElementById: id => id === 'games-menu' ? menu : { addEventListener: (k, f) => { if (id === 'games-grid') grid = f; } } };
  const games = setupGamesMenu({ focusIn: (m, id) => { focused = id; }, doc, go: url => { went = url; } });
  const tap = (game, soon = false) => grid({ target: { closest: () => game === null ? null : { dataset: soon ? { game, soon: '' } : { game } } } });
  return { games, menu, tap, get went() { return went; }, get focused() { return focused; } };
}

const a = make();
a.games.open();
assert(a.games.isOpen && a.focused === 'games-hero-play', 'opening focuses «Juga»: the sheet has no ×');
a.tap(null);
assert(a.menu.open && !a.went, 'a tap between the cards does nothing');
a.tap('aviat-1', true);
assert(a.menu.open && !a.went, 'a surprise card opens nothing');
a.tap('pop');
assert.equal(a.went, '/pop/', 'a mini-game is its own page, Mulassa Pop at mulassa.cat/pop');
a.games.open(); a.tap('tap');
assert(!a.menu.open && a.went === '/pop/', 'Tap Tap Dance is this page: the sheet just closes');

// every card has its picture and its page
const html = readFileSync('index.html', 'utf8');
const ids = [...html.matchAll(/data-game="([\w-]+)"/g)].map(m => m[1]);
assert(!ids.includes('lliure'), 'free play is not a card: its door is the help sheet\'s #howto-walk');
assert(html.includes('id="howto-walk"'), 'free play keeps a way in');
for (const id of ids) {
  readFileSync(`public/jocs/menu/cards/${id}.jpg`);
  const hero = html.match(new RegExp(`data-game="${id}"[^>]*data-hero="([^"]+)"`))?.[1];
  if (hero) readFileSync(`public${hero}`);
  if (id !== 'tap' && !id.startsWith('aviat-')) readFileSync(id === 'pop' ? 'pop/index.html' : `jocs/${id}/index.html`);
}

// one «Juga» for the whole sheet, in the hero; each card is the one real button
assert.equal((html.match(/class="game-play"/g) ?? []).length, 1, 'one play button, in the hero');
