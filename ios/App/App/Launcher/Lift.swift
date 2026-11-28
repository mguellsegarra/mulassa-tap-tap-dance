import SwiftUI

// ronda-18's in-between step: the tapped cartridge lifts out of its slot and grows to the middle; the home dims and «Juga»
// comes in under it, turning once round its vertical axis on the way (ronda 30: back, quicker, 500 ms). Outside (or back)
// takes it home again. It goes into the console straight, face on (ronda 35: the owner found the tipped one crooked).
// Ronda 26: the console (Console.swift) then slides up from the bottom edge, and the player drags the cartridge down into
// its bay, under the panel: past 40 % of the way in (or flung) it seats, with a tick at the bay's edge, a thunk and the LED,
// and the iris opens from it; short of that it springs back. «Juga», or a tap on the cartridge or the console, pushes it in
// alone. A locked «Aviat» has no button: the bay refuses it at the edge (a buzz and a shake) and it springs back.
// Reduced motion: no travel, a fade and a scale; «Juga» fades the cartridge into the bay.
// Everything animated is a transform or an opacity over a bitmap of the cartridge drawn once at tap time: ronda 22 found
// 230-310 ms stalls from Canvases first drawing mid-motion.
// Timings and curves are shared with Android: design/mulassa-games/app-home/ronda-22/timings.md.
struct Lifted: Equatable {
    let game: Game
    let from: CGRect // its slot, in screen points
}

struct LiftView: View {
    @ObservedObject var model: Launcher
    let lifted: Lifted
    @Binding var covered: Bool // the blurred snapshot fully covers the home: the live one (its clouds) is hidden
    let done: () -> Void // back in its slot, or under the iris
    @Environment(\.accessibilityReduceMotion) private var still
    @Environment(\.displayScale) private var scale
    @ViewState private var up = false
    @ViewState private var veil = false // the blurred, dimmed home behind
    @ViewState private var faces = Faces()
    @ViewState private var angle = 0.0
    @ViewState private var ready = false // the lift has ended: «Juga» shows, or the lock shakes
    @ViewState private var shake: CGFloat = 0
    @ViewState private var leaving = false
    @ViewState private var frozen: UIImage? // the home a frame after the tap, its slot empty, blurred and dimmed once
    @ViewState private var p: CGFloat = 0 // the way into the console: 0 centred, 1 seated
    @ViewState private var dx: CGFloat = 0 // the finger's sideways pull, straightened as the cartridge nears the bay
    @ViewState private var from: CGFloat = 0 // p when the drag began
    @ViewState private var dragging = false
    @ViewState private var busy = false // pushed in, refused or springing back: the drag and «Juga» wait
    @ViewState private var faded = false // reduced motion's insertion
    @ViewState private var led = false

    var body: some View {
        GeometryReader { g in
            let w = g.size.width, h = g.size.height, game = lifted.game
            let button: CGFloat = 56, gap: CGFloat = 28
            // the room between the status bar and the console's shoulders
            let con = Console(width: w, height: h), top = g.safeAreaInsets.top, bottom = con.top // over the console's shoulders
            let width = max(48, min(w * 0.68, (bottom - top - gap - button - 32) * Cartridge.size.width / Cartridge.size.height)) // never nothing, in the shortest window
            let u = width / Cartridge.size.width, height = Cartridge.size.height * u
            let centre = CGPoint(x: w / 2, y: (top + bottom) / 2 - (gap + button) / 2) // the cartridge and «Juga» together, centred
            let k = lifted.from.width / width
            let face = faces.get(game, model.number(game), model.images[game.id], model.planes[game.id], u: u, scale: scale)
            // seated: the bay's width, its top level with the shoulders'; the cartridge's centre moves 1:1 with the finger
            let seatScale = con.seatWidth / width, seatY = con.seatTop + height * seatScale / 2
            // it narrows to the bay's width on the way to the shoulders' top (edge), so it enters between them
            // (the edge kept inside the travel whatever the window's shape: outside it the cartridge scaled the wrong way)
            let bay = Bay(travel: seatY - centre.y, edge: min(0.95, max(0.05, (con.lip - height * seatScale / 2 - centre.y) / (seatY - centre.y))),
                          iris: CGPoint(x: w / 2, y: (con.seatTop + con.panel) / 2))
            let shown = still || ready, below = h - con.top // the console waits under the bottom edge
            ZStack(alignment: .topLeading) {
                Group { if let frozen { Image(uiImage: frozen).resizable() } else { Color.black.opacity(0.55) } }
                    .opacity(veil ? 1 : 0).onTapGesture(perform: close).accessibilityHidden(true)
                con.layer("console").offset(y: shown ? 0 : below).opacity(!still || ready ? 1 : 0)
                    .onTapGesture { push(bay) }.accessibilityHidden(true)
                Image(uiImage: face.front).resizable().frame(width: width, height: height)
                    .modifier(Turn(angle: angle, color: game.shell, u: u, back: face.back))
                    .modifier(Shake(t: shake))
                    .scaleEffect(up ? 1 + min(1, max(0, p) / bay.edge) * (seatScale - 1) : still ? 0.92 : k)
                    .opacity(still && !up || faded ? 0 : 1)
                    .contentShape(Rectangle())
                    .gesture(drag(bay))
                    .onTapGesture { push(bay) }
                    .position(up || still ? CGPoint(x: centre.x + dx, y: centre.y + p * bay.travel) : lifted.from.center)
                    .accessibilityElement().accessibilityLabel(game.soon ? Text("ui.select.aviat") : Text(verbatim: game.title))
                    .accessibilityAction { push(bay) }
                con.layer("console_panel").offset(y: shown ? 0 : below).opacity(!still || ready ? 1 : 0)
                    .onTapGesture { push(bay) }.accessibilityHidden(true)
                con.light().opacity(led ? 1 : 0)
                if !game.soon {
                    Button { push(bay) } label: {
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
                    .opacity(ready && !dragging && !busy ? 1 : 0).offset(y: ready ? 0 : 12)
                    .animation(.linear(duration: 0.12), value: dragging || busy) // it goes as the cartridge moves over it
                    .accessibilityLabel(Text("Juga a \(game.title)"))
                }
            }
        }
        .ignoresSafeArea()
        .allowsHitTesting(!leaving)
        .accessibilityAddTraits(.isModal)
        .accessibilityAction(.escape, close)
        .onAppear {
            Feel.prepare()
            // a frame on, so the home has drawn its slot empty; the cartridge waits in its slot until the snapshot is there
            DispatchQueue.main.async {
                guard !leaving else { return }
                frozen = Frozen.home(); FrameLog.mark("frozen")
                open()
            }
        }
    }

    private static func inOut(_ d: Double) -> Animation { .timingCurve(0.42, 0, 0.58, 1, duration: d) }
    private static func out(_ d: Double) -> Animation { .timingCurve(0.33, 0, 0.2, 1, duration: d) }

    // The lift and one eased turn, 500 ms; «Juga» and the console come in from 400 ms. A close mid-turn wins.
    private func open() {
        if still {
            withAnimation(Self.inOut(0.3)) { up = true; veil = true } completion: {
                guard !leaving else { return }
                withAnimation(Self.out(0.2)) { ready = true } completion: { cover() }
            }
            return
        }
        withAnimation(Self.inOut(0.5)) { up = true; angle = 360 }
        withAnimation(Self.out(0.3)) { veil = true }
        withAnimation(Self.out(0.25).delay(0.4)) { ready = true } completion: { cover() } // «Juga» and the console come in
    }

    // The live home goes once nothing moves: hidden as the veil ended, mid-lift, it cost a dropped frame (ronda 24).
    private func cover() { if !leaving { covered = frozen != nil } }

    private func close() {
        guard !leaving else { return }
        leaving = true
        FrameLog.mark("close")
        covered = false
        withAnimation(Self.out(0.25)) { ready = false } // the console slides back down
        withAnimation(Self.inOut(still ? 0.3 : 0.45)) { up = false; veil = false; angle = 0; p = 0; dx = 0 } completion: { done() }
    }

    // The drag: the cartridge's centre follows the finger down 1:1 (up, it resists), and the bay pulls it straight as it nears.
    private func drag(_ bay: Bay) -> some Gesture {
        DragGesture(minimumDistance: 4, coordinateSpace: .global) // the cartridge moves with the finger: its own space would cancel the drag
            .onChanged { v in
                guard ready, !busy, !leaving else { return }
                if !dragging { dragging = true; from = p; FrameLog.mark("drag") }
                var to = from + v.translation.height / bay.travel
                if to < 0 { to *= 0.2 }
                dx = still ? 0 : v.translation.width * 0.35 * max(0, 1 - to / bay.edge)
                if lifted.game.soon && to >= bay.edge { move(to: bay.edge, bay); refuse(); return }
                move(to: min(to, 1), bay)
            }
            .onEnded { v in
                guard dragging else { return }
                dragging = false
                guard !busy, !leaving else { return }
                let flung = v.velocity.height > 900 // pt/s down
                if !lifted.game.soon && (p >= bay.edge + 0.4 * (1 - bay.edge) || flung) { insert(bay) } else { back() }
            }
    }

    private func move(to q: CGFloat, _ bay: Bay) {
        if p < bay.edge && q >= bay.edge { Feel.tick(); FrameLog.mark("contact") }
        p = q
    }

    // «Juga», a tap on the cartridge or the console, or VoiceOver's action: the same push, alone
    private func push(_ bay: Bay) {
        guard ready, !busy, !dragging, !leaving else { return }
        if !lifted.game.soon { return insert(bay) }
        busy = true
        withAnimation(still ? .linear(duration: 0.15) : .timingCurve(0.42, 0, 1, 1, duration: 0.3)) { p = bay.edge; dx = 0 } completion: {
            if !leaving { Feel.tick(); refuse() }
        }
    }

    // Into the bay, speeding up to a hard stop (no bounce); the tick sounds when the curve passes the bay's edge.
    private func insert(_ bay: Bay) {
        busy = true
        if still {
            withAnimation(.linear(duration: 0.15)) { faded = true } completion: {
                guard !leaving else { return } // closed meanwhile: it is on its way back to its slot
                p = 1; dx = 0
                withAnimation(.linear(duration: 0.15)) { faded = false } completion: { seat(bay) }
            }
            return
        }
        let d = 0.18 + 0.32 * (1 - p) // 0.5 s from the centre
        if p < bay.edge {
            let at = UnitCurve.easeIn.inverse.value(at: (bay.edge - p) / (1 - p)) * d
            DispatchQueue.main.asyncAfter(deadline: .now() + at) { if !leaving { Feel.tick(); FrameLog.mark("contact") } }
        }
        withAnimation(.timingCurve(0.42, 0, 1, 1, duration: d)) { p = 1; dx = 0 } completion: { seat(bay) }
    }

    // Seated: the thunk and the LED, two rising notes, then the iris from the part still showing.
    private func seat(_ bay: Bay) {
        guard !leaving else { return }
        leaving = true
        FrameLog.mark("seat")
        Feel.thunk()
        withAnimation(.linear(duration: 0.08)) { led = true }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.08) { Feel.boot() }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.35) { model.play(lifted.game, bay.iris, done) } // the lift goes under the iris
    }

    // The bay refuses an «Aviat»: a buzz, a shake, and back to the centre.
    private func refuse() {
        busy = true
        FrameLog.mark("refuse")
        Feel.no()
        if still { return back() } // no swings with Reduce Motion: the buzz says no
        withAnimation(.linear(duration: 0.38)) { shake = 1 } completion: { shake = 0; back() }
    }

    private func back() {
        busy = true
        withAnimation(still ? .linear(duration: 0.15) : .spring(duration: 0.35, bounce: 0)) { p = 0; dx = 0 } completion: { busy = false }
    }
}

// The way into the console, in p: the points the centre travels from the middle to the seat, the p where the cartridge's
// bottom meets the shoulders, and where the iris opens.
private struct Bay {
    let travel: CGFloat, edge: CGFloat
    let iris: CGPoint
}

// The two faces as bitmaps, drawn once per lift (the first body, before anything moves) at the lifted size.
@MainActor private final class Faces {
    private var key: (String, CGFloat)?
    private var art: UIImage?, fore: UIImage?
    private(set) var front = UIImage(), back = UIImage()
    func get(_ game: Game, _ number: Int?, _ image: UIImage?, _ planes: Planes?, u: CGFloat, scale: CGFloat) -> Faces {
        guard key?.0 != game.id || key?.1 != u || art !== image || fore !== planes?.front else { return self } // new art after a live update draws again
        key = (game.id, u); art = image; fore = planes?.front
        func draw(_ v: some View) -> UIImage {
            let r = ImageRenderer(content: v)
            r.scale = scale
            return r.uiImage ?? UIImage()
        }
        front = draw(Cartridge(game: game, number: number, image: image, planes: planes, u: u))
        back = draw(Cartridge.back(color: game.shell, u: u))
        return self
    }
}

// The launcher (the home, not the lift over it) as it is on screen, blurred and dimmed once, ronda 24: the
// material over the moving clouds refiltered the whole screen every frame. Drawn at a quarter point per pixel, blurred there
// (σ 6 px, a 24 pt look) and scaled back up: the blur hides the low resolution, and the drawing takes a sixteenth of the time.
@MainActor private enum Frozen {
    private static let context = CIContext()
    static func home() -> UIImage? {
        let scene = UIApplication.shared.connectedScenes.lazy.compactMap { $0 as? UIWindowScene }.first { $0.activationState == .foregroundActive }
        guard let window = scene?.keyWindow, let root = window.rootViewController, let tabs = tabs(root)?.view else { return nil }
        let format = UIGraphicsImageRendererFormat()
        format.scale = 0.25; format.opaque = true
        let small = UIGraphicsImageRenderer(bounds: window.bounds, format: format).image { _ in
            _ = tabs.drawHierarchy(in: tabs.convert(tabs.bounds, to: window), afterScreenUpdates: false)
        }
        guard let image = CIImage(image: small) else { return nil }
        // the material's look, measured on its screenshots (its own darkening and the 0.55 dim), a little greyer; 0.9 because
        // Core Image blends in linear light, where SwiftUI's 0.55 blended in sRGB
        let dim = CIImage(color: CIColor(red: 0, green: 0, blue: 0, alpha: 0.9))
        let blur = image.clampedToExtent().applyingGaussianBlur(sigma: 6).applyingFilter("CIColorControls", parameters: [kCIInputSaturationKey: 0.8])
        let out = dim.composited(over: blur).cropped(to: image.extent)
        return context.createCGImage(out, from: image.extent).map { UIImage(cgImage: $0, scale: 0.25, orientation: .up) }
    }
    // SwiftUI's TabView (one tab, its bar hidden: LauncherView.swift) is a UITabBarController under the root hosting
    // controller; the lift is drawn beside it
    private static func tabs(_ vc: UIViewController) -> UITabBarController? {
        vc as? UITabBarController ?? vc.children.lazy.compactMap(tabs).first
    }
}

// The turn, as a slab ~7% of its width thick: the front, the back (a real back face, so it reads left to right) and the
// side faces in the shell's darker shade, each placed in 3D and seen through one perspective, so edge-on it still shows its
// thickness. Painter's order: the sides that face the viewer, then whichever face looks at it.
private struct Turn: ViewModifier, Animatable {
    var angle: Double
    let color: UIColor
    let u: CGFloat
    let back: UIImage
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
        func strip<S: ShapeStyle>(_ fill: S, _ len: CGFloat) -> some View {
            Rectangle().fill(fill).frame(width: T, height: len * u).frame(width: W, height: H, alignment: .topLeading)
        }
        let top = Color(color.mix(ink, 0.3)), foot = Color(color.mix(ink, 0.6)), s2 = 0.5.squareRoot()
        // Back-face culling: a facet is drawn only when the eye, at x = -L sin(angle) in the slab's space, is on its outer side;
        // near front or back none is, so nothing peeks past the face's corners.
        let ex = -(2.6 * W + T / 2) * CGFloat(sin(angle * .pi / 180))
        // The side follows the shell's outline (Cartridge's SHAPE, its drop edge 0.34 lower) swept back: the straight edge
        // and the two 45° cuts at its ends, the small bevel on top and, on the right, the big keyed cut at the bottom.
        func sides(_ x: CGFloat) -> some View { // x = ±1: the right or the left edge
            let k = x * ex - e, cut: CGFloat = x > 0 ? 1.1 : 0.25 // > 0: the eye is outside this edge's plane
            let y0 = -H / 2 + 0.25 * u, y1 = -H / 2 + (12.39 - cut) * u
            return ZStack {
                strip(side, 12.14 - cut).modifier(place((0, 0, -1), (x * e, y0, 0))).opacity(k > 0 ? 1 : 0)
                strip(top, 0.25 / s2).modifier(place((0, 0, -1), (x * e, y0, 0), y: (-x * s2, -s2))).opacity(k + y0 > 0 ? 1 : 0)
                strip(foot, cut / s2).modifier(place((0, 0, -1), (x * e, y1, 0), y: (-x * s2, s2))).opacity(k - y1 > 0 ? 1 : 0)
            }
        }
        return ZStack {
            sides(1)
            sides(-1)
            content.opacity(front ? 1 : 0).modifier(place((1, 0, 0), (-W / 2, -H / 2, 0)))
            Image(uiImage: back).resizable().frame(width: W, height: H).opacity(front ? 0 : 1).modifier(place((-1, 0, 0), (W / 2, -H / 2, -T)))
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

// Ronda 22-23's evidence: every frame's duration from the tap to 0.5 s after the cartridge is back, one line per frame to
// the unified log (`log stream --predicate 'eventMessage CONTAINS "lift-frame"'`): `[lift-frame] <frame> <target> <ms since
// the tap>`, so drops show as gaps over the display's interval. Release builds compile it to nothing.
final class FrameLog: NSObject {
    #if DEBUG
    private static let shared = FrameLog()
    private var link: CADisplayLink?
    private var last: CFTimeInterval = 0, from: CFTimeInterval = 0
    #endif
    static func begin() {
        #if DEBUG
        let s = shared
        s.link?.invalidate(); s.last = 0; s.from = CACurrentMediaTime()
        s.link = CADisplayLink(target: s, selector: #selector(tick)); s.link?.add(to: .main, forMode: .common)
        #endif
    }
    static func mark(_ what: String) {
        #if DEBUG
        NSLog("[lift-frame] mark %@ %.0f", what, (CACurrentMediaTime() - shared.from) * 1000)
        #endif
    }
    static func end() {
        mark("done")
        #if DEBUG
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) { shared.link?.invalidate(); shared.link = nil }
        #endif
    }
    #if DEBUG
    @objc private func tick(_ l: CADisplayLink) {
        if last > 0 { NSLog("[lift-frame] %.2f %.2f %.0f", (l.timestamp - last) * 1000, (l.targetTimestamp - l.timestamp) * 1000, (l.timestamp - from) * 1000) }
        last = l.timestamp
    }
    #endif
}
