import SwiftUI

// The launcher's state: the catalogue, the art, and three local values (favourites, the last game played, the chosen tab).
@MainActor final class Launcher: ObservableObject {
    enum Filter: Hashable { case all, favs, category(String) }
    enum Tab: Hashable { case jocs, perfil }

    @Published private(set) var games: [Game] = []
    @Published private(set) var images: [String: UIImage] = [:]
    @Published private(set) var icon: UIImage?
    @Published private(set) var favs = Set(UserDefaults.standard.stringArray(forKey: "launcher-favs") ?? [])
    @Published private(set) var last = UserDefaults.standard.string(forKey: "launcher-last")
    @Published var filter = Filter.all
    @Published var tab: Tab? = .jocs
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

    var categories: [String] { games.count >= 8 ? ["ritme", "accio", "enginy", "puzles"] : [] }
    var list: [Game] {
        switch filter {
        case .all: games
        case .favs: games.filter { favs.contains($0.id) }
        case .category(let c): games.filter { $0.category == c }
        }
    }
    // the game the ring opens on: the last played when it is shown, else the first that can be played
    func opening(in list: [Game]) -> Game? {
        list.first { $0.id == last } ?? list.first { !$0.soon } ?? list.first
    }

    func toggleFav(_ id: String) {
        if favs.remove(id) == nil { favs.insert(id) }
        UserDefaults.standard.set(Array(favs), forKey: "launcher-favs")
    }
    func played(_ id: String) {
        last = id
        UserDefaults.standard.set(id, forKey: "launcher-last")
    }
}

private let M: CGFloat = 16 // the screen's side margin

struct LauncherRoot: View {
    @ObservedObject var model: Launcher

    var body: some View {
        VStack(spacing: 0) {
            ScrollView(.horizontal) {
                LazyHStack(spacing: 0) {
                    JocsScreen(model: model).containerRelativeFrame(.horizontal).id(Launcher.Tab.jocs)
                    PerfilScreen(model: model).containerRelativeFrame(.horizontal).id(Launcher.Tab.perfil)
                }
                .scrollTargetLayout()
            }
            .scrollTargetBehavior(.paging)
            .scrollPosition(id: $model.tab)
            .scrollIndicators(.hidden)
            Color.clear.frame(height: 72)
        }
        .overlay(alignment: .bottom) { TabBar(model: model).padding(.bottom, 4) }
        .background(Palette.bg.ignoresSafeArea())
        .preferredColorScheme(.dark)
    }
}

// ---- Jocs: the logo and «N jocs», the chips, the ring, the ruler, JUGA, every game as a grid
struct JocsScreen: View {
    @ObservedObject var model: Launcher
    @State private var selected: String?

    var body: some View {
        let list = model.list, game = list.first { $0.id == selected } ?? model.opening(in: list)
        ScrollView {
            VStack(spacing: 0) {
                HStack {
                    Logo().frame(width: 128, height: 44.7)
                    Spacer()
                    Text("\(model.games.count) jocs").font(.pixel(20)).kerning(0.5).foregroundStyle(Palette.yellowHi)
                        .padding(.horizontal, 12).frame(height: 32).plate(radius: 11, dim: true)
                }
                .padding(.horizontal, M).padding(.top, 4).frame(minHeight: 56)
                Chips(model: model).padding(.top, 12)
                if let game {
                    Ring(model: model, list: list, selected: $selected).padding(.top, 16)
                    Ruler(list: list, game: game).padding(.top, 2)
                    PlayButton(game: game) { model.play(game, $0) }.padding(.horizontal, M).padding(.top, 12)
                    HStack {
                        Text(heading).font(.baloo(22)).foregroundStyle(Palette.cream)
                        Spacer()
                        Text("\(list.count)").font(.balooBold(14)).foregroundStyle(Palette.yellowHi)
                    }
                    .padding(.horizontal, M).padding(.top, 28).padding(.bottom, 12)
                    Grid(model: model, list: list)
                } else {
                    EmptyFavs { model.filter = .all }.padding(.horizontal, M).padding(.top, 24)
                }
                Text("Mulassa Games \(Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "") · mulassa.cat")
                    .font(.balooBold(12)).foregroundStyle(Palette.cream.opacity(0.4)).padding(.top, 28).padding(.bottom, 24)
            }
        }
        .scrollIndicators(.hidden)
    }

    private var heading: String {
        switch model.filter {
        case .all: "Tots els jocs"
        case .favs: "Els teus favorits"
        case .category(let c): Chips.names[c] ?? c
        }
    }
}

struct Chips: View {
    static let names = ["ritme": "Ritme", "accio": "Acció", "enginy": "Enginy", "puzles": "Puzles"]
    @ObservedObject var model: Launcher

    var body: some View {
        ScrollView(.horizontal) {
            HStack(spacing: 8) {
                chip(.all) { Text("Tots") }
                chip(.favs) {
                    HeartShape().fill(Palette.red).overlay(HeartShape().stroke(Color(UIColor(hex: "#7a1020")), lineWidth: 1.4)).frame(width: 18, height: 18)
                    Text("Favorits")
                    Text("\(model.favs.count)").font(.pixel(18)).opacity(0.75)
                }
                ForEach(model.categories, id: \.self) { c in chip(.category(c)) { Text(Self.names[c] ?? c) } }
            }
            .padding(.horizontal, M).padding(.bottom, 4)
        }
        .scrollIndicators(.hidden)
    }

    private func chip(_ f: Launcher.Filter, @ViewBuilder _ label: () -> some View) -> some View {
        let on = model.filter == f
        return Button { model.filter = f } label: {
            HStack(spacing: 6) { label() }
                .font(.baloo(15)).foregroundStyle(on ? Palette.brown : Palette.cream)
                .padding(.horizontal, 14).frame(height: 40)
                .background {
                    if on { YellowBlock(radius: 14) } else { RoundedRectangle(cornerRadius: 14).fill(.clear).plate(radius: 14, dim: true) }
                }
        }
        .buttonStyle(Squash(depth: 2))
        .accessibilityAddTraits(on ? .isSelected : [])
    }
}

// The ring: a paged horizontal list, the chosen cartridge big in the middle, its neighbours scaled and dimmed by their offset
// (a visual effect read from the scroll position: nothing is rebuilt while it moves). Three copies of the list make it wrap.
struct Ring: View {
    struct Slot: Hashable { let copy: Int; let id: String }
    @ObservedObject var model: Launcher
    let list: [Game]
    @Binding var selected: String?
    @State private var slot: Slot?
    private let u: CGFloat = 17, step: CGFloat = 150, side: CGFloat = 0.58

    init(model: Launcher, list: [Game], selected: Binding<String?>) {
        self.model = model
        self.list = list
        _selected = selected
        _slot = State(initialValue: Slot(copy: list.count >= 3 ? 1 : 0, id: model.opening(in: list)?.id ?? ""))
    }

    var body: some View {
        let copies = list.count >= 3 ? 3 : 1, mid = copies / 2, w = 10 * u, step = step, side = side, chosen = slot?.id
        GeometryReader { g in
            let half = g.size.width / 2
            ScrollViewReader { reader in
            ScrollView(.horizontal) {
                HStack(alignment: .bottom, spacing: step - w) {
                    ForEach(0..<copies, id: \.self) { k in
                        ForEach(list) { game in
                            item(game, slot: Slot(copy: k, id: game.id), centred: chosen == game.id)
                                .visualEffect { v, p in
                                    // the scroll view's middle, seen from this cartridge (content margins and all)
                                    let d = min(abs((p.bounds(of: .scrollView)?.midX ?? 0) - p.size.width / 2) / step, 1)
                                    return v.scaleEffect(1 - (1 - side) * d, anchor: .bottom).brightness(-0.32 * d)
                                }
                                .id(Slot(copy: k, id: game.id))
                        }
                    }
                }
                .scrollTargetLayout()
                .padding(.bottom, 16)
            }
            .contentMargins(.horizontal, half - w / 2, for: .scrollContent)
            .scrollTargetBehavior(.viewAligned)
            .scrollPosition(id: $slot, anchor: .center)
            .scrollIndicators(.hidden)
            .scrollClipDisabled()
            .onAppear { // the binding's first value is not applied, nor told to the screen
                if let slot { reader.scrollTo(slot, anchor: .center); selected = slot.id }
            }
            }
        }
        .frame(height: 12 * u + 22)
        .onChange(of: list.map(\.id)) { // a chip keeps the chosen game when it is still shown
            slot = Slot(copy: list.count >= 3 ? 1 : 0, id: list.contains { $0.id == selected } ? selected! : model.opening(in: list)?.id ?? "")
        }
        .onChange(of: slot) { _, now in
            guard let now else { return }
            if selected != now.id { selected = now.id }
            // landed on an outer copy: jump to the same game in the middle one, unseen, so the ring never runs out
            guard now.copy != mid else { return }
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.45) {
                guard slot == now else { return }
                var t = Transaction(); t.disablesAnimations = true
                withTransaction(t) { slot = Slot(copy: mid, id: now.id) }
            }
        }
        .sensoryFeedback(.selection, trigger: selected)
    }

    private func item(_ game: Game, slot s: Slot, centred: Bool) -> some View {
        let tag = game.id == model.last ? "ÚLTIM" : game.isNew ? "NOU" : nil
        return GeometryReader { p in
            Button {
                if slot == s { model.play(game, p.frame(in: .global).center) } else { withAnimation(.spring(response: 0.45, dampingFraction: 0.8)) { slot = s } }
            } label: {
                Cartridge(game: game, image: model.images[game.id], u: u).equatable()
            }
            .buttonStyle(Squash(depth: 5))
            .accessibilityLabel(game.soon ? "Aviat" : "Juga a \(game.title)")
        }
        .frame(width: 10 * u, height: 12 * u)
        .overlay(alignment: .topLeading) {
            if let tag { Tag(text: tag, isNew: tag == "NOU").offset(x: -0.35 * u, y: 2.4 * u).opacity(centred ? 1 : 0) }
        }
        .overlay(alignment: .topTrailing) {
            if !game.soon {
                FavHeart(on: model.favs.contains(game.id), size: 30) { model.toggleFav(game.id) }
                    .offset(x: 14, y: -14).opacity(centred ? 1 : 0).allowsHitTesting(centred)
            }
        }
    }
}

extension CGRect { var center: CGPoint { CGPoint(x: midX, y: midY) } }

struct Ruler: View {
    let list: [Game]
    let game: Game

    var body: some View {
        let k = (list.firstIndex(of: game) ?? 0) + 1, c = Color(game.tint)
        HStack(spacing: 10) {
            Text(String(format: "%02d", k)).foregroundStyle(c)
            HStack(spacing: 4) {
                ForEach(list) { g in RoundedRectangle(cornerRadius: 2).fill(g == game ? c : Palette.cream.opacity(0.35)).frame(width: 3, height: g == game ? 15 : 9) }
            }
            Text(String(format: "%02d", list.count)).foregroundStyle(Palette.cream.opacity(0.7))
        }
        .font(.pixel(20)).frame(height: 16)
        .animation(.easeOut(duration: 0.2), value: game.id)
    }
}

// JUGA in the game's colour: a face on a thick edge that squashes when pressed.
struct PlayButton: View {
    let game: Game
    let play: (CGPoint) -> Void

    var body: some View {
        let c = game.soon ? UIColor(hex: "#a89a8a") : game.tint
        GeometryReader { p in
            Button { if !game.soon { play(p.frame(in: .global).center) } } label: {
                HStack(spacing: 10) {
                    if !game.soon { Image(systemName: "play.fill").font(.system(size: 24, weight: .black)) }
                    Text(game.soon ? "AVIAT" : "JUGA").font(.baloo(30)).kerning(0.5)
                }
                .foregroundStyle(game.soon ? Color(UIColor(hex: "#4b4038")) : Color(UIColor(hex: game.ink)))
                .frame(maxWidth: .infinity, minHeight: 64)
                .background(ChunkyFace(color: c, radius: 22, depth: 7))
            }
            .buttonStyle(Squash(depth: 7))
            .disabled(game.soon)
        }
        .frame(height: 64 + 7)
        .animation(.easeOut(duration: 0.2), value: game.id)
    }
}

struct ChunkyFace: View {
    let color: UIColor
    let radius: CGFloat
    let depth: CGFloat

    var body: some View {
        RoundedRectangle(cornerRadius: radius)
            .fill(LinearGradient(stops: [.init(color: Color(color.mix(.white, 0.3)), location: 0), .init(color: Color(color), location: 0.46),
                                         .init(color: Color(color.mix(color.mix(.black, 0.5), 0.14)), location: 1)], startPoint: .top, endPoint: .bottom))
            .overlay(alignment: .top) { // the shine
                RoundedRectangle(cornerRadius: radius - 6).fill(LinearGradient(colors: [.white.opacity(0.5), .white.opacity(0)], startPoint: .top, endPoint: .bottom))
                    .frame(height: 24).padding(.horizontal, 8).padding(.top, 5)
            }
            .background(RoundedRectangle(cornerRadius: radius).fill(Color(color.mix(.black, 0.5))).offset(y: depth))
            .background(RoundedRectangle(cornerRadius: radius).fill(.black.opacity(0.35)).offset(y: depth + 2).shadow(color: .black.opacity(0.38), radius: 9, y: 10))
    }
}

// Every game, four a row: a tap plays it.
struct Grid: View {
    @ObservedObject var model: Launcher
    let list: [Game]

    var body: some View {
        LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 12), count: 4), spacing: 20) {
            ForEach(list) { game in
                GridCell(model: model, game: game)
            }
        }
        .padding(.horizontal, M)
    }
}

struct GridCell: View {
    @ObservedObject var model: Launcher
    let game: Game
    @State private var shake = false

    var body: some View {
        let u = (UIScreen.main.bounds.width - 2 * M - 3 * 12) / 4 / 10.4
        let tag = game.id == model.last ? "ÚLTIM" : game.isNew ? "NOU" : nil
        VStack(spacing: 12) {
            GeometryReader { p in
                Button {
                    if game.soon { withAnimation(.spring(response: 0.2, dampingFraction: 0.2)) { shake.toggle() } } else { model.play(game, p.frame(in: .global).center) }
                } label: { Cartridge(game: game, image: model.images[game.id], u: u).equatable() }
                .buttonStyle(Squash(depth: 3))
                .accessibilityLabel(game.soon ? "Aviat" : "Juga a \(game.title)")
            }
            .frame(width: 10 * u, height: 12 * u)
            .offset(x: shake ? 4 : 0)
            .overlay(alignment: .topLeading) { if let tag { Tag(text: tag, isNew: tag == "NOU").offset(x: -0.35 * u - 4, y: 2.4 * u) } }
            .overlay(alignment: .topTrailing) {
                if !game.soon { FavHeart(on: model.favs.contains(game.id), size: 24) { model.toggleFav(game.id) }.offset(x: 16, y: -16) }
            }
            // records come with reportBest (native-shell.md, «Also required»): until then, none
            Text(game.soon ? " " : "Sense rècord").font(.balooBold(12)).foregroundStyle(Palette.cream.opacity(0.75)).lineLimit(1)
        }
        .sensoryFeedback(.error, trigger: shake)
    }
}

struct EmptyFavs: View {
    let showAll: () -> Void

    var body: some View {
        VStack(spacing: 12) {
            Circle().fill(Palette.cream).frame(width: 72, height: 72)
                .overlay(HeartShape().stroke(Palette.red, style: StrokeStyle(lineWidth: 2.4, lineJoin: .round, dash: [4, 3])).frame(width: 40, height: 40))
            Text("Encara no tens favorits").font(.baloo(21)).foregroundStyle(Palette.cream)
            Text("Toca el cor d’un joc i el tindràs aquí, a mà.").font(.balooBold(14)).foregroundStyle(Palette.cream.opacity(0.7)).multilineTextAlignment(.center)
            Button(action: showAll) {
                Text("Mira tots els jocs").font(.baloo(17)).foregroundStyle(Palette.brown).padding(.horizontal, 16).frame(minHeight: 44)
                    .background(ChunkyFace(color: UIColor(hex: "#fff3d6"), radius: 14, depth: 4))
            }
            .buttonStyle(Squash(depth: 4)).padding(.bottom, 4)
        }
        .frame(maxWidth: .infinity).padding(.horizontal, 20).padding(.top, 28).padding(.bottom, 24)
        .background(RoundedRectangle(cornerRadius: 24).fill(Color(UIColor(hex: "#26170d"))).shadow(color: .black.opacity(0.45), radius: 0, y: 4))
        .overlay(RoundedRectangle(cornerRadius: 24).stroke(Palette.cream.opacity(0.14), lineWidth: 2))
    }
}

// ---- Perfil: a placeholder until the native session and settings exist (phases 3-4); no stars
struct PerfilScreen: View {
    @ObservedObject var model: Launcher

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                HStack {
                    Text("Perfil").font(.baloo(34)).foregroundStyle(Palette.cream)
                    Spacer()
                    Image(systemName: "gearshape").font(.system(size: 22, weight: .bold)).foregroundStyle(.white)
                        .frame(width: 48, height: 48).plate(radius: 18, dim: false)
                        .accessibilityLabel("Ajustos")
                }
                .padding(.top, 8).frame(minHeight: 48)
                HStack(spacing: 8) {
                    ForEach(["Partides", "Jocs", "Dies jugats"], id: \.self) { label in
                        VStack(spacing: 4) {
                            Text("—").font(.baloo(22)).foregroundStyle(Palette.cream)
                            Text(label).font(.balooBold(12)).foregroundStyle(Palette.cream.opacity(0.68))
                        }
                        .frame(maxWidth: .infinity).frame(height: 64)
                        .background(RoundedRectangle(cornerRadius: 20).fill(Palette.cream.opacity(0.13)).shadow(color: .black.opacity(0.28), radius: 0, y: 3))
                    }
                }
                .padding(.top, 12)
            }
            .padding(.horizontal, M)
        }
        .scrollIndicators(.hidden)
    }
}

// ---- S2's floating tab bar: a plate with a yellow block that slides to the chosen tab
struct TabBar: View {
    @ObservedObject var model: Launcher
    @Namespace private var mark

    var body: some View {
        HStack(spacing: 4) {
            tab(.jocs, "Jocs") { GameboyIcon() }
            tab(.perfil, "Perfil") {
                if let icon = model.icon {
                    Image(uiImage: icon).resizable().clipShape(RoundedRectangle(cornerRadius: 11))
                        .overlay(RoundedRectangle(cornerRadius: 11).stroke(Palette.cream, lineWidth: 2))
                        .shadow(color: .black.opacity(0.4), radius: 0, y: 2)
                }
            }
        }
        .padding(6)
        .frame(width: 264, height: 68)
        .plate(radius: 26, dim: false)
    }

    private func tab(_ t: Launcher.Tab, _ label: String, @ViewBuilder icon: () -> some View) -> some View {
        let on = (model.tab ?? .jocs) == t
        return Button { withAnimation(.spring(response: 0.5, dampingFraction: 0.7)) { model.tab = t } } label: {
            HStack(spacing: 8) {
                icon().frame(width: 36, height: 36)
                if on { Text(label).font(.baloo(16)).foregroundStyle(Palette.brown).fixedSize() }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background { if on { YellowBlock(radius: 20).matchedGeometryEffect(id: "mark", in: mark) } }
        }
        .buttonStyle(Squash(depth: 2))
        .layoutPriority(on ? 1.6 : 1)
        .frame(maxWidth: on ? .infinity : 88)
        .accessibilityLabel(label)
        .accessibilityAddTraits(on ? .isSelected : [])
        .sensoryFeedback(.selection, trigger: on)
    }
}

struct GameboyIcon: View {
    var body: some View {
        let edge = Color(UIColor(hex: "#06304a"))
        Canvas { ctx, size in
            let s = size.width / 40
            func r(_ x: CGFloat, _ y: CGFloat, _ w: CGFloat, _ h: CGFloat) -> CGRect { CGRect(x: x * s, y: y * s, width: w * s, height: h * s) }
            ctx.fill(Path(roundedRect: r(8, 4, 24, 32), cornerRadius: 4 * s), with: .color(Color(UIColor(hex: "#3ec6ff"))))
            ctx.stroke(Path(roundedRect: r(8, 4, 24, 32), cornerRadius: 4 * s), with: .color(edge), lineWidth: 2.6 * s)
            ctx.fill(Path(roundedRect: r(12, 8.5, 16, 14), cornerRadius: 2 * s), with: .color(Palette.cream))
            ctx.stroke(Path(roundedRect: r(12, 8.5, 16, 14), cornerRadius: 2 * s), with: .color(edge), lineWidth: 2 * s)
            var hill = Path()
            hill.addLines([CGPoint(x: 15 * s, y: 19 * s), CGPoint(x: 18.5 * s, y: 13 * s), CGPoint(x: 21.5 * s, y: 17 * s), CGPoint(x: 23.5 * s, y: 14.5 * s), CGPoint(x: 26 * s, y: 19 * s)])
            ctx.fill(hill, with: .color(Palette.pink))
            var cross = Path()
            cross.move(to: CGPoint(x: 13 * s, y: 29.5 * s)); cross.addLine(to: CGPoint(x: 16 * s, y: 29.5 * s))
            cross.move(to: CGPoint(x: 14.5 * s, y: 28 * s)); cross.addLine(to: CGPoint(x: 14.5 * s, y: 31 * s))
            ctx.stroke(cross, with: .color(edge), style: StrokeStyle(lineWidth: 2.2 * s, lineCap: .round))
            ctx.fill(Path(ellipseIn: r(23, 27.5, 4, 4)), with: .color(Color(Palette.yellow)))
            ctx.stroke(Path(ellipseIn: r(23, 27.5, 4, 4)), with: .color(edge), lineWidth: 1.6 * s)
        }
        .shadow(color: .black.opacity(0.4), radius: 0, y: 2)
    }
}

struct YellowBlock: View {
    let radius: CGFloat
    var body: some View {
        RoundedRectangle(cornerRadius: radius)
            .fill(LinearGradient(colors: [Palette.yellowHi, Color(Palette.yellow)], startPoint: .top, endPoint: .bottom))
            .overlay { RoundedRectangle(cornerRadius: radius).stroke(.white.opacity(0.6), lineWidth: 2).mask(alignment: .top) { Rectangle().frame(height: 3) } } // the top shine
            .background(RoundedRectangle(cornerRadius: radius).fill(Palette.yellowLo).offset(y: 3))
    }
}

extension View {
    // the game's own surface: a smoked plaque with a cream outline and a hard drop edge
    func plate(radius: CGFloat, dim: Bool) -> some View {
        background(RoundedRectangle(cornerRadius: radius).fill(Palette.smoke)
            .shadow(color: .black.opacity(0.5), radius: 0, y: 4).shadow(color: .black.opacity(0.28), radius: 7, y: 8))
            .overlay(RoundedRectangle(cornerRadius: radius).inset(by: 1).stroke(Palette.cream.opacity(dim ? 0.45 : 1), lineWidth: 2))
    }
}
