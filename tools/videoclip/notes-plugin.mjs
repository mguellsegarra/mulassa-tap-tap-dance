// Dev-only backend of the videoclip tool's notes (tools/videoclip/notes.js): the owner's notes from any device on the LAN
// land in one fixed file, tools/videoclip/media/notes.json (gitignored), for the agent to read. Pasting them in the chat
// cut their middle off. Also GET /__videoclip/proposals: every proposals/*.json. GET /__videoclip/notes: { notes, deleted (ids: a device drops its own copy of them) }; POST
// {op: 'add', note} | {op: 'del', id} | {op: 'clear'} (all of them, kept in notes-<date>.json first). Nothing from the
// client becomes a path; notes are validated field by field; a custom header keeps other sites' pages from writing
// (a cross-origin request with it needs a preflight this server never answers).
import { readFile, writeFile, rename, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { checkProposal } from './proposal.js';

const MAX_BODY = 64 << 10, MAX_NOTES = 500;
const str = (v, n) => (typeof v === 'string' ? v.slice(0, n) : null);
const num = v => (Number.isFinite(v) ? v : null);
export function cleanNote(n) {
  if (!n || typeof n !== 'object' || typeof n.id !== 'string' || !/^[\w-]{4,40}$/.test(n.id) || typeof n.text !== 'string' || !n.text.trim()) return null;
  return { id: n.id, t: num(n.t), bar: num(n.bar), label: str(n.label, 20), shot: str(n.shot, 20), cut: num(n.cut), fmt: str(n.fmt, 10), mix: str(n.mix, 60),
    x: num(n.x), y: num(n.y), text: n.text.slice(0, 2000), at: new Date().toISOString() };
}

export default function videoclipNotes() {
  return { name: 'videoclip-notes', apply: 'serve', configureServer(server) {
    const file = resolve(server.config.root, 'tools/videoclip/media/notes.json');
    const load = async () => {
      let v; try { v = JSON.parse(await readFile(file, 'utf8')); } catch (e) { if (e.code === 'ENOENT') v = []; else throw e; }
      return Array.isArray(v) ? { notes: v, deleted: [] } : v; // (the first version kept a bare list)
    };
    const store = async db => { await writeFile(file + '.tmp', JSON.stringify(db, null, 1)); await rename(file + '.tmp', file); }; // (never half a file)
    // the montage proposals (proposals/*.json), read at each request: agents add files while the tool is open
    const pdir = resolve(server.config.root, 'tools/videoclip/proposals');
    server.middlewares.use('/__videoclip/proposals', async (req, res) => {
      res.setHeader('Content-Type', 'application/json');
      if (req.method === 'POST') { // the owner's edit of a proposal (the tool's montage editor): checked, then written over its file
        if (req.headers['x-videoclip'] !== '1') { res.statusCode = 405; return res.end('{}'); }
        const chunks = []; let size = 0;
        req.on('data', c => { size += c.length; if (size > MAX_BODY) req.destroy(); else chunks.push(c); });
        req.on('end', async () => {
          try {
            const p = JSON.parse(Buffer.concat(chunks).toString('utf8'));
            const clip = JSON.parse(await readFile(resolve(server.config.root, 'tools/videoclip/clip.json'), 'utf8')), { errors } = checkProposal(p, clip);
            if (errors.length) { res.statusCode = 400; return res.end(JSON.stringify({ errors })); } // (the id is checked there: no path from the client)
            const file = resolve(pdir, `${p.id}.json`);
            await writeFile(file + '.tmp', JSON.stringify(p, null, 1)); await rename(file + '.tmp', file);
            res.end(JSON.stringify({ ok: true }));
          } catch (e) { res.statusCode = 400; res.end(JSON.stringify({ errors: [e.message] })); }
        });
        return;
      }
      try {
        const out = [];
        for (const f of (await readdir(pdir)).filter(f => f.endsWith('.json')).sort()) { try { out.push(JSON.parse(await readFile(resolve(pdir, f), 'utf8'))); } catch {} } // (a file being written: skipped)
        res.end(JSON.stringify(out));
      } catch (e) { res.statusCode = 500; res.end(JSON.stringify({ error: e.message })); }
    });
    let queue = Promise.resolve(); // one write at a time
    server.middlewares.use('/__videoclip/notes', (req, res) => {
      const send = (code, body) => { res.statusCode = code; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(body)); };
      if (req.method === 'GET') return load().then(n => send(200, n), e => send(500, { error: e.message }));
      if (req.method !== 'POST' || req.headers['x-videoclip'] !== '1') return send(405, { error: 'POST with x-videoclip: 1' });
      let size = 0; const chunks = [];
      req.on('data', c => { size += c.length; if (size > MAX_BODY) req.destroy(); else chunks.push(c); });
      req.on('end', () => {
        let body; try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { return send(400, { error: 'bad json' }); }
        queue = queue.then(async () => {
          const db = await load(), { notes, deleted } = db;
          if (body?.op === 'add') {
            const n = cleanNote(body.note); if (!n) return send(400, { error: 'bad note' });
            if (!notes.some(x => x.id === n.id) && !deleted.includes(n.id)) notes.push(n);
          } else if (body?.op === 'del' && /^[\w-]{4,40}$/.test(body.id ?? '')) { notes.splice(0, notes.length, ...notes.filter(x => x.id !== body.id)); deleted.push(body.id); }
          else if (body?.op === 'clear') {
            if (notes.length) await writeFile(file.replace(/\.json$/, `-${new Date().toISOString().replace(/[:.]/g, '-')}.json`), JSON.stringify(notes, null, 1));
            deleted.push(...notes.map(n => n.id)); notes.length = 0;
          } else return send(400, { error: 'op: add | del | clear' });
          notes.sort((a, b) => a.t - b.t); notes.splice(MAX_NOTES); deleted.splice(0, Math.max(0, deleted.length - 5000));
          await store(db); send(200, db);
        }).catch(e => send(500, { error: e.message }));
      });
    });
  } };
}
