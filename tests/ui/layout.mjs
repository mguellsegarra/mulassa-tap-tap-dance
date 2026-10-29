// Splash logo motion and shared layout contracts.
import assert from 'node:assert/strict';
import { readPage } from './page.mjs';
import { glintAt, popsAt, GLINT, POP } from '../../src/hud/logo-motion.js';

// the logo's motion: the glint crosses MULASSA once every GLINT.every s, after a pause; TAP, TAP, DANCE pop on three
// beats out of four, one at a time, small, and settle before the next
const g = [...Array(1000)].map((_, i) => glintAt(i * GLINT.every / 1000));
assert(g[0] === null && g.at(-1) > 0.95 && g.filter(x => x != null).length / 1000 < 0.2, 'the glint: a short sweep, then a pause');
assert(g.every((x, i) => x == null || g[i - 1] == null || x >= g[i - 1]), 'the glint only moves forwards');
const out = [0, 0, 0], peak = [0, 0, 0, 0];
for (let b = 0; b < 8; b += 0.01) { popsAt(b, out); assert(out.filter(Boolean).length <= 1, `one word at a time (${b})`); out.forEach((x, i) => { peak[i] = Math.max(peak[i], x); }); if (Math.floor(b) % 4 === 3) assert(out.every(x => x === 0), 'a rest on the fourth beat'); }
assert(peak.slice(0, 3).every(x => x > 0.03 && x <= POP.max) && popsAt(0.9, out)[0] < 0.02, 'small pops that settle within the beat');
assert(popsAt(NaN, out).every(x => x === 0), 'no beat (reduced motion): still');
// Every CSS comment closes before the next one opens: an unclosed `/*` silently swallowed the selector's fan rules.
for (const [, css] of readPage().matchAll(/<style>([\s\S]*?)<\/style>/g)) {
  for (const after of css.split('/*').slice(1)) assert(after.includes('*/'), `unclosed CSS comment: /*${after.slice(0, 60)}`);
}
// Edge to edge on a notched iPhone: the page asks for the whole screen and the status bar is opaque (the translucent one blurs the top of the page, drawn by iOS), and nothing paints
// a solid band over the safe areas (a body::before/::after in the page colour did, top and bottom, above the scene).
{
  const html = readPage();
  assert.match(html, /<meta name="viewport"[^>]*viewport-fit=cover/);
  assert.match(html, /<meta name="apple-mobile-web-app-status-bar-style" content="black">/);
  assert(!/\bbody::(before|after)\b/.test(html), 'body::before/::after must not cover the safe areas');
}
console.log('splash logo motion and CSS layout contracts ok');
