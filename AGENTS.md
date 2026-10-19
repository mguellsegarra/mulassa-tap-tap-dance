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
let others change; the sheets (board, share, profile, feedback, nudge, sync) are built in `ui/sheets-setup.js` and read
by everyone below it as `sheets.board`… (`ui/sheets.js`), so no import cycle is needed.

- `index.html` — the DOM: touch pad (GUA | PA), ⚙ `#settings` → "Configuració" sheet, "Com es juga" pill + sheet, "Ajusta la
  sincronia" sheet, pause/confirm sheet, SALTA, iOS "add to home screen" hint. Its CSS is in `src/styles/*.css` (`base.css`,
  `share.css`, `feedback.css`, `select.css`, linked in order) except the fonts and the `#loader` rules, which stay inline: they paint before any file.
- `src/main.js` — imports the systems in start order, the keyboard/pointer glue that needs several of them, `frame()`,
  `window.__dbg` for tests.
- `src/core/` — `env.js` (URL flags, beat grid, judge window in use, sync offset), `timing.js` (frame pacer, lane clock), `anim.js` (easing).
- `src/game/` — the rules, no drawing: `state.js` (`G` and who owns each field, `chip`, `clock`, the song clock, held keys),
  `flow.js` (splash → select → run/practice → finish → final), `judge.js` (hits, GUAPA pairs, holds, balloons, collapse, autoplay/advance),
  and the pure logic: `chart.js` (`makeDanceChart`, `DIFFS`, `BALLOONS`), `progress.js` (quality %, stars, `WINDOWS`), `energy.js`
  ("l'ànim de la plaça"), `practice.js` (first-game `STEPS`), `calibration.js`, `dance.js` (the song's base choreography),
  `bubble-rules.js` (when the crowd may talk), `figure-catalog.json` (names, towns, entities and primary sources), `figures.js` (playable/Aviat registry, portraits, per-figure level memory and legacy record keys). Catalog thumbnails use native pixel cells and palettes in `figure-portraits.js`, rendered through the original `pixelSvg` component.
- `src/scene/` — the 3D world: `stage.js` (renderer, scene, lights, plaza, mulassa, the play camera's direction), `quality.js`
  (a render-quality level applied), `crowd-build.js` (who stands where), `crowd.js` (`animCrowd` = `updateMood` →
  `steer` → `separate` → `pose` → `poseScenery`; the mood is the `mood` object), `mula-motion.js` (springs on top of the choreography),
  `cameras.js`, `confetti.js`, `fx.js` (finale lights, fireworks), `share-capture.js` (`renderHero`), `balloon3d.js` (the GLOBUS
  balloon in 3D), `models.js` → `models/*.js` (voxel models by subject), `framing.js`, `orbit.js` (pure camera helpers), `crowd-fx.js` (the ripple).
- `src/hud/` — everything drawn on the 2D canvas: `canvas.js` (size, K, safe areas, resize), `sprites.js` (palette + text sprite cache),
  `primitives.js`, `layout.js`, `lane.js`, `top.js`, `praise.js`, `bubbles.js`, `banner.js`, `title.js`, `results.js`, `warm.js`, `balloon.js`,
  `draw.js` (`drawHud`), plus `stars.js`, `title-layout.js`, `share-card.js`.
- `src/ui/` — DOM: `handles.js`, `sheets-setup.js`, `input.js`, `controls.js`, `pause.js`, `pause-actions.js`, `pad.js`, `focus.js`,
  `backdrop.js`, `fullscreen.js`; the sheets `board-ui.js`, `profile-ui.js`, `share-ui.js`, `feedback-ui.js` (+ the nudge), `sync-sheet.js`,
  `loader.js`, `select-ui.js` (main selector, town pills, records and inline pending information); helpers `sheet-kit.js` (status line, busy button), `sheet-fade.js`.
- `src/services/` — talking to the outside: `leaderboard.js` (+ `leaderboard-rules.js`, `leaderboard-result.js`, `alias-rules.js`),
  `feedback.js` (client of the `workers/feedback` Cloudflare Worker, `VITE_FEEDBACK_URL`; the Worker checks Turnstile and e-mails each
  message to the `FEEDBACK_TO` secret, nothing stored, never put a personal address in the repo), `captcha.js` (Turnstile), `share.js`,
  `errors.js` + `sentry-load.js`.
- `src/platform/` — `audio.js` (`Chip`: song + menu loop + SFX; `Clicker`), `render-quality.js` (adaptive DPR/quality, frame pacer),
  `storage.js` (the one localStorage adapter), `polyfills.js`.
- `src/dev/` — `cam-edit.js` (`?cam`), `perf.js` (`?perf`), `fps.js`, `debug.js`, `final-test.js` (`?final`).
- `src/song.json` — **generated** (never hand-edit): bpm, beats, sections, finale, end, notes
  `[t, don|ka, level, big, holdEnd]`, hashed audio URLs.
- `tools/build_taiko.py` — the **single** generator of all music and the chart, from `music/score.json`
  (the melody). Writes `public/music/mulassa-taiko.{wav,mp3,mid}`, `mulassa-taiko-ambient.mp3`,
  `music/taiko-arrangement.json` and `src/song.json`. Musical/game rules: `music/README.md` (Catalan).
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
- Never hardcode the BPM (it has changed before): use `song.bpm` / `song.beats` in JS, `BPM` in the generator.
- Audio must stay **bit-identical** unless the task is about music: compare `shasum public/music/*` before/after.

## Testing in a browser

- **Always load the game with `?mute`** in any browser, headless or simulator. Close tabs when done.
- Headless Playwright (Chromium, `--use-angle=swiftshader`) and the iOS Simulator are fine for screenshots.
- Check mobile first (375×667 and iPhone 16, 393×852) and desktop (e.g. 1280×800); landscape phones too.
- URL params: `?mute` (silent), `?autoplay` (plays itself), `?from=N` (start at N s), `?view=side|front|back|top`
  (fixed camera, no HUD), `?still` (mulassa doesn't dance on the title), `?offset=ms` (sync offset).
- `?cam` (with `?autoplay&from=N`, or a practice): the camera editor over the game (`src/dev/cam-edit.js`). Drag orbits, wheel/pinch = distance, shift- or right-drag (two fingers) = where she stands on the screen, shift+wheel or the buttons = fov; an overlay shows az/el/dist/fov/her screen y next to the automatic camera's, and «copia» copies one JSON line (viewport, K, stage, values, auto) to fit the per-device camera from. The auto camera keeps running underneath («auto» goes back to it).
- Local previews without Supabase automatically use the existing in-memory leaderboard and show "MODE PROVA"; `?mock` explicitly selects it on dev hosts. Public hosts never use this fallback. It does not skip the splash or fabricate a completed run.
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
- **Balanced layout (every card, sheet and screen).** Use the space the container already has and share its free space between rows: no dead band under the last row, no group crammed while another gap is wide, outer margins about equal top and bottom. Judge what you see (text, art, filled buttons), not boxes: a 44 px link around 15 px of text, a portrait slot around its art or a reserved two-line title slot carry their own slack, so compensate for it. Equal spacing is the default, not a dogma: keep the hierarchy, keep icons/art/text at their intrinsic size (never stretch them to fill) and give the free space to flexible gaps (`space-between`/`space-evenly`, `auto`/`fr` tracks, auto margins). Items sharing a row get equal space before, between and after them, and no column narrower than its words (no truncation, no overlap). When room runs out, gaps shrink first, then optional art, never copy, actions or 44 px targets, and no new internal scroll. QA: measure row bounds and gaps and look at captures at 320×568, 375×667, 393×852, 667×375, 852×393, 768×1024, 1280×800, a wide-short and a large desktop, plus a resize sweep across the breakpoints and the longest copy; compare with HEAD. Process: `~/.agents/skills/balanced-layout-qa/SKILL.md`.

- All copy in Catalan, no English ("Practice", "OK", "Settings"…). Watch false friends and apostrophes (’).
- Tap verbs: «Toca» for the touch screen, «Prem» for keys, «Pica» only for GLOBUS mashing; split by device (`.touch`/`.keys`,
  `COARSE`) or use a neutral verb («Marca»). Links in running text (mailtos): cream `#fff3d6`, underlined (never GUA orange).
- Desktop selector navigation uses one 120×44 px brown capsule with a gold outline and cream arrows, centred above the strip, without a counter. It stays hidden until the opening layout has been measured. Its halves stay in place at the ends. With a fine pointer, the cards and navigation keep a fixed vertical position across playable and pending selections, reserving the primary action row; touch keeps swipe navigation and its existing dock movement.
- **Colour roles** (one job each): solid gold `#f5c518` = the one primary action of a view; gold outline = every other button,
  round icon buttons and the sheets' frame; solid cream `#fff3d6` with dark text = what is selected (town pills, level and
  view segments; a cream ring on the selected card), unselected choices get a neutral `#e8d8b880` edge; information chips on a card (a pending figure's entity) are dark with cream text, never a cream fill; gold as text only for
  brand and celebration (titles, GUAPA); GUA orange / PA turquoise only for the two drums and what literally means left/right;
  errors `#ff8a7a`. Round icon buttons: 44 or 56 px, 2 px gold edge, dark fill, cream glyph (`.sheet-x` too); #pause stays
  bigger on purpose (a game control). Every target is >= 44 px (`.btn-link` gets an invisible slop).
- **Buttons: use the `.btn` component** (in `index.html`), never one-off button styles:
  `.btn` + `.btn-primary` (filled gold, one per sheet) / `.btn-secondary` (outlined) / `.btn-link` (plain underlined
  text, minor actions; `.btn-small` for tiny ones). Optional `<svg>` icon goes first: fixed 22 px slot on the left,
  vertically centred. **Icon left, text centred**: padding reserves the slot on both sides. Optional subtitle:
  `<span class="sub">`. Stack them in `.sheet-actions`. Min height 48 px (44 on landscape phones).
  `.btn-compact` (with `.btn-link`): a quiet icon + label text link, no outline, clearly lesser than the sheet's buttons
  but still a 44 px target (padding) (the share sheet's WhatsApp · X · Altres); never for a sheet's main action.
- Share sheet: the primary shares **the image alone** (`navigator.share({ files })`, no title/text/url: with them iOS
  hides «Desa la imatge» and targets swap or mangle it) or saves it; the caption + challenge link go only through the
  quiet «O envia el missatge:» row (WhatsApp · X · Altres/Copia).
- Only real buttons look like buttons (outline + rounded). Tips, notes and labels are **flat with a coloured strip**
  on the left, no outline (`tipChip()` on canvas, `#ios-hint`, `.sync-how`, practice instruction).
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
- Character selection: splash unlock and `toTitle()` enter `G.state = 'select'` directly, over the same plaça and menu loop. Town pills never filter: one scrolls the strip to centre its town's first figure and selects it (no Tots pill); the active pill is always the selected figure's town (it doesn't follow the strip's scroll). Pending real figures retain their name/entity and show inline information in the measured central band, without a dialog: no portrait there (the strip shows it), an invitation whose verb agrees with the name (`aviatText(figure)`) and an open-code note that is the first thing to go on short screens. Only Mulassa and Drac can play; pending selection hides difficulty, play, records and instructions. Figure selection and difficulty are two steps in the same fixed-height dock: "TRIA DIFICULTAT" opens the level choices and "A BALLAR!"; "Canvia de figura" or Escape returns to the cards. Pending figures cannot enter the difficulty step and show no continue button. The action row sits above the card strip, right-aligned on desktop; all cards use identical grid columns, joined image/text panels and a fixed caption height. The host hides both stage models while selection is pending, retaining the last playable song/model state; photo mode shows that last playable figure instead (desktop keeps its figure bar), and leaving it restores the pending selection untouched. In photo mode the menu orbit drops the selector band's shift (she is centred) and, on narrow screens, backs off at the same angle until ~7 m fit across. The info block carries town/comarca, name, song, record/rank/leader tiles and "Com es juga" underneath. The bottom strip has town banners, figure cards, remembered per-figure difficulty and "A BALLAR!". First runs enter practice through `choose`; `__dbg.choose` keeps direct entry. The inline pending card opens the existing feedback flow with `aviatDraft(town)` or offers mail. Arrows rove visible cards; there is no back-to-title loop. `setupSelect` exposes `figure`, calls `onSelect(figure)` only for playable figures when opened or changed, and `onPlay(level, figure)`; sheets-setup wires the callback to `setSelectedFigure` and passes figure plus level on play. Flow reads the active song adapter, stores records per figure and stamps run/share identity. Leaderboard remains Mulassa-only; Drac hides the public rank/leader tiles.
- Menu placement: original DOM corner controls (ranking, feedback, music, settings) remain available on the selector, at their original 44/56 px sizes, in one right-aligned row (ranking, eye, Bústia, music, ⚙; phones 8 px apart, 6 under 375 px). The selector's logo (`.sel-logo`, index.html: the title's lettering as a still SVG, MULASSA over TAP TAP DANCE at the same width, decorative and inside `#select`, so photo mode hides it) sits top-left: phones take what the row leaves (≥ 82 px, up to 44 px tall), none under 360 px (the row centres); 56 px tall on wider screens, 40 on short ones. `measure()` fits the town row between logo and buttons (asymmetric gutter) or gives it its own row. Settings contains sync, practice, profile and privacy. "Com es juga" appears only under selector records. Town pills sit in the header between the logo and the corner buttons when they fit (`data-header-inline`, desktops and landscape tablets), otherwise in a separate centered scrolling row below them; chrome sits above selector gradients. Photo mode is available through the original eye, H/Escape or two still pointer taps on the exposed world (mouse and touch, no synthetic dblclick handler). It hides/inerts the selector without resetting figure, town or level. On the selector its desktop figure bar sits top-left because the corner row is right-aligned; moving those buttons means re-checking the bar (tests/selector-controls.mjs). Offline feedback still opens its existing sheet. The legacy title remains dormant; pause retains sync.
- Title logo (`logo()`, title-layout.js): portrait/desktop it starts 22 px under the corner icons' row (never under 12),
  as wide as the screen allows; short screens give up the mulassa's free band before the logo (it may cover her a
  little). Motion, all cached sprites and static with reduced motion: a glint sweeps MULASSA every 5 s (`glintAt`, a
  white copy of its letters through a slanted clip) and TAP · TAP · DANCE hop a word a beat on the menu loop
  (`popsAt`, `audio.menuBeat()`). No splash text.
- Title corner buttons (all title-layout obstacles): portrait podium top-left, `[bubble][speaker][⚙]` top-right; landscape phones
  `[⚙][podium][speaker][bubble]` + the pill top-right. Speaker = menu loop only (`localStorage['menu-music']`).
- On/off settings: `.switch-row` (index.html), a native checkbox with `role="switch"` in a flat labelled row, never a
  fake toggle button.
- Publish prompt («Publica el teu resultat!», `#publish-menu`, board-ui.js): opens by itself once per eligible run; texts centred. On that
  auto opening only, «Ara no» (a decline, ×`MAX_DECLINES` stops it) and quiet «No m’ho tornis a recordar» (`OPTOUT_KEY`, permanent) both
  open Comparteix next. ⚙ Configuració «Proposta de publicar» (`#settings-prompt-row`) shows only while `promptsOn()` is false, with an «Activa» button that clears both.
- Two-way views (Història (9:16) · Publicació (4:5), Tots · On soc — both tabs for anyone with a nickname, never hidden after open, so nothing shifts; it opens on On soc only while the last answer gave that nickname a row (`ROW_KEY`), else on Tots): a segmented group (`.share-seg` / `.board-seg`, same rules) of
  `.btn.btn-secondary` with `aria-pressed`; the pressed one is cream.
- Cloudflare Turnstile (`src/services/captcha.js`): one silent check for every player after their first run (its results, or the title
  after leaving it; skipped under webdriver): never at startup, its iframe shares the main thread on iPhone Safari;
  its tick box only in the centred, non-dismissable `#captcha-menu`, never mid-song; failures never block the game.
  Never render the widget anywhere else. After publishing, Comparteix opens by itself (`afterPublish`).
- Sheets whose content loads (Classificacions): fixed height from the first frame; loading/empty/error sit inside the
  list box, never change the sheet's height.
- Privadesa (`#privacy-menu`): one sheet, one `<section data-privacy="…">` per service; open it from any button with
  `data-privacy-open`. Never add a Cloudflare analytics snippet (Pages injects it). Fonts are local (`public/fonts/`, OFL kept).
- Crash reports (Sentry, errors only): `src/services/errors.js` (gating, scrubbing, early buffer; `errors.report(kind, tags)` for
  failures shown in the UI, never aliases or free text) + lazy `src/services/sentry-load.js`. Needs `VITE_SENTRY_DSN`; off in tests,
  webdriver, `?autoplay`/`?from`/`?view` and on dev hosts. `?sentry-test` (localhost only) turns it on as 'development'
  and adds `window.__sentryTest()`. No replay/tracing/sessions; privacy text in `data-privacy="errors"`.

- Fullscreen: page fullscreen (`goFullscreen`) only on Android touch devices and only inside a real tap; never on iPhone/iPad (iPad Safari element fullscreen swallowed touches) — Apple users get the "Afegeix a la pantalla d'inici" hint instead.

## Graphics and performance

- No per-frame allocations in the loop: reuse vectors, pools and arrays.
- Voxel models: avoid coplanar faces (z-fighting); offset or merge instead.
- **Mulassa dance** (`animMula`, `dance.js`): during play the song's beat drives heading, sway, lift and travel
  (identical on every difficulty; turns about her centre). Observed order from the videos (front → half turn to the
  rear → rear sway → front → livelier turns with lean/pitch → turns → front, settle); beats, turn count/direction and
  amplitudes are an artistic adaptation. Hits add bounded accents (`accent()`,
  capped by `CAP`): GUA leans her to the screen's left, PA right, GUAPA/pop lifts her; holds sustain a lean; misses
  weaken, wrong moves stumble; nothing accumulates yaw. `tests/dance.mjs` fails if the arrangement's sections move.
  The title/results keep the free demo walk (front pivot). Never add random motion to the song choreography.
- **Play camera** (`framePlayCamera`, v3): defined by what you SEE, not by fitting her turn/jump envelope. From `?cam` sessions on a desktop: fov 54, a slice of world 8.25 m tall at her (a narrow screen instead needs 8.4 m across: the greater distance wins), her focus point 42% of the way down the stage (lane → pad), ~81° round and 26° above (`CAM_AZ`/`CAM_EL`, `CAMV`). It never sits still: a slow sway (`DRIFT`, unrelated 13–29 s periods) and a very slow follow of her heading (a sine, so no wrap-around step; 2.8 s spring). Springs are constant and slow (position 1.5 s) on purpose: a spring whose stiffness changes while far from its target whiplashes. Tune with `?cam` (auto = this camera).
  `FRONT` = her dance's front, 20° off `CAM_AZ` so every pose reads three-quarter. The banda de música (models.js `BAND`, `placeBand`/`poseBand`,
  6/8/10 by quality) stands across the plaça from the camera (`BAND_AZ`), behind her, playing on the song's beat. `insidePlaza` remains the last resort.
  Shake during play is a small additive accent (GUAPA, finale), never fed back into the springs; misses/pops don't shake.
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
