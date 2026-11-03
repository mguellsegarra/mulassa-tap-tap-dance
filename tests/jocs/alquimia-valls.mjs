import test from 'node:test';
import assert from 'node:assert/strict';
import { BASE, RECIPES, VALLS } from '../../src/jocs/games/alquimia/recipes.js';
import { rulesFor } from '../../src/jocs/games/alquimia/rules.js';

const rules = rulesFor();

test('a player from elsewhere can finish every general element without one from Valls', () => {
  assert.deepEqual([...VALLS].filter(id => !rules.all.includes(id)), [], 'unknown Valls id');
  assert.equal(rules.general.length + rules.valls.length, rules.all.length);
  const found = new Set(BASE);
  let previous;
  do {
    previous = found.size;
    for (const [a, b, r] of RECIPES) if (found.has(a) && found.has(b) && !VALLS.has(r)) found.add(r);
  } while (found.size !== previous);
  assert.deepEqual(rules.general.filter(id => !found.has(id)), []);
  // the book shows the first recipe: for a general element it must not need Valls either
  for (const id of rules.general) assert(!(rules.ingredientsOf(id) ?? []).some(i => VALLS.has(i)), `book recipe needs Valls: ${id}`);
});

test('a hint is not spent on a Valls extra while something general is left', () => {
  const found = rules.general.filter(id => id !== 'pell'); // Bèstia + Foc (Bou Tradicional) is also open
  const pair = rules.hint(found);
  assert.equal(rules.mix(found, ...pair).result, 'pell');
  assert(VALLS.has(rules.mix(rules.general, ...rules.hint(rules.general)).result), 'once the rest is done, Valls');
});

test('progress counts the rest of the world and Valls apart', () => {
  assert.deepEqual(rules.progress([...BASE, 'valls', 'vella', 'vapor']), { general: BASE.length + 1, valls: 2 });
});
