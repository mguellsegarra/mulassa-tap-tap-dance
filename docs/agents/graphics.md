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
  hidden objects and the share photo's render-target variants included, is compiled up front (`precompile`), and again
  (screen only) after a quality step. Never share one material between plain and skinned/instanced meshes.
- Mobile GPUs: respect `render-quality.js` profiles; don't raise DPR or shadow cost casually.

## Performance rules

- Budget per quality profile: every new object type states its draw-call and triangle cost and which profiles show it; measure with `?perf` before and after (`?perf=sync` for the GPU side) and stay inside the profile's numbers.
- One `InstancedMesh` or merged mesh per visual role; no skinned mesh per person or per prop. Record the new bone / skinned-people count in the `?perf` check: bone matrices are re-uploaded every frame.
- Shadow casters are an allow-list: a new mesh is `castShadow = false`, and only gameplay-relevant ones turn it on, at medium/high. A change to lights or colour fx re-checks the shadow programs (`material.needsUpdate`).
- A new material, hidden mesh or shader variant must be reachable by `precompile`; check a first-use capture for a compile hitch.
- Whatever is created at runtime and removed (render targets, canvas textures, geometries) has a named owner that calls `dispose()`; leak checks read `renderer.info.memory` after repeated use. Scene objects are built once and toggled (`docs/architecture.md`, Lifetime).
- No synchronous GL reads (`readPixels`, queries) in the frame loop, except under `?perf=sync` and the share photo.
- Real-device checks play a full song, not a short burst, and report device, thermal state, refresh rate and the `?perf` summary.
- No WebGPU, `BatchedMesh` or KTX2 without a measured need; list the `onBeforeCompile` / `ShaderMaterial` patches that would have to be rewritten first.
