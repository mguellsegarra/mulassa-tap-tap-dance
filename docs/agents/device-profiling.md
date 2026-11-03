# Measuring on real phones

How to measure what blocks the game on the owner's phones, as AGENTS.md (Process, «Blocking cost in ms») requires before
anything is called done. Built from the 2026-11-03 review (Galaxy S10 and an iPhone in Low Power Mode); its findings
are in `docs/agents/graphics.md` («DOM blocking costs»), the case notes in the performance-diagnosis skill (P07, P08).
A desktop browser, headless Chrome with CPU throttling or a simulator never closes a phone symptom: at 4× throttling a
Mac still ran 5-10× faster than the S10 and missed costs the S10 showed.

## The devices and the bridges

| Device | Browser | Reach it from mac-studio | Tool |
| --- | --- | --- | --- |
| Galaxy S10 (DPR 3.5, Mali-G76, 60 Hz) | Chrome | USB: `adb` + Chrome DevTools Protocol | `tools/qa/device/android-cost.mjs` (synchronous part), raw CDP traces (task, frame, raster) |
| iPhone (ProMotion 120 Hz) | Safari | no cable: the LAN probe proxy | `tools/qa/device/probe-proxy.mjs` |
| iPhone, plugged in (mac-studio or mbp-m1) | Safari | `ios_webkit_debug_proxy` (Homebrew), its port 9222 | `tools/qa/device/ios-inspect.mjs` |
| Any Mac (headless Chrome) | — | — | `tools/qa/alloc-profile.mjs` (who allocates), `tests/render/alloc-budget.mjs` (the guard) |
| iPhone over the LAN, A/B | Safari | the probe proxy's command channel | `tools/qa/device/ios-phases.mjs` |

The owner carries the iPhone: unless they say it is plugged in, test it over the LAN (the probe proxy) and ask them to
load the URL; the S10 normally stays plugged into mac-studio.

- **S10.** `adb devices` must say `device` (`unauthorized`: the owner accepts the prompt on the phone). Then
  `adb forward tcp:9333 localabstract:chrome_devtools_remote` and the tabs at `http://localhost:9333/json/list`.
- **iPhone without a cable.** `node tools/qa/device/probe-proxy.mjs 5291 <dev-or-preview-port> <label> > /tmp/mulassa-device/<label>.log`
  (keep that output: it prints the command token); the owner opens `http://<mac-lan-ip>:5291/?perf&mute`. The probe's
  lines land in `/tmp/mulassa-device/<label>.jsonl`. To A/B on the phone, queue an expression with the token
  (`curl -H 'x-cmd-token: …' -d '<js>' http://127.0.0.1:5291/__cmd`): the page runs it at its next post (2 s) and logs
  `{cmd, result}`. `tools/qa/device/ios-phases.mjs <plan.json>` runs whole A/B phases that way (below).
- **iPhone with a cable.** On the Mac it is plugged into: `ios_webkit_debug_proxy -c null:9221,:9222-9322` (iPhone:
  Settings → Apps → Safari → Advanced → Web Inspector on; tap «Trust»). From mac-studio: `node
  tools/qa/device/ios-inspect.mjs <url> 20 --bridge=<that-mac-ip>:9222`. The game is still served by mac-studio; the
  other Mac only bridges Safari. Installing the bridge is a machine-wide install: the owner confirms it per machine.
  mbp-m1 (2026-11-03) bridges at `192.168.1.206:9222`; there Chrome also holds `127.0.0.1:9222`, so even on that Mac
  use the LAN address. Add `--maps=<outDir of a vite build --sourcemap>` to name the minified functions.
- Keep the iPhone awake for long runs (Settings → Display → Auto-Lock → Never, restored afterwards).

## Allocations (the garbage collector)

On the iPhone in Low Power Mode, Safari's CPU instrument (per-thread usage every 0.5 s through the bridge:
`Timeline.setInstruments(['Timeline','CPU'])` + `CPUProfiler.startTracking`) showed the JavaScript heap's collector
threads at 10-25% of the CPU all the time, the main thread at 30-55%. The JavaScript is the same everywhere, so who
allocates is measured on the Mac: `node tools/qa/alloc-profile.mjs <dev url>` (V8's sampling heap profiler, 10 s of the
splash and of the idle reel). 2026-11-03: 12.8 MB/s on the splash, 7.5 MB/s in the idle reel: the Drac's leg normals
(`drac-legs.js` `normals`, `Math.hypot`), the crowd grid's cells (`crowd-grid.js` `fillCells`), three.js re-reading a
material's program parameters every frame (`getParameters` from `stage.js` `renderScreen`), uniform matrices, the
crowd's poses (`representation/pose.js`) and the idle lens (`cameras.js` `frameMenuLens`). The game's rule is no
per-frame allocation (`docs/agents/graphics.md`): a change to a hot path states its MB/s before and after, and
`npm run check:gpu` fails on a budget overrun or a material re-evaluated every frame (`tests/render/alloc-budget.mjs`).
After the fixes of that day: 7.3 MB/s on the splash, 5.6 in the idle reel (6.9 / 6.1 in the test's own run).

## A review, step by step

1. **Measure a production build**, not the dev server: `npx vite build --outDir /tmp/<dir>` and `npx vite preview
   --outDir /tmp/<dir> --host --port <p>`, with the probe proxy in front for the iPhone. The dev server loads hundreds of
   unbundled modules and inflates the first seconds (Safari: JS at 27-39 ms a frame on the dev server's splash).
2. **The flows**, each from a cold start (Chrome force-stopped, `Storage.clearDataForOrigin` + `Network.clearBrowserCache`):
   load to the splash's first frame; splash → selector; figure changes (playable and pending); every sheet opening,
   including the one-time ones that only appear on a fresh profile (`?mock&account=verified&seasons=later&board=me`:
   stats notice, season end, badge news); the idle reel (10 s untouched on a playable figure, no sheet open); a song's
   start; pause through the app switcher and back; the results.
3. **The sizes.** The S10 at its own size and emulating 375×667 and 320×568 (`viewport` in the plan): media queries
   switch on layouts the phone in hand never shows (the 84 card containers cost ~500 ms a sheet only there).
4. **The iPhone in Low Power Mode and out of it**: Safari caps rAF at 30 Hz and also spends seconds at 24 Hz. Note
   which, and the `?perf` line's `quality`: a drop to `minimal` is itself a finding.
5. **A/B to find the owner.** Hide one part (`display:none`), delete rules through CSSOM (`DROP:` variants), swap a format,
   remove a container; measure again, twice. Only a measured difference names a cause. On the iPhone without a cable:
   `ios-phases.mjs` with phases of injected CSS or code, 30 s each, alternating (A, B, A, B): it waits for the newest
   live session in the wanted state, shows the owner a short banner per phase and «Fet!» at the end, and prints each
   phase's fps and share of frames over 80 ms. The idle reel's cause took four such rounds (visible UI, display none,
   visibility hidden, content-visibility hidden).
6. **The whole cost, not only the synchronous part.** `android-cost.mjs` times the action and its forced style/layout: a
   lower bound for A/B. The budget in AGENTS.md is the longest task and frame: take it from a trace around the
   interaction (`Tracing` with `devtools.timeline,disabled-by-default-devtools.timeline,gpu`: `RunTask` over 50 ms, what is
   inside, `RendererRasterWorker` for the raster) and a rAF probe for frames over 50 ms. Label which one each number is.
7. **Report** before/after with device, browser, build, size, Low Power Mode and cold or warm. Compare against the
   baseline below; record new results there when they change.

## Pitfalls met (do not repeat them)

Android / Chrome:
- A background tab ignores `Page.navigate`, and `/json/new` is refused: bring Chrome forward with `am start … -d <url>`.
- The Home key and a relaunch can make Chrome reload the tab: to test a pause, switch tabs (`am start` another URL, then
  `/json/activate/<id>`) and press «Continua».
- `lsof`'s working directory can name the wrong worktree for a port: read the process's arguments (`ps -o args= -p`)
  to know which checkout a server serves before measuring it.
- A full `Tracing` capture with many categories can never complete (too many events): keep categories narrow
  (`devtools.timeline,gpu` or `gpu,cc`) and the window short, or use the Profiler.
- `.click()` on a card through CDP does not always change the figure (measured 1 ms): check the selection changed.

iPhone / Safari:
- The inspector speaks WebKit's protocol, not Chrome's: commands are wrapped in `Target.sendMessageToTarget` to the
  target from `Target.targetCreated`; there is no `Page.navigate` (use `Runtime.evaluate` + `location.replace`); a
  same-origin navigation keeps the target, so a profiler started before it survives.
- `ios_webkit_debug_proxy` also lists dead tabs (empty URL) and extension pages: pick the game's tab by its URL.
- Timeline records came with every time at 0; `ScriptProfiler` (with `includeSamples`, stopped with `stopTracking`, the
  samples arrive afterwards) gives spans, stacks and timestamps, but only while the timeline records with the
  `ScriptProfiler` instrument (`Timeline.setInstruments` + `Timeline.start`): alone it reports nothing.
- `Console.enable` replays the tab's whole console history: keep only the lines after the reload.
- A tab announces no target while the iPhone is locked or Safari is in the background: commands then time out.
- Console messages carry only their first argument in `text`; the rest are `parameters`.
- No JavaScript during a freeze means the main thread waited on something else (the GPU readying shaders on first
  use, layout): look there, not at the code.
- The User-Agent reports an older iOS than the phone runs; the probe's first `innerWidth` (980) is read before the
  viewport meta applies.
- The first page opened after a while pays Safari's cold caches: alternate the A/B order or repeat both.
- Low Power Mode alternates 30 and 24 Hz on a 120 Hz screen (33.3 and 41.7 ms frames) with the CPU at ~10 ms: a
  cadence, not overload. A frame one refresh late at 24 Hz is 50 ms.

The phone and the owner (LAN runs):
- A reload is a new session; the phone locked or the owner switching to the chat puts the page in the background and
  that phase does not count. Tell the owner to stay in Safari until «Fet!»; `ios-phases.mjs` waits for a live session.
- A command's result comes with the next post: read it after ~4 s. Run one runner at a time (a stale one keeps queueing).
- Long waits in a foreground command get cut when the owner writes in the chat: start runners in the background.
- A banner over the 3D is a visible layer and changes the measurement (the visible UI hid the idle reel's hitch): keep
  it a few seconds, at the bottom (the `?perf` line covers the top), and only «Fet!» lasting.
- The command channel runs any code it is sent: it needs the token printed at start and refuses requests with an Origin.
  LAN development only.

Measuring in general:
- Two «obvious» causes measured to nothing: card portraits as PNGs, and the showreel's WebGL→2D dissolve on Android.
  So did the network for a guest. Measure before fixing.
- Instrumentation costs: `?perf` logs every 3 s (a regular 84 ms frame then). The probe's first version read the open
  sheets (`querySelectorAll`) every frame and was the 4th hottest function on the iPhone: probes sample on a timer.
  Compare like with like.
- A hook blocks shell commands containing a bare `open` (it brings apps to the front): write such scripts with the
  file tool and run them with `node`, or name the variable otherwise.

## Baseline, 2026-11-03 (release/1.2.10 with the fixes)

| Interaction | S10, native | S10 at 375×667 | iPhone, Low Power Mode |
| --- | --- | --- | --- |
| Sheet opening (stats notice, privacy), synchronous part | 30-45 ms | 28-38 ms | not measured |
| Board / profile sheet, synchronous part | 49-59 / 35-47 ms | 53 / 46 ms | not measured |
| Figure change, click task (trace) | ~36 ms | — | — |
| UI hiding into the idle dance | ≤ 50 ms frames | — | 30 fps steady |
| Selector's first show, GPU raster | ~475 ms | — | 228-363 ms hitch |
| Load to first frame (production build) | ~2.1 s | — | 2.4-3.1 s |
| Idle reel | 58-60 fps | — | before: 12-32% of frames over 80 ms (96/42 ms bursts); with the UI not rendered: 0% (24-30 fps, Low Power Mode) |
| Allocated per second (Mac, alloc-profile) | splash 12.8 → 7.3 MB/s, idle reel 7.5 → 5.6 MB/s | — | — |
| Splash, quality level | medium | — | medium kept (it fell to minimal before the 24 Hz fix) |

The iPhone splash's JavaScript (Low Power Mode, production build, 25 s, 9,909 samples): the applause synthesis 15%
(`platform/applause.js`, sliced on timers on the main thread), the Drac's legs and dance ~13% (`drac-legs.js`,
`drac-steps.js`, `dance-drac.js`) although the splash shows the Mulassa, her supports 4%, the crowd's contact and grid
7%, three.js matrices ~13%. No span over 50 ms and no gap without JavaScript in that run: the cost is spread over
every frame. Next leads: build the applause off the main thread (a Worker), and check why the Drac is posed while
not on screen.
