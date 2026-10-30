// The playable figures as the shared scene drives them (scene/stage-motion.js): each figure's folder exports its hooks
// (figures/<key>/<key>-scene.js) and a new figure adds its line here. A hook set: id, root(), show(on),
// collaTick(on, beat, dt, reel), collaSpots, colla(), animate(dt, beat, live, reel, splash), leave() and reset()
// (optional: another figure took the stage / it takes it afresh), onBoth?() (its answer to a both-buttons hit), endShot?(dt, shift)
// (ui/frame-camera.js: its song's end shot), band? (its musicians, a line-up in models/band.js; default the banda) and hero { scale, pose(), fx?(), save?(saved), restore?() }. The first is the fallback.
import { MULA_SCENE } from '../figures/mulassa/mula-scene.js';
import { DRAC_SCENE } from '../figures/drac/drac-scene.js';
import { BOU_SCENE } from '../figures/bou/bou-scene.js';

export const FIGURE_SCENES = [MULA_SCENE, DRAC_SCENE, BOU_SCENE].filter(Boolean); // an unreleased figure's is null in a build
export const sceneOf = id => FIGURE_SCENES.find(f => f.id === id) ?? null;
