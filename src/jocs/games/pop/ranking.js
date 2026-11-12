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
  return { c, signed: !!data.session, uid: data.session?.user.id ?? null };
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

// a page of the board by row index (board-pages.js); the server gives 50 at most
export async function board(offset = 0, limit = 50) {
  const { c } = await client();
  return (await rpc(c, 'get_pop_board', { p_offset: offset, p_limit: limit })).map(r => ({ ...r, position: Number(r.position) }));
}

// a player's card by the public id the board shows, or null
export async function player(publicId) {
  const { c } = await client();
  const row = (await rpc(c, 'get_pop_player', { p_public_id: publicId }))?.[0];
  return row ? { ...row, position: Number(row.position), runs: Number(row.runs) } : null;
}

// → { score, best, improved, position }; throws { code }: 'noname', 'released', 'pop_rate_limited', 'pop_seed_used', 'unavailable'…
export async function publish(run) {
  const { c, uid } = await client();
  const { owner, ...body } = run;
  if (owner && owner !== uid) throw fail('owner'); // kept under another account on this device: never sent under this one
  if (!uid) throw fail('noname');
  claim(body, uid);
  const { data, error } = await c.functions.invoke('pop-score', { body });
  if (!error) return data;
  const code = (await error.context?.json?.().catch(() => null))?.error ?? 'unavailable';
  throw fail(code === 'pop_profile_required' ? 'released' : code === 'authentication_required' ? 'noname' : code);
}

export function keep(run) {
  const old = pending();
  if (!old || old.v !== run.v || run.points > old.points) store.set(PENDING, JSON.stringify(run)); // an older version's never passes
}
// the kept run becomes the signed-in account's as it goes out; one kept by another account gives way to this run
function claim(body, uid) {
  const p = pending();
  if (p?.owner && p.owner !== uid) store.set(PENDING, JSON.stringify({ ...body, owner: uid }));
  else if (p && !p.owner && p.v === body.v && p.seed === body.seed) store.set(PENDING, JSON.stringify({ ...p, owner: uid }));
}
export function pending() {
  try { return JSON.parse(store.get(PENDING)) || null; } catch { return null; }
}
export const forget = () => store.remove(PENDING);
