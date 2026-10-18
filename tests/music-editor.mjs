// The dev music editor: it never reaches the game's bundle, its backend refuses anything but this machine's own
// page, and its form edits / undo stack are pure.
import assert from 'node:assert/strict';
import { readFileSync, existsSync, mkdtempSync, mkdirSync, writeFileSync, copyFileSync, rmSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { Readable } from 'node:stream';
import { fileURLToPath } from 'node:url';
import { createHandler, guard, revisionOf, formatForm, JOBS } from '../tools/music-editor/vite-plugin.mjs';
import { SONGS } from '../src/music-form/songs.js';
import { compileForm } from '../src/music-form/compile.js';
import * as E from '../src/dev/music-editor/edits.js';
import { S, pick, selIds } from '../src/dev/music-editor/state.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// ---- production exclusion: the game's import graph (static and dynamic) never reaches the editor or the compiler
{
  const IMPORT = /(?:^(?:import|export)\s[^;]*?from\s+|^import\s+|import\(\s*)'(\.[^']+)'/gm;
  const banned = ['src/dev/music-editor', 'src/music-form'].map(p => join(root, p));
  const seen = new Set(), stack = [join(root, 'src/main.js')];
  while (stack.length) {
    const f = stack.pop();
    if (seen.has(f)) continue;
    seen.add(f);
    for (const m of readFileSync(f, 'utf8').matchAll(IMPORT)) {
      const t = resolve(dirname(f), m[1]);
      assert(!banned.some(b => t.startsWith(b)), `${relative(root, f)} imports ${m[1]}: the game must not reach the music editor / compiler`);
      if (/\.m?js$/.test(t) && existsSync(t)) stack.push(t);
    }
  }
  assert(seen.size > 20, 'the walk reached the game');
  assert(!/editor/.test(readFileSync(join(root, 'index.html'), 'utf8').match(/<script[^>]*src="[^"]*"/g)?.join() ?? ''), 'index.html loads no editor script');
  const cfg = readFileSync(join(root, 'vite.config.js'), 'utf8');
  assert(!/rollupOptions|\binput\s*:/.test(cfg), 'vite build keeps index.html as its only input');
  assert(/apply:\s*'serve'/.test(readFileSync(join(root, 'tools/music-editor/vite-plugin.mjs'), 'utf8')), 'the backend is dev-only');
  for (const f of ['edits.js', 'state.js', 'tracks.js', 'pointer.js', 'panel.js', 'main.js']) {
    const n = readFileSync(join(root, 'src/dev/music-editor', f), 'utf8').split('\n').length;
    assert(n <= 600, `${f} has ${n} lines`);
  }
}

// ---- backend: fake requests against a scratch copy of the repo's music files
const scratch = mkdtempSync(join(tmpdir(), 'music-editor-test-'));
try {
  mkdirSync(join(scratch, 'music')); mkdirSync(join(scratch, 'public/music'), { recursive: true }); mkdirSync(join(scratch, 'src'));
  for (const f of [SONGS.drac.form, SONGS.drac.score]) copyFileSync(join(root, 'music', f), join(scratch, 'music', f));
  const formText = readFileSync(join(scratch, 'music', SONGS.drac.form), 'utf8');
  assert.equal(formatForm(JSON.parse(formText)), formText, 'a save keeps the form file’s layout');

  const H = { host: 'localhost:5178', origin: 'http://localhost:5178', 'sec-fetch-site': 'same-origin' };
  const req = ({ method = 'GET', url = '/__music/form?song=drac', headers = H, ip = '127.0.0.1', body } = {}) =>
    Object.assign(Readable.from(body === undefined ? [] : [Buffer.from(typeof body === 'string' ? body : JSON.stringify(body))]),
      { method, url, headers: { ...headers }, socket: { remoteAddress: ip } });
  const call = (handler, r) => new Promise(ok => {
    const res = { statusCode: 200, headers: {}, setHeader(k, v) { this.headers[k] = v; }, end(b) { ok({ status: this.statusCode, data: JSON.parse(b) }); } };
    handler(r, res, () => ok({ status: 'next' }));
  });

  // guards
  assert.equal(guard(req()), null);
  assert.equal(guard(req({ ip: '::1' })), null);
  assert.equal(guard(req({ ip: '192.168.1.20' }))[0], 403, 'LAN clients are refused');
  assert.equal(guard(req({ headers: { ...H, origin: 'http://evil.test' } }))[0], 403, 'cross-origin');
  assert.equal(guard(req({ headers: { ...H, host: 'evil.test:5178', origin: 'http://evil.test:5178' } }))[0], 403, 'DNS rebinding');
  assert.equal(guard(req({ headers: { ...H, 'sec-fetch-site': 'cross-site' } }))[0], 403);
  assert.equal(guard(req({ method: 'PUT', headers: { host: H.host } }))[0], 403, 'a write needs its origin');

  const calls = [];
  let gen = async () => ({ code: 0, out: '' });
  const run = async (argv, cwd) => { calls.push(argv); return argv.includes(JOBS.drac.generator) ? gen(argv, cwd) : { code: 0, out: 'ok' }; };
  const handler = createHandler({ root: scratch, run, nodeBin: 'node' });

  assert.equal((await call(handler, req({ url: '/other' }))).status, 'next', 'other urls pass through');
  assert.equal((await call(handler, req({ ip: '10.0.0.2' }))).status, 403);
  for (const song of ['nope', '../music/drac', 'constructor', '__proto__', ''])
    assert.equal((await call(handler, req({ url: `/__music/form?song=${encodeURIComponent(song)}` }))).status, 404, `song ${song} refused`);

  const got = await call(handler, req());
  assert.equal(got.status, 200);
  assert.equal(got.data.revision, revisionOf(formText));
  assert.equal(got.data.form.song, 'drac');
  assert(Array.isArray(got.data.score.bars));

  const put = (body, headers = { ...H, 'content-type': 'application/json' }) => call(handler, req({ method: 'PUT', body, headers }));
  assert.equal((await put({ form: got.data.form, baseRevision: got.data.revision }, H)).status, 415, 'JSON only');
  assert.equal((await put({ form: { ...got.data.form, song: 'mulassa' }, baseRevision: got.data.revision })).status, 400);
  assert.equal((await put({ form: got.data.form, baseRevision: 'stale' })).status, 409, 'a stale base is a conflict');
  const edited = E.addPhrase(got.data.form, ['u002'], 'prova');
  const saved = await put({ form: edited, baseRevision: got.data.revision });
  assert.equal(saved.status, 200);
  const disk = readFileSync(join(scratch, 'music', SONGS.drac.form), 'utf8');
  assert.equal(saved.data.revision, revisionOf(disk));
  assert.deepEqual(JSON.parse(disk), edited);
  assert.equal((await put({ form: got.data.form, baseRevision: got.data.revision })).status, 409, 'the old revision is stale now');

  // generate: argv is fixed (no shell), a failing generator restores every artifact, a missing one is removed again
  const A = JOBS.drac.artifacts, art = f => join(scratch, f);
  for (const f of A.slice(1)) { mkdirSync(dirname(art(f)), { recursive: true }); writeFileSync(art(f), `old ${f}`); }
  writeFileSync(art(JOBS.drac.chart), JSON.stringify({ audio: 'music/drac-taiko.mp3?v=old' }));
  gen = async () => { for (const f of A) writeFileSync(art(f), 'broken'); return { code: 1, out: 'Traceback' }; };
  const post = () => call(handler, req({ method: 'POST', url: '/__music/generate?song=drac' }));
  let r = await post();
  assert.equal(r.status, 200);
  assert.equal(r.data.ok, false);
  assert.equal(r.data.audioUrl, null);
  assert.equal(r.data.revision, saved.data.revision);
  assert.match(r.data.log, /Traceback/);
  for (const f of A.slice(1)) assert.equal(readFileSync(art(f), 'utf8'), f === JOBS.drac.chart ? JSON.stringify({ audio: 'music/drac-taiko.mp3?v=old' }) : `old ${f}`, `${f} restored`);
  assert(!existsSync(art(A[0])), 'an artifact that did not exist before is removed again');
  assert.deepEqual(calls[0], ['uv', 'run', '--python', '3.11', '--with', 'numpy', '--with', 'scipy', '--with', 'soundfile', '--with', 'mido', 'python', 'tools/build_drac.py']);
  assert.equal(calls.length, 1, 'no checks after a failed generation');

  // success: the checks run and report; a failing check keeps the new audio but is not ok
  calls.length = 0;
  let release;
  gen = () => new Promise(ok => { release = () => { writeFileSync(art(JOBS.drac.chart), JSON.stringify({ audio: 'music/drac-taiko.mp3?v=new' })); ok({ code: 0, out: 'fet' }); }; });
  const first = post();
  while (!release) await new Promise(ok => setTimeout(ok, 5)); // the generator is running (a fixed wait raced under load)
  assert.equal((await post()).status, 409, 'one generation at a time');
  assert.equal((await put({ form: edited, baseRevision: saved.data.revision })).status, 409, 'no save while generating');
  release();
  r = await first;
  assert.equal(r.data.ok, true);
  assert.equal(r.data.audioUrl, '/music/drac-taiko.mp3?v=new');
  assert.deepEqual(calls.slice(1).map(a => a.slice(1)), JOBS.drac.checks.map(c => [c]));
  const failing = run;
  const h2 = createHandler({ root: scratch, nodeBin: 'node', run: async (argv, cwd) => argv[1] === 'tests/drac.mjs' ? { code: 1, out: 'AssertionError' } : failing(argv, cwd) });
  gen = async () => ({ code: 0, out: '' });
  r = await call(h2, req({ method: 'POST', url: '/__music/generate?song=drac' }));
  assert.equal(r.data.ok, false);
  assert.deepEqual(r.data.errors, ['node tests/drac.mjs ha fallat']);
  assert.equal(r.data.audioUrl, '/music/drac-taiko.mp3?v=new', 'the new audio stays to be heard');
} finally {
  rmSync(scratch, { recursive: true, force: true });
}

// ---- form edits (pure) and the undo stack
{
  const form = JSON.parse(readFileSync(join(root, 'music', SONGS.drac.form), 'utf8'));
  const score = JSON.parse(readFileSync(join(root, 'music', SONGS.drac.score), 'utf8'));
  const frozen = JSON.stringify(form);
  const u = form.source.unfolded.map(x => x.id);

  let f = E.addPhrase(form, [u[1], u[2]], 'Nova');
  const p = f.phrases.at(-1);
  assert.deepEqual(p.bars, [u[1], u[2]]);
  assert.notEqual(p.id, form.phrases.at(-1).id);
  assert.throws(() => E.addPhrase(form, []), /mínim/);
  assert.throws(() => E.addPhrase(form, ['nope']), /no és a l’original/);
  assert.equal(E.renamePhrase(f, p.id, '  ').phrases.at(-1).name, 'Nova', 'a blank name keeps the old one');
  assert.deepEqual(E.recutPhrase(f, p.id, [u[3]]).phrases.at(-1).bars, [u[3]]);

  f = E.insertItem(f, p.id, 1);
  const it = f.sequence[1];
  assert.equal(it.phrase, p.id);
  assert.equal(it.label, form.sequence[0].label, 'a new item takes the label before it');
  assert.throws(() => E.removePhrase(f, p.id), /sona a la seqüència/);
  assert.deepEqual(E.moveItem(f, it.id, 0).sequence.map(s => s.id).slice(0, 2), [it.id, form.sequence[0].id]);
  const dup = E.duplicateItem(f, it.id);
  assert.equal(dup.sequence[2].phrase, p.id);
  assert.notEqual(dup.sequence[2].id, it.id);
  assert.equal(new Set(dup.sequence.map(s => s.id)).size, dup.sequence.length, 'ids stay unique');
  assert.throws(() => E.setItem(f, it.id, { repeat: 0 }), /1 o més/);
  assert.throws(() => E.setItem(f, it.id, { beatScale: 3 }));
  assert.throws(() => E.setItem(f, it.id, { label: 'zz' }), /desconeguda/);
  assert.equal(E.setItem(f, it.id, { beatScale: 2, repeat: 3 }).sequence[1].repeat, 3);

  // single-bar edits: own list, back to the phrase's = null, overrides follow the bars
  let g = E.moveBar(f, it.id, 0, 1);
  assert.deepEqual(g.sequence[1].bars, [u[2], u[1]]);
  assert.equal(E.moveBar(g, it.id, 0, 1).sequence[1].bars, null, 'the phrase order again = no override');
  assert.equal(E.moveBar(f, it.id, 0, -1), f, 'nothing to move');
  g = E.setBarOverride(f, it.id, u[2], { notes: 'C5:1 R:1' });
  assert.deepEqual(g.sequence[1].barOverrides, { [u[2]]: { notes: 'C5:1 R:1' } });
  assert.deepEqual(E.setBarOverride(g, it.id, u[2], { notes: '' }).sequence[1].barOverrides, {});
  assert.deepEqual(E.removeBar(g, it.id, 1).sequence[1], { ...g.sequence[1], bars: [u[1]], barOverrides: {} }, 'a removed bar drops its override');
  assert.throws(() => E.removeBar(E.removeBar(f, it.id, 0), it.id, 0), /mínim/);

  // tempo knots stay sorted; the last one cannot go
  const tl0 = compileForm(form, score), mid = (tl0.tempo.knots[0][0] + tl0.tempo.knots[1][0]) / 2;
  g = E.addKnot(form, mid, 130.04, tl0);
  assert.deepEqual(g.tempo.knots[1], { at: { beat: mid }, bpm: 130 }, 'a new knot goes in its place among item-anchored ones');
  assert.deepEqual(compileForm(g, score).unresolved, tl0.unresolved);
  g = E.moveKnot(g, 1, tl0.tempo.knots.at(-1)[0] + 1, 100, tl0);
  assert.deepEqual(g.tempo.knots.at(-1), { at: { beat: tl0.tempo.knots.at(-1)[0] + 1 }, bpm: 100 }, 'moved past the last one');
  g = { ...form, tempo: { ...form.tempo, knots: [{ at: { beat: 0 }, bpm: 120 }] } };
  assert.throws(() => E.removeKnot(g, 0), /mínim un punt/);

  // events
  g = E.addBalloon(form, 10.4, 12.6);
  assert.deepEqual([g.events.balloons.at(-1).start, g.events.balloons.at(-1).end], [{ beat: 10 }, { beat: 13 }], 'balloons are whole beats');
  assert.deepEqual(E.setBalloon(g, g.events.balloons.length - 1, 5, 5).events.balloons.at(-1).end, { beat: 6 });
  assert.throws(() => E.addHold(form, 4, 4), /després/);
  assert.throws(() => E.setHold(E.addHold(form, 4, 6), form.events.holds.length, { kind: 'x' }));
  assert.equal(E.removeEvent(g, 'balloons', 0).events.balloons.length, g.events.balloons.length - 1);

  // anchors resolve like the compiler; removing an item leaves its anchors unresolved, never moved
  const tl = compileForm(form, score);
  form.events.holds.forEach((h, i) => assert.deepEqual([E.resolveAnchor(h.start, tl), E.resolveAnchor(h.end, tl)], tl.holds[i].slice(0, 2), `hold ${h.id}`));
  for (const k of ['finale', 'hit']) assert.equal(E.resolveAnchor(form.ending[k], tl), tl[k === 'hit' ? 'end' : k], k);
  const used = form.events.holds[0]?.start.item;
  if (used) assert(compileForm(E.removeItem(form, used), score).unresolved.length > 0, 'removing an anchored item shows in the red list');
  assert.equal(compileForm(f, score).unresolved.length, tl.unresolved.length, 'inserting a phrase compiles');

  assert.equal(JSON.stringify(form), frozen, 'edits never mutate their input');

  // undo / redo
  let h = E.history(form);
  h = E.commit(h, f);
  h = E.commit(h, dup);
  assert.equal(E.commit(h, dup), h, 'the same form is no new step');
  h = E.undo(h); assert.equal(h.now, f);
  h = E.undo(h); assert.equal(h.now, form);
  assert.equal(E.undo(h), h, 'nothing more to undo');
  h = E.redo(h); assert.equal(h.now, f);
  h = E.commit(h, g); assert.equal(h.future.length, 0, 'a new edit drops the redo branch');
  assert.equal(E.redo(h), h);
}

// ---- selection: plain click one, Cmd toggles, Shift the run from the anchor (ids in sequence order)
{
  const order = ['a', 'b', 'c', 'd', 'e'], none = {}, cmd = { metaKey: true }, shift = { shiftKey: true };
  pick('item', 'b', none, order); assert.deepEqual(selIds('item'), ['b']);
  pick('item', 'd', shift, order); assert.deepEqual(selIds('item'), ['b', 'c', 'd']);
  pick('item', 'c', cmd, order); assert.deepEqual(selIds('item'), ['b', 'd']);
  pick('item', 'a', cmd, order); assert.deepEqual(selIds('item'), ['b', 'd', 'a']);
  assert.equal(S.sel.id, 'b', 'the anchor stays');
  pick('item', 'b', cmd, order); assert.equal(S.sel.id, 'a', 'removing the anchor moves it');
  pick('item', 'e', none, order); assert.deepEqual(selIds('item'), ['e']);
  assert.deepEqual(selIds('phrase'), [], 'another kind is not selected');
  S.sel = null;
}

console.log('music editor ok: no game import reaches it, backend guards, form edits, undo, multi-selection');
