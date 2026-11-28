# Native shell for the Mulassa Games app (draft for review)

Status: proposal, 15 Nov 2026, revised after an independent architecture review. Nothing here is built yet. Scope: the iOS/Android app only; mulassa.cat keeps its
current pages until the web gets its own approach.

## Goal
The app's launcher home and everything shared between games (sign-in, session, profile, settings) are native
(SwiftUI on iOS 17+, Jetpack Compose on Android; owner's decision 16 Nov 2026, `launcher-j1.md`). Each game stays a web page (the current Vite pages, updated
live by Capgo) shown in the Capacitor WebView. The look of the home is a game UI (design rounds in
`/Volumes/development/design/mulassa-games/app-home/`); this note is about ownership and the bridge.

## Ownership

| Concern | Owner in the app | Today (web) | Notes |
|---|---|---|---|
| Supabase session (anonymous + email OTP, refresh, sign-out, delete) | **native** (supabase-swift / supabase-kt) | `services/supabase-client.js`, `leaderboard.js`, `leaderboard-code.js` | the ONLY refresher of the refresh token (rotation: two refreshers revoke each other) |
| Turnstile for sign-in / OTP / feedback | native sheet hosting a small Turnstile page in a WebView | `services/captcha.js` | proven: Turnstile issues tokens on `app.mulassa.cat` (https and capacitor://) |
| Profile: nickname, badge, confirm email, delete | **native** screens | `ui/profile-ui.js`, `account-ui.js`, `badge-picker.js` | same RPCs: `my_profile_v2`, `update_alias`, `set_profile_badge`, `delete-player` |
| Settings: language, music, vibration (new toggle) | **native** | `ui-language-v1`, `menu-music` keys | games read them as today (below) |
| Feedback (Bústia) | native form + Worker | `feedback-ui.js` | Worker already accepts the app's origins |
| Launcher, list of games, what is new | **native**, from a games manifest shipped in the web bundle | `jocs/index.html` | a new game every Thursday must not need a store release |
| Boards, seasons, hearts, player cards, records, stats, practice, calibration | **web game** (unchanged) | many modules | game-specific; they only need an authenticated client |
| Live updates of the games | Capgo (as now), checked by native at quiet moments (home) | `update-watch.js` | the native shell itself only changes through store releases |

## Navigation (outline; contract 7 has the lifecycle)
- iOS: the SwiftUI launcher is the root; a game opens the existing `CAPBridgeViewController` full screen at the
  game's path (`/index.html`, `/pop/index.html`, `/jocs/<id>/index.html`); exit returns to the launcher.
- Android: the Compose launcher is the main activity; games run in the existing `BridgeActivity` (`MainActivity`)
  started with the path; back from a game's root returns to the launcher.
- Every web exit (`location.replace('/jocs/…')` today) becomes `Mulassa.exitToLauncher()` in the app.

## Contracts (revised after an architecture review)

### 1. Session adapter (web), the first thing to build
In supabase-js `accessToken` mode, `client.auth` is a Proxy that throws on ANY property (checked in
`node_modules/@supabase/supabase-js/src/SupabaseClient.ts`), so today's `c.auth.*` calls (10 in
`src/services/leaderboard.js`, 1 in `src/jocs/games/pop/ranking.js`, plus OTP, identity, stats, feedback) would
break even the board reads. So, before the app switches clients, every web caller goes through one small adapter:
`snapshot()` (userId, publicId, verified, generation), `token()`, `ensureSession(reason)`, `onAccount(event)`,
`signOut()`. On the web it wraps supabase-js auth as today; in the app it calls the native plugin and the client
is built with `accessToken: () => adapter.token()`. RPCs and edge functions stay in supabase-js.

### 2. One native session owner
One process-level owner (supabase-swift / supabase-kt), serialized refresh, atomic secure persistence (Keychain /
encrypted store); a refresh that finishes after a sign-out or account switch is discarded. `token()` returns `null`
only when there is no session, and an explicit «unavailable» error when a session exists but cannot refresh
(offline): a network failure never reads as «signed out» and never creates another anonymous user. A submission
after a long run asks for a fresh token.

### 3. Account events that cannot cross accounts
Events carry the Auth UUID and the profile public id, an account `generation`, the previous owner, and a distinct
`gone` (deleted) type, which `stats-sync.js` needs to drop the old owner's stats. Pop binds a pending run to the
owner it was played by and refuses to send it if the generation changed; the server keeps its owner checks.
Deletion invalidations are persisted until a page consumes them.

### 4. Settings snapshot, not two-way storage sync
Native owns language, music and vibration; writes from a game go through the plugin (`setMusic`). Before every
document loads, native injects a versioned, non-secret snapshot (language, music, vibration, identity cache) as
localStorage values, restricted to the main frame on `app.mulassa.cat`, replacing the previous script; where
document-start injection is unavailable on Android, the page asks `Mulassa.bootstrap()` before boot. `?lang=` keeps
its precedence; a language change waits for the end of a run before reloading.

Built (27 Nov 2026), with its shortcuts: `GameHost.swift tellShell` and `GameSession.kt LauncherShell` write
`ui-language-v1` and `menu-music` and set `window.__mulassaShell = { covers, sound, vibration }` (Android's also carries
`language` and `music`). `packages/plassa/src/native.js` reads it: `appCovers()` hides every `data-app="<what>"` element
the launcher covers (and sets `<html data-covers>` for layout), `appOff()` gates the UI sound and vibration, `askAccount()`
hands account sheets to native once `account` is covered. Shortcuts: no version field yet; iOS adds one more script per
settings change instead of replacing it (WKUserContentController only removes all, Capacitor's too; the last one wins) and
checks the host inside the script; Android's `Mulassa.bootstrap()` is asked during boot, not before it, so a changed
language or music saves and reloads the page once. Games never write back (no `setMusic` yet): the game rows are hidden.
The way out of a game in the app is a home button held 0.8 s (`packages/plassa/src/home-hold.js`).

### 5. Update readiness and navigation in the same first step
Today `notifyAppReady()` runs on module import and `applyLiveUpdate` relies on a return path. With a native
launcher: one web boot/health entry point acknowledges the bundle after the bridge contract initialises; update
activation (`set()`) is serialized against opening a game; the native splash and web-bundle readiness are separate;
the old root redirect and return-path code go away together with this change.

### 6. Versioned games catalogue
`catalogue.json` in the web bundle: schema version, minimum bridge version, stable game ids, localized names,
bundled art, validated local entry paths, release date. Native reads the ACTIVE Capgo bundle's catalogue (bundled
fallback offline; restored on rollback) and rejects an update whose catalogue needs a newer bridge before
`set()`. A new game is data, never a native switch.

### 7. Game lifecycle
Explicit `suspend` / `resume` / `exit` events to the game (an in-app native sheet does not trigger today's
app-inactive signals), results from native sheets (completed / cancelled), retained-controller ownership on iOS,
intent path + back behaviour + process-death recovery on Android (`MainActivity` today only registers `Power`).
The `Mulassa` plugin is registered on the game's bridge. A warm bridge saves startup, not a game's JS state.

### 8. Captcha and OTP, end to end
A native sheet hosting a dedicated HTTPS Turnstile page (Cloudflare's documented WebView approach); single-use
tokens with expiry and cancel. Keep today's flows exactly: anonymous → email link (`email_change`), «this address
already has a profile» confirmation, `shouldCreateUser: false`, cleanup of an abandoned guest (`delete-player`).
App Attest / Play Integrity are not a drop-in for Supabase's CAPTCHA (backend work); not now.

### 9. Migration of test installs
A migration-only page that never starts web auth reads `mulassa-leaderboard-session` once; native persists it
durably, marks completion, and only then removes the web key. Same scheme/host/data store. Language and music are
migrated before native defaults are written. A rollback floor: no Capgo rollback to a bundle without the adapter.

### Also required
- Feedback: a confirmed (non-anonymous) user, a fresh bearer token, a captcha token and today's payload fields.
- Account deletion in the app (Apple requires it) and the privacy texts, also when publishing is disabled.
- Records on the launcher: `reportBest` with an initial backfill from each game's stored best, per account.
- Diagnostics: native and web errors tagged with native version, bridge version and Capgo build; keep Sentry's
  current redaction.
- App Review: weekly new web games delivered by live update must be checked against App Review guidelines 2.5.2
  and 4.7 (mini-games) before the public release.

## Phases (revised)
1. Contracts: session adapter on the web (still backed by supabase-js auth, no behaviour change), versioned
   bootstrap/events, catalogue schema.
2. Native launcher shell + bridge lifecycle + plugin registration + update activation/rollback/readiness, proven
   together on both platforms.
3. Native auth as one usable slice: session owner, Turnstile sheet, OTP, migration, account deletion; the app
   switches the web client to `accessToken` mode.
4. Native settings and feedback; the app stops mounting the shared web sheets.
5. Catalogue-driven weekly releases, record backfill, and the chosen home design.

## Open questions for the owner
- Sign-in methods beyond email code: Sign in with Apple / Google? (Apple requires Sign in with Apple if another
  third-party sign-in is offered; email-only is allowed.)
- Captcha in the app: keep Turnstile (a small web sheet) or move to App Attest / Play Integrity later.
- Does the launcher need to work offline (cached manifest and art)? Proposed: yes, from the bundled web assets.
- Vibration toggle: new setting (games' `haptic()` reads it).
