# Selector camera, showreel and idle screen

History and reasons. The current rules are in `docs/ui/selector.md` («Selector showreel», «Selector camera»); recheck numbers in the code.

Threads: Càmera adaptativa del bestiari (2026-10-19, Opus, reviewed twice by Sol 6.1), Fer visible la demo del ball (2026-10-22/23), Enquadrar suaument el ball del selector (2026-10-23), the Bou's entry from Integrar el Bou jugable.

## Owners

| Concern | Owner |
| --- | --- |
| Shot list per figure, menu-beat clock, catch-up | `game/showreel.js` (`SHOWREELS`, `SHOT_KINDS`, `REEL`, `followBeat`, `REEL_GLIDE`) |
| Posing the dance at `REEL.beat` | each figure's hooks (`scene/figure-scenes.js`; the Mulassa: `figures/mulassa/mula-play.js`), `figures/drac/drac-dance.js`, `figures/bou/bou-stage.js` (called by `figures/bou/bou-play.js`) |
| Band fit, cuts, glides, lens widening, colla dodge | `scene/cameras.js` (`frameMenuCamera`, `frameMenuLens`, `zoomMenu`, `clearOfColla`, `MENU_T`, `HELPER_CLEAR`) |
| Outline, envelope, springs | `scene/framing.js` (`menuFit`, `envelope`, `smoothDamp` with its `max` speed), `scene/orbit.js` (`ORBIT.idle`, `.home`, `.homeSpeed`) |
| Crowd/colla shrinking from a low lens | `framing.js` (`lensShrink`, `LENS_CLEAR`), used by `crowd.js`, `drac-colla.js` |
| Idle screen | `ui/reel-idle.js` (`REEL_IDLE`, `idleBand`), `body.reel-idle` / `.reel-wake` in `select-sizes.css` |
| Camera lock on the selector | `ui/input.js` (`homeLocked`) |
| «Mira el ball» | `#select-watch` in the song row, `ui/watch-ui.js` (`startWatch`) |
| Tests | `tests/figures/common/showreel.mjs`, `tests/render/framing.mjs`, `tests/render/orbit.mjs`, `tests/render/render-quality.mjs` |

## Adaptive framing (2026-10-19)

Before: Mulassa and Drac at the same distance, moved only vertically; the Mulassa up to 35% off screen, the Drac 79% under the desktop info panel; the camera followed her heading, so the shot swung with every turn; results → selector was a hard cut (13.6 m in a frame).

Design kept since:
- ONE measured free band (`sheets.select.band`: under the info block, above the dock, right of a side panel). No magic rectangle per figure, no DOM reads per frame.
- Her live outline (support points through each mesh's matrix) sets the dolly so she fills 86% of the band height / 80% of its width. Fixed fov; position by a two-axis lens shift (view offset), never a tilt. Feet are the anchor so the floor does not bounce when she rises.
- Extents through an envelope (up 0.35 s, down 4 s) so turning side-on never pumps the size; centre through a slow average; no heading follow.
- Short bands (320×568, 375×667: 84-132 px) keep her readable and let her rise behind the info's lower rows, on purpose.
- After a drag, return after 2 s (`ORBIT.idle`), eased, capped at 0.55 rad/s (a half-turn return used to reach 0.91 rad/s). A figure change returns at once.
- Free play always drives one figure with its chase camera (no «Mira la plaça» orbit, no `keep`, no `MENU_T.exit`); the selector's leaving-photo test still bounds her feet back over the dock within 1.5 s.
- Accepted limits: the Mulassa can leave the edge ~11% at 393×852 while travelling fast; desktop windows ≤ 500 px tall have no free band and keep the old shot.

Pitfall: `getMatrixAt` on this three.js version returns nothing; pass the target matrix in.

## Showreel: how it got here

1. Request: the dance demo was hidden behind «?». The owner chose a live preview behind the selector.
2. Music: the menu loop stays; the dance follows it, one song beat per menu beat (Mulassa 93-100% of her speed, Drac ~1.3x). Never switch the menu music to the figure's song for this.
3. First cut, rejected («fa mal d'ulls, no em sona un videoclip»): a pop-video edit. Mulassa 34 shots in 92 s (a cut every 2.7 s, 15 shots of 1.6 s), Drac 32. Arcs up to 1.5 rad and push-ins inside shots, a 0.4 s follow, shots filling 96% of the band.
4. Research → dance film (see [sources](sources.md)): long open takes, whole body, still camera while she moves, slow eased moves when she is calmer, 180° rule, cuts on musical structure.
5. Result: Mulassa 8 shots, Drac 9. Hard cuts only at the big changes (≤ 5 a loop), eased glides elsewhere, shots 16-36 beats (≥ 6 s), fill 60-80%, nothing moving inside a shot, follow 0.7 s.
6. Too many tiles on a Studio Display: heights 0.34-0.85 rad (the high shot at 13 m) showed up to 40% floor. Now 0.22-0.42 rad.
7. Dizzy on a big screen: a 1 rad glide in 4.7 s slid the plaça a third of the screen a second at the 38° lens. Now glides are 18 beats (~7 s), ≤ 0.6 rad, three-quarter shots less turned. Measured at 2560×1440 for 95 s: max 0.15 rad/s.
8. Never over an attendant's shoulder: ≥ 0.5 rad off any colla helper between lens and figure, by the shorter side, no side switch inside a shot (`clearOfColla`, ≤ 0.12 rad/s). The seated ring is not dodged: too many, almost no free angle left. Crowd/colla within 3.4 m of a low lens shrink away.
9. Camera locked on the selector: no drag, wheel or pinch (`homeLocked`). Free play keeps them.
10. The Bou: its entry has a smaller `fill` (0.8): it is low, and at full share the lens came within the front rows.
11. Cuts dissolve (2026-10-23, «que no fossin tant bruscos, més com a fosos», every figure): at a cut main.js renders the outgoing shot once more in its old camera, `ui/reel-fade.js` copies it onto `#reel-fade` (between `#gl` and `#hud`) and fades it out in 0.5 s over the new shot (0.9 s felt slow). The fade is live (`reelFadeLive`: the outgoing camera renders the dance again each frame of the fade): a frozen copy over a figure still turning showed two of her, one stopped («la imatge no ha de fer moviments bruscos»). Cuts also sit where she is still: measured per beat on the selector (her turn and travel over the fade's 1.5 beats), the Mulassa's 80/144/208 turned 0.5-1.1 rad a beat and moved a bar to 84/140/204 (≤ 0.2); the Drac's and the Bou's were already calm. Figure changes still cut wherever the player picks. One extra render and one copy per cut; the fade is opacity on the compositor. The figure swap on a selection change still pops under it (the new model is already in place when the old camera renders). 2026-10-24: a figure change no longer dissolves (`REEL.fresh`, main.js). The model swaps in the click handler, before the frame, so the "outgoing shot" rendered at the cut already showed the new figure in the old camera: the owner saw two shot changes on a Studio Display. Repro: log the camera per rAF in the page and count `#reel-fade` `animate` calls around a card click (`/tmp/reelval/swap.mjs` pattern); a regression in tests/render/render-quality.mjs.

12. The Drac's comic cut (2026-10-23, «humorístic i ben parit, no gaires canvis seguits, potser primers plans curts»): 4 cuts. It opens on a close-up of one head while it stands before its dance (beats 0-8), cuts wide as it sets off, glides low to the front for the charge at the lens, holds a close-up of its stare when it stops dead (96-104), and leaves the spins uncut, from a little above. Close-ups: `SHOT_KINDS.close` (`part: 'head'`), framed on `getObjectByName('head')` (the Drac model names its heads), the camera kept at the orbit's nearest and a long lens (`ZOOM_TELE` 3) doing the rest, so it never goes in among the crowd. Rules learnt: a long lens magnifies every move, so close-ups only where the root is still (found by sampling `rootAt` through `dracTime.refAt`; the torsions and the brake after the spins looked still but swing the heads metres); framing both heads side by side gave a mid shot, so one head, a smaller fill (0.55) leaving the other crowding in; a new figure shows a frame after its cut, so its first measure snaps as the cut would (`MENU.late`), or the long lens eased in as a visible zoom.

## Idle screen

- 10 s untouched → the UI fades. Fades went from 1.2 s («es veu massa») to 0.4 s out, 0.25 s in. The press that wakes it only wakes it: its down, up and click (or key up) never reach the game.
- Idle framing was reversed twice. First it reframed (portrait: feet low, plaça above); the owner found a reframe on top of the fade distracting, so desktops kept their framing. Then the owner asked for her to be always framed where no UI covers her (desktop left her small, right, over bare floor). Current: idle band = whole screen inside safe areas (portrait: low, in the dock's room); in ~2 s (`MENU_T.soft`), out in 0.45 s (`MENU_T.wake`) so she never lingers under the returning dock.
- Leaving the page (tab, app, window blur) pauses everything and puts the selector back; time away never counts. The owner chose this over keeping it running.
- Back from a tab the audio clock settles ~0.4 s backwards; the old re-sync jumped and cut. `followBeat` never jumps: ≤ 15% faster/slower until in step, and runs alone at the loop's tempo while the loop is silent or suspended.

## Band too short for the square

At 1280×800 with UI the dolly wanted ~23 m, the façades allow 15-17 m; her head rose up to ~130 px into the header. Where the dolly stops short the lens WIDENS the rest (the first attempt narrowed it: wrong way), eased, up to `ZOOM_MAX` (~54°). Other cameras take the title's lens back. Now ≤ 22 px over.

## «Mira el ball» placement (UI, but asked in the same threads)

P1 of five mockups: the button at the end of the song row; the demo left «?». Phones: outside the song pill (`.sel-song-plate`), same height (38 px, 44 px slop), play icon only under 375 px. Moving it exposed the song row's top border as a grey line across phones: removed there, kept on desktop. iPad Mini and 900-1100 px windows: play icon beside the song (smaller disc, 14 px credit) so the composer keeps one line; the Classificació separator is not drawn when its rows are hidden.

## Adding a figure's showreel

Write its `SHOWREELS` entry on the dance's phrases: `start` = her first move, `loop` = a bar after her last move, shots `[song beat, kind, 'cut' | 'glide']`, an optional smaller `fill` for a low figure. `tests/figures/common/showreel.mjs` enforces shot length, cut count, glide limits and full-body fill. Then check the colla dodge for that figure and watch it on a large desktop and a phone.

## Still open (2026-10-23)

A real Studio Display and iPhone; the idle framing with the Drac and the Bou; a test for `zoomMenu`. If a large screen still causes dizziness, the next step is widening the lens on big screens and measuring again.
