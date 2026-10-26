// The Drac's fire on the people (drac-soot.js), as the crowd reads it (scene/crowd-effects.js): the charred stay rooted
// to the spot, their pose held black over the live one.
import { sootPose, sootAnchored } from './drac-soot.js';

export const DRAC_CROWD = {
  anchored: sootAnchored,
  pose(p) { if (p.sootW > 0) sootPose(p); },
};
