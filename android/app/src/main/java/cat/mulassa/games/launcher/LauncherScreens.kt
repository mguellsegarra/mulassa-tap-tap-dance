@file:OptIn(androidx.compose.foundation.layout.ExperimentalLayoutApi::class)

package cat.mulassa.games.launcher

import androidx.compose.ui.res.painterResource
import androidx.compose.ui.platform.LocalContext
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.graphics.CompositingStrategy
import androidx.compose.foundation.layout.WindowInsetsSides
import androidx.compose.foundation.layout.only
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.ui.semantics.isTraversalGroup
import androidx.compose.ui.semantics.traversalIndex
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
    var planes by mutableStateOf<Map<String, Planes>>(emptyMap()); private set // a game's art in two planes, when its catalogue entry has them
    var bundle: WebBundle = WebBundle(null); private set
    var play: (Game, Offset) -> Unit = { _, _ -> }
    // the cartridge lifted into Picked; the activity drops it under the closed iris, so a game returns to the grid
    var pick by mutableStateOf<Pick?>(null)
    // the games follow these too (GameSession.kt LauncherShell, native-shell.md contract 4): music, UI sound and vibration. Vibration already gates the launcher's haptics.
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
        // the planes are decoded off the main thread and come in when ready: until then a cartridge wears its flat art
        planes = emptyMap()
        kotlin.concurrent.thread(name = "covers") {
            val got = found.mapNotNull { g ->
                val back = g.back?.let { b.image(ctx, it) }; val front = g.front?.let { b.image(ctx, it) }
                if (back != null && front != null) g.id to Planes(back, front) else null
            }.toMap()
            android.os.Handler(android.os.Looper.getMainLooper()).post { if (bundle === b) planes = got }
        }
        images = found.mapNotNull { g -> b.image(ctx, g.art)?.let { g.id to it } }.toMap()
    }
}

val M = 16.dp // one spacing unit: side margin = column gap = row gap = header-to-grid gap

@Composable
fun haptic(model: Launcher): (Int) -> Unit { val v = LocalView.current; return { if (model.vibration) v.performHapticFeedback(it) } }
val REJECT = if (Build.VERSION.SDK_INT >= 30) HapticFeedbackConstants.REJECT else HapticFeedbackConstants.LONG_PRESS

private fun LayoutCoordinates.centre() = boundsInWindow().center

// Ronda 31: no tab bar (the owner). The home over the hour's sky: the logo on the left and the avatar on the right on the
// fixed Faldó, then every game as a cartridge, two columns, scrolling under it. The avatar opens the account sheet
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
                // the clouds drift with the lean, further than anything behind a window: the sky is the furthest plane
                Box(Modifier.matchParentSize().graphicsLayer { translationX = Tilt.x * Tilt.CLOUDS[0].dp.toPx(); translationY = Tilt.y * Tilt.CLOUDS[1].dp.toPx() }) { SkyLife(sky) }
                Town(sky)
                Home(model, list, model.pick?.game?.id, { account = true }) { model.pick = it }
                // a wisp of mist in front of the lowest row, by day: the nearest plane
                Image(painterResource(R.drawable.cloud_wisp), null, Modifier.align(Alignment.BottomStart).fillMaxWidth(0.9f).graphicsLayer {
                    alpha = 0.22f * (1 - sky.stars)
                    translationX = (Tilt.x * Tilt.MIST[0]).dp.toPx() - size.width * 0.22f; translationY = (Tilt.y * Tilt.MIST[1]).dp.toPx() - 110.dp.toPx()
                }, contentScale = ContentScale.FillWidth)
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
        val sounds = rememberConsoleSounds(model) // loaded with the home: made at the pick, a quick first push played nothing
        model.pick?.let { Picked(model, it, sounds, veil, { frozen != null || Build.VERSION.SDK_INT < 31 }) { model.pick = null } }
        Sheets(model, version, sky, account) { account = false }
        val covered = model.pick != null || account
        LaunchedEffect(covered) { Tilt.covered = covered } // nothing leans, and no sensor runs, under a pick or the sheet
    }
}

@Composable
private fun Home(model: Launcher, list: LazyListState, picked: String?, account: () -> Unit, pick: (Pick) -> Unit) {
    val wide = LocalConfiguration.current.screenWidthDp.dp; val cols = columns(wide, M)
    val top = WindowInsets.statusBarsIgnoringVisibility.asPaddingValues().calculateTopPadding() // the bar's room even while the iris hides it: no jump on return
    val bottom = WindowInsets.navigationBars.asPaddingValues().calculateBottomPadding() + M
    val label = stringResource(R.string.html_accountTitle)
    // an odd count leaves one cartridge alone: an «Aviat» one fills the row (not a game: no tap)
    // a last row left short gets one «Aviat» filler (not a game: no tap), then empty places
    val rows = (model.games.map<Game, Game?> { it } + if (model.games.size % cols != 0) listOf(null) else emptyList()).chunked(cols)
    // Ronda 36: the cartridges come in one after another once the splash has lifted, 60 ms apart, 400 ms each (a plain
    // fade when the system's animations are off); one clock, each cell reads its own part of it in its layer
    val ctx = LocalContext.current
    val still = remember { android.provider.Settings.Global.getFloat(ctx.contentResolver, android.provider.Settings.Global.ANIMATOR_DURATION_SCALE, 1f) == 0f }
    val clock = remember { Animatable(if (model.arrived) 1e4f else 0f) } // ms since they began to arrive
    LaunchedEffect(model.arrived) { if (model.arrived && clock.value < 1e4f) { clock.animateTo(400f + 60f * rows.size * cols, tween(400 + 60 * rows.size * cols, easing = LinearEasing)); clock.snapTo(1e4f) } }
    fun enter(k: Int): () -> Float = { EaseOut.transform(((clock.value - if (still) 0f else 60f * k) / 400f).coerceIn(0f, 1f)) }
    val fringe = top + FALDO_BELOW + FALDO_FRINGE // the Faldó's bottom: the grid starts one gap under it and scrolls under it
    BoxWithConstraints(Modifier.fillMaxSize().semantics { isTraversalGroup = true }) {
        // one gap everywhere when the rows fit, the rows' rule when they do not (Rows.kt)
        val grid = grid(wide, maxHeight, WindowInsets.navigationBars.asPaddingValues().calculateBottomPadding(), fringe, rows.size, M, CART_W, CART_H)
        val u = grid.u
        LazyColumn(Modifier.fillMaxSize(), list, PaddingValues(start = grid.side, end = grid.side, top = fringe + grid.side + grid.lead, bottom = bottom), verticalArrangement = Arrangement.spacedBy(grid.gap), userScrollEnabled = grid.scrolls) {
            itemsIndexed(rows, key = { _, row -> row.joinToString { it?.id ?: "aviat" } }) { k, row ->
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(grid.side)) {
                    row.forEachIndexed { c, g -> Box(Modifier.weight(1f), contentAlignment = Alignment.TopCenter) { if (g != null) Cell(g, model.number(g), model.images[g.id], model.planes[g.id], u, k * cols + c, cols, g.id == picked, still, enter(k * cols + c), pick) else Placeholder(u, model.games.size + 1, cols, still, enter(k * cols + c)) } }
                    repeat(cols - row.size) { Spacer(Modifier.weight(1f)) } // a short last row keeps its cartridges' width
                }
            }
        }
        // the logo and the avatar on the Faldó, fixed to the screen's top edge (owner, 27 Nov 2026)
        // the springs and the float tick with the frames, only while the grid shows and animations are on
        LaunchedEffect(still, Tilt.covered) {
            if (still || Tilt.covered) return@LaunchedEffect
            Tilt.rest()
            while (true) withFrameNanos { Tilt.frame(it, cols) }
        }
        Faldo(top + FALDO_BELOW)
        // read first (the grid is declared before it and starts higher), and clear of a side cutout or navigation bar
        Row(Modifier.fillMaxWidth().semantics { isTraversalGroup = true; traversalIndex = -1f }
            .windowInsetsPadding(WindowInsets.safeDrawing.only(WindowInsetsSides.Horizontal))
            .padding(start = M, end = M, top = top + FALDO_ROW - 2.dp).height(48.dp), verticalAlignment = Alignment.CenterVertically) {
            Logo(Modifier.semantics { heading() })
            Spacer(Modifier.weight(1f))
            // a 48 dp target, inside the row, with the 36 dp circle against its end, on the margin
            Box(Modifier.size(48.dp).semantics { contentDescription = label }.squash(1.dp, onClick = account), contentAlignment = Alignment.CenterEnd) { Avatar(36.dp) }
        }
    }
}

// The Faldó (header ronda 3, owner's pick C1): the Mulassa's cloth in granat, hung from the screen's top edge with soft
// folds, a gold line and a dense gold fringe whose strands touch, so they read as hair without the sky showing through.
// One static draw in its own offscreen layer (no blur, no animation), cached apart from the grid scrolling under it. It
// takes the taps down to the fringe's tips, so a cartridge hidden under it cannot be picked and one showing below it
// still can. Same drawing on iOS (LauncherView.swift, Faldo).
private val FALDO_BELOW = 59.dp  // the cloth under the status bar's inset
private val FALDO_ROW = 3.dp     // the logo row's top under that inset (44 tall; Android's 48 dp target sits 2 dp higher)
private val FALDO_FRINGE = 16.dp // how far the longest strand hangs under the cloth (they start 3 above its edge)
private val CLOTH = Color(0xFF7D1F35)
private val FOLD = Color(0xFF3D0A18)
private val GOLDS = listOf(Triple(0f, 19f, Color(0xFFF2C230)), Triple(2.8f, 16.5f, Color(0xFFD9A521)), Triple(5.6f, 18f, Color(0xFFE9B62A)))

@Composable
private fun Faldo(cloth: Dp) {
    Box(Modifier.fillMaxWidth().height(cloth + FALDO_FRINGE).pointerInput(Unit) { detectTapGestures {} })
    Canvas(Modifier.fillMaxWidth().height(cloth + FALDO_FRINGE + 11.dp).graphicsLayer { compositingStrategy = CompositingStrategy.Offscreen }) {
        val c = cloth.toPx(); val d = density; val k = size.width / (393 * d)
        // its shadow: a short dark fade behind the fringe's tips (iOS's shadow of radius 3.5, 3 down)
        drawRect(Brush.verticalGradient(0f to Color(0x6B150A05), 1f to Color.Transparent, startY = c + 13 * d, endY = c + 22 * d), Offset(0f, c + 13 * d))
        var x = 0f // strands 3.4 wide every 2.8 (the last overlaps the next group's first): three golds, uneven tips
        while (x < size.width) {
            for ((dx, h, gold) in GOLDS) drawRoundRect(gold, Offset(x + dx * d, c - 3 * d), Size(3.4f * d, h * d), CornerRadius(1.7f * d))
            drawRect(Color(0x8CFFF0B0), Offset(x + 1.4f * d, c - 3 * d), Size(0.9f * d, 14 * d))
            x += 9 * d
        }
        // the cloth over the strands' rounded tops, as the mock-up: they come out flat under the gold line
        drawRect(CLOTH, size = Size(size.width, c))
        drawRect(Color(0xFFF2C230), Offset(0f, c - 2 * d), Size(size.width, 2 * d))
        for (i in 0 until 7) { // the folds keep the mock-up's rhythm at any width
            val l = (i * 65.5f - 12) * k * d; val w = 24 * k * d
            drawRect(Brush.horizontalGradient(0f to Color.Transparent, 0.5f to FOLD.copy(alpha = 0.38f), 1f to Color.Transparent, startX = l, endX = l + w), Offset(l, 0f), Size(w, c))
        }
    }
}


// A cartridge in the grid (ronda 39): the shell stands still and square; it only comes in with the others (`enter`: 0 to
// 1). What is behind its label's window follows the phone, in Cartridge.kt. No turn, no slab, no shadow: over a sky none
// of them had a wall to lean on.
private fun Modifier.arriving(still: Boolean, enter: () -> Float, at: Int = 0, cols: Int = 2, u: Dp = 16.43.dp, shown: () -> Boolean): Modifier {
    val m = FloatArray(3)
    return graphicsLayer {
        val p = enter()
        alpha = if (shown()) p else 0f
        if (!still) {
            // its depth's slide and swing against the lean, and its float at rest (Motion.kt, ronda 40)
            Tilt.cell(at, cols, true, m)
            val k = u.toPx() / 16.43f
            translationX = m[0] * k; translationY = m[1] * k + (1 - p) * 28.dp.toPx(); rotationZ = m[2]
            scaleX = 0.94f + 0.06f * p; scaleY = scaleX
        }
    }
}

// A tap lifts it out (Pick.kt); while it is out, its slot stays empty.
@Composable
private fun Cell(game: Game, number: Int?, image: ImageBitmap?, planes: Planes?, u: Dp, place: Int, cols: Int, out: Boolean, still: Boolean, enter: () -> Float, pick: (Pick) -> Unit) {
    var at by remember { mutableStateOf(Offset.Zero) }
    val aviat = stringResource(R.string.ui_select_aviat)
    val playIt = stringResource(R.string.launcher_play, game.title)
    Box(Modifier.arriving(still, enter, place, cols, u) { !out }
        .onGloballyPositioned { at = it.centre() }
        .semantics { contentDescription = if (game.soon) aviat else playIt }
        .squash(u * 0.3f) { pick(Pick(game, at, u)) }) {
        Cartridge(game.shell, game.short ?: aviat, image, u, locked = game.soon, number = number, planes = planes, lean = { Offset(Tilt.x, Tilt.y) })
    }
}

@Composable
private fun Placeholder(u: Dp, number: Int, cols: Int, still: Boolean, enter: () -> Float) = // one more to come: every place holds a cartridge (the owner)
    Box(Modifier.arriving(still, enter, number - 1, cols, u) { true }.clearAndSetSemantics {}) {
        Cartridge(calm(hex("#ff9d3b")), stringResource(R.string.ui_select_aviat), null, u, locked = true, number = number, lean = { Offset(Tilt.x, Tilt.y) })
    }
