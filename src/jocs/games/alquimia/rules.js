import { BASE, CHAPTERS } from './recipes.js';

const TO_OPEN_NEXT = .7; // share of a chapter that opens the next one

// The rules of one collection: only its own recipes exist.
export function rulesFor(recipes) {
  const all = [...BASE, ...recipes.map(r => r[2])];
  const chapters = CHAPTERS.map(list => list.filter(id => all.includes(id)));
  const chapterOf = id => chapters.findIndex(list => list.includes(id));
  // How many chapters are open. One already started stays open, whatever the count.
  const openChapters = found => {
    let open = 1;
    chapters.forEach((list, i) => {
      if (i && (list.some(id => found.includes(id)) || (open === i && chapters[i - 1].filter(id => found.includes(id)).length >= Math.ceil(chapters[i - 1].length * TO_OPEN_NEXT)))) open = i + 1;
    });
    return open;
  };
  return {
    all,
    chapters,
    chapterOf,
    openChapters,
    // Mixing never loses anything: at worst nothing happens.
    mix(found, a, b) {
      const result = recipes.find(([x, y]) => (x === a && y === b) || (x === b && y === a))?.[2];
      if (!result) return { result: null, isNew: false };
      if (chapterOf(result) >= openChapters(found)) return { result: null, isNew: false, laterChapter: chapterOf(result) };
      return { result, isNew: !found.includes(result) };
    },
    // Two things the player owns that would make something new, to get a child unstuck.
    hint: found => recipes.find(([a, b, r]) => found.includes(a) && found.includes(b) && !found.includes(r) && chapterOf(r) < openChapters(found))?.slice(0, 2) ?? null,
    ingredientsOf: id => recipes.find(r => r[2] === id)?.slice(0, 2) ?? null,
    // Whatever localStorage holds: keep what still exists, and the base elements always.
    restore(saved) {
      const list = Array.isArray(saved) ? saved.filter(id => all.includes(id)) : [];
      return [...new Set([...BASE, ...list])];
    },
  };
}
