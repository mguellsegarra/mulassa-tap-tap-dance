// What the project already has of each pending figure, kept by hand. `agreement` only with a written agreement that can be
// shown (said when there is one, not required: the owner, 16/11/2026); `builder` once somebody is making it on GitHub.
// A figure without an entry has nothing yet.
export const MATERIALS = ['photos', 'score', 'video', 'choreography'];
const PROGRESS = {
  'bou-tradicional-valls': { photos: true, score: true, video: true, choreography: true, builder: true, soon: true },
  'bou-valls': { photos: true }, 'lleo-valls': { photos: true }, 'gegant-calcot-valls': { photos: true }, 'gegant-campanar-valls': { photos: true },
  ...Object.fromEntries(['basilisc-valls', 'aliga-valls', 'os-trabucaires-valls', 'cavallets-valls', 'nans-valls', 'gegants-ciutat-valls']
    .map(id => [id, { photos: true, video: true, score: true, choreography: true, builder: true }])), // the Seguici's, everything in hand
};
// soon: on its way, said by hand whatever else the list says; waiting: material missing; open: everything verified, nobody making it; preparing: everything, and somebody is on it
export function progressOf(figure) {
  const p = PROGRESS[figure.id] ?? {}, have = MATERIALS.filter(m => p[m]);
  const complete = have.length === MATERIALS.length;
  return { have, builder: !!p.builder, agreement: !!p.agreement, status: p.soon ? 'soon' : !complete ? 'waiting' : p.builder ? 'preparing' : 'open' };
}
