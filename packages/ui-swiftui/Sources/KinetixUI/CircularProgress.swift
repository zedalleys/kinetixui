//
// CircularProgress.swift — KinetixCircularProgress.
//
// Mirrors packages/ui/src/components/circular-progress.tsx: a ring,
// `--muted` track / `--primary` round-capped indicator, optional centred
// value label. `size` / `strokeWidth` default to the React version's own
// defaults (48 / 4) — caller-overridable, not design tokens.
//

import SwiftUI

public struct KinetixCircularProgress: View {
    @Environment(\.kinetixColors) private var colors
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    private let value: Double
    private let size: CGFloat
    private let strokeWidth: CGFloat
    private let showValue: Bool
    private let label: String?

    public init(
        value: Double,
        size: CGFloat = 48,
        strokeWidth: CGFloat = 4,
        showValue: Bool = false,
        label: String? = nil
    ) {
        self.value = value
        self.size = size
        self.strokeWidth = strokeWidth
        self.showValue = showValue
        self.label = label
    }

    public var body: some View {
        let fraction = CGFloat(KinetixProgressMotion.fraction(value))
        ZStack {
            Circle()
                .stroke(colors.muted, lineWidth: strokeWidth)
            Circle()
                .trim(from: 0, to: fraction)
                .stroke(style: StrokeStyle(lineWidth: strokeWidth, lineCap: .round))
                .fill(colors.action)
                .rotationEffect(.degrees(-90))
                .animation(KinetixProgressMotion.animation(reduceMotion: reduceMotion), value: fraction)
                .transition(.identity)
                .id(reduceMotion)
            if showValue || label != nil {
                Text(label ?? "\(Int((fraction * 100).rounded()))%")
                    .font(.kinetixLabelMd)
                    .foregroundStyle(colors.foreground)
            }
        }
        .frame(width: size, height: size)
        .animation(nil, value: reduceMotion)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(label ?? "Progress")
        .accessibilityValue("\(Int((fraction * 100).rounded())) percent")
    }
}
