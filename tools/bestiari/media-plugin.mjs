// Dev-only, explicit media registry. Research originals live outside public/ and never enter the production build.
import { readFileSync, createReadStream } from 'node:fs';
import { stat, realpath } from 'node:fs/promises';
import { resolve, relative, isAbsolute } from 'node:path';

export function byteRange(value, size) {
  if (!value) return null;
  const m = /^bytes=(\d*)-(\d*)$/.exec(value);
  if (!m || (!m[1] && !m[2])) return false;
  const start = m[1] ? Number(m[1]) : Math.max(0, size - Number(m[2]));
  const end = m[1] && m[2] ? Math.min(size - 1, Number(m[2])) : size - 1;
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end || start >= size) return false;
  return { start, end };
}

export default function bestiariMedia() {
  return { name: 'bestiari-reference-media', apply: 'serve', configureServer(server) {
    const root = server.config.root;
    const registry = JSON.parse(readFileSync(resolve(root, 'research/bestiari/media.json'), 'utf8'));
    let locations = {};
    try { locations = JSON.parse(readFileSync(resolve(root, '.bestiari-media.json'), 'utf8')); }
    catch (e) { if (e.code !== 'ENOENT') throw e; }
    server.middlewares.use(async (req, res, next) => {
      const path = req.url?.split('?')[0];
      const key = path === '/drac-reference/pm-lEViiPK0.mp4' ? 'drac-video' : path?.startsWith('/_bestiari/media/') ? path.slice(17) : null;
      if (key === null) return next();
      const entry = registry[key], base = entry && locations[entry.root];
      if (!entry || !base) { res.statusCode = 404; return res.end('Falta configurar el recurs a .bestiari-media.json'); }
      if (!['GET', 'HEAD'].includes(req.method)) { res.statusCode = 405; res.setHeader('Allow', 'GET, HEAD'); return res.end(); }
      try {
        const folder = await realpath(base), file = await realpath(resolve(folder, entry.file));
        const rel = relative(folder, file);
        if (rel.startsWith('..') || isAbsolute(rel)) { res.statusCode = 403; return res.end(); }
        const info = await stat(file);
        if (!info.isFile()) { res.statusCode = 404; return res.end(); }
        const range = byteRange(req.headers.range, info.size);
        res.setHeader('Accept-Ranges', 'bytes'); res.setHeader('Content-Type', entry.type);
        res.setHeader('Cache-Control', 'no-cache');
        if (range === false) { res.statusCode = 416; res.setHeader('Content-Range', `bytes */${info.size}`); return res.end(); }
        const start = range?.start ?? 0, end = range?.end ?? info.size - 1;
        res.statusCode = range ? 206 : 200;
        res.setHeader('Content-Length', end - start + 1);
        if (range) res.setHeader('Content-Range', `bytes ${start}-${end}/${info.size}`);
        if (req.method === 'HEAD') return res.end();
        const stream = createReadStream(file, { start, end });
        res.on('close', () => stream.destroy()); stream.on('error', () => res.destroy()); stream.pipe(res);
      } catch (e) {
        res.statusCode = e.code === 'ENOENT' ? 404 : 500; res.end('No es pot llegir el recurs de recerca.');
      }
    });
  } };
}
