// Fonts are served from this site with their licences, and the Privadesa sheet tells Cloudflare apart from the rest.
import assert from 'node:assert/strict';
import { readPage } from './page.mjs';
import { existsSync, readFileSync } from 'node:fs';

const html = readPage();
assert(!/fonts\.(googleapis|gstatic)\.com/.test(html), 'no Google Fonts request');
assert(!/cloudflareinsights|beacon\.min\.js/.test(html), 'no manual analytics snippet: Pages injects it');
const fonts = [...html.matchAll(/url\(\/fonts\/([\w-]+\.woff2)\)/g)].map(m => m[1]);
assert(fonts.length >= 4, 'Baloo 2 and Jersey 10 are declared locally');
for (const f of new Set(fonts)) assert(existsSync(new URL(`../public/fonts/${f}`, import.meta.url)), `missing font ${f}`);
for (const family of ['Baloo 2', 'Jersey 10', 'Nunito']) {
  if (family === 'Nunito') { // Cyrillic: Nunito's file answers to the 'Baloo 2' family name, so the licence is checked by file
    assert(/font-family: 'Baloo 2'; font-weight: 600;[^}]*\/fonts\/nunito-cyrillic\.woff2/.test(html), 'Nunito Cyrillic face');
  } else assert(html.includes(`font-family: '${family}'`), `${family} @font-face`);
  const licence = new URL(`../public/fonts/OFL-${family.replace(' ', '-')}.txt`, import.meta.url);
  assert(readFileSync(licence, 'utf8').includes('SIL Open Font License'), `${family} keeps its OFL licence`);
}
for (const w of [600, 800]) assert(new RegExp(`'Baloo 2'; font-weight: ${w};`).test(html), `Baloo 2 ${w} as Google served it`);

const sheet = html.slice(html.indexOf('<dialog id="privacy-menu"'), html.indexOf('</dialog>', html.indexOf('<dialog id="privacy-menu"')));
assert(sheet.includes('data-privacy="cloudflare"') && sheet.includes('Cloudflare Web Analytics'), 'Cloudflare section');
assert(/agregada/.test(sheet) && /sense galetes/.test(sheet), 'aggregate, cookie-free measurement');
assert(sheet.includes('data-privacy="device"'), 'local storage section');
assert(!/Supabase/.test(sheet.slice(0, sheet.indexOf('data-privacy="device"'))), 'Cloudflare section does not mix in the rankings');
assert(/data-privacy-open/.test(html.slice(html.indexOf('<dialog id="settings-menu"'), html.indexOf('<dialog id="privacy-menu"'))), 'reachable from Configuració');
assert(!/\b(OK|Close|Privacy|Settings)\b/.test(sheet.replace(/<[^>]+>/g, ' ')), 'Catalan copy only');
// Crash reports (src/services/errors.js): their own section, saying who, where, what and what not.
const errorsSection = sheet.slice(sheet.indexOf('data-privacy="errors"'), sheet.indexOf('</section>', sheet.indexOf('data-privacy="errors"')));
assert(errorsSection.length > 0, 'crash reports section');
for (const s of ['Sentry', 'Functional Software, Inc.', 'Alemanya', 'anònim', 'missatge d’error', 'navegador', 'estat de la partida',
  'adreça IP', 'galetes', 'sobrenoms', 'grava la pantalla', 'interès legítim']) assert(errorsSection.includes(s), `crash reports section mentions ${s}`);
assert(!/Sentry/.test(sheet.slice(0, sheet.indexOf('data-privacy="errors"'))), 'Sentry stays in its own section');
assert(!/cap cot|rancúnia|retiri un sobrenom/.test(html), 'a confident tone: no pre-emptive apologies, nicknames not singled out');
console.log('local fonts, licences and privacy sheet ok');
