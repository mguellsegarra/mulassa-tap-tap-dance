// Mulassa Games' hero clip: at once, only a live game's, the right shape for the screen, kept through moves, picture hidden while it loads.
import assert from 'node:assert/strict';
import { setupHeroVideo } from '../../src/jocs/menu/hero-video.js';

function make({ wide = true, reduced = false, saveData = false, refuseFirst = false, refuseAll = false } = {}) {
  let plays = 0;
  const classes = new Set(), hero = new Set(), video = {
    src: null, playing: false, has: c => classes.has(c), hero,
    classList: { add: c => classes.add(c), remove: (...cs) => cs.forEach(c => classes.delete(c)), contains: c => classes.has(c) },
    parentElement: { classList: { toggle: (c, on) => (on ? hero.add(c) : hero.delete(c)) } },
    getAttribute: () => video.src, pause() { video.playing = false; },
    play() { video.playing = true; return refuseAll || (refuseFirst && !plays++) ? Promise.reject(new Error('AbortError')) : (plays++, Promise.resolve()); },
  };
  const mq = { matches: wide, addEventListener: (k, f) => { mq.change = f; } };
  const taps = {}, win = {
    matchMedia: () => ({ matches: reduced }), navigator: { connection: { saveData } }, addEventListener: (k, f) => { taps[k] = f; },
  };
  const clip = setupHeroVideo({ video, wide: mq, win });
  return { clip, video, mq, taps, get shown() { return classes.has('on'); } };
}
const card = (game, video) => ({ dataset: video ? { game, video: `/v/${game}.mp4`, videoTall: `/v/${game}-tall.mp4` } : { game, soon: '' } });

const a = make();
a.clip.show(card('tap', true));
assert(a.video.src === '/v/tap.mp4' && a.video.playing, 'a live game\'s clip loads and plays at once');
assert(a.video.has('due') && !a.shown, 'the clip is not shown while it loads: never an empty video');
assert.equal(a.clip.poster(card('tap', true)), '/v/tap.jpg', '…the hero\'s still is the clip\'s own first frame meanwhile');
assert.equal(a.clip.poster(card('aviat-1', false)), undefined, 'a game with no clip keeps its picture');
assert(a.video.hero.has('clip') && !a.video.hero.has('playing'), 'the hero holds its still under the loading clip');
await null;
assert(a.shown, 'then the wide clip shows over the still');
assert(a.video.hero.has('playing'), '…and the still goes: it showed through the clip\'s faded side as a ghost');
a.clip.show(card('pop', true));
assert(!a.video.hero.has('playing') && !a.shown, 'a change of game brings the still back at once');

// two starts in a row: the first one's play is aborted, and must not bring the picture back over the second
const r = make({ refuseFirst: true });
r.clip.show(card('tap', true)); r.clip.show(card('pop', true));
await null; await null;
assert(r.video.has('due') && r.shown, 'an aborted earlier play leaves the latest clip alone');
const g = make({ refuseFirst: true });
g.clip.show(card('tap', true)); await null; await null;
assert(!g.shown, 'a play refused before any tap keeps the still…');
g.taps.touchend(); await null;
assert(g.shown && g.video.playing, '…and the first tap anywhere starts the clip (an iPhone in Low Power Mode)');
const f = make({ refuseAll: true });
f.clip.show(card('tap', true)); await null; await null;
assert(!f.video.has('due') && !f.shown, 'a refused play brings the picture back');

const b = make();
b.clip.show(card('aviat-1', false));
assert(b.video.src === null && !b.video.has('due'), 'a surprise card has no clip and keeps its picture');

const c = make({ wide: false });
c.clip.show(card('pop', true));
assert.equal(c.video.src, '/v/pop-tall.mp4', 'a phone plays the upright clip');
assert.equal(c.clip.poster(card('pop', true)), '/v/pop-tall.jpg', 'with the upright first frame as its still');
c.mq.matches = true; c.mq.change();
assert.equal(c.video.src, '/v/pop.mp4', 'turning a tablet swaps to the wide one');

for (const opts of [{ reduced: true }, { saveData: true }]) {
  const d = make(opts);
  d.clip.show(card('tap', true));
  assert(d.video.src === null && !d.video.has('due'), `no clip with ${Object.keys(opts)[0]}`);
  assert.equal(d.clip.poster(card('tap', true)), undefined, '…and its picture, not the clip\'s frame');
}
console.log('games hero clip: plays at once, live games only, phone and wide clips, kept through moves ok');
