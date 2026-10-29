# The crowd and the plaça

Current rules, moved out of AGENTS.md so they load only when the task needs them. Read before changing `scene/crowd*.js`, `scene/representation*`, `scene/sky.js` or the plaça's props.

- **Crowd during the song** (`animCrowd`): still, near-invisible breathing; hits drive one eased envelope (`GROOVE`,
  `grooveHit`: a few cm bob, a few degrees nod/sway, attack ~0.1 s, release ~0.4 s; GUAPA/pop/good phrase a bit more,
  a miss only settles it) sampled per person with a small lag/gain. No creeping in while the song plays; any walking
  is capped (`GROOVE.maxV`, fleeing her excepted) and people at rest skip the neighbour search. Moods (calm, festa,
  sad, clap) are eased scalars, never switches: the finale / "eeeh!" / a clear result cheer, a collapse saddens.
  Only the first ring (`NEAR`, `pickNear`: the `PROFILES[].near` people nearest her that the camera sees, re-picked
  every 0.6 s, fading in/out) answers more: a slower tap of the same envelope (`mood.gr4`), bigger bob/nod/arm lift, more on
  GUAPA and a streak, a light on-beat bounce from combo 10. Tested per frame: calm crowd < 9 mm / 0.09 rad, 22 mm up; ring
  < 30 mm up / 0.12 rad (they include the ripple below).
- **Ripple** (`src/scene/crowd-fx.js`, `RIP`): each hit (not a miss, not a pump) sends a pulse out from her (9 m/s, up to 8
  live) that lifts, nods and raises the arms of whoever it reaches, GUA favouring the screen's left, PA its right; a part
  of the crowd answers a normal hit, everyone a GUAPA. Eased per person (`p.rip`), not for walkers, not in the festa or
  with reduced motion. CPU: distance/side are cached in `pickNear`; `PROFILES[].ripple` = rows that take part (high all,
  medium row 0 + first ring, low first ring only, minimal none). Costs ~1% of `animCrowd`.
- **Shove, growth**: a GUAPA makes the front row and first ring want 0.9 m more room for 0.5 s (`SHOVE`, the
  making-way below does the rest). Nobody is ever knocked over in the game (rejected: people falling to the floor); only photo mode's culada (R) knocks the near ones flat for a moment. After 8 judged notes about 40% of the back rows (`PRES`, `p.thr`) are only there while
  ENCERTS is above their threshold (scale 0, eased; never front row, menus, practice, finale).
- **Making way** (`RING`): the front row stands at `RING.front` (5.4 m) and everyone keeps `RING.clear` (3.8 m, + row,
  jitter) from her body box / swept rear, so her turning ends reach them and they step back (eased, ≤ `RING.flee`
  1.3 m/s, eased speed cap, hands up, lean back), then walk back to their spot (`RING.home` 0.35 m/s; blocked for
  `patience` s: they stay). Positions are drawn through a 40 ms ease (`p.gx/gz`); arms change ≤ 6 rad/s. Tested:
  ≤ 24 mm a frame, its change ≤ 8 mm, ≤ 0.15 rad; everyone else as before.
- **More people, no CPU**: the skinned ring stays as it was; the fullness comes from instanced figures with no bones
  (`buildBackdrop`, one shared material/program): the façade backdrop and the mid band (`midCrowd`, `MID`: r 9.4–12.6
  on the far side, ±1.45 rad; the moving crowd stops at `MID.edge` there) plus static balcony people, all counted
  per tier in `PROFILES` (`backdrop`, `mid`, `balconies`). The figures shrink away near a low lens (`uLens`).
- Sky (`scene/sky.js`): a gradient dome round the lens (the avatar's cyan `SKY.top` up high, `SKY.horizon` = the fog's colour, so the façades melt into it; drac-show's red smoke tints both ends through `scene.fog.color`/`scene.background`) and 14 voxel clouds in 4 m boxes (one `InstancedMesh`, flat toon colours per face, no lights or fog, their own seeded random so the plaça's layout keeps its draw) just over the skyline, drifting `SKY.drift` rad/s (still with reduced motion); minimal quality keeps the dome only.
- Plaça props (trees, lamps) are separate meshes (`plaza.props`) set back by the building fronts, out of the play
  camera's path; `blocks()` (framing.js) hides one that would stand between the camera and her or against the lens.
