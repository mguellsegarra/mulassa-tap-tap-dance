# Verification protocol

## Evidence before edits

Use a task-local evidence directory outside Git. Keep baseline source copies, hashes, source-reference URLs and a short incident table with symptom, hypothesis, probe, result and decision. Preserve rejected fixes when they explain a repeated failure. Do not include credentials or unrelated user data.

Record the exact loaded checkout and actual model/animation entrypoints. Start with the reported video and extract frames around the failure using the available video tools. Record frame rate and timestamp; map to animation time only when supported by evidence.

## Geometry probes

Where the voxel builder exposes box metadata, test it directly and also transform it through the actual rig's world matrices. Validate that metadata matches rendered dimensions first.

| Concern | Useful check | What it cannot prove |
| --- | --- | --- |
| Coplanarity | Same-facing coplanar faces with nonzero overlap; inspect both within and between meshes. | Every shadow or depth-precision artifact. |
| Floating detail | Connected components using shared face patches or intended volume connection. | Aesthetically convincing attachment under all lighting. |
| Moving joint | Child attachment samples covered by intended parent through pose sweeps. | Full-volume intersection freedom from sparse samples. |
| Collision | Broad phase bounds followed by oriented box SAT or appropriate narrow phase on actual posed geometry. | Continuous-time absence from discrete sampling. |
| Tail ornaments | Surface samples visible outside joint, neighbor and trunk volumes. | Visibility from every camera. |
| Flame | Connected boxes, nozzle attachment during scale, narrow-phase collision at full active extent. | Realistic particle or light behavior. |
| Feet | World transforms of sole corners during contact, sole clearance during travel, shoe rigidity and leg separation. | Natural-looking stride height or weight transfer. |
| Paint | Nearest exposed surface colour on both faces, separated from lighting. | Correct real-world palette from uncertain references. |

Use pose boundaries, extrema and failing off-grid times in addition to a regular sweep. Include nonadjacent collision pairs and a documented exception for intentional emitter contact or joint penetration, rather than excluding whole classes of anatomy.

## Motion probes

- Sample the actual final rig, not only pose scalar channels. Track world-space representative vertices/corners.
- Check positional continuity, velocity change and second finite difference. Distinguish a jump from a continuous but perceptually harsh short swing.
- Sample in real seconds using the active tempo map. Cover 30/60/120 fps where supported and multiple sub-frame origins around worst intervals. Compare raw maxima before rounding.
- Test the full song, energetic poses, transitions, practice loop from both sides, final settle, seeks and repeated same-time calls. Deterministic output must not depend on update history.
- When retiming, compare retained motion channels against mapped baseline times. Derive every oscillator's period; a whole cycle for one term can be half a cycle for another.

## Rendered evidence

Use the host-native shared browser when available. In Mulassa, always load automation with `?mute`, including recordings. Audio fidelity needs a separate intentional audio check, not an accidentally audible automated tab.

Use fixed matched before/after cameras for close-ups and a full-model view. Inspect front, back, both sides, a high view for joints and a low view for ground contact. Check mobile 375x667 and desktop at minimum, plus representative portrait/landscape constraints when layout or framing changed.

Deterministic frame export isolates pose defects; live playback exposes clock, seek, render and frame-pacing problems. A slow software renderer does not establish device performance. Record limitations instead of calling low frame rate smooth.

## Drac checks to discover in the current checkout

Historical entrypoints are `tests/figures/drac/drac.mjs` (form/pose), `tests/figures/drac/drac-parts.mjs` (actual rig/geometry), `tests/figures/drac/drac-feet.mjs` (world contact) and `npm run check` (project contracts). Confirm they exist and inspect current assertions before running. Existing geometry/feet code may be untracked in an old worktree; do not accidentally omit it from a child checkout.

Current-song metadata and `src/dev/drac-timing.js` define beat/second conversion. Use current values, not historical BPM or END constants. For a 3D-only task, all music hashes must remain unchanged. When a music edit is authorized, regenerate through its actual generator and preserve unrelated assets.

Before calling a new test protective, run it against a saved known-bad baseline or a controlled local mutation reproducing the same fault. Keep this evaluation outside the user's checkout. A test that only passes the candidate has not demonstrated it catches the reported defect.
