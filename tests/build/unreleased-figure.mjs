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
