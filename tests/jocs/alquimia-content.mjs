import test from 'node:test';
import assert from 'node:assert/strict';
import { BASE, RECIPES } from '../../src/jocs/games/alquimia/recipes.js';
import { rulesFor } from '../../src/jocs/games/alquimia/rules.js';
import { COPY } from '../../src/jocs/games/alquimia/copy.js';
import { SOURCES } from '../../src/jocs/games/alquimia/sources.js';

test('every pair is unambiguous and every named element can be discovered from the base', () => {
  const pairs = new Set(), rules = rulesFor(), found = new Set(BASE);
  for (const [a, b] of RECIPES) {
    const key = [a, b].sort().join('|');
    assert(!pairs.has(key), `duplicate recipe: ${key}`);
    pairs.add(key);
    assert(rules.all.includes(a) && rules.all.includes(b), `unknown ingredient: ${key}`);
  }
  let previous;
  do {
    previous = found.size;
    for (const [a, b, result] of RECIPES) if (found.has(a) && found.has(b)) found.add(result);
  } while (found.size !== previous);
  assert.deepEqual(rules.all.filter(id => !found.has(id)), []);
  for (const id of rules.all) assert(COPY.alquimia.items[id]?.name, `missing name: ${id}`);
});

test('each curiosity has a source, and each source belongs to a curiosity', () => {
  for (const [id, item] of Object.entries(COPY.alquimia.items)) {
    if (item.fact) assert.match(SOURCES[id] ?? '', /^https:\/\//, `missing source: ${id}`);
  }
  for (const id of Object.keys(SOURCES)) assert(COPY.alquimia.items[id]?.fact, `orphan source: ${id}`);
});

test('approved recipes and the book prefer the intuitive calçot combinations', () => {
  const rules = rulesFor();
  assert.equal(rules.mix(BASE, 'brasa', 'aigua').result, 'vapor');
  assert.equal(rules.mix(BASE, 'vent', 'foc').result, 'fum');
  assert.equal(rules.mix(BASE, 'perles', 'persona').result, 'alcaldessa');
  assert.deepEqual(rules.ingredientsOf('calcot'), ['ceba', 'terra']);
  assert.deepEqual(rules.ingredientsOf('calcotada'), ['calcot', 'foc']);
});
