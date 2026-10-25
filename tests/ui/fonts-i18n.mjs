// Scripts beyond Latin: canvas font stacks, font loading with a timeout, sprite heights and character-based line breaking.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readPage } from './page.mjs';
import { CJK, fontStack, isLatin, isCjk, isCyrillic, spriteHeight, baselineShift, loadScriptFonts, glyphsReady, fontSample } from '../../src/i18n/fonts.js';
import { wrapLines } from '../../src/hud/text-wrap.js';

// --- stacks: Catalan (and every Latin or Cyrillic edition) keeps the canvas string byte for byte
const BALOO = "'Baloo 2', system-ui, sans-serif";
for (const code of ['ca', 'es', 'en', 'fr', 'uk', 'ru']) assert.equal(fontStack(BALOO, code), BALOO, `${code} keeps the Baloo stack`);
for (const code of Object.keys(CJK)) {
  const s = fontStack(BALOO, code);
  assert(s.startsWith("'Baloo 2', ui-rounded") && s.endsWith('sans-serif'), `${code}: Baloo for Latin, then the system CJK list`);
  assert(!s.includes('system-ui'), `${code}: no generic ahead of the CJK fonts`);
  assert.equal(fontStack("'Baloo 2', sans-serif", code).split('sans-serif').length, 2, `${code}: one generic at the end`);
}
assert(isLatin('ca') && isCyrillic('ru') && isCjk('ja') && isCjk('zh-Hans') && !isLatin('ko') && !isLatin('uk'));

// --- the page's CSS lists are the module's lists; Nunito is a local OFL file served for Cyrillic only
const html = readPage();
for (const [code, list] of Object.entries(CJK)) assert(html.includes(`html:lang(${code}) { --cjk: ${list}; }`), `index.html ${code} list matches fonts.js`);
assert(html.includes("html:is(:lang(ja), :lang(ko), :lang(zh-Hans)) :not(svg, svg *) { font-family: 'Baloo 2', var(--cjk); }"), 'CJK rule leaves the logo svg alone');
const faces = html.match(/@font-face \{ font-family: 'Baloo 2'; font-weight: [^;]+;[^}]*nunito-cyrillic\.woff2[^}]*\}/g) ?? [], face = faces[0];
// one face per weight, as Baloo's: a 600 800 range is the exact match for 700 and leaves Latin text at 700 to the fallback font
assert(faces.length === 2 && faces.every(f => /font-weight: (600|800);/.test(f)), 'Nunito declared at 600 and 800 apart, never as a range');
assert(face && /unicode-range: U\+0301, U\+0400-045F/.test(face) && !/U\+0000/.test(face), 'Nunito answers for Cyrillic code points only');
assert(!/<link[^>]*nunito/.test(html), 'not preloaded: only fetched when Cyrillic text needs it');
assert(readFileSync(new URL('../../public/fonts/OFL-Nunito.txt', import.meta.url), 'utf8').includes('SIL Open Font License'), 'Nunito licence kept');

// --- sprite boxes: Latin keeps 1.7 q; other scripts follow the font's real extent when reported
assert.equal(spriteHeight({}, 20, 3, 'ca'), 20 * 1.7 + 3);
assert.equal(spriteHeight({ fontBoundingBoxAscent: 40, fontBoundingBoxDescent: 40 }, 20, 3, 'ca'), 20 * 1.7 + 3, 'Latin ignores the font box');
assert.equal(spriteHeight({}, 20, 3, 'ja'), 20 * 1.7 + 3, 'no metrics: the old box');
assert(Math.abs(spriteHeight({ fontBoundingBoxAscent: 24, fontBoundingBoxDescent: 10 }, 20, 3, 'ja') - (34 * 1.1 + 3)) < 1e-9, 'real ascent + descent');
assert.equal(baselineShift(10, 'ca'), 0.8) ; assert.equal(baselineShift(10, 'ja'), 0);

// --- loading: only the languages with a sample load anything; a missing font ends at the timeout and reports false
const calls = [];
const fonts = (ok, has = true) => ({ load: async (f, s) => { calls.push([f, s]); if (!ok) await new Promise(() => {}); return []; }, check: () => has });
assert.equal(await loadScriptFonts(fonts(true), "'Baloo 2'", 'ca'), true); assert.equal(calls.length, 0, 'Catalan loads nothing extra');
assert.equal(await loadScriptFonts(fonts(true), "'Baloo 2'", 'ru'), true);
assert.deepEqual(calls.map(c => c[0]), ["600 64px 'Baloo 2'", "800 64px 'Baloo 2'"]); assert(calls[0][1] === fontSample('ru') && /Ж/.test(calls[0][1]));
assert.equal(await loadScriptFonts(fonts(false, false), "'Baloo 2'", 'uk', 20), false, 'timeout: not ready');
assert.equal(await loadScriptFonts(fonts(true, false), "'Baloo 2'", 'uk'), false, 'loaded but glyphs still absent');
assert.equal(glyphsReady(fonts(true, false), "'Baloo 2'", 'ca'), true, 'Latin never waits');
assert.equal(glyphsReady({ check() { throw new Error('x'); } }, "'Baloo 2'", 'ja'), true, 'a font API that throws does not block text');

// --- the sprite cache does not keep a sprite painted while the font was missing
const sprites = readFileSync(new URL('../../src/hud/sprites.js', import.meta.url), 'utf8');
assert(sprites.indexOf('if (!glyphsOk) return s;') > 0 && sprites.indexOf('if (!glyphsOk) return s;') < sprites.lastIndexOf('sprites.set(key, s)'), 'uncached before sprites.set');
assert(/glyphsOk = isLatin\(\)/.test(sprites) && /glyphsOk \|\|= glyphsReady/.test(sprites), 'Latin starts ready; others when the faces report in');

// --- wrapping: a 5 px Latin letter, a 10 px ideograph
const w = s => [...s].reduce((n, ch) => n + (/[぀-鿿가-힯，。、！？）「」（]/.test(ch) ? 10 : 5), 0);
assert.deepEqual(wrapLines('今日はいい天気ですね', w, 50, true), ['今日はいい', '天気ですね'], 'per character');
assert.deepEqual(wrapLines('こんにちは、世界！', w, 50, true), ['こんにちは、', '世界！'], 'a comma hangs on the line instead of opening the next');
const bracket = wrapLines('これは「テスト」です', w, 40, true);
assert(bracket.every(l => !/[」、。！？）]/.test(l[0])) && bracket.every(l => !/[（「]$/.test(l)), `no line opens with a closing mark or ends with an opening one: ${bracket}`);
assert.deepEqual(wrapLines('Score 100% done', w, 60, true), ['Score 100%', 'done']);
assert(wrapLines('Score 100% done', w, 60, true).join(' ').includes('100%'), 'a Latin run is not split inside a CJK line');
assert.deepEqual(wrapLines('uno dos tres', w, 40), ['uno dos', 'tres'], 'other scripts break at spaces');
assert.deepEqual(wrapLines('', w, 40, true), [], 'empty text, no lines');
console.log('script fonts, canvas stacks and wrapping ok');
