import SwiftUI
import CoreText

// The Mulassa lockup, ronda-10's #logo (2.0.0's, deaadc4b) without its GAMES line (the owner, 27 Nov 2026): MULASSA in
// Baloo 2 800 at 77, letter-spacing -5.5, stretched to 300; a thin dark #2a1a10 line, the #d8bf8f extrusion 4 below, red
// #e8382f on a cream outline. The SVG's viewBox, cut to the word, is 0 2 308.6 72, at the 48/110 scale the lockup had.
// Glyph outlines, so the strokes are real strokes.
struct Logo: View {
    var body: some View {
        let s = 48 / 110.0, y = { (v: CGFloat) in (v - 2) * s } // the viewBox starts at y 2
        let mulassa = GlyphLine(text: "MULASSA", font: "Baloo2-ExtraBold", size: 77 * s, kern: -5.5 * s, width: 300 * s, centreX: 154.3 * s)
        ZStack(alignment: .topLeading) {
            let ink = Color(UIColor(hex: "#2a1a10")), ext = Color(UIColor(hex: "#d8bf8f"))
            ForEach([64.0, 60.0], id: \.self) { v in
                mulassa.baseline(y(v)).stroke(ink, style: StrokeStyle(lineWidth: 15 * s, lineJoin: .round))
                mulassa.baseline(y(v)).fill(ink)
            }
            mulassa.baseline(y(64)).stroke(ext, style: StrokeStyle(lineWidth: 11 * s, lineJoin: .round))
            mulassa.baseline(y(64)).fill(ext)
            mulassa.baseline(y(60)).stroke(Palette.cream, style: StrokeStyle(lineWidth: 11 * s, lineJoin: .round))
            mulassa.baseline(y(60)).fill(Color(UIColor(hex: "#e8382f")))
        }
        .frame(width: 308.6 * s, height: 72 * s, alignment: .topLeading)
        .drawingGroup()
        .accessibilityElement().accessibilityLabel("Mulassa")
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
