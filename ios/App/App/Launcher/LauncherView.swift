import SwiftUI

// Xcode 27's @State macro links LazyState from SwiftUICore, but iOS < 27 ships it in SwiftUI: dyld kills the app at launch.
// The plain property wrapper, through an alias so the macro doesn't apply, keeps the launcher running on iOS 17-26.
// shortcut: drop it (back to @State) once Apple's SDK fixes the symbol's module or the deployment target reaches 27.
typealias ViewState = SwiftUI.State

// The launcher's state: the catalogue and its art.
@MainActor final class Launcher: ObservableObject {
    @Published private(set) var games: [Game] = []
    func number(_ game: Game) -> Int? { games.firstIndex(of: game).map { $0 + 1 } } // engraved in its grip
    @Published private(set) var images: [String: UIImage] = [:]
    @Published private(set) var icon: UIImage?
    @Published var arrived = false // the splash is lifting: the cartridges come in
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

// Ronda 31: no tab bar (the owner); the home only, the avatar at its top right opening the account sheet (Sheets.swift), a
// tapped cartridge lifting over everything (Lift.swift).
struct LauncherRoot: View {
    @ObservedObject var model: Launcher
    @ViewState private var account = LauncherSheet.atLaunch
    @ViewState private var lifted: Lifted?
    @ViewState private var covered = false // a lift's blurred snapshot covers the home: hidden, so its clouds stop drawing
    @ObservedObject private var language = AppLanguage.shared

    var body: some View {
        TimelineView(.periodic(from: .now, by: 300)) { t in // the sky moves on every 5 minutes, nothing in between
            let sky = Sky.now(t.date)
            // shortcut: a one-tab TabView with its bar hidden, only so the home is its own UIKit child that Lift's Frozen
            // snapshot draws without the lift over it; host Home in its own UIHostingController if this ever gets in the way
            TabView {
                Home(model: model, sky: sky, lifted: lifted?.game.id, account: { account = true }) { FrameLog.begin(); lifted = $0 }
                    .toolbar(.hidden, for: .tabBar)
            }
            .opacity(covered ? 0 : 1)
            .overlay { if let lifted { LiftView(model: model, lifted: lifted, covered: $covered) { self.lifted = nil; covered = false; FrameLog.end() } } }
            .sheet(isPresented: $account) { AccountSheet(model: model) }
        }
        .environment(\.locale, Locale(identifier: language.code))
        .id(language.code) // a new language redraws every string, the ones read outside Text included
        // LanguagePrompt() waits for the first-run onboarding (owner, 25 Nov 2026)
        .preferredColorScheme(.dark)
    }
}

// The home: the logo on the left and the avatar on the right on the Faldó, a header fixed to the screen's top edge that
// the cartridges scroll under (owner, 27 Nov 2026; it replaces the row that scrolled away and its status-bar veil).
private struct Home: View {
    @ObservedObject var model: Launcher
    let sky: Sky
    let lifted: String?
    let account: () -> Void
    let lift: (Lifted) -> Void

    var body: some View {
        GeometryReader { g in
            ScrollView {
                Cartridges(model: model, width: g.size.width, gap: gap(g).gap, lifted: lifted, lift: lift)
                    .padding([.horizontal, .bottom], M)
                    .padding(.top, Faldo.below + Faldo.fringe + M) // the grid starts a margin under the fringe
            }
            .scrollIndicators(.hidden)
            .scrollDisabled(!gap(g).scrolls) // every row fits: the page stands still
            .overlay(alignment: .top) {
                ZStack(alignment: .top) {
                    Faldo(cloth: g.safeAreaInsets.top + Faldo.below)
                    HStack {
                        Logo().padding(.leading, 1.5).accessibilityAddTraits(.isHeader) // its outer stroke's ink, on the margin
                        Spacer()
                        Button(action: account) { Avatar().frame(width: 44, height: 44).contentShape(Rectangle()) } // a 44 pt target
                            .buttonStyle(Squash(depth: 1))
                            .padding(.trailing, -4) // the 36 pt circle's edge on the margin
                            .accessibilityLabel(Text("html.accountTitle"))
                    }
                    .frame(height: 44)
                    .padding(.horizontal, M)
                    .padding(.top, g.safeAreaInsets.top + Faldo.row)
                    .accessibilitySortPriority(1) // an overlay reads after its base: the heading and the account come first
                }
                .ignoresSafeArea(edges: .top)
            }
        }
        .background(SkyBackground(sky: sky))
        .onAppear { Tilt.shared.set(home: lifted == nil) }
        .onChange(of: lifted) { _, out in Tilt.shared.set(home: out == nil) } // level under a lift
    }

    // the rows' gap (rowGap's rule): spread over the screen when they all fit, a row cut across its middle when not
    private func gap(_ g: GeometryProxy) -> (gap: CGFloat, scrolls: Bool) {
        let u = (g.size.width - 3 * M) / 2 / Cartridge.size.width, rows = (model.games.count + 1) / 2
        let top = g.safeAreaInsets.top + Faldo.below + Faldo.fringe + M // the grid's first row, under the Faldó
        return rowGap(view: g.safeAreaInsets.top + g.size.height + g.safeAreaInsets.bottom, bottom: g.safeAreaInsets.bottom, top: top, row: Cartridge.size.height * u, rows: rows)
    }
}

// Ronda 32-33, the owner: rows that all fit spread over the screen down to the home indicator, and the page does not
// scroll; rows that overflow it («que la gent sàpiga que hi ha scroll») get a gap that grows from M up to 2M until the
// screen's bottom edge cuts a row between 30 and 70 % of its height, as near the middle as it can (a thin sliver, or a
// row cut at its very bottom, hides that the grid scrolls). `view`: the screen's height; `bottom`: the home indicator's.
// Same rule on Android (LauncherScreens.kt).
// The Faldó (header ronda 3, owner's pick C1): the Mulassa's cloth in granat, hung from the screen's top edge with soft
// folds, a gold line and a dense gold fringe whose strands touch, so they read as hair without the sky showing through.
// One static Canvas (no blur, no animation); the whole piece is drawn into one layer and shadowed once. It takes the taps
// down to the fringe's tips, so a cartridge hidden under it cannot be lifted and one showing below it still can.
// Same drawing on Android (LauncherScreens.kt, Faldo).
struct Faldo: View {
    static let below: CGFloat = 59  // the cloth under the status bar's inset
    static let row: CGFloat = 3     // the logo row's top under that inset (44 tall)
    static let fringe: CGFloat = 16 // how far the longest strand hangs under the cloth (they start 3 above its edge)
    let cloth: CGFloat              // the cloth's height from the screen's top edge

    private static let ink = Color(UIColor(hex: "#150a05")).opacity(0.42), granat = Color(UIColor(hex: "#7d1f35"))
    private static let gold = Color(UIColor(hex: "#f2c230")), shine = Color(UIColor(hex: "#fff0b0")).opacity(0.55)
    private static let strands: [(dx: CGFloat, h: CGFloat, c: Color)] = [(0, 19, gold), (2.8, 16.5, Color(UIColor(hex: "#d9a521"))), (5.6, 18, Color(UIColor(hex: "#e9b62a")))]
    private static let fold = Gradient(stops: [.init(color: .clear, location: 0), .init(color: Color(UIColor(hex: "#3d0a18")).opacity(0.38), location: 0.5), .init(color: .clear, location: 1)])

    var body: some View {
        Canvas { c, size in
            let w = size.width, k = w / 393 // the folds keep the mock-up's rhythm at any width
            c.addFilter(.shadow(color: Faldo.ink, radius: 3.5, y: 3))
            c.drawLayer { s in // one layer, so the shadow filters its silhouette once, not every strand
                var x: CGFloat = 0 // strands 3.4 wide every 2.8 (the last overlaps the next group's first): three golds
                while x < w {
                    for t in Faldo.strands { s.fill(Path(roundedRect: CGRect(x: x + t.dx, y: cloth - 3, width: 3.4, height: t.h), cornerRadius: 1.7), with: .color(t.c)) }
                    s.fill(Path(CGRect(x: x + 1.4, y: cloth - 3, width: 0.9, height: 14)), with: .color(Faldo.shine))
                    x += 9
                }
                // the cloth over the strands' rounded tops, as the mock-up: they come out flat under the gold line
                s.fill(Path(CGRect(x: 0, y: 0, width: w, height: cloth)), with: .color(Faldo.granat))
                s.fill(Path(CGRect(x: 0, y: cloth - 2, width: w, height: 2)), with: .color(Faldo.gold))
                for i in 0..<7 {
                    let r = CGRect(x: (CGFloat(i) * 65.5 - 12) * k, y: 0, width: 24 * k, height: cloth)
                    s.fill(Path(r), with: .linearGradient(Faldo.fold, startPoint: CGPoint(x: r.minX, y: 0), endPoint: CGPoint(x: r.maxX, y: 0)))
                }
            }
        }
        .frame(height: cloth + Faldo.fringe + 11) // room for the shadow
        .contentShape(Path(CGRect(x: 0, y: 0, width: 4096, height: cloth + Faldo.fringe))) // the shadow's band stays tappable
        .ignoresSafeArea(edges: .horizontal) // edge to edge in landscape too; the logo row keeps the side insets
        .accessibilityHidden(true)
    }
}

func rowGap(view: CGFloat, bottom: CGFloat, top: CGFloat, row: CGFloat, rows: Int) -> (gap: CGFloat, scrolls: Bool) {
    let room = view - bottom - M - top // down to the home indicator, with a margin
    if CGFloat(rows) * row + CGFloat(max(rows - 1, 0)) * M <= room {
        return (rows > 1 ? (room - CGFloat(rows) * row) / CGFloat(rows - 1) : M, false)
    }
    return (peek(view: view, top: top, row: row, rows: rows), true)
}

private func peek(view: CGFloat, top: CGFloat, row: CGFloat, rows: Int) -> CGFloat {
    for i in stride(from: rows - 1, through: 1, by: -1) { // i rows above the cut one; the most first, so the gap stays small
        let gap = { (f: CGFloat) in (view - top - f * row) / CGFloat(i) - row } // the gap that cuts row i at fraction f
        let lo = max(gap(0.7), M), hi = min(gap(0.3), 2 * M)
        if lo <= hi { return min(max(gap(0.5), lo), hi) }
    }
    return M
}

// Every game, two a row; an odd count gets a filler cartridge in the lone last slot.
struct Cartridges: View {
    @ObservedObject var model: Launcher
    let width: CGFloat
    let gap: CGFloat // between rows; M between columns
    let lifted: String?
    let lift: (Lifted) -> Void

    var body: some View {
        let u = (width - 3 * M) / 2 / Cartridge.size.width
        LazyVGrid(columns: [GridItem(.flexible(), spacing: M), GridItem(.flexible(), spacing: M)], spacing: gap) {
            ForEach(Array(model.games.enumerated()), id: \.element.id) { k, game in
                CartridgeCell(model: model, game: game, u: u, lift: lift).opacity(lifted == game.id ? 0 : 1) // its slot stays empty while it is out
                    .modifier(Arriving(k: k, arrived: model.arrived))
            }
            if model.games.count % 2 == 1 {
                Cartridge.filler(u: u).equatable().modifier(Leaning(u: u)).modifier(Arriving(k: model.games.count, arrived: model.arrived))
                    .accessibilityHidden(true)
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
            Button { lift(Lifted(game: game, from: p.frame(in: .global))) } label: { Cartridge(game: game, number: model.number(game), image: model.images[game.id], u: u).equatable() }
                .buttonStyle(Squash(depth: 0.3 * u))
                .accessibilityLabel(game.soon ? Text("ui.select.aviat") : Text(verbatim: game.title))
        }
        .frame(width: Cartridge.size.width * u, height: Cartridge.size.height * u)
        .modifier(Leaning(u: u))
    }
}

// The cartridges come in one after another as the splash lifts (ronda 36): up 28 pt and in, 60 ms apart.
private struct Arriving: ViewModifier {
    let k: Int
    let arrived: Bool
    @Environment(\.accessibilityReduceMotion) private var still
    func body(content: Content) -> some View {
        content.opacity(arrived ? 1 : 0).offset(y: arrived || still ? 0 : 28).scaleEffect(arrived || still ? 1 : 0.94)
            .animation(.timingCurve(0.33, 0, 0.2, 1, duration: still ? 0.2 : 0.4).delay(still ? 0 : 0.06 * Double(k)), value: arrived)
    }
}

extension CGRect { var center: CGPoint { CGPoint(x: midX, y: midY) } }
