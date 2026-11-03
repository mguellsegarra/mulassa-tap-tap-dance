// The «Jocs» hero clip: at once, only a live game's, the right shape for the screen, kept through moves, picture hidden while it loads.
import assert from 'node:assert/strict';
import { setupHeroVideo } from '../../src/ui/games-hero-video.js';

function make({ wide = true, reduced = false, saveData = false, refuseFirst = false, refuseAll = false } = {}) {
  const on = {};
  let plays = 0;
  const menu = { open: true, addEventListener: (k, f) => { on[k] = f; } };
  const classes = new Set(), video = {
    src: null, playing: false, has: c => classes.has(c),
    classList: { add: c => classes.add(c), remove: (...cs) => cs.forEach(c => classes.delete(c)) },
    getAttribute: () => video.src, pause() { video.playing = false; },
    play() { video.playing = true; return refuseAll || (refuseFirst && !plays++) ? Promise.reject(new Error('AbortError')) : (plays++, Promise.resolve()); },
  };
  const mq = { matches: wide, addEventListener: (k, f) => { mq.change = f; } };
  const win = {
    matchMedia: () => ({ matches: reduced }), navigator: { connection: { saveData } },
  };
  const clip = setupHeroVideo({ menu, video, wide: mq, win });
  return { clip, video, menu, on, mq, get shown() { return classes.has('on'); } };
}
const card = (game, video) => ({ dataset: video ? { game, video: `/v/${game}.mp4`, videoTall: `/v/${game}-tall.mp4` } : { game, soon: '' } });

const a = make();
a.clip.show(card('tap', true));
assert(a.video.src === '/v/tap.mp4' && a.video.playing, 'a live game\'s clip loads and plays at once');
assert(a.video.has('due') && !a.shown, 'its card picture hides while the clip loads');
assert.equal(a.video.poster, '/v/tap.jpg', '…and the clip shows its own first frame meanwhile');
await null;
assert(a.shown, 'then the wide clip shows over the still');
for (const kind of ['pointermove', 'pointerdown', 'keydown', 'wheel']) assert(!a.on[kind], `a ${kind} never stops it`);
a.on.close();
assert(!a.shown && !a.video.playing && !a.video.has('due'), 'a closed sheet plays nothing and shows the picture');

// two starts in a row: the first one's play is aborted, and must not bring the picture back over the second
const r = make({ refuseFirst: true });
r.clip.show(card('tap', true)); r.clip.show(card('pop', true));
await null; await null;
assert(r.video.has('due') && r.shown, 'an aborted earlier play leaves the latest clip alone');
const f = make({ refuseAll: true });
f.clip.show(card('tap', true)); await null; await null;
assert(!f.video.has('due') && !f.shown, 'a refused play brings the picture back');

const b = make();
b.clip.show(card('aviat-1', false));
assert(b.video.src === null && !b.video.has('due'), 'a surprise card has no clip and keeps its picture');

const c = make({ wide: false });
c.clip.show(card('pop', true));
assert.equal(c.video.src, '/v/pop-tall.mp4', 'a phone plays the upright clip');
assert.equal(c.video.poster, '/v/pop-tall.jpg', 'with the upright first frame');
c.mq.matches = true; c.mq.change();
assert.equal(c.video.src, '/v/pop.mp4', 'turning a tablet swaps to the wide one');

for (const opts of [{ reduced: true }, { saveData: true }]) {
  const d = make(opts);
  d.clip.show(card('tap', true));
  assert(d.video.src === null && !d.video.has('due'), `no clip with ${Object.keys(opts)[0]}`);
}
console.log('games hero clip: plays at once, live games only, phone and wide clips, kept through moves ok');
