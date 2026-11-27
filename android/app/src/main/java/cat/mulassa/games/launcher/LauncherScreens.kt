@file:OptIn(androidx.compose.foundation.layout.ExperimentalLayoutApi::class)

package cat.mulassa.games.launcher

import androidx.compose.ui.platform.LocalContext
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.EaseOut
import android.content.Context
import androidx.compose.foundation.lazy.LazyListState
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.draw.drawWithContent
import androidx.compose.ui.graphics.layer.drawLayer
import androidx.compose.ui.graphics.rememberGraphicsLayer
import androidx.compose.ui.graphics.TransformOrigin
import androidx.compose.foundation.Image
import androidx.compose.runtime.withFrameNanos
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalDensity
import android.os.Build
import android.view.HapticFeedbackConstants
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.asPaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBars
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsIgnoringVisibility
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.Stable
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.BlurEffect
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.TileMode
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.layout.LayoutCoordinates
import androidx.compose.ui.layout.boundsInWindow
import androidx.compose.ui.layout.onGloballyPositioned
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import cat.mulassa.games.R

// The launcher's state: the catalogue, the art, the last game played and the settings' toggles.
@Stable
class Launcher(private val ctx: Context) {
    private val prefs = ctx.getSharedPreferences("launcher", Context.MODE_PRIVATE)
    var games by mutableStateOf<List<Game>>(emptyList()); private set
    var arrived by mutableStateOf(false) // the splash has lifted (or there was none): the cartridges come in
    fun number(game: Game) = games.indexOf(game).takeIf { it >= 0 }?.plus(1) // engraved in its grip
    var images by mutableStateOf<Map<String, ImageBitmap>>(emptyMap()); private set
    var last by mutableStateOf(prefs.getString("last", null)); private set
    var bundle: WebBundle = WebBundle(null); private set
    var play: (Game, Offset) -> Unit = { _, _ -> }
    // the cartridge lifted into Picked; the activity drops it under the closed iris, so a game returns to the grid
    var pick by mutableStateOf<Pick?>(null)
    // shortcut: kept on the launcher only; the games read their own sound and music until the settings snapshot
    // (native-shell.md, contract 4) hands these to them. Vibration already gates the launcher's haptics.
    var sound by toggle("sound"); var music by toggle("music"); var vibration by toggle("vibration")

    private fun toggle(key: String) = object : kotlin.properties.ReadWriteProperty<Any?, Boolean> {
        private val state = mutableStateOf(prefs.getBoolean(key, true))
        override fun getValue(thisRef: Any?, property: kotlin.reflect.KProperty<*>) = state.value
        override fun setValue(thisRef: Any?, property: kotlin.reflect.KProperty<*>, value: Boolean) {
            state.value = value; prefs.edit().putBoolean(key, value).apply()
        }
    }

    // Read again on every return from a game: a live update may have switched the bundle meanwhile.
    fun load() {
        val (b, found) = WebBundle.games(ctx, WebBundle.active(ctx))
        if (b.dir == bundle.dir && found == games && games.isNotEmpty()) return
        bundle = b
        games = found
        images = found.mapNotNull { g -> b.image(ctx, g.art)?.let { g.id to it } }.toMap()
    }

    fun played(id: String) {
        last = id
        prefs.edit().putString("last", id).apply()
    }
}

val M = 16.dp // one spacing unit: side margin = column gap = row gap = header-to-grid gap

@Composable
fun haptic(model: Launcher): (Int) -> Unit { val v = LocalView.current; return { if (model.vibration) v.performHapticFeedback(it) } }
val REJECT = if (Build.VERSION.SDK_INT >= 30) HapticFeedbackConstants.REJECT else HapticFeedbackConstants.LONG_PRESS

private fun LayoutCoordinates.centre() = boundsInWindow().center

// Ronda 31: no tab bar (the owner). The home over the hour's sky: the logo on the left and the avatar on the right, as the
// App Store's, then every game as a cartridge, two columns, all scrolling together. The avatar opens the account sheet
// (Sheets.kt); a cartridge tapped lifts out into Picked (Pick.kt).

@Composable
fun LauncherRoot(model: Launcher, version: String, hour: Float? = null) {
    val sky = rememberSky(hour)
    var account by rememberSaveable { mutableStateOf(false) }
    val list = rememberLazyListState()
    val veil = remember { Animatable(0f) } // Picked's blur and dim over the home, 0 to 1
    // While a cartridge is picked the home shows blurred: a snapshot taken once, blurred once (a fixed radius on a still
    // image, so HWUI keeps the filtered result) and faded in over the live home, which stops being drawn once it is covered.
    // A live blur would refilter the whole screen every frame, since the clouds keep moving under it (ronda 23 measured
    // a quarter-size live one at 40-50 ms of RenderThread a frame). API 31+; older phones keep the dim only.
    val home = rememberGraphicsLayer()
    var frozen by remember { mutableStateOf<ImageBitmap?>(null) }
    LaunchedEffect(model.pick) {
        frozen = null
        if (model.pick == null) veil.snapTo(0f) // also when a game took the pick away
        // a frame on, its slot is empty; Picked waits for it: the capture waits on the GPU (ronda 23: 50-80 ms on the
        // emulator), better before the cartridge moves than as a hitch in its lift
        else if (Build.VERSION.SDK_INT >= 31) { withFrameNanos {}; frozen = home.toImageBitmap() }
    }
    Box(Modifier.fillMaxSize()) {
        // once the blur fully covers it, the live home (its clouds keep moving) is not recorded or drawn under it
        Box(Modifier.fillMaxSize().drawWithContent {
            if (frozen == null || veil.value < 1f) { home.record { this@drawWithContent.drawContent() }; drawLayer(home) }
        }) {
            // under a picked cartridge the home leaves the accessibility tree, as iOS's modal lift
            Box(Modifier.fillMaxSize().sky { sky }.then(if (model.pick != null) Modifier.clearAndSetSemantics {} else Modifier)) {
                // the clouds drift a little against the lean: the sky sits further back than the cartridges
                Box(Modifier.matchParentSize().graphicsLayer { translationX = -Tilt.x * 10.dp.toPx(); translationY = Tilt.y * 7.dp.toPx() }) { SkyLife(sky) }
                Home(model, sky, list, model.pick?.game?.id, { account = true }) { model.pick = it }
            }
        }
        frozen?.let {
            // drawn into a layer a quarter of its size, blurred there and that layer scaled back up: the same look for a
            // sixteenth of the pixels to filter (ronda 23: the full-size blur's first frame took 50-80 ms of RenderThread)
            val d = LocalDensity.current
            Image(it, null, Modifier.size(with(d) { (it.width / 4).toDp() }, with(d) { (it.height / 4).toDp() }).graphicsLayer {
                transformOrigin = TransformOrigin(0f, 0f); scaleX = it.width / size.width; scaleY = it.height / size.height
                alpha = veil.value; renderEffect = BlurEffect(6f, 6f, TileMode.Clamp)
            }, contentScale = ContentScale.FillBounds)
        }
        model.pick?.let { Picked(model, it, veil, { frozen != null || Build.VERSION.SDK_INT < 31 }) { model.pick = null } }
        Sheets(model, version, sky, account) { account = false }
    }
}

@Composable
private fun Home(model: Launcher, sky: Sky, list: LazyListState, picked: String?, account: () -> Unit, pick: (Pick) -> Unit) {
    val scrolled by remember { derivedStateOf { list.firstVisibleItemIndex > 0 || list.firstVisibleItemScrollOffset > 4 } }
    val fade by animateFloatAsState(if (scrolled) 1f else 0f, tween(200), label = "fade")
    val u = (LocalConfiguration.current.screenWidthDp.dp - M * 3) / 2 / CART_W
    val top = WindowInsets.statusBarsIgnoringVisibility.asPaddingValues().calculateTopPadding() // the bar's room even while the iris hides it: no jump on return
    val bottom = WindowInsets.navigationBars.asPaddingValues().calculateBottomPadding() + M
    val label = stringResource(R.string.html_accountTitle)
    // an odd count leaves one cartridge alone: an «Aviat» one fills the row (not a game: no tap)
    val rows = (model.games.map<Game, Game?> { it } + if (model.games.size % 2 == 1) listOf(null) else emptyList()).chunked(2)
    // Ronda 36: the cartridges come in one after another once the splash has lifted, 60 ms apart, 400 ms each (a plain
    // fade when the system's animations are off); one clock, each cell reads its own part of it in its layer
    val ctx = LocalContext.current
    val still = remember { android.provider.Settings.Global.getFloat(ctx.contentResolver, android.provider.Settings.Global.ANIMATOR_DURATION_SCALE, 1f) == 0f }
    val clock = remember { Animatable(if (model.arrived) 1e4f else 0f) } // ms since they began to arrive
    LaunchedEffect(model.arrived) { if (model.arrived && clock.value < 1e4f) { clock.animateTo(400f + 60f * rows.size * 2, tween(400 + 60 * rows.size * 2, easing = LinearEasing)); clock.snapTo(1e4f) } }
    LaunchedEffect(picked) { Tilt.level = picked != null }
    fun enter(k: Int): () -> Float = { EaseOut.transform(((clock.value - if (still) 0f else 60f * k) / 400f).coerceIn(0f, 1f)) }
    BoxWithConstraints(Modifier.fillMaxSize()) {
        // the rows' gap (rowGap's rule): spread over the screen when they all fit, a row cut across its middle when not
        val (gap, scrolls) = rowGap(maxHeight, WindowInsets.navigationBars.asPaddingValues().calculateBottomPadding(), top + 8.dp + 56.dp + M, u * CART_H, rows.size)
        LazyColumn(Modifier.fillMaxSize(), list, PaddingValues(start = M, end = M, bottom = bottom), verticalArrangement = Arrangement.spacedBy(M), userScrollEnabled = scrolls) {
            // the logo and the avatar scroll with the cartridges (owner, ronda 18 and 31)
            item(key = "logo") {
                Row(Modifier.fillMaxWidth().padding(top = top + 8.dp).height(56.dp), verticalAlignment = Alignment.CenterVertically) {
                    Logo(Modifier.semantics { heading() })
                    Spacer(Modifier.weight(1f))
                    // a 48 dp target, inside the row, with the 36 dp circle against its end, on the margin
                    Box(Modifier.size(48.dp).semantics { contentDescription = label }.squash(1.dp, onClick = account), contentAlignment = Alignment.CenterEnd) { Avatar(36.dp) }
                }
            }
            itemsIndexed(rows, key = { _, row -> row.joinToString { it?.id ?: "aviat" } }) { k, row ->
                Row(Modifier.fillMaxWidth().padding(top = if (k > 0) gap - M else 0.dp), horizontalArrangement = Arrangement.spacedBy(M)) {
                    row.forEach { g -> Box(Modifier.weight(1f), contentAlignment = Alignment.TopCenter) { if (g != null) Cell(g, model.number(g), model.images[g.id], u, g.id == picked, still, enter(k * 2 + row.indexOf(g)), pick) else Placeholder(u, still, enter(k * 2 + 1)) } }
                }
            }
        }
        // scrolled: a veil in the sky's colour behind the status bar, so the clock reads over the cartridges sliding under
        // it; solid under the icons, then fading out (a plain gradient: no mask or blur, S10 cost)
        Box(Modifier.fillMaxWidth().height(top + 28.dp).graphicsLayer { alpha = fade }.drawBehind {
            val solid = top.toPx() / size.height
            drawRect(Brush.verticalGradient(0f to sky.header, solid * 0.7f to sky.header, 1f to sky.header.copy(alpha = 0f)))
        })
    }
}

// Ronda 32-33, the owner: rows that all fit spread over the screen down to the navigation bar, and the page does not
// scroll; rows that overflow it («que la gent sàpiga que hi ha scroll») get a gap that grows from M up to 2M until the
// screen's bottom edge cuts a row between 30 and 70 % of its height, as near the middle as it can (a thin sliver, or a
// row cut at its very bottom, hides that the grid scrolls). Same rule on iOS (LauncherView.swift).
fun rowGap(view: Dp, bottom: Dp, top: Dp, row: Dp, rows: Int): Pair<Dp, Boolean> {
    val room = view - bottom - M - top // down to the navigation bar, with a margin
    if (row * rows + M * maxOf(rows - 1, 0) <= room) return (if (rows > 1) (room - row * rows) / (rows - 1) else M) to false
    return peek(view, top, row, rows) to true
}

private fun peek(view: Dp, top: Dp, row: Dp, rows: Int): Dp {
    for (i in rows - 1 downTo 1) { // i rows above the cut one; the most first, so the gap stays small
        fun gap(f: Float) = (view - top - row * f) / i - row // the gap that cuts row i at fraction f
        val lo = maxOf(gap(0.7f), M); val hi = minOf(gap(0.3f), M * 2)
        if (lo <= hi) return gap(0.5f).coerceIn(lo, hi)
    }
    return M
}

// A cartridge in the grid (ronda 36): its shadow on the sky, sliding against the lean; the cartridge leaning up to 7° with
// the phone (Motion.kt) and coming in with the others (`enter`: 0 to 1), and the shine crossing its face. Transforms, an
// alpha and two small draws over the cartridge's own layer.
private fun Modifier.leaning(u: Dp, still: Boolean, enter: () -> Float, shown: () -> Boolean) = this
    .drawBehind { if (shown()) cartridgeShadow(u.toPx(), Tilt.x, Tilt.y, enter()) }
    .graphicsLayer {
        val p = enter()
        alpha = if (shown()) p else 0f
        if (!still) { translationY = (1 - p) * 28.dp.toPx(); scaleX = 0.94f + 0.06f * p; scaleY = scaleX }
        rotationY = -Tilt.LEAN * Tilt.x; rotationX = Tilt.LEAN * Tilt.y; cameraDistance = 6 * density // the signs that match SwiftUI's rotation3DEffect
    }
    .drawWithContent { drawContent(); shine(u.toPx(), Tilt.x, Tilt.y) }

// A tap lifts it out (Pick.kt); while it is out, its slot stays empty.
@Composable
private fun Cell(game: Game, number: Int?, image: ImageBitmap?, u: Dp, out: Boolean, still: Boolean, enter: () -> Float, pick: (Pick) -> Unit) {
    var at by remember { mutableStateOf(Offset.Zero) }
    val aviat = stringResource(R.string.ui_select_aviat)
    val playIt = stringResource(R.string.launcher_play, game.title)
    Box(Modifier.leaning(u, still, enter) { !out }
        .onGloballyPositioned { at = it.centre() }
        .semantics { contentDescription = if (game.soon) aviat else playIt }
        .squash(u * 0.3f) { pick(Pick(game, at, u)) }) {
        Cartridge(game.tint, game.short ?: aviat, image, u, locked = game.soon, number = number)
    }
}

@Composable
private fun Placeholder(u: Dp, still: Boolean, enter: () -> Float) =
    Box(Modifier.leaning(u, still, enter) { true }.clearAndSetSemantics {}) { Cartridge(hex("#7a5a44"), stringResource(R.string.ui_select_aviat), null, u, locked = false, placeholder = true) }
