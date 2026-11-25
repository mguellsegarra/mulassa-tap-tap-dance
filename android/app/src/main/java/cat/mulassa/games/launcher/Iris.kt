package cat.mulassa.games.launcher

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.CubicBezierEasing
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.LinearOutSlowInEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.Stable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.draw.drawWithContent
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Rect
import androidx.compose.ui.graphics.Color
import androidx.compose.foundation.shape.GenericShape
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.TransformOrigin
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import cat.mulassa.games.R
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlin.math.hypot
import kotlin.math.max
import kotlin.math.roundToInt

// The iris (round 8): a circle in the game's colour grows from the pressed cartridge, the game's art moves to the middle and
// its name comes in on a dark plate; it stays over the game while the page loads (GameCover.kt). Reversed when the player comes
// back. The circle is the clip of a graphics layer and the rest are layer transforms: nothing is drawn again per frame.
@Stable
class IrisState {
    var game by mutableStateOf<Game?>(null)
    var image by mutableStateOf<ImageBitmap?>(null)
    var origin by mutableStateOf(Offset.Zero) // in the window, px
    var hop by mutableStateOf(false)
    val open = Animatable(0f)
    val plate = Animatable(0f)

    suspend fun forward() = coroutineScope {
        hop = false; open.snapTo(0f); plate.snapTo(0f)
        launch { delay(330); plate.animateTo(1f, tween(200, easing = LinearOutSlowInEasing)) }
        open.animateTo(1f, tween(650, easing = Curve))
        hop = true
    }

    suspend fun backward() {
        hop = false; plate.snapTo(0f); open.snapTo(1f)
        delay(30) // a frame covering the screen, then it shrinks onto the launcher
        open.animateTo(0f, tween(560, easing = Curve))
        game = null
    }

    companion object { val Curve = CubicBezierEasing(0.65f, 0f, 0.35f, 1f) }
}

@Composable
fun IrisView(state: IrisState, windowOffset: Offset = Offset.Zero) {
    val game = state.game ?: return
    val color = game.tint
    BoxWithConstraints(Modifier.fillMaxSize().pointerInput(Unit) { awaitPointerEventScope { while (true) awaitPointerEvent().changes.forEach { it.consume() } } }) {
        val d = LocalDensity.current
        val w = constraints.maxWidth.toFloat(); val h = constraints.maxHeight.toFloat()
        val o = state.origin - windowOffset
        val r = maxOf(hypot(o.x, o.y), hypot(w - o.x, o.y), hypot(o.x, h - o.y), hypot(w - o.x, h - o.y)) + 10 * d.density
        // the rays, recorded once; the layer's clip is the only thing that changes while the circle grows
        Box(Modifier.fillMaxSize()
            .graphicsLayer { val rad = state.open.value * r; clip = true; shape = GenericShape { _, _ -> addOval(Rect(o, rad)) } }
            .drawBehind {
                drawRect(color)
                val ray = color.mix(Color.White, 0.12f)
                for (k in 0 until 24) {
                    drawPath(Path().apply {
                        moveTo(o.x, o.y); arcTo(Rect(o, r), k * 15f, 7.5f, false); close()
                    }, ray)
                }
            })
        // the cream rim, on the same circle so it never runs ahead of the colour
        Box(Modifier.fillMaxSize().drawWithContent {
            val rad = state.open.value * r
            if (rad > 0) drawCircle(Palette.cream, rad, o, style = Stroke(14 * density))
        })
        val side = 150.dp
        val hopT = rememberInfiniteTransition(label = "hop")
        val hopV by hopT.animateFloat(0f, 1f, infiniteRepeatable(tween(500, easing = FastOutSlowInEasing), RepeatMode.Reverse), label = "hop")
        val artCentreY = h * 0.36f
        Column(
            Modifier.offset { IntOffset(0, (artCentreY - with(d) { side.toPx() } / 2).roundToInt()) }
                .align(Alignment.TopCenter)
                .graphicsLayer {
                    val p = state.open.value
                    val s = 0.37f + 0.63f * p
                    scaleX = s; scaleY = s
                    transformOrigin = TransformOrigin(0.5f, side.toPx() / 2 / size.height)
                    translationX = (o.x - w / 2) * (1 - p)
                    translationY = (o.y - artCentreY) * (1 - p)
                },
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(28.dp),
        ) {
            val radius = side * 0.28f
            Box(Modifier
                .graphicsLayer {
                    val k = if (state.hop) hopV else 0f
                    translationY = -12 * density * k; rotationZ = -4 * k
                }
                .drawBehind {
                    val dd = density
                    drawRoundRect(Color.Black.copy(alpha = 0.3f), Offset(-6 * dd, -6 * dd + 7.5f * dd),
                        androidx.compose.ui.geometry.Size(size.width + 12 * dd, size.height + 12 * dd), CornerRadius(radius.toPx() + 6 * dd))
                    drawRoundRect(Palette.cream, Offset(-3 * dd, -3 * dd), androidx.compose.ui.geometry.Size(size.width + 6 * dd, size.height + 6 * dd),
                        CornerRadius(radius.toPx() + 3 * dd))
                }
                .size(side).clip(RoundedCornerShape(radius)).background(color)) {
                state.image?.let { Image(it, null, Modifier.fillMaxSize(), contentScale = ContentScale.Crop) }
            }
            Column(
                Modifier.widthIn(max = with(d) { (w - 48 * density).toDp() })
                    .graphicsLayer { val p = state.plate.value; alpha = p; scaleX = 0.9f + 0.1f * p; scaleY = scaleX }
                    .drawBehind {
                        val dd = density
                        drawRoundRect(Color.Black.copy(alpha = 0.35f), Offset(0f, 5 * dd), size, CornerRadius(22 * dd))
                        drawRoundRect(Palette.ink, cornerRadius = CornerRadius(22 * dd))
                        drawRoundRect(Palette.cream, Offset(-1.5f * dd, -1.5f * dd), androidx.compose.ui.geometry.Size(size.width + 3 * dd, size.height + 3 * dd),
                            CornerRadius(23.5f * dd), style = Stroke(3 * dd))
                    }
                    .padding(start = 22.dp, end = 22.dp, top = 14.dp, bottom = 16.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                Label(game.title, Fonts.baloo, 28.dp, Palette.cream, center = true)
                Label(stringResource(R.string.launcher_opening_game), Fonts.balooBold, 15.dp, color)
            }
        }
    }
}

private fun Rect(c: Offset, r: Float) = Rect(c.x - r, c.y - r, c.x + r, c.y + r)
