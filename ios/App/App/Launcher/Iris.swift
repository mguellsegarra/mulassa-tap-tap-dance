import SwiftUI

// The iris (round 8): a circle in the game's colour grows from the pressed cartridge, the game's art moves to the middle
// and its name comes in on a dark plate; it stays over the game while the page loads. Reversed when the player comes back.
// Every part is a transform or an opacity animated by SwiftUI: nothing is drawn again per frame.
@MainActor final class IrisState: ObservableObject {
    @Published var game: Game?
    @Published var image: UIImage?
    @Published var origin = CGPoint.zero
    @Published var open = false
    @Published var plate = false
    @Published var hop = false

    func forward(_ done: @escaping () -> Void) {
        var t = Transaction(); t.disablesAnimations = true
        withTransaction(t) { open = false; plate = false; hop = false }
        // drawn closed on screen first (a frame later), or it would appear already open
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.03) {
            withAnimation(.timingCurve(0.65, 0, 0.35, 1, duration: 0.65), completionCriteria: .logicallyComplete) { self.open = true } completion: {
                self.hop = true
                done()
            }
            withAnimation(.easeOut(duration: 0.2).delay(0.33)) { self.plate = true }
        }
    }

    func backward(_ done: @escaping () -> Void) {
        var t = Transaction(); t.disablesAnimations = true
        withTransaction(t) { open = true; plate = false; hop = false }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.03) { // a frame covering the screen, then it shrinks onto the launcher
            withAnimation(.timingCurve(0.65, 0, 0.35, 1, duration: 0.56), completionCriteria: .logicallyComplete) { self.open = false } completion: { done() }
        }
    }
}

struct IrisView: View {
    @ObservedObject var state: IrisState

    var body: some View {
        GeometryReader { g in
            if let game = state.game {
                let w = g.size.width, h = g.size.height, o = state.origin, color = Color(game.tint)
                let r = max(hypot(o.x, o.y), hypot(w - o.x, o.y), hypot(o.x, h - o.y), hypot(w - o.x, h - o.y)) + 10
                let side: CGFloat = 150
                ZStack(alignment: .topLeading) {
                    // the cream rim is a stroke on the same disc, so it never runs ahead of the colour
                    Rays(color: game.tint, centre: o, radius: r).clipShape(Disc(centre: o, radius: state.open ? r : 0))
                        .overlay(Disc(centre: o, radius: state.open ? r : 0).stroke(Palette.cream, lineWidth: 14))
                    VStack(spacing: 28) {
                        Color(game.tint)
                            .overlay { if let image = state.image { Image(uiImage: image).resizable().scaledToFill() } }
                            .frame(width: side, height: side)
                            .clipShape(RoundedRectangle(cornerRadius: side * 0.28))
                            .overlay(RoundedRectangle(cornerRadius: side * 0.28).inset(by: -3).stroke(Palette.cream, lineWidth: 6))
                            .background(RoundedRectangle(cornerRadius: side * 0.28).inset(by: -6).fill(.black.opacity(0.3)).offset(y: 7.5))
                            .offset(y: state.hop ? -12 : 0).rotationEffect(.degrees(state.hop ? -4 : 0))
                            .animation(state.hop ? .easeInOut(duration: 0.5).repeatForever() : .default, value: state.hop)
                        VStack(spacing: 8) {
                            Text(game.title).font(.baloo(28)).foregroundStyle(Palette.cream).multilineTextAlignment(.center)
                            Text("S’obre el joc…").font(.balooBold(15)).foregroundStyle(color)
                        }
                        .padding(.horizontal, 22).padding(.top, 14).padding(.bottom, 16)
                        .background(RoundedRectangle(cornerRadius: 22).fill(Palette.ink).shadow(color: .black.opacity(0.35), radius: 0, y: 5))
                        .overlay(RoundedRectangle(cornerRadius: 22).inset(by: -1.5).stroke(Palette.cream, lineWidth: 3))
                        .frame(maxWidth: w - 48)
                        .opacity(state.plate ? 1 : 0).scaleEffect(state.plate ? 1 : 0.9)
                    }
                    .fixedSize()
                    .frame(width: w)
                    .alignmentGuide(.top) { _ in -(h * 0.36 - side / 2) }
                    // from the cartridge to the upper middle, growing from about the cartridge's size
                    .scaleEffect(state.open ? 1 : 0.37, anchor: UnitPoint(x: 0.5, y: side / 2 / (side + 120)))
                    .offset(x: state.open ? 0 : o.x - w / 2, y: state.open ? 0 : o.y - h * 0.36)
                }
            }
        }
        .ignoresSafeArea()
    }
}

// The circle the iris shows through: only its radius animates (a clip path, no offscreen pass).
struct Disc: Shape {
    let centre: CGPoint
    var radius: CGFloat
    var animatableData: CGFloat { get { radius } set { radius = newValue } }
    func path(in _: CGRect) -> Path { Path(ellipseIn: CGRect(x: centre.x - radius, y: centre.y - radius, width: 2 * radius, height: 2 * radius)) }
}

// The iris's sunburst around the pressed cartridge: 24 lighter wedges over the game's colour, drawn once, screen-sized.
struct Rays: View {
    let color: UIColor
    let centre: CGPoint
    let radius: CGFloat
    var body: some View {
        Canvas { ctx, size in
            ctx.fill(Path(CGRect(origin: .zero, size: size)), with: .color(Color(color)))
            for k in 0..<24 {
                var p = Path()
                p.move(to: centre)
                p.addArc(center: centre, radius: radius, startAngle: .degrees(Double(k) * 15), endAngle: .degrees(Double(k) * 15 + 7.5), clockwise: false)
                p.closeSubpath()
                ctx.fill(p, with: .color(Color(color.mix(.white, 0.12))))
            }
        }
    }
}
