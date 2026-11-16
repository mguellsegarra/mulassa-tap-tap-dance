import SwiftUI

// The cartridge (round 8's J1): a chamfered top-right corner, a notch, grip ridges, a cream label with the game's art and
// short name, gold contacts and a darker copy behind for thickness. Sized by u, a tenth of its width (10u × 12u).
struct CartridgeShape: Shape {
    func path(in r: CGRect) -> Path {
        let u = r.width / 10, w = r.width, h = r.height
        var p = Path()
        p.addLines([(0, 0.6 * u), (0.6 * u, 0), (3.3 * u, 0), (3.3 * u, 0.42 * u), (6.2 * u, 0.42 * u), (6.2 * u, 0),
                    (w - 1.7 * u, 0), (w, 1.7 * u), (w, h - 0.7 * u), (w - 0.7 * u, h), (0.7 * u, h), (0, h - 0.7 * u)]
            .map { CGPoint(x: r.minX + $0.0, y: r.minY + $0.1) })
        p.closeSubpath()
        return p
    }
}

// The body, art and name in one drawing, flattened into a single bitmap (drawingGroup): a ring move or a scroll only moves it.
// Equatable, so nothing around it (selection, favourites) redraws it.
struct Cartridge: View, Equatable {
    let game: Game
    let image: UIImage?
    let u: CGFloat

    static func == (a: Cartridge, b: Cartridge) -> Bool { a.game == b.game && a.image === b.image && a.u == b.u }

    var body: some View {
        let c = game.tint, pad = u
        ZStack(alignment: .topLeading) {
            Canvas { ctx, _ in
                let box = CGRect(x: 0, y: 0, width: 10 * u, height: 12 * u)
                ctx.fill(CartridgeShape().path(in: box.offsetBy(dx: 0.32 * u, dy: 0.42 * u)), with: .color(Color(c.mix(.black, 0.58))))
                ctx.fill(CartridgeShape().path(in: box), with: .linearGradient(Gradient(stops: [
                    .init(color: Color(c.mix(.white, 0.3)), location: 0), .init(color: Color(c), location: 0.1),
                    .init(color: Color(c), location: 0.72), .init(color: Color(c.mix(.black, 0.18)), location: 1)]),
                    startPoint: .zero, endPoint: CGPoint(x: 0, y: 12 * u)))
                for k in 0..<3 { // grip ridges under the notch
                    let y = 0.85 * u + CGFloat(k) * 0.28 * u
                    ctx.fill(Path(CGRect(x: 1.1 * u, y: y, width: 6.6 * u, height: 0.14 * u)), with: .color(Color(c.mix(.black, 0.45))))
                    ctx.fill(Path(CGRect(x: 1.1 * u, y: y + 0.14 * u, width: 6.6 * u, height: 0.14 * u)), with: .color(Color(c.mix(.white, 0.4))))
                }
                // the label's dark rim
                ctx.fill(Path(roundedRect: CGRect(x: 0.59 * u, y: 1.89 * u, width: 8.82 * u, height: 8.22 * u), cornerRadius: 0.66 * u),
                         with: .color(Color(c.mix(.black, 0.5))))
                // gold contacts along the bottom edge
                ctx.fill(Path(roundedRect: CGRect(x: 1.6 * u, y: 10.5 * u, width: 6.8 * u, height: u), cornerRadius: 0.25 * u), with: .color(Palette.ink))
                var x = 1.82 * u
                while x + 0.34 * u <= 8.3 * u {
                    ctx.fill(Path(CGRect(x: x, y: 10.7 * u, width: 0.34 * u, height: 0.8 * u)), with: .color(Color(UIColor(hex: "#f2c75a"))))
                    ctx.fill(Path(CGRect(x: x + 0.34 * u, y: 10.7 * u, width: 0.08 * u, height: 0.8 * u)), with: .color(Color(UIColor(hex: "#a8761e"))))
                    x += 0.62 * u
                }
            }
            .frame(width: 10.4 * u, height: 12.5 * u)

            VStack(spacing: 0.22 * u) {
                Color(c)
                    .overlay {
                        if let image { Image(uiImage: image).resizable().scaledToFill().saturation(game.soon ? 0.4 : 1) }
                    }
                    .clipShape(RoundedRectangle(cornerRadius: 0.3 * u))
                Text(game.label)
                    .font(.pixel(1.55 * u))
                    .foregroundStyle(Palette.ink)
                    .lineLimit(1)
                    .frame(height: 1.12 * u)
            }
            .padding(0.3 * u)
            .frame(width: 8.5 * u, height: 7.9 * u)
            .background(RoundedRectangle(cornerRadius: 0.5 * u).fill(Palette.cream))
            .offset(x: 0.75 * u, y: 2.05 * u)
        }
        .frame(width: 10.4 * u, height: 12.5 * u, alignment: .topLeading)
        .shadow(color: .black.opacity(0.4), radius: 0.3 * u, y: 0.45 * u)
        .saturation(game.soon ? 0.6 : 1)
        .padding(pad)
        .drawingGroup()
        .padding(-pad)
        .frame(width: 10 * u, height: 12 * u, alignment: .topLeading)
    }
}

// The favourite heart on the chamfered corner, 44 pt to touch.
struct FavHeart: View {
    let on: Bool
    let size: CGFloat
    let toggle: () -> Void

    var body: some View {
        Button(action: toggle) {
            Circle().fill(Palette.cream)
                .overlay(Circle().stroke(Palette.ink.opacity(0.55), lineWidth: 2))
                .shadow(color: .black.opacity(0.4), radius: 0, y: 3)
                .overlay(HeartShape().fill(on ? Palette.red : .clear).overlay(HeartShape().stroke(on ? Color(UIColor(hex: "#7a1020")) : Color(UIColor(hex: "#8a6a52")), style: StrokeStyle(lineWidth: 2.2, lineJoin: .round))).frame(width: size * 0.6, height: size * 0.6).offset(y: 1))
                .frame(width: size, height: size)
                .frame(width: 44, height: 44)
                .contentShape(Rectangle())
        }
        .buttonStyle(Squash(depth: 0))
        .sensoryFeedback(.impact(weight: .light), trigger: on)
        .accessibilityLabel("Favorit")
        .accessibilityAddTraits(on ? .isSelected : [])
    }
}

struct HeartShape: Shape {
    func path(in r: CGRect) -> Path {
        // the mock's heart, M12 20.5s-8-4.9-8-11A4.5 4.5 0 0 1 12 6.4a4.5 4.5 0 0 1 8 3.1c0 6.1-8 11-8 11z on 24×24
        let s = min(r.width, r.height) / 24, o = CGPoint(x: r.midX - 12 * s, y: r.midY - 12 * s)
        func pt(_ x: CGFloat, _ y: CGFloat) -> CGPoint { CGPoint(x: o.x + x * s, y: o.y + y * s) }
        var p = Path()
        p.move(to: pt(12, 20.5))
        p.addCurve(to: pt(4, 9.5), control1: pt(12, 20.5), control2: pt(4, 15.6))
        p.addArc(center: pt(8.5, 9.5), radius: 4.5 * s, startAngle: .degrees(180), endAngle: .degrees(-30), clockwise: false)
        p.addArc(center: pt(15.5, 9.5), radius: 4.5 * s, startAngle: .degrees(210), endAngle: .degrees(0), clockwise: false)
        p.addCurve(to: pt(12, 20.5), control1: pt(20, 15.6), control2: pt(12, 20.5))
        p.closeSubpath()
        return p
    }
}

// ÚLTIM (cream) or NOU (pink), tilted on the cartridge's left edge.
struct Tag: View {
    let text: String
    let isNew: Bool

    var body: some View {
        Text(text)
            .font(.baloo(10)).kerning(0.6)
            .foregroundStyle(isNew ? Color(UIColor(hex: "#3d0f2a")) : Palette.brown)
            .padding(.horizontal, 7).frame(height: 20)
            .background(RoundedRectangle(cornerRadius: 6).fill(isNew ? Palette.pink : Palette.cream).shadow(color: .black.opacity(0.4), radius: 0, y: 2))
            .rotationEffect(.degrees(-6))
            .allowsHitTesting(false)
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
