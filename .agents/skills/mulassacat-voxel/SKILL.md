---
name: mulassacat-voxel
description: "Mulassa project only. Build, refine and verify a festive figure's animated voxel model (body, carriers, tail, colla bodies) against real references. Use for a new figure's model, floating details, holes, flicker, intersecting joints or flames, abrupt motion, sliding feet and fidelity reviews (Mulassa, Drac, Bou). Does not replace the host's orchestration workflow."
---

# Voxel models and 3D polish

Apply only to Mulassa and its checkouts. For a whole new figure, start from `mulassacat-nova-figura`; this skill owns phase 4 (model) and the 3D side of phase 5 (dance on the model). The Drac's model study, its probe script and test template are in [research/bestiari/aprenentatge-model-voxel-drac.md](../../../research/bestiari/aprenentatge-model-voxel-drac.md).

Turn a reported visual defect into a reproducible case, a structural correction and evidence on the actual rendered model. Use the host's existing orchestration and authorization rules. The owner requests Opus for the Drac's 3D design and implementation; report unavailable routing instead of silently substituting. Other models may independently verify it.

In a read-only review, keep edits, baseline copies, mutation tests, server operations and captures pending when they exceed that review's scope. Report what could not be run; this workflow does not authorize those actions by itself.

Read [the Drac casebook](references/drac-casebook.md) when working on the Drac or when the symptom matches an incident there. Read [the verification protocol](references/verification.md) before making or evaluating a fix. The casebook's dimensions, thresholds and beat numbers are local historical values, not universal 3D tolerances.

## Establish the actual target

- Identify the worktree, branch, dirty files, preview URL and process serving that directory. A successful HTTP response does not establish which model is running. Confirm a distinctive current source or debug value in the loaded page.
- Preserve the dirty baseline and audio hashes outside the repository before edits. Pass that baseline to isolated workers; a worktree from HEAD does not include it. Integrate only the task delta.
- Open the supplied capture or local video yourself. Find failing frames and surrounding motion. If a crop cannot identify an absolute animation beat, record that limitation and scan the whole relevant cycle.
- Resolve paths and APIs from the current checkout. Historical evidence may outlive its temporary server, worktree or debug hooks.

## Establish fidelity before choosing geometry or paint

Find multiple real photos or recordings covering front, back, sides and moving poses. Record source URL, observed feature, view, likely version/date and confidence. Prefer identifiable primary/local references. Distinguish observed facts, plausible lighting effects and artistic voxel simplifications.

Do not infer different paint from a shadow or identify an inner face from an ambiguous angle. Compare both wings and both faces in daylight before assigning different materials. A vertex-colour equality test proves palette consistency, not fidelity to a real object. Carry unresolved reference uncertainty into the final report.

## Trace the first broken relationship

Inspect geometry construction, parent hierarchy, pivots, animation channels and time source before changing values. Check rest geometry and posed world geometry separately.

- **Flicker:** inspect coincident surfaces, self-intersections, changing occlusion and shadow artifacts. Merge redundant volumes or separate real surfaces. Depth bias, render order and disabling depth tests cannot repair intersecting topology.
- **Floating parts:** test connected components within a mesh and joint coverage between meshes throughout movement. An intersecting bounding box alone does not prove a visible connection.
- **Articulated tails:** separate the joint connector from the visible segment skin. Check neighboring segment ends, silhouette gaps and painted detail visibility. A larger connector can hide a gap while creating a new overlap or covering the ornaments.
- **Flames:** keep the flame base anchored when scaling. Transform actual emitter, flame and moving obstacle geometry into a common coordinate system. Check full flame size whenever active, all affected neck/head/jaw poses and both wings. Reorient or relocate the emitter coherently before shortening or hiding the flame to mask a collision.
- **Abrupt movement:** inspect wrap, modulo, floor, section switches, absolute-phase frequency changes, easing derivatives and final settling. Integrate changing frequency to preserve phase. Test every participating period, including half-frequency terms.
- **Feet:** distinguish a flat shoe from a planted shoe. While grounded, all sole corners and heading must remain fixed in world space despite root translation and yaw. Move and turn a shoe only while lifted, preserve rigid shoe dimensions, fit trousers to the independently solved feet and check leg separation.

Keep the smallest correction that restores the broken relationship. Do not change music, choreography, camera or unrelated anatomy merely to make a local test easier unless the task requires it.

## Prove the correction on two surfaces

1. Reproduce the old defect with a deterministic check on the baseline or a controlled regression. Assert observable geometry or movement rather than matching implementation text.
2. Run that check against the corrected actual model, then the existing relevant suite. Retain tolerances; justify new tolerances with model scale and perceptual evidence. Never relax a failed threshold to approve the candidate.
3. Render before/after with matching camera, lighting, time, viewport and quality. Seed random model construction or reuse exactly the same constructed geometry; equal render settings alone do not control randomized colours or shapes. Record live playback as well as deterministic critical frames. Inspect adjacent frames, full cycles, energetic sections, practice wraps, seeks and the ending.
4. Recheck the user's original symptom. A passing mathematical probe can still look wrong. A convincing still can hide intermittent defects.

Retiming changes real-time acceleration even when poses remain continuous in beat space. Use the generated audio beat grid and test multiple frame origins. Re-map regression windows to their retained musical occurrence; old beat literals may silently test a settled figure.

## Completion and limits

Do not promise perfection from sampling. State the tested animation range, frame rates, cameras, collision approximation and remaining artistic or device-performance limits. Separate source fidelity, deterministic correctness, rendered appearance and playback performance.

Hand back the verified preview URL, key before/after captures or recording, checks actually run and remaining limits. Confirm the serving process belongs to the intended checkout. Leave a requested preview running and close only task-owned verification tabs/resources. Local validation does not imply commit, push, deployment or user approval.

## What the owner checks on a festive figure's model

These come from the Mulassa, Drac and Bou review rounds. They are the owner's acceptance criteria, not numeric tolerances.

- **An approved model keeps its proportions.** Fixing legs, tails or a joint must not change the silhouette the owner already accepted; when a fix does, undo it and keep only the requested part.
- **Faithful first, then simplified with humour.** A detailed model matched to photos and video frames can still read badly in the game. A second, simpler version in the Mulassa's spirit (fewer, bolder shapes, a comic face) may be asked for: offer a few quick variants, then refine the chosen one.
- **Stepped, not curved.** Edges, rumps, heads and colour changes go in voxel steps (graons), progressive and symmetric. Smooth curves and single-colour slabs read as wrong.
- **No floating blocks, holes or gaps**, at rest and in every pose: under the hem, between body and head, tail roots, jaw and tongue, nose rings that sink into the face. Paint the faces seen from below in the body's colour so no stripe shows.
- **Consolidated palette.** One body colour unless photos show a real difference (the Bou's head is the body's reddish brown); light accents only where photos show them; no white chin when none exists.
- **Carriers:** simple short legs and shoes inside the hem, low feet, never a spider. Legs recomputed each frame between hip and foot so they cannot detach. Compare the carriers' spacing with a real measure from the video (a shoe as a ruler).
- **Tails and loose parts** have weight, inertia and gravity, start at the body's edge without fusing into it, and are checked while moving.
- **Inspect it yourself before handing it over.** Use the figure's dev viewer, which the owner can also open on the phone (`tools/dev/mulassa.html`, `tools/dev/bou.html`; add free orbit if it lacks one), turn it in motion at every angle and record with `npm run capture` (see `mulassacat-validacio-visual`). Fix every blink, fusion or hole you find before reporting; the owner should not be the one finding them.
- **The same model everywhere.** The game, the selector showreel, free play, results and the dev viewers import one model and one motion system; a change applies to all of them.
