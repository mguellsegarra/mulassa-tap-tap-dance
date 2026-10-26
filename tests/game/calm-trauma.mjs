// Reduced motion: no source can raise the camera shake (trauma); it still decays, and normal mode is unchanged.
import assert from 'node:assert/strict';
const media = { matches: true };
globalThis.matchMedia = () => media;
const M = await import('../../src/scene/manual-jump.js');
M.setTrauma(0.8); M.landingImpact(0.9); M.setTrauma(1);
assert.equal(M.trauma, 0, 'GUAPA, pop, finale, dance landings and manual landings add nothing');
media.matches = false;
M.setTrauma(0.5); M.landingImpact(0.9);
assert.equal(M.trauma, 0.9, 'normal mode: unchanged');
media.matches = true;
M.setTrauma(0.4);
assert.equal(M.trauma, 0.4, 'reduced motion still lets the shake decay');
M.clearManualImpact();
console.log('calm trauma ok');
