//
// ColorPicker.swift — KinetixColorPicker.
//
// Mirrors packages/ui/src/components/color-picker.tsx: a saturation/value
// square, hue and (optional) alpha rails, a hex field, and swatches.
// Internal HSV state (not derived from `value` on every render) for the
// same reason as the web version: saturation 0 or value 0 erase hue
// information, and re-deriving it every time would make the hue thumb
// jump to red whenever a drag crosses either edge. `value` only resyncs
// the internal state when it changes from something other than this
// view's own last emission.
//
// The square and rails are hand-rolled with `DragGesture` rather than
// reused from `KinetixSlider` — a 2D gesture has no single-axis primitive
// to build on, and the rails need per-instance gradient track painting
// `KinetixSlider`'s fixed styling doesn't expose. No eyedropper: iOS has
// no public API for sampling a pixel from anywhere on screen the way the
// web's `EyeDropper` does — a web-only enhancement, same as `KinetixTour`.
//

import SwiftUI

// -- color math (kept identical, formula-for-formula, across all four platforms) --

func kinetixHexToRgba(_ hex: String) -> (Double, Double, Double, Double) {
    var h = hex
    if h.hasPrefix("#") { h.removeFirst() }
    if h.count == 8 {
        let n = UInt64(h, radix: 16) ?? 0
        return (
            Double((n >> 24) & 0xFF),
            Double((n >> 16) & 0xFF),
            Double((n >> 8) & 0xFF),
            Double(n & 0xFF) / 255
        )
    }
    let full = h.count == 3 ? h.map { "\($0)\($0)" }.joined() : h
    let n = UInt64(full, radix: 16) ?? 0
    return (Double((n >> 16) & 0xFF), Double((n >> 8) & 0xFF), Double(n & 0xFF), 1)
}

func kinetixRgbaToHex(_ r: Double, _ g: Double, _ b: Double, _ a: Double, includeAlpha: Bool) -> String {
    func ch(_ v: Double) -> String {
        let clamped = max(0, min(255, Int(v)))
        return String(format: "%02x", clamped)
    }
    let base = "#\(ch(r))\(ch(g))\(ch(b))"
    return includeAlpha ? "\(base)\(ch(a * 255))" : base
}

func kinetixHsvToRgb(_ h: Double, _ s: Double, _ v: Double) -> (Double, Double, Double) {
    let sN = s / 100
    let vN = v / 100
    let c = vN * sN
    let hh = h / 60
    let x = c * (1 - abs(hh.truncatingRemainder(dividingBy: 2) - 1))
    var r = 0.0, g = 0.0, b = 0.0
    switch hh {
    case ..<1: (r, g, b) = (c, x, 0)
    case ..<2: (r, g, b) = (x, c, 0)
    case ..<3: (r, g, b) = (0, c, x)
    case ..<4: (r, g, b) = (0, x, c)
    case ..<5: (r, g, b) = (x, 0, c)
    default: (r, g, b) = (c, 0, x)
    }
    let m = vN - c
    return ((r + m) * 255, (g + m) * 255, (b + m) * 255)
}

func kinetixRgbToHsv(_ r: Double, _ g: Double, _ b: Double) -> (Double, Double, Double) {
    let rN = r / 255, gN = g / 255, bN = b / 255
    let maxV = max(rN, gN, bN)
    let minV = min(rN, gN, bN)
    let d = maxV - minV
    var h = 0.0
    if d != 0 {
        if maxV == rN {
            h = (gN - bN) / d
        } else if maxV == gN {
            h = (bN - rN) / d + 2
        } else {
            h = (rN - gN) / d + 4
        }
        h *= 60
        if h < 0 { h += 360 }
    }
    let s = maxV == 0 ? 0 : d / maxV
    return (h, s * 100, maxV * 100)
}

public struct KinetixColorPicker: View {
    @Environment(\.kinetixColors) private var colors

    private let value: String
    private let onChange: (String) -> Void
    private let alpha: Bool
    private let swatches: [String]

    @State private var h: Double
    @State private var s: Double
    @State private var v: Double
    @State private var a: Double
    @State private var lastEmitted: String
    @State private var hexDraft: String

    public init(value: String, onChange: @escaping (String) -> Void, alpha: Bool = false, swatches: [String] = []) {
        self.value = value
        self.onChange = onChange
        self.alpha = alpha
        self.swatches = swatches
        let rgba = kinetixHexToRgba(value)
        let hsv = kinetixRgbToHsv(rgba.0, rgba.1, rgba.2)
        _h = State(initialValue: hsv.0)
        _s = State(initialValue: hsv.1)
        _v = State(initialValue: hsv.2)
        _a = State(initialValue: rgba.3)
        _lastEmitted = State(initialValue: value)
        _hexDraft = State(initialValue: value.replacingOccurrences(of: "#", with: "").uppercased())
    }

    private func commit(_ nh: Double, _ ns: Double, _ nv: Double, _ na: Double) {
        h = nh
        s = ns
        v = nv
        a = na
        let rgb = kinetixHsvToRgb(nh, ns, nv)
        let hex = kinetixRgbaToHex(rgb.0, rgb.1, rgb.2, na, includeAlpha: alpha)
        lastEmitted = hex
        hexDraft = hex.replacingOccurrences(of: "#", with: "").uppercased()
        onChange(hex)
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            GeometryReader { geo in
                ZStack(alignment: .topLeading) {
                    Color(hue: h / 360, saturation: 1, brightness: 1)
                    LinearGradient(colors: [.white, .clear], startPoint: .leading, endPoint: .trailing)
                    LinearGradient(colors: [.clear, .black], startPoint: .top, endPoint: .bottom)
                    Circle()
                        .fill(Color(hue: h / 360, saturation: s / 100, brightness: v / 100))
                        .frame(width: 14, height: 14)
                        .overlay(Circle().stroke(Color.white, lineWidth: 2))
                        .position(x: geo.size.width * s / 100, y: geo.size.height * (1 - v / 100))
                }
                .clipShape(RoundedRectangle(cornerRadius: 8))
                .gesture(
                    DragGesture(minimumDistance: 0).onChanged { drag in
                        let ns = min(100, max(0, drag.location.x / geo.size.width * 100))
                        let nv = min(100, max(0, 100 - drag.location.y / geo.size.height * 100))
                        commit(h, ns, nv, a)
                    }
                )
            }
            .frame(height: 160)

            gradientRail(
                fraction: h / 360,
                track: AnyShapeStyle(AngularGradient(
                    gradient: Gradient(colors: (0...6).map { Color(hue: Double($0) / 6, saturation: 1, brightness: 1) }),
                    center: .center,
                    startAngle: .degrees(0),
                    endAngle: .degrees(360)
                )),
                onChange: { f in commit(f * 360, s, v, a) }
            )

            if alpha {
                gradientRail(
                    fraction: a,
                    track: AnyShapeStyle(Color(white: 0.9)),
                    overlay: LinearGradient(
                        colors: [.clear, Color(hue: h / 360, saturation: s / 100, brightness: v / 100)],
                        startPoint: .leading,
                        endPoint: .trailing
                    ),
                    onChange: { f in commit(h, s, v, f) }
                )
            }

            HStack(spacing: 8) {
                RoundedRectangle(cornerRadius: 6)
                    .fill(Color(hue: h / 360, saturation: s / 100, brightness: v / 100).opacity(a))
                    .frame(width: 32, height: 32)
                    .overlay(RoundedRectangle(cornerRadius: 6).stroke(colors.border, lineWidth: 1))

                HStack(spacing: 2) {
                    Text("#").foregroundStyle(colors.mutedForeground)
                    TextField("", text: $hexDraft)
                        .font(.system(size: 12, design: .monospaced))
                        .textFieldStyle(.plain)
                        .onSubmit {
                            let pattern = alpha ? "^[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$" : "^[0-9a-fA-F]{6}$"
                            if hexDraft.range(of: pattern, options: .regularExpression) != nil {
                                onChange("#\(hexDraft.lowercased())")
                            } else {
                                hexDraft = value.replacingOccurrences(of: "#", with: "").uppercased()
                            }
                        }
                }
            }

            if !swatches.isEmpty {
                HStack(spacing: 6) {
                    ForEach(swatches, id: \.self) { sw in
                        let rgba = kinetixHexToRgba(sw)
                        RoundedRectangle(cornerRadius: 4)
                            .fill(Color(red: rgba.0 / 255, green: rgba.1 / 255, blue: rgba.2 / 255))
                            .frame(width: 24, height: 24)
                            .onTapGesture {
                                let hsv = kinetixRgbToHsv(rgba.0, rgba.1, rgba.2)
                                commit(hsv.0, hsv.1, hsv.2, a)
                            }
                    }
                }
            }
        }
        .onChange(of: value) { newValue in
            guard newValue != lastEmitted else { return }
            let rgba = kinetixHexToRgba(newValue)
            let hsv = kinetixRgbToHsv(rgba.0, rgba.1, rgba.2)
            h = hsv.0
            s = hsv.1
            v = hsv.2
            a = rgba.3
            lastEmitted = newValue
            hexDraft = newValue.replacingOccurrences(of: "#", with: "").uppercased()
        }
    }

    @ViewBuilder
    private func gradientRail(
        fraction: Double,
        track: AnyShapeStyle,
        overlay: LinearGradient? = nil,
        onChange: @escaping (Double) -> Void
    ) -> some View {
        GeometryReader { geo in
            ZStack(alignment: .leading) {
                Capsule().fill(track)
                if let overlay {
                    Capsule().fill(overlay)
                }
                Circle()
                    .fill(Color.white)
                    .frame(width: 14, height: 14)
                    .overlay(Circle().stroke(Color.white, lineWidth: 2))
                    .shadow(radius: 1)
                    .offset(x: geo.size.width * fraction - 7)
            }
            .frame(height: 12)
            .contentShape(Rectangle())
            .gesture(
                DragGesture(minimumDistance: 0).onChanged { drag in
                    onChange(min(1, max(0, drag.location.x / geo.size.width)))
                }
            )
        }
        .frame(height: 20)
    }
}
