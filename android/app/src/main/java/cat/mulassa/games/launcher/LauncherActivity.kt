package cat.mulassa.games.launcher

import android.content.Context
import android.content.Intent
import android.content.pm.ActivityInfo
import android.content.pm.ApplicationInfo
import android.graphics.Color as AndroidColor
import android.os.Bundle
import android.provider.Settings
import androidx.activity.ComponentActivity
import androidx.activity.SystemBarStyle
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.platform.AndroidUiDispatcher
import androidx.core.app.ActivityOptionsCompat
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.lifecycle.lifecycleScope
import cat.mulassa.games.MainActivity
import kotlinx.coroutines.launch

// The app's entry and the task's root (docs/app/native-shell.md, «Navigation»): the Compose launcher. A game opens in the
// bridge activity (MainActivity) on top of it, under the iris; leaving the game finishes that activity, and the launcher
// plays the reverse iris. Not kept warm below the launcher as iOS does: a stopped activity under the root makes Android
// start a second launcher over it when the app's icon is tapped.
class LauncherActivity : ComponentActivity() {
    private lateinit var model: Launcher
    private val iris = IrisState()
    private var busy = false
    private var splash by mutableStateOf(false)
    // also delivered to a launcher rebuilt after process death, with the game's id and origin in the result
    private val game = registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { comeBack(it.data) }

    override fun attachBaseContext(base: Context) = super.attachBaseContext(AppLanguage.wrap(base)) // Catalan unless chosen

    override fun onCreate(savedInstanceState: Bundle?) {
        val system = installSplashScreen()
        // A fresh launcher (not one rebuilt after process death, which comes back from a game): the system splash's rest pose
        // goes on walking in Splash.kt. Its first frame draws the same picture, so the system's is removed with no animation.
        splash = savedInstanceState == null
        if (splash) system.setOnExitAnimationListener { it.remove() }
        enableEdgeToEdge(SystemBarStyle.dark(AndroidColor.TRANSPARENT), SystemBarStyle.dark(AndroidColor.TRANSPARENT))
        super.onCreate(savedInstanceState)
        if (resources.configuration.smallestScreenWidthDp < 600) requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_PORTRAIT
        model = Launcher(this)
        model.load()
        model.play = ::play
        val version = packageManager.getPackageInfo(packageName, 0).versionName ?: ""
        // debug builds only: `--ef hour 21.5` fixes the sky to preview an hour
        val hour = intent.getFloatExtra("hour", -1f).takeIf { it >= 0 && applicationInfo.flags and ApplicationInfo.FLAG_DEBUGGABLE != 0 }
        // debug builds only: `--es tilt 0.9,-0.6` holds a lean (Motion.kt), for captures on an emulator
        if (applicationInfo.flags and ApplicationInfo.FLAG_DEBUGGABLE != 0) intent.getStringExtra("tilt")?.split(",")?.mapNotNull { it.toFloatOrNull() }?.takeIf { it.size == 2 }?.let { Tilt.hold(it[0], it[1]) }
        model.arrived = !splash
        setContent {
            Box(Modifier.fillMaxSize()) {
                LauncherRoot(model, version, hour)
                // LanguagePrompt(ready = !splash) { recreate() } waits for the first-run onboarding (owner, 25 Nov 2026)
                IrisView(iris)
                if (splash) Splash(still = Settings.Global.getFloat(contentResolver, Settings.Global.ANIMATOR_DURATION_SCALE, 1f) == 0f) { splash = false; model.arrived = true }
            }
        }
    }

    // the phone's lean (Motion.kt), only while the launcher is in front: a game on top pauses it
    @Suppress("DEPRECATION") // defaultDisplay: the activity's own display, on every API level the app runs on
    override fun onResume() { super.onResume(); Tilt.start(this) { windowManager.defaultDisplay.rotation } }
    override fun onPause() { Tilt.stop(); super.onPause() }

    private var back: Offset? = null // where the reverse iris closes: the grid slot of the cartridge that opened the game

    private fun play(game: Game, from: Offset) {
        val path = game.path
        if (busy || game.soon || !WebBundle.isEntryPath(path)) return
        busy = true
        iris.game = game
        iris.image = model.images[game.id]
        iris.origin = from // the window is edge to edge: window coordinates are the screen's
        lifecycleScope.launch(AndroidUiDispatcher.Main) { // the animations need its frame clock
            bars(false) // the iris covers the whole screen, as on iOS
            iris.forward()
            // the game comes back to the grid: the reverse iris closes on the cartridge's slot. Kept apart until then: moving
            // the open iris's centre now made its rays jump across the screen on the hand-over frame
            back = model.pick?.at ?: from
            model.pick = null
            this@LauncherActivity.game.launch(
                Intent(this@LauncherActivity, MainActivity::class.java)
                    .putExtra(GameSession.PATH, path).putExtra(GameSession.ID, game.id)
                    .putExtra(GameSession.X, from.x).putExtra(GameSession.Y, from.y),
                ActivityOptionsCompat.makeCustomAnimation(this@LauncherActivity, 0, 0),
            )
        }
    }

    // Mulassa.exitToLauncher() or back from the game's root: the reverse iris, from the screen the game covered.
    private fun comeBack(data: Intent?) {
        model.load() // a live update applied in the game switched the bundle
        val id = data?.getStringExtra(GameSession.ID) ?: iris.game?.id
        val game = model.games.firstOrNull { it.id == id }
        if (game == null) { iris.game = null; busy = false; bars(true); return }
        if (iris.game?.id != game.id) { // the launcher was rebuilt meanwhile (process death)
            iris.game = game
            iris.image = model.images[game.id]
            iris.origin = Offset(data?.getFloatExtra(GameSession.X, 0f) ?: 0f, data?.getFloatExtra(GameSession.Y, 0f) ?: 0f)
        }
        back?.let { iris.origin = it; back = null }
        busy = true
        lifecycleScope.launch(AndroidUiDispatcher.Main) {
            bars(false)
            iris.backward()
            bars(true)
            busy = false
        }
    }

    private fun bars(show: Boolean) = WindowCompat.getInsetsController(window, window.decorView).run {
        systemBarsBehavior = WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
        if (show) show(WindowInsetsCompat.Type.statusBars()) else hide(WindowInsetsCompat.Type.statusBars())
    }
}
