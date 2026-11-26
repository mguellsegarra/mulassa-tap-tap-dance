package cat.mulassa.games.launcher

import android.provider.Settings
import androidx.activity.compose.BackHandler
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.CubicBezierEasing
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.asPaddingValues
import androidx.compose.foundation.layout.navigationBars
import androidx.compose.foundation.layout.statusBars
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.Density
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import cat.mulassa.games.R
import kotlinx.coroutines.launch
import kotlin.math.abs
import kotlin.math.cos
import kotlin.math.sin

// A cartridge tapped on the home: where it was (its centre in the window) and its size there.
class Pick(val game: Game, val at: Offset, val u: Dp)

private const val TURN_MS = 500
private val TURN = CubicBezierEasing(0.42f, 0f, 0.58f, 1f)
private val BUTTON_H = 56.dp
private val BUTTON_GAP = 24.dp
private const val DEPTH = 0.075f // the side's depth, of the face's width

// Ronda 18's intermediate screen («més senzill»): the cartridge lifts out of its slot and turns once around its vertical
// axis, like a card, while it grows to the middle over the dimmed home; under it, «Juga» starts the iris. Outside or back
// turns it back into its slot. An «Aviat» one turns, then shakes, with no button. Laid out at its final size and scaled
// down at the start, so the art stays sharp; only layer transforms and alpha move.
@Composable
fun Picked(model: Launcher, pick: Pick, done: () -> Unit) {
    val res = LocalContext.current.contentResolver
    val still = remember { Settings.Global.getFloat(res, Settings.Global.ANIMATOR_DURATION_SCALE, 1f) == 0f }
    val p = remember { Animatable(0f) }
    val shake = remember { Animatable(0f) }
    val scope = rememberCoroutineScope()
    val buzz = haptic(model)
    val back by remember { derivedStateOf { !still && (TURN.transform(p.value) * 360f).let { it > 90f && it < 270f } } }
    val leaving = remember { booleanArrayOf(false) }
    val close = { if (!leaving[0]) { leaving[0] = true; scope.launch { p.animateTo(0f, tween(TURN_MS, easing = LinearEasing)); done() } } }
    LaunchedEffect(pick) {
        p.animateTo(1f, tween(TURN_MS, easing = LinearEasing))
        if (pick.game.soon) { buzz(REJECT); shake.animateTo(0f, spring(dampingRatio = 0.15f, stiffness = 1500f), initialVelocity = 40f) }
    }
    BackHandler { close() }
    BoxWithConstraints(Modifier.fillMaxSize()) {
        val d = LocalDensity.current
        val big = maxWidth * 2 / 3 / CART_W // two thirds of the width (owner, ronda 19)
        val w = big * CART_W; val h = big * CART_H
        val block = h + if (pick.game.soon) 0.dp else BUTTON_GAP + BUTTON_H
        // centred between the status bar and the tab bar
        val above = WindowInsets.statusBars.asPaddingValues().calculateTopPadding()
        val below = WindowInsets.navigationBars.asPaddingValues().calculateBottomPadding() + BAR_GAP + BAR_H
        val top = above + (maxHeight - above - below - block) / 2
        val to = with(d) { Offset(maxWidth.toPx() / 2, (top + h / 2).toPx()) }
        Box(Modifier.fillMaxSize().graphicsLayer { alpha = p.value }.drawBehind { drawRect(hex("#0a0603").copy(alpha = 0.6f)) }
            .clickable(null, null) { close() })
        // the move eases out; the turn eases in and out on its own, so it spreads over the whole half second
        val side = remember { Side() }
        fun Density.lift() = side.apply {
            val e = FastOutSlowInEasing.transform(p.value); val s = pick.u / big
            tx = (pick.at.x - to.x) * (1 - e) + shake.value * 8.dp.toPx()
            ty = (pick.at.y - to.y) * (1 - e)
            scale = s + (1 - s) * e
            turn = if (still) 0f else 360f * TURN.transform(p.value)
            camera = 14 * density * 8 // a soft perspective for a card this big
            depth = w.toPx() * DEPTH
        }
        // The cartridge's side, so it reads as a thick object while it turns: a slab DEPTH of its width deep on the edge
        // that faces us, projected as the face's own layer is; the face moves to the box's front plane.
        Box(Modifier.offset((maxWidth - w) / 2, top).size(w, h).drawBehind {
            lift().draw(this, big.toPx(), pick.game.tint)
        })
        Box(Modifier.offset((maxWidth - w) / 2, top).size(w, h).graphicsLayer {
            lift()
            translationX = side.tx + side.shift(size.width / 2, size.height / 2); translationY = side.ty
            scaleX = side.scale; scaleY = side.scale; rotationY = side.turn; cameraDistance = side.camera
        }.clickable(null, null) {}) {
            // the turn mirrors the back: flipped once more, its engraving reads left to right
            if (back) Box(Modifier.graphicsLayer { scaleX = -1f }) { CartridgeBack(pick.game.tint, big) } else Cartridge(pick.game.tint, pick.game.short ?: stringResource(R.string.ui_select_aviat),
                model.images[pick.game.id], big, locked = pick.game.soon)
        }
        if (!pick.game.soon) Box(Modifier.offset((maxWidth - w) / 2 + big * 0.16f, top + h + BUTTON_GAP).size(w - big * 0.32f, BUTTON_H)
            .graphicsLayer { alpha = ((p.value - 0.6f) / 0.4f).coerceIn(0f, 1f) }) {
            PlayButton(stringResource(R.string.jocs_menu_play)) { model.play(pick.game, to) }
        }
    }
}

// A box's side seen through the same 3D camera as a rotated graphics layer (RenderNode: scale about the pivot, then
// android.graphics.Camera's rotation at the pivot, then the translation). Draws the sides that face us; shift() is how far
// the face moves to sit on the front plane instead of the middle one.
private class Side {
    var tx = 0f; var ty = 0f; var scale = 1f; var turn = 0f; var camera = 8f; var depth = 0f
    private val cam = android.graphics.Camera(); private val m = android.graphics.Matrix(); private val pt = FloatArray(8)

    // the points (x0, y0) and (x1, y1) of the plane at depth z (towards the camera when negative), into pt[at..at+3]
    private fun project(px: Float, py: Float, x0: Float, y0: Float, x1: Float, y1: Float, z: Float, at: Int) {
        cam.save(); cam.setLocation(0f, 0f, -camera); cam.rotateY(turn); cam.translate(0f, 0f, z * scale)
        cam.getMatrix(m); cam.restore()
        m.preTranslate(-px, -py); m.postTranslate(px + tx, py + ty); m.preScale(scale, scale, px, py)
        pt[at] = x0; pt[at + 1] = y0; pt[at + 2] = x1; pt[at + 3] = y1
        m.mapPoints(pt, at, pt, at, 2)
    }

    private fun front() = if (cos(Math.toRadians(turn.toDouble())) >= 0) -depth / 2 else depth / 2

    fun shift(px: Float, py: Float): Float {
        project(px, py, px, py, px, py, front(), 0); project(px, py, px, py, px, py, 0f, 4)
        return pt[0] - pt[4]
    }

    // The shell's outline swept back from the face: the straight side (from the top chamfer to the drop edge's bottom
    // one, 0.72 to 11.69) and the two chamfers as slanted facets. Each facet starts on the face layer's own edge (the
    // layer's plane, moved by shift(), not the true front plane, which projects a little bigger and stuck out past the cut
    // corners) and runs `depth` away from the viewer. Back-face culling: a facet is drawn only when its far edge lands
    // outside its near edge, away from the face; a convex slab's facet folds back over the face exactly when it faces away.
    fun draw(d: DrawScope, u: Float, tint: Color) {
        val a = Math.toRadians(turn.toDouble())
        if (abs(sin(a)) < 0.05) return // within ~3° of front or back: no side
        val px = d.size.width / 2; val py = d.size.height / 2; val dx = shift(px, py)
        val far = if (cos(a) >= 0) depth else -depth
        project(px, py, px, py, px, py, 0f, 0); val cx = pt[0] + dx; val cy = pt[1]
        val ink = hex("#1d100a")
        for (left in booleanArrayOf(true, false)) {
            fun x(at: Float) = if (left) at * u else d.size.width - at * u
            fun facet(x0: Float, y0: Float, x1: Float, y1: Float, fill: (Float, Float) -> Brush) {
                project(px, py, x(x0), y0 * u, x(x1), y1 * u, 0f, 0); project(px, py, x(x0), y0 * u, x(x1), y1 * u, far, 4)
                for (i in 0..6 step 2) pt[i] += dx
                val ax = pt[2] - pt[0]; val ay = pt[3] - pt[1]
                fun side(qx: Float, qy: Float) = ax * (qy - pt[1]) - ay * (qx - pt[0])
                if (side((pt[4] + pt[6]) / 2, (pt[5] + pt[7]) / 2) * side(cx, cy) >= 0) return
                // the near edge tucks 1.5 px under the face, so the two antialiased edges leave no hairline between them
                val len = kotlin.math.hypot(ax, ay); val nx = -ay / len * 1.5f; val ny = ax / len * 1.5f
                val inward = if (side(cx, cy) > 0) 1f else -1f
                for (i in 0..2 step 2) { pt[i] += nx * inward; pt[i + 1] += ny * inward }
                d.drawPath(Path().apply { moveTo(pt[0], pt[1]); lineTo(pt[4], pt[5]); lineTo(pt[6], pt[7]); lineTo(pt[2], pt[3]); close() }, fill(pt[1], pt[3]))
            }
            facet(0.16f, 0.72f, 0.16f, 11.69f) { y0, y1 -> Brush.verticalGradient(0f to tint.mix(ink, 0.38f), 1f to tint.mix(ink, 0.6f), startY = y0, endY = y1) }
            facet(0.16f, 0.72f, 0.88f, 0f) { _, _ -> SolidColor(tint.mix(ink, 0.3f)) }
            facet(0.16f, 11.69f, 0.86f, 12.39f) { _, _ -> SolidColor(tint.mix(ink, 0.6f)) }
        }
    }
}

// «Juga»: the yellow button on a hard darker edge, a play triangle and the word, centred together.
@Composable
private fun PlayButton(label: String, onClick: () -> Unit) {
    Box(Modifier.fillMaxSize().squash(3.dp, onClick = onClick).drawBehind {
        val r = CornerRadius(18 * density); val edge = 4 * density
        drawRoundRect(hex("#b98a0c"), Offset(0f, edge), Size(size.width, size.height - edge), r)
        drawRoundRect(Palette.yellow, size = Size(size.width, size.height - edge), cornerRadius = r)
    }) {
        Row(Modifier.align(Alignment.Center).offset(y = (-2).dp), horizontalArrangement = Arrangement.spacedBy(10.dp), verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.size(16.dp).drawBehind {
                drawPath(Path().apply { moveTo(size.width * 0.12f, 0f); lineTo(size.width, size.height / 2); lineTo(size.width * 0.12f, size.height); close() }, Palette.ink)
            })
            Label(label, Fonts.baloo, 24.dp, Palette.ink)
        }
    }
}
