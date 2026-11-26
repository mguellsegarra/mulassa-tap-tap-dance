package cat.mulassa.games.launcher

import android.content.Context
import androidx.activity.compose.BackHandler
import androidx.compose.foundation.lazy.LazyListState
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.draw.drawWithContent
import androidx.compose.ui.graphics.layer.drawLayer
import androidx.compose.ui.graphics.rememberGraphicsLayer
import android.os.Build
import android.view.HapticFeedbackConstants
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.asPaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBars
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.Stable
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.layout.LayoutCoordinates
import androidx.compose.ui.layout.boundsInWindow
import androidx.compose.ui.layout.onGloballyPositioned
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import cat.mulassa.games.R
import kotlin.math.roundToInt
import kotlinx.coroutines.launch

// The launcher's state: the catalogue, the art, the last game played and the settings' toggles.
@Stable
class Launcher(private val ctx: Context) {
    private val prefs = ctx.getSharedPreferences("launcher", Context.MODE_PRIVATE)
    var games by mutableStateOf<List<Game>>(emptyList()); private set
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

// Ronda 18: two tabs over the hour's sky. Jocs is the logo and every game as a cartridge, two columns, all scrolling
// together; Perfil is a page whose gear opens Ajustos. A cartridge tapped lifts out into Picked (Pick.kt).
enum class Tab { Games, Profile }

@Composable
fun LauncherRoot(model: Launcher, version: String, hour: Float? = null) {
    val sky = rememberSky(hour)
    var tab by rememberSaveable { mutableStateOf(Tab.Games) }
    var settings by remember { mutableStateOf(false) }
    val list = rememberLazyListState() // kept across tabs
    val backdrop = rememberGraphicsLayer() // the page, recorded once more for the tab bar's blur
    BackHandler(tab == Tab.Profile) { tab = Tab.Games }
    Box(Modifier.fillMaxSize()) {
        Box(Modifier.fillMaxSize().drawWithContent { backdrop.record { this@drawWithContent.drawContent() }; drawLayer(backdrop) }.sky { sky }) {
            SkyLife(sky)
            if (tab == Tab.Games) Home(model, sky, list, model.pick?.game?.id) { model.pick = it } else ProfilePage { settings = true }
        }
        TabBar(tab, sky, backdrop) { tab = it }
        model.pick?.let { Picked(model, it) { model.pick = null } }
        Sheets(model, version, sky, settings) { settings = false }
    }
}

@Composable
private fun Home(model: Launcher, sky: Sky, list: LazyListState, picked: String?, pick: (Pick) -> Unit) {
    val scrolled by remember { derivedStateOf { list.firstVisibleItemIndex > 0 || list.firstVisibleItemScrollOffset > 4 } }
    val fade by animateFloatAsState(if (scrolled) 1f else 0f, tween(200), label = "fade")
    val u = (LocalConfiguration.current.screenWidthDp.dp - M * 3) / 2 / CART_W
    val top = WindowInsets.statusBars.asPaddingValues().calculateTopPadding()
    val bottom = WindowInsets.navigationBars.asPaddingValues().calculateBottomPadding() + BAR_GAP + BAR_H + M
    // an odd count leaves one cartridge alone: an «Aviat» one fills the row (not a game: no tap)
    val rows = (model.games.map<Game, Game?> { it } + if (model.games.size % 2 == 1) listOf(null) else emptyList()).chunked(2)
    Box(Modifier.fillMaxSize()) {
        LazyColumn(Modifier.fillMaxSize(), list, PaddingValues(start = M, end = M, bottom = bottom), verticalArrangement = Arrangement.spacedBy(M)) {
            // the logo scrolls with the cartridges (owner, ronda 18)
            item(key = "logo") { Box(Modifier.fillMaxWidth().padding(top = top + 8.dp).height(56.dp), contentAlignment = Alignment.Center) { Logo() } }
            items(rows, key = { row -> row.joinToString { it?.id ?: "aviat" } }) { row ->
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(M)) {
                    row.forEach { g -> Box(Modifier.weight(1f), contentAlignment = Alignment.TopCenter) { if (g != null) Cell(g, model.images[g.id], u, g.id == picked, pick) else Placeholder(u) } }
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

// A tap lifts it out (Pick.kt); while it is out, its slot stays empty.
@Composable
private fun Cell(game: Game, image: ImageBitmap?, u: Dp, out: Boolean, pick: (Pick) -> Unit) {
    var at by remember { mutableStateOf(Offset.Zero) }
    val aviat = stringResource(R.string.ui_select_aviat)
    val playIt = stringResource(R.string.launcher_play, game.title)
    Box(Modifier.graphicsLayer { alpha = if (out) 0f else 1f }
        .onGloballyPositioned { at = it.centre() }
        .semantics { contentDescription = if (game.soon) aviat else playIt }
        .squash(u * 0.3f) { pick(Pick(game, at, u)) }) {
        Cartridge(game.tint, game.short ?: aviat, image, u, locked = game.soon)
    }
}

@Composable
private fun Placeholder(u: Dp) =
    Box(Modifier.clearAndSetSemantics {}) { Cartridge(hex("#7a5a44"), stringResource(R.string.ui_select_aviat), null, u, locked = false, placeholder = true) }
