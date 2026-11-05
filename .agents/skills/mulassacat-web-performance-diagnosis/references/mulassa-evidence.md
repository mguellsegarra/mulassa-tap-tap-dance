# Mulassa historical evidence

These are historical case notes from the 2026-10-19 inventory, not current validation or universal thresholds. Recheck current code and device/service state before relying on an old decision. Read original messages only when needed and authorized; do not export transcripts or private payloads.

## P01

A/B isolation identified outlined canvas text as the bottleneck. The historical controlled desktop emulation reported 45.5 to 58.3–59.8 FPS; this was not a physical iPad measurement.

## P02

A real 60 Hz run still had visible jumps from the audio clock. Visual smoothing preserved the judging clock; 120 Hz results were simulations.

## P03

First-use audio, sprites and shader work moved or warmed after identifying its cost. Startup and first interaction need separate measurement.

## P04

A hidden tab could not establish 144 Hz behavior; another investigation acknowledged an unnecessary quality-threshold change.

## P05

Persisted degradation could retain poor quality after the original condition ended. Recovery and storage failure were checked; physical-iPhone confirmation was separate evidence.

## P06

Simulated loader improvement did not establish the cause or resolution of the original physical-iPhone freeze.

## Q06

Zero new text sprites during the measured streak sequence was interpretable; noisy frame timings under heavy machine load were explicitly rejected.

## P07

2026-11-03, Galaxy S10 over adb: the «3D choking» under the selector was DOM work. Size containers on 50 card portraits made
every `showModal()` ~300 ms (440 ms for the stats notice at entry); `:has()` over `[hidden]` cost ~55 ms a figure change;
33 inline SVG arms cost ~300 ms of first GPU raster. Each found by on-device A/B, not by reading code; converting the
portraits to bitmaps, the reel dissolve and the network were measured and ruled out. Emulating 375×667 on the S10 found
the same containers on the 84 cards there (sheets ~500 ms → ~30-50 ms). Lessons and the «never again» list: `docs/agents/graphics.md`.

## P08

2026-11-03, iPhone (iOS 18.7, Low Power Mode) through a LAN proxy that injected a frame probe: Safari's rAF alternated
30 Hz and 24 Hz (41.7 ms, five refreshes of a 120 Hz screen) with the frame's JS at 8-14 ms. The quality monitor reset
at the song's start, saw 24 Hz as 100% slow frames and dropped medium → minimal; it read 24 Hz as overload, not a cap.
The cap band now covers it (`render-quality.js` CAP, `tests/render/low-power.mjs`). With that fix a production build kept medium
on the splash. Safari's profiler (through `ios_webkit_debug_proxy` on mbp-m1, sourcemaps) then named its JavaScript:
applause synthesis 15%, the Drac's legs ~13% while the Mulassa is on screen, the crowd 7%; nothing over 50 ms.

## P09

2026-11-03, the iPhone's idle reel: bursts of 96/42 ms frames with the JavaScript at 8-10 ms; Safari's CPU instrument showed
the heap collector's threads at 10-25%. Headless Chrome's sampling heap profiler (`tools/qa/alloc-profile.mjs`) found
12.8 MB/s on the splash: Math.hypot boxing per vertex, arrays emptied with length = 0 every frame, and three.js's shared
shadow depth material re-evaluated ~4 times a frame. Fixed to 7.3 MB/s; `tests/render/alloc-budget.mjs` now guards it.
On the iPhone the bursts stayed: the garbage was not their cause (P10).

## P10

2026-11-03, the same bursts, found over the LAN with the probe proxy's command channel (`tools/qa/device/ios-phases.mjs`):
only while the faded UI stayed in the page. 30 s phases: as is 12-32% of frames over 80 ms; UI visible 0%; display none
0-0.5%; visibility hidden 17-27%; content-visibility hidden 0%. Safari composites invisible layers; the fix stops
rendering the UI once the fade is over (`data-reel-gone`). Four «obvious» causes before it were measured to nothing:
the dissolve, a shot, the WebGL copy, the collector.
