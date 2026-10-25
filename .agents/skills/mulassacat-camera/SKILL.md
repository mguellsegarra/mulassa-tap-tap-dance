---
name: mulassacat-camera
description: "Mulassa project only. Design, tune or debug any of the game's cameras: the selector (home) framing and its showreel cuts, the idle screen, the play camera, free play / photo mode (mouse, pointer lock, touch stick and look, jump shake). Use before changing cameras.js, framing.js, orbit.js, showreel.js, reel-idle.js, mouse-look.js or photo-touch.js, and when the owner reports dizziness, abrupt cuts, a figure out of frame or under the UI."
---

Apply only to Mulassa and its checkouts. Read the current rules first: `docs/ui/selector.md` («Selector showreel», «Selector camera»), `docs/scene/play-camera.md` and `docs/ui/free-play.md` («Photo mode on touch»). This skill keeps the why, what the owner rejected and the traps, so a change does not repeat them. It does not authorize delegation, device access or Git operations.

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

- **Comfort first.** the owner gets dizzy from fast or swinging cameras, more on a large display. Bound angular speed (rad/s, roughly screen fraction per second), not only duration. Measured limits that work: showreel ≤ 0.15 rad/s, colla dodge ≤ 0.12 rad/s, orbit return ≤ 0.55 rad/s.
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
4. Add or extend a test at the owner (`tests/figures/common/showreel.mjs`, `tests/render/framing.mjs`, `tests/render/orbit.mjs`, the camera blocks of `tests/render/render-quality.mjs`) and check it fails without the change.
5. Report what was measured, which figures (Mulassa, Drac, Bou) and viewports, and that no physical device was tested unless one was.

Read [sources](references/sources.md) before new research: dance film, music video, third-person camera and touch-control findings are already collected there.

## A new figure

For a whole new figure, start from `mulassacat-nova-figura`; this skill owns phase 8. Each figure needs:

- A framing size that fits its whole dance envelope (props, fire, carried lifts), measured over the full dance, not its rest pose.
- Its own `SHOWREELS` entry in `game/showreel.js`: a fresh selection opens on a wide shot as it sets off; long, open takes per part of the dance; dissolves, not hard cuts, placed where the figure stands still; comic close-ups (short, a long lens, `part`) only where its root is still. Repeat the review at the owner's large display.
- A play-camera follow that keeps it in shot without swinging the plaça under the note lane (`DRAC_CAM`/`MULA_CAM` pattern), and a festa camera when the figure is carried or leaves the usual area (`FESTA_CAM` for the Bou's lap).
- "Mira el ball" lets the user orbit and zoom while the dance and music go on, then eases back to the reel's shot.
