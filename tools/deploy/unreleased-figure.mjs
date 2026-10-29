// A figure in UNRELEASED_IDS (src/figures/index.js) must not reach a build: its modules re-export
// src/figures/unreleased-bou.js (no Bou: null, false, no-ops) and its song is null, so its dance, model, colla and music
// are not in the bundle. Dev serves the real code (apply: 'build').
import { fileURLToPath } from 'node:url';

// the portrait stays (the selector's pending silhouette), and the suit's colours (shared colla code draws with them)
const BOU = /[\\/]src[\\/]figures[\\/]bou[\\/](?!bou-portrait\.js|bou-suit\.js)[^\\/]+\.js$/;
const STUB = fileURLToPath(new URL('../../src/figures/unreleased-bou.js', import.meta.url));

export function unreleasedFigure(unreleased) {
  return {
    name: 'unreleased-figure', apply: 'build', enforce: 'pre',
    // a .json id would go through the JSON plugin: the song gets a virtual id
    async resolveId(source, importer, opts) {
      if (!unreleased.has('bou-tradicional-valls') || !source.endsWith('song-bou.json')) return null;
      return (await this.resolve(source, importer, { ...opts, skipSelf: true })) && '\0unreleased-song';
    },
    load(id) {
      if (id === '\0unreleased-song') return 'export default null;'; // figure-song.js: no song, the figure can't be chosen
      if (!unreleased.has('bou-tradicional-valls') || !BOU.test(id)) return null;
      return `export * from ${JSON.stringify(STUB)};`; // a name the stub lacks is a build error (MISSING_EXPORT)
    },
  };
}
