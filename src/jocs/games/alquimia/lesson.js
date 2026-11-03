// The first game's guided start, pure: game.js asks it at each moment and keeps the stage. Stages: mix (Foc, then
// Aigua) → hint (tap the bulb) → follow (the hint's two elements) → book → done (the send-off, shown once) → null.
// Meanwhile only what the hand points at answers, so a stray tap can't lose the thread.
export const LESSON = ['foc', 'aigua'];

// A new player only: the starting elements, or those and Vapor (back after leaving halfway).
export const lessonStart = ({ done, found, starters, vaporNew }) => (done || found > starters + 1 ? null : vaporNew ? 'mix' : 'hint');

// The element the next tap must be, if the stage waits for one.
export const expectedPick = (stage, picked, pair) => (stage === 'mix' ? LESSON : stage === 'follow' ? pair ?? [] : [])[picked];
export const acceptsPick = (stage, id, picked, pair) => !stage || stage === 'done' || id === expectedPick(stage, picked, pair);
export const acceptsHint = stage => stage !== 'mix' && stage !== 'book';
export const afterHint = stage => (stage === 'hint' ? 'follow' : stage);
export const afterDiscovery = stage => ({ mix: 'hint', follow: 'book' })[stage] ?? stage;

// Where the hand goes: 'hint', 'book', an element id, or nowhere. Nothing while a mix plays out: the next step waits
// until the discovery has been seen and closed.
export function coachTarget(stage, { locked, picked, pair }) {
  if (locked || !stage) return null;
  if (stage === 'hint' || stage === 'book') return stage;
  return (picked < 2 && expectedPick(stage, picked, pair)) || null;
}

// ?nou (main.js passes Q, so dev and LAN hosts only, never production): wipe this game's saved state and play as a new
// player; ?nou=pista starts the tutorial at the hint step, Vapor already found. Before the game reads the progress.
export function newPlayer(q, storage) {
  if (!q.has('nou')) return;
  const ours = Array.from({ length: storage.length }, (_, i) => storage.key(i)).filter(k => k?.startsWith('minijocs.alquimia.'));
  ours.forEach(k => storage.removeItem(k)); // collected first: removing shifts the indices
  if (q.get('nou') === 'pista') storage.setItem('minijocs.alquimia.found', JSON.stringify(['vapor']));
}
