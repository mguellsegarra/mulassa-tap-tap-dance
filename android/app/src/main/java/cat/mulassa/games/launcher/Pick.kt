@file:OptIn(androidx.compose.foundation.layout.ExperimentalLayoutApi::class)

package cat.mulassa.games.launcher

import android.content.pm.ApplicationInfo
import android.provider.Settings
import android.util.Log
import androidx.activity.compose.BackHandler
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.AnimationVector1D
import androidx.compose.animation.core.CubicBezierEasing
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.animate
import androidx.compose.foundation.gestures.Orientation
import androidx.compose.foundation.gestures.draggable
import androidx.compose.foundation.gestures.rememberDraggableState
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import android.view.HapticFeedbackConstants
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
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
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.withFrameNanos
import androidx.compose.runtime.snapshotFlow
import kotlinx.coroutines.flow.first
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
import androidx.compose.ui.unit.Density
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.asPaddingValues
import androidx.compose.foundation.layout.navigationBars
import androidx.compose.foundation.layout.statusBarsIgnoringVisibility
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import cat.mulassa.games.R
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.launch
import kotlin.math.abs
import kotlin.math.cos
import kotlin.math.sin

// A cartridge tapped on the home: where it was (its centre in the window) and its size there.
class Pick(val game: Game, val at: Offset, val u: Dp)

// Ronda 22's choreography, shared with iOS (design/mulassa-games/app-home/ronda-22/timings.md): no spring, no overshoot.
private val EASE_IN_OUT = CubicBezierEasing(0.42f, 0f, 0.58f, 1f)
private val EASE_OUT = CubicBezierEasing(0.33f, 0f, 0.2f, 1f)
private val EASE_IN = CubicBezierEasing(0.5f, 0f, 1f, 1f) // the push into the bay: it speeds up to the thunk
private val BUTTON_H = 56.dp
private val BUTTON_GAP = 24.dp
private const val DEPTH = 0.075f // the side's depth, of the face's width

// Ronda 18's intermediate screen («més senzill»): the cartridge lifts out of its slot and grows to the middle over the
// dimmed, blurred home (`veil`, owned by LauncherRoot); under it, «Juga» starts the iris. Outside or back takes it back to
// its slot. An «Aviat» one has no button. It turns once round its vertical axis on the way (ronda 30: back, quicker,
// 500 ms); it goes into the console straight, face on (ronda 35: the owner found the tipped one crooked).
// Ronda 26: then the console (Console.kt) slides up from the bottom edge and the
// cartridge is dragged down into its bay, under the panel, or «Juga» (or a tap on the console) inserts it; seated, the
// LED lights and the iris opens. Short of the threshold it springs back; an «Aviat» one is refused at the bay's mouth. Laid out at its final size and scaled down at the start, so the art stays
// sharp. Both faces are composed once, each on its own offscreen layer: the motion only moves cached layers (transforms and
// alpha), nothing is measured or redrawn per frame but the thin side.
@Composable
fun Picked(model: Launcher, pick: Pick, sounds: ConsoleSounds, veil: Animatable<Float, AnimationVector1D>, ready: () -> Boolean, done: () -> Unit) {
    val ctx = LocalContext.current; val res = ctx.contentResolver
    val still = remember { Settings.Global.getFloat(res, Settings.Global.ANIMATOR_DURATION_SCALE, 1f) == 0f }
    val lift = remember { Animatable(0f) }
    val turn = remember { Animatable(0f) }
    val juga = remember { Animatable(0f) }
    val shake = remember { Animatable(0f) }
    val scope = rememberCoroutineScope()
    val buzz = haptic(model)
    val leaving = remember { booleanArrayOf(false) }
    val rise = remember { Animatable(0f) } // the console, hidden to up
    val led = remember { Animatable(0f) }
    val fade = remember { Animatable(1f) } // reduced motion's insertion: out at the centre, in at the bay
    var p by remember { mutableFloatStateOf(0f) } // the insertion: 0 centred over the console, 1 seated
    var armed by remember { mutableStateOf(false) } // the intro is over: the drag and «Juga» may start
    val busy = remember { booleanArrayOf(false, false) } // [refusing or settling, seating: nothing takes it back]
    var job by remember { mutableStateOf<Job?>(null) } // the one animation on p
    // Ronda 23's evidence, debuggable builds only: the first animated frame's time of the pick and of the return (the
    // clock of framestats' IntendedVsync), so `dumpsys gfxinfo framestats` rows line up with them
    val debug = remember { ctx.applicationInfo.flags and ApplicationInfo.FLAG_DEBUGGABLE != 0 }
    suspend fun mark(what: String) { if (debug) withFrameNanos { Log.d("lift-frame", "$what $it") } }
    val close = {
        if (!leaving[0] && !busy[1]) {
            leaving[0] = true
            scope.launch {
                val ms = if (still) 300 else 450
                launch { mark("back") }
                launch { juga.animateTo(0f, tween(120, easing = LinearEasing)) }
                launch { rise.animateTo(0f, tween(250, easing = EASE_IN_OUT)) }
                job?.cancel(); val from = p
                launch { animate(from, 0f, animationSpec = tween(ms, easing = EASE_IN_OUT)) { v, _ -> p = v } }
                launch { veil.animateTo(0f, tween(ms, easing = EASE_IN_OUT)) }
                launch { turn.animateTo(0f, tween(ms, easing = EASE_IN_OUT)) }
                lift.animateTo(0f, tween(ms, easing = EASE_IN_OUT))
                done()
            }
        }
    }
    LaunchedEffect(pick) {
        veil.snapTo(0f)
        snapshotFlow(ready).first { it } // the blurred home is there: nothing but motion from here on
        coroutineScope {
            launch { mark("pick") }
            if (still) {
                launch { veil.animateTo(1f, tween(300, easing = EASE_IN_OUT)) }
                launch { juga.animateTo(1f, tween(200, 100, EASE_OUT)) }
                launch { rise.animateTo(1f, tween(250, 100, EASE_OUT)) }
                lift.animateTo(1f, tween(300, easing = EASE_IN_OUT))
            } else {
                launch { veil.animateTo(1f, tween(300, easing = EASE_OUT)) }
                launch { juga.animateTo(1f, tween(200, 400, EASE_OUT)) }
                launch { rise.animateTo(1f, tween(250, 400, EASE_OUT)) } // as Juga, near the lift's end
                launch { turn.animateTo(360f, tween(500, easing = EASE_IN_OUT)) }
                lift.animateTo(1f, tween(500, easing = EASE_IN_OUT))
            }
        }
        armed = true
    }
    BackHandler { close() }
    val name = if (pick.game.soon) stringResource(R.string.ui_select_aviat) else stringResource(R.string.launcher_play, pick.game.title)
    BoxWithConstraints(Modifier.fillMaxSize()) {
        val d = LocalDensity.current
        val above = WindowInsets.statusBarsIgnoringVisibility.asPaddingValues().calculateTopPadding() // the bar's room even while the iris hides it: no jump on return
        // the console: its canvas k dp a pixel, its top `shown` from the top once up
        // by the width on a phone; on a wide, short window (a tablet on its side, a split screen) by the height, so it
        // never takes more than 38 % of it and the cartridge keeps its room above
        val k = minOf(maxWidth * Bay.WIDTH / Bay.W, maxHeight * 0.38f / Bay.SHOWN); val cw = k * Bay.W; val ch = k * Bay.H
        val shown = maxHeight - k * Bay.SHOWN
        val extra = if (pick.game.soon) 0.dp else BUTTON_GAP + BUTTON_H
        // two thirds of the width (owner, ronda 19), smaller only if it would not fit above the console
        val big = maxOf(minOf(maxWidth * 2 / 3, (shown - above - M * 2 - extra) * (CART_W / CART_H)), 48.dp) / CART_W // never nothing, in the shortest window
        val w = big * CART_W; val h = big * CART_H
        val block = h + extra
        // centred between the status bar and the navigation bar, as before the console; clear of it
        val below = WindowInsets.navigationBars.asPaddingValues().calculateBottomPadding() + M
        val top = minOf(above + (maxHeight - above - below - block) / 2, shown - M - block)
        val to = with(d) { Offset(maxWidth.toPx() / 2, (top + h / 2).toPx()) }
        // seated: u is the bay's, its top level with the shoulders'; px from here on
        val q = k * Bay.U / big
        val seat = with(d) { Offset(((maxWidth - cw) / 2 + k * Bay.CENTRE).toPx(), (shown + k * (Bay.SEAT + Bay.U * CART_H / 2)).toPx()) }
        val travel = seat.y - to.y
        val half = with(d) { (h / 2).toPx() }; val mouth = with(d) { (shown + k * Bay.MOUTH).toPx() }
        // the cartridge's bottom edge reaches the panel; kept inside the travel whatever the window's shape
        val pc = ((mouth - to.y - half) / (travel + half * (q - 1))).coerceIn(0.05f, 0.95f)
        val iris = with(d) { Offset(seat.x, ((shown * 2 + k * (Bay.SEAT + Bay.MOUTH))/ 2).toPx()) } // its part left outside
        fun scaleNow() = (1 + (q - 1) * p)
        fun move(v: Float) {
            if (p < pc && v >= pc) { sounds.play(sounds.click); buzz(HapticFeedbackConstants.CLOCK_TICK) }
            p = v
        }
        fun run(block: suspend kotlinx.coroutines.CoroutineScope.() -> Unit) { job?.cancel(); job = scope.launch { block() } }
        fun back() = run {
            animate(p, 0f, animationSpec = if (still) tween(150) else spring(dampingRatio = 1f, stiffness = 500f)) { v, _ -> p = v }
            busy[0] = false
        }
        fun refuse() {
            busy[0] = true; buzz(REJECT); sounds.play(sounds.buzz)
            if (!still) scope.launch { shake.animateTo(0f, spring(dampingRatio = 0.15f, stiffness = 1500f), initialVelocity = 40f) }
            back()
        }
        fun insert() {
            if (busy[1] || leaving[0] || pick.game.soon) return
            busy[0] = true; busy[1] = true
            run {
                launch { mark("seat") }
                launch { juga.animateTo(0f, tween(120, easing = LinearEasing)) }
                if (still) { fade.animateTo(0f, tween(150)); move(1f); fade.animateTo(1f, tween(150)) }
                else animate(p, 1f, animationSpec = tween((360 * (1 - p)).toInt().coerceAtLeast(120), easing = EASE_IN)) { v, _ -> move(v) }
                sounds.play(sounds.thunk); buzz(CONFIRM)
                led.animateTo(1f, tween(90))
                sounds.play(sounds.boot)
                delay(160) // the two notes, then the iris
                model.play(pick.game, iris)
            }
        }
        val drag = rememberDraggableState { delta ->
            if (!busy[0]) {
                val v = (p + delta * scaleNow() / travel).coerceIn(0f, 1f) // the layer's local delta, back in screen pixels
                if (pick.game.soon && v >= pc) { move(pc); refuse() } else if (v >= 1f) insert() else move(v)
            }
        }
        Box(Modifier.fillMaxSize().graphicsLayer { alpha = veil.value }.drawBehind { drawRect(hex("#0a0603").copy(alpha = 0.6f)) }
            .clearAndSetSemantics {}.clickable(null, null) { close() }) // back closes it for TalkBack; the cartridge is its one target
        // the console's layers move together: slid up from below the edge, or faded in with reduced motion
        fun console(m: Modifier) = m.offset((maxWidth - cw) / 2, shown).graphicsLayer {
            translationY = if (still) 0f else (1 - rise.value) * (maxHeight - shown + 8.dp).toPx(); alpha = if (still) rise.value else 1f
        }
        fun push() { if (!armed || busy[0]) return; if (pick.game.soon) { move(pc); refuse() } else insert() } // a tap: in alone, or refused
        ConsoleShell(cw, ch, console(Modifier).clearAndSetSemantics {}.clickable(null, null) { push() })
        val side = remember { Side() }
        fun Density.lift() = side.apply {
            val e = lift.value; val s = pick.u / big
            tx = (pick.at.x - to.x) * (1 - e) + shake.value * 8.dp.toPx() + (seat.x - to.x) * p
            ty = (pick.at.y - to.y) * (1 - e) + travel * p
            scale = (s + (1 - s) * e) * scaleNow()
            this.turn = turn.value
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
            scaleX = side.scale; scaleY = side.scale; rotationY = side.turn; cameraDistance = side.camera; alpha = fade.value
        }.semantics { contentDescription = name; role = Role.Button }.clickable(null, null) { push() }.draggable(drag, Orientation.Vertical, enabled = armed,
            // a drag takes the cartridge from a spring back, never from its seating: that job opens the game
            onDragStarted = { if (!busy[1]) job?.cancel(); scope.launch { mark("drag") } },
            onDragStopped = { velocity ->
                if (!busy[0]) {
                    val fling = velocity * scaleNow() > 1200 * d.density // dp/s, downwards
                    if (!pick.game.soon && ((p - pc) / (1 - pc) >= 0.4f || fling && p > 0.05f)) insert() else back()
                }
            })) {
            fun back() = cos(Math.toRadians(turn.value.toDouble())) < 0
            Box(Modifier.graphicsLayer { alpha = if (back()) 0f else 1f }) {
                Cartridge(pick.game.tint, pick.game.short ?: stringResource(R.string.ui_select_aviat), model.images[pick.game.id], big, locked = pick.game.soon, number = model.number(pick.game), planes = model.planes[pick.game.id])
            }
            // the turn mirrors the back: flipped once more, its engraving reads left to right
            Box(Modifier.graphicsLayer { alpha = if (back()) 1f else 0f; scaleX = -1f }) { CartridgeBack(pick.game.tint, big) }
        }
        ConsolePanel(cw, ch, { led.value }, console(Modifier))
        // «Juga» runs the same insertion; it fades as the cartridge is dragged away from it
        if (!pick.game.soon) Box(Modifier.offset((maxWidth - w) / 2 + big * 0.16f, top + h + BUTTON_GAP).size(w - big * 0.32f, BUTTON_H)
            .graphicsLayer { alpha = juga.value * (1 - p * 5).coerceAtLeast(0f) }) {
            PlayButton(stringResource(R.string.jocs_menu_play)) { push() }
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

    // The shell's outline (Cartridge's SHAPE, its drop edge 0.34 lower) swept back from the face: the straight side and
    // the 45° cuts at its ends, the small bevel on top and, on the right, the big keyed cut at the bottom. Each facet
    // starts on the face layer's own edge (the layer's plane, moved by shift()) and runs `depth` away from the viewer.
    // Back-face culling: a facet is drawn only when its far edge lands outside its near edge, away from the face.
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
            val cut = if (left) 0.25f else 1.1f
            facet(0.16f, 0.25f, 0.16f, 12.39f - cut) { y0, y1 -> Brush.verticalGradient(0f to tint.mix(ink, 0.38f), 1f to tint.mix(ink, 0.6f), startY = y0, endY = y1) }
            facet(0.16f, 0.25f, 0.41f, 0f) { _, _ -> SolidColor(tint.mix(ink, 0.3f)) }
            facet(0.16f, 12.39f - cut, 0.16f + cut, 12.39f) { _, _ -> SolidColor(tint.mix(ink, 0.6f)) }
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
