// Navegador de dev compartit per les eines de captura: Chrome amb la GPU real (Metal) i un lock perquè només n'hi hagi un a la vegada.
// `soft` torna a SwiftShader (renderer per programari, p. ex. l'escena S24 de l'inventari, que ho necessita).
import { mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const LOCK = '/tmp/mulassa-capture.lock';

// mkdir és atòmic; el lock d'un procés mort es pren
export async function lock() {
  for (let i = 0; ; i++) {
    try { mkdirSync(LOCK); writeFileSync(join(LOCK, 'pid'), String(process.pid)); break; } catch {}
    try { process.kill(+readFileSync(join(LOCK, 'pid'), 'utf8'), 0); } catch { rmSync(LOCK, { recursive: true, force: true }); continue; }
    if (i === 0) console.log('un altre agent està capturant: espero el torn…');
    await new Promise(r => setTimeout(r, 1000));
  }
  process.on('exit', () => rmSync(LOCK, { recursive: true, force: true }));
}

export const launchBrowser = (chromium, { soft = false } = {}) => soft
  ? chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--mute-audio'] })
  : chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=metal', '--ignore-gpu-blocklist', '--enable-gpu-rasterization', '--mute-audio'] });
