package cat.mulassa.games.launcher

import android.content.Intent
import android.content.pm.ActivityInfo
import android.graphics.Color as AndroidColor
import android.os.Bundle
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
    // also delivered to a launcher rebuilt after process death, with the game's id and origin in the result
    private val game = registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { comeBack(it.data) }

    override fun onCreate(savedInstanceState: Bundle?) {
        installSplashScreen()
        enableEdgeToEdge(SystemBarStyle.dark(AndroidColor.TRANSPARENT), SystemBarStyle.dark(AndroidColor.TRANSPARENT))
        super.onCreate(savedInstanceState)
        if (resources.configuration.smallestScreenWidthDp < 600) requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_PORTRAIT
        model = Launcher(this)
        model.load()
        model.play = ::play
        val version = packageManager.getPackageInfo(packageName, 0).versionName ?: ""
        setContent {
            Box(Modifier.fillMaxSize()) {
                LauncherRoot(model, version)
                IrisView(iris)
            }
        }
    }

    private fun play(game: Game, from: Offset) {
        val path = game.path
        if (busy || game.soon || !WebBundle.isEntryPath(path)) return
        busy = true
        model.played(game.id)
        iris.game = game
        iris.image = model.images[game.id]
        iris.origin = from // the window is edge to edge: window coordinates are the screen's
        lifecycleScope.launch(AndroidUiDispatcher.Main) { // the animations need its frame clock
            bars(false) // the iris covers the whole screen, as on iOS
            iris.forward()
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
