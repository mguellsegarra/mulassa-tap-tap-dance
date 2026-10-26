# Graphics and performance

- No per-frame allocations in the loop: reuse vectors, pools and arrays.
- Voxel models: avoid coplanar faces (z-fighting); offset or merge instead.
- **Figures' dances and fire** (the Mulassa's figures on the song's beats, the Drac's dance in reference seconds and its fire): `docs/figures/dances.md`; the Bou's in `docs/figures/bou.md`. Never add random motion to a song choreography; one time map per figure.
- **Play camera** (`framePlayCamera`): `docs/scene/play-camera.md` and the `mulassacat-camera` skill. Shake is additive, never fed back into the springs.
- **HUD scale, frame pacing, FPS readout**: `docs/scene/rendering.md`. Everything that moves uses real time (`dt`, `clock`, song time): no per-frame factors and no per-frame random chances; the rAF rate a device reaches is all the pacer sees.
- **Crowd and plaça** (the crowd's groove and moods, the ripple, making way, the instanced backdrop, sky, props): `docs/scene/crowd-and-plaza.md`. Nobody is knocked over in the game; crowd motion is tested per frame.
- Canvas: pair every `save()` with `restore()`; reset `globalAlpha`, shadows and clips.
- HUD cost: outlined text goes through `text()` / `bigWord()`, which blit cached sprites (stroked glyphs every frame
  were the iPad's stutter); no `shadowBlur` (use `glowPath()` / `glowDisc()`); the HUD canvas is capped by a pixel
  budget (`hudScale`); no layout reads per frame (`playBottom()` caches the pad's top). Input is judged at the event's
  timestamp on the de-stepped song clock (`press(dir, e)`), never at frame time.
- Hitches (first uses): animated text sizes use `text(..., grow)` (one sprite, scaled) instead of a new sprite per size;
  at most `SPRITES_NEW` new text sprites a frame (the rest drawn directly that frame); big words share one outline sprite
  per word/size (`bigWord` rim) and words needed on a beat are painted ahead (`warmStart`, `warmups`; on the splash the logo first). Every program,
  hidden objects and the GLOBUS stills' sRGB pass included, is compiled up front (`precompile`), and again
  (screen only) after a quality step. Never share one material between plain and skinned/instanced meshes.
- Mobile GPUs: respect `render-quality.js` profiles; don't raise DPR or shadow cost casually.

## Performance rules

- Budget per quality profile: every new object type states its draw-call and triangle cost and which profiles show it; measure with `?perf` before and after (`?perf=sync` for the GPU side) and stay inside the profile's numbers.
- One `InstancedMesh` or merged mesh per visual role; no skinned mesh per person or per prop. Record the new bone / skinned-people count in the `?perf` check: bone matrices are re-uploaded every frame.
- Shadow casters are an allow-list: a new mesh is `castShadow = false`, and only gameplay-relevant ones turn it on, at medium/high. A change to lights or colour fx re-checks the shadow programs (`material.needsUpdate`).
- A new material, hidden mesh or shader variant must be reachable by `precompile`; check a first-use capture for a compile hitch.
- Whatever is created at runtime and removed (render targets, canvas textures, geometries) has a named owner that calls `dispose()`; leak checks read `renderer.info.memory` after repeated use. Scene objects are built once and toggled (`docs/architecture.md`, Lifetime).
- No synchronous GL reads (`readPixels`, queries) in the frame loop, except under `?perf=sync` and the one-off GLOBUS stills.
- Real-device checks play a full song, not a short burst, and report device, thermal state, refresh rate and the `?perf` summary.
- No WebGPU, `BatchedMesh` or KTX2 without a measured need; list the `onBeforeCompile` / `ShaderMaterial` patches that would have to be rewritten first.

## GPU context loss (mobile GPUs)

Android Chrome can crash its GPU process mid-game (an Adreno 618 did it on every results screen, from an off-screen
render). Chrome then loses and restores the WebGL context **and every 2D canvas**, even small or detached ones: each
comes back blank, with its default state (identity transform, default font), and fires its own `contextlost` /
`contextrestored`, not at the same moment as the others. three.js restores the WebGL scene by itself; nothing restores
2D state or canvas caches. Before adding a canvas or GPU work:

- State set on a 2D context outside the frame (a transform, a font) is set again on that canvas's `contextrestored`
  (the HUD runs `resize()`: without it the HUD was drawn at 1/3 in the top-left corner until the next rotation).
- A canvas kept as a cache (text sprites, the GLOBUS stills, a `CanvasTexture`'s source) listens to its **own**
  `contextrestored` and drops or repaints itself; never keep what was painted while `ctx.isContextLost()` (it stays
  blank). A `CanvasTexture` repaints its canvas and sets `needsUpdate` (three.js re-uploads it from the blank canvas).
- No heavy off-screen GPU work on a player's path (render targets plus a read back of a big image): the share photo is
  a fixed file per figure (`public/share/`, made with `__dbg.hero`), never rendered on the device.
- A lost context that never comes back shows the reload card after 5 s on screen (`src/ui/pause-actions.js`); a
  failure card shown after boot passes its own reason so `errors.js` doesn't report it again as `boot-failed`.
- Test with a real crash, not only `WEBGL_lose_context` (it never touches 2D canvases): Playwright's CDP
  `Browser.crashGpuProcess` (`chrome://gpucrash` is blocked headless) on each screen you touch, then check the HUD's
  scale and text, the GLOBUS head, the share card and the 3D. Contracts: `tests/render/scene-crowd.mjs` (HUD and
  sprite restore, the never-restored card).

### Measured budgets (enforced by tests)

- `tests/render/gl-budget.mjs` boots the game in software WebGL, cycles the Mulassa, the Drac and the Bou (it empties `UNRELEASED_IDS` for its own server only) through every quality level, and fails if `renderer.info.memory` geometries or textures differ between rounds or shader programs pass 90. It skips with a message without Playwright (`PLAYWRIGHT_DIR`, default `/tmp/ui-inv-pw`).
- GL draw calls a frame (shadow pass included; `renderer.info.render.calls` does not count it), worst figure, plus 4 of headroom in the test. Selector: minimal 21, low 22, medium 33, high 36. Play (the Mulassa alone: 20, 21, 32, 36; the Drac while its fire effects are out adds 15 calls): minimal 36, low 37, medium 59, high 62. The sun's shadow pass costs about 11 draws at medium and 14 at high.
- In play the test also runs the Bou, inside its techno part (its busiest): 20 / 25 / 35 / 36 draws, within the shared budget. Over a full song on a Galaxy S10 at medium it held a median 58 fps with no thermal throttling; festa bursts reach about 66 renderer calls.
- At rest the scene holds about 59 geometries, 9-10 textures and 54 programs (software GL, `?perf`); `renderer.info.render` reads about 21 calls and 40k triangles (the plaza pass alone).
- `tests/build/bundle-size.mjs` builds into a temp dir (a few seconds) and fails when the largest JS chunk passes 492,000 bytes gzip (measured 477,732). Raise it only for a deliberate addition.
- `?perf` also shows `geo`/`tex`/`prog` (GPU memory counts), skinned people and total bones; `window.__perfLive()` returns the same counts on demand. Skinned load: 2-4 skinned meshes, about 480-530 bones, at most 41 people moving on them.
- Shadows: the sun's frustum is 15 m each side (the played ground plus margin), and only figures, collas, the crowd (high) cast. Plaza buildings, trees and lamps are receive-only. Static plaza meshes have `matrixAutoUpdate = false`.
