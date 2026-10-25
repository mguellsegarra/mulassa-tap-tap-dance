// The playable figures on the shared stage (src/scene/figure-scenes.js): every one, the Mulassa too, brings its hooks
// from its folder, and the shared scene files that walk the registry name no figure's folder.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { FIGURE_TRAITS } from '../../../src/figures/index.js';

const read = p => readFileSync(new URL(`../../../src/${p}`, import.meta.url), 'utf8');
const registry = read('scene/figure-scenes.js');
const files = [...registry.matchAll(/^import \{ \w+ \} from '\.\.\/(figures\/[a-z]+\/[a-z-]+\.js)';$/gm)].map(m => m[1]);
const ids = files.map(f => read(f).match(/^  id: '([a-z-]+)',$/m)?.[1]);
assert.deepEqual([...ids].sort(), Object.keys(FIGURE_TRAITS).sort(), 'one hook set per figure with a folder (a pending one\'s hooks wait unused)');
for (const [i, f] of files.entries()) {
  assert(f.startsWith(`figures/${FIGURE_TRAITS[ids[i]].key}/`), `${ids[i]}: its hooks live in its own folder`);
  const src = read(f);
  for (const hook of ['root', 'show', 'collaTick', 'collaSpots', 'colla', 'animate', 'hero']) assert.match(src, new RegExp(`\\b${hook}[:(]`), `${ids[i]}: ${hook}`);
}
// what each still takes from a figure's folder: the splash's Drac beside the Mulassa
const ALLOWED = { 'scene/stage-motion.js': ['drac/drac-play.js', 'drac/drac-demo.js'], 'scene/crowd.js': ['drac/drac-play.js'] };
for (const f of ['scene/share-capture.js', 'scene/crowd-grid.js', 'scene/crowd-pose.js', 'scene/crowd-mood.js', 'scene/photo-obstacles.js', 'scene/play-camera.js']) ALLOWED[f] = [];
// what the figures do to the people round them comes from their own folders too (crowd-effects.js)
for (const [, f] of read('scene/crowd-effects.js').matchAll(/^import \{ \w+ \} from '\.\.\/(figures\/[a-z]+\/[a-z-]+\.js)';$/gm))
  assert(Object.keys(FIGURE_TRAITS).some(id => f.startsWith(`figures/${FIGURE_TRAITS[id].key}/`)), `${f}: a figure's own folder`);
for (const [f, allowed] of Object.entries(ALLOWED)) {
  const other = [...read(f).matchAll(/from '\.\.\/figures\/([a-z]+\/[a-z-]+\.js)'/g)].map(m => m[1]).filter(d => !allowed.includes(d));
  assert.deepEqual(other, [], `${f} reaches the other figures through the registry`);
}
console.log('figure scenes: one hook set per figure in its folder, shared scene files free of them ok');
