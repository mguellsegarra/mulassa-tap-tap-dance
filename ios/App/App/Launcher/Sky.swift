import SwiftUI

// The home's sky by the device's hour (ronda-10's SKY and sky()): dawn, morning, midday, sunset, night. Three colours
// blended between keyframes, stars and clouds as static layers whose opacity follows the hour. Read every 5 minutes;
// nothing animates in between.
struct Sky: Equatable {
    // hour, top, middle, bottom, stars, clouds
    private static let keys: [(Double, String, String, String, Double, Double)] = [
        (0, "#0a1430", "#16244f", "#27386d", 1, 0), (5, "#0d1838", "#1d2c5c", "#33427a", 0.9, 0),
        (6.5, "#3a4a8c", "#c98aa6", "#ffc9a0", 0.25, 0.35), (8.5, "#6fb2ea", "#a9d6f3", "#f3e6d6", 0, 0.8),
        (13, "#4a9be4", "#86c6f1", "#d6eefb", 0, 1), (17, "#5a9fdc", "#a9c9e6", "#f5dcc0", 0, 0.85),
        (19, "#4b4c99", "#d77a8c", "#ffb878", 0.1, 0.45), (20.5, "#1f2558", "#5b3f78", "#a8607a", 0.6, 0.1),
        (22, "#0c1634", "#1a2853", "#2c3c70", 1, 0), (24, "#0a1430", "#16244f", "#27386d", 1, 0)]

    let top, middle, bottom: UIColor
    let stars, clouds: Double

    init(hour h: Double) {
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
    // the sheets' surface: the sky's top, darkened towards night blue (--bg2)
    var sheet: Color { Color(top.mix(UIColor(hex: "#0b0f22"), 0.55)) }

    static func == (a: Sky, b: Sky) -> Bool { a.top == b.top && a.middle == b.middle && a.bottom == b.bottom && a.stars == b.stars && a.clouds == b.clouds }
}

struct SkyBackground: View {
    let sky: Sky

    var body: some View {
        LinearGradient(stops: [.init(color: Color(sky.top), location: 0), .init(color: Color(sky.middle), location: 0.55),
                               .init(color: Color(sky.bottom), location: 1)], startPoint: .top, endPoint: .bottom)
            .overlay { Stars().opacity(sky.stars) }
            .overlay { Clouds().opacity(sky.clouds) }
            .ignoresSafeArea()
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

// Four soft white ellipses (radius as a share of the screen, centre, opacity), fading out at 70% of their radius.
private struct Clouds: View {
    var body: some View {
        Canvas { ctx, size in
            for (rx, ry, cx, cy, a) in [(0.6, 0.09, 0.18, 0.22, 0.6), (0.48, 0.07, 0.82, 0.38, 0.53),
                                        (0.7, 0.1, 0.4, 0.64, 0.4), (0.55, 0.08, 0.88, 0.84, 0.33)] {
                var c = ctx
                c.translateBy(x: cx * size.width, y: cy * size.height)
                c.scaleBy(x: rx * size.width, y: ry * size.height)
                c.fill(Path(ellipseIn: CGRect(x: -1, y: -1, width: 2, height: 2)),
                       with: .radialGradient(Gradient(stops: [.init(color: .white.opacity(a), location: 0), .init(color: .white.opacity(0), location: 0.7)]),
                                             center: .zero, startRadius: 0, endRadius: 1))
            }
        }
    }
}
