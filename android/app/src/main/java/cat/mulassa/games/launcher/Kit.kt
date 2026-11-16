package cat.mulassa.games.launcher

import android.graphics.BlurMaskFilter
import android.os.Build
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.text.BasicText
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.composed
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.TransformOrigin
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.clipRect
import androidx.compose.ui.graphics.drawscope.drawIntoCanvas
import androidx.compose.ui.graphics.nativeCanvas
import androidx.compose.ui.graphics.drawscope.scale
import androidx.compose.ui.graphics.drawscope.translate
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.graphics.vector.PathParser
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.TextUnit
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.em

// Text in points, as iOS's fixedSize fonts: the cartridges and buttons are drawn to measure, not to the system text size.
@Composable
fun Dp.fixed(): TextUnit = with(LocalDensity.current) { (value * density).toSp() }

@Composable
fun Label(text: String, family: FontFamily, size: Dp, color: Color, modifier: Modifier = Modifier, kern: Dp = 0.dp, center: Boolean = false) {
    val sp = size.fixed()
    BasicText(text, modifier, style = TextStyle(fontFamily = family, fontSize = sp, color = color, letterSpacing = (kern.value / size.value).em,
        textAlign = if (center) androidx.compose.ui.text.style.TextAlign.Center else androidx.compose.ui.text.style.TextAlign.Unspecified),
        maxLines = if (center) Int.MAX_VALUE else 1, softWrap = center, overflow = androidx.compose.ui.text.style.TextOverflow.Visible)
}

@Composable
private fun pressAnim(pressed: Boolean, target: Float, rest: Float) = animateFloatAsState(if (pressed) target else rest,
    if (pressed) tween(60) else spring(dampingRatio = 0.45f, stiffness = 247f), label = "squash")

// Pressed: it sinks onto its edge and squashes, then springs back (iOS's Squash).
fun Modifier.squash(depth: Dp = 3.dp, role: Role = Role.Button, enabled: Boolean = true, onClick: () -> Unit): Modifier = composed {

    val source = remember { MutableInteractionSource() }
    val pressed by source.collectIsPressedAsState()
    val sx by pressAnim(pressed, 1.04f, 1f)
    val sy by pressAnim(pressed, 0.93f, 1f)
    val dy by pressAnim(pressed, 1f, 0f)
    val d = with(LocalDensity.current) { depth.toPx() }
    graphicsLayer {
        scaleX = sx; scaleY = sy; translationY = dy * d
        transformOrigin = TransformOrigin(0.5f, 1f)
    }.clickable(source, null, enabled = enabled, role = role, onClick = onClick)
}

// A soft shadow under a path (Android draws blurred paths on the GPU from API 28; older phones get the hard edge only).
fun DrawScope.softShadow(path: Path, color: Color, radius: Float, dy: Float) {
    if (Build.VERSION.SDK_INT < 28 || radius <= 0f) return
    drawIntoCanvas { c ->
        val p = android.graphics.Paint(android.graphics.Paint.ANTI_ALIAS_FLAG).apply {
            this.color = color.toArgb()
            maskFilter = BlurMaskFilter(radius, BlurMaskFilter.Blur.NORMAL)
        }
        c.nativeCanvas.save()
        c.nativeCanvas.translate(0f, dy)
        c.nativeCanvas.drawPath(path.asAndroid(), p)
        c.nativeCanvas.restore()
    }
}

private fun Path.asAndroid(): android.graphics.Path = (this as androidx.compose.ui.graphics.AndroidPath).internalPath

fun roundRectPath(x: Float, y: Float, w: Float, h: Float, r: Float) = Path().apply {
    addRoundRect(androidx.compose.ui.geometry.RoundRect(x, y, x + w, y + h, CornerRadius(r)))
}

// the game's own surface: a smoked plaque with a cream outline and a hard drop edge
fun Modifier.plate(radius: Dp, dim: Boolean) = drawBehind {
    val r = radius.toPx(); val d = density
    softShadow(roundRectPath(0f, 0f, size.width, size.height, r), Color.Black.copy(alpha = 0.28f), 7 * d, 8 * d)
    drawRoundRect(Color.Black.copy(alpha = 0.5f), Offset(0f, 4 * d), size, CornerRadius(r))
    drawRoundRect(Palette.smoke, cornerRadius = CornerRadius(r))
    val w = 2 * d
    drawRoundRect(Palette.cream.copy(alpha = if (dim) 0.45f else 1f), Offset(d + w / 2, d + w / 2), Size(size.width - 2 * d - w, size.height - 2 * d - w),
        CornerRadius(r - d - w / 2), style = Stroke(w))
}

fun DrawScope.yellowBlock(radius: Float, origin: Offset = Offset.Zero, size: Size = this.size) {
    val d = density
    drawRoundRect(Palette.yellowLo, origin + Offset(0f, 3 * d), size, CornerRadius(radius))
    drawRoundRect(Brush.verticalGradient(listOf(Palette.yellowHi, Palette.yellow), origin.y, origin.y + size.height), origin, size, CornerRadius(radius))
    clipRect(origin.x, origin.y, origin.x + size.width, origin.y + 3 * d) { // the top shine
        drawRoundRect(Color.White.copy(alpha = 0.6f), origin + Offset(d, d), Size(size.width - 2 * d, size.height - 2 * d), CornerRadius(radius - d), style = Stroke(2 * d))
    }
}

// JUGA's face on a thick edge
fun DrawScope.chunkyFace(color: Color, radius: Float, depth: Float) {
    val d = density; val r = CornerRadius(radius)
    val edge = Path().apply { addRoundRect(androidx.compose.ui.geometry.RoundRect(0f, 0f, size.width, size.height, r)) }
    translate(top = depth + 2 * d) { softShadow(edge, Color.Black.copy(alpha = 0.38f), 9 * d, 10 * d) }
    drawRoundRect(Color.Black.copy(alpha = 0.35f), Offset(0f, depth + 2 * d), size, r)
    drawRoundRect(color.mix(Color.Black, 0.5f), Offset(0f, depth), size, r)
    drawRoundRect(Brush.verticalGradient(0f to color.mix(Color.White, 0.3f), 0.46f to color, 1f to color.mix(color.mix(Color.Black, 0.5f), 0.14f), endY = size.height), cornerRadius = r)
    drawRoundRect(Brush.verticalGradient(listOf(Color.White.copy(alpha = 0.5f), Color.White.copy(alpha = 0f)), 5 * d, 29 * d),
        Offset(8 * d, 5 * d), Size(size.width - 16 * d, 24 * d), CornerRadius(radius - 6 * d))
}

// the mock's heart, on 24×24
private val heart24 = PathParser().parsePathString("M12 20.5s-8-4.9-8-11A4.5 4.5 0 0 1 12 6.4a4.5 4.5 0 0 1 8 3.1c0 6.1-8 11-8 11z").toPath()

fun DrawScope.heart(fill: Color?, stroke: Color, width: Float, dash: FloatArray? = null) {
    val s = minOf(size.width, size.height) / 24
    translate((size.width - 24 * s) / 2, (size.height - 24 * s) / 2) {
        scale(s, Offset.Zero) {
            if (fill != null) drawPath(heart24, fill)
            drawPath(heart24, stroke, style = Stroke(width / s, join = androidx.compose.ui.graphics.StrokeJoin.Round,
                pathEffect = dash?.let { androidx.compose.ui.graphics.PathEffect.dashPathEffect(FloatArray(it.size) { k -> it[k] / s }) }))
        }
    }
}

// The favourite heart on the chamfered corner, 44 dp to touch.
@Composable
fun FavHeart(on: Boolean, size: Dp, modifier: Modifier = Modifier, toggle: () -> Unit) {
    Box(modifier.size(44.dp).squash(0.dp, Role.Checkbox, onClick = toggle), contentAlignment = Alignment.Center) {
        Box(Modifier.size(size).drawBehind {
            val r = this.size.minDimension / 2; val d = density
            drawCircle(Color.Black.copy(alpha = 0.4f), r, center + Offset(0f, 3 * d))
            drawCircle(Palette.cream, r)
            drawCircle(Palette.ink.copy(alpha = 0.55f), r - d, style = Stroke(2 * d))
        }) {
            Box(Modifier.size(size * 0.6f).align(Alignment.Center).padding(top = 1.dp).drawBehind {
                heart(if (on) Palette.red else null, if (on) hex("#7a1020") else hex("#8a6a52"), 2.2f * density)
            })
        }
    }
}

// ÚLTIM (cream) or NOU (pink), tilted on the cartridge's left edge.
@Composable
fun Tag(text: String, isNew: Boolean, modifier: Modifier = Modifier) {
    Box(modifier.graphicsLayer { rotationZ = -6f }.drawBehind {
        val d = density
        drawRoundRect(Color.Black.copy(alpha = 0.4f), Offset(0f, 2 * d), size, CornerRadius(6 * d))
        drawRoundRect(if (isNew) Palette.pink else Palette.cream, cornerRadius = CornerRadius(6 * d))
    }.padding(horizontal = 7.dp).height(20.dp), contentAlignment = Alignment.Center) {
        Label(text, Fonts.baloo, 10.dp, if (isNew) hex("#3d0f2a") else Palette.brown, kern = 0.6.dp)
    }
}
