# Validating a camera change

## Measure, then look

- Measure her projected screen box against the free band every ~100 ms with a temporary probe (overlap %, px over the header or dock, time under the dock after a wake). Remove the probe afterwards.
- Measure angular speed of the view (rad/s) over a whole loop or song, at the largest screen you care about (2560×1440 for the Studio Display). Duration alone does not show dizziness.
- Real GPU (Chrome + Metal) for anything about motion; SwiftShader fakes hitches. One capture at a time (`/tmp/mulassa-capture.lock`).
- `tools/capture.mjs` videos came out scaled and cropped for selector framing. A contact sheet of real screenshots taken once a second, plus the numbers, worked better. A static contact sheet still does not prove the absence of jumps: use the per-frame numbers for that.
- Same viewport, figure and song time for before/after. Check Mulassa, Drac and Bou when the change is shared.

## Viewports

Phones portrait 320×568, 375×667, 393×852; tablet 1024×768 (iPad Mini, touch); desktops 900×700, 1280×800, 2560×1440. Landscape phones and portrait tablets show the rotate cover on menus: measure those sizes as desktop windows. Free play on phones is landscape.

## Traps met before

- Headless Chrome does not really hide a tab: simulate `document.hidden` plus `blur` / `visibilitychange` in the page. A real iPhone tab switch is still unverified.
- Pointer Lock is refused headless and in the T3 preview; Playwright Firefox delivers no events outside the viewport (release the button inside the window). Headed Chromium stalls when occluded: disable occluded-window throttling.
- Marc often sees an old build: the dev server does not hot-reload this reliably (`hmr: false` on some servers). Ask for a hard reload, or reopening the home-screen app (it keeps the URL and port it was added from), before assuming a bug. Confirm the port and worktree he is on.
- When he says «mòbil», reproduce the exact device: iPad Mini and 900-1100 px windows have their own layout rules.
- `drac-colla.js` must not import framing modules directly: the dev comparison page may reach only a few modules (a test checks it). Pass the function in.
- Other agents edit the same worktree: a red `npm run check` may not be yours. Check by reverting only your files in a temporary copy, never by touching theirs.
