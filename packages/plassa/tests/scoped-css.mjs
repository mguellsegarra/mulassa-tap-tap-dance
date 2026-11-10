// Another page's CSS confined to some elements (packages/plassa/src/scoped-css.js): mulassa.cat's sheet rules name #music and
// #board-menu, which on a game page are the game's own; inside the scope they keep their specificity.
import assert from 'node:assert/strict';
const { confine } = await import('../src/scoped-css.js');

const W = ':where(dialog.sheet, dialog.sheet *)';
assert.equal(confine('#music', 'dialog.sheet'), `#music${W}`, "a game's own #music is out of reach");
assert.equal(confine('#free, #music svg', 'dialog.sheet'), `#free${W}, #music svg${W}`, 'each part of a list');
assert.equal(confine(':is(#hud, #settings) .x, .y', 'dialog.sheet'), `:is(#hud, #settings) .x${W}, .y${W}`, 'a comma inside :is() is not a list');
assert.equal(confine('#feedback-menu::before', 'dialog.sheet'), `#feedback-menu${W}::before`, 'before the pseudo-element, which must stay last');
assert.equal(confine('.sheet *::-webkit-scrollbar-thumb:hover', 'dialog.sheet'), `.sheet *${W}::-webkit-scrollbar-thumb:hover`, 'a pseudo-class after it too');
assert.equal(confine('#profile-menu', 'dialog.sheet'), `#profile-menu${W}`, 'the sheet itself is inside');
assert.equal(confine(':root', 'dialog.sheet'), ':root', 'custom properties stay global');
console.log('scoped css: every rule inside the scope, specificity kept ok');
