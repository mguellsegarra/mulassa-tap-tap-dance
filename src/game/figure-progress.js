// What the project already has of each pending figure, kept by hand. `agreement` only with a written agreement that can be
// shown; `builder` once somebody is making it on GitHub. A figure without an entry has nothing yet.
export const MATERIALS = ['photos', 'score', 'video', 'choreography'];
const PROGRESS = {
  'bou-tradicional-valls': { photos: true, score: true, video: true, choreography: true, builder: true, soon: true },
  'basilisc-valls': { photos: true, score: true, video: true, builder: true },
  'aliga-valls': { photos: true, video: true, score: true, builder: true }, 'os-trabucaires-valls': { photos: true, video: true, score: true, builder: true }, 'cavallets-valls': { photos: true, video: true, score: true, builder: true },
  'nans-valls': { photos: true, video: true, score: true, builder: true }, 'gegants-ciutat-valls': { photos: true, video: true, score: true, builder: true },
};
// soon: on its way, said by hand whatever else the list says; waiting: material or agreement missing; open: everything verified, nobody making it; preparing: everything, and somebody is on it
export function progressOf(figure) {
  const p = PROGRESS[figure.id] ?? {}, have = MATERIALS.filter(m => p[m]);
  const complete = have.length === MATERIALS.length && !!p.agreement;
  return { have, builder: !!p.builder, agreement: !!p.agreement, status: p.soon ? 'soon' : !complete ? 'waiting' : p.builder ? 'preparing' : 'open' };
}
