// Dev-only notes backend. One field per write keeps unrelated annotations intact.
import { readFileSync, writeFileSync, renameSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

export default function alchemyReview() {
  return {
    name: 'alchemy-recipes-review', apply: 'serve',
    configureServer(server) {
      const directory = resolve(server.config.root, 'tools/dev/alchemy-recipes-review/local');
      const file = resolve(directory, 'notes.json');
      const read = () => existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {};
      server.middlewares.use('/__alchemy-review/notes', async (req, res) => {
        const reply = (status, data) => {
          res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
          res.end(JSON.stringify(data));
        };
        if (req.url !== '/' && req.url !== '') return reply(404, { error: 'Ruta desconeguda' });
        try {
          if (req.method === 'GET') return reply(200, read());
          if (req.method !== 'PUT') return reply(405, { error: 'Mètode no admès' });
          // The LAN phone is allowed; other websites cannot write through a cross-origin form.
          const origin = req.headers.origin;
          if (!origin || new URL(origin).host !== req.headers.host ||
              req.headers['content-type'] !== 'application/json') return reply(403, { error: 'Origen no admès' });
          let raw = '';
          for await (const chunk of req) {
            raw += chunk;
            if (Buffer.byteLength(raw) > 24000) return reply(413, { error: 'Nota massa llarga' });
          }
          const { key, value, previous } = JSON.parse(raw);
          const validKey = typeof key === 'string' && /^(joc\.errors|art\.[a-z]+|recipe\.[a-z]+\.[a-z]+\.[a-z]+\.(note|status))$/.test(key);
          if (!validKey || typeof value !== 'string' || value.length > 5000 || typeof previous !== 'string' ||
              (key.endsWith('.status') && !['', 'ok', 'change'].includes(value))) return reply(400, { error: 'Nota no vàlida' });
          const data = read();
          if ((data[key] ?? '') !== previous) return reply(409, { error: 'Aquest camp ha canviat en una altra finestra. Exporta les notes abans de recarregar.' });
          if (value) data[key] = value; else delete data[key];
          mkdirSync(directory, { recursive: true });
          // Keep the previous complete file too; neither file is bundled or committed.
          if (existsSync(file)) writeFileSync(resolve(directory, 'notes.previous.json'), readFileSync(file));
          writeFileSync(file + '.tmp', JSON.stringify(data, null, 2) + '\n');
          renameSync(file + '.tmp', file);
          reply(200, { saved: true });
        } catch (error) {
          server.config.logger.error(`Alchemy review: ${error.message}`);
          reply(500, { error: "No s'ha pogut llegir o desar. Exporta les notes abans de tancar." });
        }
      });
    },
  };
}
