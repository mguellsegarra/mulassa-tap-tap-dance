// The playable figures as the shared scene drives them (scene/stage-motion.js): each figure's folder exports its hooks
// (figures/<key>/<key>-scene.js) and a new figure adds its line here. A hook set: id, root(), show(on),
// collaTick(on, beat, dt, reel), collaSpots, colla(), animate(dt, beat, live, reel, splash), leave() and reset()
// (optional: another figure took the stage / it takes it afresh), hostsSplash (the splash's pair is its), endShot?(dt, shift)
// (main.js: its song's end shot) and hero { scale, pose(), fx?(), save?(saved), restore?() }. The first is the fallback.
import { MULA_SCENE } from '../figures/mulassa/mula-scene.js';
import { DRAC_SCENE } from '../figures/drac/drac-scene.js';
import { BOU_SCENE } from '../figures/bou/bou-scene.js';

export const FIGURE_SCENES = [MULA_SCENE, DRAC_SCENE, BOU_SCENE];
export const sceneOf = id => FIGURE_SCENES.find(f => f.id === id) ?? null;
