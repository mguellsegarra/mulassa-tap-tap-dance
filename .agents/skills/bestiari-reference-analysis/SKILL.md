---
name: bestiari-reference-analysis
description: Analyse a festive figure's dance from reference video and music, annotate phrases and carrier movement, and build a synchronized video/3D/overhead comparison. Use for Mulassa, Drac and other festive figures; distinguish research from game integration.
---

# Reference-led dance analysis

Use the project's AGENTS.md and authorization rules. This skill does not authorize delegation, publishing, Git history
changes or replacement of a game's music. Read `references/workflow.md` for the evidence and reconstruction contract.
For a new figure, use the Catalan, copyable [new-figure brief](../../../research/bestiari/pla-nova-figura.md).
It consolidates the owner's review priorities; replace its task fields and keep figure-specific facts evidence-led.

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

Reuse `tools/bestiari/contact-sheet.py` for timestamped source sheets. Use the existing `mulassacat-voxel` and
`mulassacat-musica` guides when their geometry or musical checks are needed; do not copy their full instructions.
Historical Drac example: `research/bestiari/drac/README.md`. Its times, directions and thresholds are case data.

For a whole new figure, start from `mulassacat-nova-figura`; this skill owns phases 1 and 5 (the dance).

## What the owner looks for in a reconstructed dance

These keep coming back in reviews of the Mulassa, the Drac and the Bou:

- **Watch the whole video**, repetitions and ending included, not the opening and a few stills. When a still shows a jump, check the seconds after it too.
- **Concrete compass moves, not drift.** Describe and build the dance as readable actions on the N/W/S/E marks ("four side steps to W and back, half turn, sway"), with turns that change direction when the source does. Erratic paths from tracking image noise are rejected.
- **Real speed and reach.** If the figure crosses the plaça fast, so does the model; its runs end almost touching the attendant at that mark, with a comic skid on arrival.
- **Carriers' legs carry the rhythm:** alternate legs reaching forward and back on the beat in slow passages, knees that bend for a step, lifts of the front or rear that show the carriers' legs stretching. Copy the slow steps from the source, synchronised to the notes.
- **Never still, never jerky.** A comic layer on every beat (knee dip, waddle, nod, see-saw), stronger in the festive parts, never random. "Massa subtil" and "molt sosa" are the usual complaints; abrupt jumps between phrases are the other.
- **A writing tool for the owner.** For each section of the game's song, show the source video, the 3D model and an editable text field where the owner writes what the figure does there in plain words, then build from that text (`tools/dev/bou-review.html`, `tools/dev/bou-review/`). Fill the fields with your own reading first so the owner corrects rather than writes from scratch.
- **Map the song back to the source.** With a score, align video sections to the score's bars, then to the game's edited form, so every game section knows which part of the video it imitates.
