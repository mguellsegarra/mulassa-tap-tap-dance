# Play camera

The current rules are in `docs/scene/play-camera.md`. This file adds the reasons. Owner: `framePlayCamera` in `scene/play-camera.js` (`CAMV`, `DRIFT`, `DRAC_CAM`, `MULA_CAM`, `insidePlaza`); tune with `?cam` (`src/dev/cam-edit.js`), whose «copia» line is the input to fit a per-device camera.

Threads: the Drac camera decisions in Integració jugable del Drac (2026-10-19); the play camera v3 values come from the owner's own `?cam` sessions on a desktop.

## Why it is built this way

- Defined by what you SEE (a slice of world 8.25 m tall at her, 8.4 m across on narrow screens, her focus 42% down the stage), not by fitting her whole turn/jump envelope: fitting the envelope made her tiny.
- Never still, never rhythmic: a slow sway with unrelated 13-29 s periods (`DRIFT`). A visible rhythm in the camera reads as a bug.
- The player stares at the note lane; anything that slides under it makes the plaça seem to swim. That is the reason for every follow limit below.

## Drac follow

- Before: it followed the Drac like the Mulassa, heading included. The Drac walks ~4 m and spins twelve times, so the plaça slid and swung under the lane at every turn.
- Now (`DRAC_CAM`): half its travel across, 90% in depth (less in depth put the heads under the lane on desktop), no heading follow, 12% further so it fits on a phone. Measured while playing: look-direction turn 1.5-1.8°/s on average (was 2-4°/s), peaks 6-7°/s (were 10-12°/s). The Drac never leaves the shot.
- The Mulassa's travelling dance got the same calm follow (`MULA_CAM`: all her travel across, towards the lens only as far as the square lets the camera back away).
- `?camdrac=segueix` restores the old heading follow for both (A/B). If it still dizzies, the remaining option is a fixed camera: no background motion, but a smaller figure (the whole path must fit).
- The dance frame was rotated so the play camera looks between two attendants; on phones attendant S covered the Drac. Helpers at 5.1 m, not 4.5 (the Drac walked through S at the close pass).

## Bou festa

- Followed like the others, the carried lap (a 2.6 m ring) brought the Bou within 4.0 m of a 1280×800 camera (it sits ~7 m from the centre): it filled the screen.
- `FESTA_CAM`: while `BOU_FESTA.k` > 0, 60% of the follow is let go (`hold`) and the distance is at least 13 m. Measured on GPU captures: nearest pass 6.3 m at 1280×800, 9.3 m at 375×667. Letting all of the follow go cropped the Bou at a 375 px phone's edge (only ~5 m across fit there). A bare multiplier (×1.45) also pushed the phones' camera (already ~13 m) far back, the figure tiny: a minimum distance does not.

## Shake

Small, additive, only GUAPA and the finale during play. Misses and pops do not shake. Never fed back into the springs.

## Open

On tablets the heads can sit under the lane at the Drac's close passes; adjust with `?cam`.
