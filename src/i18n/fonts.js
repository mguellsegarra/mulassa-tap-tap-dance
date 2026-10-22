// Canvas fonts per language. Latin and Cyrillic keep the 'Baloo 2' stack as it is (index.html lets Nunito answer for Cyrillic
// under that same family name); Japanese, Korean and Chinese add the system's rounded CJK fonts after it (no file to ship).
// The DOM gets the same lists from index.html's html:lang() rules; tests/fonts-i18n.mjs keeps both in step.
import { lang } from './locale.js';

export const CJK = {
  ja: "ui-rounded, 'Hiragino Maru Gothic ProN', 'Hiragino Sans', 'Yu Gothic', Meiryo, 'Noto Sans CJK JP', sans-serif",
  ko: "ui-rounded, 'Apple SD Gothic Neo', 'Malgun Gothic', 'Noto Sans CJK KR', sans-serif",
  'zh-Hans': "ui-rounded, 'PingFang SC', 'Microsoft YaHei', 'Noto Sans CJK SC', sans-serif",
};
// i18n-ok: glyph samples to preload and check the fonts
const FONT_SAMPLES = { uk: 'АБВГҐДЕЄЖЗИІЇЙабвгґдеєжзиіїй', ru: 'АБВГДЕЁЖЗИЙЫЭЮЯабвгдеёжзийыэюя', ja: 'あいうえおアイウエオ日本語', ko: '가나다라마한국어', 'zh-Hans': '汉字中文游戏' };

export const isCjk = (code = lang()) => code in CJK;
export const isCyrillic = (code = lang()) => code === 'uk' || code === 'ru';
export const isLatin = (code = lang()) => !isCjk(code) && !isCyrillic(code);
export const fontSample = (code = lang()) => FONT_SAMPLES[code] ?? '';
export const AVG_EM = (code = lang()) => (isCjk(code) ? 1 : 0.62); // a character's width in ems when the canvas cannot measure

// `family` is a CSS font-family list ending in generics; CJK puts its own list where the generics were so it wins over them.
export function fontStack(family, code = lang()) {
  if (!isCjk(code)) return family;
  const named = family.split(',').map(s => s.trim()).filter(s => !/^(system-ui|sans-serif|monospace)$/.test(s));
  return `${named.join(', ')}, ${CJK[code]}`;
}

// Height of a text sprite painted at q px. Latin: the fixed 1.7 q Baloo box. Others: the font's real ascent + descent when
// the canvas reports it (a fallback CJK or Nunito glyph row is not Baloo's).
export function spriteHeight(m, q, lw, code = lang()) {
  const real = isLatin(code) ? 0 : ((m?.fontBoundingBoxAscent ?? 0) + (m?.fontBoundingBoxDescent ?? 0)) * 1.1;
  return Math.max(q * 1.7, real) + lw;
}

// Baloo's painted glyphs sit a little high; fallback CJK ideographs are centred in their em box.
export const baselineShift = (size, code = lang()) => (isCjk(code) ? 0 : size * 0.08);

// Loads the faces the language needs (Cyrillic is a file; system CJK fonts load nothing) and says whether every glyph of the
// sample can now be drawn. A slow network ends at `ms` with the answer false: the caller then draws without caching.
export async function loadScriptFonts(fonts, family, code = lang(), ms = 2000) {
  const sample = fontSample(code);
  if (!sample || !fonts) return true;
  const face = w => `${w} 64px ${family}`;
  const done = Promise.all([600, 800].map(w => fonts.load(face(w), sample))).then(() => true, () => false);
  const timeout = new Promise(r => setTimeout(() => r(false), ms));
  await Promise.race([done, timeout]);
  return glyphsReady(fonts, family, code);
}
export const glyphsReady = (fonts, family, code = lang()) => {
  const sample = fontSample(code);
  try { return !sample || !fonts?.check || [600, 800].every(w => fonts.check(`${w} 64px ${family}`, sample)); } catch { return true; }
};
