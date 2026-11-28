import CoreMotion
import SwiftUI

// Ronda 37 (the owner found ronda 36's lean cheap; Astra's recipe with Neon's sensor): how the phone is held against how it
// was held a moment ago, as two numbers in -1...1 (x: its right edge nearer the player, y: its bottom edge nearer), for
// the grid's cartridges to turn with, the art behind their windows to slide, and the clouds to drift.
// The fused attitude (gyroscope and accelerometer, no compass), as the tilt of the screen's normal against a reference
// attitude: 18° is the whole lean, eased past it. The level follows the hand slowly (8 s), so holding the phone at any
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
    #if DEBUG
    private var sweep: Timer?
    // 9 s, then again: 3 s rolling side to side, 3 s nodding, 3 s round a circle; the same path as Android's Tilt.swept
    static func swept(_ t: Double) -> CGPoint {
        let s = t.truncatingRemainder(dividingBy: 9), a = sin(s.truncatingRemainder(dividingBy: 3) / 3 * 2 * .pi)
        if s < 3 { return CGPoint(x: a, y: 0) }
        if s < 6 { return CGPoint(x: 0, y: a) }
        let w = (s - 6) / 3 * 2 * Double.pi
        return CGPoint(x: sin(w), y: sin(w + .pi / 2) * 0.8)
    }
    #endif
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
        #if DEBUG // `-launcherTilt sweep` moves the lean as a hand would (a slow roll, then a nod, then both), for recordings
        if UserDefaults.standard.string(forKey: "launcherTilt") == "sweep" {
            if self.home && !self.sheet, sweep == nil {
                let from = CACurrentMediaTime()
                sweep = Timer.scheduledTimer(withTimeInterval: 1.0 / 60, repeats: true) { [weak self] _ in
                    MainActor.assumeIsolated { self?.v = Tilt.swept(CACurrentMediaTime() - from) }
                }
            } else if !(self.home && !self.sheet) { sweep?.invalidate(); sweep = nil; v = .zero }
            return
        }
        // `-launcherTilt 0.8,-0.5` holds a lean, for captures on a simulator (it has no motion sensor)
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
        let slow = 1 - exp(-dt / 8), quick = 1 - exp(-dt / 0.045), full = 18 * Double.pi / 180
        level = CGPoint(x: level.x + (angle.x - level.x) * slow, y: level.y + (angle.y - level.y) * slow)
        let to = CGPoint(x: tanh(Self.past(angle.x - level.x) / full), y: tanh(Self.past(angle.y - level.y) / full))
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

    // a hand's tremor is not a lean: the first 0.3° either way count for nothing
    private static func past(_ a: Double) -> Double { let dead = 0.3 * Double.pi / 180; return a > dead ? a - dead : a < -dead ? a + dead : 0 }

    private func start(_ m: CMDeviceMotion) {
        reference = m.attitude.copy() as? CMAttitude; level = .zero; last = m.timestamp
    }
}

// Ronda 40, «caixa d'aire sobre Valls» (Carbon's C1, with Astra's paper skyline; the owner: «vull que els cartutxos es
// moguin»): the screen is a window on the air over Valls. From far to near: the stars, the clouds, the town's roofs and
// bell tower at the foot of the sky, then the cartridges at three depths (the first row nearest), then a wisp of mist. A
// lean moves every plane by its depth: what is behind the glass goes with it, what is in front goes against it. Nothing
// turns in 3D: a cartridge is a flat drawing with painted light, and turned it reads as a bent card (ronda 37-39).
// Each cartridge follows on its own spring (stiffer the nearer), so the six never move as one wall, and floats a little
// on its own at rest. Offsets and one small in-plane swing over the cartridge's bitmap: nothing is redrawn.
enum Depth {
    // a row's travel at full lean (pt on a 393 pt screen), its swing (degrees) and its spring's pace (rad/s) by column
    private static let rows: [(x: CGFloat, y: CGFloat, swing: Double, pace: [Double], damp: Double)] = [
        (-11.5, -8.0, -0.85, [15.6, 14.4], 0.70), (-8.2, -5.7, -0.60, [13.0, 12.1], 0.74), (-6.2, -4.3, -0.45, [11.3, 10.6], 0.74)]
    static func row(_ r: Int) -> (x: CGFloat, y: CGFloat, swing: Double) { let d = rows[min(r, rows.count - 1)]; return (d.x, d.y, d.swing) }
    static func spring(_ r: Int, _ c: Int) -> Animation {
        let d = rows[min(r, rows.count - 1)], w = d.pace[c % d.pace.count]
        return .interpolatingSpring(mass: 1, stiffness: w * w, damping: 2 * d.damp * w)
    }
    static let clouds = CGSize(width: 14, height: 9), town = CGSize(width: 9, height: 4.5), mist = CGSize(width: -16.5, height: -11)
}

// A cartridge in the grid: it slides and swings a little against the lean, by its row's depth, and floats at rest; behind
// its label's window the art's two planes follow the phone (Cartridge.swift's Window). No turn, no slab, no shadow.
struct LeaningCartridge: View {
    let cart: Cartridge
    var row = 0, col = 0
    @ObservedObject private var tilt = Tilt.shared
    @Environment(\.accessibilityReduceMotion) private var still
    @ViewState private var up = false // the float's two ends

    var body: some View {
        var face = cart
        face.window = false
        let v = tilt.v, d = Depth.row(row), k = cart.u / 16.43, odd = (row + col) % 2 == 0 ? 1.0 : -1.0
        return ZStack(alignment: .topLeading) {
            face.equatable()
            Window(cart: cart, lean: v)
        }
        .rotationEffect(.degrees(d.swing * v.x))
        .offset(x: v.x * d.x * k, y: v.y * d.y * k)
        .animation(Depth.spring(row, col), value: v)
        // at rest: ±2.1 pt up and down, ±0.85 pt sideways, ±0.32°, each on its own period (5.4 to 7 s), neighbours opposed
        .rotationEffect(.degrees(still ? 0 : (up ? 0.32 : -0.32) * odd))
        .offset(x: still ? 0 : (up ? 0.85 : -0.85) * odd, y: still ? 0 : (up ? -2.1 : 2.1) * odd)
        .onAppear {
            guard !still else { return }
            withAnimation(.easeInOut(duration: 2.7 + 0.8 * Double((row * 2 + col) % 3) / 2).repeatForever(autoreverses: true)) { up = true }
        }
    }
}

// A plane of the sky, moved with the lean (`by`: its travel at full lean; the further, the more).
struct Drifting: ViewModifier {
    var by = Depth.clouds
    @ObservedObject private var tilt = Tilt.shared
    func body(content: Content) -> some View { content.offset(x: tilt.v.x * by.width, y: tilt.v.y * by.height) }
}
