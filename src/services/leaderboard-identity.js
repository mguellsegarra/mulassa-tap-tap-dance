// A profile's name: the alias and its guest tag, shown as «nom#1234», stored apart on this browser.
export const TAG_KEY = 'leaderboard-tag'; // beside 'leaderboard-alias', which keeps the name WITHOUT the tag (an old tab reads and sends it)
const pad4 = n => String(n).padStart(4, '0');
// «Timbaler#3821» for a guest (a tag), «Timbaler» for a verified profile (no tag); never what is stored under the alias key.
export const displayName = (alias, tag) => (Number.isInteger(tag) && tag >= 0 && tag <= 9999 ? `${alias}#${pad4(tag)}` : String(alias ?? ''));
// The name of a board row without its «#1234» (get_leaderboard_all composes it for old clients; `tag` is the extra column).
export const baseName = (composed, tag) => (Number.isInteger(tag) && String(composed).endsWith(`#${pad4(tag)}`) ? String(composed).slice(0, -5) : String(composed ?? ''));
// This browser's own profile name: the raw alias under ALIAS_KEY ('leaderboard-alias'), the tag under TAG_KEY. Never «name#1234» in the alias.
export function rememberIdentity(kv, aliasKey, { alias, tag = null }) {
  kv.set(aliasKey, baseName(alias, tag));
  if (Number.isInteger(tag)) kv.set(TAG_KEY, String(tag)); else kv.remove?.(TAG_KEY);
}

export const ALIAS_KEY = 'leaderboard-alias';
// this browser's profile as last known: the remembered name and tag, and the Perfil block's last answer (src/ui/profile-ui.js)
// for the check, so a name shows as the boards show it from the first frame (the publish sheet, the share image)
export function savedName(store) {
  let verified = false;
  try { verified = JSON.parse(store.get(`${ALIAS_KEY}:identity`) || 'null')?.prof?.verified === true; } catch { /* unknown: no check */ }
  const t = store.get(TAG_KEY), n = Number(t);
  return { alias: store.get(ALIAS_KEY) || '', tag: t != null && Number.isInteger(n) ? n : null, verified };
}
// whose board answers the selector may show again (select-ui.js, select-standings.js): the remembered name, only while this browser
// still has that profile. A sign-out, here or in another tab, drops the identity (refreshIdentity); the name and tag stay
export const ownerKey = store => (store.get(`${ALIAS_KEY}:identity`) == null ? '' : (me => `${me.alias}#${me.tag}`)(savedName(store)));
// savedName's source, kept fresh from the server's answer (profile(): null = no profile or session, which clears it): the share
// image and the publish sheet then show the check for a confirmed profile without Perfil ever having been opened. The Perfil
// block (src/ui/profile-ui.js) writes the same key with its own fields, which this keeps. One request at a time; an offline
// failure leaves what is remembered. `fresh` (an account change): the read in flight was for the profile before, so it is dropped
// (its late answer writes nothing) and a new one is asked.
const asking = new WeakMap(); // service → the read in flight: { p } (its identity is what a late answer is checked against)
export function refreshIdentity(service, store, { fresh = false } = {}) {
  if (!service.configured || !service.profile) return Promise.resolve();
  if (asking.has(service) && !fresh) return asking.get(service).p;
  const key = `${ALIAS_KEY}:identity`, mine = {};
  mine.p = Promise.resolve().then(() => service.profile()).then(prof => {
    if (asking.get(service) !== mine) return;
    if (!prof) { store.remove(key); return; }
    rememberIdentity(store, ALIAS_KEY, prof);
    let was = null; try { was = JSON.parse(store.get(key) || 'null'); } catch { /* none */ }
    store.set(key, JSON.stringify({ hasSession: true, mailOn: was?.mailOn || '', persistent: was?.persistent !== false, prof }));
  }, () => {}).finally(() => { if (asking.get(service) === mine) asking.delete(service); });
  asking.set(service, mine);
  return mine.p;
}
