//
// Spinner.swift — KinetixSpinner.
//
// Mirrors packages/ui/src/components/spinner.tsx (a `border-2
// border-current border-t-transparent` ring, `animate-spin`). SwiftUI has
// no border-side-transparent equivalent, so this draws the shape
// directly: a 270°-sweep stroked circle (one quadrant left open, i.e.
// `border-t-transparent`), rotating continuously — same approach as the
// Compose port.
//
// With Reduce Motion on the arc rests (KinetixLoopMotion); the accessibility label carries "loading".
//

import SwiftUI

public enum KinetixSpinnerSize {
    case sm, md, lg
}

public enum KinetixSpinnerVariant {
    case `default`, muted, onColor
}

public struct KinetixSpinner: View {
    @Environment(\.kinetixColors) private var colors
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var spinning = false

    private let size: KinetixSpinnerSize
    private let variant: KinetixSpinnerVariant
    private let label: String

    public init(size: KinetixSpinnerSize = .md, variant: KinetixSpinnerVariant = .default, label: String = "Loading") {
        self.size = size
        self.variant = variant
        self.label = label
    }

    private var diameter: CGFloat {
        switch size {
        case .sm: return 16 // size-4
        case .md: return 24 // size-6
        case .lg: return 32 // size-8
        }
    }

    private var color: Color {
        switch variant {
        case .default: return colors.action
        case .muted:   return colors.mutedForeground
        case .onColor: return colors.actionForeground
        }
    }

    public var body: some View {
        Circle()
            .trim(from: 0, to: 0.75) // border-t-transparent → one quadrant open
            .stroke(color, lineWidth: 2) // border-2
            .frame(width: diameter, height: diameter)
            .rotationEffect(.degrees(spinning && !reduceMotion ? 360 : 0))
            .animation(
                KinetixLoopMotion.loop(
                    .linear(duration: KinetixLoopMotion.spinnerPeriodSeconds),
                    reduceMotion: reduceMotion,
                    autoreverses: false
                ),
                value: spinning
            )
            .onAppear { spinning = true }
            .accessibilityLabel(label)
    }
}
