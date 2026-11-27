// The dev pairing of a figure with another figure's song (?canco=<key>, src/game/figure-song.js): only a figure with the
// anySong trait (danced by the generic engine) takes it; the Mulassa, the Drac and the Bou keep their own songs (their
// hand-made dances are tied to them); a swapped song is flagged so the run leaves nothing as the figure's own
// (tests/render/sheets-share.mjs); the radio keeps every figure's real recording, and the selector names the song danced.
// A public host never sees ?canco. Runs itself again for ?canco=<its own song> and an unknown key.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const KEY = process.env.SONG_SWAP_CANCO ?? 'mulassa';
globalThis.location = { hostname: 'localhost', search: `?canco=${KEY}` }; // a dev host (core/flags.js)
globalThis.__DEV_FIGURES__ = true; // the dev server plays the unreleased Tombairot
const runtime = await import('../../src/game/figure-song.js');
const { devSearch } = await import('../../src/core/flags.js');
const { FIGURE_TRAITS } = await import('../../src/figures/index.js');
const { FIGURES } = await import('../../src/game/figures.js');
const TOMBA = 'tombairot-valls', fig = id => FIGURES.find(f => f.id === id), aligot = runtime.figureSong(TOMBA);

if (KEY !== 'mulassa') { // ?canco=tombairot (its own song) or a key that is no song (?canco=constructor): nothing swaps
  assert.equal(runtime.setFigureSong(TOMBA), true);
  assert.equal(runtime.song, aligot, `?canco=${KEY}: the Tombairot dances its own song`);
  assert.equal(runtime.songSwapped, false, `?canco=${KEY}: and its run is its own`);
  process.exit(0);
}
assert.equal(new URLSearchParams(devSearch({ hostname: 'mulassa.cat', search: '?canco=mulassa&figura=tombairot' })).has('canco'), false, 'a public host drops ?canco');
const mulassa = runtime.menuSong;
assert.deepEqual(Object.keys(FIGURE_TRAITS).filter(id => FIGURE_TRAITS[id].anySong), [TOMBA], 'only the Tombairot dances any song so far');
for (const id of ['mulassa-valls', 'drac-valls', 'bou-tradicional-valls']) {
  assert.equal(runtime.setFigureSong(id), true);
  assert.equal(runtime.songSwapped, false, `${id}: its own song, whatever ?canco says`);
  assert.equal(runtime.song, runtime.figureSong(id));
  assert.equal(runtime.songCredit(fig(id)), fig(id), `${id}: its own song's credits`);
  if (id !== 'mulassa-valls') assert.notEqual(runtime.song, mulassa, `${id}: not the Mulassa's`);
}
assert.equal(runtime.setFigureSong(TOMBA), true);
assert.equal(runtime.song, mulassa, 'the Tombairot dances the song asked for');
assert.equal(runtime.BEATS, mulassa.beats, '... on its beat grid');
assert.equal(runtime.songSwapped, true, '... and its run is marked as not its own');
assert.equal(runtime.danceSong(TOMBA), mulassa, 'its dance reads the same song');
assert.notEqual(aligot, mulassa, 'free play\'s radio keeps its own recording (the Aligot row plays the Aligot)');
assert.equal(runtime.songCredit(fig(TOMBA)).song, fig('mulassa-valls').song, 'the selector names the song it dances, with its credits');
assert.equal(runtime.setFigureSong('drac-valls'), true);
assert.equal(runtime.songSwapped, false, 'back to a figure on its own song');
const self = fileURLToPath(import.meta.url);
for (const key of ['tombairot', 'constructor']) execFileSync(process.execPath, [self], { env: { ...process.env, SONG_SWAP_CANCO: key }, stdio: 'inherit' });
console.log('song swap ok: ?canco only reaches the anySong figures, never on a public host');
