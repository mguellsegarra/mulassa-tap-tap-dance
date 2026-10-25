// The Mulassa on the shared stage (scene/figure-scenes.js): shown, her colla and the plaça's cheers, her motion and the
// share photo's pose. She also hosts the splash, where the Drac dances beside her (scene/stage-motion.js).
import { FRONT } from '../../scene/stage.js';
import { mula, mulaCarriers, mulaColla } from './mula-objects.js';
import { MULA_COLLA_SPOTS, mulaCollaTick, resetMulaFeet } from './mula-stage.js';
import { MULA_CHEERS, cheerAt } from './mula-figures.js';
import { nominalFoot } from './mula-supports.js';
import { animPlayableMula } from './mula-play.js';
import { newPose, dancePose, END_BEAT } from '../../game/dance.js';
import { G, clock } from '../../game/state.js';
import { REEL } from '../../game/showreel.js';
import { pulse } from '../../core/anim.js';
import { M } from '../../scene/figure-springs.js';

const HERO_POSE = newPose(), HERO_SHELL = {}, HERO_FEET = Array.from({ length: 8 }, () => ({}));
export const MULA_SCENE = {
  id: 'mulassa-valls',
  hostsSplash: true, // the splash's pair is hers: the stage hands her the Drac beside her
  root: () => mula.root,
  show(on) { mula.root.visible = on; },
  reset: resetMulaFeet, // another figure took the stage, or the splash pair changed hands: her shoes start afresh
  // the plaça answers her culades, charges and final hit (cheerT: the crowd's cue, crowd.js) and every big hit (biteT)
  collaTick(on, beat, dt, reel) {
    const danceNow = reel ? REEL.beat : beat, cheering = on && (G.state === 'play' && !G.practice && !G.collapseT || reel);
    if (cheering && danceNow - M.danceBeat < 1) for (const c of MULA_CHEERS) if (M.danceBeat < c && c <= danceNow) M.cheerT = clock;
    mulaCollaTick(on, beat, dt, M.danceBeat, Math.max(cheering ? cheerAt(danceNow) : 0, pulse(M.biteT, 0.8)));
  },
  collaSpots: MULA_COLLA_SPOTS, colla: () => mulaColla,
  animate: animPlayableMula,
  hero: {
    scale: 1,
    pose() { // standing tall on the last hit: front up, head high, a three-quarter view (a collapse is never shared)
      dancePose(HERO_POSE, END_BEAT);
      mula.root.position.set(M.pos.x, HERO_POSE.lift * 2, M.pos.y);
      mula.root.rotation.set(0, FRONT + 0.55, 0);
      mula.body.rotation.set(HERO_POSE.pitchBias * 2, 0, 0.03);
      mula.body.scale.set(1, 1, 1);
      mula.neck.rotation.set(-0.05, 0.2, 0); mula.head.rotation.set(0.05, 0, 0); mula.jaw.rotation.set(0.35, 0, 0);
      mula.ears.forEach(e => (e.rotation.x = -0.5));
      // her carriers stand under her, one foot of each a little off the floor, mid-step
      Object.assign(HERO_SHELL, { x: M.pos.x, z: M.pos.y, yaw: FRONT + 0.55, roll: 0.03, pitch: mula.body.rotation.x });
      HERO_FEET.forEach((f, i) => { nominalFoot(HERO_SHELL, i, f); f.y = i % 2 ? 0.06 : 0; });
      mulaCarriers.group.visible = true;
      mulaCarriers.pose(mula, HERO_FEET);
    },
  },
};
