package cat.mulassa.games.launcher

import android.content.Context
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
    var icon by mutableStateOf<ImageBitmap?>(null); private set
    var last by mutableStateOf(prefs.getString("last", null)); private set
    var bundle: WebBundle = WebBundle(null); private set
    var play: (Game, Offset) -> Unit = { _, _ -> }
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
        icon = b.image(ctx, "/apple-touch-icon.png")
    }

    fun played(id: String) {
        last = id
        prefs.edit().putString("last", id).apply()
    }
}

val M = 16.dp // one spacing unit: side margin = column gap = row gap = header-to-grid gap

@Composable
fun haptic(model: Launcher): (Int) -> Unit { val v = LocalView.current; return { if (model.vibration) v.performHapticFeedback(it) } }
private val REJECT = if (Build.VERSION.SDK_INT >= 30) HapticFeedbackConstants.REJECT else HapticFeedbackConstants.LONG_PRESS

private fun LayoutCoordinates.centre() = boundsInWindow().center

// Round 10: one screen. A header with the logo and the avatar, then every game as a cartridge, two columns, vertical
// scroll, over the hour's sky. The avatar opens Perfil, whose gear opens Ajustos.
@Composable
fun LauncherRoot(model: Launcher, version: String, hour: Float? = null) {
    val sky = rememberSky(hour)
    var sheet by remember { mutableStateOf<Sheet?>(null) }
    Box(Modifier.fillMaxSize().sky { sky }) {
        SkyLife(sky)
        Column(Modifier.fillMaxSize()) {
            Row(Modifier.windowInsetsPadding(WindowInsets.statusBars).fillMaxWidth().height(64.dp).padding(horizontal = M),
                verticalAlignment = Alignment.CenterVertically) {
                Logo()
                Spacer(Modifier.weight(1f))
                val profile = stringResource(R.string.html_profile_aria)
                Avatar(model.icon, 44.dp, Modifier.semantics { contentDescription = profile }.squash(2.dp) { sheet = Sheet.Profile })
            }
            Home(model, sky)
        }
        Sheets(model, version, sky, sheet) { sheet = it }
    }
}

@Composable
private fun Home(model: Launcher, sky: Sky) {
    val list = rememberLazyListState()
    val scrolled by remember { derivedStateOf { list.firstVisibleItemIndex > 0 || list.firstVisibleItemScrollOffset > 4 } }
    val fade by animateFloatAsState(if (scrolled) 1f else 0f, tween(200), label = "fade")
    val u = (LocalConfiguration.current.screenWidthDp.dp - M * 3) / 2 / CART_W
    val bottom = WindowInsets.navigationBars.asPaddingValues().calculateBottomPadding() + 24.dp
    // an odd count leaves one cartridge alone: an «Aviat» one fills the row (not a game: no tap)
    val rows = (model.games.map<Game, Game?> { it } + if (model.games.size % 2 == 1) listOf(null) else emptyList()).chunked(2)
    Box(Modifier.fillMaxSize()) {
        LazyColumn(Modifier.fillMaxSize(), list, PaddingValues(start = M, end = M, top = M, bottom = bottom), verticalArrangement = Arrangement.spacedBy(M)) {
            items(rows, key = { row -> row.joinToString { it?.id ?: "aviat" } }) { row ->
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(M)) {
                    row.forEach { g -> Box(Modifier.weight(1f), contentAlignment = Alignment.TopCenter) { if (g != null) Cell(model, g, u) else Placeholder(u) } }
                }
            }
        }
        // scrolled: the header keeps a fade so the cartridges slide under it (a plain gradient: no mask or blur, S10 cost)
        Box(Modifier.fillMaxWidth().height(32.dp).graphicsLayer { alpha = fade }.drawBehind {
            drawRect(Brush.verticalGradient(0.15f to sky.header, 0.55f to sky.header.copy(alpha = 0.6f), 1f to Color.Transparent))
        })
    }
}

// A tap plays it; a game not out yet shakes and buzzes.
@Composable
private fun Cell(model: Launcher, game: Game, u: Dp) {
    val shake = remember { Animatable(0f) }
    val scope = rememberCoroutineScope()
    val buzz = haptic(model)
    var at by remember { mutableStateOf(Offset.Zero) }
    val aviat = stringResource(R.string.ui_select_aviat)
    val playIt = stringResource(R.string.launcher_play, game.title)
    Box(Modifier.offset { IntOffset((shake.value * 6.dp.toPx()).roundToInt(), 0) }
        .onGloballyPositioned { at = it.centre() }
        .semantics { contentDescription = if (game.soon) aviat else playIt }
        .squash(u * 0.3f) {
            if (game.soon) {
                buzz(REJECT)
                scope.launch { shake.animateTo(if (shake.targetValue > 0.5f) 0f else 1f, spring(dampingRatio = 0.2f, stiffness = 987f)) }
            } else model.play(game, at)
        }) {
        Cartridge(game.tint, game.short ?: aviat, model.images[game.id], u, locked = game.soon)
    }
}

@Composable
private fun Placeholder(u: Dp) =
    Box(Modifier.clearAndSetSemantics {}) { Cartridge(hex("#7a5a44"), stringResource(R.string.ui_select_aviat), null, u, locked = false, placeholder = true) }

// The avatar: the app's icon in a cream ring on a hard drop edge.
@Composable
fun Avatar(icon: ImageBitmap?, size: Dp, modifier: Modifier = Modifier) {
    Box(modifier.size(size).drawBehind {
        drawCircle(Color.Black.copy(alpha = 0.5f), this.size.minDimension / 2, center + Offset(0f, 3 * density))
    }) {
        Box(Modifier.matchParentSize().clip(CircleShape).background(hex("#3ec6ff"))) {
            icon?.let { Image(it, null, Modifier.matchParentSize(), contentScale = ContentScale.Crop) }
        }
        val ring = if (size > 50.dp) 3.dp else 2.dp
        Box(Modifier.matchParentSize().drawBehind {
            val w = ring.toPx(); drawCircle(Palette.cream, (this.size.minDimension - w) / 2, style = Stroke(w))
        })
    }
}
