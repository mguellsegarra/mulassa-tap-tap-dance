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
    @Published private(set) var planes: [String: Planes] = [:] // a game's art in two planes, when its catalogue entry has them
    @Published var arrived = false // the splash is lifting: the cartridges come in
    var play: (Game, CGPoint, _ covered: @escaping () -> Void) -> Void = { _, _, _ in } // `covered`: the iris is over the launcher
    private var root: URL?

    private func take(_ got: [String: Planes], from dir: URL) { if root == dir { planes = got } } // not a bundle since replaced

    // Read again on every return from a game: a live update may have switched the bundle meanwhile.
    func load(root: URL) {
        let found = WebBundle.games(at: root)
        if found.root == self.root && found.games == games { return }
        self.root = found.root
        games = found.games
        // the planes are decoded off the main thread and come in when ready: until then a cartridge wears its flat art
        planes = [:]
        let games = found.games, dir = found.root
        Task.detached(priority: .userInitiated) { [weak self] in
            let got = Dictionary(games.compactMap { g -> (String, Planes)? in
                guard let b = g.layers?.back, let f = g.layers?.front, let back = WebBundle.image(b, in: dir), let front = WebBundle.image(f, in: dir) else { return nil }
                return (g.id, Planes(back: back, front: front))
            }) { a, _ in a }
            await self?.take(got, from: dir)
        }
        images = Dictionary(found.games.compactMap { g in WebBundle.image(g.art, in: found.root).map { (g.id, $0) } }) { a, _ in a }
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
            .onChange(of: account, initial: true) { _, open in Tilt.shared.set(sheet: open) } // and under the account sheet
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
                let grid = grid(g)
                Cartridges(model: model, grid: grid, lifted: lifted, lift: lift)
                    .padding(.horizontal, grid.side).padding(.bottom, M)
                    .padding(.top, Faldo.below + Faldo.fringe + grid.side + grid.lead) // the grid starts one gap under the fringe
            }
            .scrollIndicators(.hidden)
            .overlay(alignment: .bottom) { // a wisp of mist in front of the lowest row, by day: the nearest plane
                Image("cloud_wisp").resizable().scaledToFit().frame(width: g.size.width * 0.9)
                    .opacity(0.22 * (1 - sky.stars)).offset(x: -g.size.width * 0.2, y: -g.size.height * 0.12)
                    .modifier(Drifting(by: Depth.mist)).allowsHitTesting(false).accessibilityHidden(true)
            }
            .scrollDisabled(!grid(g).scrolls) // every row fits: the page stands still
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
        .onDisappear { Tilt.shared.set(home: false) }
        .onChange(of: lifted) { _, out in Tilt.shared.set(home: out == nil) } // level, and the sensor off, under a lift
    }

    private func grid(_ g: GeometryProxy) -> Grid {
        Grid(width: g.size.width, view: g.safeAreaInsets.top + g.size.height + g.safeAreaInsets.bottom, bottom: g.safeAreaInsets.bottom,
             fringe: g.safeAreaInsets.top + Faldo.below + Faldo.fringe, count: model.games.count)
    }
}

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

// How many cartridges a row: two on a phone, more on a wider window, so none grows past 240 pt (an iPad on its side showed
// two giants and one row). Android's Rows.kt is the same rule.
func columns(_ width: CGFloat) -> Int { max(2, Int(((width - M) / (240 + M)).rounded(.up))) }

// The grid's measures (ronda 39, Fable's «un sol espai a tot arreu»): when the rows fit, one gap everywhere — at the sides,
// between columns, between rows, under the fringe and over the home indicator — found by solving the width and the
// height together; the cartridges take the size that leaves it. Out of that gap's range (8 to 32 pt: a tablet, many
// rows) the margins are M and the rows follow rowGap. `fringe`: the header's bottom. Android's Rows.kt is the same.
struct Grid: Equatable {
    let cols: Int, u: CGFloat, side: CGFloat, gap: CGFloat, scrolls: Bool
    var lead: CGFloat = 0 // room left over a still grid on a tall screen, 42 % of it above the rows: they sit a little over the middle
    init(width: CGFloat, view: CGFloat, bottom: CGFloat, fringe: CGFloat, count: Int) {
        let cols = columns(width), rows = (count + cols - 1) / cols, n = CGFloat(rows), c = CGFloat(cols)
        let k = n * Cartridge.size.height / (c * Cartridge.size.width), den = (n + 1) - k * (c + 1) // rows' height per point of width
        let even = den == 0 ? 0 : (view - bottom - fringe - k * width) / den
        if rows > 0, even >= M / 2, even <= 2 * M {
            (self.cols, u, side, gap, scrolls) = (cols, (width - (c + 1) * even) / (c * Cartridge.size.width), even, even, false)
        } else {
            let u = (width - (c + 1) * M) / (c * Cartridge.size.width)
            let rule = rowGap(view: view, bottom: bottom, top: fringe + M, row: Cartridge.size.height * u, rows: rows)
            (self.cols, self.u, side, gap, scrolls) = (cols, u, M, rule.gap, rule.scrolls)
            let spare = view - bottom - M - (fringe + M) - n * Cartridge.size.height * u - rule.gap * max(n - 1, 0)
            if !rule.scrolls, spare > 0 { lead = spare * 0.42 }
        }
    }
}

// The grid's gap between rows, and whether it scrolls (ronda 32-33, the owner). Rows that fit (down to the home indicator,
// with a gap of half a margin at least) spread over the screen and the page stands still. Rows that overflow it («que la
// gent sàpiga que hi ha scroll») get the gap, from M/2 to 2M, that makes the screen's bottom edge cut a row as near its
// middle as it can: a thin sliver, or a row cut at its very bottom, hides that the grid scrolls. `view`: the screen's
// height; `bottom`: the home indicator's; `top`: where the first row starts. Android's Rows.kt is the same rule, and its
// RowsTest.kt holds the numbers.
func rowGap(view: CGFloat, bottom: CGFloat, top: CGFloat, row: CGFloat, rows: Int) -> (gap: CGFloat, scrolls: Bool) {
    guard rows > 1 else { return (M, top + CGFloat(rows) * row > view - bottom) }
    let n = CGFloat(rows), room = view - bottom - M - top
    // (spread, but never more than a margin and a half apart: the rows stay a group; Grid.lead places what room is left)
    if n * row + M / 2 * (n - 1) <= room { return (min((room - n * row) / (n - 1), 1.5 * M), false) }
    var best = M, miss = CGFloat.infinity
    for i in stride(from: rows - 1, through: 1, by: -1) { // i rows above the cut one; the most first: on a tie the gap stays small
        let k = CGFloat(i), gap = min(max((view - top - row * 0.5) / k - row, M / 2), 2 * M) // would cut row i at its middle
        let cut = (view - top - (row + gap) * k) / row // how much of row i shows
        if cut > 0.05, cut < 0.95, abs(cut - 0.5) < miss { miss = abs(cut - 0.5); best = gap }
    }
    return (best, true)
}

// Every game, two a row; an odd count gets a filler cartridge in the lone last slot.
struct Cartridges: View {
    @ObservedObject var model: Launcher
    let grid: Grid
    let lifted: String?
    let lift: (Lifted) -> Void

    var body: some View {
        let cols = grid.cols, u = grid.u
        LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: grid.side), count: cols), spacing: grid.gap) {
            ForEach(Array(model.games.enumerated()), id: \.element.id) { k, game in
                CartridgeCell(model: model, game: game, u: u, row: k / cols, col: k % cols, lift: lift).opacity(lifted == game.id ? 0 : 1) // its slot stays empty while it is out
                    .modifier(Arriving(k: k, arrived: model.arrived))
            }
            if model.games.count % cols != 0 { // a last row left short gets one more to come: every place holds a cartridge (the owner)
                LeaningCartridge(cart: Cartridge.filler(u: u, number: model.games.count + 1), row: model.games.count / cols, col: model.games.count % cols).modifier(Arriving(k: model.games.count, arrived: model.arrived))
                    .accessibilityHidden(true)
            }
        }
    }
}

struct CartridgeCell: View {
    @ObservedObject var model: Launcher
    let game: Game
    let u: CGFloat
    var row = 0, col = 0
    let lift: (Lifted) -> Void

    var body: some View {
        GeometryReader { p in
            Button { lift(Lifted(game: game, from: p.frame(in: .global))) } label: { LeaningCartridge(cart: Cartridge(game: game, number: model.number(game), image: model.images[game.id], planes: model.planes[game.id], u: u), row: row, col: col) }
                .buttonStyle(Squash(depth: 0.3 * u))
                .accessibilityLabel(game.soon ? Text("ui.select.aviat") : Text(verbatim: game.title))
        }
        .frame(width: Cartridge.size.width * u, height: Cartridge.size.height * u)
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
