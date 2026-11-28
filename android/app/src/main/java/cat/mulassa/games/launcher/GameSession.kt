package cat.mulassa.games.launcher

import android.content.Intent
import android.os.Bundle
import android.view.ViewGroup
import android.webkit.WebView
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.platform.ComposeView
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.tween
import com.getcapacitor.BridgeActivity
import com.getcapacitor.CapConfig
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.WebViewListener
import com.getcapacitor.annotation.CapacitorPlugin
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withTimeoutOrNull
import kotlinx.coroutines.flow.first
import androidx.compose.runtime.snapshotFlow
import java.io.File
import org.json.JSONObject
import androidx.webkit.WebViewCompat
import androidx.webkit.WebViewFeature
import androidx.activity.enableEdgeToEdge

// The game's side of the bridge activity (MainActivity.java delegates to it): which page it opens, the iris kept over the
// page while it loads, and the way back to the launcher.
class GameSession(private val activity: BridgeActivity) {
    private var path = "/index.html"
    private var id: String? = null
    private var origin = Offset.Zero
    private var loaded by mutableStateOf(0) // pages finished loading, counted
    private var cover: ComposeView? = null

    // The bridge's configuration: the app's own, starting at the game's page (a live update reloads the page it was on:
    // keepUrlPathAfterReload in capacitor.config.json) and without the web splash: the iris covers the start.
    fun config(intent: Intent, saved: Bundle?): CapConfig {
        read(saved ?: intent.extras)
        val json = JSONObject(activity.assets.open("capacitor.config.json").use { it.readBytes().decodeToString() })
        json.optJSONObject("server")?.put("appStartPath", path) ?: json.put("server", JSONObject().put("appStartPath", path))
        val plugins = json.optJSONObject("plugins") ?: JSONObject().also { json.put("plugins", it) }
        (plugins.optJSONObject("SplashScreen") ?: JSONObject().also { plugins.put("SplashScreen", it) }).put("launchShowDuration", 0)
        // Ronda 34: on a WebView that reads the window's insets itself (140+, with the pages' viewport-fit=cover), Capacitor's
        // SystemBars padded the decor view until the page had loaded and then dropped the padding: the page and the iris over
        // it jumped by the bars' height. Untouched insets from the first frame instead; older WebViews keep the padding.
        if (webViewMajor() >= 140) (plugins.optJSONObject("SystemBars") ?: JSONObject().also { plugins.put("SystemBars", it) }).put("insetsHandling", "disable")
        val dir = File(activity.noBackupFilesDir, "bridge").apply { mkdirs() }
        File(dir, "capacitor.config.json").writeText(json.toString())
        return CapConfig.loadFromFile(activity, dir.path)
    }

    private fun webViewMajor() = WebViewCompat.getCurrentWebViewPackage(activity)?.versionName?.substringBefore('.')?.toIntOrNull() ?: 0

    // Before the bridge draws anything: edge to edge as the launcher, and the status bar hidden for good, as the launcher's
    // iris left it and as the page asks (plassa native.js); showing it again under the game moved the page by its height.
    fun window() {
        activity.enableEdgeToEdge(androidx.activity.SystemBarStyle.dark(android.graphics.Color.TRANSPARENT), androidx.activity.SystemBarStyle.dark(android.graphics.Color.TRANSPARENT))
        hideStatusBar()
    }

    private fun hideStatusBar() {
        androidx.core.view.WindowCompat.getInsetsController(activity.window, activity.window.decorView).run {
            systemBarsBehavior = androidx.core.view.WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
            hide(androidx.core.view.WindowInsetsCompat.Type.statusBars())
        }
    }

    private fun read(extras: Bundle?) {
        val p = extras?.getString(PATH)
        if (WebBundle.isEntryPath(p)) path = p!!
        id = extras?.getString(ID)
        origin = Offset(extras?.getFloat(X) ?: 0f, extras?.getFloat(Y) ?: 0f)
    }

    fun attach() {
        // Capacitor's SystemBars shows every bar as it loads (its `hidden` config, false, posted to the main thread): hidden
        // again right after it, before the first frame, or the status bar blinked over the iris
        activity.window.decorView.post { hideStatusBar() }
        tellShell()
        activity.bridge?.addWebViewListener(object : WebViewListener() {
            override fun onPageLoaded(webView: WebView?) { loaded++ }
        })
        showCover()
    }

    // The launcher's settings are the game's too (native-shell.md, contract 4): its language and music saved where the web reads
    // them (ui-language-v1, menu-music) before any of the page's scripts run, on the bridge's own origin, and what it covers, so
    // the game hides those rows and buttons (plassa native.js). The page is only requested so far: this lands first.
    // shortcut: a WebView without document-start scripts (before Chrome 89-ish) keeps the web's own choices and rows.
    private fun tellShell() {
        val web = activity.bridge?.webView ?: return
        if (!WebViewFeature.isFeatureSupported(WebViewFeature.DOCUMENT_START_SCRIPT)) return
        AppLanguage.load(activity)
        val url = android.net.Uri.parse(activity.bridge.appUrl)
        WebViewCompat.addDocumentStartJavaScript(web, LauncherShell.script(activity), setOf("${url.scheme}://${url.authority}"))
    }

    fun save(out: Bundle) {
        out.putString(PATH, path); out.putString(ID, id); out.putFloat(X, origin.x); out.putFloat(Y, origin.y)
    }

    // Back to the launcher (below in the task): it plays the reverse iris from the result. Finishing the activity stops the
    // page with its music and frames.
    fun exitToLauncher() {
        if (activity.isFinishing) return
        activity.setResult(android.app.Activity.RESULT_OK, Intent().putExtra(ID, id).putExtra(X, origin.x).putExtra(Y, origin.y))
        if (android.os.Build.VERSION.SDK_INT >= 34) activity.overrideActivityTransition(android.app.Activity.OVERRIDE_TRANSITION_CLOSE, 0, 0)
        activity.finish()
        @Suppress("DEPRECATION") activity.overridePendingTransition(0, 0)
    }

    // The iris, fully open, over the page until it has loaded (at most 3 s), so the web view's start never shows.
    private fun showCover() {
        val (bundle, games) = WebBundle.games(activity, WebBundle.active(activity))
        val game = games.firstOrNull { it.id == id } ?: return
        val state = IrisState(opened = true).apply { this.game = game; image = bundle.image(activity, game.art); this.origin = this@GameSession.origin }
        cover?.let { (it.parent as? ViewGroup)?.removeView(it) }
        val from = loaded
        val view = ComposeView(activity)
        cover = view
        view.setContent {
            val fade = androidx.compose.runtime.remember { Animatable(1f) }
            val at = IntArray(2).also { view.getLocationOnScreen(it) }
            Box(Modifier.fillMaxSize().graphicsLayer { alpha = fade.value }) { IrisView(state, Offset(at[0].toFloat(), at[1].toFloat())) }
            LaunchedEffect(Unit) {
                state.hop = true
                withTimeoutOrNull(3000) { snapshotFlow { loaded }.first { it > from }; delay(200) }
                fade.animateTo(0f, tween(250))
                (view.parent as? ViewGroup)?.removeView(view)
                if (cover === view) cover = null
            }
        }
        activity.addContentView(view, ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT))
    }

    companion object {
        const val PATH = "game-path"
        const val ID = "game-id"
        const val X = "game-x"
        const val Y = "game-y"
    }
}

// What the launcher hands every game (native-shell.md, contract 4): its language, music, UI sound and vibration, and what it
// covers. Before the page's scripts (GameSession.tellShell) or, on a WebView without document-start scripts, through the bridge.
object LauncherShell {
    private val COVERS = listOf("language", "music")
    fun data(ctx: android.content.Context): JSObject {
        val prefs = ctx.getSharedPreferences("launcher", android.content.Context.MODE_PRIVATE)
        AppLanguage.load(ctx)
        return JSObject().put("language", AppLanguage.code).put("music", prefs.getBoolean("music", true))
            .put("sound", prefs.getBoolean("sound", true)).put("vibration", prefs.getBoolean("vibration", true))
            .put("covers", JSArray(COVERS))
    }
    fun script(ctx: android.content.Context): String {
        val d = data(ctx)
        return AppLanguage.script() + "try{localStorage.setItem('menu-music','${if (d.getBool("music") == true) "on" else "off"}')}catch(e){}" +
            "window.__mulassaShell=$d;"
    }
}

// The launcher's side of the bridge: a game's way out (plassa/native.js exitGame) returns to it; the snapshot again for a
// WebView that ran no document-start script (plassa/native.js applyShell).
@CapacitorPlugin(name = "Mulassa")
class MulassaPlugin : Plugin() {
    interface Host { fun exitToLauncher() }

    @PluginMethod
    fun bootstrap(call: PluginCall) = call.resolve(LauncherShell.data(context))

    @PluginMethod
    fun exitToLauncher(call: PluginCall) {
        activity.runOnUiThread { (activity as? Host)?.exitToLauncher() }
        call.resolve()
    }
}
