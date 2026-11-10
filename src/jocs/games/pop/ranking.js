// Mulassa Pop's all-time board (docs/jocs/pop-ranking.md). The player's name and session are mulassa.cat's: the same
// Supabase client and stored session (services/supabase-client.js). A run goes whole to the pop-score function, which plays
// it again and records its own score. A run made without a name waits here until there is one. Loaded only when needed.
import { getClient } from '../../../services/supabase-client.js';
import { store } from '#plassa/storage.js';

const PENDING = 'pop-pending'; // the best run made with no name yet (or offline): sent once there is one
const fail = code => Object.assign(new Error(code), { code });

async function client() {
  const c = await getClient();
  const { data } = await c.auth.getSession();
  return { c, signed: !!data.session };
}
async function rpc(c, name, args) {
  const { data, error } = await c.rpc(name, args);
  if (error) throw fail('unavailable');
  return data;
}

// the player's name on the boards (null: none), whether somebody else has it now (released: mulassa.cat renames it), and
// their best and place here (null: not on it)
export async function me() {
  const { c, signed } = await client();
  if (!signed) return { name: null, released: false, place: null };
  const [profile, rows] = await Promise.all([rpc(c, 'my_profile_v2'), rpc(c, 'my_pop')]);
  const p = profile?.[0], row = rows?.[0];
  return { name: p && !p.released ? p.alias : null, released: !!p?.released, place: row ? { score: row.score, position: Number(row.position), public_id: p?.public_id } : null };
}

export async function board() {
  const { c } = await client();
  return (await rpc(c, 'get_pop_board', { p_offset: 0, p_limit: 50 })).map(r => ({ ...r, position: Number(r.position) }));
}

// a player's card by the public id the board shows, or null
export async function player(publicId) {
  const { c } = await client();
  const row = (await rpc(c, 'get_pop_player', { p_public_id: publicId }))?.[0];
  return row ? { ...row, position: Number(row.position), runs: Number(row.runs) } : null;
}

// → { score, best, improved, position }; throws { code }: 'noname', 'released', 'pop_rate_limited', 'pop_seed_used', 'unavailable'…
export async function publish(run) {
  const { c, signed } = await client();
  if (!signed) throw fail('noname');
  const { data, error } = await c.functions.invoke('pop-score', { body: run });
  if (!error) return data;
  const code = (await error.context?.json?.().catch(() => null))?.error ?? 'unavailable';
  throw fail(code === 'pop_profile_required' ? 'released' : code === 'authentication_required' ? 'noname' : code);
}

export function keep(run) {
  const old = pending();
  if (!old || old.v !== run.v || run.points > old.points) store.set(PENDING, JSON.stringify(run)); // an older version's never passes
}
export function pending() {
  try { return JSON.parse(store.get(PENDING)) || null; } catch { return null; }
}
export const forget = () => store.remove(PENDING);
