// The app's games catalogue (docs/app/native-shell.md, contract 6): public/catalogue.json, read by the native launcher
// from the active web bundle, so a new game reaches the app by live update, never by a store release.
// Built from what the web menu already says (jocs/index.html's cards and the menu's locales) plus the launcher's own
// data below. `node tools/app/catalogue.mjs` writes it; `--check` exits 1 when it is stale (tests/build/catalogue.mjs).
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export const CATALOGUE_SCHEMA = 1;
export const MIN_BRIDGE = 1;
// what the web menu does not know: the app's entry path, the cartridge's short name and colours, the category
const LAUNCHER = {
  tap: { path: '/index.html', short: 'Tap Tap', color: '#f5c518', ink: '#3a2208', category: 'ritme' },
  pop: { path: '/pop/index.html', short: 'Pop', color: '#ff7ac8', ink: '#3d0f2a', category: 'accio' },
  campanar: { path: '/jocs/campanar/index.html', short: 'Tower', color: '#3fd3b8', ink: '#0d3a33', category: 'accio' }, // the launcher knows ritme, accio, enginy, puzles; colour (the game's sky) provisional
};
const SOON = { short: null, color: '#ff9d3b', ink: '#4a2400', category: null };
const PROPER = { tap: 'Mulassa Tap Tap Dance' }; // a name with no translation key stays as it is

const root = new URL('../../', import.meta.url).pathname;
const OUT = join(root, 'public/catalogue.json');

export function buildCatalogue() {
  const html = readFileSync(join(root, 'jocs/index.html'), 'utf8');
  const dir = join(root, 'src/jocs/menu/locales');
  const locales = Object.fromEntries(readdirSync(dir).filter(f => f.endsWith('.json')).sort()
    .map(f => [f.slice(0, -5), JSON.parse(readFileSync(join(dir, f), 'utf8'))]));
  const tr = key => Object.fromEntries(Object.entries(locales).map(([lang, t]) => [lang, t[key] ?? locales.ca[key]]));
  const cards = [...html.matchAll(/<button[^>]*class="game-card"[^>]*>[\s\S]*?<\/button>/g)].map(m => m[0]);
  if (!cards.length) throw new Error('no game cards in jocs/index.html');
  const games = cards.map(card => {
    const id = card.match(/data-game="([^"]+)"/)[1], soon = /\sdata-soon[\s>]/.test(card);
    const nameKey = card.match(/class="sel-card-name"(?: data-t="([^"]+)")?/)[1];
    const descKey = card.match(/class="game-desc" data-t="([^"]+)"/)?.[1];
    const own = soon ? SOON : LAUNCHER[id];
    if (!own) throw new Error(`game "${id}" in jocs/index.html has no launcher entry in tools/app/catalogue.mjs`);
    return {
      id, soon, path: soon ? null : own.path, isNew: /class="ribbon"/.test(card),
      name: nameKey ? tr(nameKey) : Object.fromEntries(Object.keys(locales).map(l => [l, PROPER[id]])), short: own.short, desc: descKey ? tr(descKey) : null,
      color: own.color, ink: own.ink, category: own.category,
      art: card.match(/<img src="([^"]+)"/)[1],
    };
  });
  return { schema: CATALOGUE_SCHEMA, minBridge: MIN_BRIDGE, games };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const text = `${JSON.stringify(buildCatalogue(), null, 1)}\n`;
  if (process.argv.includes('--check')) {
    let now = ''; try { now = readFileSync(OUT, 'utf8'); } catch { /* missing reads as stale */ }
    if (now !== text) { console.error('public/catalogue.json is stale: run node tools/app/catalogue.mjs'); process.exit(1); }
  } else writeFileSync(OUT, text);
}
