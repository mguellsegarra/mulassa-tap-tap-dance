package cat.mulassa.games.launcher

import android.os.Build
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.navigationBars
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.RoundRect
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.BlurEffect
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.TileMode
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.clipPath
import androidx.compose.ui.graphics.drawscope.translate
import androidx.compose.ui.graphics.layer.GraphicsLayer
import androidx.compose.ui.graphics.layer.drawLayer
import androidx.compose.ui.graphics.rememberGraphicsLayer
import androidx.compose.ui.graphics.vector.PathParser
import androidx.compose.ui.layout.onGloballyPositioned
import androidx.compose.ui.layout.positionInRoot
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import cat.mulassa.games.R

val BAR_H = 64.dp
val BAR_GAP = 8.dp // above the navigation bar
private val BAR_W = 224.dp

// Ronda 18's floating tab bar, Android's take on iOS's Liquid Glass one: a pill of the sky's sheet colour over the page,
// which shows through it blurred on API 31+ (the page's recorded layer, drawn again under the pill's clip with a blur; a
// layer reference, so the page is not drawn twice per frame) and through a plainer, more opaque tint before.
@Composable
fun BoxScope.TabBar(tab: Tab, sky: Sky, backdrop: GraphicsLayer, go: (Tab) -> Unit) {
    val blur = if (Build.VERSION.SDK_INT >= 31) rememberGraphicsLayer() else null
    var at by remember { mutableStateOf(Offset.Zero) }
    Row(Modifier.align(Alignment.BottomCenter).windowInsetsPadding(WindowInsets.navigationBars).padding(bottom = BAR_GAP)
        .size(BAR_W, BAR_H).onGloballyPositioned { at = it.positionInRoot() }
        .drawBehind {
            val r = size.height / 2
            val pill = Path().apply { addRoundRect(RoundRect(0f, 0f, size.width, size.height, CornerRadius(r))) }
            softShadow(pill, Color.Black.copy(alpha = 0.35f), 14 * density, 4 * density)
            clipPath(pill) {
                if (blur != null) {
                    blur.renderEffect = BlurEffect(18 * density, 18 * density, TileMode.Clamp)
                    blur.record { translate(-at.x, -at.y) { drawLayer(backdrop) } }
                    drawLayer(blur)
                }
                drawRect(sky.sheet.copy(alpha = if (blur != null) 0.62f else 0.9f))
            }
            val w = density
            drawRoundRect(Palette.cream.copy(alpha = 0.22f), Offset(w / 2, w / 2), Size(size.width - w, size.height - w), CornerRadius(r - w / 2), style = Stroke(w))
        }.padding(6.dp), horizontalArrangement = Arrangement.spacedBy(4.dp)) {
        Item(GAMEPAD, stringResource(R.string.launcher_tab_games), tab == Tab.Games) { go(Tab.Games) }
        Item(PERSON, stringResource(R.string.html_accountTitle), tab == Tab.Profile) { go(Tab.Profile) }
    }
}

@Composable
private fun androidx.compose.foundation.layout.RowScope.Item(icon: Path, label: String, on: Boolean, onClick: () -> Unit) {
    val ink = if (on) Palette.yellow else Palette.cream.copy(alpha = 0.75f)
    Box(Modifier.weight(1f).fillMaxHeight().semantics { selected = on; contentDescription = label }
        .squash(1.dp, Role.Tab) { if (!on) onClick() }
        .drawBehind { if (on) drawRoundRect(Palette.cream.copy(alpha = 0.14f), cornerRadius = CornerRadius(size.height / 2)) }) {
        Column(Modifier.align(Alignment.Center), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(1.dp)) {
            Box(Modifier.size(24.dp).drawBehind { icon24(icon, ink, 2.2f) })
            Label(label, Fonts.baloo, 13.dp, ink)
        }
    }
}

private fun svg(d: String) = PathParser().parsePathString(d).toPath()
private val GAMEPAD = svg("M7 7.5h10a5 5 0 0 1 4.9 6l-.5 2.6a2.6 2.6 0 0 1-4.5 1.2L15 15h-6l-1.9 2.3a2.6 2.6 0 0 1-4.5-1.2l-.5-2.6A5 5 0 0 1 7 7.5zM7.5 10.5v3M6 12h3M15.5 11h.01M17.5 13h.01")
private val PERSON = svg("M3 12a9 9 0 1 0 18 0a9 9 0 1 0 -18 0M9 10a3 3 0 1 0 6 0a3 3 0 1 0 -6 0M6.2 18.6a6.5 6.5 0 0 1 11.6 0")
