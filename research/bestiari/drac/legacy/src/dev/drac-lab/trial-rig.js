// The trial poses the real rig through scene/drac-motion.js unchanged, as one rigid shell. poseDrac counter-rolls the
// necks against `roll` and waves the tail with `drive`; the observed beast does neither (one carrier, one shell). So
// the trial's lean goes through `shake` (the body-only roll channel) and its `drive` (the feet planner reads it from
// the dance itself, for step height) stays out of the rig. tests/drac-trial.mjs checks every part stays still on the body.
import { poseDrac } from '../../scene/drac-motion.js';
import { newDracPose } from '../../game/dance-drac.js';

const S = newDracPose();
export function poseRigid(rig, p, front, feetAt) {
  Object.assign(S, p);
  S.shake = p.roll + p.shake; S.roll = 0; S.drive = 0;
  poseDrac(rig, S, front, feetAt);
}
