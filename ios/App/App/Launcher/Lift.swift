import SwiftUI

// ronda-18's in-between step: the tapped cartridge lifts out of its slot and turns once around its vertical axis, like a
// card, while it grows to the middle; the home dims and «Juga» comes in under it. Outside (or back) turns it home again.
// A locked «Aviat» makes the same turn, then shakes, with no button. Reduced motion: no travel or turn, a fade and a scale.
// Everything animated is a transform or an opacity over two cached bitmaps (the cartridge's front and back).
struct Lifted: Equatable {
    let game: Game
    let from: CGRect // its slot, in screen points
}

struct LiftView: View {
    @ObservedObject var model: Launcher
    let lifted: Lifted
    let done: () -> Void // back in its slot, or under the iris
    @Environment(\.accessibilityReduceMotion) private var still
    @ViewState private var up = false
    @ViewState private var ready = false // the turn has ended: «Juga» shows, or the lock shakes
    @ViewState private var shake: CGFloat = 0
    @ViewState private var leaving = false

    var body: some View {
        GeometryReader { g in
            let w = g.size.width, h = g.size.height, game = lifted.game
            let button: CGFloat = 56, gap: CGFloat = 28
            // the room between the status bar and the tab bar (the system's 49 pt bar over the home indicator)
            let top = g.safeAreaInsets.top, bottom = h - g.safeAreaInsets.bottom - 49
            let width = min(w * 0.68, (bottom - top - gap - button - 32) * Cartridge.size.width / Cartridge.size.height)
            let u = width / Cartridge.size.width, height = Cartridge.size.height * u
            let centre = CGPoint(x: w / 2, y: (top + bottom) / 2 - (gap + button) / 2) // the cartridge and «Juga» together, centred
            let k = lifted.from.width / width
            ZStack(alignment: .topLeading) {
                Color.black.opacity(up ? 0.55 : 0).onTapGesture(perform: close).accessibilityHidden(true)
                Cartridge(game: game, image: model.images[game.id], u: u).equatable()
                    .modifier(Turn(angle: up && !still ? 360 : 0, color: game.tint, u: u))
                    .modifier(Shake(t: shake))
                    .scaleEffect(up ? 1 : still ? 0.92 : k)
                    .opacity(still && !up ? 0 : 1)
                    .position(up || still ? centre : lifted.from.center)
                    .accessibilityElement().accessibilityLabel(game.soon ? Text("ui.select.aviat") : Text(verbatim: game.title))
                if !game.soon {
                    Button { play(from: centre) } label: {
                        HStack(spacing: 10) {
                            Image(systemName: "play.fill").font(.system(size: 18, weight: .black))
                            Text("Juga").font(.baloo(24))
                        }
                        .foregroundStyle(Palette.ink)
                        .frame(width: width, height: button)
                        .background(Capsule().fill(Color(Palette.yellow)))
                        .background(Capsule().fill(Palette.yellowLo).offset(y: 4)) // the cartridges' hard drop edge
                    }
                    .buttonStyle(Squash(depth: 3))
                    .position(x: w / 2, y: centre.y + height / 2 + gap + button / 2)
                    .opacity(ready ? 1 : 0).offset(y: ready ? 0 : 12)
                    .accessibilityLabel(Text("Juga a \(game.title)"))
                }
            }
        }
        .ignoresSafeArea()
        .allowsHitTesting(!leaving)
        .accessibilityAddTraits(.isModal)
        .accessibilityAction(.escape, close)
        .sensoryFeedback(.error, trigger: shake)
        .onAppear(perform: open)
    }

    private func open() {
        withAnimation(still ? .easeOut(duration: 0.25) : .timingCurve(0.42, 0, 0.58, 1, duration: 0.6)) { up = true } completion: {
            withAnimation(.easeOut(duration: 0.2)) { ready = true }
            if lifted.game.soon { withAnimation(.linear(duration: 0.4)) { shake = 1 } }
        }
    }

    private func close() {
        guard !leaving else { return }
        leaving = true
        withAnimation(.easeIn(duration: 0.12)) { ready = false }
        withAnimation(still ? .easeIn(duration: 0.2) : .timingCurve(0.42, 0, 0.58, 1, duration: 0.5)) { up = false } completion: { done() }
    }

    private func play(from centre: CGPoint) {
        guard !leaving else { return }
        leaving = true
        model.play(lifted.game, centre, done) // the iris grows from the cartridge; the lift goes once the iris covers it
    }
}

// The turn, as a slab ~7% of its width thick: the front, the back (a real back face, so its engraving reads left to
// right) and two side faces in the shell's darker shade, each placed in 3D and seen through one perspective, so edge-on
// it still shows its thickness. Painter's order: the sides that face the viewer, then whichever face looks at it.
private struct Turn: ViewModifier, Animatable {
    var angle: Double
    let color: UIColor
    let u: CGFloat
    var animatableData: Double { get { angle } set { angle = newValue } }

    func body(content: Content) -> some View {
        let W = Cartridge.size.width * u, H = Cartridge.size.height * u, T = 0.72 * u, e = 5.0 * u // e: the shell's half width
        let ink = UIColor(hex: "#1d100a"), front = cos(angle * .pi / 180) >= 0
        let side = LinearGradient(colors: [Color(color.mix(ink, 0.38)), Color(color.mix(ink, 0.55))], startPoint: .top, endPoint: .bottom)
        // a layer's (x, y) to the slab's space (centre at the origin, the front at z = 0, the back at z = -T)
        func place(_ x: (CGFloat, CGFloat, CGFloat), _ o: (CGFloat, CGFloat, CGFloat), y: (CGFloat, CGFloat) = (0, 1)) -> Slab {
            var m = CATransform3DIdentity
            (m.m11, m.m12, m.m13) = x; (m.m21, m.m22) = y; (m.m41, m.m42, m.m43) = o
            return Slab(model: m, angle: angle, depth: T, eye: 2.6 * W, size: CGSize(width: W, height: H))
        }
        // The side follows the shell's outline swept back: the straight edge (from the top chamfer to the drop edge's
        // bottom one, 0.72 to 11.69) and the two chamfers as slanted facets, so no square end sticks out past a cut corner.
        func strip<S: ShapeStyle>(_ fill: S, _ len: CGFloat) -> some View {
            Rectangle().fill(fill).frame(width: T, height: len * u).frame(width: W, height: H, alignment: .topLeading)
        }
        let top = Color(color.mix(ink, 0.3)), foot = Color(color.mix(ink, 0.6)), s2 = 0.5.squareRoot(), cut = 0.72 * 2.squareRoot()
        // Back-face culling: only a facet that faces the eye is drawn. The eye, in the slab's own space, sits at x = -L sin(angle)
        // (L: from the eye to the turn's axis); a facet faces it when the eye is on its outer side. Near front or back no
        // side faces it, so none is drawn and nothing can peek out past the face's cut corners.
        let ex = -(2.6 * W + T / 2) * CGFloat(sin(angle * .pi / 180)), y0 = -H / 2 + 0.72 * u, y1 = -H / 2 + 11.69 * u
        func sides(_ x: CGFloat) -> some View { // x = ±1: the right or the left edge
            let k = x * ex - e // > 0: the eye is outside this edge's plane
            return ZStack {
                strip(side, 10.97).modifier(place((0, 0, -1), (x * e, y0, 0))).opacity(k > 0 ? 1 : 0)
                strip(top, cut).modifier(place((0, 0, -1), (x * e, y0, 0), y: (-x * s2, -s2))).opacity(k + y0 > 0 ? 1 : 0)
                strip(foot, 0.7 * 2.squareRoot()).modifier(place((0, 0, -1), (x * e, y1, 0), y: (-x * s2, s2))).opacity(k - y1 > 0 ? 1 : 0)
            }
        }
        return ZStack {
            sides(1)
            sides(-1)
            content.opacity(front ? 1 : 0).modifier(place((1, 0, 0), (-W / 2, -H / 2, 0)))
            Cartridge.back(color: color, u: u).opacity(front ? 0 : 1).modifier(place((-1, 0, 0), (W / 2, -H / 2, -T)))
        }
    }
}

// One face of the slab: placed by `model`, turned about the vertical axis through the slab's middle, seen from `eye`.
private struct Slab: GeometryEffect {
    let model: CATransform3D
    let angle: Double, depth: CGFloat, eye: CGFloat, size: CGSize
    func effectValue(size _: CGSize) -> ProjectionTransform {
        var p = CATransform3DIdentity
        p.m34 = -1 / eye
        let turn = CATransform3DConcat(CATransform3DConcat(CATransform3DMakeTranslation(0, 0, depth / 2), CATransform3DMakeRotation(angle * .pi / 180, 0, 1, 0)),
                                       CATransform3DMakeTranslation(0, 0, -depth / 2))
        let all = [turn, p, CATransform3DMakeTranslation(size.width / 2, size.height / 2, 0)].reduce(model, CATransform3DConcat)
        return ProjectionTransform(all)
    }
}

// Three quick swings that die out (a «no»).
private struct Shake: GeometryEffect {
    var t: CGFloat
    var animatableData: CGFloat { get { t } set { t = newValue } }
    func effectValue(size: CGSize) -> ProjectionTransform {
        ProjectionTransform(CGAffineTransform(translationX: 9 * sin(t * .pi * 6) * (1 - t), y: 0))
    }
}
