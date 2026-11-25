import SwiftUI
import StoreKit

// The two places the avatar opens (ronda-10): Profile, whose gear pushes Settings. A bottom sheet drawn here, not the
// system's: on iOS 26+ a partial-height system sheet floats inset from the screen edges; this one is flush with the bottom
// edge and full width, like Android's. The navigation stack inside is the system's, so the push and back are the platform's.
enum LauncherSheet: Hashable {
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

// The scrim and the sheet; the sheet's state (the pushed page, the drag) lives only while it is shown.
struct ProfileSheet: View {
    @ObservedObject var model: Launcher
    let surface: Color
    @Binding var shown: Bool

    var body: some View {
        GeometryReader { g in
            ZStack(alignment: .bottom) {
                if shown {
                    Color.black.opacity(0.32).ignoresSafeArea()
                        .onTapGesture { shown = false }.accessibilityHidden(true)
                        .transition(.opacity)
                        .zIndex(0) // pinned: while leaving, a ZStack may otherwise draw the scrim over the sheet
                    SheetCard(model: model, surface: surface, bottom: g.safeAreaInsets.bottom, room: g.size.height - 40) { shown = false }
                        .transition(.move(edge: .bottom))
                        .zIndex(1)
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottom)
            .ignoresSafeArea(edges: .bottom)
            .animation(.spring(duration: 0.35, bounce: 0), value: shown)
        }
    }
}

private struct SheetCard: View {
    @ObservedObject var model: Launcher
    let surface: Color
    let bottom: CGFloat // the home indicator's inset, kept clear inside the sheet
    let room: CGFloat // the most the pages may take: below it they scroll
    let close: () -> Void
    @State private var path: [LauncherSheet] = LauncherSheet.atLaunch == .settings ? [.settings] : []
    @State private var bar: CGFloat = 56 // the navigation bar, measured on first show
    @State private var profileRows: CGFloat = 0 // each page's rows, laid out unseen, so the sheet fits the page shown
    @State private var settingsRows: CGFloat = 0
    @State private var drag: CGFloat = 0

    var body: some View {
        VStack(spacing: 0) {
            Capsule().fill(Palette.cream.opacity(0.35)).frame(width: 36, height: 5).padding(.vertical, 6)
            NavigationStack(path: $path) {
                page("html.accountTitle") { ProfileBody(model: model) }
                    .toolbar {
                        ToolbarItem(placement: .topBarLeading) {
                            NavigationLink(value: LauncherSheet.settings) { Image(systemName: "gearshape") }.accessibilityLabel(Text("html.settings.aria"))
                        }
                    }
                    .navigationDestination(for: LauncherSheet.self) { _ in page("html.settingsTitle") { SettingsBody() } }
            }
            .tint(Palette.cream)
            // the stack keeps the taller page's height and the sheet shows its top part: resizing the stack mid-push
            // jumps the header and lays the pushed page out twice
            .frame(height: min(bar + max(profileRows, settingsRows), room))
            .frame(height: min(bar + (path.isEmpty ? profileRows : settingsRows), room), alignment: .top)
            .clipped()
        }
        .padding(.bottom, bottom)
        .background {
            ZStack {
                measure($profileRows) { ProfileBody(model: model) }
                measure($settingsRows) { SettingsBody() }
            }
        }
        .background(surface, in: UnevenRoundedRectangle(topLeadingRadius: 28, topTrailingRadius: 28))
        .overlay(alignment: .top) { TopLip(base: UnevenRoundedRectangle(topLeadingRadius: 28, topTrailingRadius: 28)).fill(Palette.cream.opacity(0.5)).allowsHitTesting(false) }
        .animation(.smooth(duration: 0.35), value: path) // the sheet's edge and the page's clip grow together
        .offset(y: drag)
        .gesture(DragGesture()
            .onChanged { drag = max(0, $0.translation.height) }
            .onEnded { v in
                if v.translation.height > 120 || v.predictedEndTranslation.height > 300 { close() }
                else { withAnimation(.spring(duration: 0.3, bounce: 0)) { drag = 0 } }
            })
        .accessibilityAddTraits(.isModal)
        .accessibilityAction(.escape, close)
    }

    private func measure(_ height: Binding<CGFloat>, @ViewBuilder rows: () -> some View) -> some View {
        SheetContent { rows() }.fixedSize(horizontal: false, vertical: true).hidden().accessibilityHidden(true)
            .onGeometryChange(for: CGFloat.self) { $0.size.height } action: { height.wrappedValue = $0 }
    }

    private func page(_ title: LocalizedStringKey, @ViewBuilder content: () -> some View) -> some View {
        ScrollView { SheetContent { content() } }
            .scrollBounceBehavior(.basedOnSize) // scrolls only when the screen is shorter than the page
            .scrollIndicators(.hidden)
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .onGeometryChange(for: CGFloat.self) { $0.safeAreaInsets.top } action: { if $0 > 0 { bar = $0 } }
            .background(surface.ignoresSafeArea()) // opaque, so the page pushed slides over the other, never through it
            .navigationTitle(Text(title))
            .navigationBarTitleDisplayMode(.inline)
            .toolbarBackground(.hidden, for: .navigationBar)
            .toolbar {
                ToolbarItem(placement: .principal) { Text(title).font(.baloo(22)).foregroundStyle(Palette.cream) }
                ToolbarItem(placement: .topBarTrailing) {
                    Button(action: close) { Image(systemName: "xmark") }.accessibilityLabel(Text("html.attr.close"))
                }
            }
    }
}

// A page's rows with the sheet's padding; also laid out unseen on the home to size the sheet.
struct SheetContent<Content: View>: View {
    @ViewBuilder let content: Content
    var body: some View { VStack(spacing: M) { content }.padding(M).padding(.bottom, 24 - M) }
}

// The sheet's 2 pt highlight along its rounded top edge (the prototype's inset shadow).
private struct TopLip<S: Shape>: Shape {
    let base: S
    func path(in r: CGRect) -> Path { base.path(in: r).subtracting(base.path(in: r.offsetBy(dx: 0, dy: 2))) }
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
            ForEach(["launcher.profile.runs", "Jocs", "Dies jugats"], id: \.self) { label in
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
                toggle("music", "#e45aa8", "music.note", $music)
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
        Text(verbatim: "Mulassa Games \(Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "")")
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
