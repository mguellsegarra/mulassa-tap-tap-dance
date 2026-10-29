// The game's source as ONE script for the vm-based tests (render-quality, score-ceiling).
// main.js and every local module it reaches are concatenated in dependency order (imports removed, `export` stripped),
// so the tests still see (and assign) the shared top-level names of the game's systems (src/core, scene, game, hud, ui, dev).
// The modules below are NOT inlined: they are pure or self-contained, and the test context supplies them as globals
// (real, or mocked like setupBoard / setupLoader) before the script runs.
// Rules for inlined modules: single-line imports and re-exports, no `as` on imports, no top-level name shared with another inlined module.
// Re-exports (`export { a, b as c } from`, `export * from`) inline their source like an import; `b as c` becomes `const c = b;`.
import { readFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../src');
const PROVIDED = new Set(`song-mulassa.json song-drac.json platform/polyfills.js platform/render-quality.js platform/audio.js platform/audio-load.js services/errors.js
  services/leaderboard-result.js services/leaderboard.js services/leaderboard-identity.js services/share.js game/chart.js game/progress.js game/practice.js game/energy.js game/dance.js
  game/bubble-rules.js figures/drac/dance-drac.js figures/drac/drac-feet.js figures/drac/drac-motion.js hud/stars.js hud/logo-motion.js scene/models.js figures/drac/drac.js scene/balloon3d.js scene/framing.js scene/orbit.js
  hud/share-card.js scene/crowd-fx.js ui/select-ui.js ui/board-ui.js ui/publish-ui.js ui/profile-ui.js ui/share-ui.js ui/feedback-ui.js ui/sync-sheet.js ui/loader.js ui/sheet-fade.js ui/curtain.js
  ui/account-ui.js ui/seasons-ui.js ui/season-end-ui.js ui/player-card.js services/stats-sync.js
  figures/bou/bou-dance.js figures/bou/bou-feet.js figures/bou/bou-rig.js figures/bou/bou-motion.js figures/bou/bou.js
  figures/drac/drac-path.js figures/drac/drac-steps.js figures/drac/drac-pose.js figures/drac/drac-time.js figures/drac/drac-layout.js figures/drac/drac-rig.js figures/drac/drac-groove.js figures/drac/drac-legs.js figures/drac/drac-colla.js figures/common/colla.js figures/mulassa/mula-colla.js figures/bou/bou-colla.js
  core/mock-board.js dev/cam-edit.js dev/final-test.js i18n/load-locale.js i18n/preload.js`.split(/\s+/));
const IMPORT = /^import .*;\n/gm, LOCAL = /^(?:import|export) (?:.* from )?'(\.[^']+)';/gm;
const REEXPORT = /^export (?:\*|\{([^}]*)\}) from '[^']+';.*\n/gm;
const DECL = /^(?:async )?(?:function\*? |class |const |let |var )(\w+)/gm; // a top-level declaration starts in column 0 (the first name of a `let a, b`)
const renames = names => (names || '').split(',').map(n => n.trim().split(/\s+as\s+/)).filter(n => n.length === 2).map(([a, b]) => `const ${b} = ${a};\n`).join('');

export function loadMainSource(entry = resolve(root, 'main.js')) {
  const seen = new Set(), out = [], owner = new Map(); // owner: top-level name -> the module that declared it
  const visit = file => {
    if (seen.has(file)) return;
    seen.add(file);
    const src = readFileSync(file, 'utf8');
    for (const [, spec] of src.matchAll(LOCAL)) {
      const dep = resolve(dirname(file), spec);
      if (!PROVIDED.has(relative(root, dep))) visit(dep);
    }
    const code = src.replace(/^import (\w+) from '(\.[^']+\.json)'(?: with \{ type: 'json' \})?;$/gm, (_, name, spec) => name === 'song' ? '' : `const ${name} = ${readFileSync(resolve(dirname(file), spec), 'utf8')};`).replace(IMPORT, '').replace(REEXPORT, (_, names) => renames(names)).replace(/^export (default )?/gm, '');
    for (const [, name] of code.matchAll(DECL)) { // two inlined modules sharing a name is a vm SyntaxError (or a silent overwrite) far from the cause
      if (owner.has(name) && owner.get(name) !== file) throw new Error(`top-level name "${name}" is declared by both ${relative(root, owner.get(name))} and ${relative(root, file)}: names must be unique across inlined modules`);
      owner.set(name, file);
    }
    out.push(`//# sourceURL=${file}\n` + code);
  };
  visit(entry);
  return out.join('\n');
}
