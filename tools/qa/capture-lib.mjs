// Navegador de dev compartit per les eines de captura: Chrome amb la GPU real (Metal) i un lock perquè només n'hi hagi un a la vegada.
// `soft` torna a SwiftShader (renderer per programari, p. ex. l'escena S24 de l'inventari, que ho necessita).
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const LOCK = process.env.CAPTURE_LOCK ?? '/tmp/mulassa-capture.lock'; // (el test del lock en fa servir un altre)
const WAIT_S = +(process.env.CAPTURE_LOCK_WAIT_S ?? 900); // a holder that hangs alive must not stop every other chat in silence
let held = false;

const holderOf = pid => { try { return `pid ${pid}: ${execFileSync('ps', ['-o', 'command=', '-p', String(pid)], { encoding: 'utf8' }).trim().slice(0, 160)}`; } catch { return `pid ${pid || '?'}`; } };

// mkdir és atòmic; el lock d'un procés mort es pren. Reentrant: qui ja el té no s'espera a ell mateix.
// Mai no mata qui el té: passat WAIT_S falla (code GPU_LOCK_BUSY) i diu qui és.
export async function lock() {
  if (held) return;
  const start = Date.now();
  for (let i = 0; ; i++) {
    try { mkdirSync(LOCK); writeFileSync(join(LOCK, 'pid'), String(process.pid)); held = true; break; } catch {}
    let pid = NaN;
    try { pid = +readFileSync(join(LOCK, 'pid'), 'utf8'); } catch {} // (sense pid encara: l'altre l'acaba de crear)
    if (pid) try { process.kill(pid, 0); } catch { rmSync(LOCK, { recursive: true, force: true }); continue; }
    if (i % 30 === 0) console.log(`un altre agent té la GPU, espero el torn (${holderOf(pid)})`);
    if (Date.now() - start >= WAIT_S * 1000) throw Object.assign(new Error(`GPU lock busy for ${WAIT_S} s, held by ${holderOf(pid)}. It may be hung: check it before anything else.`), { code: 'GPU_LOCK_BUSY' });
    await new Promise(r => setTimeout(r, 1000));
  }
  process.on('exit', () => rmSync(LOCK, { recursive: true, force: true }));
}

// La GPU real sempre passa pel lock (també els tests, que fan cua): dos Chrome amb Metal alhora es tanquen o es mesuren malament.
export async function launchBrowser(chromium, { soft = false } = {}) {
  if (!soft) await lock();
  return soft
    ? chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--mute-audio'] })
    : chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=metal', '--ignore-gpu-blocklist', '--enable-gpu-rasterization', '--mute-audio'] });
}
