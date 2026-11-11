// The figures' traits (src/figures/index.js): one row per playable figure, every value one the shared systems know.
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { FIGURE_TRAITS, PLAYABLE_IDS, traitsOf, traitsByKey, idOfKey, figureOfVersion, splashSoloAt } from '../../../src/figures/index.js';
import { FIGURES, playable } from '../../../src/game/figures.js';
import { CURRENT_SCORE_VERSION, DRAC_SCORE_VERSION, BOU_SCORE_VERSION, LEGACY_SCORE_VERSION, SHORT_SCORE_VERSION } from '../../../src/game/score-scale.js';

assert.deepEqual([...PLAYABLE_IDS].sort(), FIGURES.filter(playable).map(f => f.id).sort(), 'a row for every playable figure, and none for the others');
const keys = PLAYABLE_IDS.map(id => FIGURE_TRAITS[id].key);
assert.equal(new Set(keys).size, keys.length, 'short names are unique');
for (const id of PLAYABLE_IDS) {
  const t = FIGURE_TRAITS[id];
  assert(existsSync(new URL(`../../../src/figures/${t.key}/`, import.meta.url)), `${id}: its folder src/figures/${t.key}/`);
  assert(['balloon', 'carretilles', 'esquellot'].includes(t.drumroll), `${id}: a drumroll the HUD draws`);
  assert(['fem', 'masc'].includes(t.article) && ['mula', 'drac'].includes(t.playCam) && [null, 'sparks'].includes(t.photoE), `${id}: known values`);
  assert.equal(typeof t.novelty, 'boolean', `${id}: novelty is a yes or no`);
  assert.equal(traitsByKey(t.key), t); assert.equal(idOfKey(t.key), id); assert.equal(traitsOf(id), t);
}
assert(PLAYABLE_IDS.filter(id => FIGURE_TRAITS[id].novelty).length <= 1, 'one new figure at a time leads the selector');
assert.equal(traitsOf('nobody'), FIGURE_TRAITS['mulassa-valls'], 'an unknown id falls back to the Mulassa');
assert.equal(idOfKey('nobody'), null);
for (const [v, id] of [[CURRENT_SCORE_VERSION, 'mulassa-valls'], [LEGACY_SCORE_VERSION, 'mulassa-valls'], [SHORT_SCORE_VERSION, 'mulassa-valls'],
  [DRAC_SCORE_VERSION, 'drac-valls'], [BOU_SCORE_VERSION, 'bou-tradicional-valls']]) assert.equal(figureOfVersion(v), id, `${v} belongs to ${id}`);
console.log(`figure traits ok: ${PLAYABLE_IDS.length} playable figures`);
// The splash: the new figure alone on the first three visits after an update, then taking turns with the pair (null)
assert.deepEqual(Array.from({ length: 8 }, (_, v) => splashSoloAt(v, ['bou'])), ['bou', 'bou', 'bou', null, 'bou', null, 'bou', null]);
assert.deepEqual([0, 3, 4].map(v => splashSoloAt(v, [])), [null, null, null], 'no splashSolo figure: always the pair');
