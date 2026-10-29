// The bundled `ca` catalogue, loaded synchronously. JSON imports with attributes work in Vite, node and tests/render/load-main.mjs (it inlines them as consts).
import caHud from './locales/ca/hud.json' with { type: 'json' };
import caGame from './locales/ca/game.json' with { type: 'json' };
import caUi from './locales/ca/ui.json' with { type: 'json' };
import caServices from './locales/ca/services.json' with { type: 'json' };
import caHtml from './locales/ca/html.json' with { type: 'json' };
import caBoot from './locales/ca/boot.json' with { type: 'json' };

import caFigures from './locales/ca/figures.json' with { type: 'json' };

export const CA_PARTS = [caHud, caGame, caUi, caServices, caHtml, caBoot, caFigures];

// Joins the per-namespace files; a key in two files is a bug, not an override.
export function mergeCatalog(parts) {
  const out = {};
  for (const part of parts) for (const key of Object.keys(part)) {
    if (key in out) throw new Error(`i18n: duplicate key ${key}`);
    out[key] = part[key];
  }
  return out;
}

// The parts messages.js turns into the live catalogue when it first runs: `ca` until load-locale.js has fetched another language
// (before any module that calls tr() evaluates, see preload.js).
export const ACTIVE_CATALOG = { parts: CA_PARTS, intl: 'ca' };
