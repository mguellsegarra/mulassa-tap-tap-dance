package cat.mulassa.games.launcher

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.text.BasicText
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.composed
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.TransformOrigin
import androidx.compose.ui.graphics.graphicsLayer
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
