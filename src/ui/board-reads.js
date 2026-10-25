// The selector's reads of the boards (select-standings.js, select-podium.js): names as the boards show them; null: no answer.
import { baseName } from '../services/leaderboard-identity.js';

// Each selector visit reads the current session's rank on that figure's open board. Never reuse another profile's answer.
export async function standingOf(service, f = 'mulassa-valls') {
  if (!service.configured) return null;
  try {
    const rows = (await service.listAll({ figure: f })) ?? [];
    const self = rows.find(r => r.is_self);
    return { pos: Number(self?.position) || null, total: Number(self?.total ?? rows[0]?.total) || null, // rows: the selector's card (select-standings.js)
      rows: rows.map(r => ({ ...r, alias: baseName(r.alias, r.tag ?? null) })) }; // its names go through appendName, as here
  } catch { return null; }
}
// the selector's step 2 podium (select-podium.js): that level's best three, names as the boards show them; null: no answer
export async function podiumOf(service, f, level) {
  if (!service.configured) return null;
  try { return ((await service.levelPodium({ figure: f, level })) ?? []).map(r => ({ ...r, alias: baseName(r.alias, r.tag ?? null) })); } catch { return null; }
}
