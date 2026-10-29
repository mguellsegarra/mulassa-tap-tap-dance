// The published chart, mulassa-v1 (src/song.json at 96312f5, byte for byte): the historical contract's numbers are this chart's.
// Current short-song validation is checked independently; both versions retain their actual counts. Its GLOBUS windows are the generator's drumrolls then (the song carried none: chart.js had them as a constant).
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const raw = readFileSync(new URL('../figures/common/fixtures/mulassa-v1-song.json', import.meta.url));
if (createHash('sha256').update(raw).digest('hex') !== 'd5ed799bfc9f84e6f9a02d078fb6e68f73a273ccd86c9b3ea9e685ec649d77b8')
  throw new Error('tests/figures/common/fixtures/mulassa-v1-song.json is not the published mulassa-v1 chart');
export const v1Song = Object.freeze({ ...JSON.parse(raw), balloonBeats: [[140, 143], [240, 243], [308, 312]] });
