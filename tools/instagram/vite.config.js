import { defineConfig } from "vite";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const repo = resolve(root, "../..");
const virtualId = "virtual:instagram-game-notes";
const resolvedId = "\0" + virtualId;
const sources = ["src/hud/sprites.js", "src/hud/primitives.js"].map((p) =>
  resolve(repo, p),
);

function between(source, start, end) {
  const a = source.indexOf(start),
    b = source.indexOf(end, a);
  if (a < 0 || b < 0 || source.indexOf(start, a + start.length) !== -1) {
    throw new Error(
      `Instagram notes adapter: game source changed; review extraction boundary ${start}`,
    );
  }
  return source.slice(a, b).replaceAll("export ", "");
}

// Reuse the exact game drawing implementation without booting HUD/game state.
// Only normal GUA/PA notes are exposed; GUAPA rendering depends on live HUD services.
function gameNotes() {
  return {
    name: "instagram-original-game-notes",
    resolveId(id) {
      if (id === virtualId) return resolvedId;
    },
    load(id) {
      if (id !== resolvedId) return;
      sources.forEach((path) => this.addWatchFile(path));
      const [sprites, primitives] = sources.map((path) =>
        readFileSync(path, "utf8"),
      );
      const palette = between(sprites, "export const C =", "// Sprites:");
      const drawing = between(primitives, "function arrow(", "// MANTÉN:");
      for (const token of [
        "function arrow(",
        "function noteFace(",
        "function noteDisc(",
        "noteFace(dir, x, y, r - rim);",
        "arrow(dir, x, y, r);",
      ]) {
        if (!drawing.includes(token))
          throw new Error(`Instagram notes adapter: missing ${token}`);
      }
      for (const token of ["const DIRC =", "DIRLT =", "DIRDK ="]) {
        if (!palette.includes(token))
          throw new Error(`Instagram notes adapter: missing ${token}`);
      }
      return `${palette}
export function drawGameNote(H, dir, cx, cy, scale = 4) {
  if (dir !== 'L' && dir !== 'R') throw new Error('Only normal GUA/PA notes are supported.');
  ${drawing}
  H.save();
  try { H.translate(cx, cy); H.scale(scale, scale); noteDisc(dir, 0, 0, 14, false); }
  finally { H.restore(); }
}`;
    },
    handleHotUpdate(ctx) {
      if (!sources.includes(ctx.file)) return;
      const module = ctx.server.moduleGraph.getModuleById(resolvedId);
      if (module) ctx.server.moduleGraph.invalidateModule(module);
      ctx.server.ws.send({ type: "full-reload" });
      return [];
    },
  };
}

export default defineConfig({
  root,
  publicDir: false,
  plugins: [gameNotes()],
  server: { host: "127.0.0.1", port: 5189, fs: { allow: [repo] } },
  build: {
    outDir: resolve(repo, "dist-instagram"),
    emptyOutDir: true,
    assetsInlineLimit: 0,
    rollupOptions: {
      input: Object.fromEntries(
        [
          "index",
          "perfil/index",
          "primers-posts/index",
          "personatges/index",
        ].map((page) => [page, resolve(root, page + ".html")]),
      ),
    },
  },
});
