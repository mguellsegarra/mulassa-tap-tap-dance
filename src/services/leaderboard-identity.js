// A profile's name as this browser remembers it. Names are plain text, one per active profile, with no guest tag: the check
// is the only mark. A released profile (a guest idle for 30 days whose name somebody else took) keeps its text, faded in lists.
export const ALIAS_KEY = 'leaderboard-alias';
export const LEGACY_TAG_KEY = 'leaderboard-tag'; // the guest tag of the first 1.2.0 betas; only ever removed
export const rememberIdentity = (kv, aliasKey, { alias }) => kv.set(aliasKey, String(alias ?? ''));
// the old betas stored a tag beside the name and keyed the owner by name#tag: forget both once, the next profile() read refills the cache
export function dropLegacyIdentity(store) {
  store.remove(LEGACY_TAG_KEY);
  let prof = null; try { prof = JSON.parse(store.get(`${ALIAS_KEY}:identity`) || 'null')?.prof; } catch { prof = {}; }
  if (prof && 'tag' in prof) store.remove(`${ALIAS_KEY}:identity`);
}

// this browser's profile as last known: the remembered name, and the Perfil block's last answer (src/ui/profile-ui.js)
// for the check, so a name shows as the boards show it from the first frame (the publish sheet, the share image)
export function savedName(store) {
  let prof = null;
  try { prof = JSON.parse(store.get(`${ALIAS_KEY}:identity`) || 'null')?.prof; } catch { /* unknown: no check */ }
  return { alias: store.get(ALIAS_KEY) || '', verified: prof?.verified === true, released: prof?.released === true, publicId: prof?.publicId ?? null };
}
// whose board answers the selector may show again (select-ui.js, select-standings.js): the profile's stable public id, only while
// this browser still has that profile. A sign-out, here or in another tab, drops the identity (refreshIdentity); the name stays
export const ownerKey = store => (store.get(`${ALIAS_KEY}:identity`) == null ? '' : (me => me.publicId || me.alias)(savedName(store)));
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
