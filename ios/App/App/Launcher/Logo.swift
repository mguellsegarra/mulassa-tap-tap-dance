import SwiftUI
import CoreText

// The Mulassa Games lockup at 128 pt, as jocs/index.html's: MULASSA in Baloo stretched to its width, red on a cream
// stroke over a darker cream copy, a thin dark line round both, GAMES in Baloo under it. Glyph outlines, so the strokes
// are real strokes.
struct Logo: View {
    var body: some View {
        let s = 128 / 320.6 // the mock's viewBox (-6 -8 320.6 112) at 128 pt
        let mulassa = GlyphLine(text: "MULASSA", font: "Baloo2-ExtraBold", size: 77 * s, kern: -5.5 * s, width: 300 * s, centreX: 160.3 * s)
        let games = GlyphLine(text: "GAMES", font: "Baloo2-ExtraBold", size: 34 * s, kern: 7 * s, width: nil, centreX: 160.3 * s)
        ZStack(alignment: .topLeading) {
            let line = Color(UIColor(hex: "#2a1a10")), ext = Color(UIColor(hex: "#d8bf8f"))
            ForEach([72.0, 68.0], id: \.self) { y in
                mulassa.baseline(y * s).stroke(line, style: StrokeStyle(lineWidth: 15 * s, lineJoin: .round))
                mulassa.baseline(y * s).fill(line)
            }
            mulassa.baseline(72 * s).stroke(ext, style: StrokeStyle(lineWidth: 11 * s, lineJoin: .round))
            mulassa.baseline(72 * s).fill(ext)
            mulassa.baseline(68 * s).stroke(Palette.cream, style: StrokeStyle(lineWidth: 11 * s, lineJoin: .round))
            mulassa.baseline(68 * s).fill(Color(UIColor(hex: "#e8382f")))
            games.baseline(108 * s).stroke(Color(UIColor(hex: "#3a1608")), style: StrokeStyle(lineWidth: 7 * s, lineJoin: .round))
            games.baseline(108 * s).fill(Color(Palette.yellow))
        }
        .shadow(color: .black.opacity(0.45), radius: 3, y: 3)
        .drawingGroup()
        .accessibilityElement().accessibilityLabel("Mulassa Games")
    }
}

struct GlyphLine {
    let text: String
    let font: String
    let size: CGFloat
    let kern: CGFloat
    let width: CGFloat?   // stretch to this width (the SVG's textLength), else the natural one
    let centreX: CGFloat

    func baseline(_ y: CGFloat) -> GlyphShape { GlyphShape(line: self, y: y) }
}

struct GlyphShape: Shape {
    let line: GlyphLine
    let y: CGFloat

    func path(in r: CGRect) -> Path {
        let font = CTFontCreateWithName(line.font as CFString, line.size, nil)
        let text = NSAttributedString(string: line.text, attributes: [.init(kCTFontAttributeName as String): font, .kern: line.kern])
        let glyphs = CGMutablePath()
        for run in CTLineGetGlyphRuns(CTLineCreateWithAttributedString(text)) as! [CTRun] {
            let n = CTRunGetGlyphCount(run)
            var ids = [CGGlyph](repeating: 0, count: n), at = [CGPoint](repeating: .zero, count: n)
            CTRunGetGlyphs(run, CFRange(), &ids)
            CTRunGetPositions(run, CFRange(), &at)
            for i in 0..<n {
                if let g = CTFontCreatePathForGlyph(font, ids[i], nil) { glyphs.addPath(g, transform: CGAffineTransform(translationX: at[i].x, y: at[i].y)) }
            }
        }
        let b = glyphs.boundingBoxOfPath, natural = b.maxX - line.kern
        let sx = (line.width ?? natural) / natural
        // flipped (CoreText draws upwards), stretched, centred on centreX, sitting on the baseline y
        let t = CGAffineTransform(translationX: line.centreX - (line.width ?? natural) / 2, y: y).scaledBy(x: sx, y: -1)
        return Path(glyphs.copy(using: [t]) ?? glyphs)
    }
}
