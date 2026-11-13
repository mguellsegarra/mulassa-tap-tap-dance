// The ONE reader of the URL's debug flags (?autoplay, ?from, ?mute, ?perf, ?final...). They exist only on a dev host
// (localhost, LAN IPs, *.local/.test); on mulassa.cat or pages.dev only PUBLIC_FLAGS pass: diagnostics that change no
// score (?perf, ?hide, ?vp) and ?figura deep links. Real features (the ?repte challenge link in share.js and ?lang in
// i18n/locale.js) read their own search and are not flags.
// Read debug parameters through `Q`.
export const DEV_HOST = /^(localhost|127(\.\d+){3}|\[::1\]|0\.0\.0\.0|.+\.(localhost|local|test)|10(\.\d+){3}|192\.168(\.\d+){2}|172\.(1[6-9]|2\d|3[01])(\.\d+){2})$/;
export const PUBLIC_FLAGS = ['perf', 'hide', 'vp', 'figura', 'exp']; // exp: experiments/1311 only (poc.mulassa.cat)
export function devSearch(loc) {
  if (!loc) return '';
  if (DEV_HOST.test(loc.hostname)) return loc.search;
  const q = new URLSearchParams(loc.search);
  return new URLSearchParams([...q].filter(([k]) => PUBLIC_FLAGS.includes(k))).toString();
}
export const Q = new URLSearchParams(devSearch(globalThis.location));
// A run that skips part of the drawing on purpose (?hide, ?perf=no3d|nohud): not a real player's run. Plain ?perf is.
export const strippedRun = q => q.has('hide') || ['no3d', 'nohud'].includes(q.get('perf'));
