import SwiftUI

// The cartridge (ronda-10's C4, `cart()`): an even-bevelled body over a darker copy for its side, two grip lines, a cream
// label with the art and the short name, and a socket whose ten pins run out to the bottom edge. Everything is centred on
// x = 5.16u (the face's middle). Sized by u: the drawing is 10.32u × 12.42u.
struct Cartridge: View, Equatable {
    static let size = CGSize(width: 10.32, height: 12.42)
    let color: UIColor
    let name: String
    let image: UIImage?
    let locked: Bool
    var plus = false // the odd count's filler: a + on a brown window instead of art
    let u: CGFloat

    init(game: Game, image: UIImage?, u: CGFloat) {
        color = game.tint; name = game.label; self.image = image; locked = game.soon; self.u = u
    }
    // fills the lone last slot of an odd count: not a game, nothing to tap
    static func filler(u: CGFloat) -> Cartridge {
        var c = Cartridge(color: UIColor(hex: "#7a5a44"), name: Bundle.main.localizedString(forKey: "ui.select.aviat", value: nil, table: nil), image: nil, locked: false, u: u)
        c.plus = true
        return c
    }
    private init(color: UIColor, name: String, image: UIImage?, locked: Bool, u: CGFloat) {
        self.color = color; self.name = name; self.image = image; self.locked = locked; self.u = u
    }

    static func == (a: Cartridge, b: Cartridge) -> Bool {
        a.color == b.color && a.name == b.name && a.image === b.image && a.locked == b.locked && a.plus == b.plus && a.u == b.u
    }

    var body: some View {
        let c = color, u = u, art = CGRect(x: 1.21 * u, y: 2.35 * u, width: 7.9 * u, height: 5.35 * u)
        ZStack(alignment: .topLeading) {
            Canvas { ctx, _ in Self.draw(ctx, color: c, u: u, back: false) }
            Group {
                if plus {
                    Color(UIColor(hex: "#59402e")).overlay {
                        Image(systemName: "plus").font(.system(size: 2.1 * u, weight: .bold)).foregroundStyle(Palette.cream.opacity(0.8))
                    }
                } else {
                    Color(c).overlay {
                        if let image { Cover(image: image, size: art.size) }
                    }
                    .overlay { if locked { Color(red: 28 / 255, green: 17 / 255, blue: 10 / 255).opacity(0.55).overlay(Lock().frame(width: 2.4 * u, height: 2.4 * u)) } }
                }
            }
            .frame(width: art.width, height: art.height)
            .clipShape(RoundedRectangle(cornerRadius: 0.3 * u))
            .offset(x: art.minX, y: art.minY)
            Text(name)
                .font(.baloo(1.4 * u)) // Baloo everywhere: the owner dropped the pixel face
                .foregroundStyle(Palette.ink)
                .lineLimit(1).minimumScaleFactor(0.5) // a long name shrinks rather than being cut
                .frame(width: 7.9 * u - 4, height: 1.73 * u)
                .offset(x: 1.21 * u + 2, y: 7.92 * u)
        }
        .frame(width: Self.size.width * u, height: Self.size.height * u, alignment: .topLeading)
        .drawingGroup() // one bitmap: a scroll only moves it
    }

    // The cartridge's back, seen halfway through Lift's turn: the same shell, laser-engraved tone on tone (a darker inset
    // with a lighter edge under it, no new colours): «mulassa.cat», big. Lift shows it as
    // a real back face, so it reads left to right.
    static func back(color: UIColor, u: CGFloat) -> some View {
        Canvas { ctx, _ in draw(ctx, color: color, u: u, back: true) }
            .frame(width: size.width * u, height: size.height * u).drawingGroup()
    }

    // The engraving: each mark twice, the shell's light 1 pt lower, then its darker inset on top.
    private static func engrave(_ ctx: GraphicsContext, color c: UIColor, u: CGFloat) {
        let ink = UIColor(hex: "#1d100a"), cut = Color(c.mix(ink, 0.3)), lit = Color(c.mix(UIColor(hex: "#fff3d6"), 0.45))
        func text(_ s: String, _ size: CGFloat, _ y: CGFloat) {
            for (fill, dy) in [(lit, 1.0), (cut, 0.0)] {
                ctx.draw(Text(verbatim: s).font(.baloo(size * u)).foregroundColor(fill), at: CGPoint(x: 5.16 * u, y: y * u + dy))
            }
        }
        text("mulassa.cat", 1.1, 6.3) // the owner: only «mulassa.cat», big
        let frame = Path(roundedRect: CGRect(x: 1.3 * u, y: 2.3 * u, width: 7.72 * u, height: 8.0 * u), cornerRadius: 0.5 * u)
        ctx.stroke(frame.offsetBy(dx: 0, dy: 1), with: .color(lit), lineWidth: 0.12 * u)
        ctx.stroke(frame, with: .color(cut), lineWidth: 0.12 * u)
    }

    private static func draw(_ ctx: GraphicsContext, color c: UIColor, u: CGFloat, back: Bool) {
        func r(_ x: CGFloat, _ y: CGFloat, _ w: CGFloat, _ h: CGFloat, _ rad: CGFloat, _ fill: UIColor) {
            ctx.fill(Path(roundedRect: CGRect(x: x * u, y: y * u, width: w * u, height: h * u), cornerRadius: rad * u), with: .color(Color(fill)))
        }
        let ink = UIColor(hex: "#1d100a"), dark = c.mix(ink, 0.62), shadow = c.mix(ink, 0.34), light = c.mix(UIColor(hex: "#fff3d6"), 0.55)
        let shape = Path { p in // SHAPE: M.16 .72 .88 0H9.44L10.16 .72V11.35L9.46 12.05H.86L.16 11.35Z
            p.addLines([(0.16, 0.72), (0.88, 0), (9.44, 0), (10.16, 0.72), (10.16, 11.35), (9.46, 12.05), (0.86, 12.05), (0.16, 11.35)].map { CGPoint(x: $0.0 * u, y: $0.1 * u) })
            p.closeSubpath()
        }
        ctx.fill(shape.offsetBy(dx: 0, dy: 0.34 * u), with: .color(Color(dark)))
        ctx.fill(shape, with: .linearGradient(Gradient(stops: [.init(color: Color(c.mix(.white, 0.18)), location: 0), .init(color: Color(c), location: 0.52),
                                                               .init(color: Color(c.mix(UIColor(hex: "#251008"), 0.12)), location: 1)]),
                                              startPoint: .zero, endPoint: CGPoint(x: 0, y: 12.05 * u)))
        if back { engrave(ctx, color: c, u: u); return }
        for y in [1.02, 1.36] { r(2.46, y, 5.4, 0.14, 0.07, shadow); r(2.46, y + 0.14, 5.4, 0.07, 0.035, light) }
        r(0.78, 1.93, 8.76, 8.12, 0.42, dark)
        r(0.89, 2.04, 8.54, 7.9, 0.33, UIColor(hex: "#fff3d6"))
        let socket = UIColor(hex: "#38271b")
        r(1.96, 10.78, 6.4, 1.27, 0.2, socket); r(1.96, 11.6, 6.4, 0.45, 0, socket)
        for k in 0..<10 { r(5.16 - (9 * 0.61 + 0.33) / 2 + CGFloat(k) * 0.61, 10.98, 0.33, 1.07, 0, UIColor(hex: "#efbf59")) }
    }
}

// object-fit: cover at object-position 50% 22%: the art's top part shows, where the figures' heads are.
private struct Cover: View {
    let image: UIImage
    let size: CGSize
    var body: some View {
        let k = max(size.width / image.size.width, size.height / image.size.height), w = image.size.width * k, h = image.size.height * k
        Image(uiImage: image).resizable().frame(width: w, height: h)
            .offset(x: (size.width - w) * 0.5, y: (size.height - h) * 0.22)
            .frame(width: size.width, height: size.height, alignment: .topLeading)
    }
}

// The prototype's padlock (24-unit box): a cream body and its shackle.
private struct Lock: View {
    var body: some View {
        Canvas { ctx, size in
            let s = size.width / 24
            ctx.fill(Path(roundedRect: CGRect(x: 5 * s, y: 10.5 * s, width: 14 * s, height: 10 * s), cornerRadius: 2.5 * s), with: .color(Palette.cream))
            var p = Path()
            p.move(to: CGPoint(x: 8 * s, y: 10.5 * s)); p.addLine(to: CGPoint(x: 8 * s, y: 8 * s))
            p.addArc(center: CGPoint(x: 12 * s, y: 8 * s), radius: 4 * s, startAngle: .degrees(180), endAngle: .degrees(0), clockwise: false)
            p.addLine(to: CGPoint(x: 16 * s, y: 10.5 * s))
            ctx.stroke(p, with: .color(Palette.cream), lineWidth: 2.4 * s)
        }
    }
}

// Pressed: it sinks onto its edge and squashes, then springs back.
struct Squash: ButtonStyle {
    var depth: CGFloat = 3
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(x: configuration.isPressed ? 1.04 : 1, y: configuration.isPressed ? 0.93 : 1, anchor: .bottom)
            .offset(y: configuration.isPressed ? depth : 0)
            .animation(configuration.isPressed ? .easeOut(duration: 0.06) : .spring(response: 0.4, dampingFraction: 0.45), value: configuration.isPressed)
    }
}
