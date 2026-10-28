// Navegador de dev compartit per les eines de captura: Chrome amb la GPU real (Metal) i un lock perquè només n'hi hagi un a la vegada.
// `soft` torna a SwiftShader (renderer per programari, p. ex. l'escena S24 de l'inventari, que ho necessita).
import { mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const LOCK = process.env.CAPTURE_LOCK ?? '/tmp/mulassa-capture.lock'; // (el test del lock en fa servir un altre)
let held = false;

// mkdir és atòmic; el lock d'un procés mort es pren. Reentrant: qui ja el té no s'espera a ell mateix.
export async function lock() {
  if (held) return;
  for (let i = 0; ; i++) {
    try { mkdirSync(LOCK); writeFileSync(join(LOCK, 'pid'), String(process.pid)); held = true; break; } catch {}
    let pid = NaN;
    try { pid = +readFileSync(join(LOCK, 'pid'), 'utf8'); } catch {} // (sense pid encara: l'altre l'acaba de crear)
    if (pid) try { process.kill(pid, 0); } catch { rmSync(LOCK, { recursive: true, force: true }); continue; }
    if (i === 0) console.log('un altre agent està capturant: espero el torn…');
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
