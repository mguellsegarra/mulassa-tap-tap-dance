import CoreMotion
import SwiftUI

// Ronda 36 (the owner: the home looked flat and still): how the phone is held, as two numbers in -1...1 (x: tipped to the
// right, y: its top tipped away), for the cartridges to lean with, their shine to cross them and the clouds to drift the
// other way. Gravity against a baseline that follows it slowly, so any way of holding the phone becomes level again in a
// few seconds. 30 samples a second, eased between by SwiftUI; off under a lift, in a game and with Reduce Motion.
@MainActor final class Tilt: ObservableObject {
    static let shared = Tilt()
    @Published private(set) var v = CGPoint.zero
    private let manager = CMMotionManager()
    private var base: CGPoint?
    private var home = false, game = false

    func set(home: Bool? = nil, game: Bool? = nil) {
        if let home { self.home = home }
        if let game { self.game = game }
        #if DEBUG // `-launcherTilt 0.8,-0.5` holds a lean, for captures on a simulator (it has no motion sensor)
        if let t = UserDefaults.standard.string(forKey: "launcherTilt")?.split(separator: ",").compactMap({ Double($0) }), t.count == 2 {
            v = self.home ? CGPoint(x: t[0], y: t[1]) : .zero
            return
        }
        #endif
        let on = self.home && !self.game && !UIAccessibility.isReduceMotionEnabled && manager.isDeviceMotionAvailable
        if !on {
            manager.stopDeviceMotionUpdates(); base = nil
            if v != .zero { v = .zero }
        } else if !manager.isDeviceMotionActive {
            manager.deviceMotionUpdateInterval = 1.0 / 30
            manager.startDeviceMotionUpdates(to: .main) { [weak self] m, _ in
                guard let g = m?.gravity else { return }
                MainActor.assumeIsolated { self?.feed(CGPoint(x: g.x, y: g.y)) }
            }
        }
    }

    private func feed(_ g: CGPoint) {
        let b = base ?? g, k = 0.012 // the baseline's pace: level again in ~3 s
        base = CGPoint(x: b.x + (g.x - b.x) * k, y: b.y + (g.y - b.y) * k)
        let full = 0.26 // of gravity: about 15° of the hand for the whole lean
        v = CGPoint(x: max(-1, min(1, (g.x - b.x) / full)), y: max(-1, min(1, (g.y - b.y) / full)))
    }
}

// A cartridge in the grid: it leans up to 7° with the phone, a band of light crosses its face as it does, and its shadow on
// the sky slides the other way. Transforms and one masked gradient over the cartridge's own bitmap: nothing is redrawn.
struct Leaning: ViewModifier {
    let u: CGFloat
    @ObservedObject private var tilt = Tilt.shared

    func body(content: Content) -> some View {
        let v = tilt.v, w = Cartridge.size.width * u, h = Cartridge.size.height * u, lean = min(1, hypot(v.x, v.y))
        content
            .overlay {
                LinearGradient(stops: [.init(color: .white.opacity(0), location: 0.3), .init(color: .white.opacity(0.34), location: 0.5),
                                       .init(color: .white.opacity(0), location: 0.7)], startPoint: .topLeading, endPoint: .bottomTrailing)
                    .frame(width: w * 2, height: h * 2).offset(x: v.x * w * 0.7, y: -v.y * h * 0.5)
                    .frame(width: w, height: h).mask(Cartridge.outline(u: u))
                    .opacity(min(1, lean * 2.2)).blendMode(.plusLighter).allowsHitTesting(false)
            }
            .rotation3DEffect(.degrees(7 * lean), axis: (x: v.y, y: v.x, z: lean == 0 ? 1 : 0), perspective: 0.45)
            .background { Cartridge.shadow(u: u).offset(x: -v.x * 0.3 * u, y: v.y * 0.25 * u) }
            .animation(.linear(duration: 1.0 / 30), value: v)
    }
}

// The clouds drift a little against the lean: the sky sits further back than the cartridges.
struct Drifting: ViewModifier {
    @ObservedObject private var tilt = Tilt.shared
    func body(content: Content) -> some View {
        content.offset(x: -tilt.v.x * 10, y: tilt.v.y * 7).animation(.linear(duration: 1.0 / 30), value: tilt.v)
    }
}
