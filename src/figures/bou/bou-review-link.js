// The selector's link to the local dance review (tools/dev/bou-dance.html), on a development host only. Part of the
// Bou's unreleased code: a build leaves it out (tools/deploy/unreleased-figure.mjs).
import { DEV_HOST } from '../../core/flags.js';

export function bouReviewLink(doc, win) {
  if (!DEV_HOST.test(win.location?.hostname ?? '')) return null;
  const link = doc.createElement('a');
  link.className = 'btn btn-link'; link.href = '/tools/dev/bou-dance.html' + (win.location.search.includes('mute') ? '?mute' : '');
  link.textContent = 'Veure el ball amb la música'; // i18n-ok: local development review only
  return link;
}
