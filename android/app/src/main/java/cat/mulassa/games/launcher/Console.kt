package cat.mulassa.games.launcher

import android.content.Context
import android.media.AudioAttributes
import android.media.SoundPool
import android.os.Build
import android.view.HapticFeedbackConstants
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.unit.Dp
import cat.mulassa.games.R

// Ronda 26's console, D4 «Gravat» (design/mulassa-games/app-home/ronda-25/astra-d): two layers on one 1064×1478 canvas,
// the shell with its bay under the cartridge and the raised panel over it. Measured on the canvas, in its pixels:
object Bay {
    const val W = 1064f; const val H = 1478f
    const val SHOW = 0.4845f // of the screen's width, the console's part above the bottom edge (D4-open)
    const val WIDTH = 0.3267f / 393 * W // the canvas's width, of the screen's (D4-open: 393 wide)
    const val SHOWN = SHOW / WIDTH * W // the part above the bottom edge, in canvas pixels (582.8)
    const val U = 615f / CART_W // the seated cartridge's u
    const val SEAT = 17f // the seated cartridge's top: level with the shoulders' (the owner: nothing sticks out)
    const val MOUTH = 341f // the panel's top edge, where the cartridge slides under it
    const val CENTRE = 532.5f // the bay's middle
    val LED = Offset(100.7f, 132.7f); const val LED_R = 13f
}

// The shell, under the cartridge.
@Composable
fun ConsoleShell(w: Dp, h: Dp, modifier: Modifier) =
    Image(painterResource(R.drawable.console_d4), null, modifier.size(w, h), contentScale = ContentScale.FillBounds)

// The panel over the cartridge, and the LED: amber once the cartridge is seated, `led` from 0 to 1.
@Composable
fun ConsolePanel(w: Dp, h: Dp, led: () -> Float, modifier: Modifier) = Box(modifier.size(w, h)) {
    Image(painterResource(R.drawable.console_d4_panel), null, Modifier.size(w, h), contentScale = ContentScale.FillBounds)
    Box(Modifier.size(w, h).drawBehind {
        val a = led(); if (a <= 0f) return@drawBehind
        val k = size.width / Bay.W; val c = Bay.LED * k; val r = Bay.LED_R * k
        drawCircle(Brush.radialGradient(0f to AMBER.copy(alpha = 0.55f * a), 1f to AMBER.copy(alpha = 0f), center = c, radius = r * 3.2f), r * 3.2f, c)
        drawCircle(Brush.radialGradient(0f to Color(0xFFFFF2C4), 0.45f to AMBER, 1f to Color(0xFFC8780A), center = c, radius = r), r, c, alpha = a)
    })
}
private val AMBER = Color(0xFFFFB02E)

val CONFIRM = if (Build.VERSION.SDK_INT >= 30) HapticFeedbackConstants.CONFIRM else HapticFeedbackConstants.VIRTUAL_KEY

// The console's four short sounds (ronda 26's NOTES: click 18 ms, thunk 55 ms, two rising notes, buzz 65 ms), loaded once
// into a SoundPool; silent when Ajustos' «So» is off.
class ConsoleSounds(ctx: Context, private val on: () -> Boolean) {
    private val pool = SoundPool.Builder().setMaxStreams(2).setAudioAttributes(AudioAttributes.Builder()
        .setUsage(AudioAttributes.USAGE_ASSISTANCE_SONIFICATION).setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build()).build()
    val click = pool.load(ctx, R.raw.console_click, 1); val thunk = pool.load(ctx, R.raw.console_thunk, 1)
    val boot = pool.load(ctx, R.raw.console_boot, 1); val buzz = pool.load(ctx, R.raw.console_buzz, 1)
    fun play(id: Int) { if (on()) pool.play(id, 1f, 1f, 1, 0, 1f) }
    fun release() = pool.release()
}

@Composable
fun rememberConsoleSounds(model: Launcher): ConsoleSounds {
    val ctx = LocalContext.current
    val s = remember { ConsoleSounds(ctx) { model.sound } }
    DisposableEffect(s) { onDispose { s.release() } }
    return s
}
