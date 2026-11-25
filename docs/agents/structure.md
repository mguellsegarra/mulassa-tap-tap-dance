# Structure of the codebase

`src/main.js` is only the composition root (imports in start order, the keyboard/pointer wiring's glue, the frame loop);
every system lives in its own module, and `tests/build/modules.mjs` keeps it that way (no import cycles, main.js ≤ 400 lines,
every other module ≤ 300). Modules with page-level state (`let`s other modules read) export a `setX()` for the ones they
let others change; the sheets (board, share, profile, Perfil `account`, seasons, season end, card, feedback, sync) are built in `ui/sheets-setup.js` and read
by everyone below it as `sheets.board`… (`ui/sheets.js`), so no import cycle is needed.

## The page and its root

- `index.html` — the DOM: touch pad (GUA | PA), ⚙ `#settings` → "Configuració" sheet, "Com es juga" pill + sheet,
  "Ajusta la sincronia" sheet, pause/confirm sheet, SALTA, the device tips (`#gpu-hint-menu`; free play's `#free-hint-menu`).
  - Its CSS is in `src/styles/*.css`, linked in this order: `base.css`, the boards' `board.css`, `share.css`,
    `feedback.css`, the selector's `select.css`, `select-cards.css`, `select-sizes.css`, `select-pending.css`,
    `select-chrome.css`, then `profile.css`.
  - The fonts and the `#loader` rules stay inline: they paint before any file.
- `src/main.js` — imports the systems in start order, the keyboard/pointer glue that needs several of them, `frame()`
  (the time step, then `game/tick.js`, the animations, `ui/frame-camera.js`, the render and the HUD), `window.__dbg` for tests.

## `src/core/`

- `flags.js` — the ONE reader of the URL's debug flags.
  - On any non-dev host `Q` keeps only `PUBLIC_FLAGS` (`?perf`, `?hide`, `?vp`, `?figura`), so the other debug
    parameters are ignored on mulassa.cat/pages.dev.
  - `strippedRun` marks the `?hide`/`?perf=no3d|nohud` runs that neither publish nor report errors.
  - The real features `?repte` and `?lang` read their own search in share.js and i18n/locale.js.
- `env.js` (flag constants, beat grid, judge window in use, sync offset), `timing.js` (frame pacer, lane clock),
  `anim.js` (clock-driven easing: `pulse`, `hold`), `math.js` (pure angles, clamps and easing curves, no imports).
- `beat-grid.js` — song seconds ↔ fractional beat on a song's `beats` grid (`timeAtBeat`, `beatAtTime`): linear inside
  each beat; before the first and after the last, that beat's length carries on.
- `mock-board.js` — `MOCK_BOARD`, whether the in-memory leaderboard is on; its own module because the vm tests cannot
  inline `import.meta` and supply it themselves.

## `src/game/`

The rules, no drawing, except `flow.js`, `judge.js` and `tick.js` (one frame of the rules: finale triggers, meters,
autoplay), which orchestrate `hud/`, `scene/` and `ui/`.

- `state.js` (`G` and who owns each field, `chip`, `clock`, the song clock, held keys), `flow.js` (splash → select →
  run/practice → finish → final), `judge.js` (hits, GUAPA pairs, holds, balloons, collapse, autoplay/advance).
- The pure logic: `chart.js` (`makeDanceChart`, `DIFFS`, `BALLOONS`), `progress.js` (quality %, stars, `WINDOWS`),
  `energy.js` ("l'ànim de la plaça"), `practice.js` (first-game `STEPS`), `calibration.js`, `dance.js` (the old beat
  choreography and the dance factories). The Mulassa's reference-led dance is `figures/mulassa/mula-*.js`.
- `showreel.js` — the selector's showreel: the selected figure's whole song dance on the menu loop's beat, a song beat per
  menu beat, and its shot list, cuts on the loop's bars.
- `bubble-rules.js` (when the crowd may talk), `judge-words.js` (the small line under the judge word, `JUDGE_WORDS`, and
  the error kinds `judge.js` files by it).
- `figure-catalog.json` (names, towns, entities and primary sources), `figures.js` (playable/Aviat registry, portraits,
  per-figure level memory and record keys), `figure-progress.js` (what the project has of each pending figure, kept by
  hand: `MATERIALS`, `progressOf`).
- `figure-song.js` — the active figure and song as live bindings (`selectedFigure`, `song`, `BEATS`; `BEAT` is only the
  mean beat, never a clock), switched by `setFigureSong`.
- `figure-theme.js` — each figure's two buttons' words and colours (GUA | PA, CRE | MA, BRA | MA), pure; the HUD and
  `ui/figure-theme-dom.js` subscribe with `onTheme()`.
- `records.js` (the device's record per level and version, the previous dance's read-only), `stats.js` (the device's
  statistics, per owner: counters per `figure/version/level` bucket, practice, days played; pure), `score-scale.js`
  (score versions and families: `mulassa-v3`, `drac-v1` and `bou-v1` raw, the older versions readable as history only).
- Catalog thumbnails use native pixel cells and palettes in `figure-portraits.js` (the figures beyond the Camp de
  Tarragona in `figure-portraits-far.js`), rendered through the original `pixelSvg` component.
- Photo mode: `photo-control.js` (its rig) and `photo-touch.js` (on a touch screen: a floating stick under the left
  thumb, a drag to look under the right one).

## `src/figures/`

- One folder per playable figure (`mulassa/`, `drac/`, `bou/`): its model, rig, dance, feet, colla, festa and portrait
  modules, moved together so a figure is one unit. Each, the Mulassa too, builds and owns its model and colla.
  - `<key>-objects.js`, with a line in `figures/objects.js` (`COLLAS`, `figureRoot`, `hideFigures`, which the low layers
    go round; `scene/stage.js` keeps only the plaça).
  - `<key>-scene.js`: its stage hooks (shown, colla, motion, share photo, «Mira el ball» film); its motion in `<key>-play.js`.
  - `<key>-crowd.js`: what it does to the crowd (rooted, posed, steered, its festa), a line in `scene/crowd-effects.js`,
    with one line in `scene/figure-scenes.js` (tests/figures/common/scenes.mjs keeps them in step).
  - `<key>-portrait.js` (the selector's vector portrait) and `<key>-clip.js` («Mira el ball»'s shots).
  - Outside the pattern:
    - The Mulassa: `mula-pose-rig.js` (pure pose → rig, shared with the editor).
    - The Drac: `drac-motion.js` (the rig driven by a dance pose, locked to the beat), `drac-feet.js` (the carrier's
      planted, seekable steps), `drac-show.js` (its fire and powder wired to the game), `drac-demo.js` (its dance off the
      song, on the splash and selector).
    - The Bou: `bou-tail.js` (tail physics), `bou-musicians.js` (its approved roster for the representation explorer).
- `common/` — what every figure builds on:
  - `colla.js` (a figure's colla: helpers round the dance and seated members, one skinned mesh each; `update(beat,
    energy)` is a pure function of the beat) and `colla-run.js` (the run's state a colla follows, refreshed in place).
  - `fire.js` (the fire out of five carretilla tubes: the jets and the flamarada, for the Drac and the Bou) and
    `night.js` (the plaça at night for a figure's festa: `nightLook`, `plazaNight`, a self-lit `glowMaterial`).
  - The music video camera of "Mira el ball": `clip-camera.js`, `clip-shot.js`, with each figure's shots in its
    `<figure>-clip.js`.
- `index.js` — the traits table (`FIGURE_TRAITS`: short name, drumroll element, article, share file and caption,
  challenge, play camera, free-play clearance and keys, the PHOTO body it drives, whether M is its own body, splash
  host/partner, landing shake). The shared systems read a trait instead of testing an id; a new figure adds its folder
  and one row (tests/figures/common/traits.mjs keeps them in step).
- `unreleased-bou.js` — what a build gets in place of the Bou's modules while it is unreleased
  (`tools/deploy/unreleased-figure.mjs`): every name the shared code imports from `figures/bou/`, as "no Bou".

**Figure hook registries.** A new figure adds one row or line to each and nothing else in `scene/`:

- `figures/index.js` `FIGURE_TRAITS` (data, `tests/figures/common/traits.mjs`).
- `figures/objects.js` (its model and colla; `tests/build/modules.mjs` keeps the low layers going through it).
- `scene/figure-scenes.js` (stage hooks) and `scene/crowd-effects.js` (what it does to the crowd), both kept in step by
  `tests/figures/common/scenes.mjs`.
- A figure's folder owns `<key>-objects.js`, `<key>-scene.js`, `<key>-play.js`, `<key>-crowd.js` and `<key>-portrait.js`
  (the Mulassa's prefix is `mula-`), and its song is `src/song-<key>.json`.
- No figure-id check outside `src/figures/`: add a trait or a hook.

## `src/scene/` — the 3D world

- `stage.js` (renderer, scene, lights, plaza, mulassa, the play camera's direction), `quality.js` (a render-quality
  level applied), `sky.js` (the gradient dome and the ring of voxel clouds; its top colour is live for the night looks).
- The crowd:
  - `crowd-build.js` (who stands where); `crowd.js` (`animCrowd` = `updateMood` → `steer` → `separate` → `pose` →
    `poseScenery`; the mood is the `mood` object in `crowd-mood.js`, the neighbour grid `crowd-grid.js`, the pose
    `crowd-pose.js`).
  - `crowd-contact.js` (contact geometry shared by the simulated ring and its eased drawing; the still backdrop's
    contacts read only when its instances change), `crowd-fx.js` (the ripple).
  - `rotllana.js` (a figure's rotllana: the plaça cleared to one round ring of people, the band in its front row;
    `setRotllana` runs every frame).
  - `representation.js` (+ `representation/`: the public's, musicians' and attendants' looks drawn over the crowd's rigs;
    approved weights in `src/scene/representation/population.js`; `?representation=off` = the original cast). In it:
    `rig.js` (rig dimensions shared by the builder and the gallery poses), `props.js` (the skirt, the wheelchair, the
    cane), `normals.js` (skin normals that survive the skirt's shear), `live-pose.js` (live transitions and travel over
    the deterministic poses), `role-models.js` (the band's and attendants' roles and gestures).
- `stage-motion.js` — the frame of the figure on show: resets, free play's start and end, the splash pair. Every figure,
  the Mulassa too, moves through its hooks in `figure-scenes.js`; the shared springs and `M` are `figure-springs.js`,
  free play's jumps and shake `manual-jump.js`.
- Cameras: `cameras.js` (the menu camera), `still-drift.js` (the selector's held shot kept alive by a slow drift round
  the cut's focus; held under reduced motion), `colla-dodge.js` (the showreel keeps clear of the colla), `play-camera.js`
  (`framePlayCamera`), `framing.js`, `orbit.js` (pure camera helpers).
- Photo mode: `photo-camera.js` (one rig owns position and aim under manual control), `photo-motion.js` (the scene
  adapter for walking), `photo-collision.js` (the body's rounded footprint), `photo-obstacles.js` (spectators' footprints
  and the bounded slide that moves nearby ones).
- Effects and captures: `confetti.js`, `fx.js` (finale lights, fireworks), `share-capture.js` (`renderHero`),
  `balloon3d.js` (the GLOBUS balloon in 3D).
- `models.js` → `models/*.js` (voxel models by subject), among them `plaza.js` (buildings, balconies, flags, trees,
  lamps, the ground), `band.js` (the band, the cobla and the grallers), `colla.js` (the colla bodies and the Drac's
  colla suit) and `colla-seated.js` (the seated members' postures).

## `src/hud/` — everything drawn on the 2D canvas

- `canvas.js` (size, K, safe areas, resize), `sprites.js` (palette + text sprite cache), `text-wrap.js` (line breaking
  for canvas text, CJK included), `primitives.js`, `layout.js`.
- `lane.js`, `top.js`, `praise.js`, `bubbles.js`, `banner.js`, `title.js`, `results.js`, `warm.js`, `balloon.js`,
  `esquellot.js` (the Bou's GLOBUS: a bell swinging on its strap, rung by each tap), `draw.js` (`drawHud`).
- `stars.js`, `logo-motion.js`, `share-card.js` (its JPEG encoded off the main thread by `card-jpeg-worker.js`).

## `src/ui/` — the DOM

- Wiring: `handles.js`, `sheets-setup.js`, `input.js`, `controls.js`, `pause.js`, `pause-actions.js`, `pad.js`
  (haptics: `platform/haptics.js`), `focus.js`, `src/ui/backdrop.js`, `fullscreen.js`, `keyboard-room.js` (fits the
  open sheet above the on-screen keyboard: `<html data-kb>`, `--kb-*`), `audio-resume.js` (back from another app, the
  next tap wakes the sound; a stall is reported only if a tap with focus does not).
- `figure-theme-dom.js` — the page follows the selected figure's buttons: custom properties and `fig-drac`/`fig-bou` on
  their only readers, not on `<body>` (that restyled ~370 elements a tap).
- The sheets:
  - `board-ui.js` (+ `publish-ui.js`: the publish sheet; `publish-land.js`: the bookkeeping after a run reaches the
    board), `board-list.js` (the Classificació sheet's list; `board-reads.js`: the selector's reads of the boards),
    `figure-picker.js` (the figure dropdown shared by Classificació and the Saló de la fama).
  - `profile-ui.js`, `account-ui.js` (Perfil: profile block, statistics, podiums, previous record, the statistics
    notice), `stats-view.js` (the statistics' tiles, private or public), `player-card.js` (a player's public card),
    `profile-notes.js` (how a name shows: the confirmed check, a guest, a released name), `confirm-gate.js` (hearts and
    the Bústia need a confirmed e-mail: says why and runs the request after confirmation).
  - `seasons-ui.js` (season calendar and words, the Saló de la fama; the end-of-season sheet is `season-end-ui.js`; the
    per-owner get_seasons cache).
  - `share-ui.js`, `feedback-ui.js`, `sync-sheet.js`, `install-app.js` (⚙ Configuració's "Instal·la l'app": Chromium's
    install prompt, or the browser's own steps), `device-hint.js` (the device tips: hardware acceleration, iPhone home
    screen), `lang-rules.js` (the language picker's pure rules: the reload URL, who gets the suggestion).
  - Helpers: `sheet-kit.js` (status line, busy button), `sheet-fade.js`.
- Badges: `player-badges.js` (the ids a confirmed player can show instead of the check, and their images for the share
  card), `badge-svg.js` (a badge's art by id, without the main game's i18n, so a mini-game's board can draw it),
  `badge-art.js` (the drawings), `badge-names.js` (their names), `badge-picker.js` ("Tria insígnia", a draft until the
  server saves it), `badge-tip.js` (re-exports Plassa's `badge-tip.js`).
- The selector:
  - `select-ui.js` (main selector, town pills, records and inline pending information; its keys and layout measure are
    `select-keys.js`, `select-layout.js`; its one paint under the page cover, so the splash's tap does not pay its GPU
    programs, is `select-warm.js`), `select-strip.js` (the strip and pills as HTML strings, the pixel portrait, the
    cards' hearts, the rows' peeking gap).
  - `select-flip.js` (a pending figure's re-layout slides by a transform instead of jumping: no layout shift),
    `level-stats.js` (step 2's level row), `select-podium.js` (step 2's podium on tablets and desktops),
    `select-standings.js` (the desktop column: device medals and the figure's open board).
  - `selector-portraits.js` (the selector's vector illustrations and traced silhouettes), `pending-silhouettes.js`
    (+ `pending-silhouettes-more.js`, `pending-silhouettes-third.js`: hand-drawn silhouettes of the pending figures, by wave), `pending-panel.js` (the pending
    figure's panel), `pending-title.js` (its title fitted to two lines).
  - `figure-entities.js` (catalogue attribution: labels, card credits and their marks), with the marks
    `bou-valls-logos.js` and `pessigolla-logo.js` (local adaptations, not official assets) and `uaf-logo.js` (the UAF's
    flame for the credits).
  - `figure-hearts.js` (a figure's heart: optimistic tap, undone if the server refuses), `greeting.js` (what the idle
    selector tells a profile), `games-tip.js` ("Més jocs!" beside the games button), `watch-ui.js` ("Mira el ball": the
    demo's button, its DEMOSTRACIÓ label and end sheet; the run is `game/flow.js` `startWatch`).
  - `reel-fade.js` (the showreel's cuts as live dissolves over `#reel-fade`), `splash-turn.js` (which figure the splash
    shows this load, from a visit count in storage).
- Photo mode: `photo-stick.js` (the touch controls: the stick, the jump and the figure's moves), `photo-icons.js` (their
  pictures), `mouse-look.js` (desktop mouse look under Pointer Lock), `free-music.js` (its radio).
- `loader.js`.

## `src/services/` — talking to the outside

- `leaderboard.js` and its parts: `leaderboard-rules.js`, `leaderboard-result.js`, `leaderboard-errors.js`,
  `leaderboard-identity.js` (the stored name, `savedName`/`refreshIdentity`), `leaderboard-code.js` (the profile's
  e-mail code flow), `leaderboard-own.js` (what only the signed-in profile reads and writes about itself),
  `leaderboard-badges.js` (the reads that carry badges, falling back only when the function is missing),
  `supabase-client.js`, `alias-rules.js`.
- `stats-sync.js` (uploads the device's statistics to the open profile), `seen-notices.js` (the one-time sheets a profile
  has seen, on the device and the server, each with a unique id: a new once-per-profile sheet uses it; device-only hints
  do not).
- `feedback.js` — client of the `workers/feedback` Cloudflare Worker (`VITE_FEEDBACK_URL`). The Worker checks Turnstile
  and e-mails each message to the `FEEDBACK_TO` secret; nothing is stored. Never put a personal address in the repo.
- `captcha.js` (Turnstile), `share.js`, `errors.js` + `sentry-load.js`.
- The home-screen app's update check: `update.js` + `update-rules.js`, over `update-watch.js` (on waking, compare
  `/version.json` with ours and reload on a newer build, only when the page says it is quiet; the mini-games use it too).

## `src/platform/`

- `audio.js` (`Chip`: song + menu loop + SFX), with `audio-clock.js`, `audio-load.js`, `audio-voices.js`,
  `audio-radio.js`, `audio-session.js` (the iOS audio session type per screen) and `landing-sound.js` (free play's
  landing thud, `playThud`).
  - The ovation is the recorded `public/sfx/applause.mp3`, built by `tools/music/build_applause.mjs` and decoded off
    the main thread in `audio-voices.js`.
  - `clicker.js`: the calibration's `Clicker`.
- `render-quality.js` (adaptive DPR/quality, frame pacer), `storage.js` (the one localStorage adapter), `polyfills.js`,
  `double-tap.js` (re-exports Plassa's `double-tap.js`).

## `src/i18n/` and `src/music-form/`

- `src/i18n/` — the UI's languages: `locale.js` (the effective language, read once at startup), `load-locale.js`/`preload.js`,
  `messages.js`/`catalog.js`, `apply-dom.js`, `format.js`, `fonts.js`, `boot-jokes.js`, `pseudo.js` (`?lang=pseudo`),
  `locales/<code>/`; the saved choice is written only by `ui/lang-ui.js`.
- `src/music-form/` — compiles a figure's music form into the song JSON (`compile.js`, `songs.js`; contract in
  `CONTRACT.md`); `revision.js` is a form's revision (sha-1 of its canonical JSON, imports nothing).

## The mini-games

- `src/jocs/menu/` — Mulassa Games, the games' selector, its own page at `jocs/index.html` (mulassa.cat/jocs), on Plassa:
  `main.js` (composition root: the cards' navigation, the speaker), `carousel.js` (the row and the hero),
  `hero-video.js` (the chosen game's clip), `music.js` + `music.mp3`/`music.json` (its lo-fi loop,
  `tools/music/build_games_menu.py`), `i18n.js` (its words), `install.js` ("Instal·la l'app": a chunk of its own, the
  steps sheet warmed under the menu), `style.css`, `locales/`.
- `src/jocs/install.js` (a game page's install button) and `src/jocs/main-sheets.js` (`mountMainSheets`: mulassa.cat's
  own sheets on a game page, the ones it names in `<!-- mulassa-sheets: … -->`).
- `src/jocs/games/<id>/` — a mini-game, its own page and its own code (docs/jocs/README.md). `pop/` is Mulassa Pop, at
  `pop/index.html` (mulassa.cat/pop):
  - `main.js` (composition root), `rules.js` (no drawing), `board.js` (the 3D board), `rigs.js` (postures, rigs, the fake
    figures' colours), `models.js` (the voxel models), `board-sparks.js`, `board-blast.js` (the game-over blast: its
    waves, flings, colours and flash; `fresh.js` keeps each draw from repeating the last), `audio.js` + `sequencer.js` +
    `melody.js`, `autoplay.js` (dev `?autoplay`), `locales/`; its models review page is `tools/dev/pop-models.html`.
  - Outside `src/jocs/` and Plassa it still imports mulassa.cat's modules, a transitional exception until they move into
    Plassa (`packages/plassa/docs/inventari.md`): `core/version.js`, `figures/` (`drac`, `mulassa`), `i18n/`
    (`apply-dom.js`, `messages.js`), `platform/audio-clock.js`, `scene/models/voxel.js`, `services/` (`captcha`,
    `leaderboard`, `leaderboard-identity`, `supabase-client`), `styles/` (`board`, `feedback`, `profile` CSS), `dev/`
    (`mock-leaderboard.js`, dynamic, dev only), `ui/` (badges, profile, feedback, language, `confirm-gate`, `sheet-fade`)
    and `three`.
- `packages/plassa/src/` — the mini-games' own library (look, keyboard, UI sound, the page's life and audio, boot, errors,
  update check, words, best score, the modal sheets and the general settings layer): copied and consolidated from
  mulassa.cat, which does not use it yet (docs/jocs/README.md, "Shared base"; skill `mulassacat-minijoc`).

## `src/dev/`

Only the dev modes the game itself reaches, gated to dev hosts (except `perf.js` and `vp-label.js`, also on public hosts).
Nothing in it may be imported statically unless it is tiny: the published game downloads every static import.

- `mock-leaderboard.js` — the in-memory leaderboard behind `?mock`/`?final`/`?demo`: the real service over a fake client
  (`mock-client.js`) and a seeded world (`demo-data.js`), both loaded on its first call.
- Loaded with `import()` only when asked for: `account-review.js` (`?final&review=`), `cam-edit.js` (`?cam`),
  `sizes-edit.js` (`?sizes`), `reel-proposal.js` (`?reel=A|B|C`: the showreel and "Mira el ball" play a proposal from
  `tools/dev/reel-review/proposals.js`, naming each shot).
- `perf.js` (`?perf`), `debug.js`, `final-test.js` (`?final`).

## `tools/`

- By kind:
  - `music/` (the generators, the form compiler, the music editor's dev backend).
  - `qa/` (GPU captures, the UI inventory and videos, review and audit scripts; `qa/device/`: measuring on the real
    phones, `docs/agents/device-profiling.md`).
  - `deploy/` (the public pages, the Pages allowlist, Cloudflare), `data/` (database backups, leaderboard cleanup, score
    ceilings), `bestiari/` (reference-video research).
  - `ui/` (`build-escuts.mjs`: the selector pills' town arms as PNGs, `public/escuts/` + `src/ui/escut-files.js`,
    committed; `npm run build:escuts` after any change to an arm).
  - `dev/` (below).
- `tools/dev/` — the dev-only HTML pages and their code, served by `npm run dev` at `/tools/dev/…`, never built
  (`vite build` reads `index.html` only):
  - Editors: `editor.html` + `tools/dev/music-editor/`; `bou-clip.html`, the Bou's music video editor (the game in a frame
    playing "Mira el ball", which it films with `src/figures/bou/bou-clip.js`'s cameras; the owner's notes go to
    `tools/dev/bou-timeline/notes.json`, view `clip`, through that tool's dev backend).
  - Comparisons: `drac-compare.html` + `drac-compare/`, `mulassa-compare.html` + `bestiari-compare/`.
  - The Mulassa: `mulassa.html` (the model and its song dance, ?from=N), `mulassa-contrast.html`,
    `notes-propostes.html` + `notes-propostes/` (the Mulassa's three charts against three proposals, playable, with a
    per-level note editor that exports JSON).
  - The Bou: `bou-dance.html`, `bou-review.html`, `notes.html` (the Bou's audio with the score note sounding, per voice,
    to point at one).
  - Others: `colla-preview.html`, `musics.html` (the musicians, orbiting them as they play), `reel-review.html` (the
    showreel and "Mira el ball" live at several viewports side by side, with its shot plan, refs M1…, D1…, over the
    dance parts).

## Generated files and generators

- `src/song-mulassa.json` — **generated** (never hand-edit): bpm, beats, sections, finale, end, notes
  `[t, don|ka, level, big, holdEnd]` (`holdEnd`: a time, 0, or one per level), hashed audio URLs.
- `src/song-bou.json` — **generated** by `node tools/music/build_bou_chart.mjs` from the approved package in
  `music/bou-tradicional/` (the MP3 is copied byte for byte, never re-encoded).
  - The Bou's model, dance, colla, festa and final are described in `docs/figures/bou.md`.
  - Its score version `bou-v1` supports online results and statistics in 1.4.0, after
    `supabase/migrations/202611150001_bou_board.sql`; local record keys remain unchanged.
- `tools/music/build_drac.py` — the Drac's generator (form `music/drac/drac-form.json`, Festiva arrangement, tempo map fitted to the
  reference video, `song-drac.json` with its `ref` time map); `docs/figures/drac-music.md`. Mulassa audio must stay bit-identical.
- `tools/music/build_taiko.py` — the **single** generator of all music and the chart, from `music/mulassa/score.json`
  (the melody). Writes `public/music/mulassa-taiko.{wav,mp3,mid}`, `mulassa-taiko-ambient.mp3`
  (the `.mid` scores are versioned, not deployed; the `.wav` stays ignored), `music/mulassa/taiko-arrangement.json` and `src/song-mulassa.json`. Musical/game rules: `music/README.md` (Catalan).

## Tests

- `check.mjs` (chart invariants) + `tests/` (node, no browser), by area: `figures/<mulassa|drac|bou|common>/`, `game/`,
  `render/`, `ui/`, `services/`, `db/`, `build/`.
- `tests/run.mjs` finds every test by itself (a file no other test imports; check.mjs and `tests/build/modules.mjs` first,
  Python tests listed; run in parallel, real-browser and self-timing tests alone at the end). `build/modules.mjs` checks
  the shape of `src/`.
- `tests/render/render-quality.mjs` runs the game's systems together in a mocked DOM (`game-context.mjs`:
  `nodes.get(id)`, `run(code)`) for HUD/sheet/game contracts, one file per area run in its order on one shared game.
- `tests/render/load-main.mjs` concatenates `main.js` and every module it reaches (except the ones the context provides)
  into ONE script, so the snippets can read and assign the systems' top-level names. A module you add is picked up by
  itself, but keep its imports on one line and its top-level names unique (the harness fails naming both files when two
  inlined modules declare the same one).
- `tests/ui/page.mjs` reads `index.html` with the linked CSS put back inline; `tests/game/onboarding.mjs` practice + sync;
  `tests/game/energy.mjs` ànim tuning; `tests/game/bubbles.mjs` crowd bubbles; `tests/build/audio.mjs` loading/wake.
