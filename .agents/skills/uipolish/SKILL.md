---
name: uipolish
description: UI harmony and balanced layout. Rules plus a measured self-check for alignment, centering, spacing scale, equal margins, radius nesting and one card style per role, and for distributing space evenly inside a card, sheet or screen across viewport families. Use on ANY UI proposal or change before showing it, and when rows or items look crammed, misaligned, off-centre, have unequal margins or mixed card styles. Not for colour, copy or accessibility audits on their own.
---

# Balanced layout QA

Marc's standing rule: content uses the space its container already has, and that space is shared fairly. Each row keeps its hierarchy and intrinsic size; the free space goes to the gaps, items in one row are spread evenly, and nothing leaves an arbitrary hole, an unequal margin or a crammed group. He should not have to point it out per card.

Follow the project's own instructions (AGENTS.md, approvals, browser rules) for servers, browsers and screenshots; this skill adds the design criteria and the measurement loop.

## What "balanced" means

- **Use the given box.** Keep the card's outer size (or its existing sizing rule). Do not grow it to hide a spacing bug or add an internal scroll.
- **Judge ink, not boxes.** What reads as space is the distance between painted things: text lines, art, filled buttons. A 44 px link around 15 px of text, an art slot larger than its art, a reserved two-line title slot holding one line, or line-height above a paragraph all hide slack. Compensate for it where it skews the rhythm (see the case).
- **Equal by default, not by dogma.** Gaps between rows and the outer margins should read as equal, with deliberate exceptions: a primary action may sit a little apart, a heading may hug its content. Never stretch icons, art or text to fill; free space goes to gaps or flexible tracks.
- **Rows of items** (link pairs, button pairs, figure groups): equal space before, between and after, and no column narrower than its words. Do not truncate; wrap at sensible points (e.g. after `@` with `<wbr>`). A grouped motif (a fan of cards) is one item: do not spread it unless Marc asks; show an A/B when unsure.
- **When room runs out:** gaps shrink first, then optional art (hide it below a readable size instead of a smudge), never copy, actions or 44 px targets. If even zero gaps cannot fit, report it: the fix is the container's room, not squeezing the content.

## Harmony rules (apply to every UI proposal, silently, before showing it)

Marc should not have to draw red arrows on screenshots. Defaults; deviate only on purpose and say so.

1. **One spacing scale.** Project tokens, else 4/8/12/16/24/32/48. Use `gap` between siblings, not ad hoc margins.
2. **Proximity.** Gap inside a group < gap between groups < section gap.
3. **One alignment axis per block.** Items in a container share the same left edge, or are all centred, or all right. Never mix start- and centre-aligned items in one stack.
4. **Centre in the space it has**, on both axes: a button, icon or empty state is centred in its real container (or the free area under a header), not the viewport and not by magic margins. Optical nudge <= 2 px only for asymmetric glyphs.
5. **Equal margins.** Same side padding for every child of a container; children touch the same inset line. Top/bottom equal, or deliberately larger at the bottom for the safe area.
6. **Radius nesting.** Inner radius = outer radius - padding (min 0). Siblings of the same role share one radius. A card with a flat side next to fully rounded ones only when it visibly joins a neighbour, on purpose.
7. **One card style per role.** Same role = same radius, border, shadow, padding, background. Define variants once (`card`, `card-elevated`, `card-inset`) and reuse.
8. **Same-row items share height and baseline** (buttons, inputs, text).
9. **Match what exists.** Find the nearest existing screen or component and copy its tokens and structure first.

The measurement loop below is the self-check: list child left/right edges, gaps, heights and radii per container and flag edges off by 1-3 px, gaps outside the scale, unequal side padding, mixed radii among same-role cards. Fix the token or container rule, not a one-off margin. Show results per the `resum` skill (labelled variants A1, A2, ... as images).

## Workflow

1. **Reproduce** the reported state in the browser, at the size in the capture and the matrix below. Read the current diff first: other agents may be editing the same file.
2. **Measure before touching CSS.** Load `scripts/measure-rows.js` into the page and call `measureRows('<card selector>', { row: '<row selector>' })`. Record gaps (`[top, between…, bottom]`), the row's horizontal spaces and `overflow`. Text ink is the line box (font metrics), slightly taller than glyphs: compare like with like and confirm on the capture.
3. **Find the cause, not a margin to tweak.** Typical ones are in [references/css-patterns.md](references/css-patterns.md): a row with `flex-grow` swallowing the free space, an explicit `min-width` making `auto` grid tracks share equally, `gap` adding to the middle of a `space-evenly` row, reserved slots, rules silently dead behind an unclosed `/*` comment.
4. **Fix with distribution primitives**: `justify-content: space-between | space-evenly`, auto margins, `auto`/`fr` tracks, `min-width: min-content` on items that must not crush, and small, commented compensations for intrinsic slack. Scope the change to the component; keep tap targets ≥ 44 px and focus styles.
5. **Validate** the matrix: measured numbers before and after, plus captures you actually look at. Emulate HEAD with an override `<style>` in the same page when you need a fair "before" at every size, and check that the override reproduces one real HEAD measurement.
6. **Ask, don't guess, on real design forks** (spread vs compact group, full-width vs compact primary, reviving dead styles): show a small A/B of captures and ask.

## QA matrix

Phones 320×568, 375×667, 393×852; landscape 667×375, 852×393; tablet 768×1024; desktop 1280×800, a wide-short window (e.g. 1440×600 or 1440×700) and a large one (1920×1080). Add a resize sweep across the component's breakpoints, the longest real copy and names, and reduced motion if the change touches animation. Check the neighbouring states that share the CSS (e.g. the single-item variant of the same card) so the fix doesn't break them.

A desktop browser resized to phone sizes keeps `pointer: fine`; layouts that differ by pointer (touch docks, hidden desktop controls) need a note or a touch-emulating run. Say which you used.

## Report

Captures before/after, a gap table per viewport, the files changed, the remaining limits (e.g. "1440×600 still overflows 19 px: no room even with zero gaps; was 27 px in HEAD") and what you could not emulate.

The worked example for the Mulassa selector's «Aviat a la plaça» card, with numbers and captures, is in [references/aviat-case.md](references/aviat-case.md).
