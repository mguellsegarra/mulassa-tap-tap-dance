import SwiftUI
import CoreText

// The games catalogue (docs/app/native-shell.md, contract 6), read from the web bundle the game bridge serves: a live
// update brings new games and art without a store release.
struct Game: Decodable, Identifiable, Equatable {
    let id: String
    let soon: Bool
    let path: String?
    let isNew: Bool
    let name: [String: String?]
    let short: String?
    let color: String
    let ink: String
    let category: String?
    let art: String

    // shortcut: Catalan only, until the launcher follows the app's language (native settings, phase 4)
    var title: String { (name["ca"] ?? nil) ?? id }
    var label: String { soon ? String(localized: "ui.select.aviat") : short ?? title } // one word for every game to come, as Android
    var tint: UIColor { UIColor(hex: color) }
}

private struct CatalogueFile: Decodable {
    let schema: Int
    let minBridge: Int
    let games: [Game]
}

enum WebBundle {
    static let bridgeVersion = 1
    static let builtin = Bundle.main.resourceURL!.appendingPathComponent("public")

    // Games the shell can show from the bundle at `root`; an unreadable or too-new catalogue reads as the app's own copy.
    static func games(at root: URL) -> (root: URL, games: [Game]) {
        for dir in [root, builtin] {
            guard let data = try? Data(contentsOf: dir.appendingPathComponent("catalogue.json")),
                  let file = try? JSONDecoder().decode(CatalogueFile.self, from: data),
                  file.schema == 1, file.minBridge <= bridgeVersion else { continue }
            return (dir, file.games.filter { $0.soon || isEntryPath($0.path) })
        }
        return (builtin, [])
    }

    // A game opens only at a page inside the bundle: never another origin or a path that climbs out of it.
    static func isEntryPath(_ path: String?) -> Bool {
        guard let path, path.hasPrefix("/"), !path.hasPrefix("//"), path.hasSuffix(".html"), !path.contains("..") else { return false }
        return path.allSatisfy { $0.isASCII && ($0.isLetter || $0.isNumber || "/._-".contains($0)) }
    }

    static func image(_ path: String, in root: URL) -> UIImage? {
        UIImage(contentsOfFile: root.appendingPathComponent(String(path.drop { $0 == "/" })).path)?.preparingForDisplay()
    }

    // The game's own faces (public/fonts), registered once from whichever bundle the app starts with.
    static func registerFonts(from root: URL) {
        for name in ["baloo-2-latin", "jersey-10-latin"] {
            let url = root.appendingPathComponent("fonts/\(name).woff2")
            CTFontManagerRegisterFontsForURL((FileManager.default.fileExists(atPath: url.path) ? url
                : builtin.appendingPathComponent("fonts/\(name).woff2")) as CFURL, .process, nil)
        }
    }
}

extension Font {
    static func baloo(_ size: CGFloat) -> Font { .custom("Baloo2-ExtraBold", fixedSize: size) }
    static func balooBold(_ size: CGFloat) -> Font { .custom("Baloo2-Bold", fixedSize: size) }
    static func pixel(_ size: CGFloat) -> Font { .custom("Jersey10-Regular", fixedSize: size) }
}

extension UIColor {
    convenience init(hex: String) {
        let v = UInt32(hex.dropFirst(), radix: 16) ?? 0
        self.init(red: CGFloat(v >> 16 & 255) / 255, green: CGFloat(v >> 8 & 255) / 255, blue: CGFloat(v & 255) / 255, alpha: 1)
    }
    // CSS color-mix(in srgb, self (1 - t), other t)
    func mix(_ other: UIColor, _ t: CGFloat) -> UIColor {
        var a = (CGFloat(0), CGFloat(0), CGFloat(0), CGFloat(0)), b = a
        getRed(&a.0, green: &a.1, blue: &a.2, alpha: &a.3)
        other.getRed(&b.0, green: &b.1, blue: &b.2, alpha: &b.3)
        return UIColor(red: a.0 + (b.0 - a.0) * t, green: a.1 + (b.1 - a.1) * t, blue: a.2 + (b.2 - a.2) * t, alpha: 1)
    }
}

enum Palette {
    static let bg = Color(UIColor(hex: "#1c110a"))
    static let cream = Color(UIColor(hex: "#fff3d6"))
    static let ink = Color(UIColor(hex: "#2a1608"))
    static let brown = Color(UIColor(hex: "#3a2208"))
    static let yellow = UIColor(hex: "#f5c518")
    static let yellowHi = Color(UIColor(hex: "#ffe26a"))
    static let yellowLo = Color(UIColor(hex: "#b47d07"))
    static let smoke = Color(red: 38 / 255, green: 20 / 255, blue: 9 / 255).opacity(0.74)
    static let red = Color(UIColor(hex: "#e0364c"))
    static let pink = Color(UIColor(hex: "#ff7ac8"))
}
