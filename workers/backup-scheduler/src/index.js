// Scheduling only: database/R2/age credentials stay in the GitHub environment.
export const CRON = '17 3 * * *';
const DISPATCH = 'https://api.github.com/repos/mguellsegarra/mulassa-tap-tap-dance/actions/workflows/db-backup.yml/dispatches';

export async function dispatchBackup(controller, env, send = fetch) {
  if (env.SCHEDULER_ENABLED === 'false' || env.SCHEDULER_ENABLED === undefined) return 'DISABLED';
  if (env.SCHEDULER_ENABLED !== 'true' || controller.cron !== CRON) {
    throw new Error('BACKUP_DISPATCH_CONFIG');
  }
  const token = env.GITHUB_ACTIONS_TOKEN;
  if (typeof token !== 'string' || !/^[A-Za-z0-9_]{32,512}$/.test(token)) {
    throw new Error('BACKUP_DISPATCH_CONFIG');
  }
  try {
    const response = await send(DISPATCH, {
      method: 'POST',
      redirect: 'manual',
      signal: AbortSignal.timeout(20_000),
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'mulassa-backup-scheduler',
        'X-GitHub-Api-Version': '2026-03-10',
      },
      body: JSON.stringify({ ref: 'main' }),
    });
    // Never log or parse a remote body. Both API generations acknowledge dispatch this way.
    if (response.body) await response.body.cancel();
    if (response.status !== 200 && response.status !== 204) throw new Error();
  } catch {
    // No automatic retry: a lost acknowledgement may already have created a backup run.
    throw new Error('BACKUP_DISPATCH_FAILED');
  }
  return 'DISPATCH_ACCEPTED'; // Acceptance is not proof of a completed backup; Sentry checks completion.
}

export default {
  async scheduled(controller, env) {
    const result = await dispatchBackup(controller, env);
    console.log(result); // Fixed status only, never credentials or remote diagnostics.
  },
  fetch() {
    return new Response(null, { status: 404 });
  },
};
