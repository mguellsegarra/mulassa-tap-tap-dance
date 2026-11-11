// Loads a Mulassa Pop module through Vite's own resolver (the `#plassa/` imports, `?url` assets, import.meta.env), so a test can
// run the page's real code, not a copy: `const { SFX } = await load('audio.js')`. `stub`: an import specifier exactly as the
// page writes it → a module's source to use instead (the ranking service a test controls). No server listens; close() when done.
// import.meta.env comes from process.env's VITE_* (set before calling).
import { createServer } from 'vite';
import { fileURLToPath } from 'node:url';

export async function viteLoad(stub = {}) {
  const server = await createServer({
    configFile: false, root: fileURLToPath(new URL('../..', import.meta.url)), logLevel: 'silent', appType: 'custom', server: { middlewareMode: true, hmr: false, watch: null }, optimizeDeps: { noDiscovery: true, include: [] },
    plugins: [{
      name: 'pop-test-stubs', enforce: 'pre',
      resolveId(id) { return id in stub ? `\0stub:${id}` : null; },
      load(id) { return id.startsWith('\0stub:') ? stub[id.slice(6)] : null; },
    }],
  });
  return { load: file => server.ssrLoadModule(`/src/jocs/games/pop/${file}`), close: () => server.close() };
}
