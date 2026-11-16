package cat.mulassa.games.launcher

import android.graphics.Typeface
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.wrapContentHeight
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Rect
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.ColorFilter
import androidx.compose.ui.graphics.ColorMatrix
import androidx.compose.ui.graphics.CompositingStrategy
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.asComposePath
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.translate
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.layout.layout
import androidx.compose.ui.unit.Constraints
import kotlin.math.roundToInt
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.core.content.res.ResourcesCompat
import cat.mulassa.games.R

// The cartridge (round 8's J1): a chamfered top-right corner, a notch, grip ridges, a cream label with the game's art and
// short name, gold contacts and a darker copy behind for thickness. Sized by u, a tenth of its width (10u × 12u).
fun cartridgePath(x: Float, y: Float, u: Float): Path {
    val w = 10 * u; val h = 12 * u
    val pts = listOf(0f to 0.6f * u, 0.6f * u to 0f, 3.3f * u to 0f, 3.3f * u to 0.42f * u, 6.2f * u to 0.42f * u, 6.2f * u to 0f,
        w - 1.7f * u to 0f, w to 1.7f * u, w to h - 0.7f * u, w - 0.7f * u to h, 0.7f * u to h, 0f to h - 0.7f * u)
    return Path().apply {
        pts.forEachIndexed { i, (px, py) -> if (i == 0) moveTo(x + px, y + py) else lineTo(x + px, y + py) }
        close()
    }
}

private fun saturation(s: Float) = ColorFilter.colorMatrix(ColorMatrix().apply { setToSaturation(s) })

// The body, art and name drawn once into their own offscreen layer: a ring move or a scroll only moves that bitmap.
// A game not out yet is drawn desaturated (iOS: saturation 0.6 on the whole, 0.4 more on the art).
@Composable
fun Cartridge(game: Game, image: ImageBitmap?, u: Dp, modifier: Modifier = Modifier) {
    val c0 = game.tint
    val c = if (game.soon) c0.desaturate(0.6f) else c0
    // the layer is wider and taller than the 10u × 12u slot: the thickness and the shadow spill past it, unclipped
    Box(modifier.size(u * 10, u * 12).layout { m, c ->
        val p = m.measure(Constraints.fixed((11.4f * u.toPx()).roundToInt(), (13.5f * u.toPx()).roundToInt()))
        layout(c.maxWidth, c.maxHeight) { p.place(0, 0) }
    }.graphicsLayer { compositingStrategy = CompositingStrategy.Offscreen }) {
        Canvas(Modifier.size(u * 10.4f, u * 12.5f)) { body(c, u.toPx()) }
        Column(
            Modifier.offset(u * 0.75f, u * 2.05f).size(u * 8.5f, u * 7.9f)
                .background(Palette.cream, RoundedCornerShape(u * 0.5f)).padding(u * 0.3f),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Box(Modifier.fillMaxWidth().weight(1f).clip(RoundedCornerShape(u * 0.3f)).background(c)) {
                if (image != null) Image(image, null, Modifier.matchParentSize(), contentScale = ContentScale.Crop,
                    colorFilter = if (game.soon) saturation(0.24f) else null)
            }
            Box(Modifier.padding(top = u * 0.22f).height(u * 1.12f), contentAlignment = Alignment.Center) {
                Label(game.label, Fonts.pixel, u * 1.55f, Palette.ink, Modifier.wrapContentHeight(unbounded = true))
            }
        }
    }
}

private fun Color.desaturate(s: Float): Color {
    val l = 0.2126f * red + 0.7152f * green + 0.0722f * blue
    return Color(l + (red - l) * s, l + (green - l) * s, l + (blue - l) * s)
}

private fun DrawScope.body(c: Color, u: Float) {
    softShadow(cartridgePath(0.32f * u, 0.42f * u, u), Color.Black.copy(alpha = 0.4f), 0.3f * u, 0.45f * u)
    drawPath(cartridgePath(0.32f * u, 0.42f * u, u), c.mix(Color.Black, 0.58f))
    drawPath(cartridgePath(0f, 0f, u), Brush.verticalGradient(0f to c.mix(Color.White, 0.3f), 0.1f to c, 0.72f to c, 1f to c.mix(Color.Black, 0.18f), endY = 12 * u))
    for (k in 0 until 3) { // grip ridges under the notch
        val y = 0.85f * u + k * 0.28f * u
        drawRect(c.mix(Color.Black, 0.45f), Offset(1.1f * u, y), Size(6.6f * u, 0.14f * u))
        drawRect(c.mix(Color.White, 0.4f), Offset(1.1f * u, y + 0.14f * u), Size(6.6f * u, 0.14f * u))
    }
    // the label's dark rim
    drawRoundRect(c.mix(Color.Black, 0.5f), Offset(0.59f * u, 1.89f * u), Size(8.82f * u, 8.22f * u), CornerRadius(0.66f * u))
    // gold contacts along the bottom edge
    drawRoundRect(Palette.ink, Offset(1.6f * u, 10.5f * u), Size(6.8f * u, u), CornerRadius(0.25f * u))
    var x = 1.82f * u
    while (x + 0.34f * u <= 8.3f * u) {
        drawRect(hex("#f2c75a"), Offset(x, 10.7f * u), Size(0.34f * u, 0.8f * u))
        drawRect(hex("#a8761e"), Offset(x + 0.34f * u, 10.7f * u), Size(0.08f * u, 0.8f * u))
        x += 0.62f * u
    }
}

// The Mulassa Games lockup (round 8's kit.js logo at 128 dp): MULASSA in Jersey 10 stretched to its width, red on a cream
// stroke over a dark red copy, GAMES in Baloo under it. Glyph outlines, so the strokes are real strokes.
@Composable
fun Logo(modifier: Modifier = Modifier) {
    val ctx = LocalContext.current
    val faces = remember { ResourcesCompat.getFont(ctx, R.font.jersey) to ResourcesCompat.getFont(ctx, R.font.baloo_extrabold) }
    Canvas(modifier.size(128.dp, 44.7.dp).graphicsLayer { compositingStrategy = CompositingStrategy.Offscreen }
        .semantics { contentDescription = "Mulassa Games" }) {
        val s = 128.dp.toPx() / 320.6f
        val mulassa = glyphs("MULASSA", faces.first, 100 * s, 0f, 300 * s, 160.3f * s)
        val games = glyphs("GAMES", faces.second, 34 * s, 7 * s, null, 160.3f * s)
        fun line(p: Path, y: Float, edge: Color, width: Float, fill: Color) = translate(top = y) {
            drawPath(p, edge, style = Stroke(width, join = StrokeJoin.Round)); drawPath(p, fill)
        }
        // the lockup's drop shadow
        translate(top = 3 * density) {
            translate(top = 74.6f * s) { softShadow(mulassa, Color.Black.copy(alpha = 0.45f), 3 * density, 0f) }
            translate(top = 106 * s) { softShadow(games, Color.Black.copy(alpha = 0.45f), 3 * density, 0f) }
        }
        line(mulassa, 74.6f * s, hex("#5e1514"), 12 * s, hex("#5e1514"))
        line(mulassa, 68.6f * s, Palette.cream, 12 * s, hex("#c0283c"))
        line(games, 106 * s, hex("#3a1608"), 7 * s, Palette.yellow)
    }
}

// The text's outline on its baseline at y 0, stretched to `width` (the SVG's textLength) and centred on centreX.
private fun glyphs(text: String, face: Typeface?, size: Float, kern: Float, width: Float?, centreX: Float): Path {
    val paint = android.graphics.Paint().apply { typeface = face; textSize = size; letterSpacing = kern / size }
    val out = android.graphics.Path()
    paint.getTextPath(text, 0, text.length, 0f, 0f, out)
    val b = android.graphics.RectF().also { out.computeBounds(it, true) }
    val natural = b.right - kern
    val m = android.graphics.Matrix().apply {
        setScale((width ?: natural) / natural, 1f)
        postTranslate(centreX - (width ?: natural) / 2, 0f)
    }
    out.transform(m)
    return out.asComposePath()
}

// The Jocs tab's console.
fun DrawScope.gameboy() {
    val s = size.width / 40; val edge = hex("#06304a")
    fun r(x: Float, y: Float, w: Float, h: Float) = Rect(Offset(x * s, y * s), Size(w * s, h * s))
    fun rr(rect: Rect, rad: Float, color: Color, stroke: Float? = null) =
        drawRoundRect(color, rect.topLeft, rect.size, CornerRadius(rad * s), style = stroke?.let { Stroke(it * s) } ?: androidx.compose.ui.graphics.drawscope.Fill)
    translate(top = 2 * density) { rr(r(8f, 4f, 24f, 32f), 4f, Color.Black.copy(alpha = 0.4f)) }
    rr(r(8f, 4f, 24f, 32f), 4f, hex("#3ec6ff")); rr(r(8f, 4f, 24f, 32f), 4f, edge, 2.6f)
    rr(r(12f, 8.5f, 16f, 14f), 2f, Palette.cream); rr(r(12f, 8.5f, 16f, 14f), 2f, edge, 2f)
    drawPath(Path().apply {
        moveTo(15 * s, 19 * s); lineTo(18.5f * s, 13 * s); lineTo(21.5f * s, 17 * s); lineTo(23.5f * s, 14.5f * s); lineTo(26 * s, 19 * s); close()
    }, Palette.pink)
    drawLine(edge, Offset(13 * s, 29.5f * s), Offset(16 * s, 29.5f * s), 2.2f * s, StrokeCap.Round)
    drawLine(edge, Offset(14.5f * s, 28 * s), Offset(14.5f * s, 31 * s), 2.2f * s, StrokeCap.Round)
    drawCircle(Palette.yellow, 2 * s, Offset(25 * s, 29.5f * s))
    drawCircle(edge, 2 * s, Offset(25 * s, 29.5f * s), style = Stroke(1.6f * s))
}

// Perfil's settings gear (iOS draws SF Symbols' gearshape): 8 teeth round a ring.
fun DrawScope.gear(color: Color) {
    val c = center; val ro = size.minDimension * 0.46f; val ri = size.minDimension * 0.34f; val w = size.minDimension * 0.09f
    val teeth = Path().apply {
        for (k in 0 until 8) {
            val a0 = Math.toRadians(k * 45.0 - 11); val a1 = Math.toRadians(k * 45.0 + 11)
            val pts = listOf(ri to a0 - 0.12, ro to a0, ro to a1, ri to a1 + 0.12)
            pts.forEachIndexed { i, (r, a) ->
                val x = c.x + r * Math.cos(a).toFloat(); val y = c.y + r * Math.sin(a).toFloat()
                if (i == 0) moveTo(x, y) else lineTo(x, y)
            }
            close()
        }
    }
    drawPath(teeth, color, style = Stroke(w, join = StrokeJoin.Round))
    drawPath(teeth, color)
    drawCircle(color, ri - w / 2, c, style = Stroke(w * 1.6f))
    drawCircle(color, size.minDimension * 0.13f, c, style = Stroke(w))
}
