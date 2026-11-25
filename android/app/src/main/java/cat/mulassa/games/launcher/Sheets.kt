package cat.mulassa.games.launcher

import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.activity.compose.PredictiveBackHandler
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.SizeTransform
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.tween
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.LocalIndication
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.BottomSheetDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.material3.ripple
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.vector.PathParser
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import cat.mulassa.games.R
import kotlinx.coroutines.launch

enum class Sheet { Profile, Settings }

// TODO(store): the Play listing is derived from the package; confirm it once the app is published.
private const val STORE_URL = "https://play.google.com/store/apps/details?id=cat.mulassa.games"

// The two places the header opens (ronda-10's sheets) live in one platform bottom sheet: Material's drag handle, scrim,
// swipe and back dismiss it. Perfil's gear pushes Ajustos in from the right, like a navigation push; the arrow and the
// system back pop it. The sheet's height follows the page, so it grows and shrinks with the push.
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun Sheets(model: Launcher, version: String, sky: Sky, open: Sheet?, go: (Sheet?) -> Unit) {
    if (open == null) return
    val state = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    val scope = rememberCoroutineScope()
    // the close button slides the sheet away first; dropping it at once would cut the animation
    val nav: (Sheet?) -> Unit = { s -> if (s != null) go(s) else scope.launch { state.hide() }.invokeOnCompletion { go(null) } }
    // no MaterialTheme here: without a ripple, the handle and the rows press as Compose's grey debug box
    CompositionLocalProvider(LocalIndication provides ripple()) { ModalBottomSheet({ go(null) }, sheetState = state, shape = sheetShape,
        containerColor = sky.sheet, contentColor = Palette.cream, scrimColor = hex("#0a0603").copy(alpha = 0.6f),
        dragHandle = { BottomSheetDefaults.DragHandle(color = Palette.cream.copy(alpha = 0.35f)) }) {
        // a predictive handler, so the gesture's start is ours too: a plain BackHandler let the sheet's own callback shrink
        // it for a dismiss that never came. A cancelled gesture throws out of collect and stays on Ajustos.
        PredictiveBackHandler(open == Sheet.Settings) { events -> events.collect {}; go(Sheet.Profile) }
        AnimatedContent(open, transitionSpec = {
            val push = targetState == Sheet.Settings
            val t = tween<IntOffset>(PUSH_MS, easing = FastOutSlowInEasing)
            slideInHorizontally(t) { if (push) it else -it } togetherWith slideOutHorizontally(t) { if (push) -it else it } using
                SizeTransform(clip = true) { _, _ -> tween(PUSH_MS, easing = FastOutSlowInEasing) }
        }, contentAlignment = Alignment.TopCenter, label = "page") { s ->
            Column {
                when (s) {
                    Sheet.Profile -> Profile(nav)
                    Sheet.Settings -> Settings(model, version, nav)
                }
            }
        }
    } }
}

private const val PUSH_MS = 350
private val sheetShape = RoundedCornerShape(topStart = 28.dp, topEnd = 28.dp)

@Composable
private fun SheetHeader(title: String, left: @Composable () -> Unit, go: (Sheet?) -> Unit) {
    Box(Modifier.fillMaxWidth().padding(horizontal = M).height(44.dp)) {
        Box(Modifier.align(Alignment.CenterStart)) { left() }
        Box(Modifier.align(Alignment.Center)) { Label(title, Fonts.baloo, 22.dp, Palette.cream) }
        RoundButton(CLOSE, stringResource(R.string.html_attr_close), Modifier.align(Alignment.CenterEnd)) { go(null) }
    }
}

@Composable
private fun SheetBody(content: @Composable () -> Unit) {
    Column(Modifier.verticalScroll(rememberScrollState()).padding(start = M, end = M, top = M, bottom = 24.dp),
        verticalArrangement = Arrangement.spacedBy(M)) { content() }
}

// ---- Perfil. Counters wait for the native session and records (native-shell.md, phases 3-4): a dash until then.
@Composable
private fun Profile(go: (Sheet?) -> Unit) {
    SheetHeader(stringResource(R.string.html_accountTitle), { RoundButton(GEAR, stringResource(R.string.html_settings_aria)) { go(Sheet.Settings) } }, go)
    SheetBody {
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            listOf(R.string.launcher_profile_runs, R.string.launcher_profile_games, R.string.launcher_profile_days).map { stringResource(it) }.forEach { label ->
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
    SheetHeader(stringResource(R.string.html_settingsTitle), { RoundButton(BACK, stringResource(R.string.launcher_settings_backToProfile)) { go(Sheet.Profile) } }, go)
    SheetBody {
        Column(Modifier.card()) {
            ToggleRow(SOUND, hex("#f0a51a"), stringResource(R.string.launcher_settings_sound), model.sound, first = true) { model.sound = it }
            ToggleRow(MUSIC, hex("#e45aa8"), stringResource(R.string.pop_music), model.music) { model.music = it }
            ToggleRow(PHONE, hex("#3aa5e8"), stringResource(R.string.launcher_settings_vibration), model.vibration) { model.vibration = it }
            // shortcut: shows the app's language (the resources' endonym); no picker until the native settings (phase 4)
            SettingsRow(GLOBE, hex("#3fae5a"), stringResource(R.string.ui_lang_title)) { Label(stringResource(R.string.lang_endonym), Fonts.balooBold, 17.dp, Palette.cream.copy(alpha = 0.6f)); Chevron() }
        }
        Column(Modifier.card()) {
            SettingsRow(STAR, Palette.yellow, stringResource(R.string.launcher_settings_rateApp), first = true, onClick = { rate(ctx) }) { Chevron() }
            SettingsRow(SHARE, Palette.pink, stringResource(R.string.launcher_settings_shareApp), onClick = { share(ctx) }) { Chevron() }
        }
        // shortcut: Ajuda and Privadesa have no native page yet; they open nothing until phase 4 brings them
        Column(Modifier.card()) {
            SettingsRow(null, null, stringResource(R.string.launcher_settings_help), first = true) { Chevron() }
            SettingsRow(null, null, stringResource(R.string.html_common_privacy)) { Chevron() }
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
