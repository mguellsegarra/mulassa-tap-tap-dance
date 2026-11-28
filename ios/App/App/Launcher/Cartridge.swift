import SwiftUI

// The cartridge (ronda-10's C4, `cart()`): a body keyed by one cut corner over a darker copy for its side, an engraved grip, a cream
// label with the art and the short name, and a socket whose ten pins run out to the bottom edge. Everything is centred on
// x = 5.16u (the face's middle). Sized by u: the drawing is 10.32u × 12.42u.
struct Cartridge: View, Equatable {
    static let size = CGSize(width: 10.32, height: 12.42)
    let color: UIColor
    let name: String
    let image: UIImage?
    let locked: Bool
    var plus = false // the odd count's filler: a + on a brown window instead of art
    var number: Int? // its place in the catalogue, engraved in the grip (the filler has none)
    var planes: Planes? // the art in two planes (ronda 38): the figure slides over its backdrop as the phone leans
    var window = true // the art in its window; the grid draws it apart, to slide behind the label (Motion.swift)
    let u: CGFloat

    init(game: Game, number: Int?, image: UIImage?, planes: Planes? = nil, u: CGFloat) {
        color = game.tint; name = game.label; self.image = image; self.planes = planes; locked = game.soon; self.number = number; self.u = u
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
        a.color == b.color && a.name == b.name && a.image === b.image && a.planes?.front === b.planes?.front && a.planes?.back === b.planes?.back && a.locked == b.locked && a.plus == b.plus && a.number == b.number && a.window == b.window && a.u == b.u
    }

    var body: some View {
        let c = color, u = u, number = number
        ZStack(alignment: .topLeading) {
            Canvas { ctx, _ in Self.draw(ctx, color: c, number: number, u: u, back: false) }
            if window { Window(cart: self, lean: .zero) }
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

    // The back, seen halfway through Lift's turn (ronda 30): the same shell, its cut corner on the other side (seen from
    // behind), with an engraved frame and the Mulassa's head in its round badge (ronda 33, the owner's B3-cap-final), tone
    // on tone. Lift shows it as a real back face, so it reads.
    static func back(color: UIColor, u: CGFloat) -> some View {
        Canvas { ctx, _ in draw(ctx, color: color, number: nil, u: u, back: true) }
            .frame(width: size.width * u, height: size.height * u).drawingGroup()
    }

    private static func draw(_ ctx: GraphicsContext, color c: UIColor, number: Int?, u: CGFloat, back: Bool) {
        func r(_ x: CGFloat, _ y: CGFloat, _ w: CGFloat, _ h: CGFloat, _ rad: CGFloat, _ fill: UIColor) {
            ctx.fill(Path(roundedRect: CGRect(x: x * u, y: y * u, width: w * u, height: h * u), cornerRadius: rad * u), with: .color(Color(fill)))
        }
        let ink = UIColor(hex: "#1d100a"), dark = c.mix(ink, 0.62), shadow = c.mix(ink, 0.34), light = c.mix(UIColor(hex: "#fff3d6"), 0.55)
        // square corners with a small bevel, one big cut at the bottom (ronda 30, the owner): it goes in only one way round
        let shape = Path { p in // SHAPE: M.16 .25L.41 0H9.91L10.16 .25V10.95L9.06 12.05H.41L.16 11.8Z
            p.addLines([(0.16, 0.25), (0.41, 0), (9.91, 0), (10.16, 0.25), (10.16, 10.95), (9.06, 12.05), (0.41, 12.05), (0.16, 11.8)].map { CGPoint(x: $0.0 * u, y: $0.1 * u) })
            p.closeSubpath()
        }
        var shell = ctx
        if back { shell.translateBy(x: size.width * u, y: 0); shell.scaleBy(x: -1, y: 1) }
        shell.fill(shape.offsetBy(dx: 0, dy: 0.34 * u), with: .color(Color(dark)))
        shell.fill(shape, with: .linearGradient(Gradient(stops: [.init(color: Color(c.mix(.white, 0.18)), location: 0), .init(color: Color(c), location: 0.52),
                                                               .init(color: Color(c.mix(UIColor(hex: "#251008"), 0.12)), location: 1)]),
                                              startPoint: .zero, endPoint: CGPoint(x: 0, y: 12.05 * u)))
        if back { return engrave(ctx, color: c, u: u) } // (before the edge lights: the back's outline is mirrored, they are not)
        // volume (ronda 36): the light catches the top and left edges of the moulded shell, the right one falls in shade
        r(0.5, 0.07, 9.32, 0.09, 0.045, c.mix(.white, 0.55)); r(0.23, 0.34, 0.09, 11.4, 0.045, c.mix(.white, 0.38))
        r(10.0, 0.34, 0.09, 10.5, 0.045, c.mix(ink, 0.22))
        // the grip (ronda 28, the owner): a recessed pill engraved with the cartridge's number, «#01», between three ridges
        // a side (the word «Mulassa» stays in the logo); each mark twice, the shell's light 1 pt lower, then its darker cut
        for y in [0.6, 0.96, 1.32] { for x in [1.12, 6.86] { r(x, y, 2.34, 0.14, 0.07, shadow); r(x, y + 0.14, 2.34, 0.07, 0.035, light) } }
        let pill = Path(roundedRect: CGRect(x: 3.86 * u, y: 0.4 * u, width: 2.6 * u, height: 1.2 * u), cornerRadius: 0.6 * u)
        ctx.fill(pill.offsetBy(dx: 0, dy: 1), with: .color(Color(light)))
        ctx.fill(pill, with: .color(Color(c.mix(ink, 0.12))))
        for (fill, dy) in [(light, 1.0), (shadow, 0.0)] where number != nil {
            ctx.draw(Text(verbatim: String(format: "#%02d", number ?? 0)).font(.baloo(0.86 * u)).foregroundColor(Color(fill)), at: CGPoint(x: 5.16 * u, y: 1.0 * u + dy))
        }
        r(0.78, 1.93, 8.76, 8.12, 0.42, dark)
        r(0.89, 2.04, 8.54, 7.9, 0.33, UIColor(hex: "#fff3d6"))
        let socket = UIColor(hex: "#38271b")
        r(1.96, 10.78, 6.4, 1.27, 0.2, socket); r(1.96, 11.6, 6.4, 0.45, 0, socket)
        for k in 0..<10 { r(5.16 - (9 * 0.61 + 0.33) / 2 + CGFloat(k) * 0.61, 10.98, 0.33, 1.07, 0, UIColor(hex: "#efbf59")) }
    }
}

extension Cartridge {
    // the face's outline (draw's SHAPE), for the grid's slab edge behind it
    static func outline(u: CGFloat) -> Path {
        Path { p in
            p.addLines([(0.16, 0.25), (0.41, 0), (9.91, 0), (10.16, 0.25), (10.16, 10.95), (9.06, 12.05), (0.41, 12.05), (0.16, 11.8)].map { CGPoint(x: $0.0 * u, y: $0.1 * u) })
            p.closeSubpath()
        }
    }
    // its shadow on the sky, under the grid's cartridges: two soft steps, no blur (a blur is redrawn as the cartridge leans)
    static func shadow(u: CGFloat) -> some View {
        ZStack(alignment: .topLeading) {
            RoundedRectangle(cornerRadius: 0.6 * u).fill(.black.opacity(0.1)).frame(width: 9.6 * u, height: 11.6 * u).offset(x: 0.36 * u, y: 1.25 * u)
            RoundedRectangle(cornerRadius: 0.8 * u).fill(.black.opacity(0.07)).frame(width: 10.2 * u, height: 11.9 * u).offset(x: 0.06 * u, y: 1.35 * u)
        }
        .frame(width: size.width * u, height: size.height * u, alignment: .topLeading)
    }

    // The back's engraving: each mark twice, the shell's light 1 pt lower, then its darker inset on top.
    fileprivate static func engrave(_ ctx: GraphicsContext, color c: UIColor, u: CGFloat) {
        let ink = UIColor(hex: "#1d100a"), cut = Color(c.mix(ink, 0.3)), lit = Color(c.mix(UIColor(hex: "#fff3d6"), 0.45))
        let frame = Path(roundedRect: CGRect(x: 1.3 * u, y: 2.3 * u, width: 7.72 * u, height: 8.0 * u), cornerRadius: 0.5 * u)
        ctx.stroke(frame.offsetBy(dx: 0, dy: 1), with: .color(lit), lineWidth: 0.12 * u)
        ctx.stroke(frame, with: .color(cut), lineWidth: 0.12 * u)
        let badge = CGRect(x: (5.16 - 3) * u, y: (6.3 - 3) * u, width: 6 * u, height: 6 * u) // a mask: its ink takes each colour
        for (fill, dy) in [(lit, 1.0), (cut, 0.0)] {
            var image = ctx.resolve(Image("mulassa_badge").renderingMode(.template))
            image.shading = .color(fill)
            ctx.draw(image, in: badge.offsetBy(dx: 0, dy: dy))
        }
    }
}

struct Planes { let back: UIImage, front: UIImage }

// The label's window (ronda 37, Astra's recipe): the art sits a little behind the label, drawn 12 % bigger than its window, so
// it can slide under the frame as the phone leans (`lean`, Motion.swift's -1...1) without showing an edge; over it the
// cavity's shade along the top and left, the lock, and the varnish: one soft warm light that moves across the glass and
// grows a little with the lean. The window itself stays put: only what is behind it and the light on it move.
struct Window: View {
    let cart: Cartridge
    let lean: CGPoint

    var body: some View {
        let u = cart.u, art = CGRect(x: 1.21 * u, y: 2.35 * u, width: 7.9 * u, height: 5.35 * u), far = min(1, hypot(lean.x, lean.y))
        Group {
            if cart.plus {
                Color(UIColor(hex: "#59402e")).overlay {
                    Image(systemName: "plus").font(.system(size: 2.1 * u, weight: .bold)).foregroundStyle(Palette.cream.opacity(0.8))
                }
            } else {
                Color(cart.color).overlay {
                    if let planes = cart.planes { // the backdrop goes one way and the figure the other: 6.8 pt apart on a 160 pt cartridge
                        Cover(image: planes.back, size: art.size).scaleEffect(1.12).offset(x: -lean.x * 0.29 * u, y: -lean.y * 0.2 * u)
                        // 5 % bigger: a figure cut by its picture's edge never shows that edge as it slides
                        Cover(image: planes.front, size: art.size).scaleEffect(1.05).offset(x: lean.x * 0.15 * u, y: lean.y * 0.11 * u)
                    } else if let image = cart.image {
                        Cover(image: image, size: art.size).scaleEffect(1.12).offset(x: -lean.x * 0.4 * u, y: -lean.y * 0.28 * u)
                    }
                }
            }
        }
        .overlay(alignment: .top) { LinearGradient(colors: [.black.opacity(0.3), .black.opacity(0)], startPoint: .top, endPoint: .bottom).frame(height: 0.5 * u) }
        .overlay(alignment: .leading) { LinearGradient(colors: [.black.opacity(0.2), .black.opacity(0)], startPoint: .leading, endPoint: .trailing).frame(width: 0.4 * u) }
        .overlay { if cart.locked { Color(red: 28 / 255, green: 17 / 255, blue: 10 / 255).opacity(0.55).overlay(Lock().frame(width: 2.4 * u, height: 2.4 * u)) } }
        .overlay {
            EllipticalGradient(colors: [Palette.cream.opacity(0.1 + 0.16 * far), Palette.cream.opacity(0)],
                               center: UnitPoint(x: 0.24 + 0.6 * lean.x, y: 0.12 + 0.44 * lean.y), startRadiusFraction: 0, endRadiusFraction: 0.75)
        }
        .frame(width: art.width, height: art.height)
        .clipShape(RoundedRectangle(cornerRadius: 0.3 * u))
        .offset(x: art.minX, y: art.minY)
        .allowsHitTesting(false)
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
