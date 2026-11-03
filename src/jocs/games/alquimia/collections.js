import { RECIPES } from './recipes.js';

// Elements only the Valls collection has.
const VALLS_ONLY = new Set(['valls', 'festamajor', 'lluminaries', 'decennals', 'maredeu', 'santaursula', 'santjoan', 'roser', 'vella', 'joves', 'alcaldessa', 'perles', 'bou', 'bouvalls', 'lleo', 'gitanes', 'primera', 'cercolets', 'pastorets', 'galeres', 'moixiganga', 'os', 'basilisc', 'aligons', 'refineria']);
// Elements both have, whose fact is about Valls: the general collection shows them without it.
const VALLS_FACTS = new Set(['drac', 'mulassa', 'aliga', 'cavallets', 'gegants', 'nans', 'seguici', 'correfoc', 'diables', 'castell', 'bastons', 'campanar']);

export const COLLECTIONS = [
  { id: 'catalana', art: '/jocs/alquimia/cards/colleccio-catalana.jpg', recipes: RECIPES.filter(r => !VALLS_ONLY.has(r[2])), hidesFact: id => VALLS_FACTS.has(id) },
  { id: 'valls', art: '/jocs/alquimia/cards/colleccio-valls.jpg', recipes: RECIPES, hidesFact: () => false },
];
