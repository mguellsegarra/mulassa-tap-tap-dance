// The Supabase client, made once on first use (the SDK is a lazy import): this browser's session persists only where
// localStorage works.
const env = import.meta.env ?? {};
let clientPromise;
export async function getClient() {
  if (!clientPromise) clientPromise = import('@supabase/supabase-js').then(({ createClient }) => {
    let storage, persistent = false;
    try {
      storage = globalThis.localStorage;
      const key = 'mulassa-storage-probe'; storage.setItem(key, '1'); storage.removeItem(key);
      persistent = true;
    } catch { storage = undefined; }
    const c = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY, {
      auth: { persistSession: persistent, storage, storageKey: 'mulassa-leaderboard-session', detectSessionInUrl: false },
    });
    c.mulassaPersistentStorage = persistent;
    return c;
  }).catch(error => { clientPromise = null; throw error; });
  return clientPromise;
}
