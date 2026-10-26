# CSS patterns and traps for balanced layouts

## Distributing free space

- **Column of rows with a fixed height**: `display: flex; flex-direction: column; justify-content: space-between` gives every row gap the same share of free space; outer margins stay at the padding. `space-evenly` also shares free space with the outer margins (use it when the padding is small and the card should breathe evenly).
- **Weighting**: auto margins (`margin-top: auto`) take free space in equal shares and can mark a deliberate group (e.g. actions pulled together). Use them only when the grouping is intended.
- **One row of items**: `display: grid; grid-template-columns: repeat(N, auto); justify-content: space-evenly`. To get the *same* space at the edges and between items, do not use `gap` (it adds to the middle only); give each item and the row the same padding instead (e.g. `padding-inline: 4px` on both: 8 px minimum everywhere).
- **Flexible vs intrinsic**: art and icons keep their intrinsic or capped size (`width: min(82cqh, 80px)`), text keeps its font size; the slot or gap is what flexes. Containers can shrink (`flex: 0 1 96px`) so optional art yields before copy.
- **Hiding art below a readable size**: a size container (`container-type: size`) on the art slot plus `@container (max-height: 31px) { … visibility: hidden }`. Make sure the selector covers every kind of child (e.g. `.sel-peek`, not only `svg, img`).

## Traps seen in practice

- **A row with `flex: 1 0 auto`** (or a large `min-height`) in a `space-between` column eats all the free space; the other gaps collapse to the minimum and the grown row's content sits mid-band, so a big hole appears above it and below it.
- **An explicit `min-width` (e.g. 44 px from a button class) on grid items in `auto` tracks** makes the track's minimum 44 px instead of the content's; the tracks then grow equally and a long label overflows into its neighbour. Use `min-width: min-content` for items that must not shrink below their words.
- **`width: 100%` on an item inside an `auto` track** is a cyclic percentage; let grid stretch items instead.
- **`white-space: nowrap` still breaks at `<wbr>`** in Chrome: fine for addresses (`holi@<wbr>mulassa.cat`), but measure the result.
- **Reserved slots** (a two-line title slot for long names, a fixed art slot) leave slack when the content is shorter: drop the reservation in variants that never need it.
- **Negative margins that extend a tap target into the padding** are fine up to the padding (no overflow) but never into a neighbouring control's box.
- **An unclosed `/*` comment** silently disables every rule up to the next `*/`. If a rule seems ignored, check for that before adding specificity. Reviving dead rules changes the design: show it and ask.
- **Tests that only check "no overflow"** pass while a 50 px dead band sits under the content. Measure gaps and look at the capture.

## Measuring

`scripts/measure-rows.js` reports ink-based gaps. For a fair before/after at every size in one page, inject an override `<style>` that restores the old rules, measure, remove it, and dispatch `resize` if the component measures itself (e.g. cached heights). Check once that the override reproduces a real HEAD measurement.

## Air that gives way first (content-sized cards)

A card whose height follows its content, capped by the room (`max-height`), has no free space to distribute, so fixed margins either waste room on tall screens or overflow on short ones. Put the air between groups in shrinkable spacers instead: `::before`/`::after` flex items placed with `order` (`flex: 0 1 22px; min-height: 0`). When the cap bites they shrink to zero before any content does. Each spacer also adds one row `gap`; cancel it with `margin-block: calc(var(--gap) / -2)` so a collapsed spacer costs nothing. After the air, drop optional content that repeats something else on the card (e.g. a note that repeats a link below) with a height query, then compact targets to their 44 px minimum. Never let the title overlap: if it cannot fit its reserved one-line slot even at the minimum size, give it a second line.
