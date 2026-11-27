// Every playable figure's scene objects, built and owned by its own folder (figures/<figure>/*-objects.js), as lists the
// low layers go round (quality, crowd-build, cameras, the selector): a new figure adds its builders and its root here.
// Its behaviour on the stage (motion, colla tick, share pose) is scene/figure-scenes.js's; this file only builds and lists.
import { mula, initMulaColla } from './mulassa/mula-objects.js';
import { drac, initDracModel, initDracColla } from './drac/drac-objects.js';
import { bou, initBouModel, initBouColla } from './bou/bou-objects.js';
import { tomba, initTombaModel, initTombaColla } from './tombairot/tomba-objects.js';

// Each colla, with `arena` (crowd-build.js RING: how far the crowd keeps while it is out; the Drac's seated ring is wider).
export const COLLAS = [];
// Built after the existing plaza/crowd setup so their material jitter does not change the plaça's random layout; in this
// order (each draws on Math.random through Vox's colour jitter).
export function initFigureObjects() {
  if (COLLAS.length) return;
  initDracModel(); initBouModel(); initTombaModel();
  COLLAS.push(Object.assign(initDracColla(), { arena: 'arena' }), Object.assign(initMulaColla(), { arena: 'arenaMula' }));
  const bouColla = initBouColla(); // null in a build while the Bou is unreleased (unreleased-bou.js)
  if (bouColla) COLLAS.push(Object.assign(bouColla, { arena: 'arenaMula' }));
  const tombaColla = initTombaColla(); // null in a build while the Tombairot is unreleased (unreleased-tombairot.js)
  if (tombaColla) COLLAS.push(Object.assign(tombaColla, { arena: 'arenaMula' }));
}
const ROOTS = { 'drac-valls': () => drac?.root, 'bou-tradicional-valls': () => bou?.root, 'tombairot-valls': () => tomba?.frame };
export const figureRoot = id => (ROOTS[id] ?? (() => mula.root))(); // the selector frames its outline
export function hideFigures() { // a pending selection: no figure and no colla on the plaça
  mula.root.visible = false; drac.root.visible = false; if (bou) bou.frame.visible = false; if (tomba) tomba.frame.visible = false;
  for (const c of COLLAS) c.helpers.visible = c.seated.visible = false;
}
