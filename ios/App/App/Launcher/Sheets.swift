import SwiftUI
import StoreKit

// The two places the avatar opens (ronda-10): Profile, whose gear leads to Settings, whose arrow leads back. A plain
// sheet from the bottom over a scrim, coloured from the sky; switching slides one down as the other comes up.
enum LauncherSheet: Equatable {
    case profile, settings

    static var atLaunch: LauncherSheet? {
        #if DEBUG // `-launcherSheet profile|settings` opens one at launch (captures only)
        switch UserDefaults.standard.string(forKey: "launcherSheet") { case "profile": return .profile; case "settings": return .settings; default: break }
        #endif
        return nil
    }
}

// TODO(app store): the App Store link (https://apps.apple.com/app/id…) once the app has its id; the site until then.
private let shareURL = URL(string: "https://mulassa.cat")!

struct SheetLayer: View {
    @ObservedObject var model: Launcher
    @Binding var sheet: LauncherSheet?
    let surface: Color

    var body: some View {
        ZStack(alignment: .bottom) {
            if sheet != nil {
                Color(red: 10 / 255, green: 6 / 255, blue: 3 / 255).opacity(0.6).ignoresSafeArea()
                    .onTapGesture { sheet = nil }
                    .transition(.opacity)
            }
            if sheet == .profile {
                SheetCard(title: "html.accountTitle", surface: surface, close: { sheet = nil }) {
                    RoundButton(symbol: "gearshape", label: "html.settings.aria") { sheet = .settings }
                } content: { ProfileBody(model: model) }
                .transition(.move(edge: .bottom))
            }
            if sheet == .settings {
                SheetCard(title: "html.settingsTitle", surface: surface, close: { sheet = nil }) {
                    RoundButton(symbol: "chevron.left", label: "launcher.settings.backToProfile") { sheet = .profile }
                } content: { SettingsBody() }
                .transition(.move(edge: .bottom))
            }
        }
        .animation(.timingCurve(0.2, 0.9, 0.3, 1, duration: 0.45), value: sheet)
    }
}

struct SheetCard<Leading: View, Content: View>: View {
    let title: LocalizedStringKey
    let surface: Color
    let close: () -> Void
    @ViewBuilder let leading: Leading
    @ViewBuilder let content: Content

    var body: some View {
        let shape = UnevenRoundedRectangle(topLeadingRadius: 28, topTrailingRadius: 28)
        VStack(spacing: 0) {
            HStack {
                leading
                Spacer()
                Text(title).font(.baloo(22)).foregroundStyle(Palette.cream)
                Spacer()
                RoundButton(symbol: "xmark", label: "html.attr.close", action: close)
            }
            .padding(.horizontal, M).padding(.top, 12)
            // as tall as its content, scrolling only when the screen is shorter
            ViewThatFits(in: .vertical) {
                padded(content)
                ScrollView { padded(content) }.scrollIndicators(.hidden)
            }
        }
        .frame(maxWidth: .infinity)
        .background {
            shape.fill(surface)
                .overlay { TopLip(base: shape).fill(Palette.cream.opacity(0.5)) }
                .shadow(color: .black.opacity(0.4), radius: 12, y: -8)
                .ignoresSafeArea(edges: .bottom)
        }
        .padding(.top, 16)
        .accessibilityAddTraits(.isModal)
    }

    private func padded(_ c: Content) -> some View {
        VStack(spacing: M) { c }.padding(M).padding(.bottom, 24 - M)
    }
}

// The sheet's 2 pt highlight along its rounded top edge (the prototype's inset shadow).
private struct TopLip<S: Shape>: Shape {
    let base: S
    func path(in r: CGRect) -> Path { base.path(in: r).subtracting(base.path(in: r.offsetBy(dx: 0, dy: 2))) }
}

// The header's round button: dark brown, a cream ring and a hard drop edge.
struct RoundButton: View {
    let symbol: String
    let label: LocalizedStringKey
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Image(systemName: symbol).font(.system(size: 19, weight: .bold)).foregroundStyle(Palette.cream)
                .frame(width: 44, height: 44)
                .background(Circle().fill(Color(UIColor(hex: "#3a2414"))).shadow(color: .black.opacity(0.5), radius: 0, y: 3))
                .overlay(Circle().strokeBorder(Palette.cream, lineWidth: 2))
        }
        .buttonStyle(Squash(depth: 2))
        .accessibilityLabel(Text(label))
    }
}

struct Card<Content: View>: View {
    @ViewBuilder let content: Content
    var body: some View {
        content
            .background(RoundedRectangle(cornerRadius: 18).fill(Palette.cream.opacity(0.08)))
            .overlay(RoundedRectangle(cornerRadius: 18).strokeBorder(Palette.cream.opacity(0.14), lineWidth: 1.5))
    }
}

// A list row: an optional coloured square, the label, and whatever goes on the right.
struct SheetRow<Icon: View, Trailing: View>: View {
    let label: Text
    var separated = false
    @ViewBuilder let icon: Icon
    @ViewBuilder let trailing: Trailing

    var body: some View {
        HStack(spacing: 12) {
            icon
            label.font(.balooBold(17)).foregroundStyle(Palette.cream).frame(maxWidth: .infinity, alignment: .leading)
            trailing
        }
        .padding(.horizontal, M).frame(minHeight: 52)
        .overlay(alignment: .top) { if separated { Palette.cream.opacity(0.1).frame(height: 1) } }
        .contentShape(Rectangle())
    }
}

private struct Swatch: View {
    let color: String
    let symbol: String
    var body: some View {
        Image(systemName: symbol).font(.system(size: 16, weight: .bold)).foregroundStyle(Palette.ink)
            .frame(width: 32, height: 32).background(RoundedRectangle(cornerRadius: 9).fill(Color(UIColor(hex: color))))
    }
}

private struct Chevron: View {
    var body: some View { Image(systemName: "chevron.right").font(.system(size: 14, weight: .bold)).foregroundStyle(Palette.cream.opacity(0.5)) }
}

// ---- Perfil: no session or records on the native side yet (reportBest, native-shell.md): the counters and records show «—»
struct ProfileBody: View {
    @ObservedObject var model: Launcher

    var body: some View {
        HStack(spacing: 12) {
            ForEach(["Partides", "Jocs", "Dies jugats"], id: \.self) { label in
                Card {
                    VStack(spacing: 4) {
                        Text("—").font(.baloo(26)).foregroundStyle(Palette.yellowHi)
                        Text(LocalizedStringKey(label)).font(.balooBold(13)).foregroundStyle(Palette.cream.opacity(0.7))
                    }
                    .frame(maxWidth: .infinity).padding(.vertical, 12).padding(.horizontal, 4)
                }
            }
        }
        let played = model.games.filter { !$0.soon }
        if !played.isEmpty {
            Card {
                VStack(spacing: 0) {
                    ForEach(Array(played.enumerated()), id: \.element.id) { k, game in
                        SheetRow(label: Text(verbatim: game.title), separated: k > 0) {
                            Color(game.tint).overlay { if let image = model.images[game.id] { Image(uiImage: image).resizable().scaledToFill() } }
                                .frame(width: 32, height: 32).clipShape(RoundedRectangle(cornerRadius: 9))
                        } trailing: {
                            Text("—").font(.baloo(17)).foregroundStyle(Palette.yellowHi)
                        }
                    }
                }
            }
        }
    }
}

// ---- Ajustos
struct SettingsBody: View {
    // shortcut: kept on the device only; the games do not read them yet (native settings, phase 4)
    @AppStorage("launcher-sound") private var sound = true
    @AppStorage("launcher-music") private var music = true
    @AppStorage("launcher-haptics") private var haptics = true
    @Environment(\.requestReview) private var requestReview
    @Environment(\.openURL) private var openURL

    var body: some View {
        Card {
            VStack(spacing: 0) {
                toggle("So", "#f0a51a", "speaker.wave.1.fill", $sound, separated: false)
                toggle("Música", "#e45aa8", "music.note", $music)
                toggle("Vibració", "#3aa5e8", "iphone.radiowaves.left.and.right", $haptics)
                // the app's language is the system's per-app setting
                Button { if let url = URL(string: UIApplication.openSettingsURLString) { openURL(url) } } label: {
                    SheetRow(label: Text("ui.lang.title"), separated: true) { Swatch(color: "#3fae5a", symbol: "globe") } trailing: {
                        Text(language).font(.balooBold(17)).foregroundStyle(Palette.cream.opacity(0.6))
                        Chevron()
                    }
                }
            }
        }
        Card {
            VStack(spacing: 0) {
                Button { requestReview() } label: {
                    SheetRow(label: Text("launcher.settings.rateApp")) { Swatch(color: "#f5c518", symbol: "star") } trailing: { Chevron() }
                }
                ShareLink(item: shareURL) {
                    SheetRow(label: Text("launcher.settings.shareApp"), separated: true) { Swatch(color: "#ff7ac8", symbol: "square.and.arrow.up") } trailing: { Chevron() }
                }
            }
        }
        .buttonStyle(.plain)
        Card {
            // shortcut: Ajuda and Privadesa have no native page yet; the rows show where they go
            VStack(spacing: 0) {
                SheetRow(label: Text("Ajuda")) { EmptyView() } trailing: { Chevron() }
                SheetRow(label: Text("html.common.privacy"), separated: true) { EmptyView() } trailing: { Chevron() }
            }
        }
        Text("Mulassa Games \(Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "")")
            .font(.balooBold(13)).foregroundStyle(Palette.cream.opacity(0.55))
    }

    private func toggle(_ label: LocalizedStringKey, _ color: String, _ symbol: String, _ on: Binding<Bool>, separated: Bool = true) -> some View {
        SheetRow(label: Text(label), separated: separated) { Swatch(color: color, symbol: symbol) } trailing: {
            Toggle("", isOn: on).labelsHidden().tint(Color(UIColor(hex: "#6fbf4a")))
        }
    }

    // the app's language, in itself («Català»)
    private var language: String {
        let code = Bundle.main.preferredLocalizations.first ?? "ca", locale = Locale(identifier: code)
        return locale.localizedString(forIdentifier: code)?.capitalized(with: locale) ?? code
    }
}
