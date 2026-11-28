package cat.mulassa.games.launcher

import android.view.Surface
import androidx.compose.ui.unit.dp
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

// The grid's row rule and the tilt's screen axes: the numbers iOS copies by hand (LauncherView.swift, Motion.swift).
class RowsTest {
    private val m = 16.dp
    private fun cut(view: Float, top: Float, row: Float, gap: Float, i: Int) = (view - top - (row + gap) * i) / row

    @Test fun rowsThatFitSpreadAndStandStill() {
        val (gap, scrolls) = rowGap(932.dp, 34.dp, 150.dp, 226.dp, 3, m) // an iPhone Pro Max: three rows with room to spare
        assertFalse(scrolls)
        assertEquals(minOf((932 - 34 - 16 - 150 - 3 * 226) / 2f, 24f), gap.value, 0.01f) // spread, a margin and a half at most
    }

    @Test fun fewRowsOnATallScreenStayTogether() {
        val (gap, scrolls) = rowGap(1210.dp, 20.dp, 90.dp, 226.dp, 2, m) // an iPad upright: two rows of four
        assertFalse(scrolls)
        assertEquals(24f, gap.value, 0f)
    }

    @Test fun rowsThatAlmostFitCloseUpInsteadOfScrollingByAHair() {
        val (gap, scrolls) = rowGap(852.dp, 34.dp, 150.dp, 207.6.dp, 3, m) // 393 x 852: 2.8 pt too tall at a full margin
        assertFalse(scrolls)
        assertTrue(gap.value in 8f..16f)
    }

    // how far from its middle the bottom edge cuts a row, 1 when it cuts none
    private fun miss(view: Float, top: Float, row: Float, gap: Float, rows: Int) =
        (1 until rows).map { cut(view, top, row, gap, it) }.filter { it > 0f && it < 1f }.minOfOrNull { kotlin.math.abs(it - 0.5f) } ?: 1f

    @Test fun rowsThatOverflowAreCutAsNearTheMiddleAsTheGapAllows() {
        for ((view, top, row, rows) in listOf(listOf(852f, 150f, 207.6f, 4f), listOf(568f, 120f, 165f, 3f), listOf(740f, 130f, 190f, 5f), listOf(667f, 120f, 196f, 4f))) {
            val (gap, scrolls) = rowGap(view.dp, 0.dp, top.dp, row.dp, rows.toInt(), m)
            assertTrue(scrolls)
            assertTrue("gap ${gap.value}", gap.value in 8f..32f)
            val got = miss(view, top, row, gap.value, rows.toInt())
            assertTrue("no row is cut for $view x $row", got < 1f)
            for (other in listOf(8f, 16f, 24f, 32f)) assertTrue("gap $other cuts better for $view x $row", got <= miss(view, top, row, other, rows.toInt()) + 0.02f)
        }
    }

    @Test fun aFourthRowOnASmallPhoneIsNoSliver() { // 393 x 852: at a full margin 15 % of it showed
        val gap = rowGap(852.dp, 0.dp, 150.dp, 207.6.dp, 4, m).first.value
        assertTrue(cut(852f, 150f, 207.6f, gap, 3) > 0.25f)
    }

    @Test fun aWiderWindowTakesMoreColumns() {
        assertEquals(2, columns(320.dp, m)); assertEquals(2, columns(393.dp, m)); assertEquals(2, columns(440.dp, m))
        assertEquals(4, columns(834.dp, m)); assertEquals(5, columns(1210.dp, m)) // an iPad upright, and on its side
        for (w in listOf(320, 393, 440, 600, 834, 1024, 1210, 1366)) {
            val cols = columns(w.dp, m); val cart = (w - 16f * (cols + 1)) / cols
            assertTrue("$w: $cart", cart <= 240f && cart >= 130f)
        }
    }

    @Test fun rowsThatFitGetOneGapEverywhere() { // 393 x 852 with three rows of two: sides, columns, rows, top and bottom alike
        val g = grid(393.dp, 852.dp, 34.dp, 134.dp, 3, m, 10.32f, 12.42f)
        assertFalse(g.scrolls); assertEquals(2, g.cols); assertEquals(g.side.value, g.gap.value, 0f)
        assertTrue("gap ${g.gap.value}", g.gap.value in 8f..32f)
        assertEquals(393f, 2 * 10.32f * g.u.value + 3 * g.side.value, 0.05f) // the width, filled
        assertEquals(852f - 34f - 134f, 3 * 12.42f * g.u.value + 4 * g.gap.value, 0.05f) // and the height, from the fringe to the bar
    }

    @Test fun aTabletOrManyRowsKeepTheMarginAndTheRowsRule() {
        val pad = grid(1210.dp, 834.dp, 20.dp, 90.dp, 1, m, 10.32f, 12.42f)
        assertEquals(5, pad.cols); assertEquals(16f, pad.side.value, 0f); assertFalse(pad.scrolls)
        assertTrue("lead ${pad.lead.value}", pad.lead.value > 100f) // one row on a tablet sits towards the middle, not under the fringe
        val many = grid(393.dp, 852.dp, 34.dp, 134.dp, 5, m, 10.32f, 12.42f)
        assertEquals(16f, many.side.value, 0f); assertTrue(many.scrolls)
    }

    @Test fun oneRowKeepsTheMargin() {
        assertEquals(16f, rowGap(852.dp, 34.dp, 150.dp, 207.dp, 1, m).first.value, 0f)
        assertEquals(16f, rowGap(852.dp, 34.dp, 150.dp, 207.dp, 0, m).first.value, 0f)
    }

    @Test fun tiltFollowsTheScreenWhicheverWayItIsHeld() {
        assertEquals(0.3f to 0.1f, Tilt.screen(0.3f, 0.1f, Surface.ROTATION_0))
        assertEquals(-0.1f to 0.3f, Tilt.screen(0.3f, 0.1f, Surface.ROTATION_90))
        assertEquals(-0.3f to -0.1f, Tilt.screen(0.3f, 0.1f, Surface.ROTATION_180))
        assertEquals(0.1f to -0.3f, Tilt.screen(0.3f, 0.1f, Surface.ROTATION_270))
    }
}
