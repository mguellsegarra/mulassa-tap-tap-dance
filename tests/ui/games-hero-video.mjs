// The «Jocs» hero clip: only after a calm spell, only a live game's, the right shape for the screen, gone at any move.
import assert from 'node:assert/strict';
import { setupHeroVideo } from '../../src/ui/games-hero-video.js';

function make({ wide = true, reduced = false, saveData = false } = {}) {
  const on = {}, timers = new Map();
  let id = 0;
  const menu = { open: true, addEventListener: (k, f) => { on[k] = f; } };
  const classes = new Set(), video = {
    src: null, playing: false, classList: { add: c => classes.add(c), remove: c => classes.delete(c) },
    getAttribute: () => video.src, pause() { video.playing = false; }, play() { video.playing = true; return Promise.resolve(); },
  };
  const mq = { matches: wide, addEventListener: (k, f) => { mq.change = f; } };
  const win = {
    setTimeout: (f, ms) => { timers.set(++id, { f, ms }); return id; }, clearTimeout: t => timers.delete(t),
    matchMedia: () => ({ matches: reduced }), navigator: { connection: { saveData } },
  };
  const clip = setupHeroVideo({ menu, video, wide: mq, win });
  const elapse = async () => { const all = [...timers.values()]; timers.clear(); for (const t of all) t.f(); await null; };
  return { clip, video, menu, on, mq, timers, elapse, get shown() { return classes.has('on'); } };
}
const card = (game, video) => ({ dataset: video ? { game, video: `/v/${game}.mp4`, videoTall: `/v/${game}-tall.mp4` } : { game, soon: '' } });

const a = make();
a.clip.show(card('tap', true));
assert.equal([...a.timers.values()][0].ms, 2000, 'a clip waits for two calm seconds');
assert(!a.shown && a.video.src === null, 'nothing loads before then');
await a.elapse();
assert(a.shown && a.video.playing && a.video.src === '/v/tap.mp4', 'then the wide clip plays over the still');
a.on.pointermove();
assert(!a.shown && !a.video.playing, 'any move brings the still back');
await a.elapse();
assert(a.shown, '…and the clip comes again after the next calm spell');
a.on.close();
assert(!a.shown && !a.video.playing && a.timers.size === 0, 'a closed sheet plays nothing');

const b = make();
b.clip.show(card('aviat-1', false));
assert.equal(b.timers.size, 0, 'a surprise card has no clip');

const c = make({ wide: false });
c.clip.show(card('pop', true)); await c.elapse();
assert.equal(c.video.src, '/v/pop-tall.mp4', 'a phone plays the upright clip');
c.mq.matches = true; c.mq.change(); await c.elapse();
assert.equal(c.video.src, '/v/pop.mp4', 'turning a tablet swaps to the wide one');

for (const opts of [{ reduced: true }, { saveData: true }]) {
  const d = make(opts);
  d.clip.show(card('tap', true));
  assert.equal(d.timers.size, 0, `no clip with ${Object.keys(opts)[0]}`);
}
console.log('games hero clip: calm spell, live games only, phone and wide clips, stops on a move ok');
