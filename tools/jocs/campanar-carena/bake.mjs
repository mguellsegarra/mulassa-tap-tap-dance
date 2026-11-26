// Write Tower's mountains, public/jocs/campanar/carena-<device>.svg (the whole round, carena360), from src/jocs/games/campanar/carena.json (the
// tuner's «Copia», pasted there). node tools/jocs/campanar-carena/bake.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { carena360 } from './carena.mjs';

const at = p => new URL(p, import.meta.url);
const settings = JSON.parse(readFileSync(at('../../../src/jocs/games/campanar/carena.json'), 'utf8'));
const pano = JSON.parse(readFileSync(at('pano.json'), 'utf8'));
for (const device of Object.keys(settings).filter(k => k !== 'tots')) { // each device: its own values over «tots»
  writeFileSync(at(`../../../public/jocs/campanar/carena-${device}.svg`), carena360(pano, { ...settings.tots, ...settings[device] }));
  console.log(`carena-${device}.svg`);
}
