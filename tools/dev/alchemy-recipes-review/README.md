# Alchemy: recipe and art review

Permanent home of the original `notes/alquimia-revisio.mjs` tool from the
`mulassa-minijocs/minijoc-alquimia` worktree. Reuses its illustrated equations,
separate combination/art comments, and automatic file persistence. Use this tool
for future recipe and art review rounds instead of generating another inventory.

## Open

Use the existing Vite server for this worktree:
`/tools/dev/alchemy-recipes-review/index.html`.
For example, on the current LAN server:
http://192.168.1.232:5181/tools/dev/alchemy-recipes-review/index.html

A new checkout can use `npm run dev` (default port 5178). No additional server or
packages are needed. Restart Vite after first installing the plugin, with the
owner's confirmation if it is an existing shared service.

The page imports the current `BASE` and `RECIPES`, `COPY.alquimia.items`, `SOURCES`
and `iconHtml` from `src/jocs/games/alquimia/`. It does not embed a frozen inventory.
At migration time there are 213 recipes and 178 elements. The old review server's
annotation file was empty and has been left untouched.

## Review and persistence

- Search by ingredient, result, or displayed R-code. Filter pending, approved or
  change-requested combinations. Blank means **pending**, not approval.
- Each recipe has its own status and combination note. Its persistent key uses
  the sorted ingredient IDs and result ID; reordering recipes does not move notes.
  R-codes are display positions only and may change when recipes are reordered.
- Art notes belong to the element ID and appear together across all its recipes.
- Fields autosave after 500 ms or on blur. The status line reports success or errors.
- `local/notes.json` holds the saved annotations. `local/notes.previous.json` holds
  the preceding file. Both are deliberately gitignored and are not published.
- The browser keeps unsaved drafts in localStorage; export the notes before
  clearing browser data or removing a worktree. `Exporta les notes` downloads JSON
  containing the current notes, including unsaved edits.
- Concurrent writes to different fields are merged. A stale write to the same
  field returns a conflict rather than overwriting the other window. Export the
  draft and reload to reconcile it manually.
- Annotations never change game files. Proposed recipe changes still need the
  owner's approval. Approved conclusions belong in `docs/jocs/alquimia-revisio.md`.

## Ownership and limits

`review.js` owns the review UI and browser drafts; `review.css` preserves the old
review's visual treatment. `vite-plugin.mjs` owns the fixed local notes endpoint
(`/__alchemy-review/notes`), validation, same-origin writes, and atomic persistence.
The plugin is `apply: 'serve'`: it is absent from production builds. The HTML is not
a Rollup entry point. No supplied field can select a filesystem path or command.

This is an unauthenticated development tool for the existing trusted LAN server,
not a public service. Its source can be committed; local annotations require an
explicit export or backup before a worktree is removed. Do not delete the old tool
or stop its server as part of migrating this one.

## Semantic assessment

`assessment.json` records the complete 2026-11-03 editorial review: one reason
and proposal per recipe, keyed by sorted ingredients and result. It is versioned
review evidence, separate from the owner's local decisions. The page opens with
the ten priority corrections and also filters the 45 associations to discuss and
158 recipes considered retainable. Retainable does not mean scientifically
literal or approved by the owner; some entries recommend changing hint priority.

The structural inventory found 213 unique pairs and 178 reachable elements, all
with names, facts and sources. The longest dependency depth is 13 (Lledó); it is
not a minimum number of individual mixes. The 78 terminal discoveries are not
automatically defects. All general elements remain reachable without Valls-only
results. No automated test suite was run: this inventory is part of the content
review requested while tests remain paused.

After changing recipes, update the assessment explicitly. A snapshot mismatch is
shown on the page; matching rows remain associated with their original pair and
result. Source links support cultural and factual corrections, not the subjective
judgment that a child will find an association guessable. The review does not
claim to audit every artwork.
