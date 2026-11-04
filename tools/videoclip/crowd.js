// The clip's crowd: rings of the game's voxel people (scene/models/people.js) round the dance floor, with reactions of
// their own: jumping on the kick in the drop, arms up when it lands, swaying with phone lights in the breaks, a cheer
// at the end. Seeded, and a pure function of t: the preview and the render agree.
import * as THREE from 'three';
import { buildPerson } from '/src/scene/models/people.js';
import { seeded } from './grid.js';
import edit from './edit.json';

const TAU = Math.PI * 2;

export function createCrowd(scene, g, labelOf, { inner = 7.2, rows = 6, gap = .75 } = {}) {
  const rnd = seeded(7), people = [];
  // a phone filming: held upright, its screen lit towards its owner; on its back (what the floor's cameras see) the
  // video light on and a red recording dot. Shared geometry and materials (a few hundred phones).
  const box = (w, h, d) => new THREE.BoxGeometry(w, h, d), basic = c => new THREE.MeshBasicMaterial({ color: c });
  const PHONE = [[box(.085, .155, .014), new THREE.MeshLambertMaterial({ color: '#1b1b22' }), 0, 0, 0], [box(.072, .138, .003), basic('#cfe8ff'), 0, 0, -.008],
    [box(.02, .02, .004), basic('#ffffff'), .022, .058, .008], [box(.012, .012, .004), basic('#ff2020'), -.022, .058, .008]];
  // the video light's halo, so a phone reads at the floor's distance (a soft additive sprite)
  const halo = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, '#ffffffff'); gr.addColorStop(.25, '#ffffff88'); gr.addColorStop(1, '#ffffff00'); x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
    return new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), blending: THREE.AdditiveBlending, depthWrite: false }); })();
  const real = Math.random; Math.random = rnd; // people.js picks its colours with Math.random: the same crowd every load
  try {
    for (let r = 0; r < rows; r++) {
      const rad = inner + r * gap, n = Math.floor(TAU * rad / .62);
      for (let k = 0; k < n; k++) {
        const a = (k + (r % 2) * .5) / n * TAU + (rnd() - .5) * .05;
        if (Math.abs(((a + Math.PI) % TAU) - Math.PI) < 1.6 / rad) continue; // a corridor in front, through every row: the cameras' way in
        if (edit.entry && Math.abs(((a % TAU) + TAU) % TAU - Math.PI) < 1.3 / rad) continue; // and one behind, her way in (people stepping aside slid through each other and flickered)
        const p = buildPerson({ kid: r === 0 && rnd() < .25 });
        const x = Math.sin(a) * (rad + (rnd() - .5) * .25), z = Math.cos(a) * (rad + (rnd() - .5) * .25);
        p.g.position.set(x, 0, z); p.g.rotation.y = Math.atan2(-x, -z); scene.add(p.g);
        // a phone in the right hand, out only in the breaks
        const phone = new THREE.Group(); for (const [geo, mat, x, y, z] of PHONE) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); phone.add(m); }
        const glow = new THREE.Sprite(halo); glow.position.set(.022, .058, .03); glow.scale.setScalar(.22); phone.add(glow);
        phone.scale.setScalar(1.6); // (voxel people: a true-size phone was two pixels at the floor's distance)
        phone.position.set(0, -.62, .07); phone.visible = false; p.arms[0].add(phone);
        people.push({ ...p, x, z, phase: rnd(), keen: .4 + .6 * rnd() * (1 - r / rows * .6), phoneUser: r < 2 && rnd() < .6, // (only the front rows: further back the people in front hide them)
        phone, hold: 1.35 + rnd() * .35 });
      }
    }
  } finally { Math.random = real; }

  // reaction of one person at t, by section
  function update(t, at) {
    const ph = g.phraseAt(t), label = labelOf(ph.index) ?? ph.label, b = g.beatAt(t), f = b - Math.floor(b), kick = g.kick(t);
    for (const p of people) {
      let jump = 0, armUp = 0, wave = 0, sway = 0, lean = 0;
      if (label === 'drop' || label === 'hard') { // jumping on the beat, arms up for the first bars; the keen ones never put them down
        jump = Math.max(0, Math.sin(Math.PI * ((f + p.phase * .15) % 1))) * .22 * p.keen;
        armUp = ph.beatIn < 8 || p.keen > .8 ? 1 : .35 + .65 * Math.max(0, Math.sin(b * Math.PI / 2 + p.phase * TAU));
        lean = (.5 - .5 * Math.cos(b * 2 * Math.PI)) * .06; // (smooth: the kick decay twitched)
      } else if (label === 'build') { // nodding and bouncing on the knees, hands rising as the phrase climbs
        const bob = .5 - .5 * Math.cos((b + p.phase * .2) * 2 * Math.PI); // a smooth bob a beat (the kick's 90 ms decay twitched: 'tremolis')
        jump = bob * .04 * p.keen; lean = bob * .06; armUp = Math.max(0, ph.at * 1.4 - .6) * p.keen;
      } else if (label === 'break' || label === 'vocal') { // swaying on two beats, phones up
        sway = Math.sin(b * Math.PI / 2 + p.x * .3) * .12; wave = p.phoneUser ? 1 : 0;
      } else if (label === 'outro') { // over the whole outro (its chunks were restarting the cheer): arms up from 60% of it, staying up
        const run = g.runOf(ph.index, labelOf), at = (Math.max(0, b) - run.beat) / (run.end - run.beat), up = Math.min(1, Math.max(0, (at - .6) / .1));
        armUp = up; jump = up * Math.abs(Math.sin(t * 9 + p.phase * TAU)) * .1;
      }
      else { sway = Math.sin(b * Math.PI / 4 + p.phase * TAU) * .04; } // intro: waiting
      const sh = g.shout(t); if (sh.s < 1.2) { const k = 1 - sh.s / 1.2; armUp = 1; jump += k * .3 * p.keen; } // a shout: everyone up
      if (at.cheer) { armUp = Math.max(armUp, at.cheer); jump += at.cheer * .12 * p.keen; } // her rear kicks and skids: the plaça answers
      // the entrance (edit.json entry): the people by her way in turn to watch her pass, and back after
      let look = 0;
      if (edit.entry && t < edit.entry.end + 4 && p.z < 0 && Math.abs(p.x) < 3) look = Math.min(1, Math.max(0, (at.z - p.z + 4) / 2)) * (1 - Math.min(1, Math.max(0, (t - edit.entry.end) / 4)));
      const home = Math.atan2(-p.x, -p.z), turn = look ? ((Math.atan2(at.x - p.x, at.z - p.z) - home + 3 * Math.PI) % TAU) - Math.PI : 0; // (the short way round)
      p.g.rotation.y = home + turn * look * .8;
      p.g.position.y = jump;
      p.torso.rotation.set(lean, 0, sway);
      // filming: the arm forward to just above the shoulder (the phone at eye height), the phone turned back upright
      const up = Math.min(1, armUp), raise = wave ? p.hold : up * 2.75, swing = up ? Math.sin(b * Math.PI + p.phase * TAU) * .25 * up : 0;
      if (wave) p.phone.rotation.x = p.hold;
      p.arms[0].rotation.set(wave ? -raise : 0, 0, wave ? 0 : raise + swing);
      p.arms[1].rotation.set(0, 0, -(up * 2.75 - swing));
      p.phone.visible = !!wave && p.phoneUser;
    }
  }
  return { update, people };
}
