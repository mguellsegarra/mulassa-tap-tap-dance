// Imported by messages.js: ES evaluation waits for this module before any module that imports tr() runs, so a module-level
// tr() call already sees the chosen language. `ca` is bundled and resolves at once; ensureLocale() never rejects.
import { ensureLocale } from './load-locale.js';

await ensureLocale();
if (typeof window !== 'undefined') window.__mulassaLocaleReady = true; // index.html's module-init watchdog may judge from here
