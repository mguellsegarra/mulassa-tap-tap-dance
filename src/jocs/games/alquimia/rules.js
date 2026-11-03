import { BASE, RECIPES } from './recipes.js';

// One open list: every recipe exists from the start. An element can have several recipes.
export function rulesFor(recipes = RECIPES) {
  const all = [...new Set([...BASE, ...recipes.map(r => r[2])])];
  return {
    all,
    // Mixing never loses anything: at worst nothing happens.
    mix(found, a, b) {
      const result = recipes.find(([x, y]) => (x === a && y === b) || (x === b && y === a))?.[2];
      return { result: result ?? null, isNew: !!result && !found.includes(result) };
    },
    // Two things the player owns that would make something new, to get a child unstuck.
    hint: found => recipes.find(([a, b, r]) => found.includes(a) && found.includes(b) && !found.includes(r))?.slice(0, 2) ?? null,
    // Nothing new can come out of it any more.
    isFinished: (found, id) => !recipes.some(r => (r[0] === id || r[1] === id) && !found.includes(r[2])),
    ingredientsOf: id => recipes.find(r => r[2] === id)?.slice(0, 2) ?? null,
    // Whatever localStorage holds: keep what still exists, and the base elements always.
    restore(saved) {
      const list = Array.isArray(saved) ? saved.filter(id => all.includes(id)) : [];
      return [...new Set([...BASE, ...list])];
    },
  };
}
