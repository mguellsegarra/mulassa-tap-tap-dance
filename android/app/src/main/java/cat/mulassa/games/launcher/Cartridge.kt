package cat.mulassa.games.launcher

import android.graphics.Typeface
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicText
import androidx.compose.foundation.text.TextAutoSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.BiasAlignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.CompositingStrategy
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.asComposePath
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.draw.drawWithCache
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.scale
import androidx.compose.ui.graphics.drawscope.translate
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.vector.PathParser
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.TextMeasurer
import androidx.compose.ui.res.imageResource
import androidx.compose.ui.graphics.ColorFilter
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.IntSize
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.drawText
import androidx.compose.ui.text.rememberTextMeasurer
import androidx.compose.ui.unit.sp
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.core.content.res.ResourcesCompat
import cat.mulassa.games.R

// Cartridge C4 (ronda-10's cart()): a body keyed by one cut corner, an engraved grip on top, a cream label with the art and the short
// name, a socket whose ten pins run out to the face's bottom edge. Drawn in u, a tenth of the face (10.32u × 12.42u); the
// side is the same outline 0.34u lower and dark. Everything is centred on x = 5.16, the face's middle.
// square corners with a small bevel, one big cut at the bottom (ronda 30, the owner): it goes in only one way round
private val SHAPE = PathParser().parsePathString("M.16 .25L.41 0H9.91L10.16 .25V10.95L9.06 12.05H.41L.16 11.8Z").toPath()
const val CART_W = 10.32f
const val CART_H = 12.42f

// The art window and the name, in u, as the label's rect in the prototype.
private const val ART_X = 1.21f; private const val ART_Y = 2.35f; private const val ART_W = 7.9f; private const val ART_H = 5.35f

class Planes(val back: ImageBitmap, val front: ImageBitmap)

@Composable
// `lean` (the grid: Motion.kt's Tilt, read in layer and draw blocks only) slides the art behind the label's window and
// moves the varnish's light; without it both rest.
fun Cartridge(color: Color, name: String, image: ImageBitmap?, u: Dp, locked: Boolean, number: Int? = null, planes: Planes? = null, lean: (() -> Offset)? = null) {
    // The shell is one offscreen layer: a scroll, a turn or a lean only moves it. The art and the varnish are layers of
    // their own over it, so a sensor sample moves them and redraws the varnish's one gradient, never the shell (the
    // review of ronda 37 found the whole cartridge re-rasterised 50 times a second).
    Box(Modifier.size(u * CART_W, u * CART_H)) {
        val measure = rememberTextMeasurer()
        Canvas(Modifier.size(u * CART_W, u * CART_H).graphicsLayer { compositingStrategy = CompositingStrategy.Offscreen }) { scale(u.toPx(), Offset.Zero) { body(color, locked, maxOf(0.06f, 1f / u.toPx())) }; if (number != null) engraved(color, "#%02d".format(number), measure, u.toPx()) }
        // The label's window (ronda 37, Astra's recipe): over the art, the cavity's shade along the top and left (built once)
        val art = Modifier.offset(u * ART_X, u * ART_Y).size(u * ART_W, u * ART_H).clip(RoundedCornerShape(u * 0.3f)).drawWithCache {
            val k = u.toPx()
            val top = Brush.verticalGradient(0f to Color.Black.copy(alpha = 0.3f), 1f to Color.Transparent, endY = 0.5f * k)
            val left = Brush.horizontalGradient(0f to Color.Black.copy(alpha = 0.2f), 1f to Color.Transparent, endX = 0.4f * k)
            onDrawWithContent { drawContent(); drawRect(top, size = Size(size.width, 0.5f * k)); drawRect(left, size = Size(0.4f * k, size.height)) }
        }
        // the glass's light, in its own layer: a narrow diagonal band that crosses the window as the phone leans, and is
        // not there at rest (ronda 39: the veil that stayed on the art is gone)
        val glint = Modifier.offset(u * ART_X, u * ART_Y).size(u * ART_W, u * ART_H).clip(RoundedCornerShape(u * 0.3f)).graphicsLayer {}.drawBehind {
            val v = lean?.invoke() ?: Offset.Zero; val a = (if (locked) 0.075f else 0.155f) * minOf(1f, v.getDistance() * 1.6f)
            if (a < 0.004f) return@drawBehind
            val at = 0.5f + 0.36f * v.x + 0.24f * v.y; val light = hex("#fff8e6")
            drawRect(Brush.linearGradient((at - 0.28f).coerceIn(0f, 1f) to Color.Transparent, at.coerceIn(0f, 1f) to light.copy(alpha = a), (at + 0.28f).coerceIn(0f, 1f) to Color.Transparent,
                start = Offset(0f, size.height * 0.2f), end = Offset(size.width, size.height * 0.8f)))
        }
        Box(art.background(color)) {
            // object-position 50% 22%: the art's subject sits high
            // Ronda 39 (Carbon's recipe): the cartridge never turns; what is behind the glass moves with the lean, every
            // plane the way the eye would see it and more the further back: the backdrop most, the figure a little the
            // other way, 8.7 dp apart on a 172 dp cartridge; a flat cover slides as a backdrop, its lock as a figure
            if (planes != null) {
                Image(planes.back, null, Modifier.matchParentSize().graphicsLayer {
                    val v = lean?.invoke() ?: Offset.Zero
                    scaleX = 1.16f; scaleY = 1.16f; translationX = v.x * 0.34f * u.toPx(); translationY = v.y * 0.22f * u.toPx()
                }, contentScale = ContentScale.Crop, alignment = BiasAlignment(0f, -0.56f))
                Image(planes.front, null, Modifier.matchParentSize().graphicsLayer {
                    val v = lean?.invoke() ?: Offset.Zero
                    // 5 % bigger: a figure cut by its picture's edge never shows that edge as it slides
                    scaleX = 1.05f; scaleY = 1.05f; translationX = -v.x * 0.18f * u.toPx(); translationY = -v.y * 0.11f * u.toPx()
                }, contentScale = ContentScale.Crop, alignment = BiasAlignment(0f, -0.56f))
            }
            // 16 % bigger than its window, so it can slide under the frame without showing an edge
            else if (image != null) Image(image, null, Modifier.matchParentSize().graphicsLayer {
                val v = lean?.invoke() ?: Offset.Zero
                scaleX = 1.16f; scaleY = 1.16f; translationX = v.x * 0.34f * u.toPx(); translationY = v.y * 0.22f * u.toPx()
            }, contentScale = ContentScale.Crop, alignment = BiasAlignment(0f, -0.56f))
            if (locked) Box(Modifier.matchParentSize().background(hex("#1c110a").copy(alpha = 0.5f)), contentAlignment = Alignment.Center) {
                Box(Modifier.size(u * 2.2f).graphicsLayer {
                    val v = lean?.invoke() ?: Offset.Zero; translationX = -v.x * 0.18f * u.toPx(); translationY = -v.y * 0.11f * u.toPx()
                }.drawBehind { lock() })
            }
        }
        Box(glint)
        val px = with(LocalDensity.current) { (u * 1.15f).toSp() } // one size for every name in a row (ronda 39)
        Box(Modifier.offset(u * ART_X, u * 7.92f).size(u * ART_W, u * 1.73f), contentAlignment = Alignment.Center) {
            // the name always fits its label: a long one shrinks rather than gets cut
            BasicText(name, style = TextStyle(fontFamily = Fonts.baloo, color = Palette.ink.copy(alpha = if (locked) 0.56f else 1f), // Baloo everywhere: the owner dropped the pixel face
                 textAlign = TextAlign.Center),
                maxLines = 1, autoSize = TextAutoSize.StepBased(minFontSize = px * 0.75f, maxFontSize = px, stepSize = px * 0.02f))
        }
    }
}

// The back, seen half-way through Picked's turn (ronda 30): the same shell, its cut corner on the other side, with an
// engraved frame and the Mulassa's head in its round badge (ronda 33, the owner's B3-cap-final), tone on tone (a darker
// inset over a lighter line 1 px lower). Drawn reading left to
// right; Picked flips it back, since the turn mirrors whatever is behind the face.
@Composable
fun CartridgeBack(color: Color, u: Dp) {
    val badge = ImageBitmap.imageResource(R.drawable.mulassa_badge) // a mask: its ink takes each colour
    // its own offscreen layer, like the face's: drawn once, then only moved
    Canvas(Modifier.size(u * CART_W, u * CART_H).graphicsLayer { compositingStrategy = CompositingStrategy.Offscreen }) {
        val k = u.toPx()
        val dark = color.mix(hex("#1d100a"), 0.62f); val ink = color.mix(hex("#1d100a"), 0.55f); val lit = color.mix(Color.White, 0.45f)
        scale(k, Offset.Zero) {
            // the cut corner seen from behind: the outline mirrored
            scale(-1f, 1f, Offset(CART_W / 2, 0f)) {
                translate(top = 0.34f) { drawPath(SHAPE, dark) }
                drawPath(SHAPE, Brush.verticalGradient(0f to color.mix(Color.White, 0.1f), 1f to color.mix(hex("#251008"), 0.18f), startY = 0f, endY = 12.05f))
            }
            drawRoundRect(lit, Offset(1.4f, 2.2f + 1 / k), Size(7.52f, 7.6f), CornerRadius(0.5f), style = Stroke(0.12f))
            drawRoundRect(ink, Offset(1.4f, 2.2f), Size(7.52f, 7.6f), CornerRadius(0.5f), style = Stroke(0.12f))
        }
        val side = (6 * k).toInt(); val at = IntOffset(((CART_W / 2 - 3) * k).toInt(), ((6.0f - 3) * k).toInt())
        drawImage(badge, dstOffset = at + IntOffset(0, 1), dstSize = IntSize(side, side), colorFilter = ColorFilter.tint(lit))
        drawImage(badge, dstOffset = at, dstSize = IntSize(side, side), colorFilter = ColorFilter.tint(ink))
    }
}

// A game to come wears its colour calmed towards a satin amber, so the ones that can be played lead the grid (ronda 39).
fun calm(c: Color) = c.mix(hex("#d8bf8f"), 0.42f)
val Game.shell: Color get() = if (soon) calm(tint) else tint

private fun DrawScope.body(c: Color, locked: Boolean, line: Float) {
    val dark = c.mix(hex("#1d100a"), 0.62f); val shadow = c.mix(hex("#1d100a"), 0.34f); val light = c.mix(Palette.cream, 0.55f)
    fun rect(x: Float, y: Float, w: Float, h: Float, r: Float, fill: Color) = drawRoundRect(fill, Offset(x, y), Size(w, h), CornerRadius(r))
    translate(top = 0.34f) { drawPath(SHAPE, dark) }
    drawPath(SHAPE, Brush.verticalGradient(0f to c.mix(Color.White, 0.18f), 0.52f to c, 1f to c.mix(hex("#251008"), 0.12f), startY = 0f, endY = 12.05f))
    // its own contour (ronda 39): over a sky nothing casts a shadow, so a warm line 1 px wide sets it off at every hour
    drawPath(SHAPE, c.mix(hex("#2a1a10"), 0.48f), style = Stroke(line))
    // volume (ronda 36): the light catches the top and left edges of the moulded shell, the right one falls in shade
    rect(0.5f, 0.07f, 9.32f, 0.09f, 0.045f, c.mix(Color.White, 0.55f)); rect(0.23f, 0.34f, 0.09f, 11.4f, 0.045f, c.mix(Color.White, 0.38f))
    rect(10.0f, 0.34f, 0.09f, 10.5f, 0.045f, c.mix(hex("#1d100a"), 0.22f))
    // the grip (ronda 28, the owner): three ridges a side round a recessed pill, the cartridge's number engraved in it
    for (y in floatArrayOf(0.6f, 0.96f, 1.32f)) for (x in floatArrayOf(1.12f, 6.86f)) { rect(x, y, 2.34f, 0.14f, 0.07f, shadow); rect(x, y + 0.14f, 2.34f, 0.07f, 0.035f, light) }
    translate(top = 0.06f) { rect(3.86f, 0.4f, 2.6f, 1.2f, 0.6f, light) }; rect(3.86f, 0.4f, 2.6f, 1.2f, 0.6f, c.mix(hex("#1d100a"), 0.12f))
    rect(0.78f, 1.93f, 8.76f, 8.12f, 0.42f, dark); rect(0.89f, 2.04f, 8.54f, 7.9f, 0.33f, Palette.cream)
    val socket = hex("#38271b")
    rect(1.96f, 10.78f, 6.4f, 1.27f, 0.2f, socket); rect(1.96f, 11.6f, 6.4f, 0.45f, 0f, socket)
    val pin = hex(if (locked) "#c9a35c" else "#efbf59")
    for (k in 0 until 10) rect(5.16f - (9 * 0.61f + 0.33f) / 2 + k * 0.61f, 10.98f, 0.33f, 1.07f, 0f, pin)
}

// «#01» in the grip's pill, as iOS: the shell's light 1 px lower, then the darker cut on top
private fun DrawScope.engraved(c: Color, text: String, measure: TextMeasurer, k: Float) {
    val t = measure.measure(text, TextStyle(fontFamily = Fonts.baloo, fontSize = (0.86f * k / density / fontScale).sp))
    val at = Offset((CART_W * k - t.size.width) / 2, 1.0f * k - t.size.height / 2)
    drawText(t, c.mix(Palette.cream, 0.55f), at + Offset(0f, 1f)); drawText(t, c.mix(hex("#1d100a"), 0.34f), at)
}

private val PLUS = PathParser().parsePathString("M12 5v14M5 12h14").toPath()
private val SHACKLE = PathParser().parsePathString("M8 10.5V8a4 4 0 0 1 8 0v2.5").toPath()

private fun DrawScope.lock() {
    val s = size.minDimension / 24
    scale(s, Offset.Zero) {
        drawRoundRect(Palette.cream, Offset(5f, 10.5f), Size(14f, 10f), CornerRadius(2.5f))
        drawPath(SHACKLE, Palette.cream, style = Stroke(2.4f))
    }
}

// A 24×24 line icon, stroked with round ends, filling this draw area.
fun DrawScope.icon24(path: Path, color: Color, width: Float) {
    val s = size.minDimension / 24
    translate((size.width - 24 * s) / 2, (size.height - 24 * s) / 2) {
        scale(s, Offset.Zero) { drawPath(path, color, style = Stroke(width, cap = androidx.compose.ui.graphics.StrokeCap.Round, join = StrokeJoin.Round)) }
    }
}

// The Mulassa lockup, ronda-10's #logo (2.0.0's, deaadc4b) without its GAMES line (the owner, 27 Nov 2026): MULASSA in
// Baloo 2 800 at 77, letter-spacing -5.5, stretched to 300; a thin dark #2a1a10 line, the #d8bf8f extrusion 4 below, red
// #e8382f on a cream outline. The SVG's viewBox, cut to the word, is 0 2 308.6 72, at the 48/110 scale the lockup had.
// Glyph outlines, so the strokes are real strokes.
@Composable
fun Logo(modifier: Modifier = Modifier) {
    val ctx = LocalContext.current
    val baloo = remember { ResourcesCompat.getFont(ctx, R.font.baloo_extrabold) }
    Canvas(modifier.size(48.dp * 308.6f / 110, 48.dp * 72 / 110).graphicsLayer { compositingStrategy = CompositingStrategy.Offscreen }
        .semantics { contentDescription = "Mulassa" }) {
        val s = size.height / 72
        val mulassa = glyphs("MULASSA", baloo, 77 * s, -5.5f * s, 300 * s, 154.3f * s)
        fun line(p: Path, y: Float, edge: Color, width: Float, fill: Color) = translate(top = (y - 2) * s) {
            drawPath(p, edge, style = Stroke(width, join = StrokeJoin.Round)); drawPath(p, fill)
        }
        val ink = hex("#2a1a10"); val ext = hex("#d8bf8f")
        line(mulassa, 64f, ink, 15 * s, ink); line(mulassa, 60f, ink, 15 * s, ink)
        line(mulassa, 64f, ext, 11 * s, ext)
        line(mulassa, 60f, Palette.cream, 11 * s, hex("#e8382f"))
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
