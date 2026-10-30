// Keep the band's instrument rig and the attendants' reference-led uniforms and gestures.
import { buildPerson } from '../models/people.js';
import { buildMusician } from '../models/band.js';
import { buildHelper } from '../models/colla.js';
import { MULA_HELPER_LOOKS } from '../../figures/mulassa/mula-suit.js';
import { catalogueSpec, buildFigure, disposeFigure } from './models.js';
import { SKIN } from './kit.js';

function prototypeBody(spec, headOnly = false) {
  const figure = buildFigure(spec), mesh = figure.body;
  mesh.removeFromParent();
  if (headOnly) {
    // The model contract places the head at torso-local y=.6. Keep triangles whose middle is above the neck: the
    // skull's sides and face reach down to y=.6 itself (an every-vertex test dropped them: only eyes and hair showed).
    const g = mesh.geometry, pos = g.attributes.position, ix = g.index, kept = [];
    for (let i = 0; i < ix.count; i += 3) {
      const tri = [ix.getX(i), ix.getX(i + 1), ix.getX(i + 2)];
      if (tri.reduce((y, v) => y + pos.getY(v), 0) / 3 > 0.60001) kept.push(...tri);
    }
    g.setIndex(kept); g.translate(0, -0.6, 0);
  }
  disposeFigure(figure);
  return mesh;
}
// Who plays each line-up's first places. The cobla's flabiol is a fair woman with long light-brown blonde hair: a look of her own,
// so the public and the banda keep p01's.
export const MUSICIANS = { banda: ['p01', 'p03', 'p07'].map(catalogueSpec), cobla: [{ ...catalogueSpec('p01'), skin: SKIN[4], hair: { style: 'llarg', colour: '#a67c45' } }, catalogueSpec('p03')] };
export function reviewMusician(spec, kind, look) {
  const { shirt, pants } = look;
  const p = buildPerson({ shirt, pants, skin: spec.skin, hair: spec.hair.colour });
  p.torso.remove(p.body); p.body.geometry.dispose();
  p.body = prototypeBody({ ...spec, age: 'adult', height: 1, build: 'mitja', mobility: null,
    top: { kind: 'camisa', colour: shirt }, bottom: { kind: 'pantalons', colour: pants } });
  p.torso.add(p.body);
  return Object.assign(buildMusician(kind, look, p), { meta: spec.meta, kind });
}
export function reviewAttendant(spec, index) {
  const p = buildHelper({ ...MULA_HELPER_LOOKS[index], skin: spec.skin }, index + 1);
  for (const m of [...p.head.children]) { p.head.remove(m); m.geometry.dispose(); }
  p.head.add(prototypeBody({ ...spec, height: 1, mobility: null }, true));
  return Object.assign(p, { meta: spec.meta });
}

// These variants change appearance, not the owning band's/crew's animation. Link once, follow the canonical rig.
export function linkRolePose(figure, source) {
  const bones = p => p.bones ?? [p.torso, ...p.legs, ...p.arms];
  const own = bones(figure), original = bones(source);
  if (own.length !== original.length) throw new Error('Representation role rig does not match its source');
  return own.map((bone, i) => [bone, original[i], original[i].quaternion.clone()]);
}
export function followRolePose(links, dt = Infinity) {
  for (const [bone, source, current] of links) {
    current.rotateTowards(source.quaternion, 6 * Math.max(0, dt));
    bone.position.copy(source.position); bone.quaternion.copy(current); bone.scale.copy(source.scale);
  }
}
