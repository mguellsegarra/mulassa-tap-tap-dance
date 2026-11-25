import SwiftUI

// The launcher's state: the catalogue and its art.
@MainActor final class Launcher: ObservableObject {
    @Published private(set) var games: [Game] = []
    @Published private(set) var images: [String: UIImage] = [:]
    @Published private(set) var icon: UIImage?
    var play: (Game, CGPoint) -> Void = { _, _ in }
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

let M: CGFloat = 16 // one spacing unit: side margin = column gap = row gap = header-to-grid gap

// ronda-10: one screen. A header (the logo and the avatar) over the sky, then every game as a cartridge, two a row.
struct LauncherRoot: View {
    @ObservedObject var model: Launcher
    @State private var profile = LauncherSheet.atLaunch != nil
    @State private var scrolled = false
    @ObservedObject private var language = AppLanguage.shared

    var body: some View {
        TimelineView(.periodic(from: .now, by: 300)) { t in // the sky moves on every 5 minutes, nothing in between
            let sky = Sky.now(t.date)
            GeometryReader { g in
                VStack(spacing: 0) {
                    header
                    ScrollView {
                        Cartridges(model: model, width: g.size.width)
                            .padding([.horizontal, .top], M).padding(.bottom, 24)
                            .onGeometryChange(for: Bool.self) { $0.frame(in: .scrollView).minY < -4 } action: { scrolled = $0 }
                    }
                    .scrollIndicators(.hidden)
                    .overlay(alignment: .top) { // the cartridges slide under the header through a plain fade (no blur: S10 cost)
                        LinearGradient(stops: [.init(color: sky.headerTint, location: 0.15), .init(color: sky.headerTint.opacity(0.6), location: 0.55),
                                               .init(color: sky.headerTint.opacity(0), location: 1)], startPoint: .top, endPoint: .bottom)
                            .frame(height: 32).opacity(scrolled ? 1 : 0).animation(.easeOut(duration: 0.2), value: scrolled).allowsHitTesting(false)
                    }
                }
            }
            .background(SkyBackground(sky: sky))
            .overlay { ProfileSheet(model: model, surface: sky.sheet, shown: $profile) }
        }
        .environment(\.locale, Locale(identifier: language.code))
        .id(language.code) // a new language redraws every string, the ones read outside Text included
        .overlay { LanguagePrompt() }
        .preferredColorScheme(.dark)
    }

    private var header: some View {
        HStack {
            Logo()
            Spacer()
            Button { profile = true } label: {
                Group { if let icon = model.icon { Image(uiImage: icon).resizable().scaledToFill() } else { Color.clear } }
                    .frame(width: 44, height: 44)
                    .background(Color(UIColor(hex: "#3ec6ff")))
                    .clipShape(Circle())
                    .overlay(Circle().strokeBorder(Palette.cream, lineWidth: 2))
                    // the prototype's hard 3 pt drop edge; a .shadow here would also shade the ring onto the picture
                    .background(Circle().fill(.black.opacity(0.5)).offset(y: 3))
            }
            .buttonStyle(Squash(depth: 2))
            .accessibilityLabel(Text("html.profile.aria"))
        }
        .padding(.horizontal, M)
        .frame(height: 64)
    }
}

// Every game, two a row; an odd count gets a filler cartridge in the lone last slot.
struct Cartridges: View {
    @ObservedObject var model: Launcher
    let width: CGFloat

    var body: some View {
        let u = (width - 3 * M) / 2 / Cartridge.size.width
        LazyVGrid(columns: [GridItem(.flexible(), spacing: M), GridItem(.flexible(), spacing: M)], spacing: M) {
            ForEach(model.games) { game in CartridgeCell(model: model, game: game, u: u) }
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
    @State private var shake = false

    var body: some View {
        GeometryReader { p in
            Button {
                if game.soon { withAnimation(.spring(response: 0.2, dampingFraction: 0.2)) { shake.toggle() } } else { model.play(game, p.frame(in: .global).center) }
            } label: { Cartridge(game: game, image: model.images[game.id], u: u).equatable() }
            .buttonStyle(Squash(depth: 0.3 * u))
            .accessibilityLabel(game.soon ? Text("ui.select.aviat") : Text("Juga a \(game.title)"))
        }
        .frame(width: Cartridge.size.width * u, height: Cartridge.size.height * u)
        .offset(x: shake ? 4 : 0)
        .sensoryFeedback(.error, trigger: shake)
    }
}

extension CGRect { var center: CGPoint { CGPoint(x: midX, y: midY) } }
