// Dev-only backend of the Bou's timeline (tools/dev/bou-timeline.html): GET/POST /__bou-timeline/edits reads and
// writes the dance's edits (src/figures/bou/bou-dance-edits.json, read by bou-dance.js); GET/POST /__bou-timeline/notes
// the owner's notes at a moment of the dance (tools/dev/bou-timeline/notes.json, for the agent to read). The owner works
// from other devices on the LAN, so no loopback rule: a custom header keeps other sites' pages from writing (cross-origin
// with it needs a preflight this server never answers); nothing from the client becomes a path; every field is checked.
import { readFile, writeFile, rename } from 'node:fs/promises';
import { resolve } from 'node:path';

const MAX_BODY = 256 << 10;
const NUM = ['shift', 'yaw', 'x', 'z', 'len', 'dip', 'sway', 'nod', 'saw', 'warp', 'side'];
const ID = /^(path|gest|comic|skid|carry):[\w.+-]{1,24}$/;
export function cleanEdits(body) {
  const keys = body?.keys; if (!keys || typeof keys !== 'object' || Array.isArray(keys)) return null;
  const out = {};
  for (const [id, e] of Object.entries(keys)) {
    if (!ID.test(id) || !e || typeof e !== 'object') return null;
    const k = {};
    for (const [f, v] of Object.entries(e)) {
      if (f === 'leg' && (v === 'L' || v === 'R')) k.leg = v;
      else if (NUM.includes(f) && Number.isFinite(v) && Math.abs(v) < 1000) k[f] = Math.round(v * 1e4) / 1e4;
      else return null;
    }
    if (Object.keys(k).length) out[id] = k;
  }
  return { keys: Object.fromEntries(Object.entries(out).sort(([a], [b]) => a.localeCompare(b, 'en', { numeric: true }))) };
}
export function cleanNote(n) {
  if (!n || typeof n !== 'object' || !/^[\w-]{4,40}$/.test(n.id ?? '') || typeof n.text !== 'string' || !n.text.trim()) return null;
  const num = v => (Number.isFinite(v) ? Math.round(v * 1e3) / 1e3 : null), str = (v, k) => (typeof v === 'string' ? v.slice(0, k) : null);
  return { id: n.id, t: num(n.t), beat: num(n.beat), bar: str(n.bar, 40), phase: str(n.phase, 60), view: str(n.view, 20),
    keys: Array.isArray(n.keys) ? n.keys.filter(k => typeof k === 'string' && ID.test(k)).slice(0, 40) : [],
    text: n.text.slice(0, 4000), done: n.done === true, at: str(n.at, 30) ?? new Date().toISOString() };
}

export default function bouTimeline() {
  return { name: 'bou-timeline', apply: 'serve', configureServer(server) {
    const files = { edits: resolve(server.config.root, 'src/figures/bou/bou-dance-edits.json'), notes: resolve(server.config.root, 'tools/dev/bou-timeline/notes.json') };
    const load = async (f, empty) => { try { return JSON.parse(await readFile(f, 'utf8')); } catch (e) { if (e.code === 'ENOENT') return empty; throw e; } };
    const store = async (f, v) => { await writeFile(f + '.tmp', JSON.stringify(v, null, 1) + '\n'); await rename(f + '.tmp', f); }; // (never half a file)
    let queue = Promise.resolve(); // one write at a time
    server.middlewares.use('/__bou-timeline', (req, res) => {
      const send = (code, body) => { res.statusCode = code; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(body)); };
      const what = req.url.replace(/[?#].*/, '').replace(/^\//, '');
      if (!(what in files)) return send(404, { error: 'edits | notes' });
      const empty = what === 'edits' ? { keys: {} } : { notes: [] };
      if (req.method === 'GET') return load(files[what], empty).then(v => send(200, v), e => send(500, { error: e.message }));
      if (req.method !== 'POST' || req.headers['x-bou-timeline'] !== '1') return send(405, { error: 'POST with x-bou-timeline: 1' });
      let size = 0; const chunks = [];
      req.on('data', c => { size += c.length; if (size > MAX_BODY) req.destroy(); else chunks.push(c); });
      req.on('end', () => {
        let body; try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { return send(400, { error: 'bad json' }); }
        queue = queue.then(async () => {
          if (what === 'edits') { const e = cleanEdits(body); if (!e) return send(400, { error: 'bad edits' }); await store(files.edits, e); return send(200, e); }
          const db = await load(files.notes, empty);
          if (body?.op === 'add' || body?.op === 'put') { const n = cleanNote(body.note); if (!n) return send(400, { error: 'bad note' });
            const i = db.notes.findIndex(x => x.id === n.id); if (i >= 0) db.notes[i] = { ...n, at: db.notes[i].at }; else db.notes.push(n); }
          else if (body?.op === 'del' && typeof body.id === 'string') db.notes = db.notes.filter(x => x.id !== body.id);
          else return send(400, { error: 'op: add | put | del' });
          db.notes.sort((a, b) => a.t - b.t); db.notes.splice(500);
          await store(files.notes, db); send(200, db);
        }).catch(e => send(500, { error: e.message }));
      });
    });
  } };
}
