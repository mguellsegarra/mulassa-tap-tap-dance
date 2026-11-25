package cat.mulassa.games.launcher

import androidx.compose.runtime.Composable
import androidx.compose.runtime.Immutable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.scale
import java.util.Calendar
import kotlinx.coroutines.delay

// The sky by the device's hour (ronda-10's SKY and sky()): dawn, morning, midday, afternoon and sunset, night. Keyframes
// blended in RGB into a 3-stop gradient, with stars and clouds as static layers that only change opacity. Recomputed
// every 5 minutes; nothing animates in between.
@Immutable
data class Sky(val top: Color, val mid: Color, val bottom: Color, val stars: Float, val clouds: Float) {
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
    return Sky(x.top.mix(y.top, t), x.mid.mix(y.mid, t), x.bottom.mix(y.bottom, t), x.stars + (y.stars - x.stars) * t, x.clouds + (y.clouds - x.clouds) * t)
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

// The gradient, then the stars (three tiled dot grids) and the clouds (four soft ellipses), as the prototype's CSS layers.
fun Modifier.sky(sky: () -> Sky) = drawBehind {
    val s = sky(); val d = density
    drawRect(Brush.verticalGradient(0f to s.top, 0.55f to s.mid, 1f to s.bottom))
    if (s.stars > 0.01f) for ((tile, at, r, a) in STARS) {
        val tw = tile.x * d; val th = tile.y * d
        var y = 0f
        while (y < size.height) {
            var x = 0f
            while (x < size.width) { drawCircle(Color.White.copy(alpha = a * s.stars), r * d, Offset(x + at.x * tw, y + at.y * th)); x += tw }
            y += th
        }
    }
    if (s.clouds > 0.01f) for ((rx, ry, cx, cy, a) in CLOUDS) {
        val c = Offset(cx * size.width, cy * size.height); val r = rx * size.width
        scale(1f, ry * size.height / r, c) {
            drawCircle(Brush.radialGradient(0f to Color.White.copy(alpha = a * s.clouds), 0.7f to Color.Transparent, center = c, radius = r), r, c)
        }
    }
}

private data class Stars(val tile: Offset, val at: Offset, val r: Float, val a: Float)
private val STARS = listOf(
    Stars(Offset(97f, 89f), Offset(0.2f, 0.3f), 0.6f, 1f),
    Stars(Offset(131f, 113f), Offset(0.7f, 0.6f), 0.5f, 1f),
    Stars(Offset(173f, 157f), Offset(0.4f, 0.8f), 0.8f, 0.53f),
)
private data class Cloud(val rx: Float, val ry: Float, val cx: Float, val cy: Float, val a: Float)
private val CLOUDS = listOf(
    Cloud(0.6f, 0.09f, 0.18f, 0.22f, 0.6f), Cloud(0.48f, 0.07f, 0.82f, 0.38f, 0.53f),
    Cloud(0.7f, 0.1f, 0.4f, 0.64f, 0.4f), Cloud(0.55f, 0.08f, 0.88f, 0.84f, 0.33f),
)
