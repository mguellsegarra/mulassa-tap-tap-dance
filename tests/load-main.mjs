// The game's source as ONE script for the vm-based tests (render-quality, score-ceiling).
// main.js and every local module it reaches are concatenated in dependency order (imports removed, `export` stripped),
// so the tests still see (and assign) the shared top-level names of the game's systems (src/core, scene, game, hud, ui, dev).
// The modules below are NOT inlined: they are pure or self-contained, and the test context supplies them as globals
// (real, or mocked like setupBoard / setupLoader) before the script runs.
// Rules for inlined modules: single-line imports, no `as`, no top-level name shared with another inlined module.
import { readFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../src');
const PROVIDED = new Set(`song.json song-drac.json platform/polyfills.js platform/render-quality.js platform/audio.js services/errors.js
  services/leaderboard-result.js services/leaderboard.js services/share.js game/chart.js game/progress.js game/practice.js game/energy.js game/dance.js
  game/bubble-rules.js game/dance-drac.js game/drac-feet.js scene/drac-motion.js hud/stars.js hud/title-layout.js scene/models.js scene/models/drac.js scene/balloon3d.js scene/framing.js scene/orbit.js
  scene/crowd-fx.js ui/select-ui.js ui/board-ui.js ui/profile-ui.js ui/share-ui.js ui/feedback-ui.js ui/sync-sheet.js ui/loader.js ui/sheet-fade.js
  ui/account-ui.js ui/seasons-ui.js ui/player-card.js services/stats-sync.js
  game/drac-path.js game/drac-steps.js game/drac-pose.js game/drac-time.js game/drac-layout.js scene/drac-rig.js scene/drac-legs.js scene/drac-colla.js scene/mula-colla.js
  dev/cam-edit.js dev/final-test.js`.split(/\s+/));
const IMPORT = /^import .*;\n/gm, LOCAL = /^import (?:.* from )?'(\.[^']+)';/gm;

export function loadMainSource(entry = resolve(root, 'main.js')) {
  const seen = new Set(), out = [];
  const visit = file => {
    if (seen.has(file)) return;
    seen.add(file);
    const src = readFileSync(file, 'utf8');
    for (const [, spec] of src.matchAll(LOCAL)) {
      const dep = resolve(dirname(file), spec);
      if (!PROVIDED.has(relative(root, dep))) visit(dep);
    }
    out.push(`//# sourceURL=${file}\n` + src.replace(/^import (\w+) from '(\.[^']+\.json)'(?: with \{ type: 'json' \})?;$/gm, (_, name, spec) => name === 'song' ? '' : `const ${name} = ${readFileSync(resolve(dirname(file), spec), 'utf8')};`).replace(IMPORT, '').replace(/^export .* from '[^']+';\n/gm, '').replace(/^export (default )?/gm, ''));
  };
  visit(entry);
  return out.join('\n');
}
