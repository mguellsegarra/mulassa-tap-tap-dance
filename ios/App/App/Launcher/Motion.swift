import CoreMotion
import SwiftUI

// Ronda 37 (the owner found ronda 36's lean cheap; Astra's recipe with Neon's sensor): how the phone is held against how it
// was held a moment ago, as two numbers in -1...1 (x: its right edge nearer the player, y: its bottom edge nearer), for
// the grid's cartridges to turn with, the art behind their windows to slide, and the clouds to drift.
// The fused attitude (gyroscope and accelerometer, no compass), as the tilt of the screen's normal against a reference
// attitude: 16° is the whole lean, eased past it. The level follows the hand slowly (6 s), so holding the phone at any
// angle becomes level again; past 60° a new reference is taken. One exponential filter (45 ms) per sample, 60 a second.
// The sensor runs only while the grid shows: off under a lift, the account sheet or a game, out of the foreground and
// with Reduce Motion (asked again whenever any of them changes). The screen's own axes, whichever way an iPad is held.
@MainActor final class Tilt: ObservableObject {
    static let shared = Tilt()
    @Published private(set) var v = CGPoint.zero
    private let manager = CMMotionManager()
    private var reference: CMAttitude?
    private var level = CGPoint.zero // radians: where «flat» is, following the hand
    private var last: TimeInterval = 0
    private var home = false, game = false, sheet = false
    private var turned = UIInterfaceOrientation.portrait

    private init() {
        for name in [UIApplication.didBecomeActiveNotification, UIApplication.willResignActiveNotification,
                     UIAccessibility.reduceMotionStatusDidChangeNotification] {
            NotificationCenter.default.addObserver(forName: name, object: nil, queue: .main) { [weak self] _ in
                MainActor.assumeIsolated { self?.set() }
            }
        }
    }

    func set(home: Bool? = nil, game: Bool? = nil, sheet: Bool? = nil) {
        if let home { self.home = home }
        if let game { self.game = game }
        if let sheet { self.sheet = sheet }
        #if DEBUG // `-launcherTilt 0.8,-0.5` holds a lean, for captures on a simulator (it has no motion sensor)
        if let t = UserDefaults.standard.string(forKey: "launcherTilt")?.split(separator: ",").compactMap({ Double($0) }), t.count == 2 {
            v = self.home && !self.sheet ? CGPoint(x: t[0], y: t[1]) : .zero
            return
        }
        #endif
        let on = self.home && !self.game && !self.sheet && UIApplication.shared.applicationState == .active
            && !UIAccessibility.isReduceMotionEnabled && manager.isDeviceMotionAvailable
        if !on {
            manager.stopDeviceMotionUpdates(); reference = nil
            if v != .zero { v = .zero }
        } else if !manager.isDeviceMotionActive {
            manager.deviceMotionUpdateInterval = 1.0 / 60
            manager.startDeviceMotionUpdates(using: .xArbitraryZVertical, to: .main) { [weak self] m, _ in
                guard let m else { return }
                MainActor.assumeIsolated { self?.feed(m) }
            }
        }
    }

    private func feed(_ m: CMDeviceMotion) {
        guard let reference, let now = m.attitude.copy() as? CMAttitude else { return start(m) }
        now.multiply(byInverseOf: reference)
        // the screen's normal now, in the reference's own axes (x right, y up, z to the player): the matrix's third row
        let r = now.rotationMatrix, n = (x: r.m31, y: r.m32, z: r.m33)
        guard n.z > 0.5 else { return start(m) }
        let facing = Self.orientation()
        if facing != turned { turned = facing; return start(m) } // the screen turned: a new level, in its new axes
        let s = Self.screen(n.x, n.y, facing)
        let angle = CGPoint(x: -atan2(s.x, n.z), y: atan2(s.y, n.z)), dt = min(0.1, max(0, m.timestamp - last))
        last = m.timestamp
        let slow = 1 - exp(-dt / 6), quick = 1 - exp(-dt / 0.045), full = 16 * Double.pi / 180
        level = CGPoint(x: level.x + (angle.x - level.x) * slow, y: level.y + (angle.y - level.y) * slow)
        let to = CGPoint(x: tanh((angle.x - level.x) / full), y: tanh((angle.y - level.y) / full))
        let next = CGPoint(x: v.x + (to.x - v.x) * quick, y: v.y + (to.y - v.y) * quick)
        if abs(next.x - v.x) > 0.002 || abs(next.y - v.y) > 0.002 { v = next } // still: nothing is redrawn
    }

    private static func orientation() -> UIInterfaceOrientation {
        UIApplication.shared.connectedScenes.lazy.compactMap { $0 as? UIWindowScene }.first { $0.activationState == .foregroundActive }?.interfaceOrientation ?? .portrait
    }

    // The normal's sideways parts, from the device's axes (x to its natural right, y to its natural top) to the screen's as
    // it is shown now: with the home edge on the right (.landscapeRight), the screen's right is the device's bottom.
    // Android's Tilt.screen is the same table (RowsTest.kt).
    static func screen(_ x: Double, _ y: Double, _ facing: UIInterfaceOrientation) -> (x: Double, y: Double) {
        switch facing {
        case .landscapeRight: return (-y, x)
        case .portraitUpsideDown: return (-x, -y)
        case .landscapeLeft: return (y, -x)
        default: return (x, y)
        }
    }

    private func start(_ m: CMDeviceMotion) {
        reference = m.attitude.copy() as? CMAttitude; level = .zero; last = m.timestamp
    }
}

// A cartridge in the grid, with depth: the rigid face turns up to 6° sideways and 5° up and down with the phone (its near
// edge grows a little: the focal length is 5.2 cartridge widths); behind it its dark side shows on the far edge, as a slab;
// the art slides behind the label's window and the varnish's light crosses it (Cartridge.swift's Window); the shadow on
// the sky slides the other way. Transforms and gradients over the face's own bitmap: nothing is drawn again per sample.
struct LeaningCartridge: View {
    let cart: Cartridge
    @ObservedObject private var tilt = Tilt.shared

    var body: some View {
        let v = tilt.v, u = cart.u, turn = hypot(5 * v.y, 6 * v.x)
        var face = cart
        face.window = false
        let edge = Color(cart.color.mix(UIColor(hex: "#1d100a"), 0.62)), side = CGSize(width: -0.206 * u * v.x, height: -0.168 * u * v.y)
        return ZStack(alignment: .topLeading) {
            face.equatable()
            Window(cart: cart, lean: v)
        }
        .background { // the slab's far edge: the face's outline again, behind it, half way and all the way back
            let outline = Cartridge.outline(u: u).fill(edge) // one path, moved: nothing is built again per sample
            ZStack {
                outline.offset(x: side.width, y: side.height + 0.34 * u)
                outline.offset(x: side.width, y: side.height)
                outline.offset(x: side.width / 2, y: side.height / 2)
            }
        }
        .rotation3DEffect(.degrees(turn), axis: (x: 5 * v.y, y: -6 * v.x, z: turn == 0 ? 1 : 0), perspective: 0.23)
        .background { Cartridge.shadow(u: u).offset(x: -v.x * 0.245 * u, y: -v.y * 0.245 * u) }
    }
}

// The clouds drift a little against the lean: the sky sits further back than the cartridges.
struct Drifting: ViewModifier {
    @ObservedObject private var tilt = Tilt.shared
    func body(content: Content) -> some View { content.offset(x: -tilt.v.x * 10, y: -tilt.v.y * 7) }
}
