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
- No drawing-buffer resize while a song plays: `setPixelRatio`/`setSize` reallocates the framebuffer (S10, 3.4 Mpx with MSAA: 58-81 ms task, 84-117 ms frame). Growing it in two steps was worse, and keeping the big buffer for the whole song cost ~114 MiB of GPU memory and more long frames; a new shot fits the canvas play already has. (The Bou's banknote close-up was the one exception, removed on 2026-11-16.) Outside play too, a WebGL canvas whose box changes size gets a new buffer (Pop's splash tap: `renderer.setSize` stalled a frame 75-146 ms); stretch the buffer instead (hero.js `fit`, same aspect). `tests/render/prod-play.mjs` guards it.
- No SVG→canvas→`toBlob` rasterising at boot: the selector's town arms cost ~1 s of the S10's longest boot task until they became build-time PNGs (`npm run build:escuts`, 2.0 → 1.1 s). Rasterise at build time and load images.
- Real-device checks play a full song, not a short burst, and report device, thermal state, refresh rate and the `?perf` summary.
- No WebGPU, `BatchedMesh` or KTX2 without a measured need; list the `onBeforeCompile` / `ShaderMaterial` patches that would have to be rewritten first.

## DOM blocking costs

Chrome rasterizes the page's DOM on the same GPU thread as WebGL, so a slow DOM frame or raster stalls the dance behind
it: on phones the DOM, not the 3D, made the selector choke. Every cost below was found by A/B on the device, not by
reading code. The cases, their dates and the reverted experiments: [reference/dom-costs.md](reference/dom-costs.md).
How to measure: [device-profiling.md](device-profiling.md).

**Never again** (`tests/build/css-costs.mjs` enforces the first two):

- No `container-type` on a list's items (cards, rows, cells): a query container is laid out on its own on every
  restyle. Single elements only, listed in the test; a list's sizes come from one `ResizeObserver` as CSS variables or
  an attribute (select-layout.js). Measured: 50 portrait containers made every `showModal()` ~300 ms (440 ms for the
  stats notice) against ~45 ms after; on short phones the 84 squat-layout containers cost ~500 ms a sheet, 28-53 after.
- No new `:has()` without its cost measured on the device: the count is a ratchet. Never `:has()` over toggled state
  (`[hidden]`, a class, `:checked`) on a broad subject (`body`, a sheet): the owner that toggles it sets an attribute
  (`data-choose`, `data-choices`, `data-entity`; a figure change went 122 → 65 ms).
- No repeated or detailed inline SVG on a screen's first paint (arms, icons in lists, big pixel art): measure its GPU
  raster; draw it once to a bitmap when it costs, at build time (see "No SVG→canvas→`toBlob`" above). A vector in an
  `<img>` is not a fix by itself. The 33 town arms (832 nodes) cost ~300 ms of raster on the selector's first show.
- No garbage per frame (`tests/render/alloc-budget.mjs`, in `npm run check:gpu`, holds the splash and the idle reel to a
  MB/s budget and fails on any material re-evaluated every frame; 12.8 → 7.3 MB/s on the splash). Measure with
  `tools/qa/alloc-profile.mjs`. The three causes found:
  - `Math.hypot(a, b, c)` in a per-vertex loop boxes its numbers every call: use `Math.sqrt(a * a + …)`.
  - An array reused every frame and emptied with `length = 0` is freed and grown again: keep a count beside it (`crowd-grid.js`).
  - three.js's one shadow depth material, shared by plain, instanced and skinned casters, re-evaluates its program at
    every switch: give each kind its `customDepthMaterial` (`models/people.js`, `mula-carriers.js`).
- No UI hidden only by `opacity: 0` or `visibility: hidden` over the 3D for longer than its fade: once faded, stop rendering
  it (`content-visibility: hidden` with `contain-intrinsic-size: auto none`, or `display: none` when nothing measures it).
  Safari composites invisible layers every frame: in Low Power Mode the faded selector left 12-32% of the idle reel's
  frames over 80 ms; with `data-reel-gone` (`ui/reel-idle.js`, `select-sizes.css`) 0%.
- No heavy generation on the main thread while the page loads or the splash runs: the applause synthesised per timer
  slice was 15% of an iPhone's splash JavaScript. Build it once into a file (`tools/music/build_applause.mjs`, decoded by
  the browser off the main thread) or move it to a Worker.
- No fix without the before/after numbers on the device (AGENTS.md, Process): two measured "obvious" causes here (the
  portraits as PNGs, the dissolve) changed nothing.

First paints and layer changes:

- A first paint compiles GPU programs (Skia's `VulkanCreateGraphicsPipelines`, 17-39 ms each, in `RendererRasterWorker`)
  for every kind of paint the page has not drawn yet; no single rule owns it, each new look (a full-screen `::backdrop`
  dim over WebGL, a gradient fill, a blurred shadow, an animated gradient) adds some. On the S10 these are 100-400 ms
  frames with no long JavaScript.
- The page cover already pays it for WebGL (`precompile`), the HUD canvas's big words (`warmups`, `hud/warm.js`), the
  fonts, the plaça running smooth (`COVER_SMOOTH`, `main.js`) and the selector's DOM (`ui/select-warm.js`, a rehearsal
  shown inert under the cover: opening's lost time 637-821 → 251-302 ms). Anything else in HTML and CSS that first shows
  later (a sheet, a tip, a notice, a new panel, a selector tip after 2 s, a card from the network) pays it under the
  player's eyes unless it is warmed.
- To warm a sheet, paint it once as it will look, not modal (`show()`, under the boot screen, not in the top layer). A copy
  at 1% opacity does not warm it (another blend). Pop's first ⚙: frame 435-469 → 34-67 ms (`settings.js` `warm`).
- A full-screen dim needs a layer of its own, or it is merged with what lies under it and repainted the first time it
  shows: `will-change: transform` on `.sheet-dim` (`packages/plassa/src/sheets.css`), 168-201 → 34-67 ms.
- A change in which elements have a layer of their own costs like a first paint (13-23 programs, 85-140 ms on the S10),
  although nothing new is drawn. To take something out of sight for a moment on a screen that is on show, fade it with
  `opacity: 0` and `pointer-events: none`, not `visibility` or `display`, and measure (the heart's ribbon: 134-168 → 17-34 ms).
- `will-change` is not a fix for that: measured, it moved the cost or multiplied it (1234 ms lost against 1155 without
  it). A permanent layer is a per-frame cost: add one only with the device's numbers, as for the full-screen dim.
- For anything left running, animate only `translate`, `scale` or `opacity`, without blend modes: a compositor-only sweep
  painted 2-4 times in 2 s. `mix-blend-mode` over moving content, an animated `background-position` and an animated
  gradient angle (`--sel-halo`) repaint every frame by construction: measure before leaving one running.
- A layer's raster mode can flip to MSAA (≥ 6 slow paths and no non-antialiased paint) and build ~50 programs in one
  flush (up to 0.4 s). The card strip's only non-AA paint is the pending cards' dashed edge, so anything that hides the
  strip and shows it again, or a scroll that leaves no dashed card near the viewport, can flip it. The idle wake shows
  the UI two frames after `data-reel-gone` drops (`reelWakeHold`, ui/reel-idle.js): 51-52 builds → 0-1.
- Measure at the small viewports too: a media query can hide a cost from the phone you hold.
- Measured to nothing, so do not "fix" it without numbers: network requests (a `fetch` never blocks), the idle
  dissolve's WebGL→2D copy, steady-state CSS animations, any one camera shot, the heap collector (cutting the garbage
  25-43% left the bursts as they were; the cut stays), the card portraits as PNGs, an SVG `<img>` for the arms, the
  "Més jocs!" tip, the heart ribbon's own shadow, tail, gradient and animations, the Bou against the Mulassa at the
  selector's opening, and the remaining 62 `:has()` (~10-15 ms a sheet).
- Still open: ~475 ms of GPU raster on the selector's first show (text, gradients and shadows at DPR 3.5), and on the
  iPhone a 1.5-3.6 s freeze after the first frame with no JavaScript running (keeping the loader up did not help).

## iPhones before iOS 18, and first draws

Found on rented iPhones (AWS Device Farm, 2026-11-14: iPhone 8 iOS 16.7, iPhone 13 iOS 17.6 and 18.5, iPhone 15 Pro
iOS 18.1) and on the owner's iPhone in Low Power Mode. The sessions, numbers and the frame monitor's history:
[reference/ios-safari.md](reference/ios-safari.md). How to run a rented phone: [device-profiling.md, "A rented phone"](device-profiling.md#a-rented-phone-aws-device-farm).

What holds:

- Safari before 18 composites HTML over the 3D badly; it is the browser, not the chip (the same iPhone 13: 30 fps at the
  selector on iOS 17.6, 60 on iOS 18.5). The 3D alone does 60, so nothing shows in a JavaScript profile.
- `@supports not (content-visibility: hidden)` is the test for "Safari before 18". In that block `styles/select-sizes.css`
  stops the selector's endless CSS animations (iPhone 8: 12 → 41-43 fps), and the idle screen falls back to
  `display: none` (with `content-visibility` alone it stayed at 12 fps). The carousel's own cost is left as it is (the
  owner's call).
- Low Power Mode is a cadence, not overload: Safari alternates 30 and 24 Hz with the CPU at ~10 ms. `render-quality.js`
  CAP covers 24 Hz, a frame one refresh late keeps the run, a capped frame is slow only past 1.4× the cap's interval,
  frames a refresh late count as slow once over 30% of a window, a lone early frame does not end the cap, and the cap
  lifts only when 4 of the last 12 frames are under 24 ms (`tests/render/low-power.mjs`).
- A throttled browser is told by a step that buys nothing, not by a frame pattern: under a cap with light JavaScript,
  `adaptive-quality.js` takes its first step down as a probe and puts the level back (`throttled`) if the late share
  does not fall. The owner's recorded sessions are the test (`tests/render/fixtures/low-power-bou.json`,
  `tests/render/adaptive-quality.mjs`).
- A first step down takes sharpness, shadows and effects only: the near people, the far crowd and the mid band lag a
  level (`sessionProfile`); people are the second step's (`PROFILE_PEOPLE`).
- A slow menu is not a slow phone: out of a song, a step that changes nothing is undone and that menu's late share
  becomes its floor (`menuFloor`). An even 30 fps reads as Low Power (`lowPower` in `?perf`).
- The page cover stays up until the splash runs at the device's pace (20 frames in a row under 45 ms, at most 6 s after
  the first), and a boot step needs two slow 2 s windows in a row (`render-quality.js` EARLY).
- A first draw is the GPU's work even with its program linked: `precompile()` links, but a clean Safari still paid
  121-365 ms at the Bou's rave and (then) banknotes. The whole scene is drawn once at boot under the cover (`scene/precompile.js`
  `warmDraw`: the iPhone 8's bombo frame 87-89 ms → none over 50); the Bou also warms its rave
  (`bouFrame`). A new effect needs nothing more than being in the scene at boot.
- JavaScript per frame still counts on a 120 Hz iPhone: the lasers' hit test walked every triangle of the Bou per beam
  per frame; a grid per mesh, built one mesh a frame beforehand, fixed it.

What not to do:

- Do not add an endless CSS animation to the selector (or to anything left over the 3D) without stopping it in that
  `@supports` block, and do not judge it on a Mac, an iOS 18 iPhone or the S10: none of them show the cost.
- Do not hide a screen that stays over the 3D with `content-visibility` alone, nor trust `opacity: 0` to make it free
  on those iPhones: invisible layers are still composited.
- Do not chase `box-shadow`, `text-shadow`, `filter` or `mask` there: removing all four changed nothing (iPhone 8).
- Do not let a menu's frame rate set the song's quality, and do not read an even 30 fps as overload before ruling out
  a refresh cap.
- Do not count on `precompile()` for a first appearance mid-song, and do not put the warm-up draw where the player is
  looking or tapping.
- Do not conclude from one session or one phase: the same iPhone 8 opened the selector at 12 fps in most sessions and at
  50 in two, and the iPhone 13 left its 30 fps at the first injected style whatever it was (I named the wrong owner
  once from that). Alternate the variants and repeat (`device-profiling.md`).
- Do not make the menus exempt from quality steps: tried on 2026-11-14 (to keep a slow selector from setting the song's
  level) and reverted, because weak phones find their level there before the first song (six tests say so); `menuFloor`
  is what stayed.
- Do not skip a quality step because the JavaScript is light: a busy GPU has light JavaScript too.
- Do not take anyone out of the plaça on a first step, far figures included: the owner sees them go. People are the
  second step's (`PROFILE_PEOPLE`).
- Do not give several people of a procession the same spot to walk back to: they wait on it for ever, still counted
  as in it, and the next song's has nobody (the Bou's snake, three abreast, 2026-11-15; `PARADE_K.patience` is the net).
- Do not draw the warm-up before `linkPrograms` nor once the cover is down (`main.js`): one render then pays every
  program's first use at once, or lands on the selector.
- Do not answer a Low Power complaint with one more frame pattern in `frameMonitor`, nor call it fixed after one good
  session: replay the owner's recorded sessions (`tests/render/fixtures/low-power-bou.json`) and add the one that fails.
- Do not probe a second level under a cap: a step mid-song compiles programs, and the owner's iPhone in Low Power Mode
  froze 1.5 s stepping from low to minimal for nothing (2026-11-16, reverted; its session is the fixture's third).
- Do not let one odd frame decide a cadence: a cap, a group or a hitch is read from a run of frames, never from the last one.
- Do not start judging frames while the page is still warming up (compiling its JavaScript, first draws): keep it under
  the cover, and give the monitor frames at the device's own pace.
- Do not take Device Farm for the owner's phone: no 120 Hz, no Low Power Mode, no thermal state, no finger, no audio.

Left as they are (the owner's call, 2026-11-14): the 2-3 frames of 50-84 ms in every song's first quarter second on the
S10 (the selector's ~450 elements restyled as it hides; a smaller selector DOM is the lever). Still open: why iOS 17
enters the selector at an even 30 fps; the carousel's cost on iOS 16-17; quality steps taken on a slow selector.

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
- A quality drop that changes nothing is undone («futile», `adaptive-quality.js`), and from then on the song in play
  keeps its profile: only frames way too slow (80% late) still step down in it. A CPU-bound phone (the S10 with its CPU
  slowed three times: JS 15-19 ms a frame) otherwise walked medium, low, minimal, medium twice a song, a hitch of up to
  787 ms at every switch. No profile sheds JavaScript: for those phones the cost per frame is the lever, not the ladder.
- A song whose JavaScript takes over 10 ms a frame when an overload is found is drawn at an even 30 for the rest of that
  song (`cpu-cap`: the pacer's `cap`, lifted when the song ends) instead of losing a profile. The S10 with its CPU slowed
  three times: 40-53 fps with 30-50 late frames every 3 s before, a steady 29.9 with 0-1 after, the profile kept. Mind a
  laptop's frequency scaling when reading JS ms: a 2015 MacBook Pro holding 60 fps read 7.6 ms at `high` and 13.5 at
  `medium`, the CPU clocked down to what the frame needs; only missed frames and profile changes say it is struggling.
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
