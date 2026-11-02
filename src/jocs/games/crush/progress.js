// What this device remembers of the game; nothing here leaves it.
const LOSSES_KEY = 'minijocs.crush.losses'; // times each level was lost since last won
const STARS_KEY = 'minijocs.crush.stars'; // best stars per level; a level opens once the previous has any

// A progress record can be damaged or edited by hand: it must never stop the game from opening.
function load(key, valid, fallback) {
  try {
    const saved = JSON.parse(localStorage.getItem(key));
    return valid(saved) ? saved : fallback;
  } catch { return fallback; }
}
export const loadStars = () => load(STARS_KEY, Array.isArray, []);
export const loadLosses = () => load(LOSSES_KEY, v => v && typeof v === 'object' && !Array.isArray(v), {});
export const saveStars = stars => localStorage.setItem(STARS_KEY, JSON.stringify(stars));
export const saveLosses = losses => localStorage.setItem(LOSSES_KEY, JSON.stringify(losses));
