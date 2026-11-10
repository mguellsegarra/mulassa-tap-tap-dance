// The approved Bou roster in the explorer: the same instruments and people as the game's grallers line-up.
import { reviewMusician, MUSICIANS } from '../../scene/representation/role-models.js';
import { GRALLERS, BAND_LOOKS } from '../../scene/models/band.js';
const BOU_MUSICIAN_NAMES = ['Gralla I', 'Gralla II', 'Gralla baixa', 'Timbaler'];
export const BOU_MUSICIAN_PARTS = GRALLERS.map(([kind], i) => ({ id: `M${i + 1}`, name: BOU_MUSICIAN_NAMES[i], kind }));
export function buildBouMusicians() {
  return BOU_MUSICIAN_PARTS.map((part, i) => {
    const p = reviewMusician(MUSICIANS.grallers[i], part.kind, BAND_LOOKS.grallers);
    p.g.position.x = (i - 1.5) * 1.15;
    return Object.assign(p, part);
  });
}
