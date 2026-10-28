# Validating a camera change

## Measure, then look

- Showreel framing across sizes: `/tools/dev/reel-review.html` on the dev server (live, side by side, pick the figure, mode and shot), and `node tools/qa/reel-review.mjs` (clipping: a whole loop on the idle screen, 4 samples a second, the share of her outline outside the screen per shot; `--figs`, `--props`, `--vps`; at most 3 pages at once, 4 crashed Chrome).
- Measure her projected screen box against the free band every ~100 ms with a temporary probe (overlap %, px over the header or dock, time under the dock after a wake). Remove the probe afterwards.
- Measure angular speed of the view (rad/s) over a whole loop or song, at the largest screen you care about (2560×1440 for the Studio Display). Duration alone does not show dizziness.
- Real GPU (Chrome + Metal) for anything about motion; SwiftShader fakes hitches. One capture at a time (`/tmp/mulassa-capture.lock`).
- `tools/qa/capture.mjs` videos came out scaled and cropped for selector framing. A contact sheet of real screenshots taken once a second, plus the numbers, worked better. A static contact sheet still does not prove the absence of jumps: use the per-frame numbers for that.
- Same viewport, figure and song time for before/after. Check Mulassa, Drac and Bou when the change is shared.

## Viewports

Phones portrait 320×568, 375×667, 393×852; tablet 1024×768 (iPad Mini, touch); desktops 900×700, 1280×800, 2560×1440. Landscape phones and portrait tablets show the rotate cover on menus: measure those sizes as desktop windows. Free play on phones is landscape.

## Traps met before

- Headless Chrome does not really hide a tab: simulate `document.hidden` plus `blur` / `visibilitychange` in the page. A real iPhone tab switch is still unverified.
- Pointer Lock is refused headless and in the T3 preview; Playwright Firefox delivers no events outside the viewport (release the button inside the window). Headed Chromium stalls when occluded: disable occluded-window throttling.
- The owner often sees an old build: the dev server does not hot-reload this reliably (`hmr: false` on some servers). Ask for a hard reload, or reopening the home-screen app (it keeps the URL and port it was added from), before assuming a bug. Confirm the port and worktree he is on.
- When he says «mòbil», reproduce the exact device: iPad Mini and 900-1100 px windows have their own layout rules.
- `drac-colla.js` must not import framing modules directly: the dev comparison page may reach only a few modules (a test checks it). Pass the function in.
- Other agents edit the same worktree: a red `npm run check` may not be yours. Check by reverting only your files in a temporary copy, never by touching theirs.
- A cut must be final in its own frame. The owner reads any correction a frame later as a second cut (2026-10-24): the figure change dissolved from a frame that already showed the new figure, and `aimShot` clamped the height with the old distance's `pitchMin` (out of the Drac's close-up the camera dropped 1 m one frame after the cut). And on a figure change the new model's world matrices were still the last render's and the pivot passed in was the old figure's, so the cut frame could not measure it: a provisional, off-centre frame, then the late snap. Now the cut updates the figure's matrices, measures, re-aims at her outline's middle and measures again, all in the cut's frame (`frameMenuCamera`). A 10 Hz sample or a contact sheet cannot see it: log the camera per rAF inside the page (position, fov, `view.offsetX/Y`) and count steps per cut. In the test harness, wake the selector (`pointermove`) or the idle screen's band hides it, and give it a desktop-sized band so the shots sit at different distances.
