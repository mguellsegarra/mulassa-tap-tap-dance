// Dev-only backend of the music editor (editor.html): read / save a song's form and run its generator.
// Contract: src/music-form/CONTRACT.md. Loopback, same-origin requests only; the song id picks a fixed row below,
// nothing from the client becomes a path or a command; one generation at a time.
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { copyFile, mkdtemp, readFile, rm, unlink, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SONGS } from '../../../src/music-form/songs.js';

const UV = ['uv', 'run', '--python', '3.11', '--with', 'numpy', '--with', 'scipy', '--with', 'soundfile', '--with', 'mido', 'python'];
// what each generator rewrites (read from its source), the chart json whose `audio` is the new mp3, and its checks
export const JOBS = {
  mulassa: {
    generator: 'tools/music/build_taiko.py', chart: 'src/song-mulassa.json',
    artifacts: ['public/music/mulassa-taiko.wav', 'public/music/mulassa-taiko.mp3', 'public/music/mulassa-taiko.mid',
      'public/music/mulassa-taiko-ambient.mp3', 'music/mulassa/taiko-arrangement.json', 'src/song-mulassa.json'],
    checks: ['check.mjs', 'tests/game/music-form.mjs', 'tests/figures/mulassa/dance.mjs'],
  },
  drac: {
    generator: 'tools/music/build_drac.py', chart: 'src/song-drac.json',
    artifacts: ['public/music/drac-taiko.mp3', 'public/music/drac-taiko.mid', 'public/music/drac-taiko-ambient.mp3',
      'music/drac/drac-arrangement.json', 'src/song-drac.json'],
    checks: ['check.mjs', 'tests/game/music-form.mjs', 'tests/figures/drac/drac.mjs', 'tests/figures/drac/drac-feet.mjs', 'tests/figures/drac/drac-parts.mjs'],
  },
};
const MAX_BODY = 2 << 20;
const LOOPBACK = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

// the form files' own layout (a value stays on one line while it fits in 120 columns), so a save diffs only what changed
const inline = v => Array.isArray(v) ? `[${v.map(inline).join(', ')}]`
  : v && typeof v === 'object' ? (Object.keys(v).length ? `{ ${Object.entries(v).map(([k, x]) => `${JSON.stringify(k)}: ${inline(x)}`).join(', ')} }` : '{  }')
    : JSON.stringify(v);
function pretty(v, ind = '', col = 0) {
  const one = inline(v);
  if (typeof v !== 'object' || v === null || col + one.length < 120) return one;
  const i2 = ind + '  ';
  if (Array.isArray(v)) return `[\n${v.map(x => i2 + pretty(x, i2, i2.length)).join(',\n')}\n${ind}]`;
  return `{\n${Object.entries(v).map(([k, x]) => `${i2}${JSON.stringify(k)}: ${pretty(x, i2, i2.length + k.length + 4)}`).join(',\n')}\n${ind}}`;
}
export const formatForm = form => pretty(form) + '\n';

export const revisionOf = text => createHash('sha1').update(text).digest('hex');
const hostname = host => { try { return new URL(`http://${host}`).hostname; } catch { return null; } };

// null when the request may go on, else [status, message]
export function guard(req) {
  if (!LOOPBACK.has(req.socket?.remoteAddress)) return [403, 'només des d’aquest ordinador'];
  const host = req.headers.host;
  if (!host || !LOCAL_HOSTS.has(hostname(host))) return [403, 'host no local']; // DNS rebinding
  const origin = req.headers.origin;
  if (origin) { let o; try { o = new URL(origin); } catch { return [403, 'origen no vàlid']; } if (o.host !== host) return [403, 'origen creuat']; }
  else if (req.method !== 'GET') return [403, 'cal l’origen'];
  const site = req.headers['sec-fetch-site'];
  if (site && site !== 'same-origin' && site !== 'none') return [403, 'origen creuat'];
  return null;
}

const send = (res, status, body) => { res.statusCode = status; res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.setHeader('Cache-Control', 'no-store'); res.end(JSON.stringify(body)); };
const readBody = req => new Promise((ok, fail) => {
  let size = 0; const chunks = [];
  req.on('data', c => { size += c.length; if (size > MAX_BODY) { fail(new Error('cos massa gran')); req.destroy?.(); } else chunks.push(c); });
  req.on('end', () => ok(Buffer.concat(chunks).toString('utf8')));
  req.on('error', fail);
});

// runs argv (no shell) in root; resolves { code, out }
export const runProcess = (argv, root, timeoutMs = 15 * 60e3) => new Promise(ok => {
  let out = '';
  const p = spawn(argv[0], argv.slice(1), { cwd: root, shell: false, env: process.env });
  const timer = setTimeout(() => { out += '\n[temps exhaurit]\n'; p.kill('SIGTERM'); }, timeoutMs);
  p.stdout.on('data', d => { out += d; });
  p.stderr.on('data', d => { out += d; });
  p.on('error', e => { clearTimeout(timer); ok({ code: -1, out: out + String(e) }); });
  p.on('close', code => { clearTimeout(timer); ok({ code, out }); });
});

// root: repo dir; run: injectable process runner (tests)
export function createHandler({ root, run = runProcess, nodeBin = process.execPath }) {
  let generating = false;
  const formPath = song => join(root, 'music', SONGS[song].form);

  async function generate(song) {
    const job = JOBS[song], before = await readFile(formPath(song), 'utf8'), revision = revisionOf(before);
    const backup = await mkdtemp(join(tmpdir(), `music-editor-${song}-`)), saved = [];
    const log = [], errors = [];
    try {
      for (const [i, f] of job.artifacts.entries()) {
        if (existsSync(join(root, f))) { await copyFile(join(root, f), join(backup, String(i))); saved.push(i); }
      }
      const gen = await run([...UV, job.generator], root);
      log.push(`$ ${job.generator}\n${gen.out}`);
      if (gen.code !== 0) {
        errors.push(`${job.generator} ha fallat (codi ${gen.code}); s’han restaurat els fitxers anteriors`);
        for (const [i, f] of job.artifacts.entries()) {
          if (saved.includes(i)) await copyFile(join(backup, String(i)), join(root, f));
          else await unlink(join(root, f)).catch(() => {});
        }
        return { ok: false, revision, log: log.join('\n'), errors, audioUrl: null };
      }
      // checks failing keep the new audio (to listen to it), and report
      for (const c of job.checks) {
        const r = await run([nodeBin, c], root);
        log.push(`$ node ${c}\n${r.out}`);
        if (r.code !== 0) errors.push(`node ${c} ha fallat`);
      }
      const audio = JSON.parse(await readFile(join(root, job.chart), 'utf8')).audio;
      return { ok: !errors.length, revision, log: log.join('\n'), errors, audioUrl: audio ? `/${audio}` : null };
    } finally {
      await rm(backup, { recursive: true, force: true });
    }
  }

  return async function handler(req, res, next) {
    const url = new URL(req.url, 'http://x');
    if (!url.pathname.startsWith('/__music/')) return next?.();
    const denied = guard(req);
    if (denied) return send(res, denied[0], { error: denied[1] });
    const song = url.searchParams.get('song');
    if (!Object.hasOwn(SONGS, song) || !Object.hasOwn(JOBS, song)) return send(res, 404, { error: 'cançó desconeguda' });
    const route = `${req.method} ${url.pathname}`;
    try {
      if (route === 'GET /__music/form') {
        const text = await readFile(formPath(song), 'utf8'), form = JSON.parse(text);
        const score = JSON.parse(await readFile(join(root, 'music', SONGS[song].score), 'utf8'));
        return send(res, 200, { form, score, revision: revisionOf(text) });
      }
      if (route === 'PUT /__music/form') {
        if (!String(req.headers['content-type']).startsWith('application/json')) return send(res, 415, { error: 'cal JSON' });
        const { form, baseRevision } = JSON.parse(await readBody(req));
        if (form?.version !== 1 || form.song !== song) return send(res, 400, { error: 'formulari no vàlid' });
        if (generating) return send(res, 409, { error: 's’està generant: desa quan acabi' });
        const current = await readFile(formPath(song), 'utf8');
        if (revisionOf(current) !== baseRevision) return send(res, 409, { error: 'el fitxer ha canviat', revision: revisionOf(current) });
        const text = formatForm(form);
        await writeFile(formPath(song), text);
        return send(res, 200, { revision: revisionOf(text) });
      }
      if (route === 'POST /__music/generate') {
        if (generating) return send(res, 409, { error: 'ja hi ha una generació en marxa' });
        generating = true;
        try { return send(res, 200, await generate(song)); } finally { generating = false; }
      }
      return send(res, 405, { error: 'no permès' });
    } catch (e) {
      return send(res, 500, { error: String(e?.message ?? e) });
    }
  };
}

export default function musicEditor() {
  return {
    name: 'music-editor', apply: 'serve',
    configureServer(server) { server.middlewares.use(createHandler({ root: server.config.root })); },
  };
}
