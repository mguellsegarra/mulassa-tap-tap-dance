# Free play / photo mode camera

The current rules are in `docs/ui/free-play.md` («Photo mode on touch») and `docs/ui/selector.md` («Selector camera», «Menu placement»). This file adds the decisions and quirks behind them.

Owners: `scene/orbit.js` (`ORBIT`), `ui/input.js` (buttons, wheel, pinch, double-tap guard), `ui/mouse-look.js` (Pointer Lock), `game/photo-control.js` / `scene/photo-motion.js` (movement, turn, collision), `game/photo-touch.js` + `ui/photo-stick.js` (touch), `scene/cameras.js` (`applyCameraImpact`, `clearCameraImpact`).

Threads: Revisió càmera WoW and the third-person research (2026-10-18), Pointer Lock (2026-10-20), clic esquerre en WASD (2026-10-20, Codex), sacsejada dels salts (2026-10-20, Codex), WASD mòbil (2026-10-20), zona superior dreta (2026-10-19, Codex).

## Mouse (desktop)

- The owner\'s contract, «com els jocs típics, al WoW»: **LMB orbits the camera only** (no figure turn, no lock), also while walking or running. **RMB turns camera and figure** and takes Pointer Lock. Releasing RMB while LMB is held keeps orbiting. A Codex fix once removed LMB orbit entirely while driving; the owner rejected it: never generalise "LMB must not act like RMB" into "LMB does nothing".
- With two buttons, Pointer Events do not fire a `pointerdown`/`pointerup` per button: RMB start/end follows `mousedown`/`mouseup`.
- The cursor hides only while driving a figure with the button held. In «Mira la plaça» (no figure) the cursor stays visible.
- Pointer Lock (`mouse-look.js`), not pointer capture: capture still stops `movementX` at the screen edge. No `unadjustedMovement` (sensitivity unchanged).
  - Firefox sends its own `pointermove` with `buttons = 0` right after locking and while locked (also with `movementX = 0`); treating it as a release dropped the lock. Ignore no-button, no-movement moves while locked; a no-button move WITH movement ends the drag (the safety net for a lost `pointerup`).
  - The first move after a lock change is skipped (`lookSkip`): it can carry a jump.
  - `lookEscape()` swallows the one Escape that unlocks (within 300 ms) so it does not also drop the figure.
  - Headless Chromium/WebKit and the T3 preview answer `pointerlockerror`; the capture fallback must keep working there. A mock of `requestPointerLock` proves nothing about real capture: real Chrome/Firefox/Safari need a manual check.
- Figure turn on RMB: the research found WoW really snaps the character, but a big figure filling the screen makes a snap look harsh. Use a capped, critically damped turn and leave the camera where it is while the figure turns.
- Early audit findings (2026-10-18) still worth knowing: the photo camera once rode the title camera's 1.6 s follow (4 m behind a walking figure, so she sat high over bare floor); the selector's band shift must be 0 in photo mode; clamp pitch to the orbit limits before use (it dropped the lens into heads); take strafe direction from the exact view yaw, not the lagged camera.

## Touch (phones)

- Floating stick on the left half (nipplejs behaviour copied, no dependency: appears under the thumb, the base follows past the ring so reversing responds at once, radial dead zone with a response curve: slow near the centre, gallop at the rim). At rest it waits half-transparent in the corner.
- Right half: drag to look. iPhones send touches at 60 Hz while drawing at 120 Hz, so raw deltas stepped: deltas are queued and eased in over ~45 ms, the final turn is exactly what was dragged. A swipe across the screen ≈ 190° on any phone; portrait counts less than landscape.
- Movement like Genshin/Roblox, not Fortnite (a shooter): the stick moves her relative to the camera and she turns to where she walks; walking forward, the camera eases behind her, but not while the right thumb is looking.
- Layout from handcam videos: jump (84 px) where the right thumb rests (~90% width, 78% height; Genshin's main button ~88%/78%), Q/E/R on an arc round it, the figure swap on the right edge as a portrait, out of the thumb's reach.
- No pinch zoom in this mode (Fortnite's third-person mobile camera has a fixed distance).
- Landscape: Android can lock orientation only in fullscreen; iPhone cannot, so the «gira» cover asks. The home-screen app removes Safari's bars; Safari users get a tip on every entry.
- Safari double-tap zoom: the photo layer cancels `touchstart`, and a second tap within 350 ms never zooms anywhere (`touchend` guard in input.js, tested in `tests/ui/selector-controls.mjs`).
- A transparent info box intercepted touches before the HUD, so a camera gesture could not start top-right on iPhone: gaps must let the orbit start (`pointer-events`), controls keep theirs.

## Jump shake

- Shake fires only when the figure you drive lands from a manual jump: never for demo jumps, the other figure, or «Mira la plaça». The impact keeps actor and origin until landing, one pulse per landing, cancelled on control change, pause or blur; reduced motion removes it; attenuated with the camera very close.
- The owner first asked for "moderate"; the 12 mm / 160 ms version was too weak and the owner asked for the original strength back (Mulassa 0.98, Drac 0.9, original decay), keeping the gating. Gating was the fix, not the amplitude.
- The time bound must be real time: the game clock clamps long frames, which stretched the shake on slow machines.
