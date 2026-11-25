package cat.mulassa.games.launcher

import android.content.Context
import android.graphics.BitmapFactory
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.core.content.pm.PackageInfoCompat
import cat.mulassa.games.R
import java.io.File
import java.io.InputStream
import org.json.JSONObject

// The games catalogue (docs/app/native-shell.md, contract 6), read from the web bundle the game bridge serves: a live
// update brings new games and art without a store release.
data class Game(
    val id: String,
    val soon: Boolean,
    val path: String?,
    val isNew: Boolean,
    val name: Map<String, String?>,
    val short: String?,
    val color: String,
    val ink: String,
    val category: String?,
    val art: String,
) {
    // shortcut: Catalan only, until the launcher follows the app's language (native settings, phase 4)
    val title: String get() = name["ca"] ?: id
    val tint: Color get() = hex(color)
}

// A web bundle: Capgo's downloaded folder, or the app's own copy in the APK's assets (`public/`).
class WebBundle(val dir: File?) {
    fun open(ctx: Context, path: String): InputStream? = runCatching {
        val rel = path.trimStart('/')
        if (dir != null) File(dir, rel).inputStream() else ctx.assets.open("public/$rel")
    }.getOrNull()

    fun image(ctx: Context, path: String): ImageBitmap? =
        open(ctx, path)?.use { BitmapFactory.decodeStream(it) }?.asImageBitmap()

    // Where the bridge loads files from, as Capacitor itself decides (Bridge.java): Capgo's last `set()` bundle, unless the
    // app binary changed since (then the bridge ignores it and Capgo resets).
    companion object {
        const val BRIDGE_VERSION = 1

        fun active(ctx: Context): WebBundle {
            val prefs = ctx.getSharedPreferences("CapWebViewSettings", Context.MODE_PRIVATE)
            val info = ctx.packageManager.getPackageInfo(ctx.packageName, 0)
            val sameBinary = prefs.getString("lastBinaryVersionCode", null) == PackageInfoCompat.getLongVersionCode(info).toInt().toString() &&
                prefs.getString("lastBinaryVersionName", null) == (info.versionName ?: "")
            val path = prefs.getString("serverBasePath", null)
            return if (sameBinary && !path.isNullOrEmpty() && path != "public" && File(path).isDirectory) WebBundle(File(path)) else WebBundle(null)
        }

        // Games the shell can show; an unreadable or too-new catalogue reads as the app's own copy.
        fun games(ctx: Context, active: WebBundle): Pair<WebBundle, List<Game>> {
            for (b in listOf(active, WebBundle(null)).distinctBy { it.dir }) {
                val games = runCatching { parse(b.open(ctx, "/catalogue.json")!!.use { it.readBytes().decodeToString() }) }.getOrNull() ?: continue
                return b to games
            }
            return WebBundle(null) to emptyList()
        }

        fun parse(json: String): List<Game>? {
            val file = JSONObject(json)
            if (file.getInt("schema") != 1 || file.getInt("minBridge") > BRIDGE_VERSION) return null
            val arr = file.getJSONArray("games")
            return (0 until arr.length()).map { i ->
                val g = arr.getJSONObject(i)
                val names = g.getJSONObject("name")
                Game(
                    id = g.getString("id"),
                    soon = g.optBoolean("soon"),
                    path = if (g.isNull("path")) null else g.optString("path"),
                    isNew = g.optBoolean("isNew"),
                    name = names.keys().asSequence().associateWith { if (names.isNull(it)) null else names.getString(it) },
                    short = if (g.isNull("short")) null else g.optString("short"),
                    color = g.getString("color"),
                    ink = g.getString("ink"),
                    category = if (g.isNull("category")) null else g.optString("category"),
                    art = g.getString("art"),
                )
            }.filter { it.soon || isEntryPath(it.path) }
        }

        // A game opens only at a page inside the bundle: never another origin or a path that climbs out of it.
        fun isEntryPath(path: String?): Boolean {
            if (path == null || !path.startsWith("/") || path.startsWith("//") || !path.endsWith(".html") || ".." in path) return false
            return path.all { it.code < 128 && (it.isLetterOrDigit() || it in "/._-") }
        }
    }
}

fun hex(s: String): Color = Color(0xFF000000 or (s.drop(1).toLongOrNull(16) ?: 0))

// CSS color-mix(in srgb, self (1 - t), other t)
fun Color.mix(other: Color, t: Float) = Color(red + (other.red - red) * t, green + (other.green - green) * t, blue + (other.blue - blue) * t)

object Palette {
    val cream = hex("#fff3d6")
    val ink = hex("#2a1608")
    val yellow = hex("#f5c518")
    val yellowHi = hex("#ffe26a")
    val pink = hex("#ff7ac8")
}

// The game's own faces (public/fonts), as static TTF instances: Android cannot load the web's woff2.
object Fonts {
    val baloo = FontFamily(Font(R.font.baloo_extrabold, FontWeight.ExtraBold))
    val balooBold = FontFamily(Font(R.font.baloo_bold, FontWeight.Bold))
    val pixel = FontFamily(Font(R.font.jersey))
}
