// «Jocs»: free play stays inside the page and comes back to the sheet; a mini-game replaces the page.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { setupGamesMenu } from '../../src/ui/games-menu.js';

function make() {
  let grid, x, entered = 0, went = null, focused = null;
  const menu = { open: false, showModal() { this.open = true; }, close() { this.open = false; } };
  const doc = { getElementById: id => id === 'games-menu' ? menu : { addEventListener: (k, f) => { if (id === 'games-grid') grid = f; else x = f; } } };
  const games = setupGamesMenu({ focusIn: (m, id) => { focused = id; }, enterFree: () => entered++, doc, go: url => { went = url; } });
  const tap = game => grid({ target: { closest: () => game === null ? null : { dataset: { game } } } });
  return { games, menu, tap, closeX: () => x(), get entered() { return entered; }, get went() { return went; }, get focused() { return focused; } };
}

const a = make();
a.games.open();
assert(a.games.isOpen && a.focused === 'games-x', 'opening focuses the sheet');
a.tap(null);
assert(a.menu.open && !a.entered && !a.went, 'a tap between the cards does nothing');
a.tap('lliure');
assert(!a.menu.open && a.entered === 1 && a.went === null, 'free play closes the sheet and starts in this page, no navigation');
a.games.afterFree(false);
assert(!a.menu.open, 'not back over another screen');
a.games.afterFree(true);
assert(a.menu.open, 'leaving free play comes back to the sheet');
a.menu.close(); a.games.afterFree(true);
assert(!a.menu.open, 'only once');

const b = make();
b.games.open(); b.games.afterFree(true); b.menu.close(); b.games.afterFree(true);
assert(!b.menu.open, 'a free play that did not come from the sheet stays on the selector');
b.games.open(); b.tap('pica');
assert.equal(b.went, '/jocs/pica/', 'a mini-game is its own page');
b.closeX();
assert(!b.menu.open, 'the × closes');

// every card has its picture and its page
const html = readFileSync('index.html', 'utf8');
const ids = [...html.matchAll(/data-game="([\w-]+)"/g)].map(m => m[1]);
assert.equal(ids.at(-1), 'lliure', 'free play comes last, after the games');
for (const id of ids) {
  readFileSync(`public/jocs/menu/cards/${id}.jpg`);
  if (id !== 'lliure') readFileSync(`jocs/${id}/index.html`);
}
