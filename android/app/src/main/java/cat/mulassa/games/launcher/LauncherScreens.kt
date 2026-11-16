package cat.mulassa.games.launcher

import android.content.Context
import android.os.Build
import android.view.HapticFeedbackConstants
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.gestures.snapping.SnapPosition
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.navigationBars
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.layout.wrapContentSize
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.PageSize
import androidx.compose.foundation.pager.PagerDefaults
import androidx.compose.foundation.pager.PagerSnapDistance
import androidx.compose.foundation.pager.PagerState
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.Stable
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.runtime.snapshotFlow
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.draw.drawWithContent
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.TransformOrigin
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.layout.LayoutCoordinates
import androidx.compose.ui.layout.boundsInWindow
import androidx.compose.ui.layout.onGloballyPositioned
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import kotlin.math.abs
import kotlin.math.min
import kotlin.math.roundToInt
import kotlinx.coroutines.launch

// The launcher's state: the catalogue, the art, and three local values (favourites, the last game played, the chosen tab).
@Stable
class Launcher(private val ctx: Context) {
    sealed interface Filter { data object All : Filter; data object Favs : Filter; data class Category(val id: String) : Filter }

    private val prefs = ctx.getSharedPreferences("launcher", Context.MODE_PRIVATE)
    var games by mutableStateOf<List<Game>>(emptyList()); private set
    var images by mutableStateOf<Map<String, ImageBitmap>>(emptyMap()); private set
    var icon by mutableStateOf<ImageBitmap?>(null); private set
    var favs by mutableStateOf(prefs.getStringSet("favs", null)?.toSet() ?: emptySet()); private set
    var last by mutableStateOf(prefs.getString("last", null)); private set
    var filter by mutableStateOf<Filter>(Filter.All)
    var bundle: WebBundle = WebBundle(null); private set
    var play: (Game, Offset) -> Unit = { _, _ -> }

    // Read again on every return from a game: a live update may have switched the bundle meanwhile.
    fun load() {
        val (b, found) = WebBundle.games(ctx, WebBundle.active(ctx))
        if (b.dir == bundle.dir && found == games && games.isNotEmpty()) return
        bundle = b
        games = found
        images = found.mapNotNull { g -> b.image(ctx, g.art)?.let { g.id to it } }.toMap()
        icon = b.image(ctx, "/apple-touch-icon.png")
    }

    val categories: List<String> get() = if (games.size >= 8) listOf("ritme", "accio", "enginy", "puzles") else emptyList()
    val list: List<Game> get() = when (val f = filter) {
        Filter.All -> games
        Filter.Favs -> games.filter { it.id in favs }
        is Filter.Category -> games.filter { it.category == f.id }
    }

    // the game the ring opens on: the last played when it is shown, else the first that can be played
    fun opening(list: List<Game>): Game? = list.firstOrNull { it.id == last } ?: list.firstOrNull { !it.soon } ?: list.firstOrNull()

    fun toggleFav(id: String) {
        favs = if (id in favs) favs - id else favs + id
        prefs.edit().putStringSet("favs", favs).apply()
    }

    fun played(id: String) {
        last = id
        prefs.edit().putString("last", id).apply()
    }
}

private val M = 16.dp // the screen's side margin
private val names = mapOf("ritme" to "Ritme", "accio" to "Acció", "enginy" to "Enginy", "puzles" to "Puzles")

@Composable
private fun haptic(): (Int) -> Unit { val v = LocalView.current; return { v.performHapticFeedback(it) } }
private val REJECT = if (Build.VERSION.SDK_INT >= 30) HapticFeedbackConstants.REJECT else HapticFeedbackConstants.LONG_PRESS
private val TICK = if (Build.VERSION.SDK_INT >= 27) HapticFeedbackConstants.KEYBOARD_RELEASE else HapticFeedbackConstants.CLOCK_TICK

private fun LayoutCoordinates.centre() = boundsInWindow().center

@Composable
fun LauncherRoot(model: Launcher, version: String) {
    val tabs = rememberPagerState { 2 }
    Box(Modifier.fillMaxSize().background(Palette.bg)) {
        Column(Modifier.fillMaxSize().windowInsetsPadding(WindowInsets.statusBars).windowInsetsPadding(WindowInsets.navigationBars)) {
            HorizontalPager(tabs, Modifier.weight(1f), beyondViewportPageCount = 1) { page ->
                if (page == 0) JocsScreen(model, version) else PerfilScreen()
            }
            Spacer(Modifier.height(72.dp))
        }
        TabBar(model, tabs, Modifier.align(Alignment.BottomCenter).windowInsetsPadding(WindowInsets.navigationBars).padding(bottom = 4.dp))
    }
}

// ---- Jocs: the logo and «N jocs», the chips, the ring, the ruler, JUGA, every game as a grid
@Composable
private fun JocsScreen(model: Launcher, version: String) {
    val list = model.list
    var selected by remember { mutableStateOf<String?>(null) }
    val game = list.firstOrNull { it.id == selected } ?: model.opening(list)
    val width = LocalConfiguration.current.screenWidthDp.dp
    val u = (width - M * 2 - 12.dp * 3) / 4 / 10.4f
    LazyColumn(Modifier.fillMaxSize()) {
        item {
            Row(Modifier.fillMaxWidth().padding(horizontal = M).padding(top = 4.dp).heightIn(min = 56.dp), verticalAlignment = Alignment.CenterVertically) {
                Logo()
                Spacer(Modifier.weight(1f))
                Box(Modifier.plate(11.dp, dim = true).height(32.dp).padding(horizontal = 12.dp), contentAlignment = Alignment.Center) {
                    Label("${model.games.size} jocs", Fonts.pixel, 20.dp, Palette.yellowHi, kern = 0.5.dp)
                }
            }
        }
        item { Chips(model, Modifier.padding(top = 12.dp)) }
        if (game != null) {
            item {
                key(list.map { it.id }) { // a chip keeps the chosen game when it is still shown
                    Ring(model, list, list.firstOrNull { it.id == selected } ?: game) { selected = it }
                }
            }
            item { Ruler(list, game, Modifier.fillMaxWidth().padding(top = 2.dp)) }
            item { PlayButton(game, Modifier.padding(horizontal = M).padding(top = 12.dp)) { model.play(game, it) } }
            item {
                Row(Modifier.fillMaxWidth().padding(horizontal = M).padding(top = 28.dp, bottom = 12.dp), verticalAlignment = Alignment.CenterVertically) {
                    Label(heading(model.filter), Fonts.baloo, 22.dp, Palette.cream)
                    Spacer(Modifier.weight(1f))
                    Label("${list.size}", Fonts.balooBold, 14.dp, Palette.yellowHi)
                }
            }
            items(list.chunked(4), key = { row -> row.joinToString { it.id } }) { row ->
                Row(Modifier.fillMaxWidth().padding(horizontal = M).padding(bottom = 20.dp), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    row.forEach { g -> Box(Modifier.weight(1f), contentAlignment = Alignment.TopCenter) { GridCell(model, g, u) } }
                    repeat(4 - row.size) { Spacer(Modifier.weight(1f)) }
                }
            }
        } else {
            item { EmptyFavs(Modifier.padding(horizontal = M).padding(top = 24.dp)) { model.filter = Launcher.Filter.All } }
        }
        item {
            Box(Modifier.fillMaxWidth().padding(top = 8.dp, bottom = 24.dp), contentAlignment = Alignment.Center) {
                Label("Mulassa Games $version · mulassa.cat", Fonts.balooBold, 12.dp, Palette.cream.copy(alpha = 0.4f))
            }
        }
    }
}

private fun heading(f: Launcher.Filter) = when (f) {
    Launcher.Filter.All -> "Tots els jocs"
    Launcher.Filter.Favs -> "Els teus favorits"
    is Launcher.Filter.Category -> names[f.id] ?: f.id
}

@Composable
private fun Chips(model: Launcher, modifier: Modifier) {
    Row(modifier.horizontalScroll(rememberScrollState()).padding(horizontal = M).padding(bottom = 4.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        Chip(model, Launcher.Filter.All) { Label("Tots", Fonts.baloo, 15.dp, it) }
        Chip(model, Launcher.Filter.Favs) { c ->
            Box(Modifier.size(18.dp).drawBehind { heart(Palette.red, hex("#7a1020"), 1.4f * density) })
            Label("Favorits", Fonts.baloo, 15.dp, c)
            Label("${model.favs.size}", Fonts.pixel, 18.dp, c.copy(alpha = 0.75f))
        }
        model.categories.forEach { id -> Chip(model, Launcher.Filter.Category(id)) { Label(names[id] ?: id, Fonts.baloo, 15.dp, it) } }
    }
}

@Composable
private fun Chip(model: Launcher, f: Launcher.Filter, label: @Composable (Color) -> Unit) {
    val on = model.filter == f
    Row(
        Modifier.semantics { selected = on }.squash(2.dp) { model.filter = f }
            .then(if (on) Modifier.drawBehind { yellowBlock(14 * density) } else Modifier.plate(14.dp, dim = true))
            .height(40.dp).padding(horizontal = 14.dp),
        verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp),
    ) { label(if (on) Palette.brown else Palette.cream) }
}

// The ring: a paged horizontal list, the chosen cartridge big in the middle, its neighbours scaled and dimmed by their offset
// (read in the draw phase from the pager: nothing is recomposed while it moves). A long run of pages makes it wrap.
@Composable
private fun Ring(model: Launcher, list: List<Game>, start: Game, onSelect: (String) -> Unit) {
    val n = list.size
    val wraps = n >= 3
    val count = if (wraps) n * 400 else n
    val first = (if (wraps) n * 200 else 0) + list.indexOf(start).coerceAtLeast(0)
    val pager = rememberPagerState(first) { count }
    val scope = rememberCoroutineScope()
    val buzz = haptic()
    val u = 17.dp
    val step = 150.dp
    LaunchedEffect(pager) {
        snapshotFlow { pager.currentPage }.collect { p ->
            val id = list[p % n].id
            onSelect(id)
            if (p != first) buzz(TICK)
        }
    }
    BoxWithConstraints(Modifier.fillMaxWidth().padding(top = 16.dp).height(u * 12 + 22.dp)) {
        HorizontalPager(
            pager, Modifier.fillMaxSize(),
            pageSize = PageSize.Fixed(step),
            contentPadding = PaddingValues(horizontal = (maxWidth - step) / 2),
            beyondViewportPageCount = 2,
            flingBehavior = PagerDefaults.flingBehavior(pager, PagerSnapDistance.atMost(n)),
            verticalAlignment = Alignment.Top,
        ) { page ->
            val game = list[page % n]
            val centred by remember { derivedStateOf { pager.currentPage == page } }
            Box(Modifier.fillMaxSize().wrapContentSize(Alignment.TopCenter, unbounded = true)) {
                RingItem(model, game, u, centred, { abs((pager.currentPage - page) + pager.currentPageOffsetFraction).coerceAtMost(1f) }) { at ->
                    if (pager.currentPage == page) model.play(game, at)
                    else scope.launch { pager.animateScrollToPage(page, animationSpec = spring(dampingRatio = 0.8f, stiffness = 195f)) }
                }
            }
        }
    }
}

@Composable
private fun RingItem(model: Launcher, game: Game, u: Dp, centred: Boolean, distance: () -> Float, tap: (Offset) -> Unit) {
    val tag = if (game.id == model.last) "ÚLTIM" else if (game.isNew) "NOU" else null
    var at by remember { mutableStateOf(Offset.Zero) }
    Box(Modifier.size(u * 10, u * 12).graphicsLayer {
        val s = 1 - (1 - 0.58f) * distance()
        scaleX = s; scaleY = s; transformOrigin = TransformOrigin(0.5f, 1f)
    }) {
        Box(Modifier.onGloballyPositioned { at = it.centre() }
            .semantics { contentDescription = if (game.soon) "Aviat" else "Juga a ${game.title}" }
            .squash(5.dp) { tap(at) }
            .drawWithContent { drawContent(); val k = distance(); if (k > 0) drawDim(k, u.toPx()) }) {
            Cartridge(game, model.images[game.id], u)
        }
        if (tag != null) Tag(tag, tag == "NOU", Modifier.offset(-u * 0.35f, u * 2.4f).graphicsLayer { alpha = if (centred) 1f else 0f })
        if (!game.soon && centred) {
            FavHeart(game.id in model.favs, 30.dp, Modifier.align(Alignment.TopEnd).offset(14.dp, -14.dp)) { model.toggleFav(game.id) }
        }
    }
}

// the neighbours' dimming (iOS: brightness −0.32 × distance), as a dark wash over the cartridge's own shape only
private fun androidx.compose.ui.graphics.drawscope.DrawScope.drawDim(k: Float, u: Float) {
    drawPath(cartridgePath(0f, 0f, u), Color.Black.copy(alpha = 0.45f * k))
    drawPath(cartridgePath(0.32f * u, 0.42f * u, u), Color.Black.copy(alpha = 0.45f * k))
}

@Composable
private fun Ruler(list: List<Game>, game: Game, modifier: Modifier) {
    val k = list.indexOf(game) + 1
    val c = game.tint
    Row(modifier.height(16.dp), horizontalArrangement = Arrangement.spacedBy(10.dp, Alignment.CenterHorizontally), verticalAlignment = Alignment.CenterVertically) {
        Label("%02d".format(k), Fonts.pixel, 20.dp, c)
        Row(horizontalArrangement = Arrangement.spacedBy(4.dp), verticalAlignment = Alignment.CenterVertically) {
            list.forEach { g ->
                val on = g == game
                val h by animateDpAsState(if (on) 15.dp else 9.dp, tween(200), label = "tick")
                Box(Modifier.size(3.dp, h).background(if (on) c else Palette.cream.copy(alpha = 0.35f), RoundedCornerShape(2.dp)))
            }
        }
        Label("%02d".format(list.size), Fonts.pixel, 20.dp, Palette.cream.copy(alpha = 0.7f))
    }
}

// JUGA in the game's colour: a face on a thick edge that squashes when pressed.
@Composable
private fun PlayButton(game: Game, modifier: Modifier, play: (Offset) -> Unit) {
    val face by animateColorAsState(if (game.soon) hex("#a89a8a") else game.tint, tween(200), label = "juga")
    val ink = if (game.soon) hex("#4b4038") else hex(game.ink)
    var at by remember { mutableStateOf(Offset.Zero) }
    Box(modifier.fillMaxWidth().height(64.dp + 7.dp)) {
        Row(
            Modifier.fillMaxWidth().height(64.dp).onGloballyPositioned { at = it.centre() }
                .semantics { contentDescription = if (game.soon) "Aviat" else "Juga a ${game.title}" }
                .squash(7.dp, enabled = !game.soon) { play(at) }
                .drawBehind { chunkyFace(face, 22 * density, 7 * density) },
            horizontalArrangement = Arrangement.Center, verticalAlignment = Alignment.CenterVertically,
        ) {
            if (!game.soon) {
                Box(Modifier.size(24.dp).drawBehind {
                    drawPath(Path().apply { moveTo(size.width * 0.12f, 0f); lineTo(size.width, size.height / 2); lineTo(size.width * 0.12f, size.height); close() }, ink)
                })
                Spacer(Modifier.width(14.dp))
            }
            Label(if (game.soon) "AVIAT" else "JUGA", Fonts.baloo, 30.dp, ink, kern = 0.5.dp)
        }
    }
}

// Every game, four a row: a tap plays it.
@Composable
private fun GridCell(model: Launcher, game: Game, u: Dp) {
    val tag = if (game.id == model.last) "ÚLTIM" else if (game.isNew) "NOU" else null
    val shake = remember { Animatable(0f) }
    val scope = rememberCoroutineScope()
    val buzz = haptic()
    var at by remember { mutableStateOf(Offset.Zero) }
    Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Box(Modifier.size(u * 10, u * 12).offset { IntOffset((shake.value * 4.dp.toPx()).roundToInt(), 0) }) {
            Box(Modifier.onGloballyPositioned { at = it.centre() }
                .semantics { contentDescription = if (game.soon) "Aviat" else "Juga a ${game.title}" }
                .squash(3.dp) {
                    if (game.soon) {
                        buzz(REJECT)
                        scope.launch { shake.animateTo(if (shake.targetValue > 0.5f) 0f else 1f, spring(dampingRatio = 0.2f, stiffness = 987f)) }
                    } else model.play(game, at)
                }) { Cartridge(game, model.images[game.id], u) }
            if (tag != null) Tag(tag, tag == "NOU", Modifier.offset(-u * 0.35f - 4.dp, u * 2.4f))
            if (!game.soon) FavHeart(game.id in model.favs, 24.dp, Modifier.align(Alignment.TopEnd).offset(16.dp, -16.dp)) { model.toggleFav(game.id) }
        }
        // records come with reportBest (native-shell.md, «Also required»): until then, none
        Label(if (game.soon) " " else "Sense rècord", Fonts.balooBold, 12.dp, Palette.cream.copy(alpha = 0.75f))
    }
}

@Composable
private fun EmptyFavs(modifier: Modifier, showAll: () -> Unit) {
    Column(
        modifier.fillMaxWidth().drawBehind {
            val d = density
            drawRoundRect(Color.Black.copy(alpha = 0.45f), Offset(0f, 4 * d), size, CornerRadius(24 * d))
            drawRoundRect(hex("#26170d"), cornerRadius = CornerRadius(24 * d))
            drawRoundRect(Palette.cream.copy(alpha = 0.14f), Offset(d, d), Size(size.width - 2 * d, size.height - 2 * d), CornerRadius(23 * d), style = Stroke(2 * d))
        }.padding(start = 20.dp, end = 20.dp, top = 28.dp, bottom = 24.dp),
        horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Box(Modifier.size(72.dp).background(Palette.cream, RoundedCornerShape(36.dp)), contentAlignment = Alignment.Center) {
            Box(Modifier.size(40.dp).drawBehind { heart(null, Palette.red, 2.4f * density, floatArrayOf(4 * density, 3 * density)) })
        }
        Label("Encara no tens favorits", Fonts.baloo, 21.dp, Palette.cream)
        Label("Toca el cor d’un joc i el tindràs aquí, a mà.", Fonts.balooBold, 14.dp, Palette.cream.copy(alpha = 0.7f), center = true)
        Box(Modifier.padding(bottom = 4.dp).squash(4.dp, onClick = showAll).drawBehind { chunkyFace(Palette.cream, 14 * density, 4 * density) }
            .heightIn(min = 44.dp).padding(horizontal = 16.dp), contentAlignment = Alignment.Center) {
            Label("Mira tots els jocs", Fonts.baloo, 17.dp, Palette.brown)
        }
    }
}

// ---- Perfil: a placeholder until the native session and settings exist (phases 3-4); no stars
@Composable
private fun PerfilScreen() {
    Column(Modifier.fillMaxSize().padding(horizontal = M), verticalArrangement = Arrangement.spacedBy(16.dp)) {
        Row(Modifier.fillMaxWidth().padding(top = 8.dp).heightIn(min = 48.dp), verticalAlignment = Alignment.CenterVertically) {
            Label("Perfil", Fonts.baloo, 34.dp, Palette.cream)
            Spacer(Modifier.weight(1f))
            Box(Modifier.size(48.dp).plate(18.dp, dim = false).semantics { contentDescription = "Ajustos" }, contentAlignment = Alignment.Center) {
                Box(Modifier.size(22.dp).drawBehind { gear(Color.White) })
            }
        }
        Row(Modifier.padding(top = 12.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            listOf("Partides", "Jocs", "Dies jugats").forEach { label ->
                Column(
                    Modifier.weight(1f).height(64.dp).drawBehind {
                        val d = density
                        drawRoundRect(Color.Black.copy(alpha = 0.28f), Offset(0f, 3 * d), size, CornerRadius(20 * d))
                        drawRoundRect(Palette.bg, cornerRadius = CornerRadius(20 * d))
                        drawRoundRect(Palette.cream.copy(alpha = 0.13f), cornerRadius = CornerRadius(20 * d))
                    },
                    horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(4.dp, Alignment.CenterVertically),
                ) {
                    Label("—", Fonts.baloo, 22.dp, Palette.cream)
                    Label(label, Fonts.balooBold, 12.dp, Palette.cream.copy(alpha = 0.68f))
                }
            }
        }
    }
}

// ---- S2's floating tab bar: a plate with a yellow block that slides to the chosen tab; a swipe on the screens changes tab too
@Composable
private fun TabBar(model: Launcher, tabs: PagerState, modifier: Modifier) {
    val scope = rememberCoroutineScope()
    val buzz = haptic()
    val chosen = tabs.targetPage
    LaunchedEffect(chosen) { buzz(TICK) }
    val inner = 264.dp - 12.dp
    val off = 88.dp
    val on = inner - 4.dp - off
    val spring = spring<Dp>(dampingRatio = 0.7f, stiffness = 158f)
    val w0 by animateDpAsState(if (chosen == 0) on else off, spring, label = "w0")
    val w1 by animateDpAsState(if (chosen == 1) on else off, spring, label = "w1")
    val blockX by animateDpAsState(if (chosen == 0) 0.dp else off + 4.dp, spring, label = "bx")
    Box(modifier.size(264.dp, 68.dp).plate(26.dp, dim = false).padding(6.dp)) {
        Box(Modifier.offset(x = blockX).size(on, 56.dp).drawBehind { yellowBlock(20 * density) })
        Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
            listOf(0 to "Jocs", 1 to "Perfil").forEach { (k, label) ->
                val w = if (k == 0) w0 else w1
                Row(
                    Modifier.width(w).height(56.dp).semantics { selected = chosen == k; contentDescription = label }
                        .squash(2.dp, Role.Tab) { scope.launch { tabs.animateScrollToPage(k) } },
                    horizontalArrangement = Arrangement.spacedBy(8.dp, Alignment.CenterHorizontally), verticalAlignment = Alignment.CenterVertically,
                ) {
                    if (k == 0) Box(Modifier.size(36.dp).drawBehind { gameboy() })
                    else model.icon?.let { icon ->
                        Box(Modifier.size(36.dp).drawBehind {
                            drawRoundRect(Color.Black.copy(alpha = 0.4f), Offset(0f, 2 * density), size, CornerRadius(11 * density))
                        }) {
                            Image(icon, null, Modifier.fillMaxSize().clip(RoundedCornerShape(11.dp)).border(2.dp, Palette.cream, RoundedCornerShape(11.dp)))
                        }
                    }
                    if (chosen == k) Label(label, Fonts.baloo, 16.dp, Palette.brown)
                }
            }
        }
    }
}
