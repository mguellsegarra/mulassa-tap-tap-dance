package cat.mulassa.games.launcher

import android.provider.Settings
import androidx.annotation.DrawableRes
import cat.mulassa.games.R
import androidx.compose.animation.core.Easing
import androidx.compose.animation.core.CubicBezierEasing
import androidx.compose.animation.core.InfiniteTransition
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.StartOffset
import androidx.compose.animation.core.StartOffsetType
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.asPaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBars
import androidx.compose.runtime.Composable
import androidx.compose.runtime.Immutable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.State
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import java.util.Calendar
import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.sin
import kotlinx.coroutines.delay

// The sky by the device's hour (ronda-10's SKY and sky()): dawn, morning, midday, afternoon and sunset, night. Keyframes
// blended in RGB into a 3-stop gradient with static stars, recomputed every 5 minutes. Over it, ronda-14's B1 «Cel en
// calma» (SkyLife): drifting clouds (ronda-15: five soft shapes) and twinkling stars, on layer translation and alpha only (no sun or moon: the owner wants the header clear).
@Immutable
data class Sky(val top: Color, val mid: Color, val bottom: Color, val stars: Float, val clouds: Float, val hour: Float = 12f) {
    val header get() = top.mix(mid, 0.22f) // the colour behind the sticky header, for its fade
    val sheet get() = top.mix(hex("#0b0f22"), 0.55f)
}

private class Key(val h: Float, top: String, mid: String, bottom: String, stars: Float, clouds: Float) {
    val sky = Sky(hex(top), hex(mid), hex(bottom), stars, clouds)
}

private val SKY = listOf( // hour, top, middle, bottom, stars, clouds
    Key(0f, "#0a1430", "#16244f", "#27386d", 1f, 0f), Key(5f, "#0d1838", "#1d2c5c", "#33427a", 0.9f, 0f),
    Key(6.5f, "#3a4a8c", "#c98aa6", "#ffc9a0", 0.25f, 0.35f), Key(8.5f, "#6fb2ea", "#a9d6f3", "#f3e6d6", 0f, 0.8f),
    Key(13f, "#4a9be4", "#86c6f1", "#d6eefb", 0f, 1f), Key(17f, "#5a9fdc", "#a9c9e6", "#f5dcc0", 0f, 0.85f),
    Key(19f, "#4b4c99", "#d77a8c", "#ffb878", 0.1f, 0.45f), Key(20.5f, "#1f2558", "#5b3f78", "#a8607a", 0.6f, 0.1f),
    Key(22f, "#0c1634", "#1a2853", "#2c3c70", 1f, 0f), Key(24f, "#0a1430", "#16244f", "#27386d", 1f, 0f),
)

fun skyAt(hour: Float): Sky {
    val h = hour.mod(24f)
    val k = SKY.indexOfFirst { it.h > h }
    val a = SKY[k - 1]; val b = SKY[k]; val t = (h - a.h) / (b.h - a.h)
    val x = a.sky; val y = b.sky
    return Sky(x.top.mix(y.top, t), x.mid.mix(y.mid, t), x.bottom.mix(y.bottom, t), x.stars + (y.stars - x.stars) * t, x.clouds + (y.clouds - x.clouds) * t, h)
}

private fun now(): Float = Calendar.getInstance().run { get(Calendar.HOUR_OF_DAY) + get(Calendar.MINUTE) / 60f }

// `hour` fixes the sky (a debug build's preview extra); otherwise it follows the clock.
@Composable
fun rememberSky(hour: Float?): Sky {
    var sky by remember { mutableStateOf(skyAt(hour ?: now())) }
    LaunchedEffect(hour) {
        while (true) { sky = skyAt(hour ?: now()); delay(5 * 60 * 1000L) }
    }
    return sky
}

// The gradient and the static stars (three tiled dot grids), as the prototype's CSS layers. B1 draws its own clouds.
fun Modifier.sky(sky: () -> Sky) = drawBehind {
    val s = sky()
    drawRect(Brush.verticalGradient(0f to s.top, 0.55f to s.mid, 1f to s.bottom))
    if (s.stars > 0.01f) for (f in STARS) dots(f, s.stars)
}

private data class Stars(val tile: Offset, val at: Offset, val r: Float, val a: Float, val c: Color = Color.White)
private val STARS = listOf(
    Stars(Offset(97f, 89f), Offset(0.2f, 0.3f), 0.6f, 1f),
    Stars(Offset(131f, 113f), Offset(0.7f, 0.6f), 0.5f, 1f),
    Stars(Offset(173f, 157f), Offset(0.4f, 0.8f), 0.8f, 0.53f),
)
// B1's twinkling fields: two layers breathing out of step, two tiled patterns each
private val TWINKLE = listOf(
    listOf(Stars(Offset(83f, 71f), Offset(0.3f, 0.4f), 1f, 1f), Stars(Offset(149f, 127f), Offset(0.8f, 0.2f), 0.85f, 1f, hex("#fffbe0"))),
    listOf(Stars(Offset(109f, 97f), Offset(0.6f, 0.7f), 0.9f, 1f), Stars(Offset(191f, 163f), Offset(0.15f, 0.15f), 1.15f, 1f, hex("#e8f0ff"))),
)

private fun DrawScope.dots(f: Stars, alpha: Float = 1f) {
    val tw = f.tile.x * density; val th = f.tile.y * density
    var y = 0f
    while (y < size.height) {
        var x = 0f
        while (x < size.width) { drawCircle(f.c.copy(alpha = f.a * alpha), f.r * density, Offset(x + f.at.x * tw, y + f.at.y * th)); x += tw }
        y += th
    }
}

// ---- ronda-14 B1 «Cel en calma». Every layer is drawn once; the motion only changes graphicsLayer translation, scale and
// alpha, read inside the layer block (no recomposition per frame). The frame clock stops while the activity is stopped
// (background, or a game on top). ANIMATOR_DURATION_SCALE 0 freezes it in place.

private val CSS_EASE = CubicBezierEasing(0.42f, 0f, 0.58f, 1f) // CSS ease-in-out

// y (from the status bar's foot, a share of the height, or from the bottom), cloud, width (at most 160), seconds per crossing, start (0..1), opacity
private class Lane(val fromTop: Float = -1f, val share: Float = -1f, val fromBottom: Float = -1f, @DrawableRes val c: Int, val w: Float, val s: Int, val p: Float, val o: Float)
// ronda-15: soft pre-rendered clouds (design/…/ronda-15/clouds/make_clouds.py, style S1), the same bitmaps as iOS
private val LANES = listOf(
    Lane(fromTop = 3f, c = R.drawable.cloud_long, w = 80f, s = 160, p = 0.3f, o = 0.5f), // far: small, slow
    Lane(share = 0.4f, c = R.drawable.cloud_round, w = 64f, s = 150, p = 0.75f, o = 0.45f),
    Lane(fromBottom = 58f, c = R.drawable.cloud_wisp, w = 96f, s = 170, p = 0.62f, o = 0.5f),
    Lane(fromTop = 27f, c = R.drawable.cloud_tall, w = 140f, s = 80, p = 0.55f, o = 0.9f), // near: big, quicker
    Lane(share = 0.62f, c = R.drawable.cloud_twin, w = 140f, s = 95, p = 0.4f, o = 0.8f),
    Lane(fromBottom = 44f, c = R.drawable.cloud_long, w = 160f, s = 75, p = 0.12f, o = 0.9f),
)

// a 0..1 loop starting `at` of the way in, or null when motion is off
@Composable
private fun InfiniteTransition.loop(still: Boolean, ms: Int, at: Float = 0f, easing: Easing = LinearEasing, reverse: Boolean = false): State<Float>? =
    if (still) null else animateFloat(0f, 1f, infiniteRepeatable(tween(ms, easing = easing), if (reverse) RepeatMode.Reverse else RepeatMode.Restart,
        StartOffset((at * ms).toInt(), StartOffsetType.FastForward)), label = "sky")

@Composable
fun BoxScope.SkyLife(sky: Sky) {
    val res = LocalContext.current.contentResolver
    val still = remember { Settings.Global.getFloat(res, Settings.Global.ANIMATOR_DURATION_SCALE, 1f) == 0f }
    val top = WindowInsets.statusBars.asPaddingValues().calculateTopPadding()
    val t = rememberInfiniteTransition(label = "sky")
    BoxWithConstraints(Modifier.matchParentSize()) {
        val w = maxWidth; val h = maxHeight
        if (sky.clouds > 0.01f) Box(Modifier.fillMaxSize().graphicsLayer { alpha = sky.clouds }) {
            for (l in LANES) {
                val y = when { l.fromTop >= 0 -> top + l.fromTop.dp; l.share >= 0 -> h * l.share; else -> h - l.fromBottom.dp }
                val q = t.loop(still, l.s * 1000, l.p)
                // enters fully hidden on the left, leaves fully hidden on the right
                val img = painterResource(l.c)
                Image(img, null, Modifier.offset(y = y).size(l.w.dp, l.w.dp * img.intrinsicSize.height / img.intrinsicSize.width).graphicsLayer {
                    alpha = l.o; translationX = ((q?.value ?: l.p) * (w + 160.dp).toPx()) - l.w.dp.toPx()
                })
            }
        }
        if (sky.stars > 0.01f) Box(Modifier.fillMaxSize().graphicsLayer { alpha = sky.stars }) {
            for ((k, fields) in TWINKLE.withIndex()) {
                val q = t.loop(still, 3200, k * 0.5f, CSS_EASE, reverse = true)
                Canvas(Modifier.fillMaxSize().graphicsLayer { alpha = 0.1f + 0.9f * (q?.value ?: 1f) }) { fields.forEach { dots(it) } }
            }
            // a shooting star: invisible for 86 % of a 9 s cycle, then one fast 260 dp streak down-left
            if (!still) {
                val q = t.loop(false, 9000)!!
                Canvas(Modifier.offset(w * 0.84f, top + 15.dp).size(110.dp, 2.dp).graphicsLayer {
                    val f = q.value; val d = 260.dp.toPx() * cl((f - 0.86f) / 0.1f)
                    alpha = when { f < 0.86f -> 0f; f < 0.88f -> (f - 0.86f) / 0.02f; f < 0.96f -> 1 - (f - 0.88f) / 0.08f; else -> 0f }
                    rotationZ = 155f; translationX = d * cos(155 * PI / 180).toFloat(); translationY = d * sin(155 * PI / 180).toFloat()
                }) { drawRoundRect(Brush.horizontalGradient(listOf(Color.Transparent, Color.White)), cornerRadius = CornerRadius(size.height / 2)) }
            }
        }
    }
}

private fun cl(v: Float) = v.coerceIn(0f, 1f)

