// A build swaps an unreleased figure's modules for stubs (tools/deploy/unreleased-figure.mjs); the portrait and a released set stay real.
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { parseAst } from 'rollup/parseAst';
import { unreleasedFigure } from '../../tools/deploy/unreleased-figure.mjs';

const ctx = { parse: parseAst };
const file = name => resolve('src/figures/bou', name);
const on = unreleasedFigure(new Set(['bou-tradicional-valls']));
const stub = on.load.call(ctx, file('bou-bills.js'));
assert.match(stub, /export const BOU_FINALE = inert;/);
assert.doesNotMatch(stub, /import /);
assert.equal(on.load.call(ctx, file('bou-portrait.js')), null);
assert.equal(unreleasedFigure(new Set()).load.call(ctx, file('bou-bills.js')), null);
console.log('unreleased-figure: ok');

// The real build, both ways: the Bou's code is in it exactly when the figure is released (empty set, as on feat/bou).
// Marker: the dev review link's path, which only lives in the Bou's own module.
import { build } from 'vite';
const bundled = async set => {
  const out = await build({ configFile: false, logLevel: 'silent', plugins: [unreleasedFigure(set)], build: { write: false, minify: false, reportCompressedSize: false } });
  return (Array.isArray(out) ? out : [out]).flatMap(o => o.output).some(c => c.type === 'chunk' && c.code.includes('/tools/dev/bou-dance.html'));
};
assert.equal(await bundled(new Set(['bou-tradicional-valls'])), false, 'unreleased: the Bou is not in the build');
assert.equal(await bundled(new Set()), true, 'released: the Bou is in the build');
console.log('unreleased-figure build: ok');
