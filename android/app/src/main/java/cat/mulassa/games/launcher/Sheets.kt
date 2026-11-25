package cat.mulassa.games.launcher

import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.activity.compose.BackHandler
import androidx.compose.animation.core.CubicBezierEasing
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.asPaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.navigationBars
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.geometry.translate
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Outline
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.PathOperation
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.vector.PathParser
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import cat.mulassa.games.R

enum class Sheet { Profile, Settings }

// TODO(store): the Play listing is derived from the package; confirm it once the app is published.
private const val STORE_URL = "https://play.google.com/store/apps/details?id=cat.mulassa.games"

// The two places the header opens (ronda-10's sheets): a bottom sheet over a scrim. Perfil's gear opens Ajustos and
// Ajustos' arrow goes back to Perfil; the system back does the same, then closes.
@Composable
fun Sheets(model: Launcher, version: String, sky: Sky, open: Sheet?, go: (Sheet?) -> Unit) {
    BackHandler(open != null) { go(if (open == Sheet.Settings) Sheet.Profile else null) }
    val scrim by animateFloatAsState(if (open != null) 1f else 0f, tween(250), label = "scrim")
    BoxWithConstraints(Modifier.fillMaxSize()) {
        if (scrim > 0f) Box(Modifier.fillMaxSize().graphicsLayer { alpha = scrim }.drawBehind { drawRect(hex("#0a0603").copy(alpha = 0.6f)) }
            .then(if (open != null) Modifier.clickable(remember { MutableInteractionSource() }, null) { go(null) } else Modifier))
        val maxH = maxHeight - WindowInsets.statusBars.asPaddingValues().calculateTopPadding() - 16.dp
        for (s in Sheet.entries) {
            val p by animateFloatAsState(if (open == s) 1f else 0f, tween(450, easing = Slide), label = "sheet")
            if (p > 0f) SheetBox(sky.sheet, maxH, Modifier.align(Alignment.BottomCenter).graphicsLayer { translationY = (1 - p) * size.height * 1.05f }) {
                when (s) {
                    Sheet.Profile -> Profile(go)
                    Sheet.Settings -> Settings(model, version, go)
                }
            }
        }
    }
}

private val Slide = CubicBezierEasing(0.2f, 0.9f, 0.3f, 1f)
private val sheetShape = RoundedCornerShape(topStart = 28.dp, topEnd = 28.dp)

@Composable
private fun SheetBox(bg: Color, maxH: Dp, modifier: Modifier, content: @Composable () -> Unit) {
    Column(modifier.fillMaxWidth().heightIn(max = maxH)
        .clickable(remember { MutableInteractionSource() }, null) {} // taps on the sheet stay on it
        .drawBehind {
            val shape = (sheetShape.createOutline(size, layoutDirection, this) as Outline.Rounded).roundRect
            val path = Path().apply { addRoundRect(shape) }
            softShadow(path, Color.Black.copy(alpha = 0.4f), 12 * density, -8 * density)
            drawPath(path, bg)
            // the inset top light: the shape minus itself 2 dp lower
            val lower = Path().apply { addRoundRect(shape.translate(Offset(0f, 2 * density))) }
            drawPath(Path.combine(PathOperation.Difference, path, lower), Palette.cream.copy(alpha = 0.5f))
        }) { content() }
}

@Composable
private fun SheetHeader(title: String, left: @Composable () -> Unit, go: (Sheet?) -> Unit) {
    Box(Modifier.fillMaxWidth().padding(start = M, end = M, top = 12.dp).height(44.dp)) {
        Box(Modifier.align(Alignment.CenterStart)) { left() }
        Box(Modifier.align(Alignment.Center)) { Label(title, Fonts.baloo, 22.dp, Palette.cream) }
        RoundButton(CLOSE, stringResource(R.string.html_attr_close), Modifier.align(Alignment.CenterEnd)) { go(null) }
    }
}

@Composable
private fun SheetBody(content: @Composable () -> Unit) {
    val bottom = WindowInsets.navigationBars.asPaddingValues().calculateBottomPadding() + 24.dp
    Column(Modifier.verticalScroll(rememberScrollState()).padding(start = M, end = M, top = M, bottom = bottom),
        verticalArrangement = Arrangement.spacedBy(M)) { content() }
}

// ---- Perfil. Counters wait for the native session and records (native-shell.md, phases 3-4): a dash until then.
@Composable
private fun Profile(go: (Sheet?) -> Unit) {
    SheetHeader("Perfil", { RoundButton(GEAR, stringResource(R.string.html_settings_aria)) { go(Sheet.Settings) } }, go)
    SheetBody {
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            listOf("Partides", "Jocs", "Dies jugats").forEach { label ->
                Column(Modifier.weight(1f).card().padding(vertical = 12.dp, horizontal = 4.dp),
                    horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Label("—", Fonts.baloo, 26.dp, Palette.yellowHi)
                    Label(label, Fonts.balooBold, 13.dp, Palette.cream.copy(alpha = 0.7f))
                }
            }
        }
    }
}

// ---- Ajustos
@Composable
private fun Settings(model: Launcher, version: String, go: (Sheet?) -> Unit) {
    val ctx = LocalContext.current
    SheetHeader("Ajustos", { RoundButton(BACK, stringResource(R.string.launcher_settings_backToProfile)) { go(Sheet.Profile) } }, go)
    SheetBody {
        Column(Modifier.card()) {
            ToggleRow(SOUND, hex("#f0a51a"), "So", model.sound, first = true) { model.sound = it }
            ToggleRow(MUSIC, hex("#e45aa8"), "Música", model.music) { model.music = it }
            ToggleRow(PHONE, hex("#3aa5e8"), "Vibració", model.vibration) { model.vibration = it }
            // shortcut: the launcher is in Catalan until it follows the app's language (native settings, phase 4); no picker yet
            SettingsRow(GLOBE, hex("#3fae5a"), "Idioma") { Label("Català", Fonts.balooBold, 17.dp, Palette.cream.copy(alpha = 0.6f)); Chevron() }
        }
        Column(Modifier.card()) {
            SettingsRow(STAR, Palette.yellow, stringResource(R.string.launcher_settings_rateApp), first = true, onClick = { rate(ctx) }) { Chevron() }
            SettingsRow(SHARE, Palette.pink, stringResource(R.string.launcher_settings_shareApp), onClick = { share(ctx) }) { Chevron() }
        }
        // shortcut: Ajuda and Privadesa have no native page yet; they open nothing until phase 4 brings them
        Column(Modifier.card()) {
            SettingsRow(null, null, "Ajuda", first = true) { Chevron() }
            SettingsRow(null, null, "Privadesa") { Chevron() }
        }
        Box(Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
            Label("Mulassa Games $version", Fonts.balooBold, 13.dp, Palette.cream.copy(alpha = 0.55f))
        }
    }
}

// No in-app review library in the app: the Play listing itself, in the Play app when it is there.
private fun rate(ctx: Context) {
    val market = Intent(Intent.ACTION_VIEW, Uri.parse("market://details?id=${ctx.packageName}"))
    try { ctx.startActivity(market) } catch (_: ActivityNotFoundException) { ctx.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(STORE_URL))) }
}

private fun share(ctx: Context) =
    ctx.startActivity(Intent.createChooser(Intent(Intent.ACTION_SEND).setType("text/plain").putExtra(Intent.EXTRA_TEXT, STORE_URL), null))

// A card: a faint cream wash with a faint cream rim.
private fun Modifier.card() = drawBehind {
    val r = CornerRadius(18 * density); val w = 1.5f * density
    drawRoundRect(Palette.cream.copy(alpha = 0.08f), cornerRadius = r)
    drawRoundRect(Palette.cream.copy(alpha = 0.14f), Offset(w / 2, w / 2), Size(size.width - w, size.height - w), CornerRadius(r.x - w / 2), style = Stroke(w))
}

@Composable
private fun SettingsRow(icon: Path?, color: Color?, label: String, first: Boolean = false, onClick: (() -> Unit)? = null, role: Role = Role.Button,
                        end: @Composable RowScope.() -> Unit) {
    Row(Modifier.fillMaxWidth().heightIn(min = 52.dp)
        .then(if (onClick != null) Modifier.clickable(role = role, onClick = onClick) else Modifier)
        .drawBehind { if (!first) drawRect(Palette.cream.copy(alpha = 0.1f), size = Size(size.width, density)) }
        .padding(horizontal = M), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
        if (icon != null && color != null) Box(Modifier.size(32.dp).drawBehind { drawRoundRect(color, cornerRadius = CornerRadius(9 * density)) }, contentAlignment = Alignment.Center) {
            Box(Modifier.size(20.dp).drawBehind { icon24(icon, Palette.ink, 2.2f) })
        }
        Box(Modifier.weight(1f)) { Label(label, Fonts.baloo, 17.dp, Palette.cream) }
        end()
    }
}

@Composable
private fun ToggleRow(icon: Path, color: Color, label: String, on: Boolean, first: Boolean = false, set: (Boolean) -> Unit) =
    SettingsRow(icon, color, label, first, onClick = { set(!on) }, role = Role.Switch) {
        Box(Modifier.size(51.dp, 31.dp).drawBehind {
            val d = density
            drawRoundRect(if (on) hex("#6fbf4a") else Palette.cream.copy(alpha = 0.2f), cornerRadius = CornerRadius(16 * d))
            drawCircle(Color.White, 13.5f * d, Offset(if (on) size.width - 15.5f * d else 15.5f * d, size.height / 2))
        })
    }

@Composable
private fun Chevron() = Box(Modifier.size(9.dp, 14.dp).drawBehind {
    val s = size.width / 9
    drawPath(Path().apply { moveTo(1.5f * s, 1.5f * s); lineTo(7 * s, 7 * s); lineTo(1.5f * s, 12.5f * s) }, Palette.cream.copy(alpha = 0.5f), style = Stroke(2.2f * density))
})

// A round header button: cream ring on dark, a hard drop edge, a line icon.
@Composable
private fun RoundButton(icon: Path, label: String, modifier: Modifier = Modifier, onClick: () -> Unit) {
    Box(modifier.size(44.dp).semantics { contentDescription = label }.squash(2.dp, onClick = onClick).drawBehind {
        val r = size.minDimension / 2; val d = density
        drawCircle(Color.Black.copy(alpha = 0.5f), r, center + Offset(0f, 3 * d))
        drawCircle(hex("#3a2414"), r)
        drawCircle(Palette.cream, r - d, style = Stroke(2 * d))
    }, contentAlignment = Alignment.Center) {
        Box(Modifier.size(24.dp).drawBehind { icon24(icon, Palette.cream, 2.2f) })
    }
}

// ronda-10's icons, on 24×24
private fun svg(d: String) = PathParser().parsePathString(d).toPath()
private val CLOSE = svg("M7 7l10 10M17 7L7 17")
private val BACK = svg("M15 5l-7 7 7 7")
private val GEAR = svg("M8.8 12a3.2 3.2 0 1 0 6.4 0a3.2 3.2 0 1 0 -6.4 0z" +
    "M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z")
private val SOUND = svg("M4 9.5h4l5-4.5v14l-5-4.5H4zM16.5 9a4.5 4.5 0 0 1 0 6")
private val MUSIC = svg("M9 18V5l11-2v13M3 18a3 3 0 1 0 6 0a3 3 0 1 0 -6 0M14 16a3 3 0 1 0 6 0a3 3 0 1 0 -6 0")
private val PHONE = svg("M10 3.5h4a2 2 0 0 1 2 2v13a2 2 0 0 1 -2 2h-4a2 2 0 0 1 -2 -2v-13a2 2 0 0 1 2 -2zM4.5 8.5v7M19.5 8.5v7")
private val GLOBE = svg("M3 12a9 9 0 1 0 18 0a9 9 0 1 0 -18 0M3 12h18M12 3c2.8 3 2.8 15 0 18M12 3c-2.8 3-2.8 15 0 18")
private val STAR = svg("M12 3.5l2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z")
private val SHARE = svg("M12 15V3.5M7.5 8L12 3.5L16.5 8M5 12v7.5h14V12")
