import { createClient } from 'npm:@supabase/supabase-js@2';
import { verifyRun, MAX_BYTES } from './verify.js';

// Mulassa Pop's publication (docs/jocs/pop-ranking.md): verify the caller with Auth, let the database rate-limit them, play the
// run again (verify.js) and record the score this replay reached. Only the service role may record (pop_gate, pop_record).
const isPlayer = (user: { is_anonymous?: boolean; email_confirmed_at?: string | null } | null | undefined): boolean =>
  user?.is_anonymous === true || Boolean(user?.email_confirmed_at);
// the database's reasons the page may show; anything else stays here
const KNOWN = ['leaderboard_auth_required', 'pop_profile_required', 'pop_rate_limited', 'pop_seed_used'];
const STATUS: Record<string, number> = { leaderboard_auth_required: 401, pop_profile_required: 403, pop_rate_limited: 429, pop_seed_used: 409 };
const reason = (message = '') => KNOWN.find(k => message.includes(k)) ?? 'unavailable';

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('origin');
  const allowed = (Deno.env.get('ALLOWED_ORIGINS') || '').split(',').map(s => s.trim()).filter(Boolean);
  const cors: Record<string, string> = {
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
    'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Vary': 'Origin',
  };
  if (origin && allowed.includes(origin)) cors['Access-Control-Allow-Origin'] = origin;
  const reply = (status: number, body: object) => Response.json(body, { status, headers: cors });
  if (origin && !allowed.includes(origin)) return reply(403, { error: 'origin_not_allowed' });
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'POST') return reply(405, { error: 'method_not_allowed' });
  const bearer = req.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1];
  if (!bearer) return reply(401, { error: 'authentication_required' });
  if (Number(req.headers.get('content-length') || 0) > MAX_BYTES) return reply(413, { error: 'too_large' });
  const url = Deno.env.get('SUPABASE_URL');
  const secret = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !secret) return reply(503, { error: 'not_configured' });
  const admin = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
  try {
    // Auth first: a caller with no account never gets its body read or parsed
    const { data, error } = await admin.auth.getUser(bearer);
    if (error || !data.user || !isPlayer(data.user)) return reply(401, { error: 'authentication_required' });
    const text = await req.text();
    if (text.length > MAX_BYTES) return reply(413, { error: 'too_large' });
    let body: unknown;
    try { body = JSON.parse(text); } catch { return reply(400, { error: 'invalid' }); }
    const uid = data.user.id; // the account is Auth's word, never the body's
    const gate = await admin.rpc('pop_gate', { p_uid: uid });
    if (gate.error) { const r = reason(gate.error.message); return reply(STATUS[r] ?? 503, { error: r }); }
    const run = verifyRun(body);
    if (!run.ok) return reply(422, { error: run.error });
    const rec = await admin.rpc('pop_record', { p_uid: uid, p_seed: run.seed, p_score: run.score, p_ticks: run.ticks });
    if (rec.error) { const r = reason(rec.error.message); return reply(STATUS[r] ?? 503, { error: r }); }
    const row = rec.data?.[0];
    return reply(200, { score: run.score, best: row.best, improved: row.improved, position: Number(row.position) });
  } catch { return reply(503, { error: 'unavailable' }); }
});
