// The case's pictures, in public/jocs/murdoku/cards (made with imagegen, sources in docs/jocs/murdoku-textos.md).
const img = file => `<img src="/jocs/murdoku/cards/${file}" alt="" draggable="false">`;
export const figureArt = id => img(`fig-${id}.jpg`);
export const thingArt = id => img(`thing-${id}.png`);
export const objectArt = id => img(`obj-${id}.png`);
export const floorUrl = id => `/jocs/murdoku/cards/floor-${id}.jpg`;
