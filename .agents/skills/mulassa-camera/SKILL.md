---
name: mulassa-camera
description: "Mulassa project only. Design, tune or debug any of the game's cameras: the selector (home) framing and its showreel cuts, the idle screen, the play camera, free play / photo mode (mouse, pointer lock, touch stick and look, jump shake). Use before changing cameras.js, framing.js, orbit.js, showreel.js, reel-idle.js, mouse-look.js or photo-touch.js, and when Marc reports dizziness, abrupt cuts, a figure out of frame or under the UI."
---

Apply only to Mulassa and its checkouts. Read the current AGENTS.md first: its «Selector showreel», «Selector camera», «Play camera», «Photo mode on touch» paragraphs are the current rules. This skill keeps the why, what Marc rejected and the traps, so a change does not repeat them. It does not authorize delegation, device access or Git operations.

# Cameras

## Which camera, which owner

| Camera | When | Owner | Reference |
| --- | --- | --- | --- |
| Selector (home) framing | `G.state = 'select'` | `scene/cameras.js` `frameMenuCamera` / `frameMenuLens` / `zoomMenu`, `scene/framing.js` (`menuFit`, `envelope`, `smoothDamp`), the band from `sheets.select.band` | [selector](references/selector-and-showreel.md) |
| Showreel shots | selector, playable figure | `game/showreel.js` (`SHOWREELS`, `SHOT_KINDS`, `followBeat`), framed by cameras.js; cuts dissolve through `ui/reel-fade.js` | [selector](references/selector-and-showreel.md) |
| Idle screen | selector untouched 10 s | `ui/reel-idle.js` (`idleBand`), `MENU_T.soft` / `.wake` in cameras.js | [selector](references/selector-and-showreel.md) |
| Play camera | run, practice, results | `framePlayCamera` (`CAMV`, `DRIFT`, `DRAC_CAM`, `MULA_CAM`), tuned with `?cam` | [play](references/play-camera.md) |
| Free play / photo mode | `#free`, `PHOTO.on` | `scene/orbit.js` (`ORBIT`), `ui/input.js`, `ui/mouse-look.js`, `game/photo-touch.js`, `ui/photo-stick.js`, `game/photo-control.js`, `applyCameraImpact` | [free play](references/free-play-camera.md) |

Keep each change in its owner. `main.js` only calls them. Never move the camera to fix a UI layout problem, and never change music, choreography or the model to suit a camera.

## Rules that every camera keeps

- **Comfort first.** Marc gets dizzy from fast or swinging cameras, more on a large display. Bound angular speed (rad/s, roughly screen fraction per second), not only duration. Measured limits that work: showreel ≤ 0.15 rad/s, colla dodge ≤ 0.12 rad/s, orbit return ≤ 0.55 rad/s.
- **The figure is the subject; the camera answers, never mirrors.** Do not follow her heading in dances that spin (both do). Do not chase limbs: extents go through an envelope (up fast, down slow).
- **Constant, slow springs.** A spring whose stiffness changes while far from its target whiplashes. Switch to calm springs only once she is framed and nearly still.
- **Real time.** Everything through `smoothDamp` or `exp(-dt/τ)`; test at 30/60/120 fps. No per-frame allocations (a closure added to a camera function had to come out).
- **Shake is additive** and never fed back into springs or targets.
- **The user rules while touching.** No recentre during a drag; ease back after a delay. On the selector the camera is locked (`homeLocked`): the showreel owns it.
- **Reduced motion:** one still shot, no cuts, no shake.
- **Lens over tilt.** Frame with dolly plus view-offset lens shift. Widen the fov only where the plaça stops the dolly (`zoomMenu`, up to the play camera's 54°).

## Workflow

1. Read the reference for the camera you touch and the current code. Recheck any number here against the code: these are history, not contracts.
2. Reproduce and **measure** before editing: her projected box against the free band, per frame, in the affected viewports (see [validation](references/validation.md)). Screenshots alone hide motion; recorded videos came out cropped.
3. Change one thing, keep a before/after at the same viewport, figure and time.
4. Add or extend a test at the owner (`tests/showreel.mjs`, `tests/framing.mjs`, `tests/orbit.mjs`, the camera blocks of `tests/render-quality.mjs`) and check it fails without the change.
5. Report what was measured, which figures (Mulassa, Drac, Bou) and viewports, and that no physical device was tested unless one was.

Read [sources](references/sources.md) before new research: dance film, music video, third-person camera and touch-control findings are already collected there.
