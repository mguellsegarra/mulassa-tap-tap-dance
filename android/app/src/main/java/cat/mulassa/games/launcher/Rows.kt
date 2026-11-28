package cat.mulassa.games.launcher

import androidx.compose.ui.unit.Dp
import kotlin.math.abs

// How many cartridges a row: two on a phone, more on a wider window, so none grows past 240 dp (a tablet on its side
// showed two giants and one row). The same rule as iOS (LauncherView.swift's columns).
fun columns(width: Dp, m: Dp): Int = maxOf(2, kotlin.math.ceil((width - m) / (m + Dp(240f))).toInt())

// The grid's gap between rows, and whether it scrolls (ronda 32-33, the owner). Rows that fit (down to the navigation
// bar, with a gap of half a margin `m` at least) spread over the screen and the page stands still. Rows that overflow it
// («que la gent sàpiga que hi ha scroll») get the gap, from m/2 to 2m, that makes the screen's bottom edge cut a row as
// near its middle as it can: a thin sliver, or a row cut at its very bottom, hides that the grid scrolls. `view`: the
// screen's height; `bottom`: the navigation bar's; `top`: where the first row starts. The same rule as iOS
// (LauncherView.swift's rowGap); tests/RowsTest.kt holds both to the same numbers.
fun rowGap(view: Dp, bottom: Dp, top: Dp, row: Dp, rows: Int, m: Dp): Pair<Dp, Boolean> {
    if (rows <= 1) return m to (top + row * rows > view - bottom)
    val room = view - bottom - m - top
    // (spread, but never more than four margins apart: two rows on a tall tablet stood a screen away from each other)
    if (row * rows + m / 2 * (rows - 1) <= room) return minOf((room - row * rows) / (rows - 1), m * 4) to false
    var best = m; var miss = Float.MAX_VALUE
    for (i in rows - 1 downTo 1) { // i rows above the cut one; the most first: on a tie the gap stays small
        val gap = ((view - top - row * 0.5f) / i - row).coerceIn(m / 2, m * 2) // the gap that would cut row i at its middle
        val cut = (view - top - (row + gap) * i) / row // how much of row i shows
        if (cut > 0.05f && cut < 0.95f && abs(cut - 0.5f) < miss) { miss = abs(cut - 0.5f); best = gap }
    }
    return best to true
}
