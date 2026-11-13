import { drumCanConnect, drumPluggedIn, connectDrum } from '../platform/drum.js';
import { tr } from '../i18n/messages.js';
import { errors } from '../services/errors.js';
// ⚙ Configuració's «Connecta el timbal» (WebHID: HTTPS, Chromium only; hidden elsewhere). The browser asks once to pick the
// drum; from then on it is seen plugged in as the page loads, so the first song is already a drum run (platform/drum.js).
export function setupDrumConnect(doc = document) {
  const btn = doc.getElementById('settings-drum'), sub = doc.getElementById('settings-drum-sub');
  const refresh = () => {
    btn.hidden = !drumCanConnect();
    sub.textContent = tr(drumPluggedIn() ? 'ui.drumConnected' : 'html.drumConnectSub');
  };
  btn.addEventListener('click', () => connectDrum().then(refresh, e => {
    if (e?.name !== 'NotFoundError') errors.report('drum-connect-failed', { reason: e?.name ?? 'unknown' }); // NotFoundError: the picker was closed
    refresh();
  }));
  refresh();
  return refresh; // openSettings: the drum may have been plugged in or out since
}
