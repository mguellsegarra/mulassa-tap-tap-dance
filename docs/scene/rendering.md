# HUD scale, frame pacing

Current rules, moved out of AGENTS.md so they load only when the task needs them. Read before changing `platform/render-quality.js` or `hud/canvas.js`.

- **HUD scale `K`** (css px per HUD unit, `uiScale` in main.js; also CSS `--ui` = K/2 for the tablet pad): phones 1.5; tablets in proportion to the screen (a 1024×768 iPad = 2, a 12.9" iPad Pro ≈ 2.7, cap 2.9: their css px follow the glass); desktops grow gently (2 up to 800 px of height, +1 per 600 px, cap 2.9: 2.5 was too small, unbounded proportion giant; a bigger monitor only shows more css px, the UI must not become giant).
- Frame pacing (`framePacer`, render-quality.js): up to 95 Hz every refresh is drawn. 120 Hz (ProMotion) screens run
  at 120 while the device keeps up; > 15% missed refreshes in a 2 s window drop it to an even 60 (every other
  refresh); back to 120 only after 5 s of good frames (longer after failed tries), at most 3 switches a minute, and
  never mid-song (`pace(now, hold)`, hold = a song is on: it may drop, it never retries 120 until the song is over).
  `frameMonitor` (quality steps) normally judges against 60 fps (> 24 ms = slow), never the 120 budget: a 120 Hz miss
  halves the rate first, quality drops only when even 60 is out of reach. Also one step when play keeps hitching (`SPIKE`: 5 frames
  over 50 ms within 3 s; menus/pause/hidden tab don't count). iOS Low Power Mode caps Safari's rAF at
  30 Hz (`pace.lowPower`): a steady ~33 ms cadence permits one quality step per session, then judges misses against
  30 Hz (> 48 ms slow, > 100 ms hitch). It cannot distinguish a cap from a device too slow for 60; genuine missed
  frames still lower quality. A faster frame or background gap resets the inferred cap.
  The rAF rate a device reaches is all the pacer sees (a slow one reads as a slower display). So **everything that
  moves must use real time** (`dt`, `clock`, song time): no per-frame factors
  (`v *= 0.97` → `0.97 ** (dt * 60)`), no per-frame random chances; `tests/render/render-quality.mjs` simulates the rAF.
- `?perf` is the frame-rate debug line (`docs/agents/testing.md`).
