package cat.mulassa.games.launcher

import androidx.compose.ui.unit.Dp
import kotlin.math.abs

// How many cartridges a row: two on a phone, more on a wider window, so none grows past 240 dp (a tablet on its side
// showed two giants and one row). The same rule as iOS (LauncherView.swift's columns).
fun columns(width: Dp, m: Dp): Int = maxOf(2, kotlin.math.ceil((width - m) / (m + Dp(240f))).toInt())

// The grid's measures (ronda 39, «un sol espai a tot arreu»): when the rows fit, one gap everywhere — at the sides,
// between columns, between rows, under the fringe and over the navigation bar — found by solving the width and the height
// together; the cartridges take the size that leaves it. Out of that gap's range (m/2 to 2m: a tablet, many rows) the
// margins are m and the rows follow rowGap. `fringe`: the header's bottom; cw, ch: a cartridge in u. As iOS's Grid.
// `lead`: room left over a still grid on a tall screen, 42 % of it above the rows, so they sit a little over the middle.
class Grid(val cols: Int, val u: Dp, val side: Dp, val gap: Dp, val scrolls: Boolean, val lead: Dp = Dp(0f))

fun grid(width: Dp, view: Dp, bottom: Dp, fringe: Dp, rows: Int, m: Dp, cw: Float, ch: Float): Grid {
    val cols = columns(width, m)
    val k = rows * ch / (cols * cw); val den = (rows + 1) - k * (cols + 1) // k: the rows' height per dp of width
    val even = if (den == 0f) Dp(0f) else (view - bottom - fringe - width * k) / den
    if (rows > 0 && even >= m / 2 && even <= m * 2) return Grid(cols, (width - even * (cols + 1)) / (cols * cw), even, even, false)
    val u = (width - m * (cols + 1)) / (cols * cw)
    val (gap, scrolls) = rowGap(view, bottom, fringe + m, u * ch, rows, m)
    val spare = view - bottom - m - (fringe + m) - u * ch * rows - gap * maxOf(rows - 1, 0)
    return Grid(cols, u, m, gap, scrolls, if (scrolls || spare.value <= 0f) Dp(0f) else spare * 0.42f)
}

// The grid's gap between rows, and whether it scrolls (ronda 32-33, the owner). Rows that fit (down to the navigation
// bar, with a gap of half a margin `m` at least) spread over the screen and the page stands still. Rows that overflow it
// («que la gent sàpiga que hi ha scroll») get the gap, from m/2 to 2m, that makes the screen's bottom edge cut a row as
// near its middle as it can: a thin sliver, or a row cut at its very bottom, hides that the grid scrolls. `view`: the
// screen's height; `bottom`: the navigation bar's; `top`: where the first row starts. The same rule as iOS
// (LauncherView.swift's rowGap); tests/RowsTest.kt holds both to the same numbers.
fun rowGap(view: Dp, bottom: Dp, top: Dp, row: Dp, rows: Int, m: Dp): Pair<Dp, Boolean> {
    if (rows <= 1) return m to (top + row * rows > view - bottom)
    val room = view - bottom - m - top
    // (spread, but never more than a margin and a half apart: the rows stay a group; Grid.lead places what room is left)
    if (row * rows + m / 2 * (rows - 1) <= room) return minOf((room - row * rows) / (rows - 1), m * 1.5f) to false
    var best = m; var miss = Float.MAX_VALUE
    for (i in rows - 1 downTo 1) { // i rows above the cut one; the most first: on a tie the gap stays small
        val gap = ((view - top - row * 0.5f) / i - row).coerceIn(m / 2, m * 2) // the gap that would cut row i at its middle
        val cut = (view - top - (row + gap) * i) / row // how much of row i shows
        if (cut > 0.05f && cut < 0.95f && abs(cut - 0.5f) < miss) { miss = abs(cut - 0.5f); best = gap }
    }
    return best to true
}
