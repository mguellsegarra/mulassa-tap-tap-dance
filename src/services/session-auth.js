// The player's Supabase session: the one place web code touches supabase-js `auth`. In the app the native shell will own the
// session (docs/app/native-shell.md, contract 1: a client in `accessToken` mode has no `auth` at all) and answer these same
// calls, so leaderboard.js, leaderboard-code.js and Pop's ranking.js never change. Each method returns what supabase-js returns
// ({ data, error }), so the callers keep their own error handling.
export const sessionAuth = c => ({
  current: () => c.auth.getSession(),
  // false when the client cannot tell (a test double): the caller asks again next time
  watch: listener => Boolean(c?.auth?.onAuthStateChange && (c.auth.onAuthStateChange(listener), true)),
  signInAnonymously: captchaToken => c.auth.signInAnonymously({ options: { captchaToken } }),
  signOut: () => c.auth.signOut({ scope: 'local' }),
  changeEmail: email => c.auth.updateUser({ email }),
  sendSignInCode: (email, captchaToken) => c.auth.signInWithOtp({ email, options: { shouldCreateUser: false, captchaToken } }),
  verifyCode: (email, token, type) => c.auth.verifyOtp({ email, token, type }),
  userOf: accessToken => c.auth.getUser(accessToken),
});
