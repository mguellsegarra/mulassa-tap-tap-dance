import SwiftUI

// The home's sky by the device's hour (ronda-10's SKY and sky()): dawn, morning, midday, sunset, night. Three colours
// blended between keyframes, read every 5 minutes. Over it, ronda-14's B1 «Cel en calma» (SkyLife): drifting clouds,
// and twinkling stars, all Core Animation on transform and opacity (no sun or moon: the owner wants the header clear).
struct Sky: Equatable {
    // hour, top, middle, bottom, stars, clouds
    private static let keys: [(Double, String, String, String, Double, Double)] = [
        (0, "#0a1430", "#16244f", "#27386d", 1, 0), (5, "#0d1838", "#1d2c5c", "#33427a", 0.9, 0),
        (6.5, "#3a4a8c", "#c98aa6", "#ffc9a0", 0.25, 0.35), (8.5, "#6fb2ea", "#a9d6f3", "#f3e6d6", 0, 0.8),
        (13, "#4a9be4", "#86c6f1", "#d6eefb", 0, 1), (17, "#5a9fdc", "#a9c9e6", "#f5dcc0", 0, 0.85),
        (19, "#4b4c99", "#d77a8c", "#ffb878", 0.1, 0.45), (20.5, "#1f2558", "#5b3f78", "#a8607a", 0.6, 0.1),
        (22, "#0c1634", "#1a2853", "#2c3c70", 1, 0), (24, "#0a1430", "#16244f", "#27386d", 1, 0)]

    let top, middle, bottom: UIColor
    let stars, clouds, hour: Double

    init(hour h: Double) {
        hour = h
        let k = Self.keys.firstIndex { $0.0 > h } ?? Self.keys.count - 1, a = Self.keys[max(k - 1, 0)], b = Self.keys[k]
        let t = CGFloat(b.0 > a.0 ? (h - a.0) / (b.0 - a.0) : 0)
        top = UIColor(hex: a.1).mix(UIColor(hex: b.1), t)
        middle = UIColor(hex: a.2).mix(UIColor(hex: b.2), t)
        bottom = UIColor(hex: a.3).mix(UIColor(hex: b.3), t)
        stars = a.4 + (b.4 - a.4) * Double(t)
        clouds = a.5 + (b.5 - a.5) * Double(t)
    }

    static func now(_ date: Date = .now) -> Sky {
        #if DEBUG // `-skyHour 22` previews one hour (captures only; never in a release build)
        if let h = UserDefaults.standard.string(forKey: "skyHour").flatMap(Double.init) { return Sky(hour: h) }
        #endif
        let c = Calendar.current.dateComponents([.hour, .minute], from: date)
        return Sky(hour: Double(c.hour ?? 12) + Double(c.minute ?? 0) / 60)
    }

    // the colour just under the header, for its fade (--skyTop)
    var headerTint: Color { Color(top.mix(middle, 0.22)) }

    static func == (a: Sky, b: Sky) -> Bool { a.top == b.top && a.middle == b.middle && a.bottom == b.bottom && a.stars == b.stars && a.clouds == b.clouds && a.hour == b.hour }
}

struct SkyBackground: View {
    let sky: Sky
    @Environment(\.accessibilityReduceMotion) private var still

    var body: some View {
        GeometryReader { g in // read before ignoring the safe area: the top clouds hang from the header
            LinearGradient(stops: [.init(color: Color(sky.top), location: 0), .init(color: Color(sky.middle), location: 0.55),
                                   .init(color: Color(sky.bottom), location: 1)], startPoint: .top, endPoint: .bottom)
                .overlay { Stars().opacity(sky.stars) }
                .overlay { SkyLife(sky: sky, top: g.safeAreaInsets.top, still: still).modifier(Drifting()) }
                .ignoresSafeArea()
        }
        .allowsHitTesting(false)
    }
}

// Three tiled dot patterns, as the prototype's three radial-gradient backgrounds. Drawn once per size.
private struct Stars: View {
    var body: some View {
        Canvas { ctx, size in
            for (tile, at, r, alpha) in [(CGSize(width: 97, height: 89), CGPoint(x: 0.2, y: 0.3), 0.6, 1.0),
                                         (CGSize(width: 131, height: 113), CGPoint(x: 0.7, y: 0.6), 0.5, 1.0),
                                         (CGSize(width: 173, height: 157), CGPoint(x: 0.4, y: 0.8), 0.8, 0.53)] {
                var y = at.y * tile.height
                while y < size.height {
                    var x = at.x * tile.width
                    while x < size.width {
                        ctx.fill(Path(ellipseIn: CGRect(x: x - r, y: y - r, width: 2 * r, height: 2 * r)), with: .color(.white.opacity(alpha)))
                        x += tile.width
                    }
                    y += tile.height
                }
            }
        }
    }
}

// ronda-14 B1 «Cel en calma». Layers built once; Core Animation runs every motion in the render server (nothing per frame
// here). The hour only moves opacities every 5 minutes. Reduced motion freezes it in place; it
// pauses outside the foreground.
private struct SkyLife: UIViewRepresentable {
    let sky: Sky, top: CGFloat, still: Bool
    func makeUIView(context: Context) -> SkyLifeView { SkyLifeView() }
    func updateUIView(_ v: SkyLifeView, context: Context) { v.update(sky, top: top, still: still) }
}

private final class SkyLifeView: UIView {
    // y (from the status bar's foot, a share of the height, or from the bottom), cloud, width, seconds per crossing, start (0..1), opacity
    private enum Y { case header(CGFloat), share(CGFloat), bottom(CGFloat) }
    private static let lanes: [(Y, String, CGFloat, Double, Double, Float)] = [
        (.bottom(150), "long", 80, 160, 0.3, 0.5), (.share(0.4), "round", 64, 150, 0.75, 0.45), (.bottom(58), "wisp", 96, 170, 0.62, 0.5), // far: small, slow
        (.bottom(110), "tall", 140, 80, 0.55, 0.9), (.share(0.62), "twin", 140, 95, 0.4, 0.8), (.bottom(44), "long", 160, 75, 0.12, 0.9)] // near: big, quicker

    private let clouds = CALayer(), night = CALayer(), shootAt = CALayer(), shoot = CAGradientLayer()
    private var laneLayers: [CALayer] = [], twinkles: [CALayer] = []
    private var sky: Sky?, top: CGFloat = 0, still = false, built = CGSize.zero

    override init(frame: CGRect) {
        super.init(frame: frame)
        isUserInteractionEnabled = false
        for (_, name, w, _, _, o) in Self.lanes {
            // ronda-15: soft pre-rendered clouds (design/…/ronda-15/clouds/make_clouds.py, style S1); one bitmap, only moved
            let lane = CALayer(), c = CALayer(), img = UIImage(named: "cloud_\(name)")
            c.contents = img?.cgImage; c.opacity = o
            c.frame = CGRect(x: -w, y: 0, width: w, height: w * (img.map { $0.size.height / $0.size.width } ?? 0.4)) // starts just off the left edge
            lane.addSublayer(c); clouds.addSublayer(lane); laneLayers.append(lane)
        }
        layer.addSublayer(clouds)
        // two star fields breathing out of step; each is two tiled dot patterns
        for fields in [[(CGSize(width: 83, height: 71), CGPoint(x: 0.3, y: 0.4), 1.0, UIColor.white), (CGSize(width: 149, height: 127), CGPoint(x: 0.8, y: 0.2), 0.85, UIColor(hex: "#fffbe0"))],
                       [(CGSize(width: 109, height: 97), CGPoint(x: 0.6, y: 0.7), 0.9, UIColor.white), (CGSize(width: 191, height: 163), CGPoint(x: 0.15, y: 0.15), 1.15, UIColor(hex: "#e8f0ff"))]] {
            let tw = CALayer()
            for (tile, at, r, c) in fields {
                let img = UIGraphicsImageRenderer(size: tile).image { _ in
                    c.setFill(); UIBezierPath(ovalIn: CGRect(x: at.x * tile.width - r, y: at.y * tile.height - r, width: 2 * r, height: 2 * r)).fill()
                }
                let f = CALayer(); f.backgroundColor = UIColor(patternImage: img).cgColor
                tw.addSublayer(f)
            }
            night.addSublayer(tw); twinkles.append(tw)
        }
        // a shooting star: a 110 × 2 streak, white at its head, crossing down-left once every 9 s
        shoot.colors = [UIColor.white.withAlphaComponent(0).cgColor, UIColor.white.cgColor]
        shoot.startPoint = CGPoint(x: 0, y: 0.5); shoot.endPoint = CGPoint(x: 1, y: 0.5)
        shoot.bounds = CGRect(x: 0, y: 0, width: 110, height: 2); shoot.cornerRadius = 1; shoot.opacity = 0
        shootAt.transform = CATransform3DMakeRotation(155 * .pi / 180, 0, 0, 1)
        shootAt.addSublayer(shoot); night.addSublayer(shootAt)
        layer.addSublayer(night)
        // scenePhase does not reach a UIHostingController root reliably: the app's own notifications pause it
        let nc = NotificationCenter.default
        nc.addObserver(forName: UIApplication.didEnterBackgroundNotification, object: nil, queue: .main) { [weak self] _ in self?.pause(true) }
        nc.addObserver(forName: UIApplication.willEnterForegroundNotification, object: nil, queue: .main) { [weak self] _ in self?.pause(false) }
    }
    required init?(coder: NSCoder) { fatalError() }

    func update(_ sky: Sky, top: CGFloat, still: Bool) {
        let rebuild = top != self.top || still != self.still
        self.sky = sky; self.top = top; self.still = still
        if rebuild { built = .zero; setNeedsLayout() }
        CATransaction.begin(); CATransaction.setDisableActions(true)
        clouds.opacity = Float(sky.clouds); clouds.isHidden = sky.clouds < 0.01
        night.opacity = Float(sky.stars); night.isHidden = sky.stars < 0.01
        CATransaction.commit()
    }

    override func layoutSubviews() {
        super.layoutSubviews()
        guard bounds.size != built, bounds.width > 0 else { return }
        built = bounds.size
        let W = bounds.width, H = bounds.height
        CATransaction.begin(); CATransaction.setDisableActions(true)
        for l in [clouds, night] + twinkles + twinkles.flatMap({ $0.sublayers ?? [] }) { l.frame = bounds }
        for (lane, (y, _, _, d, p, _)) in zip(laneLayers, Self.lanes) {
            let span = W + 160 // (lanes are at most 160 wide) the cloud enters fully hidden on the left and leaves fully hidden on the right
            switch y { case .header(let v): lane.frame = CGRect(x: 0, y: top + v, width: W, height: 0)
                       case .share(let v): lane.frame = CGRect(x: 0, y: H * v, width: W, height: 0)
                       case .bottom(let v): lane.frame = CGRect(x: 0, y: H - v, width: W, height: 0) }
            lane.removeAllAnimations()
            lane.transform = CATransform3DMakeTranslation(span * p, 0, 0) // the frozen spot
            if !still { lane.add(loop("transform.translation.x", from: 0, to: span, d, at: p * d), forKey: "drift") }
        }
        shootAt.position = CGPoint(x: W * 0.84 + 55, y: top + 16) // the streak's centre (CSS left 84 %, top 74 px)
        for (k, tw) in twinkles.enumerated() {
            tw.removeAllAnimations()
            if !still { tw.add(loop("opacity", from: 0.1, to: 1, 3.2, at: Double(k) * 1.6, reverse: true), forKey: "twinkle") }
        }
        shoot.removeAllAnimations()
        if !still { shoot.add(shooting(), forKey: "shoot") }
        CATransaction.commit()
    }

    private func loop(_ key: String, from: CGFloat, to: CGFloat, _ d: Double, at: Double, reverse: Bool = false) -> CABasicAnimation {
        let a = CABasicAnimation(keyPath: key)
        a.fromValue = from; a.toValue = to; a.duration = d; a.timeOffset = at; a.autoreverses = reverse
        a.timingFunction = CAMediaTimingFunction(name: reverse ? .easeInEaseOut : .linear)
        a.repeatCount = .infinity; a.isRemovedOnCompletion = false
        return a
    }

    // invisible for 86 % of the cycle, then one fast 260 pt streak along its own axis
    private func shooting() -> CAAnimationGroup {
        let o = CAKeyframeAnimation(keyPath: "opacity"), x = CAKeyframeAnimation(keyPath: "transform.translation.x")
        o.values = [0, 0, 1, 0, 0]; o.keyTimes = [0, 0.86, 0.88, 0.96, 1]
        x.values = [0, 0, 260, 260]; x.keyTimes = [0, 0.86, 0.96, 1]
        let g = CAAnimationGroup()
        g.animations = [o, x]; g.duration = 9; g.repeatCount = .infinity; g.isRemovedOnCompletion = false
        return g
    }

    // the whole tree stops in the background and resumes where it was
    private func pause(_ paused: Bool) {
        if paused, layer.speed != 0 {
            layer.timeOffset = layer.convertTime(CACurrentMediaTime(), from: nil); layer.speed = 0
        } else if !paused, layer.speed == 0 {
            let t = layer.timeOffset
            layer.speed = 1; layer.timeOffset = 0; layer.beginTime = 0
            layer.beginTime = layer.convertTime(CACurrentMediaTime(), from: nil) - t
        }
    }
}
