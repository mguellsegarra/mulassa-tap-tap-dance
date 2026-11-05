// The e-mail code flow of the profile (src/ui/profile-ui.js): attach an address, switch to the profile that owns it, and leave a
// guest that can no longer be reached. Spread into the leaderboard service (leaderboard.js), which lends write (one write at a
// time, errors translated), emit (account events) and captchaRequired.
import { fail } from './leaderboard-errors.js';
import { cleanEmail } from './feedback.js';

export function codeSignIn({ write, emit, captchaRequired }) {
  return {
    // Profile recovery, no password: an e-mail address on the guest profile, then a 6-digit code sent to it. sendCode()
    // attaches the address to this browser's profile (or, if that address already owns one, signs in to it instead) and
    // returns the `type` verifyCode() needs; verifyCode() finishes it. The address stays in Supabase Auth, never on the board.
    // { type: 'exists' }: the address owns another profile and nothing was sent; the player chooses, and signIn: true sends
    // the code that switches to it.
    async sendCode(email, { captchaToken, signIn = false } = {}) {
      const mail = cleanEmail(email);
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail)) throw fail('email');
      return write(async c => {
        const { data, error } = await c.auth.getSession();
        if (error) throw error;
        if (data.session && !signIn) {
          const up = await c.auth.updateUser({ email: mail });
          if (!up.error) return { type: 'email_change' };
          if (up.error.code !== 'email_exists') throw up.error;
          return { type: 'exists', guest: data.session.user?.is_anonymous ? data.session.user.id : null }; // the profile it would leave
        }
        if (captchaRequired && !captchaToken) throw fail('captcha');
        const { error: otpError } = await c.auth.signInWithOtp({ email: mail, options: { shouldCreateUser: false, captchaToken } });
        if (otpError) throw otpError;
        return { type: 'email' };
      });
    },
    // leave: the guest the player agreed to give up (sendCode's `guest`): once the code switches profiles it is deleted, as nobody
    // could reach it again without an address. Only that one, and only while it is still a guest.
    async verifyCode(email, code, type, { leave = null } = {}) {
      const mail = cleanEmail(email), token = String(code ?? '').replace(/\D/g, '');
      if (token.length !== 6 || !['email', 'email_change'].includes(type)) throw fail('code');
      let left = null;
      const out = await write(async c => {
        const before = type === 'email' && leave ? (await c.auth.getSession()).data?.session : null;
        const { data, error } = await c.auth.verifyOtp({ email: mail, token, type });
        if (error) throw error;
        // another tab may have switched this browser, or confirmed that guest meanwhile: the server's answer for its own token
        // decides (shortcut: checked just before the call, so a confirmation in the same instant still loses; a server-side
        // guest-only delete would close it)
        if (before?.access_token && before.user?.id === leave && data?.user?.id !== leave) try {
          const now = (await c.auth.getUser(before.access_token)).data?.user;
          if (now?.id === leave && now.is_anonymous) {
            const d = await c.functions.invoke('delete-player', { body: {}, headers: { Authorization: `Bearer ${before.access_token}` } });
            if (!d.error && d.data?.deleted) left = leave;
          }
        } catch { /* it stays as before: idle until purged */ }
        return { email: mail };
      });
      if (left) emit({ type: 'gone', userId: left }); // its statistics go with it, as in deleteProfile
      emit({ type: 'changed' }); // type 'email' may have switched this browser to another profile
      return out;
    },
  };
}
