import { readdir, readFile, rm, stat } from 'node:fs/promises';
import { resolve, relative, sep } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const OMIT = new Set(['music/mulassa-taiko.wav', 'music/mulassa-taiko.mid', '.DS_Store']);
// A root 404 disables Pages' SPA fallback: unknown URLs must not serve the game with HTTP 200.
const REQUIRED = ['index.html', '404.html', '_headers', 'favicon.ico', 'favicon-32.png',
  'apple-touch-icon.png', 'icon-512.png', 'manifest.webmanifest', 'og.jpg']; // og.jpg: index.html's og:image / twitter:image

// Reject unexpected public files rather than accidentally publishing sources or server code.
export async function preparePages(directory, song) {
  const root = resolve(directory);
  const files = [];
  async function walk(folder) {
    for (const entry of await readdir(folder, { withFileTypes: true })) {
      const path = resolve(folder, entry.name);
      const name = relative(root, path).split(sep).join('/');
      if (entry.isSymbolicLink()) throw new Error(`Symlink in deployment: ${name}`);
      if (entry.isDirectory()) await walk(path);
      else if (entry.isFile()) files.push(name);
      else throw new Error(`Unsupported deployment entry: ${name}`);
    }
  }
  await walk(root);
  const audio = [song.audio, song.ambient].map(url => {
    if (typeof url !== 'string' || !/^music\/[\w-]+\.mp3\?v=[a-f0-9]+$/.test(url)) {
      throw new Error('Expected local content-versioned MP3 URL');
    }
    return url.split('?')[0];
  });
  const required = [...REQUIRED, ...audio];
  for (const name of required) {
    if (!files.includes(name)) throw new Error(`Missing deployment file: ${name}`);
  }
  const deploy = files.filter(name => !OMIT.has(name));
  if (!deploy.some(name => /^assets\/[\w-]+\.js$/.test(name))) throw new Error('Missing built JavaScript');
  if (deploy.length > 20_000) throw new Error('Pages Free file count exceeded');
  for (const name of deploy) {
    const allowed = required.includes(name)
      || /^assets\/[\w-]+\.(js|css)$/.test(name)
      || /^fonts\/[\w-]+\.(woff2?|txt)$/.test(name)
      || /^(captures\/[\w-]+\.jpg|videos\/[\w-]+\.(mp4|jpg))$/.test(name) // /projecte/'s screenshots
      || name === 'campanar-valls.svg' // Configuració «Sobre el joc»
      || ['robots.txt', 'sitemap.xml', 'llms.txt', 'index.md', 'projecte/index.html', 'projecte/index.md'].includes(name); // tools/seo-pages.mjs + public/
    if (!allowed) throw new Error(`Unexpected deployment file: ${name}`);
    if ((await stat(resolve(root, name))).size > 25 * 1024 * 1024) {
      throw new Error(`Pages file size exceeded: ${name}`);
    }
  }
  // Only build output is trimmed; generated source music stays intact.
  for (const name of files.filter(name => OMIT.has(name))) await rm(resolve(root, name));
  return deploy;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const song = JSON.parse(await readFile(new URL('../src/song.json', import.meta.url), 'utf8'));
  const files = await preparePages(fileURLToPath(new URL('../dist', import.meta.url)), song);
  console.log(`Pages static artifact ready: ${files.length} files; no Functions or Workers.`);
}
