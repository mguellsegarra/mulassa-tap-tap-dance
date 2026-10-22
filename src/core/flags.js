// The ONE reader of the URL's debug flags (?autoplay, ?from, ?mute, ?perf, ?final...). They exist only on a dev host
// (localhost, LAN IPs, *.local/.test): on mulassa.cat or pages.dev every query param is invisible here. Real features
// (the ?repte challenge link, share.js) read their own search and are not flags. Import `Q`; never touch location.search.
export const DEV_HOST = /^(localhost|127(\.\d+){3}|\[::1\]|0\.0\.0\.0|.+\.(localhost|local|test)|10(\.\d+){3}|192\.168(\.\d+){2}|172\.(1[6-9]|2\d|3[01])(\.\d+){2})$/;
export const devSearch = loc => (loc && DEV_HOST.test(loc.hostname) ? loc.search : '');
export const Q = new URLSearchParams(devSearch(globalThis.location));
