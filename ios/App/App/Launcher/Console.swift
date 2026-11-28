import AudioToolbox
import SwiftUI
import UIKit

// Ronda 26: the console D4 «Gravat» (design/mulassa-games/app-home/ronda-25/astra-d) the picked cartridge is pushed into.
// Two layers on one canvas, 1064 px wide and cropped to the 620 px top that can ever show: the shell with its bay, and the
// raised panel, drawn over the cartridge so it slides under it. The LED goes on top. Measured on D4-open and D4-boot
// (393 × 852 pt): the shell shows its top 582 px at 0.324 pt a px.
struct Console {
    let s: CGFloat // points per canvas px
    let top: CGFloat // the canvas's top, in screen points
    let mid: CGFloat
    // by the width on a phone; on a wide, short window (an iPad on its side, Split View) by the height, so it never takes
    // more than 38 % of it and the cartridge keeps its room above
    init(width w: CGFloat, height h: CGFloat) { s = min(w / 1212.6, h * 0.38 / 582); top = h - 582 * s; mid = w / 2 }
    var size: CGSize { CGSize(width: 1064 * s, height: 620 * s) }
    var lip: CGFloat { top + 17 * s } // the shoulders' top: where the cartridge first touches
    var seatWidth: CGFloat { 626 * s } // the bay's width, a hair under the gap between the shoulders
    var seatTop: CGFloat { lip } // seated, the cartridge's top is level with the shoulders' (the owner: nothing sticks out)
    var panel: CGFloat { top + 341 * s }
    var led: CGPoint { CGPoint(x: mid + (101 - 532) * s, y: top + 133 * s) }

    func layer(_ name: String) -> some View {
        Image(name).resizable().frame(width: size.width, height: size.height).position(x: mid, y: top + size.height / 2)
    }
    // the amber LED over the shell's dark red one, with its glow
    func light() -> some View {
        let amber = Color(UIColor(hex: "#ffb23a"))
        return ZStack {
            Circle().fill(RadialGradient(colors: [amber.opacity(0.55), amber.opacity(0)], center: .center, startRadius: 0, endRadius: 30 * s))
                .frame(width: 60 * s, height: 60 * s)
            Circle().fill(RadialGradient(colors: [Color(UIColor(hex: "#fff1b8")), amber, Color(UIColor(hex: "#d9820f"))], center: .init(x: 0.4, y: 0.35),
                                         startRadius: 0, endRadius: 12 * s))
                .frame(width: 24 * s, height: 24 * s)
        }
        .position(led)
        .allowsHitTesting(false)
    }
}

// The console's sounds (ronda-26/sounds, the same files as Android's) and haptics, each behind its switch in Settings. System
// sounds: the ring/silent switch mutes them, and they leave the games' audio session alone.
@MainActor enum Feel {
    private static var ids: [String: SystemSoundID] = [:]
    private static let light = UIImpactFeedbackGenerator(style: .light), medium = UIImpactFeedbackGenerator(style: .medium)
    private static let note = UINotificationFeedbackGenerator()
    private static func on(_ key: String) -> Bool { UserDefaults.standard.object(forKey: key) as? Bool ?? true } // Sheets' @AppStorage

    // loads the four sounds and wakes the Taptic Engine before the drag needs them
    static func prepare() {
        for name in ["tick", "thunk", "boot", "no"] where ids[name] == nil {
            guard let url = Bundle.main.url(forResource: name, withExtension: "wav", subdirectory: "Sounds") else { continue }
            var id: SystemSoundID = 0
            if AudioServicesCreateSystemSoundID(url as CFURL, &id) == noErr { ids[name] = id }
        }
        light.prepare(); medium.prepare(); note.prepare()
    }
    private static func play(_ name: String) { if on("launcher-sound"), let id = ids[name] { AudioServicesPlaySystemSound(id) } }
    private static var haptics: Bool { on("launcher-haptics") }

    static func tick() { play("tick"); if haptics { light.impactOccurred() } } // the cartridge meets the bay's edge
    static func thunk() { play("thunk"); if haptics { medium.impactOccurred() } } // seated
    static func boot() { play("boot") } // two rising notes, after the thunk
    static func no() { play("no"); if haptics { note.notificationOccurred(.warning) } } // an «Aviat» refused
}
