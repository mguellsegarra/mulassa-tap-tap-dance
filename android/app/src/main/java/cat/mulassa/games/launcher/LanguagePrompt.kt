package cat.mulassa.games.launcher

import android.content.Context
import android.content.res.Configuration
import android.content.res.Resources
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.navigationBars
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import java.util.Locale

// The app's language: Catalan until the player picks another, never the device's (the web's rule). Kept here and applied
// to the launcher's resources (LauncherActivity.attachBaseContext); the games get it from GameSession. On the first run
// only, the web's suggestion (src/ui/lang-rules.js) over the home; later, one step of the first-run onboarding.
object AppLanguage {
    const val BASE = "ca"
    const val KEY = "ui-language-v1"
    private const val SEEN = "ui-language-suggested"
    // The web's tip, word for word (lang-rules.js SUGGEST): in the language suggested, which the launcher has not loaded.
    val words = mapOf(
        "es" to Triple("¿Prefieres jugar en castellano?", "Sí", "Continuar en català"),
        "en" to Triple("Would you like to play in English?", "Yes", "Continue in Catalan"),
    )

    var code = BASE; private set
    var suggested by mutableStateOf<String?>(null) // the language the prompt offers, while it is up
    var firstRun = false; private set // no language saved yet: the app has never run (the onboarding's flag)
    private var loaded = false

    fun load(ctx: Context) {
        if (loaded) return
        loaded = true
        val prefs = prefs(ctx)
        val saved = prefs.getString(KEY, null)
        firstRun = saved == null
        code = saved ?: BASE
        // the system's list, not this app's resources (which the launcher sets to `code`)
        val device = Resources.getSystem().configuration.locales.let { l -> List(l.size()) { l[it].toLanguageTag() } }
        // shortcut: the released list is Catalan plus the languages with a suggestion text, all the rule needs
        suggested = suggestion(device, saved, prefs.getBoolean(SEEN, false), listOf(BASE) + words.keys)
        if (firstRun) prefs.edit().putString(KEY, BASE).apply()
    }

    // lang-rules.js suggestion(): no saved choice and not seen before; the device's first language is a released one
    // other than Catalan, with a suggestion text, and Catalan is nowhere in its list.
    fun suggestion(languages: List<String>, saved: String?, seen: Boolean, released: List<String>): String? {
        if (saved != null || seen || released.size < 2) return null
        val tags = languages.map { it.lowercase().substringBefore('-') }
        val first = tags.firstOrNull() ?: return null
        return first.takeIf { BASE !in tags && it != BASE && it in released && it in words }
    }

    // The launcher's resources in the chosen language.
    fun wrap(base: Context): Context {
        load(base)
        val config = Configuration(base.resources.configuration).apply { setLocale(Locale.forLanguageTag(code)) }
        return base.createConfigurationContext(config)
    }

    // Saved, then `restart` redraws the launcher in it (Activity.recreate: no splash, the home as it was).
    fun answer(ctx: Context, yes: Boolean, restart: () -> Unit) {
        val next = suggested?.takeIf { yes }
        suggested = null
        prefs(ctx).edit().putBoolean(SEEN, true).apply { if (next != null) putString(KEY, next) }.apply()
        if (next != null) { code = next; restart() }
    }

    // Before the page's own scripts: the web reads its language from here (native-shell.md, contract 4).
    fun script() = "try{localStorage.setItem('ui-language-v1','$code')}catch(e){}"

    private fun prefs(ctx: Context) = ctx.getSharedPreferences("launcher", Context.MODE_PRIVATE)
}

private val brown = Color(0xFF3A2208)
private val yellowLo = Color(0xFFB47D07)

// The suggestion, the web's tip in the app's look: a card at the foot of the home over a dim, once the splash is gone.
@Composable
fun LanguagePrompt(ready: Boolean, restart: () -> Unit) {
    val code = AppLanguage.suggested
    val words = code?.let { AppLanguage.words[it] }
    val ctx = androidx.compose.ui.platform.LocalContext.current
    val shown = ready && words != null
    var last by remember { mutableStateOf(words) } // kept while it leaves
    if (words != null) last = words
    AnimatedVisibility(shown, enter = fadeIn(), exit = fadeOut()) {
        Box(Modifier.fillMaxSize().background(Color.Black.copy(alpha = 0.32f)).clickable(remember { MutableInteractionSource() }, null) {})
    }
    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.BottomCenter) {
        AnimatedVisibility(shown, enter = slideInVertically { it } + fadeIn(), exit = slideOutVertically { it } + fadeOut()) {
            val (text, yes, no) = last ?: return@AnimatedVisibility
            val shape = RoundedCornerShape(28.dp)
            Column(Modifier.windowInsetsPadding(WindowInsets.navigationBars).padding(M).fillMaxWidth()
                .background(brown, shape).border(2.dp, Palette.yellow, shape).padding(20.dp),
                verticalArrangement = Arrangement.spacedBy(M), horizontalAlignment = Alignment.CenterHorizontally) {
                Label(text, Fonts.baloo, 22.dp, Palette.cream, center = true)
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Choice(yes, primary = true) { AppLanguage.answer(ctx, true, restart) }
                    Choice(no, primary = false) { AppLanguage.answer(ctx, false, restart) }
                }
            }
        }
    }
}

@Composable
private fun Choice(text: String, primary: Boolean, onClick: () -> Unit) {
    val shape = RoundedCornerShape(16.dp)
    Box(Modifier.fillMaxWidth().squash(3.dp, onClick = onClick)) {
        if (primary) Box(Modifier.matchParentSize().offset(y = 3.dp).background(yellowLo, shape)) // the hard drop edge
        Box(Modifier.fillMaxWidth().heightIn(min = 52.dp)
            .background(if (primary) Palette.yellow else Palette.cream.copy(alpha = 0.08f), shape)
            .then(if (primary) Modifier else Modifier.border(1.5.dp, Palette.cream.copy(alpha = 0.14f), shape)),
            contentAlignment = Alignment.Center) {
            Label(text, Fonts.baloo, 19.dp, if (primary) Palette.ink else Palette.cream, center = true)
        }
    }
}
