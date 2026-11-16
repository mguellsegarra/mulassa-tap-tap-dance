# DOM blocking costs: the investigations

The full record behind the rules in [graphics.md, "DOM blocking costs"](../graphics.md#dom-blocking-costs): each case with
its device, date, method and numbers, the experiments that were reverted and the open questions. Moved here verbatim from
graphics.md on 2026-11-15; the rules page keeps one line per rule. How to measure: [device-profiling.md](../device-profiling.md).

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
  selector first showed; as bitmaps: 750 → 475 ms. Drawing them to canvases at boot (`toBlob`) then cost ~0.8 s of GPU readback in the S10's
  longest start-up task (2026-11-15), so they are PNGs made at build time (`tools/ui/build-escuts.mjs` → `public/escuts/`, one file per
  town and density, the arms' hash in the name; `escutImg`, escuts.js) and the pills are `<img srcset>` from the start. The same arms as an SVG `<img>`
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
