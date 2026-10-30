# Integration, repeatable QA and worked example

The selector now also contains a static derivative of the current animated Mulassa. Each lives in its figure's folder (`src/figures/<figure>/*-portrait.js`), gathered by the selector-only registry `src/ui/selector-portraits.js`; they share scale/baseline CSS. See [Current Mulassa still](mulassa-selector-still.md) for this later integration and the newer live head details. The Drac-only contracts below describe the earlier rollout; pixel portraits remain unchanged outside these two requested cards.

Current Drac master: `assets/drac-valls-A-traced.svg`, traced from the exact corrected A accepted by the owner. Both earlier hand-drawn Drac examples below were rejected artistically; their technical checks are historical. See [faithful tracing](faithful-tracing.md) for the current process and limits. The new trace passes static audit, source/inline parity, skill validation and selected/pending four-viewport checks. Full `npm run check` was verified from the shared completed run after another task corrected its selector module line-limit failure. Current evidence is `A-svg-fidel/validation.json` and `check-shared-complete.log`. The temporary own duplicate rerun was stopped and is not a passing run.

## Narrow integration contract

The first Drac example changes only the Drac option's illustration in `stripHtml` of `src/ui/select-ui.js`, via `DRAC_SELECTOR_SVG` from `src/figures/drac/drac-portrait.js`. It does not replace `portraitArt`, `portraitPalette`, `DRAC_ART`, `MULE_ART`, `portraitHtml`, HUD, help or photo-avatar graphics. Keep the visible name, UAF mark, option role, accessible label, aria-selected, tabindex and event targets.

CSS targets `.sel-card .por svg.sel-drac-illustration`, after pixel-grid rules. It uses natural vector rendering, preserved aspect ratio and documented height ratio. All outer card/grid/caption/focus styles are unchanged. No new spinner, loader import, timers, animation or per-frame work. The 66-node prototype replaces a very small colour-batched pixel SVG on one card only; it is not automatically cheaper than pixel art. Static SVG has no ongoing animation cost, but measure before rolling this out across a large catalog.

Keep the asset in a JS string module if that matches the game's current Node/VM loader. Raw SVG imports or `import.meta.url` may work in Vite and break the concatenating tests. The inline markup needs no network fetch and no `public/` allowlist change. If using a standalone public file in a future implementation, update `tools/deploy/prepare-pages.mjs` and test the Pages build; do not assume an SVG will be allowed.

The source master is the skill SVG; the local game module is a compact inline copy. When changing the drawing, regenerate that literal and verify parsed SVG equality after removing only standalone accessibility attributes/comments/whitespace. Avoid independently editing two divergent drawings.

## Reproduce static export

```sh
python3 .agents/skills/mulassacat-miniatures/scripts/static_mulassa.py
python3 .agents/skills/mulassacat-miniatures/scripts/audit_svg.py \
  .agents/skills/mulassacat-miniatures/assets/mulassa-static.svg \
  .agents/skills/mulassacat-miniatures/assets/drac-valls-static.svg
python3 ~/.codex/skills/.system/skill-creator/scripts/quick_validate.py \
  .agents/skills/mulassacat-miniatures
```

The exporter removes only known motion/effect groups; inspect and update it if the source hierarchy changes. It expects the archived single-SVG source, not the current HTML-layer loader. Run twice to confirm deterministic output if modified. The SVG audit checks XML, viewBox, IDs, absence of script/animation/CSS/external raster dependencies and nonuniform root stretching. It does not compute painted bounds, validate anatomy or assert user approval.

## Browser checks

Use task-cleanup ownership tracking before opening resources. Prefer T3 preview, one task-owned tab, the existing localhost:5179 server if alive, and `?mute`. Do not restart a shared server, drive a physical phone or touch other threads. Read the current task's instructions before applying an old cleanup script to concurrent processes; an earlier loader task killed automated Chromium processes of unconfirmed origin. Never repeat that mistake by assuming everything created since your baseline is yours.

Mobile layouts: 375×667 and393×852; landscape852×393; desktop1280×800. A desktop browser resized to a phone is a layout check, not proof of touch/iOS. Test pointer-coarse separately when the host permits it, and label emulation accurately.

At each size:

1. Capture old/new card at the same viewport. Save the original markup before modifying the source or restore it temporarily only inside the isolated test tab for a visual comparison.
2. Select Drac and inspect the actual two-head silhouette. Record the image bounds inside `.por`, name/entity bounds inside `.nb`, image aspect ratio, contentBox and clipping.
3. Check the Mulassa/Drac painted height ratio and foot baseline, not just the outer SVG rectangles. Their padding differs. Compare the vector Mulassa outside the game as a separate review.
4. Verify selected ring, keyboard focus, changing to Mulassa, opening difficulty, Escape back, and a pending card after unfolding. Names/logos/state should be unchanged.
5. Inspect screenshots, including 100% scale. A zoomed SVG may look fine while the in-card heads merge. Check horizontal crop, clipped teeth/ears/tail/soles and full text.
6. Confirm no animations run within Drac's SVG and no console exceptions or failed artwork requests. Reduced motion requires no special treatment for an already static image.
7. Run `npm run check` once when no other full battery is active. Like any focused check it comes after the owner's OK (AGENTS.md, Process); do not duplicate the full suite without a new failure/change. Compare music hashes before/after. Inspect final diffs against the starting snapshot to separate your edits from concurrent ones.

## Evidence and acceptance

Current task artifacts: `~/.t3/artifacts/mulassa-illustration-skill-20261019/`.

The new Drac is a 2026-10-19 manual vector adaptation using this skill, not a historically approved character drawing. Early visual inspection showed overlapping heads reading as one face; moving the far head left/up and near head right/down separated the muzzles. Those placements are artistic values, not measured anatomy. All main colour shapes and details are editable. The approved Mulassa remains unchanged.

Record actual verification in `validation.json` and `resultat.md` in the artifact folder when complete. Do not promote this example to "approved" unless the owner explicitly accepts it. The historical approval in provenance.md applies to the loader only.

## First rejected prototype: completed technical validation, 2026-10-19

The full npm check finished with exit 0. Skill-creator validation passed under uv with PyYAML; system Python lacked that module. Both SVG audits passed; source/inline copy parity passed. T3 Chromium layout checks at 375x667, 393x852, 852x393 and 1280x800 passed for selected Drac and pending Aliga, with no console exceptions. The measured height ratio was 0.64399–0.64406 and baseline difference below 0.01 px. Keyboard selection, focus-visible, difficulty entry and Escape worked. Bounds x5/y4/150x102.2 stay inside 160x112; no Drac animation exists. Eight music files remained bit-identical.

The browser had a fine pointer at every size: no touch, Safari or physical-device claim. An initial scrollHeight-based pending-title check reported false overflow because the title child is optically translated with overflow visible; painted bounds and screenshots confirmed readable text. This was a measurement-method correction, not a game defect or code fix. The user accepted the height-based scale convention; no independent artistic approval of every Drac detail is implied.

## Proposal A SVG: local validation, 2026-10-19

After the owner selected raster A with photographic corrections, `assets/drac-valls-A.svg` replaced the old illustration in the inline module. This pass made no CSS or select-ui.js edits. The new master has 82 nodes (including its root) and its inline copy is 5671 bytes. XML/static audit and source-copy parity pass. The painted shape envelope measured x7.70, y4, width148.50, height102.20 including its small shadow; it fits 160×112 with breathing room. Head bounds remain separate vertically at all tested sizes. No image animation runs.

The full `npm run check` passed once, with no concurrent battery active at its start. Skill-creator validation passed. At 375×667, 393×852, 852×393 and 1280×800, text stayed complete and SVG bounds stayed within the image panel. Drac/Mulassa height ratio measured .64399–.64406; ground difference stayed under .007px. Selected and pending cards were inspected. Arrow keys moved selection/focus, keyboard focus was visible, difficulty opened and Escape returned. The pulsing primary button caused a locator stability timeout; a direct browser pointer click at its measured centre succeeded. This was an automation actionability issue, not a reason to modify the button.

The T3 browser was Chromium with a fine pointer; responsive layout checks are not touch/iOS verification. Eight music files remained identical. Screenshots, measurements and check log live in `proposta-A-svg/` under the artifact folder. Selection of raster A is recorded; final artistic acceptance of its manual SVG reconstruction remains a separate user decision.
