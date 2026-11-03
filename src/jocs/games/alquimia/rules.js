import { BASE, RECIPES, VALLS } from './recipes.js';

// One open list: every recipe exists from the start. An element can have several recipes.
export function rulesFor(recipes = RECIPES) {
  const all = [...new Set([...BASE, ...recipes.map(r => r[2])])];
  const valls = all.filter(id => VALLS.has(id)), general = all.filter(id => !VALLS.has(id));
  return {
    all, general, valls,
    // How far along: the rest of the world, and Valls apart.
    progress: found => ({ general: found.filter(id => !VALLS.has(id)).length, valls: found.filter(id => VALLS.has(id)).length }),
    // Mixing never loses anything: at worst nothing happens.
    mix(found, a, b) {
      const result = recipes.find(([x, y]) => (x === a && y === b) || (x === b && y === a))?.[2];
      return { result: result ?? null, isNew: !!result && !found.includes(result) };
    },
    // Two things the player owns that would make something new, to get a child unstuck.
    // The rest of the world first: a hint is never spent on a Valls extra while something general is left.
    hint(found) {
      const open = recipes.filter(([a, b, r]) => found.includes(a) && found.includes(b) && !found.includes(r));
      return (open.find(([, , r]) => !VALLS.has(r)) ?? open[0])?.slice(0, 2) ?? null;
    },
    ingredientsOf: id => recipes.find(r => r[2] === id)?.slice(0, 2) ?? null,
    // Whatever localStorage holds: keep what still exists, and the base elements always.
    restore(saved) {
      const list = Array.isArray(saved) ? saved.filter(id => all.includes(id)) : [];
      return [...new Set([...BASE, ...list])];
    },
  };
}
