# Measuring on real phones

How to measure what blocks the game on the owner's phones, as AGENTS.md (Process, «Blocking cost in ms») requires before
anything is called done. Built from the 2026-11-03 review (Galaxy S10 and an iPhone in Low Power Mode); its findings
are in `docs/agents/graphics.md` («DOM blocking costs»), the case notes in the performance-diagnosis skill (P07, P08).
A desktop browser, headless Chrome with CPU throttling or a simulator never closes a phone symptom: at 4× throttling a
Mac still ran 5-10× faster than the S10 and missed costs the S10 showed.

## The devices and the bridges

| Device | Browser | Reach it from mac-studio | Tool |
| --- | --- | --- | --- |
| Galaxy S10 (DPR 3.5, Mali-G76, 60 Hz) | Chrome | USB: `adb` + Chrome DevTools Protocol | `tools/qa/device/android-cost.mjs` (synchronous part), `tools/qa/device/android-frames.mjs` (frames over 50 ms from a cold start, with the GPU programs compiled in them), raw CDP traces (task, frame, raster) |
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
- **iPhone with a cable, unattended** (the owner leaves it plugged in and does nothing): Xcode's Device Hub
  (`Xcode.app/Contents/Applications/DeviceHub.app`) mirrors its screen, and with it open the screen did not lock in
  hours. Drive it with Cua Driver from one persistent `cua-driver mcp` session (a `cua-driver call` per action loses
  the window's capture and refuses clicks): `get_window_state` for a screenshot, `click` with `x, y` on the mirror and
  `delivery_mode: 'foreground'` for a real touch (background clicks never reach the phone; it fronts Device Hub for a
  moment, so the owner allows it first), its window's Home button by `element_token`, and a `drag` down from the top
  right for Control Center (Low Power Mode's toggle: iOS turns it off by itself at 80% while charging). Safari's audio
  starts only after a real touch on the splash; then `__dbg.choose(level)` with `?autoplay` plays a whole song, and
  `&mute` keeps it silent. Check the state left the splash after the tap and tap again if not (a tap can miss); Device
  Hub can restart with a new pid and window, and the phone sits at another place in its window then. (2026-11-14: the
  Control Center drag and the Home button did nothing, and a zoomed mirror swallowed every click: «A performance hunt»
  below.)
- **What the iPhone actually shows** (not what rAF reports): a small Swift program can turn on CoreMediaIO's screen
  capture devices (`kCMIOHardwarePropertyAllowScreenCaptureDevices`, as QuickTime does) and record the plugged-in
  iPhone's screen with `AVCaptureMovieFileOutput` at 60 fps; ffmpeg alone does not list it. Start the recording before
  the song: it moves the iPhone's audio to the Mac, and a song already playing pauses. Count the frames whose 3D band
  differs from the one before (new pictures) and the time between them.

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
7. **A hitch with no long JavaScript: look at the GPU process.** `android-frames.mjs <plan.json>` runs the flow cold
   (Chrome stopped, the site's data cleared, the splash's tap, the selector left alone), lists every frame over 50 ms
   with its time from the selector's showing, sums the ms lost in them (around the opening and over the whole watch),
   and with `"trace"` counts the `VulkanCreateGraphicsPipelines` in each long frame. Read the times first: a hitch that
   comes at the same second in every run belongs to something the page does then. Name that event (a `MutationObserver`
   on `childList` and attributes, `transitionstart|end` and `animationstart|end` listeners calling `console.timeStamp`,
   all injected through `Page.addScriptToEvaluateOnNewDocument`; the marks land in the trace), then A/B its parts with
   injected CSS, one at a time and then together: on the heart's ribbon no single removal changed the frame, and the
   owner was a rule on its neighbours. Compare the whole lost time, not only the frame you are chasing: a fix can move
   the cost to another second (docs/agents/graphics.md, the `will-change` entry).
8. **Report** before/after with device, browser, build, size, Low Power Mode and cold or warm. Compare against the
   baseline below; record new results there when they change.

## Pitfalls met (do not repeat them)

Android / Chrome:
- `Page.addScriptToEvaluateOnNewDocument` injects nothing unless `Page.enable` was sent first (Chrome 157 on the S10,
  checked with a marker): a whole round of CSS A/B «variants» (2026-11-13) was as-is runs. Check a marker before trusting one.
- «Cold» GPU numbers depend on Chrome's persisted Vulkan pipeline cache, which clearing the site's data, the HTTP cache or
  Android's «Clear cache» does not empty: the morning after a Chrome update the S10 compiled 52 programs (604 ms) under the
  page cover and 17 (413 ms) at the idle wake; hours later, the same builds hit the driver cache (0 compiles). Count the
  `VulkanCreateGraphicsPipelines` (builds), not only their ms, and note Chrome's version and update time.
- The S10 is shared by every agent on mac-studio. `android-cost.mjs` and `android-frames.mjs` stop Chrome at each run,
  which ends any other agent's session on it: ask the owner that the phone is free before starting, and say so when
  done. A phone another agent is using also measures wrong: with 100+ tabs left open and two pages at 60-110% CPU the
  same build read 12 fps instead of 58, the Mulassa as slow as the Bou (2026-11-11). Before a session, check
  `adb shell top -b -n 1 -m 5` and the tab list (`/json/list`); a selector at rest should read 57-60 fps at `medium`
  (`?perf`). Stopping Chrome closes none of those tabs, only their processes.
- Chrome opens its debugging socket a moment after `am start`: the first `fetch` of `/json/list` after a `force-stop`
  can fail (`other side closed`); retry for a few seconds.
- The selector also shows once under the page cover (`ui/select-warm.js`), so its first `data-shown` is not the
  opening: time an opening from the first `data-shown` after `#loader` is hidden (a probe that took the rehearsal for
  the opening shifted every number by seconds).
- A CDP mouse move every 2 s keeps the idle screen away during a watch (the selector's idle screen comes after 10 s
  untouched and is another thing to measure).
- Frames over 50 ms vary by one or two between identical runs, and the cover's time by a second: run each side at
  least twice, alternated (A, B, B, A), and trust a difference only when the runs do not overlap.
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
- In Low Power Mode, WebGL's rAF timestamps jitter in groups that fill whole 33 ms slots (50 + 16, 68 + 2 + 30,
  81 + 2 + 17 ms) every few frames, 30 a second on average; a plain page hardly does. On the screen, recorded over the
  cable, a page that only clears a WebGL canvas showed 23 new pictures a second and the Bou in play 25, with 67-100 ms
  holds: Safari's, not the game's (hiding scene parts or a lower quality did not change the rAF groups either). The
  frame monitor reads those groups as on time (render-quality.js); do not take them for overload.
- With `?perf`, `pace.hz` (the lower quartile of rAF deltas) swings between 30 and 66 under that jitter and `lowPower`
  flips with it: read the trend, not one line.

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

A performance hunt (2026-11-14: a day of wrong turns on the Bou's final and the selector; read before starting one):
- **Ask where and how it happens before measuring anything**: which screen, playing or watching, which phone, Low Power
  Mode or not. The owner's «it drops quality and the crowd leaves» was in the song, tapping its notes, in Low Power Mode:
  a rented phone (60 Hz, no Low Power Mode, no finger) could never show it, and hours went to what it could show.
- **Read the game's own verdict first.** With `?perf` every quality change is logged (`[quality] {reason, from, to, hz,
  lowPower, slowShare, capped, cpu…}`; the probe proxy keeps them): «overload at the splash, 4 s in, slowShare 0.9, cpu
  10 ms» says the monitor misread the cadence before any profile does. A crowd that thins is a quality step
  (`stepPeople`), never a game rule.
- **A monitor bug is reproduced in node, not on the phone.** Feed `frameMonitor` the frame intervals seen (the probe
  can post every one: a scratch copy of `probe-proxy.mjs` with an `all` array) and it steps or not in milliseconds of
  work; the fix then gets a test that fails without it (`tests/render/low-power.mjs`).
- **Before fixing a module, read its last commits** (`git log -5 -- <file>`): the Low Power cadence had been fixed for
  one frame pattern on 2026-11-03 and for another on 2026-11-13. A third pattern means the rule is wrong, not that one
  more case is missing; say so to the owner, who remembers the earlier fix.
- **One comparison names no owner.** Three wrong ones that day: the level buttons (the phone left its slow state at
  the first injected style, whatever it was), the Mulassa and Drac splash pair (the two profiles were seconds apart in
  Safari's warm-up; on the Mac the pair and the Bou alone cost the same), and the warm-up draw blamed for a frame that a
  quality step made. Alternate A and B, repeat across sessions, and check the second variable (time since load, order,
  the level the 3D is at) before writing a name down. A claim already told to the owner is corrected in so many words.
- **JavaScript or the GPU: the Mac says which.** `Emulation.setCPUThrottlingRate` 4 with a CPU profile over the same
  song seconds: no long frame there means the phone's is a first draw or the compositor, not code to optimise.
- **Safari's first seconds are slow at any quality** (an iPhone 18 Pro in Low Power Mode: 30-70 ms of JavaScript a frame
  for 5-10 s after a load, 9 afterwards): compare profiles taken the same seconds after load, and keep the build whose
  profile you took (`--maps` needs that build's `.map` files: a rebuild changes the chunk names).
- **`ios-inspect.mjs --cached`** for a reload as a player's: with the cache disabled Safari's profiler stopped answering
  («ScriptProfiler.stopTracking timed out», no samples).
- **Never reload or drive a tab the owner is playing in.** A loop of reloads cut his song; ask, or use another tab.
- **The plugged-in iPhone, driven without the owner** (Device Hub and Cua on the Mac it is plugged into, from a
  delegated agent there): a click reaches the phone only with the mirror fitted («Zoom to Fit»; zoomed, with its «Zoom
  Controls» banner, every click was swallowed); the drag for Control Center and the Home button did nothing that day, so
  Low Power Mode is the owner's to switch (iOS drops it at 80% of charge: check `lowPower` in `?perf` before every run);
  a tap at the splash's centre can land on the language prompt or leave Safari, so look before and after each one.
  Through the probe's `__cmd` a synthetic `pointerdown`/`pointerup`/`click` on the element at the centre passes the
  splash (no audio), `.sel-card[data-id="…"]` picks a figure and `__dbg.choose(level)` starts its song.
- **The bridge dies with the cable**: after the phone is unplugged or locked for a while `:9221/json` lists nothing and
  `:9222` refuses; restart `ios_webkit_debug_proxy` on that Mac. Tabs show only with Safari in front and unlocked.
- **A tunnel to `vite preview` answers 403** («host is not allowed»): put the probe proxy in front (it is what the
  tunnel points at). A new quick tunnel may not resolve on this Mac for minutes (a cached miss): check it through a
  public resolver (`dig @1.1.1.1`, `curl --resolve`) before calling it down.
- **A rule that reads «never do X in the menus» can be right for one phone and wrong for the rest**: «no quality step
  out of a song» fixed the iPhone 8's slow selector and was undone the same hour, because weak phones find their level in
  the menu and would otherwise step down mid-song. Six existing tests said so: read what the failing tests protect
  before rewriting them.
- Close what the hunt opened (tunnels, previews, proxies, the bridge on the other Mac) and say what stays (the Device
  Farm project, free).

## Baseline, 2026-11-11 (release/1.4.0, d540e86)

Galaxy S10, Chrome, native size, production build served by `vite preview`, cold (Chrome stopped, data cleared), a fresh
profile (the Bou new and chosen, no heart given), `android-frames.mjs`; each range is three runs.

| Moment | Before | After | What changed |
| --- | --- | --- | --- |
| Selector's opening, ms lost in frames over 50 ms (-0.3 s to +0.9 s) | 637-821 | 251-302 | rehearsed under the page cover (`ui/select-warm.js`) |
| Selector's opening, longest frame | 268-385 ms | 101 ms | same |
| Page cover's time | 4.5-6.1 s | 5.6-7.0 s | same (the dev-phone's Wi-Fi load included; noisy) |
| The heart's ribbon showing (~2.4 s after the opening) | 134-168 ms | 17-34 ms | the song's row faded, not `visibility: hidden` |
| The heart's pulse ending (3.6 s later) | 134-151 ms | 33-34 ms | same |
| Selector at rest, 17 s (`?perf`) | 57.3-58.5 fps, `medium` | same | the Bou and the Mulassa alike (JS 6.5-6.8 ms, 3D 3.8-4.2 ms a frame) |
| The new figure's light sweep | — | no frame over 50 ms of its own, 2-4 paints in 2 s | compositor-only (`translate`) |

Still there: the opening's 251-302 ms (frames of 50-117 ms; a trace still counts ~25 programs compiled in one of them,
not chased: whatever the rehearsal under the cover does not show, the corner buttons among it), and one 100-117 ms
frame ~0.25 s before the selector shows (the splash's tap itself).

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

## A rented phone (AWS Device Farm)

For a phone nobody has at hand (an old iPhone, another iOS): real devices in us-west-2, the owner's AWS account, project
`mulassa-perf`. Each run needs the owner's go-ahead, with the minutes left read first (`aws devicefarm
get-account-settings`): only the test's own minutes are metered (a 44 s flow: 1.7 of the job's 9), $0.17 each after the
1,000 trial ones. Never buy an offering (the unmetered slots are $250 a month); keep `jobTimeoutMinutes` at 8.

1. **The build.** `QA_BUILD=1 VITE_SUPABASE_URL= VITE_SENTRY_DSN= npx vite build --outDir <dir>`: the debug flags
   (`?autoplay`, `?from`, `?mute`) on any host (`src/core/flags.js`; `vite.config.js` refuses it in CI, its build
   stamp ends in `-qa`). Serve it with `vite preview`, the probe proxy in front, and a tunnel in front of that
   (`cloudflared tunnel --url http://127.0.0.1:<proxy port>`); close all three when the run ends.
2. **The package.** A folder with `tools/qa/device/farm-test.mjs`, a `package.json` whose `test` script runs it, and
   `farm-plan.json` (`{ url, figure, diff, maxSeconds }`, the tunnel's URL with its flags); `npm pack`, zip the `.tgz`,
   upload as `APPIUM_WEB_NODE_TEST_PACKAGE`. The spec is `tools/qa/device/farm-spec.yml`
   (`APPIUM_WEB_NODE_TEST_SPEC`: the service refuses its own default spec unmodified).
3. **The run.** A device pool with one rule (`ARN IN [...]`), `schedule-run --test type=APPIUM_WEB_NODE,…
   --execution-configuration jobTimeoutMinutes=8,videoCapture=true`. The result is `mulassa-perf.json` in the run's
   Customer Artifacts (per second of song: frames, frames over 25 and 50 ms, the worst; the long frames with their
   song time; `?perf` every 2 s), next to the device's video; the probe proxy's log has the same session live.
4. **From a hitch to its owner.** A long frame at the same song second names what starts then (2026-11-14, iPhone 8,
   iOS 16.7: 121 ms where the Bou's rave starts, 199 ms at its bombo: the banknote's texture uploaded on its first draw).
   Profile that stretch on the Mac at 4× CPU throttling by song time, fix, run the same plan again.

Limits: Low Power Mode cannot be chosen, the phone's temperature is unknown, autoplay is not a finger, and `?mute`
leaves the audio path out. Safari under Appium ran the game at its normal 60 Hz.

`tools/qa/device/farm-run.mjs <plan.json> [outDir]` does steps 2 and 3 (it refuses a plan over its `budgetMinutes` and
prints the minutes left). A flow's `phases` (`{ label, seconds, css?, awake? }`) are an A/B on the selector: one injected
CSS at a time, each with its fps; the result's `anims` lists the CSS animations still running at the end.

Traps met (2026-11-14):

- **One session proves nothing on the selector.** An iPhone 8 opened it at 12 fps in six sessions of eight and at 50 in
  two; an iPhone 13 on iOS 17 opens it at 30 and any injected style moves it to 48, where it stays. Alternate the
  variants in one session (A, B, A, B) and repeat across sessions; a jump at the first injected CSS is not that CSS.
- **Stop the animations before judging the still page.** Hide parts one by one (`display: none`, cumulative) only with
  `*,*::before,*::after{animation:none!important}` already in.
- **Safari's inspector is sometimes not there** («did not return any connected web applications», 3 jobs of ~20): the
  job fails in under a minute, with no result file. Run it again.
- **A clean phone pays every first draw** (Safari keeps the GPU's pipelines afterwards): a hitch seen only in the first
  flow of a job is that. A/B it with one variant per job, never two flows in one.
- `content-visibility` does not exist in Safari before 18: `@supports not (content-visibility: hidden)` is how the CSS
  tells those apart (the idle screen's `display: none`, the selector's stopped animations, `styles/select-sizes.css`).

What it found on the selector: iOS 16 and 17 composite its endless CSS animations and its carousel over the 3D badly
(iPhone 8: 12 fps, 44 without the animations, 60 without the carousel too; the same iPhone 13 does 30 on iOS 17.6 and
60 on iOS 18.5). An Android S10 and iOS 18 are not affected.
