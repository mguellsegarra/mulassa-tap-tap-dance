import SwiftUI
import StoreKit

// Ronda 31: the account sheet, as the App Store's: the avatar at the home's top right opens the system sheet at its large
// detent (full height, attached to the bottom edge; the owner rejected iOS 26's floating partial one), a navigation bar
// with the title and the confirming check (iOS 26's Liquid Glass one; a text button before), and an inset-grouped list:
// the player, the profile's counters, then the settings. Swipe down or the check closes it.
enum LauncherSheet {
    static var atLaunch: Bool {
        #if DEBUG // `-launcherSheet account` opens the account sheet at launch (captures only)
        if UserDefaults.standard.string(forKey: "launcherSheet") == "account" { return true }
        #endif
        return false
    }
}

// TODO(app store): the App Store link (https://apps.apple.com/app/id…) once the app has its id; the site until then.
private let shareURL = URL(string: "https://mulassa.cat")!

// The player's avatar: no session on the native side yet (native-shell.md), so a person glyph on the sky.
struct Avatar: View {
    var size: CGFloat = 36
    var body: some View {
        Image(systemName: "person.fill").font(.system(size: size * 0.5, weight: .bold)).foregroundStyle(Palette.cream)
            .frame(width: size, height: size)
            .background(Circle().fill(Color(UIColor(hex: "#2a1a10")).opacity(0.35)))
            .overlay(Circle().strokeBorder(Palette.cream.opacity(0.85), lineWidth: 1.5))
            .accessibilityHidden(true)
    }
}

struct AccountSheet: View {
    @ObservedObject var model: Launcher
    // the games follow these too (GameHost tellShell): music, UI sound and vibration
    @AppStorage("launcher-sound") private var sound = true
    @AppStorage("launcher-music") private var music = true
    @AppStorage("launcher-haptics") private var haptics = true
    @AppStorage("mulassa-live-server") private var liveServer = "" // MulassaPlugin.server, debug builds only
    @Environment(\.requestReview) private var requestReview
    @Environment(\.openURL) private var openURL
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            List {
                // the player; no session or records natively yet (reportBest, native-shell.md): «—» until then
                Section {
                    HStack(spacing: 14) {
                        Avatar(size: 56)
                        Text(verbatim: "—").font(.baloo(22)).foregroundStyle(Palette.cream)
                    }
                    .padding(.vertical, 4)
                    HStack(spacing: 0) {
                        ForEach(["launcher.profile.runs", "Jocs", "Dies jugats"], id: \.self) { label in
                            VStack(spacing: 2) {
                                Text(verbatim: "—").font(.baloo(24)).foregroundStyle(Palette.yellowHi)
                                Text(LocalizedStringKey(label)).font(.balooBold(13)).foregroundStyle(.secondary)
                            }
                            .frame(maxWidth: .infinity)
                        }
                    }
                    .padding(.vertical, 4)
                    .accessibilityElement(children: .combine)
                }
                let played = model.games.filter { !$0.soon }
                if !played.isEmpty {
                    Section { // each game's record, «—» until the native records come
                        ForEach(played) { game in
                            HStack(spacing: 12) {
                                Color(game.tint).overlay { if let image = model.images[game.id] { Image(uiImage: image).resizable().scaledToFill() } }
                                    .frame(width: 30, height: 30).clipShape(RoundedRectangle(cornerRadius: 8)).accessibilityHidden(true)
                                Text(verbatim: game.title).font(.balooBold(17)).frame(maxWidth: .infinity, alignment: .leading)
                                Text(verbatim: "—").font(.baloo(17)).foregroundStyle(Palette.yellowHi)
                            }
                            .accessibilityElement(children: .combine)
                        }
                    }
                }
                Section {
                    toggle("So", "#f0a51a", "speaker.wave.1.fill", $sound)
                    toggle("music", "#e45aa8", "music.note", $music)
                    toggle("Vibració", "#3aa5e8", "iphone.radiowaves.left.and.right", $haptics)
                    // the app's language is the system's per-app setting
                    Button { if let url = URL(string: UIApplication.openSettingsURLString) { openURL(url) } } label: {
                        row("ui.lang.title", "#3fae5a", "globe") {
                            Text(language).font(.balooBold(17)).foregroundStyle(.secondary)
                            Chevron()
                        }
                    }
                }
                Section {
                    Button { requestReview() } label: { row("launcher.settings.rateApp", "#f5c518", "star") { Chevron() } }
                    ShareLink(item: shareURL) { row("launcher.settings.shareApp", "#ff7ac8", "square.and.arrow.up") { Chevron() } }
                }
                #if DEBUG
                Section { // not player copy: the live-update site (MulassaPlugin.liveServer), read when the launcher next rests
                    TextField(text: $liveServer, prompt: Text(verbatim: "el del bundle (version.json)")) { EmptyView() }
                        .font(.balooBold(17)).keyboardType(.URL).textInputAutocapitalization(.never).autocorrectionDisabled()
                } header: { Text(verbatim: "Servidor d'actualitzacions (debug)") }
                #endif
                Section {
                    // shortcut: Ajuda and Privadesa have no native page yet; the rows name where they will go, with no arrow
                    Text("Ajuda").font(.balooBold(17))
                    Text("html.common.privacy").font(.balooBold(17))
                } footer: {
                    Text(verbatim: "Mulassa Games \(Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "")")
                        .font(.balooBold(13)).frame(maxWidth: .infinity)
                }
            }
            .listStyle(.insetGrouped)
            .buttonStyle(.plain)
            .navigationTitle(Text("html.accountTitle"))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    if #available(iOS 26, *) {
                        Button(role: .confirm) { dismiss() } // the system's Liquid Glass check, as the App Store's
                    } else {
                        Button { dismiss() } label: { Text("html.attr.close").font(.balooBold(17)) }
                    }
                }
            }
        }
        .preferredColorScheme(.dark) // a sheet does not reliably inherit the root's
        .tint(Palette.yellowHi)
    }

    private func row<Trailing: View>(_ label: LocalizedStringKey, _ color: String, _ symbol: String, @ViewBuilder trailing: () -> Trailing) -> some View {
        HStack(spacing: 12) {
            Swatch(color: color, symbol: symbol)
            Text(label).font(.balooBold(17)).frame(maxWidth: .infinity, alignment: .leading)
            trailing()
        }
        .contentShape(Rectangle())
    }

    private func toggle(_ label: LocalizedStringKey, _ color: String, _ symbol: String, _ on: Binding<Bool>) -> some View {
        Toggle(isOn: on) {
            HStack(spacing: 12) { Swatch(color: color, symbol: symbol); Text(label).font(.balooBold(17)) }
        }
        .tint(Color(UIColor(hex: "#6fbf4a")))
    }

    // the app's language, in itself («Català»)
    private var language: String {
        let code = Bundle.main.preferredLocalizations.first ?? "ca", locale = Locale(identifier: code)
        return locale.localizedString(forIdentifier: code)?.capitalized(with: locale) ?? code
    }
}

private struct Swatch: View {
    let color: String
    let symbol: String
    var body: some View {
        Image(systemName: symbol).font(.system(size: 15, weight: .bold)).foregroundStyle(Palette.ink)
            .frame(width: 30, height: 30).background(RoundedRectangle(cornerRadius: 8).fill(Color(UIColor(hex: color))))
            .accessibilityHidden(true)
    }
}

private struct Chevron: View {
    var body: some View { Image(systemName: "chevron.right").font(.system(size: 14, weight: .semibold)).foregroundStyle(.tertiary).accessibilityHidden(true) }
}
