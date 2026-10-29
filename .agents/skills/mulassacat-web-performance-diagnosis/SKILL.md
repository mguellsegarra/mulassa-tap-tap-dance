---
name: mulassacat-web-performance-diagnosis
description: "Mulassa project only. Diagnose browser frame hitches, rendering cost, startup stalls and audio-clock judder using comparable measurements. Use for a performance symptom or a change to a measured hot path, not as a mandatory benchmark for every edit."
---

Apply only to Mulassa and its checkouts. Read the current repository AGENTS.md and use its module map (`docs/agents/structure.md`) and validation rules. These instructions do not apply to unrelated projects or authorize extra access, delegation or publication.

# Web performance diagnosis

Establish the affected user flow and a repeatable baseline before choosing an optimization.
Record revision, browser, physical device or simulation, GPU backend, viewport, DPR,
refresh rate, throttling, visibility, cache/warmup state and sampling window. Keep baseline
and candidate under equivalent conditions. A hidden tab or overloaded machine invalidates
refresh-rate conclusions; record the limitation rather than tuning thresholds from it.

## Diagnose and change

1. Separate startup, first interaction and steady-state costs. Inspect frame-time
   distribution, worst/late frames and long tasks as well as average FPS. Correlate the
   reported hitch with rendering and clock traces; smooth FPS can conceal visual judder.
2. Isolate plausible costs with targeted A/B runs: HUD, 3D, CPU work, GPU wait, layout,
   network/third-party initialization or audio. Instrumentation can alter timing; label
   forced GPU synchronization and software rendering explicitly.
3. Check the shadow pass cost with `?perf=sync` at each quality profile, then the skinned crowd update, before touching DPR or crowd counts. Optimize the measured owner. Cache bounded reusable drawing, avoid allocations/layout
   reads in hot loops, batch compatible geometry and warm first-use work when evidence
   supports it. Account for cache lifetime, memory, quality and startup tradeoffs.
4. Preserve correctness clocks and input timestamps. Visual interpolation must not silently
   change judging or simulation time. Use elapsed time for motion; test cadence changes,
   suspension and recovery where relevant. Distinguish a refresh/power cap from overload
   before permanently degrading quality; either interpretation needs evidence.
5. Rerun the same scenario and inspect the affected behavior. For adaptive quality, exercise
   downshift, recovery and stored settings. For render resources, check repeated use and
   actual rendering after context recovery; stable counters alone do not prove no leaks.

Report before/after values with conditions and uncertainty. If timings are noisy, report
only defensible deterministic counters. Label real-device, emulated and simulated results
separately; simulator success does not close a physical-device symptom. A mitigation can
be useful while the root cause remains unknown. Stop after relevant checks pass unless
new evidence warrants more work; do not optimize unrelated paths or hardcode old thresholds.

Read [historical evidence](references/mulassa-evidence.md) for HUD isolation, clock judder,
warmups, power caps and rejected measurements. Adapt commands to the current project.
