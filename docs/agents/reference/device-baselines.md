# Device baselines and dated measurements

Numbers to compare a new measurement against, with their build, device and date. Moved here verbatim from
device-profiling.md on 2026-11-15; record a new baseline here when results change. How to measure:
[device-profiling.md](../device-profiling.md).

## Allocations, 2026-11-03

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
(then sliced on timers on the main thread in `audio-voices.js`; since then a recorded `sfx/applause.mp3` decoded off it), the Drac's legs and dance ~13% (`drac-legs.js`,
`drac-steps.js`, `dance-drac.js`) although the splash shows the Mulassa, her supports 4%, the crowd's contact and grid
7%, three.js matrices ~13%. No span over 50 ms and no gap without JavaScript in that run: the cost is spread over
every frame. Next lead (the applause went off the main thread since): check why the Drac is posed while
not on screen.

## The unattended iPhone, 2026-11-14

On 2026-11-14 the Control Center drag and the Home button did nothing through Device Hub, and a zoomed mirror swallowed
every click (details in [performance-hunt-2026-11-14.md](performance-hunt-2026-11-14.md), "The plugged-in iPhone, driven
without the owner").
