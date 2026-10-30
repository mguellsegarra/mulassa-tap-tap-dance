// The Drac on the shared stage (scene/figure-scenes.js): shown, its colla, its motion and the share photo's pose.
import { drac, dracMat, colla, DRAC_YAW } from './drac-objects.js';
import { DRAC_SIZE, DRAC_SCALE } from './drac.js';
import { dracColla, COLLA_SPOTS } from './drac-dance.js';
import { animPlayableDrac, leaveSolo } from './drac-play.js';
import { newDracPose } from './dance-drac.js';
import { poseAt, REF_END } from './drac-pose.js';
import { feetAt } from './drac-steps.js';
import { placeDance } from './drac-layout.js';
import { poseCarrier } from './drac-rig.js';
import { dracFx, dracCrema } from './drac-show.js';

const SHARE_POSE = newDracPose();
let shareOpacity = 1;
export const DRAC_SCENE = {
  id: 'drac-valls',
  root: () => drac.root,
  band: 'cobla',
  show(on) { drac.root.visible = on; },
  collaTick: dracColla, collaSpots: COLLA_SPOTS, colla: () => colla,
  animate: animPlayableDrac, leave: leaveSolo, onBoth: dracCrema,
  hero: {
    scale: DRAC_SIZE.h * DRAC_SCALE / 4.03, // (figure-song.js figureScale)
    fx: () => Object.values(dracFx.objects).flat(),
    save(saved) {
      const life = drac.root.parent;
      saved.push([life, life.position.clone(), life.quaternion.clone(), life.scale.clone(), life.visible]);
      shareOpacity = dracMat?.opacity;
    },
    pose() {
      const life = drac.root.parent;
      placeDance(life, DRAC_YAW).scale.setScalar(DRAC_SCALE); life.visible = true; // its dance frame, where it settled (M.pos)
      if (dracMat) dracMat.opacity = 1;
      poseCarrier(drac, poseAt(SHARE_POSE, REF_END, 0, 0), feetAt); // the final settle, feet on their last spots
    },
    restore() { if (dracMat) dracMat.opacity = shareOpacity; },
  },
};
