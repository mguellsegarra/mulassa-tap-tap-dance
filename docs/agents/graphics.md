# Graphics and performance

- No per-frame allocations in the loop: reuse vectors, pools and arrays.
- Voxel models: avoid coplanar faces (z-fighting); offset or merge instead.
- **Figures' dances and fire** (the Mulassa's figures on the song's beats, the Drac's dance in reference seconds and its fire): `docs/figures/dances.md`; the Bou's in `docs/figures/bou.md`. Never add random motion to a song choreography; one time map per figure.
- **Play camera** (`framePlayCamera`): `docs/scene/play-camera.md` and the `mulassacat-camera` skill. Shake is additive, never fed back into the springs.
- **HUD scale, frame pacing**: `docs/scene/rendering.md`. Everything that moves uses real time (`dt`, `clock`, song time): no per-frame factors and no per-frame random chances; the rAF rate a device reaches is all the pacer sees.
- **Crowd and plaça** (the crowd's groove and moods, the ripple, making way, the instanced backdrop, sky, props): `docs/scene/crowd-and-plaza.md`. Nobody is knocked over in the game; crowd motion is tested per frame.
- Canvas: pair every `save()` with `restore()`; reset `globalAlpha`, shadows and clips.
- HUD cost: outlined text goes through `text()` / `bigWord()`, which blit cached sprites (stroked glyphs every frame
  were the iPad's stutter); no `shadowBlur` (use `glowPath()` / `glowDisc()`); the HUD canvas is capped by a pixel
  budget (`hudScale`); no layout reads per frame (`playBottom()` caches the pad's top). Input is judged at the event's
  timestamp on the de-stepped song clock (`press(dir, e)`), never at frame time.
- Hitches (first uses): animated text sizes use `text(..., grow)` (one sprite, scaled) instead of a new sprite per size;
  at most `SPRITES_NEW` new text sprites a frame (the rest drawn directly that frame); big words share one outline sprite
  per word/size (`bigWord` rim) and words needed on a beat are painted ahead (`warmStart`, `warmups`; on the splash the logo first). Every program,
  hidden objects and the GLOBUS stills' sRGB pass included, is compiled up front (`precompile`), and again
  (screen only) after a quality step. Never share one material between plain and skinned/instanced meshes.
- Mobile GPUs: respect `render-quality.js` profiles; don't raise DPR or shadow cost casually.

## Performance rules

- DOM over the canvas: no style written every frame (a CSS variable, an inline transform) and no animated `background-position`, gradients or an animated `<svg>`: each restyles and re-layers the page every frame, CPU-painted on Linux Chrome (the menu's dancing gamepad cost ~10 ms a frame on a 2016 MacBook and a ThinkPad X230). Animate `transform`/`opacity` of an HTML box (CSS or `el.animate`) and correct it rarely.
- Budget per quality profile: every new object type states its draw-call and triangle cost and which profiles show it; measure with `?perf` before and after (`?perf=sync` for the GPU side) and stay inside the profile's numbers.
- One `InstancedMesh` or merged mesh per visual role; no skinned mesh per person or per prop. Record the new bone / skinned-people count in the `?perf` check: bone matrices are re-uploaded every frame.
- Shadow casters are an allow-list: a new mesh is `castShadow = false`, and only gameplay-relevant ones turn it on, at medium/high. A change to lights or colour fx re-checks the shadow programs (`material.needsUpdate`).
- A new material, hidden mesh or shader variant must be reachable by `precompile`; check a first-use capture for a compile hitch.
- Whatever is created at runtime and removed (render targets, canvas textures, geometries) has a named owner that calls `dispose()`; leak checks read `renderer.info.memory` after repeated use. Scene objects are built once and toggled (`docs/architecture.md`, Lifetime).
- No synchronous GL reads (`readPixels`, queries) in the frame loop, except under `?perf=sync` and the one-off GLOBUS stills.
- Real-device checks play a full song, not a short burst, and report device, thermal state, refresh rate and the `?perf` summary.
- No WebGPU, `BatchedMesh` or KTX2 without a measured need; list the `onBeforeCompile` / `ShaderMaterial` patches that would have to be rewritten first.

## DOM blocking costs (measured lessons)

The page's own DOM, not the 3D, made the selector «choke» on phones (2026-11-03, Galaxy S10 Chrome 156, DPR 3.5,
medium quality). Chrome rasterizes the DOM on the same GPU thread as WebGL, so a slow DOM frame or raster stalls the
dance behind it. Each was found by A/B on the device (hide or drop one thing, measure again), not by reading code;
the method and its tools: `docs/agents/device-profiling.md`.

- **Size containers on repeated items.** `container-type: size` (for `cqw`/`cqh`) on the 50 card portraits made every
  document-wide restyle lay each container out on its own: `showModal()` of any sheet took ~300 ms (the stats notice at
  entry: 440 ms, 357 ms of layout), and a figure change and the UI hiding into the idle dance paid it too. Fixed by measuring
  the box once (`ResizeObserver` → `--por-w`/`--por-h`, select-layout.js) and plain `contain`: sheets ~45 ms (all these: the
  synchronous `showModal()` plus its forced layout, `tools/qa/device/android-cost.mjs`). A container
  query only on single elements, never on a list.
- **`:has()` over toggled state.** `#feedback-menu:has(.x:not([hidden]))` (18 rules) re-ran on every `[hidden]` toggle
  anywhere in the page, the sheet shut: ~55 ms of style on each figure change. The owner sets an attribute instead
  (`data-choose`, `data-choices`, `data-entity`); figure change 122 → 65 ms (→ 36 ms with the containers gone).
- **Inline SVG on a screen's first paint.** The 33 town arms (832 SVG nodes) cost ~300 ms of GPU raster when the
  selector first showed; drawn once to bitmaps (`escutBitmaps`, escuts.js): 750 → 475 ms. The same arms as an SVG `<img>`
  saved nothing, and the card portraits as PNGs did not change the sheet cost: the format is not the cause until measured.
- **A layer's raster mode flips (MSAA).** Chrome rasters a layer with MSAA when it has ≥ 6 slow paths and no
  non-antialiased paint; the card strip's only non-AA paint is the pending cards' dashed edge (`.sel-card.aviat::after`).
  Those cards are `content-visibility: auto`, so on the frame the idle screen's `content-visibility: hidden` went they were
  not painted yet, the strip flipped to MSAA and Skia built ~50 GPU programs in one flush: up to 0.4 s (52 builds, 17 real
  compiles, 413 ms) the first wake after a Chrome install or update; later wakes and later sessions hit the driver's
  persisted cache. Fixed by showing the UI two frames after `data-reel-gone` drops (`reelWakeHold`, ui/reel-idle.js):
  51-52 builds → 0-1 (2026-11-13, S10 Chrome 157). Anything that hides the strip and shows it again, or a scroll that
  leaves no dashed card near the viewport, can flip it the same way. Found by Fable 5.2's traces (Skia op tracing).
- **What did not matter here**, so do not «fix» it without numbers: network requests (a guest's are two small RPCs; a
  `fetch` never blocks), the idle dissolve's WebGL→2D copy on Android, steady-state CSS animations (no repaint measured).
- **The same, only on small phones.** Short phones (375×667, 320×568: iPhone SE/8) made each of the 84 cards a size
  container for the squat layout: every sheet opening ~500 ms there (S10 emulating 375×667: notice 537, board 538,
  profile 497 ms). A `ResizeObserver` on one card sets `data-squat` on the strip instead: 28 / 53 / 46 ms. Measure at
  the small viewports too: a media query can hide a cost from the phone you hold.
- Audited and left (S10, 2026-11-03): the remaining 62 `:has()` together cost ~10-15 ms a sheet opening; the board opens
  in ~50 ms (757 SVG nodes, no raster cost found); the seasons sheet's first raster varied 0-258 ms with or without its
  SVGs (noise, no owner found).
- **Invisible UI is not free.** The idle reel faded the selector and its corner buttons to `opacity: 0`; on an iPhone in
  Low Power Mode Safari kept compositing those layers (and the CSS animations inside them) under the dance: 96/42 ms frames
  for seconds, 12-32% of the frames over 80 ms, with the JavaScript at 8-10 ms. A/B on the phone, 30 s each: the UI left
  visible 0%, `display: none` 0-0.5%, `visibility: hidden` 17-27% (no help), `content-visibility: hidden` 0%. Fixed with
  `data-reel-gone` once the fade is over (`ui/reel-idle.js`, `select-sizes.css`: `content-visibility: hidden`, and
  `contain-intrinsic-size: auto none` so the boxes keep their size and the selector's observers see no change).
- **A WebGL canvas that changes size makes a new buffer.** Mulassa Pop's splash tap shrank the home's live figures
  (`--k` and another box): `renderer.setSize` stalled that frame 75-146 ms on the S10 (the GPU making the buffer, WebGL
  waiting on it), just as the title glided (2026-11-10). The splash now stretches the home's buffer (hero.js `fit`, same
  aspect); the tap takes no task over 50 ms. A box that only scales keeps its buffer; `tests/render/prod-play.mjs` guards it.
- **Low Power Mode is a cadence, not overload.** An iPhone's Safari alternated 30 and 24 Hz (41.7 ms frames, five
  refreshes of its 120 Hz screen) with the CPU at ~10 ms; the quality monitor read 24 Hz as overload and fell from medium
  to minimal mid-song. `render-quality.js` CAP now covers 24 Hz, a frame one refresh late keeps the run, and a capped frame
  is slow only past 1.4× the cap's own interval; frames a refresh late count as slow once they are over 30% of a window
  (a busy 120 Hz GPU alternating 41.7/50 ms is overload, not a cap: found by review; `tests/render/low-power.mjs`).
- Ruled out on the way, by measurement: the idle reel's dissolve (frames after a cut were no slower), any one camera shot,
  the WebGL→2D copy, the heap collector (cutting the garbage 25-43% left the bursts as they were; the cut stays, guarded).
- Still open: ~475 ms of GPU raster on the selector's first show (text, gradients and shadows at DPR 3.5), and on the
  iPhone a 1.5-3.6 s freeze after the first frame with no JavaScript running. Keeping the loader up until frames settle was tried
  and did not help (the warm-up outlasts any reasonable cover).

**Never again** (`tests/build/css-costs.mjs` enforces the first two):

- No `container-type` on a list's items (cards, rows, cells): a query container is laid out on its own on every
  restyle. Single elements only, listed in the test; a list's sizes come from one `ResizeObserver` as CSS variables or
  an attribute (select-layout.js).
- No new `:has()` without its cost measured on the device: the count is a ratchet. Never `:has()` over toggled state
  (`[hidden]`, a class, `:checked`) on a broad subject (`body`, a sheet): the owner that toggles it sets an attribute.
- No repeated or detailed inline SVG on a screen's first paint (arms, icons in lists, big pixel art): measure its GPU
  raster; draw it once to a bitmap when it costs. A vector in an `<img>` is not a fix by itself.
- No garbage per frame (`tests/render/alloc-budget.mjs`, in `npm run check:gpu`, holds the splash and the idle reel to a
  MB/s budget and fails on any material re-evaluated every frame). Found on 2026-11-03, 12.8 → 7.3 MB/s on the splash:
  `Math.hypot(a, b, c)` in a per-vertex loop boxes its numbers every call (use `Math.sqrt(a * a + …)`); an array reused
  every frame and emptied with `length = 0` is freed and grown again (keep a count beside it, `crowd-grid.js`); three.js's
  one shadow depth material shared by plain, instanced and skinned casters re-evaluates its program at every switch
  (give each kind its `customDepthMaterial`: `models/people.js`, `mula-carriers.js`). Measure with `tools/qa/alloc-profile.mjs`.
- No UI hidden only by `opacity: 0` or `visibility: hidden` over the 3D for longer than its fade: once faded, stop rendering
  it (`content-visibility: hidden` with `contain-intrinsic-size: auto none`, or `display: none` when nothing measures it).
  Safari composites invisible layers every frame.
- No heavy generation on the main thread while the page loads or the splash runs: the applause synthesised a few people
  per timer slice was 15% of an iPhone's splash JavaScript. Build it once into a file (`tools/music/build_applause.mjs`,
  decoded by the browser off the main thread) or move it to a Worker.
- No fix without the before/after numbers on the device (AGENTS.md, Process): two measured «obvious» causes here
  (the portraits as PNGs, the dissolve) changed nothing.
- A sheet's first paint compiles Skia's Vulkan pipelines (`VulkanCreateGraphicsPipelines`, 17–39 ms each, in
  `RendererRasterWorker` GPU tasks) for every kind of paint the page has not drawn yet: no single rule owns it, each new
  look (a full-screen `::backdrop` dim over WebGL, a gradient fill, a blurred shadow, an animated gradient) adds some.
  Painting a copy at 1% opacity does not warm them (another blend); painting it as it will look, not modal (`show()`,
  so under the boot screen, not in the top layer), does. mulassa.cat does not pay it at its first ⚙ because the selector
  already drew those paints (its own ~475 ms first raster, below). S10, 2026-11-10, Pop's first ⚙ (mulassa.cat's sheets):
  frame 435–469 ms, GPU 188–196; without the dim (`packages/plassa/src/sheets.css`) 352 ms, GPU 123–129; painted once
  under the boot screen, with the 3D's first frame (`settings.js` `warm`, Pop's `main.js`) 34–67 ms, GPU 9–33. The cost
  moves to the boot screen (one more ~350 ms frame there, the boot as long as before, 3.2–3.3 s). Every later sheet: 34–67 ms.
- A full-screen dim that is not a layer of its own is merged with what lies under it and repainted, at DPR 3.5, the first
  time it shows: Pop's dim behind a sheet (mulassa.cat's look) cost the first ⚙ 168–201 ms whether it was the dialog's
  `::backdrop`, a plain element, opaque or not, warmed under the boot screen or not (a colour covered by an opaque layer is
  not drawn at all). `will-change: transform` on the dim element (`sheets.css` `.sheet-dim`) made it a solid-colour layer:
  the first ⚙ 34–67 ms. The Bústia's confirm notice copies the publish sheet's seal and perks: that sheet is warmed too
  (first notice 100–117 → 34–67 ms).
- What the page cover already pays, and what it does not. Under `#loader` the game compiles the 3D's shaders (`precompile`),
  paints the HUD canvas's big words once (`warmups`, `hud/warm.js`), waits for the fonts and for the plaça to run smooth
  (`COVER_SMOOTH`, `main.js`), and shows the selector once (`ui/select-warm.js`, below). That covers WebGL, the 2D canvas
  and the selector's DOM. It does not cover anything else in HTML and CSS that first paints later: a sheet, a tip, a
  notice, a new panel. Each of those still compiles its GPU programs at its first show, right when the player is looking.
- The selector's first show paid the same compiles (~125 programs, two ~300 ms frames right under the splash's tap): it is
  rehearsed once under the page cover instead (`ui/select-warm.js`, `select-ui.js` `visible(on, rehearsal)`: shown inert,
  the host told nothing, the challenge's level kept, then hidden; only when the cover lifts on the splash). S10, 2026-11-11,
  production build, cold, three alternated runs: time lost in frames over 50 ms around the opening 637-821 ms -> 251-302,
  its longest frame 268-385 -> 101; the cover stays ~0.6 s longer on average (0.9 s at least while it rehearses, 2.5 s at
  most on a device that never runs smooth). Anything new the selector shows at its opening is warmed with it for free;
  anything it shows later (a tip after 2 s, a card arriving from the network) is not.
- A change in which elements have a layer of their own costs like a first paint. When an element gains or loses its layer
  (an animation of `scale`, `translate` or `opacity` starting or ending, a transition's end, `visibility: hidden` on a
  neighbour, an element appended over the panel), Chrome re-rasters the tiles around it, and the new split compiles GPU
  programs again (13-23 at a time, 85-140 ms on the S10) although nothing new is drawn. Found on the heart's ribbon
  («Un cor per a tu!», `ui/heart-tip.js`): 134-168 ms as it came and 134-151 ms at the end of the heart's pulse, 3.6 s
  later. The owner was not the ribbon's drawing (flat, without its shadow or tail: the same; hidden with `display: none`:
  the same, as a `:has()` rule on it still matched) but the rule hiding the song's row under it with
  `visibility: hidden`. Faded with `opacity: 0` and `pointer-events: none` instead (`select-pending.css`): 17-34 ms at
  both moments, the animations untouched. So: to take something out of sight for a moment on a screen that is on show,
  fade it with `opacity` (and `pointer-events: none`) rather than `visibility` or `display`, and measure.
- `will-change` is not a fix for that; measured, it moved the cost or multiplied it. `#select-heart { will-change: scale }`
  made the ribbon's two moments cheap (50-84 ms) and brought a new 184-218 ms frame ~1 s after the opening, when the
  standings card's skeleton-to-real crossfade ended (23 programs): 1234 ms lost in all against 1155 without it, reverted.
  The same plus `will-change: opacity` on `#select-standings-sk` and `.sel-standings-real`: ~200 frames over 50 ms in
  17 s (two phone-wide layers at DPR 3.5 composited every frame). A permanent layer is a per-frame cost: add one only
  with the device's numbers, as for the full-screen dim above.
- A compositor-only animation is free; the same look done another way is not. The new figure's card sweep
  (`.sel-card.sel-new::before`, a band of light moved with `translate`, no blend mode, three runs and then still): the
  S10 painted 2-4 times in 2 s while it ran (a repaint every frame would be ~120) and its frames matched the runs
  without it. Not measured here, but they repaint every frame by construction, so measure before leaving one running:
  `mix-blend-mode` over moving content, an animated `background-position`, an animated gradient angle (the difficulty
  buttons' turning ring, `--sel-halo`).
- Measured to nothing, so nobody repeats it: the «Més jocs!» tip at the selector's opening (788-921 ms lost without it,
  770-820 with it); the ribbon's shadow, tail and gradient; the ribbon's own pop and bob animations. And opening the
  selector on the Bou instead of the Mulassa costs the same at the opening (the Bou's later hitches were the ribbon's,
  which only a figure with no heart from this player shows).

## GPU context loss (mobile GPUs)

Android Chrome can crash its GPU process mid-game (an Adreno 618 did it on every results screen, from an off-screen
render). Chrome then loses and restores the WebGL context **and every 2D canvas**, even small or detached ones: each
comes back blank, with its default state (identity transform, default font), and fires its own `contextlost` /
`contextrestored`, not at the same moment as the others. three.js restores the WebGL scene by itself; nothing restores
2D state or canvas caches. Before adding a canvas or GPU work:

- State set on a 2D context outside the frame (a transform, a font) is set again on that canvas's `contextrestored`
  (the HUD runs `resize()`: without it the HUD was drawn at 1/3 in the top-left corner until the next rotation).
- A canvas kept as a cache (text sprites, the GLOBUS stills, a `CanvasTexture`'s source) listens to its **own**
  `contextrestored` and drops or repaints itself; never keep what was painted while `ctx.isContextLost()` (it stays
  blank). A `CanvasTexture` repaints its canvas and sets `needsUpdate` (three.js re-uploads it from the blank canvas).
- No heavy off-screen GPU work on a player's path (render targets plus a read back of a big image): the share photo is
  a fixed file per figure (`public/share/`, made with `__dbg.hero`), never rendered on the device.
- A context lost on screen drops quality one level once it is back, with no trial above it that session, and the next
  loads on that device start at that level for 12 hours (`src/platform/adaptive-quality.js`, `render-quality.js`). A
  hidden page's loss costs nothing. This is a mitigation: the cause of these losses is unknown.
- A lost context that never comes back shows the reload card after 5 s on screen (`src/ui/pause-actions.js`). Its text
  asks to close the browser and reopen it, since Chrome can block WebGL for the site until it restarts; its retry
  button stays, as a reload may still work elsewhere; a
  failure card shown after boot passes its own reason so `errors.js` doesn't report it again as `boot-failed`.
- Test with a real crash, not only `WEBGL_lose_context` (it never touches 2D canvases): Playwright's CDP
  `Browser.crashGpuProcess` (`chrome://gpucrash` is blocked headless) on each screen you touch, then check the HUD's
  scale and text, the GLOBUS head, the share card and the 3D. Contracts: `tests/render/scene-crowd.mjs` (HUD and
  sprite restore, the never-restored card).

### Measured budgets (enforced by tests)

- `tests/render/gl-budget.mjs` (`npm run check:gpu`, not in the plain `check`) boots the game in real WebGL (the Metal GPU; `GL_BUDGET_SOFT=1`, or no Chrome, falls back to software GL), cycles the Mulassa, the Drac and the Bou (it empties `UNRELEASED_IDS` for its own server only) through every quality level, and fails if `renderer.info.memory` geometries or textures differ between rounds (each sample first draws a frame with no frustum culling: three.js uploads a geometry when it first comes into view, and the walk-round shots see the far side of the plaça only once a loop) or shader programs pass 90. It skips with a message without Playwright (`PLAYWRIGHT_DIR`, default `/tmp/ui-inv-pw`).
- GL draw calls a frame (shadow pass included; `renderer.info.render.calls` does not count it), worst figure, plus 4 of headroom in the test. Selector: minimal 38, low 38, medium 60, high 63, as in play: the Drac's colla and fire (38, 38, 60, 62) and the Bou's (34, 34, 58, 60) show there too, while the Mulassa alone takes 22, 22, 33, 36 (the test once clicked free play's figure buttons, which share the cards' `data-id`, and so measured only the Mulassa); a cut's 0.5 s dissolve renders the outgoing shot too, about twice that, and the test measures between dissolves. Play (the Mulassa alone: 21, 22, 33, 36; the Drac while its fire effects are out adds 16 calls): minimal 37, low 38, medium 60, high 63. The sun's shadow pass costs about 11 draws at medium and 14 at high.
- At rest the scene holds about 59 geometries, 9-10 textures and 54 programs (software GL, `?perf`); `renderer.info.render` reads about 21 calls and 40k triangles (the plaza pass alone).
- `tests/build/bundle-size.mjs` builds into a temp dir (a few seconds) and fails when the largest JS chunk passes 492,000 bytes gzip (measured 477,732). Raise it only for a deliberate addition.
- `?perf` also shows `geo`/`tex`/`prog` (GPU memory counts), skinned people and total bones; `window.__perfLive()` returns the same counts on demand. Skinned load: 2-4 skinned meshes, about 480-530 bones, at most 41 people moving on them.
- Shadows: the sun's frustum is 15 m each side (the played ground plus margin), and only figures, collas, the crowd (high) cast. Plaza buildings, trees and lamps are receive-only. Static plaza meshes have `matrixAutoUpdate = false`.

## Bou activation budget (1.4.0 preparation)

Activating the existing Bou includes its model, dance, colla, effects and song data in the production main chunk. Measured gzip -9: 517,141 bytes, above the previous unreleased-Bou budget of 492,000. The deliberate figure addition sets a 533,000-byte budget (~3% headroom); it does not establish startup latency or explain a post-splash GPU stall. No other branch changes or audio assets were imported.
