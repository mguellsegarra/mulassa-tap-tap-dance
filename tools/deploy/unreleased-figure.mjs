// A figure in UNRELEASED_IDS (src/figures/index.js) must not reach a build: its modules and song are swapped for inert
// stubs, so its dance, model, colla and music are not in the bundle. Dev serves the real code (apply: 'build').
import { readFileSync } from 'node:fs';

// the portrait stays: the selector shows its silhouette while the figure is pending
const BOU = /[\\/]src[\\/]figures[\\/]bou[\\/](?!bou-portrait\.js)[^\\/]+\.js$/;
// anything read, called or iterated gives back itself, so module-level wiring of the real code loads without running it
const INERT = `const inert = new Proxy(function () {}, { get: (t, k) => k === Symbol.toPrimitive ? () => 0 : k === Symbol.iterator ? function* () {} : inert, apply: () => inert, construct: () => inert });`;

export function unreleasedFigure(unreleased) {
  return {
    name: 'unreleased-figure', apply: 'build', enforce: 'pre',
    // a .json id would go through the JSON plugin: the song gets a virtual id
    async resolveId(source, importer, opts) {
      if (!unreleased.has('bou-tradicional-valls') || !source.endsWith('song-bou.json')) return null;
      return (await this.resolve(source, importer, { ...opts, skipSelf: true })) && '\0unreleased-song';
    },
    load(id) {
      if (id === '\0unreleased-song') return `${INERT}\nexport default inert;`;
      if (!unreleased.has('bou-tradicional-valls') || !BOU.test(id)) return null;
      const names = new Set();
      for (const n of this.parse(readFileSync(id, 'utf8')).body) {
        if (n.type !== 'ExportNamedDeclaration') continue;
        for (const d of n.declaration?.declarations ?? []) names.add(d.id.name);
        if (n.declaration?.id) names.add(n.declaration.id.name);
        for (const s of n.specifiers) names.add(s.exported.name);
      }
      return `${INERT}\n${[...names].map(k => `export const ${k} = inert;`).join('\n')}`;
    },
  };
}
