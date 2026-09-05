//
// Slider.swift — KinetixSlider.
//
// Mirrors packages/ui/src/components/slider.tsx (Radix `Slider`:
// `bg-muted` track, `bg-primary` range, bordered `bg-background` thumb).
// Like the Compose port wrapping Material3's `Slider`, this wraps
// SwiftUI's native `Slider` rather than hand-rolling the drag gesture —
// pointer/keyboard/accessibility handling is real surface area the
// platform already gets right. The tradeoff: the thumb/track use the
// system look, not the source's exact `size-4` circle — a documented gap.
//

import SwiftUI

public struct KinetixSlider: View {
    @Environment(\.kinetixColors) private var colors

    @Binding private var value: Double
    private let range: ClosedRange<Double>
    private let step: Double?

    public init(value: Binding<Double>, in range: ClosedRange<Double> = 0...1, step: Double? = nil) {
        self._value = value
        self.range = range
        self.step = step
    }

    public var body: some View {
        Group {
            if let step {
                Slider(value: $value, in: range, step: step)
            } else {
                Slider(value: $value, in: range)
            }
        }
        .tint(colors.primary)
    }
}
