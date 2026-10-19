---
name: bestiari-reference-analysis
description: Analyse a festive figure's dance from reference video and music, annotate phrases and carrier movement, and build a synchronized video/3D/overhead comparison. Use for Mulassa, Drac and other festive figures; distinguish research from game integration.
---

# Reference-led dance analysis

Use the project's AGENTS.md and authorization rules. This skill does not authorize delegation, publishing, Git history
changes or replacement of a game's music. Read `references/workflow.md` for the evidence and reconstruction contract.

1. Locate the existing dossier in `research/bestiari/<figure>/` before repeating research. Preserve approved baselines
   and record what remains inferred. A dirty worktree is not preserved by copying HEAD.
2. Choose a continuous recording with visible silhouette, ground contact and reference landmarks. Record rejected
   candidates and why. A cropped foot cannot support an exact step count. Check a second performance when available;
   report when it is unavailable rather than inventing invariant choreography.
3. Annotate the whole dance in source seconds before implementing. Separate travel, heading, support, body tilt,
   camera motion and musical phrasing. Return a plain-language sequence for human review.
4. Reconstruct deterministically from one time source. Keep the game's current dance available for comparison.
   Use the actual model; do not make a placeholder that hides its proportions or contact defects.
5. Show synchronized source video, 3D and overhead schematic, with pause, seek, slow playback and phase navigation.
   The map is the model's reconstruction, not independent proof of the source trajectory.
6. Inspect matched frames and continuous motion, then retain evidence of differences. Numerical tests, visual
   fidelity, listening and device performance are separate claims.

Store compact source manifests, annotations, decisions, code and validations in the repository. Keep media outside
`public/`, referenced through the explicit dev media registry. Use stable relative asset IDs and hashes. Preserve
originals while migrating; verify copies before any later deletion is proposed.

Reuse `tools/bestiari/contact-sheet.py` for timestamped source sheets. Use the existing `voxel-3d-polish` and
`rhythm-music-polish` guides when their geometry or musical checks are needed; do not copy their full instructions.
Historical Drac example: `research/bestiari/drac/README.md`. Its times, directions and thresholds are case data.
