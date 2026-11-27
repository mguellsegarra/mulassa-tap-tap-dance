// A figure in UNRELEASED_IDS (src/figures/index.js) must not reach a build: its modules re-export its stand-in
// (src/figures/unreleased-<key>.js: null, false, no-ops) and its song is null, so its dance, model, colla and music
// are not in the bundle. Dev serves the real code (apply: 'build').
import { fileURLToPath } from 'node:url';

const stub = key => fileURLToPath(new URL(`../../src/figures/unreleased-${key}.js`, import.meta.url));
// Per figure: its modules (a folder, less what stays real), its song file and its stand-in.
export const UNRELEASED_FIGURES = {
  // the portrait stays (the selector's pending silhouette), and the suit's colours (shared colla code draws with them)
  'bou-tradicional-valls': { modules: /[\\/]src[\\/]figures[\\/]bou[\\/](?!bou-portrait\.js|bou-suit\.js)[^\\/]+\.js$/, song: 'song-bou.json', stub: stub('bou') },
  // hidden whole from a build's selector: its portrait goes too (its study copies, tombairot-*/, are never imported)
  'tombairot-valls': { modules: /[\\/]src[\\/]figures[\\/]tombairot[\\/][^\\/]+\.js$/, song: 'song-tombairot.json', stub: stub('tombairot') },
};

export function unreleasedFigure(unreleased) {
  const out = Object.entries(UNRELEASED_FIGURES).filter(([id]) => unreleased.has(id)).map(([, f]) => f);
  return {
    name: 'unreleased-figure', apply: 'build', enforce: 'pre',
    // a .json id would go through the JSON plugin: the song gets a virtual id
    async resolveId(source, importer, opts) {
      if (!out.some(f => source.endsWith(f.song))) return null;
      return (await this.resolve(source, importer, { ...opts, skipSelf: true })) && '\0unreleased-song';
    },
    load(id) {
      if (id === '\0unreleased-song') return 'export default null;'; // figure-song.js: no song, the figure can't be chosen
      const f = out.find(f => f.modules.test(id));
      return f ? `export * from ${JSON.stringify(f.stub)};` : null; // a name the stub lacks is a build error (MISSING_EXPORT)
    },
  };
}
