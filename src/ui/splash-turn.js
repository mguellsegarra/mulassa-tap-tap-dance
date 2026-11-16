// The splash's turn counter: which figure the splash shows this load (figures/index.js splashSoloAt: the Bou alone
// first, then turns with the pair). The visit count lives in the player's storage; the stage only gets the figure.
import { store } from '../platform/storage.js';
import { splashSoloAt } from '../figures/index.js';
import { setSplashSolo } from '../scene/stage-motion.js';

const visit = Number(store.get('splash-turn')) || 0;
store.set('splash-turn', String(visit + 1));
setSplashSolo(splashSoloAt(visit));
