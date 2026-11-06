// Plassa's one music switch (packages/plassa/src/music-pref.js): mulassa.cat's key, a game's old choice carried over once.
import assert from 'node:assert/strict';

const mem = new Map();
globalThis.localStorage = { getItem: k => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, String(v)), removeItem: k => mem.delete(k) };
const { musicPref } = await import('../src/music-pref.js');

assert.equal(musicPref.get(), true, 'on by default');
mem.set('pica-music', 'off');
musicPref.adopt('pica-music');
assert.deepEqual([musicPref.get(), mem.has('pica-music')], [false, false], 'Pop muted before: Plassa stays muted, the old key goes');
mem.set('menu-music', 'on'); mem.set('pica-music', 'off');
musicPref.adopt('pica-music');
assert.equal(musicPref.get(), true, 'a choice already made on Plassa wins');
musicPref.set(false);
assert.equal(mem.get('menu-music'), 'off', "mulassa.cat's own key: the main game follows it");
console.log('music pref: one key, the old one carried over once ok');
