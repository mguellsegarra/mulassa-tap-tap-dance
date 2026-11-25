import SwiftUI

// The app's language: the system's per-app setting (AppleLanguages in the app's own defaults, what iOS Settings › Mulassa
// Games › Language writes), Catalan until the player picks another, never the device's. On the first run only, the web's
// suggestion (src/ui/lang-rules.js) over the home; later, one step of the first-run onboarding.
@MainActor final class AppLanguage: ObservableObject {
    static let shared = AppLanguage()
    static let base = "ca", suggestedKey = "ui-language-suggested"
    // The web's tip, word for word (lang-rules.js SUGGEST): in the language suggested, which the launcher has not loaded.
    static let words: [String: (text: String, yes: String, no: String)] = [
        "es": ("¿Prefieres jugar en castellano?", "Sí", "Continuar en català"),
        "en": ("Would you like to play in English?", "Yes", "Continue in Catalan"),
    ]

    @Published private(set) var code: String
    @Published var suggested: String? // the language the prompt offers, while it is up
    let firstRun: Bool // no language saved at launch: the app has never run (the onboarding's flag)

    private init() {
        let defaults = UserDefaults.standard
        let saved = (defaults.persistentDomain(forName: Bundle.main.bundleIdentifier ?? "")?["AppleLanguages"] as? [String])?.first
        let released = Bundle.main.localizations.filter { $0 != "Base" }
        firstRun = saved == nil
        code = saved.flatMap { s in released.first { s.lowercased().hasPrefix($0.lowercased()) } } ?? Self.base
        // read before Catalan is saved below: until then Locale.preferredLanguages is the device's list
        suggested = Self.suggestion(languages: Locale.preferredLanguages, saved: saved, seen: defaults.bool(forKey: Self.suggestedKey), released: released)
        if firstRun { defaults.set([Self.base], forKey: "AppleLanguages") }
        ChosenBundle.use(code)
    }

    // lang-rules.js suggestion(): no saved choice and not seen before; the device's first language is a released one
    // other than Catalan, with a suggestion text, and Catalan is nowhere in its list.
    nonisolated static func suggestion(languages: [String], saved: String?, seen: Bool, released: [String]) -> String? {
        if saved != nil || seen || released.count < 2 { return nil }
        let tags = languages.map { String($0.lowercased().split(separator: "-").first ?? "") }
        guard let first = tags.first, !tags.contains(base), first != base, released.contains(first), words[first] != nil else { return nil }
        return first
    }

    func answer(_ yes: Bool) {
        UserDefaults.standard.set(true, forKey: Self.suggestedKey)
        if yes, let next = suggested { set(next) }
        suggested = nil
    }

    func set(_ next: String) {
        UserDefaults.standard.set([next], forKey: "AppleLanguages")
        ChosenBundle.use(next)
        code = next
    }
}

// Bundle.main settles its language once, at launch; this keeps its strings (Text, Bundle.main.localizedString; String(localized:) skips it) and
// preferredLocalizations on the chosen one, so a choice applies without a restart.
private final class ChosenBundle: Bundle, @unchecked Sendable {
    nonisolated(unsafe) static var strings: Bundle?
    nonisolated(unsafe) static var code = ""

    static func use(_ code: String) {
        if Bundle.main.preferredLocalizations.first == code, strings == nil { return } // the system already picked it
        Self.code = code
        strings = Bundle.main.path(forResource: code, ofType: "lproj").flatMap(Bundle.init(path:))
        object_setClass(Bundle.main, ChosenBundle.self)
    }

    override func localizedString(forKey key: String, value: String?, table: String?) -> String {
        Self.strings?.localizedString(forKey: key, value: value, table: table) ?? super.localizedString(forKey: key, value: value, table: table)
    }
    override var preferredLocalizations: [String] { Self.strings == nil ? super.preferredLocalizations : [Self.code] }
}

// The suggestion, the web's tip in the app's look: a card at the foot of the home over a dim, after the splash.
struct LanguagePrompt: View {
    @ObservedObject var language = AppLanguage.shared
    @State private var up = false

    var body: some View {
        ZStack(alignment: .bottom) {
            if up, let code = language.suggested, let words = AppLanguage.words[code] {
                Color.black.opacity(0.32).ignoresSafeArea().transition(.opacity).accessibilityHidden(true)
                VStack(spacing: M) {
                    Text(verbatim: words.text).font(.baloo(22)).foregroundStyle(Palette.cream).multilineTextAlignment(.center)
                        .fixedSize(horizontal: false, vertical: true)
                    VStack(spacing: 10) {
                        Button { language.answer(true) } label: { label(words.yes, primary: true) }
                        Button { language.answer(false) } label: { label(words.no, primary: false) }
                    }
                    .buttonStyle(Squash(depth: 3))
                }
                .environment(\.locale, Locale(identifier: code))
                .padding(20)
                .background(RoundedRectangle(cornerRadius: 28).fill(Palette.brown))
                .overlay(RoundedRectangle(cornerRadius: 28).strokeBorder(Color(Palette.yellow), lineWidth: 2))
                .padding(M)
                .accessibilityAddTraits(.isModal)
                .transition(.move(edge: .bottom).combined(with: .opacity))
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottom)
        .animation(.spring(duration: 0.4, bounce: 0.2), value: up && language.suggested != nil)
        .task { // the splash's own window covers the home until it has faded
            try? await Task.sleep(for: .seconds(Splash.hold + Splash.fade))
            up = true
        }
    }

    private func label(_ text: String, primary: Bool) -> some View {
        Text(verbatim: text).font(.baloo(19)).foregroundStyle(primary ? Palette.ink : Palette.cream)
            .frame(maxWidth: .infinity, minHeight: 52)
            .background(RoundedRectangle(cornerRadius: 16).fill(primary ? Color(Palette.yellow) : Palette.cream.opacity(0.08)))
            .overlay(RoundedRectangle(cornerRadius: 16).strokeBorder(primary ? Palette.yellowLo : Palette.cream.opacity(0.14), lineWidth: primary ? 0 : 1.5))
            .background(RoundedRectangle(cornerRadius: 16).fill(primary ? Palette.yellowLo : .clear).offset(y: 3)) // the hard drop edge
            .contentShape(Rectangle())
    }
}
