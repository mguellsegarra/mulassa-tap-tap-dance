# AGENTS.md — Mulassa Tap Tap Dance

A Taiko-style rhythm game (Vite + three.js, no framework) about the Mulassa de Valls (Fira de Santa Úrsula).
Agent docs are in English; **all UI copy is Catalan** (see UI conventions).

## T3 conversations: no automatic messages between agents

Marc has explicitly disabled unsolicited cross-thread coordination to prevent dormant
or settled chats from waking up and consuming tokens. This supersedes earlier task
briefs or skill defaults asking agents to coordinate by messaging each other.

- Do not send messages to other threads or agents, including the orchestrator, to
  request status, reserve files, ask for a turn, acknowledge receipt, or report completion.
  Do not relay this instruction to others by sending more messages.
- Use read-only thread reads/listings and local diffs for context. Do not poll other
  threads repeatedly. If concurrent edits genuinely block your work, tell Marc in your
  own conversation and wait instead of contacting or waking another agent.
- If another agent sends an unsolicited coordination message, do not reply through
  a messaging tool or start further coordination. Continue only your authorized task.
- Do not create further chats or delegate work unless Marc explicitly requests it.
  A request to create a new chat does not authorize that chat to contact other agents.
- Only a new explicit instruction from Marc authorizes an exception. An old task
  brief or another agent's request is not authorization. Finish in your own thread;
  any host-generated completion notification needs no additional message.

## Implementation quality from the first change

Apply these rules during each coding iteration, before writing new behavior. Do not
plan to grow a monolith now and modularize it in a later cleanup pass.

- Read the relevant existing modules and search for reusable rules, components and
  adapters. Identify the owner of the new behavior, its state and dependency direction.
  A small change needs a quick check, not a separate architecture document.
- Put each new responsibility directly in its owning module (see Structure). Keep
  `main.js` as the composition root. Extract cohesive responsibilities when needed;
  keep small tightly coupled helpers local. Avoid catch-all utilities, pass-through
  wrappers, speculative abstractions and files split merely to satisfy a line count.
- Reuse a stable shared contract rather than copying an existing implementation.
  Preserve intentional differences. Keep state ownership and initialization explicit;
  do not add cycles, hidden side effects or parallel copies of state.
- Check dynamic uses, CSS/DOM hooks, generated entrypoints and the concatenating test
  harness before removing code. Import searches alone cannot establish that code is dead.
- Keep error handling and resource cleanup at their actual owner. Do not add arbitrary
  waits, silent catches, retries or test-only production hooks to hide an unexplained failure.
- Validate the affected behavior and existing module constraints. Prove meaningful
  regression tests fail for the intended reason when feasible. Remove task-added
  workarounds for abandoned approaches; preserve unrelated work.

Use these Mulassa-only skills selectively. Read the entrypoint when its task applies;
do not load or execute every audit on every edit. Paths are relative to this checkout.
The canonical copies live in `.agents/skills/`; `.claude/skills/mulassa-*` contains
relative links to those same folders. `CLAUDE.md` imports this file. Codex and the
Codex desktop app use the repository skill location; T3 agents can load these exact
paths from this table even when a host skill picker has not refreshed. Prefer the
`mulassa-*` guides for this project; keep shared global skills unchanged.
Existing worktrees need these files in their own checkout; do not assume uncommitted
instructions have propagated through Git or copy them into unrelated projects.

| When | Skill entrypoint |
| --- | --- |
| Before adding responsibilities; scoped cleanup, duplication or module structure | `.agents/skills/mulassa-code-simplifier/SKILL.md` |
| Final confidence review when requested or warranted by the change | `.agents/skills/mulassa-finalize/SKILL.md` |
| Designing or repairing meaningful tests | `.agents/skills/mulassa-test-audit/SKILL.md` |
| Frame, audio-clock, loading or render-cost investigation | `.agents/skills/mulassa-web-performance-diagnosis/SKILL.md` |
| UI changes affecting interaction, focus, layout or loading states | `.agents/skills/mulassa-ui-state-regression/SKILL.md` |
| New-version preparation, compatibility or migration review | `.agents/skills/mulassa-release-compatibility/SKILL.md` |
| Changes to trust boundaries, RPC/Auth, quotas or private diagnostics | `.agents/skills/mulassa-security-boundary-review/SKILL.md` |
| Runtime incidents, async races, WebGL recovery or Sentry diagnosis | `.agents/skills/mulassa-runtime-incident-diagnosis/SKILL.md` |
| Backup changes or an explicitly requested restore/scheduler rehearsal | `.agents/skills/mulassa-backup-restore-verification/SKILL.md` |
| Reference-video choreography analysis and synchronized video/3D/overhead research | `.agents/skills/bestiari-reference-analysis/SKILL.md` |

These guides do not authorize delegation, production access, publication or Git history
operations. Preserve the existing confirmation and no-messaging rules. Historical thread
results are examples, not proof about today's checkout, device or deployed release.
For documentation-only changes, validate the changed documents and references; game tests,
benchmarks and device sessions are unnecessary unless the task also changes runtime behavior.

## Structure

`src/main.js` is only the composition root (imports in start order, the keyboard/pointer wiring's glue, the frame loop);
every system lives in its own module, and `tests/modules.mjs` keeps it that way (no import cycles, main.js ≤ 400 lines,
every other module ≤ 600). Modules with page-level state (`let`s other modules read) export a `setX()` for the ones they
let others change; the sheets (board, share, profile, Perfil `account`, seasons, season end, card, feedback, nudge, sync) are built in `ui/sheets-setup.js` and read
by everyone below it as `sheets.board`… (`ui/sheets.js`), so no import cycle is needed.

- `index.html` — the DOM: touch pad (GUA | PA), ⚙ `#settings` → "Configuració" sheet, "Com es juga" pill + sheet, "Ajusta la
  sincronia" sheet, pause/confirm sheet, SALTA, the device tips (`#gpu-hint-menu`, `#ios-hint-menu`). Its CSS is in `src/styles/*.css` (`base.css`,
  `share.css`, `feedback.css`, `select.css`, `profile.css`, linked in order) except the fonts and the `#loader` rules, which stay inline: they paint before any file.
- `src/main.js` — imports the systems in start order, the keyboard/pointer glue that needs several of them, `frame()`,
  `window.__dbg` for tests.
- `src/core/` — `flags.js` (the ONE reader of the URL's debug flags: `Q` is empty on any non-dev host, so no `?param` works on mulassa.cat/pages.dev; `?repte` is a real feature and reads its own search in share.js; never touch `location.search` elsewhere), `env.js` (flag constants, beat grid, judge window in use, sync offset), `timing.js` (frame pacer, lane clock), `anim.js` (easing).
- `src/game/` — the rules, no drawing: `state.js` (`G` and who owns each field, `chip`, `clock`, the song clock, held keys),
  `flow.js` (splash → select → run/practice → finish → final), `judge.js` (hits, GUAPA pairs, holds, balloons, collapse, autoplay/advance),
  and the pure logic: `chart.js` (`makeDanceChart`, `DIFFS`, `BALLOONS`), `progress.js` (quality %, stars, `WINDOWS`), `energy.js`
  ("l'ànim de la plaça"), `practice.js` (first-game `STEPS`), `calibration.js`, `dance.js` (the old beat choreography and the dance factories), `mula-*.js` (the Mulassa's reference-led dance, below),
  `bubble-rules.js` (when the crowd may talk), `figure-catalog.json` (names, towns, entities and primary sources), `figures.js` (playable/Aviat registry, portraits, per-figure level memory and record keys), `records.js` (the device's record per level and version, the previous dance's read-only), `stats.js` (the device's statistics, per owner: counters per `figure/version/level` bucket, practice, days played; pure). Catalog thumbnails use native pixel cells and palettes in `figure-portraits.js`, rendered through the original `pixelSvg` component.
- `src/scene/` — the 3D world: `stage.js` (renderer, scene, lights, plaza, mulassa, the play camera's direction), `quality.js`
  (a render-quality level applied), `crowd-build.js` (who stands where), `crowd.js` (`animCrowd` = `updateMood` →
  `steer` → `separate` → `pose` → `poseScenery`; the mood is the `mood` object), `mula-motion.js` (springs on top of the choreography),
  `cameras.js`, `confetti.js`, `fx.js` (finale lights, fireworks), `share-capture.js` (`renderHero`), `balloon3d.js` (the GLOBUS
  balloon in 3D), `models.js` → `models/*.js` (voxel models by subject), `framing.js`, `orbit.js` (pure camera helpers), `crowd-fx.js` (the ripple), `representation.js` (+ `representation/`: the public's, musicians' and attendants' looks drawn over the crowd's rigs; approved weights in `population.js`; `?representation=off` = the original cast).
- `src/hud/` — everything drawn on the 2D canvas: `canvas.js` (size, K, safe areas, resize), `sprites.js` (palette + text sprite cache),
  `primitives.js`, `layout.js`, `lane.js`, `top.js`, `praise.js`, `bubbles.js`, `banner.js`, `title.js`, `results.js`, `warm.js`, `balloon.js`,
  `draw.js` (`drawHud`), plus `stars.js`, `title-layout.js`, `share-card.js`.
- `src/ui/` — DOM: `handles.js`, `sheets-setup.js`, `input.js`, `controls.js`, `pause.js`, `pause-actions.js`, `pad.js`, `focus.js`,
  `backdrop.js`, `fullscreen.js`; the sheets `board-ui.js`, `profile-ui.js`, `share-ui.js`, `feedback-ui.js` (+ the nudge), `sync-sheet.js`,
  `account-ui.js` (Perfil: profile block, statistics, podiums, previous record, the statistics notice), `stats-view.js` (the statistics' tiles, private or public), `seasons-ui.js` (season calendar and words, the Saló de la fama, the end-of-season sheet, the per-owner get_seasons cache), `board-list.js` (the Classificació sheet's list and `savedName`/`refreshIdentity`), `figure-picker.js` (the figure dropdown shared by Classificació and the Saló de la fama), `player-card.js` (a player's public card), `greeting.js` (what the idle selector tells a profile), `device-hint.js` (the device tips: hardware acceleration, iPhone home screen),
  `loader.js`, `select-ui.js` (main selector, town pills, records and inline pending information), `level-stats.js` (step 2's level row), `pending-gifts.js` (the fold card's four icons), `free-music.js` (photo mode's radio); helpers `sheet-kit.js` (status line, busy button), `sheet-fade.js`.
- `src/services/` — talking to the outside: `leaderboard.js` (+ `leaderboard-rules.js`, `leaderboard-result.js`, `alias-rules.js`),
  `stats-sync.js` (uploads the device's statistics to the open profile), `feedback.js` (client of the `workers/feedback` Cloudflare Worker, `VITE_FEEDBACK_URL`; the Worker checks Turnstile and e-mails each
  message to the `FEEDBACK_TO` secret, nothing stored, never put a personal address in the repo), `captcha.js` (Turnstile), `share.js`,
  `errors.js` + `sentry-load.js`.
- `src/platform/` — `audio.js` (`Chip`: song + menu loop + SFX; `Clicker`), `render-quality.js` (adaptive DPR/quality, frame pacer),
  `storage.js` (the one localStorage adapter), `polyfills.js`.
- `tools/dev/` — the dev-only HTML pages (`editor.html`, `drac-compare.html`, `colla-preview.html`, `mulassa-compare.html`, `mulassa-contrast.html`), served by `npm run dev` at `/tools/dev/…`, never built (`vite build` reads `index.html` only).
- `src/dev/` — `mock-leaderboard.js` + `demo-data.js` (the in-memory leaderboard behind `?mock`/`?final`: the real service over a fake client and a seeded world), `account-review.js` (`?final&review=`), `cam-edit.js` (`?cam`), `perf.js` (`?perf`), `fps.js`, `debug.js`, `final-test.js` (`?final`).
- `src/song.json` — **generated** (never hand-edit): bpm, beats, sections, finale, end, notes
  `[t, don|ka, level, big, holdEnd]`, hashed audio URLs.
- `tools/build_drac.py` — the Drac's generator (form `music/drac-form.json`, Festiva arrangement, tempo map fitted to the
  reference video, `song-drac.json` with its `ref` time map); `docs/drac-music.md`. Mulassa audio must stay bit-identical.
- `tools/build_taiko.py` — the **single** generator of all music and the chart, from `music/score.json`
  (the melody). Writes `public/music/mulassa-taiko.{wav,mp3,mid}`, `mulassa-taiko-ambient.mp3`
  (the `.mid` scores are versioned, not deployed; the `.wav` stays ignored), `music/taiko-arrangement.json` and `src/song.json`. Musical/game rules: `music/README.md` (Catalan).
- `check.mjs` (chart invariants) + `tests/*.mjs` (node, no browser): `modules.mjs` the shape of `src/`; `render-quality.mjs` runs the
  game's systems together in a mocked DOM (`nodes.get(id)`, `run(code)`) for HUD/sheet/game contracts — `tests/load-main.mjs`
  concatenates `main.js` and every module it reaches (except the ones the context provides) into ONE script, so the snippets can read
  and assign the systems' top-level names; a module you add is picked up by itself, but keep its imports on one line and its
  top-level names unique; `page.mjs` reads `index.html` with the linked CSS put back inline; `onboarding.mjs` practice + sync;
  `energy.mjs` ànim tuning; `bubbles.mjs` crowd bubbles; `audio.mjs` loading/wake.

## Commands

- `npm run dev` — Vite on port 5178 with `--host` (phones on the LAN).
- `npm run check` — every test. Must be green before handing back code changes; for documentation-only work, validate the affected documents and references.
- Regenerate music + chart (only when the task is about music/chart):
  `uv run --python 3.11 --with numpy --with scipy --with soundfile --with mido tools/build_taiko.py`
- Never hardcode the BPM (it has changed before): both songs change tempo phrase by phrase, so read the local grid (`song.beats`, `beatAtTime`/`timeAtBeat`); `song.bpm` is only the opening tempo.
- Audio must stay **bit-identical** unless the task is about music: compare `shasum public/music/*` before/after.

## Testing in a browser

- **Always load the game with `?mute`** in any browser, headless or simulator. Close tabs when done.
- Headless Playwright (Chromium, `--use-angle=swiftshader`) and the iOS Simulator are fine for screenshots.
- Check mobile first (375×667 and iPhone 16, 393×852) and desktop (e.g. 1280×800). Landscape phones only for the game itself (play, practice, results): they get the rotate cover everywhere else, so never QA menus, sheets or the selector at landscape phone sizes (Marc, 2026-10-22).
- URL params: `?mute` (silent), `?autoplay` (plays itself), `?from=N` (start at N s), `?view=side|front|back|top`
  (fixed camera, no HUD), `?still` (mulassa doesn't dance on the title), `?offset=ms` (sync offset).
- `?cam` (with `?autoplay&from=N`, or a practice): the camera editor over the game (`src/dev/cam-edit.js`). Drag orbits, wheel/pinch = distance, shift- or right-drag (two fingers) = where she stands on the screen, shift+wheel or the buttons = fov; an overlay shows az/el/dist/fov/her screen y next to the automatic camera's, and «copia» copies one JSON line (viewport, K, stage, values, auto) to fit the per-device camera from. The auto camera keeps running underneath («auto» goes back to it).
- Local previews without `VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY` (`.env.example`) automatically use the existing in-memory leaderboard and show "MODE PROVA"; `?mock` explicitly selects it on dev hosts. Public hosts never use this fallback. It does not skip the splash or fabricate a completed run. Its demo world comes from the URL (`demoOptions`, header of `src/dev/final-test.js`; data in `demo-data.js`, answers in `mock-leaderboard.js`): `&account=new|reserved|guest|verified-unnamed|verified` (who is signed in; the guest is `Prova123#4821`), `&seasons=launch|later` («Estrena 2026» + open Tardor; or Tardor closed with two Mulassa boards and open Hivern 2027, which shows the end-of-season sheet), `&board=empty|me` and `&drac=empty` (empty open seasons; a 119-player ladder with the profile at #48), `&card=Nom[#1234]` (opens that player's card at the first idle selector), `&taken`, `&fail`; `?final&review=<state>` reaches the profile, e-mail and ranking flows by pressing the real sheets' buttons (`&review` alone lists them). The mock service emits `onAccount` events (it wraps `createLeaderboardService`); only the SDK's `onAuthStateChange` is absent in its client.
- `?stars=0-3`: opens straight on the results card with a fake run of that many stars (never a record, never stored); the star animation replays on each load.
- `?perf`: every 3 s logs `[perf]` averages (fps, the display rate `hz` and `half` (pacer ÷2), `late` frames (missed
  their turn: a visible lane hitch), rAF frame ms + worst, JS ms split into `3d` render and `hud` draw,
  draw calls, triangles, WebGL/HUD Mpx, quality) to the console, `window.__perf` and a line at the top of the screen
  (tablets have no console). `?perf=sync` waits for the GPU after the 3D (real 3D cost); `?perf=nohud` / `?perf=no3d`
  skip one part to A/B frame times. Tablet benchmark: Playwright 1366×1024 @ DPR 2, `isMobile`, CDP
  `Emulation.setCPUThrottlingRate` 4, `?mute&perf&autoplay&from=40`, then `__dbg.choose(1)`.
  `?perf` also logs the load stages: `[load] module|shaders|first frame|song decoded <ms since navigation>`.
- The first game ever is the practice; SALTA or `__dbg.startPractice/endPractice` to control it.

## Public pages, SEO and agents

- `/projecte/` (and the Markdown twins `/projecte/index.md`, `/index.md`) are written into `dist/` by `tools/seo-pages.mjs` from ONE
  content object (`PAGES`): edit the text there, never the output. `npm run build:pages` runs it after `vite build`.
  Plain files in `public/`: `robots.txt`, `sitemap.xml`, `llms.txt` (list a new public page in the sitemap and llms.txt), `captures/`
  (screenshots), `videos/` (1080p promo MP4s, each < 25 MB: the Pages file limit; the originals are not in the repo).
- `tools/prepare-pages.mjs` allowlists every public file; a new kind of file needs a line there. `public/_headers` sets the `charset` of the `.md`/`llms.txt`.
- The game's own page carries only an `sr-only` H1/summary, JSON-LD and `rel="alternate"` for crawlers: no visible SEO text in the game. Copy is Catalan,
  always «Marc Güell Segarra» (both surnames), and no jargon (no engine or genre names). `tests/seo.mjs` checks the output.

## Gameplay and chart rules

- Every tap is a melody note. Exceptions: the final hit, and on DIFÍCIL the part-A backbeat PAs where the tune rests.
- **GUA** = left = orange `#FF7A1A` = `don`. **PA** = right = turquoise `#14B8A6` = `ka`. Never swap them.
- **GUAPA!** = both buttons on every level, within 80 ms (FÀCIL: 150 ms); one button alone = ERROR «ELS DOS ALHORA!»; half orange / half turquoise disc, double points.
- **MANTÉN** holds: NORMAL and DIFÍCIL only (the long part-A notes), judged at head and tail.
- Judge windows (`WINDOWS`, progress.js), ± PERFECTE / BÉ / earliest ERROR: FÀCIL 60 / 140 / 180 ms, NORMAL 45 / 110 / 150,
  DIFÍCIL 35 / 90 / 125; the practice uses FÀCIL's. They assume the de-stepped song clock (below); no «expert» level.
- **One song clock** (`audioClock`, audio.js) for drawing, judging and the sync calibration: `ctx.currentTime` de-stepped
  against `performance.now()`, read at the frame's rAF time (lane) or the input event's `timeStamp` (`press`, `letGo`,
  calibration taps); latency latched per run. The lane is drawn through `smoothClock` on top of it (`viewClock`, main.js):
  identical while the audio runs evenly, it eases in the audio device's own few-ms jumps (a 4 px pop of every note
  otherwise); judging keeps the audio clock. `?rawclock` = the old stepped clock (A/B). Never judge or draw on a raw
  `currentTime` read (scheduling sounds on it is fine).
- **GLOBUS** balloons on the drumrolls: every tap on either side counts.
- **FINAL ESBOJARRAT** starts at the last coda phrase (`song.finale`): the festa (fireworks, lights, chant) for everyone; double points and the «x2 PUNTS» tag only while ENCERTS ≥ 70% (`G.finale` / `G.doublePoints`).
- Density targets (notes per 7 s): FÀCIL 6–7 flat; NORMAL 8 → 12; DIFÍCIL 13–15 → 20–25, ~30 only in the finale.
  Harder charts contain the easier ones (`check.mjs` enforces this and much more).
- **Record** = most comparable points per level, device (`beatsRecord`; keys per version: the Mulassa's `record-points-mulassa-v3-<level>`, the Drac's `record-drac-valls-<level>`; the previous dance's keys are only read, as «Rècord del ball anterior» in Perfil, and never compared) and
  server (`submit_result`), as the board ranks; the % only breaks ties. Points: thousands dots, `C.score` lilac (points only). `?repte` stays on %.
- **Ànim de la plaça** (energy/health): starts full, misses drain it, hits refill; empty = the mulassa collapses.
  Tuning lives in `src/game/energy.js` (misses from full to empty: FÀCIL 13, NORMAL 10, DIFÍCIL 8). The practice never drains.
- In-game top HUD (`drawTop`): one row, the pixel mulassa (`mulaPortrait`: leans back and throbs below 35%, hops on a refill) + the ÀNIM bar (health) + the ENCERTS %
  number, no caption (the quality: perfect = 1, good = 0.8; "—" until a note is judged); the 70% goal is only on the results screen.
  Song progress: a ring round the pause button (`drawProgressRing`, hud/top.js; `PROG_T0`/`PROG_T1` bound it, first note → `song.end` on `songTime()`); the «x2 PUNTS» tag sits on the panel's top edge.
- Lane (`lane()`): the band scales with the screen (1.4x phones, up to 2x big desktops); notes scale only as far as the
  chart's closest two notes keep half a diameter clear with >= 0.9 s look-ahead (`NOTE_GAP`, `MIN_LOOK`). Nothing
  is drawn inside the ring but hit words. The streak is the «RATXA» badge (`drawStreak`, `streakBox`, knobs in `STREAK`), from
  5 in a row: inside the band just behind the ring (where notes have passed) when there is room, else (portrait phones)
  above-left of the ring, left of the top panel; clear of the ring at its biggest, a missed GUAPA's reach, the judge word,
  the panel, the progress bar and #pause (tested at its biggest pop). Tiers cream 5 → gold 10 → orange 25 → pink 50 →
  white on a colour-cycling rim 100; each hit pops it a little, milestones (10, 25, 50, 75, then every 50 from 100) pop it
  more with a glow; from 50 it breathes on the beat; a miss sinks and fades it. Only scale and colour move; reduced motion
  = colour only; digits are cached per digit and tier, warmed ahead (`streakWarmups`). Not in the practice. Results say "RATXA". Big celebration words (the post-song
  chant, the practice's combo praise and «A BALLAR!») sit centred between the lane and the pad on portrait phones and
  tablets (`PRAISE_Y`, a bit low on phones: her head is mid-stage); compact practice words, and big ones on landscape
  screens, dodge a GLOBUS hanging under the ring (`dodgeBalloon`). The play camera stays inside the plaça (`insidePlaza`).

## UI conventions

- The desktop selector footer is an explicit exception: pending figures show a native disabled "Pròximament?" button in the reserved difficulty-action slot, with a transparent background and a neutral border and no invitation animation. Touch still hides it.
- Hide disabled action buttons instead of showing a dimmed unavailable action. Preserve their layout space when removing it would shift nearby controls. Exception: the paired carousel arrows remain visible but dimmed and natively disabled at either end; hide the whole capsule only when navigation is unnecessary.
- **Balanced layout (every card, sheet and screen).** Use the space the container already has and share its free space between rows: no dead band under the last row, no group crammed while another gap is wide, outer margins about equal top and bottom. Judge what you see (text, art, filled buttons), not boxes: a 44 px link around 15 px of text, a portrait slot around its art or a reserved two-line title slot carry their own slack, so compensate for it. Equal spacing is the default, not a dogma: keep the hierarchy, keep icons/art/text at their intrinsic size (never stretch them to fill) and give the free space to flexible gaps (`space-between`/`space-evenly`, `auto`/`fr` tracks, auto margins). Items sharing a row get equal space before, between and after them, and no column narrower than its words (no truncation, no overlap). When room runs out, gaps shrink first, then optional art, never copy, actions or 44 px targets, and no new internal scroll. QA: measure row bounds and gaps and look at captures at 320×568, 375×667, 393×852, 768×1024, 1280×800, a wide-short and a large desktop (no landscape phone sizes: phones in landscape show the rotate cover, not the UI), plus a resize sweep across the breakpoints and the longest copy; compare with HEAD. Process: `~/.agents/skills/balanced-layout-qa/SKILL.md`.

- All copy in Catalan, no English ("Practice", "OK", "Settings"…). Watch false friends and apostrophes (’).
- Tap verbs: «Toca» for the touch screen, «Prem» for keys, «Pica» only for GLOBUS mashing; split by device (`.touch`/`.keys`,
  `COARSE`) or use a neutral verb («Marca»). Links in running text (mailtos): cream `#fff3d6`, underlined (never GUA orange).
- Desktop selector navigation uses one 120×44 px brown capsule with a gold outline and cream arrows, centred above the strip, without a counter. It stays hidden until the opening layout has been measured. Its halves stay in place at the ends. With a fine pointer, the cards and navigation keep a fixed vertical position across playable and pending selections, reserving the primary action row; touch keeps swipe navigation and its existing dock movement.
- **Colour roles** (one job each): solid gold `#f5c518` = the one primary action of a view; gold outline = every other button,
  round icon buttons and the sheets' frame; solid cream `#fff3d6` with dark text = what is selected (town pills, level and
  view segments; a cream ring on the selected card), unselected choices get a neutral `#e8d8b880` edge; information chips on a card (a pending figure's entity) are dark with cream text, never a cream fill; the one exception is the entity chip (pending card and the playable info block share the same pastel holo pill with dark text, `.sel-entity` in select.css; Marc, 2026-10-21); gold as text only for
  brand and celebration (titles, GUAPA); GUA orange / PA turquoise only for the two drums and what literally means left/right;
  errors `#ff8a7a`. Round icon buttons: 44 or 56 px, 2 px gold edge, dark fill, cream glyph (`.sheet-x` too); #pause stays
  bigger on purpose (a game control). Every target is >= 44 px (`.btn-link` gets an invisible slop).
- The difficulty buttons carry one colour per level, a deliberate exception to the colour roles: a warm glow from their bottom edge (gold, orange, red) and, on the chosen one, a turning ring over its own edge (green and lime FÀCIL, gold and amber NORMAL, red and lilac DIFÍCIL; Marc, 2026-10-20). Selected stays cream.
- The level words carry the same per-level colour, another approved exception (Marc, 2026-10-21): wherever FÀCIL / NORMAL / DIFÍCIL is written as text on a dark ground (the desktop medals' labels, step 2's level row, the publish prompt's run line, the Saló de la fama's levels) the word is painted `--lvl0/1/2` (`.lvt0/1/2`, base.css; the board pills' fill `.lvl0/1/2` uses the same properties; the share image repeats the hexes). Never on cream (selected keeps dark text); the difficulty buttons keep their own glow design.
- The fold's «Aviat a la plaça» card shows four drawn things to send (Fotos, Vídeos, Partitures, El ball; `src/ui/pending-gifts.js`), each in its own pastel gradient: a deliberate exception to the colour roles, used nowhere else.
- The Saló de la fama's estendard (`seasons-ui.js`: a red cloth with the figure's silhouette, hung from a gold rod) and its season name in gold are an approved decorative exception to the colour roles (Marc, 2026-10-21), used nowhere else.
- **Buttons: use the `.btn` component** (in `index.html`), never one-off button styles:
  `.btn` + `.btn-primary` (filled gold, one per sheet) / `.btn-secondary` (outlined) / `.btn-link` (plain underlined
  text, minor actions; `.btn-small` for tiny ones). Optional `<svg>` icon goes first: fixed 22 px slot on the left,
  vertically centred. **Icon left, text centred**: padding reserves the slot on both sides. Optional subtitle:
  `<span class="sub">`. Stack them in `.sheet-actions`. Min height 48 px (44 on landscape phones).
  `.btn-compact` (with `.btn-link`): a quiet icon + label text link, no outline, clearly lesser than the sheet's buttons
  but still a 44 px target (padding) (the share sheet's WhatsApp · X · Altres); never for a sheet's main action.
- Language in addresses (Marc, 2026-10-22: «no vull &lang=en a les urls de prod»): the choice lives in `localStorage` (`ui-language-v1`); switching never puts `?lang=` in the address, the challenge link (`challengeUrl`) and the Play button of `/<codi>/projecte/` (`/`) never carry it. `stripChallenge()` keeps a `lang` already in a visitor's URL, and the resolver still accepts a manual `?lang=xx` for that visit (tests, `?lang=pseudo` on dev hosts).
- Share sheet: the primary shares **the image alone** (`navigator.share({ files })`, no title/text/url: with them iOS
  hides «Desa la imatge» and targets swap or mangle it) or saves it; the caption + challenge link go only through the
  quiet «O envia el missatge:» row (WhatsApp · X · Altres/Copia).
- Only real buttons look like buttons (outline + rounded). Tips, notes and labels are **flat with a coloured strip**
  on the left, no outline (`tipChip()` on canvas, `.sync-how`, practice instruction).
- Canvas buttons (`drawButton`, results button) follow the same look: dark fill, gold outline, centred text.
- Focus rings only for keyboard (`:focus-visible`; sheets focus themselves when opened by touch/mouse).
- One headline word at a time (`headline()` priority system).
- Crowd bubbles appear only in musical rests (`src/game/bubble-rules.js`): previous event/tail ended ≥ 0.4 s ago,
  next note ≥ 2.2 s away, no active hold/balloon/GUAPA pair. Every difficulty permits one bubble / 8 s, lasting
  2 s; clear it with < 0.2 s until the next note. Hushed while struggling, practising, paused or before the first note.
  Misses react through the mulassa's animation (the crowd only settles); energy warning thresholds pulse the meter. Collapse has its own delayed caption.
  `placeBubble()` keeps speech inside the safe stage shared with the camera (`playStage()`).
- During the song, judgements use compact fixed PERFECTE / BÉ / ERROR text. Only actionable details remain.
  Practice transition praise shares the compact judge slot, with instructions above the pad; never reserve
  a large headline region for its camera. Large headlines belong to the post-song celebration (and the practice's combo praise and «A BALLAR!»); combo/miss/special
  events keep their sound and visual effects without extra headlines. Normal play reserves only compact feedback space.
- Layout: HUD at the top, note lane right under it, the mulassa big in the middle, pad = full-width GUA | PA halves
  at the bottom. Nothing overlaps the lane or the HUD.
- Respect safe areas (notch, home indicator: `env(safe-area-inset-*)`, `SAFE`), iOS standalone full height (`--app-h`).
  The home-screen app has an opaque status bar (`apple-mobile-web-app-status-bar-style` = `black`; Marc, 2026-10-21): the translucent one gets iOS's own blur over the top ~85 pt
  of the page (no CSS turns it off), so the page starts below the bar (no top inset, `innerHeight` is the visible height; `appHeight()` only overrides it for an old translucent icon). Nothing paints over the safe areas.
- No emoji-dependent icons: draw them (SVG / canvas). `color-scheme: light only`.
- **Loading = the animated Mulassa (running portadors, scrolling ground)** (`src/ui/loader.js`, CSS next to `#loader` in index.html). `#loader.page` is plain
  HTML/CSS that paints before the bundle ("Avisant a la brigada…"), released after readiness (`loader.ready()`) and the complete loading lines below,
  with a 20 s safety timeout (visible time: slow phones in Low Power Mode needed more than 12); later waits use `loader.wait(text)` → `loader.done(handle)`: a flat card (gold strip),
  shown only past 300 ms, `role="status"`, `pointer-events: none`. For a sheet's own "Carregant…" line use
  `mulaSpinner()` (a `<span class="mula-spinner">`, 1em); pass `{ mini: true }` as its second argument for the head at small sizes. Reduced motion holds the rest pose. The full SVG
  lives twice, identical (`MULASSA_SVG` and index.html; tests/loader.mjs checks): swap both together. The error card reuses the same artwork and size with a slow breath, a small head movement and falling tears; reduced motion keeps a static sad pose.
  Show at least three complete loading jokes (1.6 s each). Once the game is ready and the minimum is met, finish the current line before lifting the cover. The 20 s safety timeout remains a hard bound. Copy is short
  Catalan with "…". Audio (suspended context) downloads/decodes while the shaders compile, before the first frame, never on the tap;
  the cover lifts only once the queued `warmups` are painted (one a frame under it, at most `COVER_WARM` 1.5 s more).
- Character selection: splash unlock and `toTitle()` enter `G.state = 'select'` directly, over the same plaça and menu loop. Town pills never filter: one scrolls the strip to centre its town's first figure and selects it (no Tots pill); the active pill is always the selected figure's town (it doesn't follow the strip's scroll). Pending real figures retain their name/entity and show inline information in the measured central band, without a dialog: no portrait there (the strip shows it), an invitation whose verb agrees with the name (`aviatText(figure)`) and an open-code note that is the first thing to go on short screens. Only Mulassa and Drac can play; pending selection hides difficulty, play, records and instructions. Figure selection and difficulty are two steps in the same fixed-height dock: "TRIA DIFICULTAT" opens the level choices with the figure's last played level marked (NORMAL the first time; a challenge link's level once), which looks chosen but never shakes until a tap (Marc, 2026-10-20), and "A BALLAR!"; "Canvia de figura" or Escape returns to the cards. Pending figures cannot enter the difficulty step and show no continue button. The action row sits above the card strip, right-aligned on desktop; all cards use identical grid columns, joined image/text panels and a fixed caption height. The host hides both stage models while selection is pending, retaining the last playable song/model state; photo mode shows that last playable figure instead (desktop keeps its figure bar), and leaving it restores the pending selection untouched. In photo mode the menu orbit frames her in the whole screen instead of the selector band (centred) and, on narrow screens, backs off at the same angle until ~7 m fit across. The info block carries town/comarca, name, song, the ranking line and "Com es juga" underneath. The ranking line (`#select-rank-tile`, `rankText` in `ui/select-standings.js`; Marc 2026-10-21: «Una línia a tot arreu», it replaced the corner podium) is one tappable 44 px row under the song with the board icon and a chevron: «Posició 18 de 46 · Tardor 2026» when the profile has a place on the selected figure's open board (no gendered ordinal), else «Classificació · 46 participants», «Classificació · encara buida», or «Classificació» before the answer (a quiet pulsing bar of the line's width until then, `data-loading`); it opens Classificació on the selected figure (`onBoard(figure)`); hidden when no board is configured, and with the selector in photo mode. Desktops show it as the standings card's header (same words, no duplicate), darker than its lighter body; the card hugs its content (Marc, 2026-10-21): until the board answers, a shimmer skeleton (`select-standings.js`, opacity/transform only, flat under reduced motion) takes the shape of the last answer seen for that figure and owner (memory only; the first time the fullest shape), so the answer rarely moves it; a shorter or longer answer, or another figure's placeholder, eases the card's height over 250 ms (one WAAPI height animation, at once under reduced motion; the selector's ResizeObserver skips refits meanwhile) while the rows cross-fade in, never an empty band under the last row or foot; when the column is short the rows go first, then step 2's level row, never the header. Step 2 has no rows (Marc, 2026-10-21): the header and the foot's two gaps («A 59 punts del número 17», «A 78.749 punts del primer»), the level row in the rows' room. Desktop info column: it ends 16 px before the strip's first banner at its rest place (`--info-w`, `measure()`; never under a 300 px panel, so 900 px windows keep 300), the name and song rows scale with it (`cqi`), the standings drop the % column in a narrow column. The three medals carry a flat «Els teus rècords» label; the medals never shrink to one line (Marc, 2026-10-21): board rows, then the foot, give way first, the medals only when even the header alone would not fit; a level with no record shows «Sense rècord» on the points' line and keeps the % line's empty slot, so the first record shifts nothing. Short portrait cards (≤ 100 px tall, 320×568) put the portrait beside the caption instead of hiding it. In step 2 only, a row shaped like the song's (`ui/level-stats.js`, under the song) gives the chosen level's record on this device, labelled («El teu rècord a NORMAL: 72.310 punts», its stars and %; Marc: the points alone did not say what they were); no record: «Encara no tens rècord a DIFÍCIL» over «El primer ball que acabis serà el teu rècord» (Marc: whose record, and why none); in a 308–324 px column the subtitle goes, then the title shortens to «Sense rècord a DIFÍCIL», before the row would. No board data in it (Marc removed «a N punts del número X»). Each line stays one line and the info block never scrolls for it: desktops' 18 px panel rhythm tightens to 12 first, then the points go, then the song's credit (its disc 32 px), then the board card's foot goals, then the song row above it (Marc, 2026-10-21; `data-snug`: 900×700, 1280×600, 900×600), then the whole row; the ranking header and the level row always stay. Under 641 px of height the desktop name scales by 9.4cqi (from 26 px), so «Mulassa de Valls» keeps one line in 900×600's 300 px column. On desktops step 2's info column runs down to the level card (`--info-dock`), not to the dock's top. The same 12 px rhythm applies in either step whenever the info block would otherwise scroll (a two-line name in the 360 px column at 900×700). Desktops: the info column ends 12 px before the strip's first banner and is never narrower than 308 px; where a centred strip would put that banner further left (under ~1180 px wide) the strip moves right instead (`--strip-l`, measure()). With a fine pointer the strip's box itself starts at the column's edge + 12 (`--strip-x`), folded or unfolded: unfolded cards scroll inside it, never under the column, every name of the standings card stays clickable (the column sits above the dock), and the column keeps its height either way (≥ 2000×900 it runs down to the foot), and 900–919 px windows ≥ 661 px tall use 200 px cards so both fit. Short portrait phones (≤ 519 × 501–620 px) give the level card the landscape phones' compact size so it fits the clamped dock. The bottom strip has town banners, figure cards, remembered per-figure difficulty and "A BALLAR!". Each town has one accent (`--town`, select.css): its banner's cloth (Valls keeps its white/red/white flag, the invitation the senyera) and, at one fixed OKLCH lightness, its cards' and photo avatars' tint. It is the game's own palette, not a colla's shirt nor a heraldic tincture (the arms are on the pills). First runs enter practice through `choose`; `__dbg.choose` keeps direct entry. The inline pending card opens the existing feedback flow with `aviatDraft(town)` or offers mail. Arrows rove visible cards; there is no back-to-title loop. `setupSelect` exposes `figure`, calls `onSelect(figure)` only for playable figures when opened or changed, and `onPlay(level, figure)`; sheets-setup wires the callback to `setSelectedFigure` and passes figure plus level on play. Flow reads the active song adapter, stores records per figure and stamps run/share identity. Both figures have their own board and rank tiles (`standing(figure.id)`, one board per figure and season); the share image asks for the played figure's.
- **Selector camera** (`frameMenuCamera` / `frameMenuLens`, cameras.js; `menuFit`, `envelope` in framing.js): the selected figure fills 86% of the free rect `sheets.select.band` measures (`top`/`bottom` under the info block and above the dock, `hardTop` = the pills' floor, `left`/`right`: right of a side info panel), read from her live outline (14 support points per mesh through each mesh's matrix: no DOM reads per frame, no feedback from the lens), by dolly (fixed fov) and a two-axis lens shift (view offset, never a tilt). A short band (320×568) keeps her readable: at least 55% of the room under the pills, feet on the dock's edge, rising behind the info's lower rows. Her extents go through an envelope (up 0.35 s, down 4 s), her middle and feet through a 1.2 s average, the shift through a 0.9 s spring, the focus follows her outline's middle (1 s spring), and the idle azimuth no longer turns with her heading (both dances spin). A drag/pinch rules while a pointer is down; 2 s after letting go (`ORBIT.idle`) it eases back (`ORBIT.home` 2.5 s, capped at `ORBIT.homeSpeed` 0.55 rad/s even from a half turn: smoothDamp's `max`), at once on a figure change; in photo mode the player's framing stays (`keep`) until they leave it or change figure; leaving it hands the camera back at once with quick springs (`MENU_T.exit` 0.6 s, size, height and lens only) until she is framed, so the returning dock never covers her. Coming back from another camera (results) it adopts that pose and eases in. Splash and title keep their fixed shot. Landscape phones and portrait tablets show the rotate cover; QA those sizes as desktop windows.
- Menu placement: original DOM corner controls (feedback, music, settings) remain available on the selector, at their original 44/56 px sizes, in one right-aligned row (Perfil, music, Bústia, ⚙; phones 8 px apart, 6 under 375 px). There is no corner podium (`#leaders` is gone, Marc 2026-10-21): Classificació opens from the info's ranking line, the publish/results flows (no longer from ⚙ Configuració). The Perfil button (`#profile`, a person, decision 6) comes first; with no board configured it hides and the row closes up; photo mode hides it with the other chrome. The selector's logo (`.sel-logo`, index.html: the title's lettering as a still SVG, MULASSA over TAP TAP DANCE at the same width, decorative and inside `#select`, so photo mode hides it) sits top-left: phones take what the row leaves (≥ 82 px, up to 44 px tall: 92 px wide at 320), none under 320 px (the row spans the gutters instead: first button on the left gutter, last on the right); 56 px tall on wider screens, 40 on short ones. The logo, the corner row, the town pills row and the info block share one left edge, the page gutter (12 px phones and landscape phones, 16 px from 520 px, 40 px desktops). `measure()` fits the town row between logo and buttons (asymmetric gutter) or gives it its own row. Settings contains sync, practice, the language picker (a native dropdown, closed by default and showing the current endonym, where the Classificacions button was; no globe button in the selector's corner row: the ranking is reachable outside; Marc 2026-10-21), FPS, the publish prompt and privacy; the profile moved to Perfil. "Com es juga" appears only under selector records. Town pills sit in the header between the logo and the corner buttons when they fit (`data-header-inline`, desktops and landscape tablets), otherwise in a separate centered scrolling row below them; chrome sits above selector gradients. Photo mode exists only on the selector (`photoScreen()`, controls.js): the splash and the dormant title have no eye, no Escape and no double tap. Free play (Marc 2026-10-20) is entered through the dock's step-one secondary button «Ball lliure» (`#select-free`, Lucide's gamepad-2 at 26 px; it starts the figure's own song with «Ara sona», `playFigure` in free-music.js, unless the menu music is off; hidden for pending figures and in the difficulty step; touch too; no H key: Marc 2026-10-20); the eye (`#viewmode`) is no corner control any more and shows only inside free play, top-left, as the way back (the practice's «Surt» door, «Surt del joc lliure (Esc)»; also Escape). World double taps/double clicks no longer toggle it. It hides/inerts the selector without resetting figure, town or level. On the selector its desktop figure bar sits top-left because the corner row is right-aligned; moving those buttons means re-checking the bar (tests/selector-controls.mjs). Offline feedback still opens its existing sheet. The legacy title remains dormant; pause retains sync.
- Photo mode on touch (`COARSE`, Marc 2026-10-20; laid out and tuned from Genshin/Fortnite/Roblox handcam videos): no figure bar; it always drives (the selection, else the Mulassa). `src/ui/photo-stick.js` draws a full-screen layer: left half = a floating stick (`game/photo-touch.js`: per-pointerId thumbs, radial dead zone + curve, the base follows past the ring, the rim gallops) that walks from the camera while she turns to where she walks (`movePhoto`, `PHOTO.stickX/Y`); right half = drag to look, a swipe across the screen ≈ 190°, queued in `PHOTO.lookDX/Y` and eased in over ~45 ms (touches come at 60 Hz). The jump big where the right thumb rests, Q/E/R on an arc round it with drawn icons per figure (`ui/photo-icons.js`: the Mulassa's cavallito, coça and culada; the Drac's pixel portrait), the swap (Tab) on the right edge as the other figure's portrait. Phones want landscape there: `photoOrient` locks it where Android allows, else the «gira» cover asks (with «Torna al selector»); Safari on an iPhone adds a home-screen tip on every entry. Quick second taps never zoom (`touchend` guard in input.js).
- Photo mode's radio (`src/ui/free-music.js`, Marc 2026-10-20): one round button paired with the eye (placed from the eye's rect on show/resize; dimmed with it), a list under it: Música del menú, Ball de la Mulassa, Ball del Drac, Silenci. M opens/closes it (also in the ? help), 1–4 pick, arrows move, Escape closes it before it drops the figure; opening stops the figure and frees the mouse look, closing gives the keys back to the plaça; a press on the plaça only closes it. «Ara sona» is a dark status pill with the round portrait (no strip, no outline: an exception to the strip rule for notes, Marc 2026-10-20). Silenci is the speaker's own preference (`setMenuSound`, state.js); picking a track turns it back on. A song plays on its own source (`chip.radio*`, audio.js: never `src`/`t0`/`buf`, so a figure change does not cut it and a run stops it); the menu loop rests under it. An ended song hands over to the next (Mulassa → Drac → menu loop), the next one loaded 15 s before the end; only the playing song stays decoded. Leaving photo mode fades back to the menu loop; the choice is not stored. On the menus the crowd claps on what sounds (the song's `beats`, else `menuBeat()`); the driven figure never follows it.
- Title logo (`logo()`, title-layout.js): portrait/desktop it starts 22 px under the corner icons' row (never under 12),
  as wide as the screen allows; short screens give up the mulassa's free band before the logo (it may cover her a
  little). Motion, all cached sprites and static with reduced motion: a glint sweeps MULASSA every 5 s (`glintAt`, a
  white copy of its letters through a slanted clip) and TAP · TAP · DANCE hop a word a beat on the menu loop
  (`popsAt`, `audio.menuBeat()`). No splash text.
- Title corner buttons (the dormant title; all title-layout obstacles): `[bubble][speaker][⚙]` top-right; landscape phones
  `[⚙][speaker][bubble]` + the pill top-right. Speaker = menu loop only (`localStorage['menu-music']`).
- On/off settings: `.switch-row` (index.html), a native checkbox with `role="switch"` in a flat labelled row, never a
  fake toggle button.
- Publish prompt («Publica el teu resultat!», `#publish-menu`, board-ui.js): opens by itself once per eligible run; texts centred. On that
  auto opening only, «Ara no» (a decline, ×`MAX_DECLINES` stops it) and quiet «No m’ho tornis a recordar» (`OPTOUT_KEY`, permanent) both
  open Comparteix next. ⚙ Configuració «Proposta de publicar» (`#settings-prompt-row`) shows only while `promptsOn()` is false, with an «Activa» button that clears both.
- Two-way views (Història (9:16) · Publicació (4:5) on the share sheet): a segmented group (`.share-seg` / `.board-seg`, same rules) of
  `.btn.btn-secondary` with `aria-pressed`; the pressed one is cream.
- Classificació (`#board-menu`, `ui/board-list.js`; docs/rankings-strategy.md §4): no view tabs (Marc removed «Tots · On soc», 2026-10-21). The title row is a
  button (`#board-figure`: the figure's pixel portrait, name, chevron) that opens «Tria figura» in place of the list (`#board-picker`, the shown figure cream;
  Escape and × come back to the board), then the season line, a flat «Posició 48 de 119» card (gold strip) with one link that reads «Al capdamunt» (an up arrow) while
  the own row is in view, else «A la meva fila» (the arrow towards the row; accessible names «Ves al capdamunt de la classificació» / «Ves a la teva fila»; both labels share the longer one's width, on the place's line from 320 px), and the list opened at the own row (past the first page: a gap row whose «Carrega’n més» fills it).
  With a row the link keeps its place while it has nothing to do (no shift); with no position («12 participants») it collapses until there is somewhere to go.
  An empty open season: the portrait, «Encara no hi ha resultats», what to do, the last season's podium; no history: no «Temporades anteriors» either.
- Cloudflare Turnstile (`src/services/captcha.js`): one silent check for every player after their first run (its results, or the title
  after leaving it; skipped under webdriver): never at startup, its iframe shares the main thread on iPhone Safari;
  its tick box only in the centred, non-dismissable `#captcha-menu`, never mid-song; failures never block the game.
  Never render the widget anywhere else. After publishing, Comparteix opens by itself (`afterPublish`).
- Sheets whose content loads (Classificacions): fixed height from the first frame; loading/empty/error sit inside the
  list box, never change the sheet's height. An empty open board opened over the bare selector (not over results, Perfil or
  the Saló de la fama) offers «Juga amb el Drac / la Mulassa» (`#board-play`, the sheet's one primary; the hint then says «Publica el primer resultat i estrena la classificació.», not the button's words again): it closes the board
  (not back to Configuració) and leaves that figure selected on the cards, step 1 (`select.show(id)`).
- **Names and profiles** (docs/rankings-strategy.md §6, decisions 10, 33): a guest (no confirmed address) shows as «nom#1234» (the tag comes from the server; `appendName`, quieter `#`; «Convidat» on its card); a confirmed e-mail earns the tick wherever the name appears (boards, podiums, cards, the share image) and a clean name chosen once from Perfil («Tria el teu nom»; closing it keeps the `#`). No 7-day temporary profiles: a profile has no deadline. Guests with no sign-in or play for 12 months can be purged (`leaderboard_private.purge_inactive_guests`; verified accounts never); nothing schedules it: `supabase/ops/guest-retention-cron.sql` is a manual dry count, and activating pg_cron needs Marc's explicit approval. `savedName` (board-list.js) reads the name as the boards show it from `<alias key>:identity`; `refreshIdentity` (`service.profile()`) keeps that cache current at the first idle selector, after a publication and on account events, and clears it when the profile is gone or signed out (no Supabase at page start).
- **Perfil** (`#account-menu`, decision 6; `ui/account-ui.js`): the profile block (`profile-ui.js`: Crea, Recupera, Confirma el correu, Tria el teu nom, Tanca la sessió, Esborra el perfil; each step returns to Perfil), the player's statistics (`stats-view.js`: this device's at once, the server's `my_stats` when it knows more; the days played and streaks are private, only here), the season podiums and the previous dance's record. Statistics live in `game/stats.js` per owner (`none` until a profile exists; what was played without one joins the next profile once, decision 30; a deleted profile takes its numbers, decision 31); `services/stats-sync.js` uploads them (`merge_stats`, a minute apart, after a run, never during a song) only once that profile has seen the statistics notice (`stats-notice-<owner>`: shown on the Crea / first-publication step, or as `#stats-notice-menu` at the first idle selector for a profile made before: the title «Les teves estadístiques» and three short lines with a drawn icon each (counter, person, calendar; Marc 2026-10-21), then «Privadesa» and «D’acord»; the details it no longer says, such as no time of day, no device and deletion with the profile, stay in Privadesa's `data-privacy="leaderboards"`). A name tapped on a board or podium opens the public card (`player-card.js`, decision 18, Marc's «Fitxa breu» 2026-10-21): the name, the board row it was tapped on (`open(p)` with `p.from`), four facts with drawn icons, the podiums as achievements and «Més estadístiques» unfolding the rest in place (PERFECTE/BÉ/ERROR and falls are public too); never days, streaks, errors per kind or dates. Perfil shows the same blocks in the second person, unfolded, plus the days, streaks and errors per kind.
- **Seasons** (§4-5): one board per figure and season (a quarter named Hivern/Primavera/Estiu/Tardor + year, Europe/Madrid; «Estrena 2026» is the history before them), every level mixed by points; the board's header says the season and its days left. The Saló de la fama (`#seasons-menu`, `seasons-ui.js`; Marc, 2026-10-21) shows one closed season of a figure at a time (the figure through the Classificació sheet's dropdown, `ui/figure-picker.js`), the newest first: its estendard, dates and participants, the podium (the player's row says «TU»), the player's place, points and level in its own band, «Mira la classificació», and «Tria temporada» (the seasons by year, inside the same sheet); desktop puts the podium left and the context right; a dance replaced mid-season gets one quiet line, «Hi ha dos balls · Mira el ball anterior/actual», opening on the dance the player was on; a figure with no closed season shows an empty estendard and the open season. The end-of-season sheet (`#season-end-menu`, decision 17) tells the newest ended season where the profile played: on a podium, that figure on its step and «Has fet podi!» (none: a garland and «Gràcies per fer plaça!»), a row per board with its place, the open season (places are plain numbers, «12 de 48», never gendered ordinals), «Torna a la plaça» and a «Saló de la fama» link (the whole podium lives there, not in this sheet); once per profile and season (`season-seen-<owner>-<season>`); only a season shown is marked seen, older ones follow one at a time. `greeting.js` tells it, then the statistics notice, then a device tip (`device-hint.js`, below), at an idle selector (no sheet, not playing, not in photo mode), at most one of them per visit (page load; Marc, 2026-10-21): the rest wait for the next visit in that order, a new owner's after an account change too (its statistics stay unsent until its notice is seen; offline: later). `figureSeasons` caches `get_seasons` per owner for a minute and drops it on account events. Places 1-3 on every podium and board are one medal, the solid ribbon one (`posDisc`, sheet-kit.js; base.css `.pos.p1-3`, sized by `--pos-size`; Marc, 2026-10-22): never a second medal style.
- Privadesa (`#privacy-menu`): one sheet, one `<section data-privacy="…">` per service; open it from any button with
  `data-privacy-open`. Never add a Cloudflare analytics snippet (Pages injects it). Fonts are local (`public/fonts/`, OFL kept).
- Crash reports (Sentry, errors only): `src/services/errors.js` (gating, scrubbing, early buffer; `errors.report(kind, tags)` for
  failures shown in the UI, never aliases or free text) + lazy `src/services/sentry-load.js`. Needs `VITE_SENTRY_DSN`; off in tests,
  webdriver, `?autoplay`/`?from`/`?view` and on dev hosts. `?sentry-test` (localhost only) turns it on as 'development'
  and adds `window.__sentryTest()`. No replay/tracing/sessions; privacy text in `data-privacy="errors"`.

- Fullscreen: page fullscreen (`goFullscreen`) only on Android touch devices and only inside a real tap; never on iPhone/iPad (iPad Safari element fullscreen swallowed touches) — iPhone Safari users (not the home-screen app) get the «Juga a pantalla completa» sheet instead (`#ios-hint-menu`).
- Device tips (`src/ui/device-hint.js`, Marc 2026-10-21): small modal sheets (icon, title, text, «D’acord», round `.sheet-x`), once ever: closing either way stores `gpu-hint` / `ios-hint` = `off`. «Acceleració per maquinari» when WebGL runs on a software renderer (`softwareGl`) takes precedence; else «Juga a pantalla completa» on iPhone/iPod Safari outside the home-screen app. Told only by the greeting's queue at an idle selector, after the end-of-season sheet and the statistics notice (offline too: they need no network).

## Graphics and performance

- No per-frame allocations in the loop: reuse vectors, pools and arrays.
- Voxel models: avoid coplanar faces (z-fighting); offset or merge instead.
- **Mulassa dance** (play; `research/bestiari/mulassa/game-integration.md`): FIGURES on the song's beats
  (`game/mula-figures.js`, Marc 2026-10-19: the 2017 trace read as erratic drift): four runs out and back (W, E, N, S),
  the circle, the passada, eight culades on her head, two charges with a skid and the reversals, turns on the spot
  faster and faster onto W; sober in A1, comic from the drumroll (front up, rear kicks, hops, a head shake, a tremble).
  Joins eased (no stop-start between figures). `game/mula-dance.js` poses them in song seconds: the sway's phase on
  the song's beats (FESTA: a little more as the music livens; `?festiu=0` A/B), the eight shoes planned in song seconds
  (`game/mula-supports.js`). The 2017 reconstruction (`game/mula-path.js`) and its map (`game/mula-time.js`, `song.json`
  `ref`) now only feed the comparator. `game/mula-layout.js`: the compass (W = opening heading, + yaw W→S→E→N), the
  four attendants, the dance frame (camera between W and S). `scene/mula-stage.js` places it, steps the shoes live off
  the song (selector, practice, results, photo mode), and her colla (`scene/mula-colla.js`, the Drac's bodies in
  `models/colla.js` MULA_SUIT; hidden in photo mode and on the splash; the crowd keeps beyond `RING.arenaMula` 6.7 m;
  arms up and a hop at each culada, skid, the final hit and a big hit, and the crowd's groove answers: `MULA_CHEERS`). The jaw bites only on big moments. Carriers: `scene/mula-carriers.js` (cuffs + rigid shoes, the old model legs are gone).
  Hits add bounded accents (`accent()`, capped by `CAP`): GUA leans her to the screen's left, PA right, GUAPA/pop
  lifts her; holds sustain a lean; misses weaken the sway (never the path or turns: the shoes are planned on them),
  wrong moves stumble; nothing accumulates yaw. `tests/mula-dance.mjs`. The old beat choreography (`dance.js`) is the
  share photo's still and the shared factory code. Never add random motion to the song choreography.
- **Drac dance** (play, practice, results; `docs/drac-integration.md`): authored in REFERENCE seconds (the source video
  pm-lEViiPK0, 0-104.8 s), never in beats: `game/drac-path.js` (root path, unwrapped yaw), `game/drac-steps.js` (the
  audited foot plan: 188 placements, only 40 observed + 4 probable + 4 support, the rest adaptations), `game/drac-pose.js`
  (`poseAt(out, refSec, musicBeat, gain)`: rigid shell + a comic knee dip / waddle on the SONG's beat), `scene/drac-rig.js`
  (`poseCarrier`: rigid shell, pelvis off the shell, cloth trousers `scene/drac-legs.js`; call `dressCarrier` after any
  other `poseDrac`), `scene/drac-dance.js` (the game's frame: mula-motion.js only dispatches to it). ONE time map,
  `game/drac-time.js` (song seconds <-> reference seconds, from `song-drac.json` `ref`, written by `tools/build_drac.py`
  from `music/drac-form.json`'s `reference` block): never connect a music beat to `pose.beat` (it carries reference
  seconds to the feet). One dance frame, `placeDance(obj, FRONT)` (`game/drac-layout.js`): the Drac's parent, the helpers
  and any debug layer; path in model units, helpers in metres, `DRAC_SCALE` once. The colla (`scene/drac-colla.js`,
  `models/colla.js`): four helpers at 5.1 m in the colla's camouflage suit clapping on integer beats, a few members sitting
  spread round their ring (~6 m, not the camera's gap; the crowd keeps beyond `RING.arena` 7.2 m), shown only with
  the Drac and not in photo mode; `?lletres` shows the W/N/S/E debug letters. `game/dance-drac.js` (the old beat dance)
  now only drives the selector / splash walker and the music editor's preview. `/tools/dev/drac-compare.html?mute` (dev, never built)
  draws the same modules against the video (served by the dev media alias `/drac-reference/`, research/bestiari/README.md;
  never in `public/`). The frozen Codex prototype stays in `research/bestiari/drac/prototype/` for comparison only.
- **Drac fire** (`scene/drac-fx.js` says when, `scene/drac-fire.js` draws): a kraft carretilla tube on each of the five fire
  points (models/drac.js `fireNode`, root in its nozzle). Documented fire (UAF photos, research in
  `~/.t3/artifacts/mulassa-pirotecnia-research-20261019/`): JETS of white-gold sparks from the tubes on a 30 streak, in the
  FINAL ESBOJARRAT and while the CARRETILLES burn (each tap kicks the next tube, the TRO fires all five). Artistic licence,
  on purpose: the FLAMARADA on every CREMA, the final hit and the TRO — one ball between the two snouts plus the tail and
  wing tips, ~1.1 s, it lets go of the tubes and stays put in the world; sizes in `DRAC_FIRE.flare` (Marc, 19/10/2026: the
  mock-up's 0.7, wider, one ball for the mouths). No light pulse on the plaça (the finale lights own it); reduced motion
  drops the flash. Pools per tier: `PROFILES[].jets`.
  Free mode only (E held with the Drac): whoever the fire's volume touches is charred cartoon-black (white eyes), frozen,
  with a wisp of smoke, for `SOOT.hold` 4 s, then eases back over `SOOT.fade` into their own live behaviour
  (`scene/drac-soot.js`: capsules from the fire points, counted generously down to the heads under the flame
  (`SOOT.under`, `SOOT.wide`), plus everyone in a wedge in front of the snout as far as its jets (`SOOT.front`: Marc's choice);
  stand-in meshes (the local representation trial) follow their person through `sootLink` / `sootHold`; a byte per bone on the crowd mesh's own material for the ring, band and
  balconies, a per-instance `aSoot` for the backdrop/mid figures). Never in the game, demos or the selector.
- **Play camera** (`framePlayCamera`, v3): defined by what you SEE, not by fitting her turn/jump envelope. From `?cam` sessions on a desktop: fov 54, a slice of world 8.25 m tall at her (a narrow screen instead needs 8.4 m across: the greater distance wins), her focus point 42% of the way down the stage (lane → pad), ~81° round and 26° above (`CAM_AZ`/`CAM_EL`, `CAMV`). It never sits still: a slow sway (`DRIFT`, unrelated 13–29 s periods) and a very slow follow of her heading (a sine, so no wrap-around step; 2.8 s spring). Springs are constant and slow (position 1.5 s) on purpose: a spring whose stiffness changes while far from its target whiplashes. Tune with `?cam` (auto = this camera).
  `FRONT` = her dance's front, 20° off `CAM_AZ` so every pose reads three-quarter. The banda de música (models.js `BAND`, `placeBand`/`poseBand`,
  6/8/10 by quality) stands across the plaça from the camera (`BAND_AZ`), behind her, playing on the song's beat. `insidePlaza` remains the last resort.
  Shake during play is a small additive accent (GUAPA, finale), never fed back into the springs; misses/pops don't shake.
  With the Drac (`DRAC_CAM`) it follows half its travel across the shot (90% in depth) and not its heading: its long
  walks and twelve spins slid and swung the plaça under the note lane; `?camdrac=segueix` = the Mulassa's follow (A/B).
  The Mulassa's travelling dance uses the same calm follow (`MULA_CAM`: all of her travel across, and towards the lens only
  as far as the square lets the camera back away); `?camdrac=segueix` restores the heading follow for both.
- **HUD scale `K`** (css px per HUD unit, `uiScale` in main.js; also CSS `--ui` = K/2 for the tablet pad): phones 1.5; tablets in proportion to the screen (a 1024×768 iPad = 2, a 12.9" iPad Pro ≈ 2.7, cap 2.9: their css px follow the glass); desktops grow gently (2 up to 800 px of height, +1 per 600 px, cap 2.9: 2.5 was too small, unbounded proportion giant; a bigger monitor only shows more css px, the UI must not become giant).
- **Crowd during the song** (`animCrowd`): still, near-invisible breathing; hits drive one eased envelope (`GROOVE`,
  `grooveHit`: a few cm bob, a few degrees nod/sway, attack ~0.1 s, release ~0.4 s; GUAPA/pop/good phrase a bit more,
  a miss only settles it) sampled per person with a small lag/gain. No creeping in while the song plays; any walking
  is capped (`GROOVE.maxV`, fleeing her excepted) and people at rest skip the neighbour search. Moods (calm, festa,
  sad, clap) are eased scalars, never switches: the finale / "eeeh!" / a clear result cheer, a collapse saddens.
  Only the first ring (`NEAR`, `pickNear`: the `PROFILES[].near` people nearest her that the camera sees, re-picked
  every 0.6 s, fading in/out) answers more: a slower tap of the same envelope (`mood.gr4`), bigger bob/nod/arm lift, more on
  GUAPA and a streak, a light on-beat bounce from combo 10. Tested per frame: calm crowd < 9 mm / 0.09 rad, 22 mm up; ring
  < 30 mm up / 0.12 rad (they include the ripple below).
- **Ripple** (`src/scene/crowd-fx.js`, `RIP`): each hit (not a miss, not a pump) sends a pulse out from her (9 m/s, up to 8
  live) that lifts, nods and raises the arms of whoever it reaches, GUA favouring the screen's left, PA its right; a part
  of the crowd answers a normal hit, everyone a GUAPA. Eased per person (`p.rip`), not for walkers, not in the festa or
  with reduced motion. CPU: distance/side are cached in `pickNear`; `PROFILES[].ripple` = rows that take part (high all,
  medium row 0 + first ring, low first ring only, minimal none). Costs ~1% of `animCrowd`.
- **Shove, growth**: a GUAPA makes the front row and first ring want 0.9 m more room for 0.5 s (`SHOVE`, the
  making-way below does the rest). Nobody is ever knocked over in the game (rejected: people falling to the floor); only photo mode's culada (R) knocks the near ones flat for a moment (Marc, 2026-10-18). After 8 judged notes about 40% of the back rows (`PRES`, `p.thr`) are only there while
  ENCERTS is above their threshold (scale 0, eased; never front row, menus, practice, finale).
- **Making way** (`RING`): the front row stands at `RING.front` (5.4 m) and everyone keeps `RING.clear` (3.8 m, + row,
  jitter) from her body box / swept rear, so her turning ends reach them and they step back (eased, ≤ `RING.flee`
  1.3 m/s, eased speed cap, hands up, lean back), then walk back to their spot (`RING.home` 0.35 m/s; blocked for
  `patience` s: they stay). Positions are drawn through a 40 ms ease (`p.gx/gz`); arms change ≤ 6 rad/s. Tested:
  ≤ 24 mm a frame, its change ≤ 8 mm, ≤ 0.15 rad; everyone else as before.
- **More people, no CPU**: the skinned ring stays as it was; the fullness comes from instanced figures with no bones
  (`buildBackdrop`, one shared material/program): the façade backdrop and the mid band (`midCrowd`, `MID`: r 9.4–12.6
  on the far side, ±1.45 rad; the moving crowd stops at `MID.edge` there) plus static balcony people, all counted
  per tier in `PROFILES` (`backdrop`, `mid`, `balconies`). The figures shrink away near a low lens (`uLens`).
- Plaça props (trees, lamps) are separate meshes (`plaza.props`) set back by the building fronts, out of the play
  camera's path; `blocks()` (framing.js) hides one that would stand between the camera and her or against the lens.
- Canvas: pair every `save()` with `restore()`; reset `globalAlpha`, shadows and clips.
- HUD cost: outlined text goes through `text()` / `bigWord()`, which blit cached sprites (stroked glyphs every frame
  were the iPad's stutter); no `shadowBlur` (use `glowPath()` / `glowDisc()`); the HUD canvas is capped by a pixel
  budget (`hudScale`); no layout reads per frame (`playBottom()` caches the pad's top). Input is judged at the event's
  timestamp on the de-stepped song clock (`press(dir, e)`), never at frame time.
- Hitches (first uses): animated text sizes use `text(..., grow)` (one sprite, scaled) instead of a new sprite per size;
  at most `SPRITES_NEW` new text sprites a frame (the rest drawn directly that frame); big words share one outline sprite
  per word/size (`bigWord` rim) and words needed on a beat are painted ahead (`warmStart`, `warmups`; on the splash the title's words first). Every program,
  hidden objects and the share photo's render-target variants included, is compiled up front (`precompile`), and again
  (screen only) after a quality step. Never share one material between plain and skinned/instanced meshes.
- Frame pacing (`framePacer`, render-quality.js): up to 95 Hz every refresh is drawn. 120 Hz (ProMotion) screens run
  at 120 while the device keeps up; > 15% missed refreshes in a 2 s window drop it to an even 60 (every other
  refresh); back to 120 only after 5 s of good frames (longer after failed tries), at most 3 switches a minute, and
  never mid-song (`pace(now, hold)`, hold = a song is on: it may drop, it never retries 120 until the song is over).
  `frameMonitor` (quality steps) normally judges against 60 fps (> 24 ms = slow), never the 120 budget: a 120 Hz miss
  halves the rate first, quality drops only when even 60 is out of reach. Also one step when play keeps hitching (`SPIKE`: 5 frames
  over 50 ms within 3 s; menus/pause/hidden tab don't count). iOS Low Power Mode caps Safari's rAF at
  30 Hz (`pace.lowPower`): a steady ~33 ms cadence permits one quality step per session, then judges misses against
  30 Hz (> 48 ms slow, > 100 ms hitch). It cannot distinguish a cap from a device too slow for 60; genuine missed
  frames still lower quality. A faster frame or background gap resets the inferred cap; the FPS readout says why.
  The rAF rate a device reaches is all the pacer sees (a slow one reads as a slower display). So **everything that
  moves must use real time** (`dt`, `clock`, song time): no per-frame factors
  (`v *= 0.97` → `0.97 ** (dt * 60)`), no per-frame random chances; `tests/render-quality.mjs` simulates the rAF.
- «Mostra els FPS» (⚙ Configuració switch, `localStorage` `fps`): `#fps`, a small bottom-left readout (just the number,
  green/amber/red vs the target, «30 FPS» + «mode d’estalvi?» under it at ~30 Hz; on phones it wraps under `max-width: 5.5em` to stay left of «Com es juga?», tests/layout.mjs), title and play only, above the pad and the
  practice instruction; `fpsTick()` updates it 4×/s. `?perf` stays the detailed debug line.
- Mobile GPUs: respect `render-quality.js` profiles; don't raise DPR or shadow cost casually.

## Audio / music style

- Festive, warm, non-strident: no gralla, no pulse/square buzz; additive soft timbres.
- Part A: the don/ka taiko doubles the tune (the audio plays what the chart asks you to tap).
- No continuous applause during the song (only the results' 'ovation'): it hissed. The plaça's voice under it is deliberately
  small: the murmur (`amb`) swells up to 2.2x with the streak (`setCrowd`), a short «eeh!» (`'eh'`) on a GUAPA, and a few
  hands on beats 2 and 4 of section B (`clapBurst`, 0.04-0.09). All on the run's bus. GUAPA = a big taiko DON (`bigDon()`).
- Audio URLs in `song.json` carry a `?v=` content hash (cache busting): always regenerate through the tool, never
  rename or hand-copy audio files.
- Menu loop (`mulassa-taiko-ambient.mp3`): light plucked-string polka, seamless loop; never leaks into play.

## Sentry issue inspection from the CLI

- Target: organization `ondori`, project `mulassa-tap-tap-dance`,
  regional API `https://de.sentry.io`; browser UI `https://ondori.sentry.io`.
- Use the existing read-only authentication with Project Read and Issue & Event Read permissions.
  Passing a project to the CLI scopes the query, not the credential's authorization.
- Keep credentials outside this repository and outside this file. Do not overwrite the global Sentry login
  used by other projects. Never print tokens, pass them as CLI arguments, commit them, or enable shell tracing
  or verbose HTTP logging around authentication. On the configured development host, the dedicated token is in
  `~/.config/mulassa-sentry/read-token` (directory 0700, file 0600). Read it only into the authenticated
  process; do not display its contents. Other hosts need their own explicitly approved credential setup.
- Use the installed `sentry-cli` (not the separate `sentry` CLI). This read-only example supplies the token
  in the child environment, without placing it in arguments or changing the global login:

  ```python
  import os, subprocess
  from pathlib import Path
  token = Path.home().joinpath('.config/mulassa-sentry/read-token').read_text().strip()
  env = dict(os.environ, SENTRY_AUTH_TOKEN=token)
  subprocess.run([
      'sentry-cli', '--url', 'https://sentry.io', 'issues',
      '--org', 'ondori', '--project', 'mulassa-tap-tap-dance',
      'list', '--query', 'is:unresolved', '--max-rows', '100', '--pages', '1',
  ], env=env, check=True)
  ```

- For a periodic review, also query `--query 'lastSeen:-24h'` (including resolved/archived issues), adapting
  the interval to the last successful check. Record the query, timestamp, IDs, counts, first/last seen and
  releases; compare with the previous snapshot and report new issues, recurrence or meaningful increases.
  One page can truncate results; inspect pagination before claiming the list is complete.
- This CLI's `issues` command lists issues but does not provide an issue-detail subcommand. Details and
  latest events require authenticated read-only API requests to `https://de.sentry.io/api/0/issues/{id}/`
  and `https://de.sentry.io/api/0/issues/{id}/events/latest/`. Use Python `urllib.request.Request` with
  `headers={'Authorization': 'Bearer ' + token}` and a timeout, keeping the header out of logs.
  Use the EU host. Verify `project.slug` in the issue response before fetching its event.
  Select diagnostic fields instead of dumping request bodies, headers, user data or complete payloads.
- `Users = 0` is not proof of no affected players: the SDK removes user identity. Keep observations separate
  from suspected causes. A recovered WebGL context is not proof the subsequent render works.
- Routine authorized reads need no new confirmation. Resolving, archiving, deleting, commenting, changing
  rules or permissions, and creating credentials require the repository owner's explicit confirmation in chat.
- These instructions enable future reviews; they do not create a scheduler or authorize automatic fixes,
  deployments or Sentry mutations. Scheduling is configured separately.

## Process

- Small, targeted edits; keep the existing style and comment voice (short "why" comments).
- Add a test for new logic (`tests/*.mjs` or `check.mjs`); keep `npm run check` green.
- Don't commit unless asked.
- Several agents may edit the same files at once: use targeted edits (no whole-file rewrites), re-read right before editing,
  and stay out of areas another agent owns. Put new code in the module that owns the concern (see Structure) — `main.js` does not grow.
