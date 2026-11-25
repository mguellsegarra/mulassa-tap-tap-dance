package cat.mulassa.games.launcher

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

// The web's rules (src/ui/lang-rules.js suggestion()), as the app applies them on the first run.
class LanguageSuggestionTest {
    private val released = listOf("ca", "es", "en")
    private fun suggest(vararg langs: String, saved: String? = null, seen: Boolean = false) =
        AppLanguage.suggestion(langs.toList(), saved, seen, released)

    @Test fun firstLanguageWithATextIsSuggested() {
        assertEquals("en", suggest("en-US", "es-ES"))
        assertEquals("es", suggest("es-ES"))
    }

    @Test fun catalanAnywhereInTheListMeansNoSuggestion() {
        assertNull(suggest("en-US", "ca-ES"))
        assertNull(suggest("ca-ES"))
    }

    @Test fun aSavedChoiceOrASeenPromptMeansNoSuggestion() {
        assertNull(suggest("en-US", saved = "ca"))
        assertNull(suggest("en-US", seen = true))
    }

    @Test fun onlyTheFirstLanguageCountsAndItNeedsAText() {
        assertNull(suggest("fr-FR", "en-US"))
        assertNull(suggest())
        assertNull(AppLanguage.suggestion(listOf("en-US"), null, false, listOf("ca")))
    }
}
