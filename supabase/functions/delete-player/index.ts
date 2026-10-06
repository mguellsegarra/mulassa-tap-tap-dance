import { createClient } from 'npm:@supabase/supabase-js@2';

// Who may delete a leaderboard profile: a guest (anonymous Auth user) or one whose e-mail address is confirmed (a profile
// protected with an e-mail, 202609300001), exactly as the SQL's leaderboard_private.require_player().
const isPlayer = (user: { is_anonymous?: boolean; email_confirmed_at?: string | null } | null | undefined): boolean =>
  user?.is_anonymous === true || Boolean(user?.email_confirmed_at);

// Verify the caller with Auth; an arbitrary account ID in the body is never used.
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
  const url = Deno.env.get('SUPABASE_URL');
  const secret = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !secret) return reply(503, { error: 'not_configured' });
  const admin = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
  try {
    const { data, error } = await admin.auth.getUser(bearer);
    if (error || !data.user || !isPlayer(data.user)) return reply(401, { error: 'authentication_required' });
    const deleted = await admin.auth.admin.deleteUser(data.user.id);
    if (deleted.error) return reply(503, { error: 'deletion_failed' });
    return reply(200, { deleted: true });
  } catch { return reply(503, { error: 'unavailable' }); }
});
