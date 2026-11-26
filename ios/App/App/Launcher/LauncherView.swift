import SwiftUI

// The launcher's state: the catalogue and its art.
@MainActor final class Launcher: ObservableObject {
    @Published private(set) var games: [Game] = []
    @Published private(set) var images: [String: UIImage] = [:]
    @Published private(set) var icon: UIImage?
    var play: (Game, CGPoint, _ covered: @escaping () -> Void) -> Void = { _, _, _ in } // `covered`: the iris is over the launcher
    private var root: URL?

    // Read again on every return from a game: a live update may have switched the bundle meanwhile.
    func load(root: URL) {
        let found = WebBundle.games(at: root)
        if found.root == self.root && found.games == games { return }
        self.root = found.root
        games = found.games
        images = Dictionary(found.games.compactMap { g in WebBundle.image(g.art, in: found.root).map { (g.id, $0) } }) { a, _ in a }
        icon = WebBundle.image("/apple-touch-icon.png", in: found.root)
    }
}

let M: CGFloat = 16 // one spacing unit: side margin = column gap = row gap = logo-to-grid gap

enum LauncherTab: Hashable { case games, profile }

// ronda-18: two tabs in the system's bar (Liquid Glass on iOS 26), «Jocs» (the cartridges) and «Perfil». Settings is a
// bottom sheet over both; a tapped cartridge lifts over everything (Lift.swift).
struct LauncherRoot: View {
    @ObservedObject var model: Launcher
    @State private var tab: LauncherTab = LauncherSheet.atLaunch == nil ? .games : .profile
    @State private var settings = LauncherSheet.atLaunch == .settings
    @State private var lifted: Lifted?
    @ObservedObject private var language = AppLanguage.shared

    var body: some View {
        TimelineView(.periodic(from: .now, by: 300)) { t in // the sky moves on every 5 minutes, nothing in between
            let sky = Sky.now(t.date)
            TabView(selection: $tab) {
                Home(model: model, sky: sky, lifted: lifted?.game.id) { lifted = $0 }
                    .tabItem { Label("Jocs", systemImage: "gamecontroller") }.tag(LauncherTab.games)
                ProfilePage(model: model, surface: sky.sheet) { settings = true }
                    .tabItem { Label("html.accountTitle", systemImage: "person.crop.circle") }.tag(LauncherTab.profile)
            }
            .tint(Palette.yellowHi)
            .overlay { if let lifted { LiftView(model: model, lifted: lifted) { self.lifted = nil } } }
            .overlay { SettingsSheet(surface: sky.sheet, shown: $settings) }
        }
        .environment(\.locale, Locale(identifier: language.code))
        .id(language.code) // a new language redraws every string, the ones read outside Text included
        // LanguagePrompt() waits for the first-run onboarding (owner, 25 Nov 2026)
        .preferredColorScheme(.dark)
    }
}

// «Jocs»: the logo, centred, scrolls away with the cartridges; under the status bar a veil in the sky's own top colour
// keeps the clock readable over them (a plain fade, no blur: S10 cost).
private struct Home: View {
    @ObservedObject var model: Launcher
    let sky: Sky
    let lifted: String?
    let lift: (Lifted) -> Void

    var body: some View {
        GeometryReader { g in
            ScrollView {
                VStack(spacing: M) {
                    Logo().padding(.top, 8)
                    Cartridges(model: model, width: g.size.width, lifted: lifted, lift: lift)
                }
                .padding(M)
            }
            .scrollIndicators(.hidden)
            .overlay(alignment: .top) {
                LinearGradient(stops: [.init(color: Color(sky.top), location: 0), .init(color: Color(sky.top).opacity(0.75), location: 0.55),
                                       .init(color: Color(sky.top).opacity(0), location: 1)], startPoint: .top, endPoint: .bottom)
                    .frame(height: g.safeAreaInsets.top + 16).offset(y: -g.safeAreaInsets.top).allowsHitTesting(false)
            }
        }
        .background(SkyBackground(sky: sky))
    }
}

// Every game, two a row; an odd count gets a filler cartridge in the lone last slot.
struct Cartridges: View {
    @ObservedObject var model: Launcher
    let width: CGFloat
    let lifted: String?
    let lift: (Lifted) -> Void

    var body: some View {
        let u = (width - 3 * M) / 2 / Cartridge.size.width
        LazyVGrid(columns: [GridItem(.flexible(), spacing: M), GridItem(.flexible(), spacing: M)], spacing: M) {
            ForEach(model.games) { game in
                CartridgeCell(model: model, game: game, u: u, lift: lift).opacity(lifted == game.id ? 0 : 1) // its slot stays empty while it is out
            }
            if model.games.count % 2 == 1 {
                Cartridge.filler(u: u).equatable().accessibilityHidden(true)
            }
        }
    }
}

struct CartridgeCell: View {
    @ObservedObject var model: Launcher
    let game: Game
    let u: CGFloat
    let lift: (Lifted) -> Void

    var body: some View {
        GeometryReader { p in
            Button { lift(Lifted(game: game, from: p.frame(in: .global))) } label: { Cartridge(game: game, image: model.images[game.id], u: u).equatable() }
                .buttonStyle(Squash(depth: 0.3 * u))
                .accessibilityLabel(game.soon ? Text("ui.select.aviat") : Text(verbatim: game.title))
        }
        .frame(width: Cartridge.size.width * u, height: Cartridge.size.height * u)
    }
}

extension CGRect { var center: CGPoint { CGPoint(x: midX, y: midY) } }
